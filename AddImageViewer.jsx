/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/

// Ver.1.0 : 2026/01/23

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


//-----------------------------------
// クラス CBaseDialog
//-----------------------------------

// コンストラクタ
function CBaseDialog( DlgName, ResizeWindow ) { 

    CPaletteWindow.call( this, ResizeWindow ); // コンストラクタ
    this.InitDialog( DlgName );                // イニシャライザ
    
    // 1. インスタンスのコンストラクタ（子クラス自身）の静的プロパティに保存
    //this.constructor.TheObj = this;

    // 2. インスタンスを指す参照を固定（クロージャ）
    var self = this;

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
function CImageViewDLg( DlgName ) { 
       
    // コンストラクタ, trueを指定してリサイズ可能なダイアログを生成
    CBaseDialog.call( this, DlgName, true );

    this.aspectRatio = imageWidth / imageHeight;

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

}

ClassInheritance(CImageViewDLg, CBaseDialog);   // クラス継承


// ClassInheritanceの後ろで、追加したいメソッドを定義
CImageViewDLg.prototype.onResizing = function() {

    var Dlg  = this.m_Dialog;
    var Canv = this.m_Canvas;

    if (this.isResizing) return;
    this.isResizing = true;

    try {
        var currentBounds = Dlg.bounds;
        var newWidth      = currentBounds.width;
        var newHeight     = currentBounds.height;
        var currentRatio  = newWidth / newHeight;    // 現在のサイズの縦横比を計算

        if (currentRatio > this.aspectRatio) {
            // 幅が広すぎる（高さが足りない）場合：高さを基準に幅を調整
            // 新しい幅 = 新しい高さ * 目標比率
                newWidth = newHeight * this.aspectRatio;
        } else {
            // 高さが広すぎる（幅が足りない）場合：幅を基準に高さを調整
            // 新しい高さ = 新しい幅 / 目標比率
            newHeight = newWidth / this.aspectRatio;
        }

        // 元の位置を維持しつつ、ビューアのサイズを変更
        Canv.size = [newWidth, newHeight];

        // キャンバスを中央に配置（ダイアログのサイズとキャンバスのサイズの差分から計算）
        var offsetX = (Dlg.size.width - newWidth) / 2;
        var offsetY = (Dlg.size.height - newHeight) / 2;
        Canv.location = [offsetX, offsetY];

        // 再描画を促す
        Canv.layout.layout(true);
    } catch (e) {
        $.writeln(e.message);
    } finally {
        // 必ずフラグを戻す
        this.isResizing = false;
    }
}


//インスタンスを生成。
var DlgPaint = new CImageViewDLg( "イメージ・ビューア" );


main();

function main()
{
    DlgPaint.ShowDlg(); 
}
