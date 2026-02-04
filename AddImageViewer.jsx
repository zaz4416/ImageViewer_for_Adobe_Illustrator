/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/

// Ver.1.0 : 2026/02/04

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
    },
     Menu_LoadImage: {
        en : "Load image",
        ja : "画像読み込み"
    },
     Menu_ResetImageSize: {
        en : "Reset image size",
        ja : "画像サイズをリセット"
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
        var ISize = self.getImageSize(imageFile);
        var imageWidth   = ISize.width;      // 画像の幅
        var imageHeight  = ISize.height;     // 画像の高さ
        self.aspectRatio = ISize.ratio;      // 画像の縦横比

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

                // 背景を白で塗りつぶす処理
                var whiteBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1.0, 1.0, 1.0, 1.0]); // [R, G, B, A]
                g.rectPath(0, 0, canv.size.width, canv.size.height);
                g.fillPath(whiteBrush);

                var blackPen = g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1); 
                var myFont = ScriptUI.newFont("Arial", "BOLD", 20); 

                if ( self.uiImage ) {
                    // 画像をビュアーのサイズにリサイズして描画
                    g.drawImage(self.uiImage, 0, 0, canv.size.width, canv.size.height);

                    //g.drawString(canv.size.width,  blackPen, 20,20, myFont);    // デバッグ用に文字を表示
                }
            }

            // カスタム・カンバスのmousedown
            self.m_Canvas.addEventListener("mousedown", function(event) {
                var Sz = "Status: Mouse Down on Button (Button: " + event.button + ")";

                // event.button は左クリックで 0、中央で 1、右で 2 を返す
                //alert(Sz);

                switch (event.button) {
                    case 0:
                        // 左クリック
                        break;
                    case 1:
                        // 中央（ホイール）クリック
                        break;
                    case 2:
                        // 右クリック
                        self.showContextMenu(event); // メニュー表示へ
                        break;
                    default:
                        break;
                }
            });
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


/**
 * 画像のオリジナルサイズを取得する（Photoshop/Illustrator両対応）
 */
CViewer.prototype.getImageSize = function(imageFile) {
    var self = this;
    var result = { width: 100, height: 100, ratio: 1 }; // フォールバック

    try {
        // Photoshopの場合、ScriptUIに頼らずapp.openせずにサイズを得る方法を優先
        if (BridgeTalk.appName === "photoshop") {
            // Photoshop特有の、高速な画像メタデータ取得が必要な場合はここ
            // 今回はScriptUIでの解決を試みる
        }

        var win = new Window("palette", "Size Checker");
        // PSでのエラー回避: Fileオブジェクトを直接渡す前にパスを確認
        var myImage = win.add('image', undefined, File(imageFile.fullName)); 

        // 強制的に計算を実行
        win.layout.layout(true);

        if (myImage.bounds.width > 0) {
            result.width  = myImage.bounds.width;
            result.height = myImage.bounds.height;
            result.ratio  = result.width / result.height;
        }
        
        win.close();
    } catch (e) {
        // エラー時のデフォルト値
        $.writeln("Image Load Error: " + e.message);
    }
    
    return result;
};


/**
 * 右クリックメニューの構築と表示
 */
CViewer.prototype.showContextMenu = function(event) {

    var self = CImageViewDLg.self;

    // 1. 枠なしの小型パレットを作成（これがメニューの実体になる）
    var menuWin = new CPopMenu( event.screenX, event.screenY );

    // 2. メニュー項目の追加（ボタンの見た目をフラットにしてメニューに見せる）
    menuWin.AddtMenu( LangStringsForViewer.Menu_LoadImage,     self.onLoadImageClick );
    menuWin.AddtMenu( LangStringsForViewer.Menu_ResetImageSize);

    // 3. メニューを表示
    menuWin.show();
}


//-----------------------------------
// クラス CPopMenu
//-----------------------------------

// コンストラクタ

function CPopMenu( posX, posY ) {
    var self = this;

    self.m_Menu = new Window("palette", undefined, undefined, {borderless: true});
    self.m_Menu.orientation = "column";
    self.m_Menu.alignChildren = "fill";
    self.m_Menu.spacing = 0;
    self.m_Menu.margins = 2; // 境界線

    // 表示位置の決定（マウスのクリック位置を計算）
    // event から座標を取得し、スクリーン座標へ変換
    self.m_Menu.location = [posX, posY];

    // フォーカスが外れたら（メニュー外をクリックしたら）閉じる
    self.m_Menu.onDeactivate = function() { self.m_Menu.close(); }
}

CPopMenu.prototype.AddtMenu = function(MenuString, func) {
    var self = this;
    var btn = null;

    try{
        btn = self.m_Menu.add("button", undefined, MenuString);
        btn.onClick = function() {
            self.m_Menu.close();
            if (typeof func === "function") func();
        };
    }
    catch(e)
    {
        alert( e.message );
    }

    return btn;
}

CPopMenu.prototype.show = function() {
    return this.m_Menu.show();
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
        if ( imageFile === null ) {
            return;
        }
        
        // コンストラクタからの戻り値を得られないので、.ResultにCViewerの生成物を戻すようにした
        self.m_Viewer = new CViewer( self.m_Dialog, self.m_PanelView, imageFile );
        self.m_Viewer = self.m_Viewer.Result;

        if ( self.m_Viewer === null ) {
            alert(LangStringsForViewer.Msg_CantLoadImage);
            return;
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
    var isWin = (File.fs === "Windows");
    
    // PNGを追加したフィルタ設定
    var filter = isWin 
        ? "Image Files:*.jpg;*.jpeg;*.png" // Windows: セミコロンで区切って追加
        : function(f) { 
            // Mac: 正規表現に png を追加
            return f instanceof Folder || f.name.match(/\.(jpg|jpeg|png)$/i); 
        };

    // ファイル選択ダイアログの表示
    var imageFile = File.openDialog(
        LangStringsForViewer.Msg_TtileOfSelectJpegFile, 
        filter,
        false // 複数選択を無効化
    );

    if ( imageFile == null ) {
        // ファイルが選択されなかった時の処理
        return null;
    }

    /*
    if (imageFile && isTransparentPNG(imageFile)) {
        alert("このPNGは透明度を持っています。");
    } else if (imageFile) {
        alert("不透明な画像です。");
    }
    */

    return imageFile;
}

/**
 * PNGファイルが透明度(Alpha)を持っているか判定する
 * @param {File} file - 判定対象のファイルオブジェクト
 * @returns {Boolean} 透明度をサポートしていればtrue
 */
function isTransparentPNG(file) {
    if (!file || !file.exists) return false;
    if (!file.name.match(/\.png$/i)) return false; // PNG以外は除外

    file.encoding = "BINARY";
    file.open("r");
    
    // PNGのIHDRチャンクにあるカラータイプ(25バイト目)を読み込む
    file.seek(25);
    var colorType = file.read(1).charCodeAt(0);
    file.close();

    // 4: Gray+Alpha, 6: RGB+Alpha なら透明度あり
    // 3: Indexed Color も透明パレットを持つ可能性があるため含めるのが一般的
    return (colorType >= 3);
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