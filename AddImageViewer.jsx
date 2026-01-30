/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/

// Ver.1.0 : 2026/01/30

#target illustrator
#targetengine "main"

SELF = (function(){
    try {app.documents.test()}
    catch(e) {return File(e.fileName)}
})();

// 外部のJSXを読み込む
$.evalFile(SELF.path + "/ZazLib/" + "PaletteWindow.jsx");

// 言語ごとの辞書を定義
var MyDictionary = {
    GUI_JSX: {
        en : "ScriptUI Dialog Builder - Export_EN.jsx",
        ja : "ScriptUI Dialog Builder - Export_JP.jsx"
    }
};

// --- LangStringsの辞書から自動翻訳処理 ---
var LangStrings = GetWordsFromDictionary( MyDictionary );


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
    
    return {
        width: screenW,
        height: screenH
    };
}


//-----------------------------------
// クラス CViewer
//-----------------------------------

// コンストラクタ
function CViewer(pDialog, pPanelView, imageFile) {

    var self = this;

    // 画像のサイズを得るために、仮のダイアログを作成して画像を表示させ、この更新結果を利用して、画像サイズを得る
    {
        var win = new Window("palette", "Image Test");

        // boundsを定義せずに画像を追加
        var myImage = win.add('image', undefined, imageFile); 

        // ここで width にアクセスしても undefined になる可能性が高い
        // alert(myImage.width); // undefined

        // ウィンドウを表示（または layout.layout() を呼び出す）ことで、初めて bounds が計算される
        win.show();
        win.hide(); // 非表示にする

        // show() または layout() の後であれば、正しい値を取得できる
        var imageWidth  = myImage.bounds.width;    // 画像の幅
        var imageHeight = myImage.bounds.height;   // 画像の高さ
        self.aspectRatio = imageWidth / imageHeight;  // 画像の縦横比

        win.close(); // メモリ解放のためにclose
    }

    // --- モニター解像度を考慮したリサイズ ---
    {
        var screen = getScreenResolution();
        var maxW = screen.width * 0.8; // 画面の80%を最大幅とする
        var maxH = screen.height * 0.8; // 画面の80%を最大高さとする

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

    // カスタム・カンバスを追加
    self.m_Canvas = pPanelView.add("customview", undefined, {
        multiline:  false,
        scrollable: false
    });

    self.m_Canvas.orientation = "column";
    self.m_Canvas.alignment = ["fill", "fill"];
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
    };

    return this;
}


//-----------------------------------
// クラス CBaseDialog
//-----------------------------------

// コンストラクタ
function CBaseDialog( ResizeWindow ) { 

    CPaletteWindow.call( this, ResizeWindow ); // コンストラクタ
    var self = this;                         // クラスへののポインタを確保

    // GUI用のスクリプトを読み込む
    var selfFile = new File($.fileName);
    var currentDir = selfFile.parent;
    if ( self.LoadGUIfromJSX( currentDir.fullName + "/GUI.Panele_ImageViewer/" + LangStrings.GUI_JSX ) )
    {
        // GUIに変更を入れる
        self.m_close.onClick = function() { self.onEndOfDialogClick(); }
       
        // ファイル選択
        self.imageFile = File.openDialog("Select File");
        self.m_Viewer = new CViewer( self.m_Dialog, self.m_PanelView, self.imageFile );

         // パラメータ変更
        self.m_Dialog.opacity = 1.0;                                         // 不透明度    
    }
    else {
        alert("GUIが未定です");
        return;
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // インスタンスメソッドを呼ぶための紐付け
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // onResizing サイズ変更中に呼び出される
    this.m_Dialog.onResizing = function() { 
        self.onResizing();
    };
}

ClassInheritance(CBaseDialog, CPaletteWindow);  // クラス継承


//-----------------------------------
// クラス CImageViewDLg
//-----------------------------------

// コンストラクタ
function CImageViewDLg() { 
       
    // コンストラクタ, trueを指定してリサイズ可能なダイアログを生成
    CBaseDialog.call( this, true );

    var self = CImageViewDLg.self;

    // onResizing サイズ変更中に呼び出される
    self.isResizing = false; // 無限ループ防止フラグ

    // カスタム・カンバスのmousedown
    self.m_Viewer.m_Canvas.addEventListener("mousedown", function(event) {
        var Sz = "Status: Mouse Down on Button (Button: " + event.button + ")";
        // event.button は左クリックで 0、中央で 1、右で 2 を返す
        //alert(Sz);
    });
}

ClassInheritance(CImageViewDLg, CBaseDialog);   // クラス継承


// ClassInheritanceの後ろで、追加したいメソッドを定義
CImageViewDLg.prototype.onResizing = function() {

    var self  = CImageViewDLg.self;

    if (self.isResizing) return;

    var Dlg   = self.m_Dialog;
    var Panel = self.m_PanelView;
    var Canv  = self.m_Viewer.m_Canvas;
    var Btn = self.m_close; // 下にある閉じるボタン
    var PanelTool = self.m_PanelTool;

    try{
        self.isResizing = true;

        // 1. ダイアログの現在の内寸（外枠ではなく描画領域）を取得
        var dw = Dlg.size.width;
        var dh = Dlg.size.height;

        // 2. パネルのサイズをダイアログに追従させる（fill設定をコードで補強）
        // ダイアログのサイズから余白（適宜調整）を引いたものをパネルサイズにする
        var pw = dw - 20; // 左右の余白
        var ph = dh - PanelTool.size.height-50; // パネル分を引く

        // 3. パネル内の有効エリア（内寸）を計算
        var innerW = pw - (Panel.margins.left + Panel.margins.right);
        var innerH = ph - (Panel.margins.top + Panel.margins.bottom);

        var nw, nh;

        // 4. アスペクト比に基づいてキャンバスのサイズを決定
        if ((innerW / innerH) > self.m_Viewer.aspectRatio) {
            // 幅が広すぎる（高さが足りない）場合：高さを基準に幅を調整
            // 新しい幅 = 新しい高さ * 目標比率
            nh = innerH;
            nw = innerH * self.m_Viewer.aspectRatio;
        } else {
            // 高さが広すぎる（幅が足りない）場合：幅を基準に高さを調整
            // 新しい高さ = 新しい幅 / 目標比率
            nw = innerW;
            nh = innerW / self.m_Viewer.aspectRatio;
        }

        // 5. キャンバスのサイズを強制指定
        Canv.size = [nw, nh];

        // 6. locationを直接計算（stackに頼らず確実に配置）
        Canv.location = [ (pw - nw) / 2, (ph - nh) / 2 ];

        // 7. 明示的に再描画を要求（2026年環境でのチラつき防止）
        Canv.notify("onDraw");

        // 8. ScriptUIのレイアウトマネージャーで、子要素の位置を自動計算
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


//インスタンスを生成。
var DlgPaint = new CImageViewDLg();


main();

function main()
{    
    // バージョン・チェック
    if( appVersion()[0]  >= 24)
    {
        DlgPaint.ShowDlg(); 
    }
    else
    {
        var msg = {en : 'This script requires Illustrator 2020.', ja : 'このスクリプトは Illustrator 2020以降に対応しています。'} ;
        alert(msg) ; 
     }
}
