/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/

// Ver.1.0 : 2026/02/01

#target illustrator
#targetengine "main"

SELF = (function(){
    try {app.documents.test()}
    catch(e) {return File(e.fileName)}
})();

// 外部のJSXを読み込む
$.evalFile(SELF.path + "/ZazLib/" + "PaletteWindow.jsx");

// 言語ごとの辞書を定義
var MyDictionaryForViewer = {
    GUI_JSX: {
        en : "ScriptUI Dialog Builder - Export_EN.jsx",
        ja : "ScriptUI Dialog Builder - Export_JP.jsx"
    },
    Msg_Require: {
        en : "This script requires Illustrator 2020.",
        ja : "このスクリプトは Illustrator 2020以降に対応しています。"
    },
    Msg_UndefineGUI: {
        en : "Undefine GIU.",
        ja : "GUIが未定です。"
    },
    Msg_CantLoadImage: {
        en : "Can't load a images.",
        ja : "画像を読み取れません。"
    },
    Msg_TtileOfSelectJpegFile: {
        en : "Select a Jpeg file",
        ja : "Jpegファイルをひとつ選択"
    }
};


// --- 辞書から自動翻訳処理 ---
var LangStringsForViewer = GetWordsFromDictionary( MyDictionaryForViewer );


/**
 * メインモニターの有効な解像度（タスクバー等を除いた範囲）を取得
 * @returns {Object} {width, height}
 */
function getScreenResolution() {
    // 0番目がメインモニター。複数ある場合は必要に応じてループ
    var primaryScreen = $.screens[0]; 
    
    // left/top/right/bottom が絶対座標で得られる
    var screenW = primaryScreen.right - primaryScreen.left;
    var screenH = primaryScreen.bottom - primaryScreen.top;

    var isMac = ($.os.indexOf("Mac") !== -1);
    var isWin = ($.os.indexOf("Win") !== -1);
    var scale = 1;

    if (isMac) {
        // Macにおいて、論理幅が 2000px 以下ならほぼ確実に 2倍(Retina) です
        // 近年の MacBook / iMac はこの法則が適用されます
        var scale = (screenW <= 2000) ? 2 : 1;
    }
    
    return {
        width:  screenW * scale,
        height: screenH * scale
    };
}


//-----------------------------------
// クラス CViewer
//-----------------------------------

// コンストラクタ
function CViewer(pDialog, pPanelView, imageFile) {

    var self = this;
    self.Result = null;

    try{
        // 画像のサイズを得るために、仮のダイアログを作成して画像を表示させ、この更新結果を利用して、画像サイズを得る
        var win = new Window("palette", "Image Test");

        // boundsを定義せずに画像を追加 (なお、フォトショップでは、Invalid image dataのエラーになってしまうので実行できなかった)
        var myImage = win.add('image', undefined, imageFile); 

        // ここで width にアクセスしても undefined になる可能性が高い
        // alert(myImage.width); // undefined

        // layout.layout() を呼び出すことで、初めて bounds が計算される
        win.layout.layout(true);

        // show() または layout() の後であれば、正しい値を取得できる
        var imageWidth   = myImage.bounds.width;      // 画像の幅
        var imageHeight  = myImage.bounds.height;     // 画像の高さ
        self.aspectRatio = imageWidth / imageHeight;  // 画像の縦横比

        win.close(); // メモリ解放のためにclose

        // --- モニター解像度を考慮したリサイズ ---
        {
            var screen = getScreenResolution();
            var ImaseSaling = 0.25; // 画像を表示する際のスケーリング
            var maxW = screen.width  * ImaseSaling;
            var maxH = screen.height * ImaseSaling;

            // モニターからはみ出さないように調整
            var targetW = imageWidth;
            var targetH = imageHeight;

            if (targetW > maxW) {
                targetW = maxW;
                targetH = targetW / self.aspectRatio;
            }
            if (targetH > maxH) {
                targetH = maxH;
                targetW = targetH * self.aspectRatio;
            }

            pDialog.preferredSize = [ targetW, targetH ];
        }

        // 画像読み込み
        self.uiImage = ScriptUI.newImage(imageFile);

        {
            // カスタム・カンバスを追加
            self.m_Canvas = pPanelView.add("customview", undefined, {
                multiline:  false,
                scrollable: false
            });

            self.m_Canvas.orientation = "column";
            self.m_Canvas.alignment = ["fill", "fill"];
            var scaleX=2;
            self.m_Canvas.size    = [ pDialog.preferredSize.width, pDialog.preferredSize.height ]; // ビューアの初期サイズ

            // カスタム・カンバスのonDraw
            self.m_Canvas.onDraw = function() {
                var canv = this;    // m_Canvasのthis
                var g = canv.graphics;

                var blackPen = g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1); 
                var myFont = ScriptUI.newFont("Arial", "BOLD", 20); 

                if ( self.uiImage ) {
                    // 画像をビュアーのサイズにリサイズして描画
                    g.drawImage(self.uiImage, 0, 0, canv.size.width, canv.size.height);

                    //g.drawString(canv.size.width,  blackPen, 20,20, myFont);    // デバッグ用に文字を表示
                }
            }
        }
    }
    catch(e)
    {
        alert( e.message );
        return null;    // この戻り値(null)を得ることができない
    }

    self.Result = self;
    return self;
}


//-----------------------------------
// クラス CImageViewDLg
//-----------------------------------

// コンストラクタ
function CImageViewDLg() { 
       
    // コンストラクタ, trueを指定してリサイズ可能なダイアログを生成
    CPaletteWindow.call( this, true );
    var self = CImageViewDLg.self;

    self.m_Viewer = null;   // ビューアは未定義状態

    // GUI用のスクリプトを読み込む
    var selfFile = new File($.fileName);
    var currentDir = selfFile.parent;
    if ( self.LoadGUIfromJSX( currentDir.fullName + "/GUI.Panele_ImageViewer/" + LangStringsForViewer.GUI_JSX ) )
    {
        // GUIに変更を入れる
        self.m_close.onClick = function() { self.onEndOfDialogClick(); }
        self.m_BtnSelectImage.onClick = function() { self.onLoadImageClick(); }
        
        // 画像ファイル選択
        var imageFile = self.GetImageFile();

        if ( imageFile !== null ) {
            // コンストラクタからの戻り値を得られないので、.ResultにCViewerの生成物を戻すようにした
            self.m_Viewer = new CViewer( self.m_Dialog, self.m_PanelView, imageFile );
            self.m_Viewer = self.m_Viewer.Result;

            if (self.m_Viewer === null) {
                alert(LangStringsForViewer.Msg_CantLoadImage);
                return;
            }
        }

        // パラメータ変更
        self.m_Dialog.opacity = 1.0;   // 不透明度  
    }
    else {
        alert( LangStringsForViewer.Msg_UndefineGUI );
        return;
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // インスタンスメソッドを呼ぶための紐付け
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // onResizing サイズ変更中に呼び出される
    self.m_Dialog.onResizing = function() { 
        self.onResizing();
    };

    // onResizing サイズ変更中に呼び出される
    self.isResizing = false; // 無限ループ防止フラグ

    if ( self.m_Viewer !== null ) {
        // カスタム・カンバスのmousedown
        self.m_Viewer.m_Canvas.addEventListener("mousedown", function(event) {
            var Sz = "Status: Mouse Down on Button (Button: " + event.button + ")";
            // event.button は左クリックで 0、中央で 1、右で 2 を返す
            //alert(Sz);
        });
    }

}

ClassInheritance(CImageViewDLg, CPaletteWindow);   // クラス継承


// ClassInheritanceの後ろで、追加したいメソッドを定義
CImageViewDLg.prototype.onResizing = function() {

    var self  = CImageViewDLg.self;

    if ( self.m_Viewer === null ) {
        return;
    }

    if (self.isResizing) return;

    var Dlg   = self.m_Dialog;
    var Panel = self.m_PanelView;
    var Canv  = self.m_Viewer.m_Canvas;
    var PanelTool = self.m_PanelTool;

    try{
        self.isResizing = true;

        // 1. ダイアログ内の有効エリア（内寸）を計算
        var DialodWidth  = Dlg.size.width   - ( Dlg.margins.left + Dlg.margins.right  );
        var DialogHeight = Dlg.size.height  - ( Dlg.margins.top  + Dlg.margins.bottom );

        // 2. パネル内の有効エリア（内寸）を計算
        var innerW = DialodWidth  - ( Panel.margins.left + Panel.margins.right  );
        var innerH = DialogHeight - ( Panel.margins.top  + Panel.margins.bottom ) - PanelTool.size.height - Dlg.spacing -10;

        // 3. アスペクト比に基づいてキャンバスのサイズを決定
        if ((innerW / innerH) > self.m_Viewer.aspectRatio) {
            // 幅が広すぎる（高さが足りない）場合：高さを基準に幅を調整
            // 新しい幅 = 新しい高さ * 目標比率
            innerW = innerH * self.m_Viewer.aspectRatio;
        } else {
            // 高さが広すぎる（幅が足りない）場合：幅を基準に高さを調整
            // 新しい高さ = 新しい幅 / 目標比率
            innerH = innerW / self.m_Viewer.aspectRatio;
        }

        // 4. キャンバスのサイズを強制指定
        Canv.size = [innerW, innerH];

        // 5. locationを直接計算（stackに頼らず確実に配置）
        Canv.location = [ (DialodWidth - innerW) / 2, (DialogHeight - innerH) / 2 ];

        // 6. 明示的に再描画を要求（2026年環境でのチラつき防止）
        Canv.notify("onDraw");

        // 7. ScriptUIのレイアウトマネージャーで、子要素の位置を自動計算
        //    子要素（m_closeなど）は、親（m_PanelTool）の
        //    orientation（並び方向）と alignChildren（揃え位置）に基づいて自動配置されます。
        Dlg.layout.layout(true); 
    }
    finally {
        self.isResizing = false;
    }
}

CImageViewDLg.prototype.onEndOfDialogClick = function() {
    var  self = CImageViewDLg.self;
    try
    {
        self.CloseDlg();
    }
    catch(e)
    {
        alert( e.message );
    }
}

CImageViewDLg.prototype.onLoadImageClick = function() {
    var  self = CImageViewDLg.self;
    try
    {
        // 画像ファイル選択
        var imageFile = self.GetImageFile();

        if ( imageFile !== null ) {
            // 1. m_PanelView内のコントロールを削除
            if ( self.m_Viewer !== null )
            {
                self.m_PanelView.remove(self.m_Viewer.m_Canvas);
            }

            // 2. レイアウトを更新（これを行わないと画面上が崩れる場合があります）
            self.m_PanelView.layout.layout(true);

            // 3. コンストラクタからの戻り値を得られないので、.ResultにCViewerの生成物を戻すようにした
            self.m_Viewer = new CViewer( self.m_Dialog, self.m_PanelView, imageFile );
            self.m_Viewer = self.m_Viewer.Result;

            // 4. レイアウトを更新
            self.m_Dialog.layout.layout(true);
        }
    }
    catch(e)
    {
        alert( e.message );
    }
}

CImageViewDLg.prototype.GetImageFile = function() {
    // ファイル選択
    // Windows用: "表示名:*.拡張子;*.拡張子"
    // Mac用: 関数によるフィルタ（または空文字）
    var filter = (File.fs == "Windows") ? "JPEG Files:*.jpg;*.jpeg" : function(f) {
        return f instanceof Folder || f.name.match(/\.(jpg|jpeg)$/i);
    };
    var imageFile = File.openDialog(LangStringsForViewer.Msg_TtileOfSelectJpegFile, filter);

    if ( imageFile == null ) {
        // ファイルが選択されなかった時の処理
        return null;
    }

    return imageFile;
}



var _DlgViewer;   // 唯一のオブジェクト

function main()
{
    var appName = app.name;
    // 実行結果の例:
    // "Adobe Illustrator"
    // "Adobe Photoshop"

    // バージョン・チェック
    if( appName === "Adobe Illustrator" && appVersion()[0]  >= 24 )
    {
        _DlgViewer = new CImageViewDLg();
        _DlgViewer.ShowDlg(); 
    }
    else
    {
        alert( LangStringsForViewer.Msg_Require ) ; 
    }
}

main();