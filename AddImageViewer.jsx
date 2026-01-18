/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/

// Ver.1.0 : 2026/01/18

#target illustrator
#targetengine "main"

SELF = (function(){
    try {app.documents.test()}
    catch(e) {return File(e.fileName)}
})();

// 外部のJSXを読み込む
$.evalFile(SELF.path + "/ZazLib/" + "PaletteWindow.jsx");


// プロパティ・メソッドをコピーする汎用関数
function ClassInheritance(subClass, superClass) {
    for (var prop in superClass.prototype) {
        if (superClass.prototype.hasOwnProperty(prop)) {
            subClass.prototype[prop] = superClass.prototype[prop];
        }
    }
}


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
// クラス CImageViewDLg
//-----------------------------------

// コンストラクタ (ここから) 
function CImageViewDLg( DlgName, InstanceName ) { 
       
    // 初期化
    var TheObj = this;
    CPaletteWindow.call( TheObj, true );        // コンストラクタ, trueを指定してリサイズ可能なダイアログを生成
    TheObj.InitDialog( DlgName );               // イニシャライザ
    TheObj.InitInstance( InstanceName );        // インスタンス初期化
    var TheDialog = TheObj.GetDlg();          // ダイアログへのオブジェクトを得る

    // 画像読み込み
    var uiImage = ScriptUI.newImage(imageFile);

    // パラメータ変更
    TheDialog.opacity = 1.0;                                         // 不透明度 
    TheDialog.preferredSize = [ imageWidth / 5, imageHeight / 5 ];   // ダイアログのサイズを変更(画像の５分の１サイズとした)


     // onResizing サイズ変更中に呼び出される
    TheDialog.onResizing = function() {
        var currentBounds = this.bounds;
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

        // 元の位置を維持しつつ、新しいサイズを適用
        TheDialog.bounds = [
            currentBounds.left, 
            currentBounds.top, 
            currentBounds.left + newWidth, 
            currentBounds.top + newHeight
        ];

        canvas.size = [ newWidth, newHeight ]; // ビューアのサイズを変更
        TheDialog.preferredSize = [ newWidth, newHeight ]; 
    };


    // カスタム・カンバスを追加
    var canvas = TheDialog.add("customview", undefined, {
        multiline: false,
        scrollable: false
    });
    canvas.size = [TheDialog.preferredSize.width, TheDialog.preferredSize .height]; // ビューアの初期サイズ
    canvas.orientation = "column";
    canvas.alignment = ["fill", "fill"];

        
    // カスタム・カンバスのmousedown
    canvas.addEventListener("mousedown", function(event) {
        var Sz = "Status: Mouse Down on Button (Button: " + event.button + ")";
        // event.button は左クリックで 0、中央で 1、右で 2 を返す
        //alert(Sz);
    });


    // カスタム・カンバスのonDraw
    canvas.onDraw = function() {
        var canv = this;
        var g = canv.graphics;

        var blackPen = g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1); 
        var myFont = ScriptUI.newFont("Arial", "BOLD", 20); 

        if ( uiImage ) {
            // 画像をビュアーのサイズにリサイズして描画
            g.drawImage(uiImage, 0, 0, canv.size.width, canv.size.height);

            //g.drawString(TheDialog.size[0],  blackPen, 20,20, myFont);    // デバッグ用に文字を表示
            //g.drawString(canv.size.width,  blackPen, 20,40, myFont);    // デバッグ用に文字を表示
        }
    };

} // コンストラクタ (ここまで) 

// メソッドをコピー
ClassInheritance(CImageViewDLg, CPaletteWindow);


// ClassInheritanceの後ろで、追加したいメソッドを定義


//インスタンスを生成。なお、CHellowWorldDlgの引数にも、インスタンス名(DlgPaint)を記入のこと！！
var DlgPaint = new CImageViewDLg( "イメージ・ビューア", "DlgPaint" );


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
