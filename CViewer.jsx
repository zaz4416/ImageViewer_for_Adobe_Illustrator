/*
<javascriptresource>
<name></name>
</javascriptresource>
*/


// Ver.1.0 : 2026/02/22


// ディスプレイのスケーリング倍率を保存する
var _UIScale = 1.25; // デフォルト値（例: 1.25）。後で getUIScale 関数で上書きされる予定 

#include "CpopMenu.jsx"   // 共通のポップアップメニュークラス



// --- グローバル関数 -----------------------------------------------------------------

/**
 * 画像のオリジナルサイズを取得する（Photoshop/Illustrator両対応）
 */

function getImageSize(imageFile) {
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


// ---------------------------------------------------------------------------------

//-----------------------------------
// クラス CViewer
//-----------------------------------

// コンストラクタ
function CViewer(pObj, pDialog, pPanelView, imageFile) {
    var self         = this;
    self.Result      = null;
    self.GlobalScale = 0.25;            // 画像を表示する際のスケーリング（モニター解像度に合わせて調整される）
    self.m_Image     = null;            // 画像のオリジナルサイズ {width, height, ratio} を保持するオブジェクト
    self.mousePos    = { x: 0, y: 0 };  // マウスのローカル座標を保存するオブジェクト
    self.m_UIScale   = _UIScale;        // ディスプレイのスケーリング倍率を保存する

    try{
        self.m_Image = getImageSize(imageFile);
        var imageWidth   = self.m_Image.width;      // 画像の幅
        var imageHeight  = self.m_Image.height;     // 画像の高さ
        self.aspectRatio = self.m_Image.ratio;      // 画像の縦横比

        // --- モニター解像度を考慮したリサイズ ---
        {
            var screen = getScreenResolution();
            var ImaseSaling = self.GlobalScale; // 画像を表示する際のスケーリング
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

            targetH = Math.floor(targetH);
            targetW = Math.floor(targetW);

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
            //self.m_Canvas.alignment = ["fill", "fill"];
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

                    self.m_UIScale = getUIScale(self.m_Canvas); // UIのスケーリングを取得しておく（例: 1.25）

                    // 画像をビュアーのサイズにリサイズして描画
                    g.drawImage(self.uiImage, 0, 0, canv.size.width, canv.size.height);
                    
                    /*
                    if (self.mousePos.x !== 0 && self.mousePos.y !== 0) {
                        var p = g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1, 1], 1); // 白い線
                        // 横線
                        g.moveTo(self.mousePos.x - 10, self.mousePos.y);
                        g.lineTo(self.mousePos.x + 10, self.mousePos.y);
                        // 縦線
                        g.moveTo(self.mousePos.x, self.mousePos.y - 10);
                        g.lineTo(self.mousePos.x, self.mousePos.y + 10);
                    }
                    */

                    //g.drawString(self.mousePos.x + "," + self.mousePos.y,  blackPen, 20,20, myFont);    // デバッグ用にマウスの座標を表示
                    //g.drawString(canv.size.width + " x " + canv.size.height,  blackPen, 20,40, myFont);    // デバッグ用に文字を表示
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
                        //if (self.m_ColorBox) 
                        {
                            self.OnPickUp(event, pObj, imageFile); // メニュー表示へ
                        }
                        break;
                    case 1:
                        // 中央（ホイール）クリック
                        break;
                    case 2:
                        // 右クリック
                        self.showContextMenu(event, pObj); // メニュー表示へ
                        break;
                    default:
                        break;
                }
            });

            // マウスが動いた時の処理
            self.m_Canvas.addEventListener("mousemove", function(event) {
                // スクリーン座標からCanvas内の相対座標に変換して「保存」する
                var canvasLocation = GetMouseLocalLocation(event, self.m_Canvas);
                self.mousePos = {
                    x: canvasLocation.x,
                    y: canvasLocation.y
                };
                
                // 再描画を依頼（これをしないと onDraw が走らない）
                self.m_Canvas.notify("onDraw");
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
 * キャンバスへのオブジェクトを返す
 */
CViewer.prototype.GetCanvas = function() {
    try {
        var self = this;
        return self.m_Canvas;
    } catch(e) {
        alert( e.message );
    }
}


/**
 * Photoshopと通信して指定した画像ファイルの特定座標の色を取得する
 * @param {File} imgFile 解析対象の画像ファイルオブジェクト
 * @param {Number} x 画像上のX座標（ピクセル）
 * @param {Number} y 画像上のY座標（ピクセル）
 * @param {Function} callback 結果を受け取った後に実行する関数
 */
function getPixelColorViaPS(imgFile, x, y, callback) {
    // 1. 座標が数値であることを保証（undefined対策）
    var targetX = Number(x) || 0;
    var targetY = Number(y) || 0;

    // 2. BridgeTalkの設定
    var bt = new BridgeTalk();
    bt.target = "photoshop";

    // 3. Photoshop側で実行するスクリプト（文字列）
    // Illustrator側の変数 imageFile, targetX, targetY を使って組み立てます
    var psCode = [
        "(function() {",
        "  var savedRuler = app.preferences.rulerUnits;",
        "  app.preferences.rulerUnits = Units.PIXELS; // 単位をピクセルに強制",
        "  ",
        "  var f = new File('" + imgFile.fullName + "');",
        "  if (!f.exists) return 'Error: File not found';",
        "  ",
        "  var doc = open(f, undefined, false);",
        "  app.activeDocument = doc;",
        "  ",
        "  if (doc.mode == DocumentMode.INDEXEDCOLOR) doc.changeMode(ChangeMode.RGB);",
        "  ",
        "  // doc.width.as('px') を使うことで確実にピクセル数と比較",
        "  var w = doc.width.as('px');",
        "  var h = doc.height.as('px');",
        "  var safeX = Math.max(0, Math.min(" + targetX + ", w - 1));",
        "  var safeY = Math.max(0, Math.min(" + targetY + ", h - 1));",
        "  ",
        "  doc.colorSamplers.removeAll();",
        "  var sampler = doc.colorSamplers.add([safeX, safeY]);",
        "  ",
        "  var res = Math.round(sampler.color.rgb.red) + ',' + ",
        "            Math.round(sampler.color.rgb.green) + ',' + ",
        "            Math.round(sampler.color.rgb.blue);",
        "  ",
        "  var markerLayer = doc.artLayers.add();",
        "  markerLayer.name = 'Click_Marker_' + res;",
        "  ",
        "  // 選択範囲もピクセルで指定されるようになる",
        "  var region = [[safeX-2, safeY-2], [safeX+2, safeY-2], [safeX+2, safeY+2], [safeX-2, safeY+2]];",
        "  doc.selection.select(region);",
        "  ",
        "  var fillRGB = new RGBColor();",
        "  fillRGB.red = 255; fillRGB.green = 0; fillRGB.blue = 0;",
        "  doc.selection.fill(fillRGB);",
        "  doc.selection.deselect();",
        "  ",
        "  app.preferences.rulerUnits = savedRuler; // 単位を元に戻す",
        "  return res;",
        "})();"
    ].join("\n");

    bt.body = psCode;

    // 4. 結果が戻ってきた時の処理
    bt.onResult = function(resObj) {
        if (resObj.body.indexOf("Error") !== -1) {
            alert(resObj.body);
            return;
        }

        var rgbArray = resObj.body.split(","); // "255,128,0" -> [255, 128, 0]

        // 外部から渡された処理(callback)を実行する
        if (typeof callback === "function") {
            //alert("function exists. Executing callback with RGB: " + rgbArray.join(","));
            callback(rgbArray);
        } else {
            alert("No callback provided. RGB: " + rgbArray.join(","));
        }
    };

    // 5. 通信エラー時の処理
    bt.onError = function(errObj) {
        alert("Photoshopとの通信に失敗しました。\nPhotoshopが起動しているか確認してください。\n詳細: " + errObj.body);
    };

    // 6. 送信
    bt.send();
}



//-----------------------------------
// クラス CViewerOpration
//-----------------------------------

// コンストラクタ
function CViewerOpration( pObj, pDialog, pPanelView, imageFile ) { 
    CViewer.call( this, pObj, pDialog, pPanelView, imageFile );      // コンストラクタ
}

ClassInheritance(CViewerOpration, CViewer);   // クラス継承


/**
 * 右クリックメニューの構築と表示
 */
CViewerOpration.prototype.showContextMenu = function(event, pObj) {
    try {
        var GlbObj = pObj.GetDialogObject();

        // 1. PopMenuを作成
        var menuWin = new CPopMenu( event );
        
        // 2. PopMenuの項目を追加
        menuWin.AddtMenu( LangStringsForViewer.Menu_LoadImage, function() { GlbObj.onLoadImageClick(); } );
        menuWin.AddtMenu( LangStringsForViewer.Menu_ResetImageSize);

        // 3. メニューを表示
        menuWin.show();
    } catch(e) {
        alert( e.message );
    }
}


/**
 * 左クリックメニューの構築と表示
 */
CViewerOpration.prototype.OnPickUp = function(event, pObj, imageFile) {
    try {
        var GlbObj  = pObj.GetDialogObject();
        //alert("exevt:" + event.screenX + ", " + event.screenY); // デバッグ用：クリック位置のスクリーン座標を表示

        var pView   = GlbObj.m_Viewer;
        var pCanvas = GlbObj.m_Viewer.m_Canvas;
        var imageWidth   = pView.m_Image.width;      // 画像の幅
        var imageHeight  = pView.m_Image.height;     // 画像の高さ
        var canvasWidth  = pCanvas.size.width  * pView.m_UIScale;     // キャンバスの幅
        var canvasHeight = pCanvas.size.height * pView.m_UIScale;    // キャンバスの高さ
        var canvasLocation = GetMouseLocalLocation(event, pCanvas);    
        var zxzX =  Math.floor( imageWidth  * ( canvasLocation.x / canvasWidth  ) );
        var zxzY =  Math.floor( imageHeight * ( canvasLocation.y / canvasHeight ) );
        //alert("Clicked at local coordinates: (" + zxzX + ", " + zxzY + ")");
        
        // BridgeTalkでPSを呼び出し
        getPixelColorViaPS(imageFile, zxzX, zxzY, function(rgbArray) { GlbObj.PickUpedColors(rgbArray);});

    } catch(e) {
        alert( e.message );
    }
}
