/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/

// Ver.1.0 : 2026/01/29

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


// ファイル選択
var imageFile = File.openDialog("Select File");
var imageWidth;            // 画像の幅
var imageHeight;           // 画像の高さ

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
    imageWidth  = myImage.bounds.width;
    imageHeight = myImage.bounds.height; 
}

var aspectRatio = imageWidth / imageHeight;


//-----------------------------------
// クラス CViewer
//-----------------------------------

// コンストラクタ
function CViewer(m_Dialog, m_PanelView ) { 

    // カスタム・カンバスを追加
    var m_Canvas = m_PanelView.add("customview", undefined, {
        multiline: false,
        scrollable: false
    });
    m_Canvas.size = [m_Dialog.preferredSize.width, m_Dialog.preferredSize.height]; // ビューアの初期サイズ
    m_Canvas.orientation = "column";
    m_Canvas.alignment = ["fill", "fill"];

    return m_Canvas;
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

        // パラメータ変更
        self.m_Dialog.opacity = 1.0;                                         // 不透明度 
        self.m_Dialog.preferredSize = [ imageWidth / 5, imageHeight / 5 ];   // ダイアログのサイズを変更(画像の５分の１サイズとした)

        self.m_Canvas = new CViewer(self.m_Dialog, self.m_PanelView, self.m_Canvas);
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

    // 画像読み込み
    var uiImage = ScriptUI.newImage(imageFile);

    // onResizing サイズ変更中に呼び出される
    self.isResizing = false; // 無限ループ防止フラグ

    // カスタム・カンバスのmousedown
    self.m_Canvas.addEventListener("mousedown", function(event) {
        var Sz = "Status: Mouse Down on Button (Button: " + event.button + ")";
        // event.button は左クリックで 0、中央で 1、右で 2 を返す
        //alert(Sz);
    });

    // カスタム・カンバスのonDraw
    self.m_Canvas.onDraw = function() {
        var canv = this;
        var g = canv.graphics;

        var blackPen = g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1); 
        var myFont = ScriptUI.newFont("Arial", "BOLD", 20); 

        if ( uiImage ) {
            // 画像をビュアーのサイズにリサイズして描画
            g.drawImage(uiImage, 0, 0, canv.size.width, canv.size.height);

            //g.drawString(canv.size.width,  blackPen, 20,20, myFont);    // デバッグ用に文字を表示
        }
    };

}

ClassInheritance(CImageViewDLg, CBaseDialog);   // クラス継承


// ClassInheritanceの後ろで、追加したいメソッドを定義
CImageViewDLg.prototype.onResizing = function() {

    var self  = CImageViewDLg.self;

    if (self.isResizing) return;

    var Dlg   = self.m_Dialog;
    var Panel = self.m_PanelView;
    var Canv  = self.m_Canvas;
    var Btn = self.m_close; // 下にある閉じるボタン

    try{
        self.isResizing = true;

        // 1. ダイアログの現在の内寸（外枠ではなく描画領域）を取得
        var dw = Dlg.size.width;
        var dh = Dlg.size.height;

        // 2. ボタンの位置を計算（ダイアログの最下部から30px上に配置）
        // x座標は中央、y座標は下からボタンの高さ+余白を引いた位置
        if (Btn) {
            var btnX = (dw - Btn.size.width) / 2;
            var btnY = dh - Btn.size.height - 15; // 15は下の余白
            Btn.location = [btnX, btnY];
        }

        // 3. パネルのサイズをダイアログに追従させる（fill設定をコードで補強）
        // ダイアログのサイズから余白（適宜調整）を引いたものをパネルサイズにする
        var pw = dw - 20; // 左右の余白
        var ph = dh - (Btn ? Btn.size.height + 40 : 40); // ボタンがある場合はその分引く
        Panel.size = [pw, ph];

        // 4. パネル内の有効エリア（内寸）を計算
        var innerW = pw - (Panel.margins.left + Panel.margins.right);
        var innerH = ph - (Panel.margins.top + Panel.margins.bottom);

        var nw, nh;

        // 5. アスペクト比に基づいてキャンバスのサイズを決定
        if ((innerW / innerH) > aspectRatio) {
            // 幅が広すぎる（高さが足りない）場合：高さを基準に幅を調整
            // 新しい幅 = 新しい高さ * 目標比率
            nh = innerH;
            nw = innerH * aspectRatio;
        } else {
            // 高さが広すぎる（幅が足りない）場合：幅を基準に高さを調整
            // 新しい高さ = 新しい幅 / 目標比率
            nw = innerW;
            nh = innerW / aspectRatio;
        }

        // 6. キャンバスのサイズを強制指定
        Canv.size = [nw, nh];

        // 7. locationを直接計算（stackに頼らず確実に配置）
        Canv.location = [
            (pw - nw) / 2,
            (ph - nh) / 2
        ];

        // 8. 明示的に再描画を要求（2026年環境でのチラつき防止）
        Canv.notify("onDraw");
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
