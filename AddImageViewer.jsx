/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/

// Ver.1.0 : 2026/01/22

#target illustrator
#targetengine "main"

SELF = (function(){
    try {app.documents.test()}
    catch(e) {return File(e.fileName)}
})();

// 外部のJSXを読み込む
$.evalFile(SELF.path + "/ZazLib/" + "PaletteWindow.jsx");


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
// クラス CBaseDialog
//-----------------------------------
function CBaseDialog( DlgName, ResizeWindow ) { 

    CPaletteWindow.call( this, ResizeWindow ); // コンストラクタ
    this.InitDialog( DlgName );                // イニシャライザ

    CBaseDialog.TheObj = this;                 // クラスインスタンスを指す this を退避( 静的プロパティ )

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // インスタンスメソッドを呼ぶための定義
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // onResizing サイズ変更中に呼び出される
    this.m_Dialog.onResizing = function() { 
        CBaseDialog.TheObj.onResizing();
    };
}

// クラス継承
ClassInheritance(CBaseDialog, CPaletteWindow);


//-----------------------------------
// クラス CImageViewDLg
//-----------------------------------

// コンストラクタ (ここから) 
function CImageViewDLg( DlgName ) { 
       
    // コンストラクタ, trueを指定してリサイズ可能なダイアログを生成
    CBaseDialog.call( this, DlgName, true ); 

    // 画像読み込み
    var uiImage = ScriptUI.newImage(imageFile);

    // パラメータ変更
    this.m_Dialog.opacity = 1.0;                                         // 不透明度 
    this.m_Dialog.preferredSize = [ imageWidth / 5, imageHeight / 5 ];   // ダイアログのサイズを変更(画像の５分の１サイズとした)

    // onResizing サイズ変更中に呼び出される
    this.isResizing = false; // 無限ループ防止フラグ

    // カスタム・カンバスを追加
    this.m_Canvas = this.m_Dialog.add("customview", undefined, {
        multiline: false,
        scrollable: false
    });
    this.m_Canvas.size = [this.m_Dialog.preferredSize.width, this.m_Dialog.preferredSize .height]; // ビューアの初期サイズ
    this.m_Canvas.orientation = "column";
    this.m_Canvas.alignment = ["fill", "fill"];
        
    // カスタム・カンバスのmousedown
    this.m_Canvas.addEventListener("mousedown", function(event) {
        var Sz = "Status: Mouse Down on Button (Button: " + event.button + ")";
        // event.button は左クリックで 0、中央で 1、右で 2 を返す
        //alert(Sz);
    });

    // カスタム・カンバスのonDraw
    this.m_Canvas.onDraw = function() {
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

} // コンストラクタ (ここまで) 

// クラス継承
ClassInheritance(CImageViewDLg, CBaseDialog);


// ClassInheritanceの後ろで、追加したいメソッドを定義
CImageViewDLg.prototype.onResizing = function() {

    var Obj  = CBaseDialog.TheObj;
    var Dlg  = Obj.m_Dialog;
    var Canv = Obj.m_Canvas;

    //if (Obj.isResizing) return;
    Obj.isResizing = true;

    var currentBounds = Dlg.bounds;
    var newWidth      = currentBounds.width;
    var newHeight     = currentBounds.height;
    var currentRatio  = newWidth / newHeight;    // 現在のサイズの縦横比を計算

    if (currentRatio > aspectRatio) {
        // 幅が広すぎる（高さが足りない）場合：高さを基準に幅を調整
        // 新しい幅 = 新しい高さ * 目標比率
            newWidth = newHeight * aspectRatio;
    } else {
        // 高さが広すぎる（幅が足りない）場合：幅を基準に高さを調整
        // 新しい高さ = 新しい幅 / 目標比率
        newHeight = newWidth / aspectRatio;
    }

    // 元の位置を維持しつつ、ビューアのサイズを変更
    Canv.size = [newWidth, newHeight];

    // 再描画を促す
    Canv.layout.layout(true);
    Obj.isResizing = false;
}


//インスタンスを生成。
var DlgPaint = new CImageViewDLg( "イメージ・ビューア" );


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
