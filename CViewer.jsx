/*
<javascriptresource>
<name></name>
</javascriptresource>
*/


// Ver.1.0 : 2026/02/25


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


/**
 * Photoshopの起動状態を確認し、必要なら起動してから色取得を実行する
 */
function checkAndRunPS(imgFile, x, y, callback) {
    var targetApp = "photoshop";
    var maxRetry = 30; // 最大30秒待機
    var retryCount = 0;

    // すでに起動している場合
    if (BridgeTalk.isRunning(targetApp)) {
        getPixelColorViaPS(imgFile, x, y, callback);
        return;
    }

    // 起動していない場合は起動命令を出す
    BridgeTalk.launch(targetApp);
    
    // プログレス表示や待機メッセージ
    var progressWin = new Window("palette", "Photoshop 起動待機中...");
    progressWin.add("statictext", undefined, "Photoshopを起動しています。完了までお待ちください。");
    var bar = progressWin.add("progressbar", [0, 0, 200, 10], 0, maxRetry);
    progressWin.show();

    /**
     * 再帰的なチェック用関数
     */
    function waitForLaunch() {
        if (BridgeTalk.isRunning(targetApp)) {
            progressWin.close();
            // 起動直後はメッセージを受け付けないことがあるため、1秒追加待機
            $.sleep(1000); 
            getPixelColorViaPS(imgFile, x, y, callback);
            return;
        }

        if (retryCount >= maxRetry) {
            progressWin.close();
            alert("タイムアウト: Photoshopの起動を確認できませんでした。\n手動でPhotoshopを起動してから再度お試しください。");
            return;
        }

        // カウントアップして再試行
        retryCount++;
        bar.value = retryCount;
        progressWin.update();
        
        $.sleep(1000); // 1秒待機
        waitForLaunch();
    }

    waitForLaunch();
}


/**
 * 拡大鏡（ルーペ）専用の浮動パレットクラス
 */
function CLoupePalette() {
    this.m_Win = new Window("palette", "拡大鏡 [x8]", undefined, {borderless: false});
    this.m_Win.margins = 5;
    
    // 200px四方の拡大表示領域
    this.m_View = this.m_Win.add("customview", [0, 0, 200, 200]);
    this.zoom = 8; // 拡大率
    
    this.targetImg = null; // 表示対象のScriptUIImage
    this.centerX = 0;      // 元画像上の中心Xピクセル
    this.centerY = 0;      // 元画像上の中心Yピクセル

    var self = this;
    
    // 描画ロジック
    this.m_View.onDraw = function() {

        //if (!self.targetImg) return;
        var g = this.graphics;

        // 背景を白で塗りつぶす処理
        var whiteBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1.0, 1.0, 1.0, 1.0]); // [R, G, B, A]
        g.rectPath(0, 0, 200, 200);
        g.fillPath(whiteBrush);

        // 拡大鏡のサイズ(200)に対して、元画像の何ピクセル分を切り出すか
        var ZoomVal = 4; //self.zoom;
        var UIScale = self.m_UIScale;
        var sampleSize = 200 / ZoomVal;
        var srcX = self.centerX - (sampleSize / 2);
        var srcY = self.centerY - (sampleSize / 2);
        g.drawImage(self.targetImg, -srcX*ZoomVal , -srcY*ZoomVal, self.targetImg_W*ZoomVal, self.targetImg_H*ZoomVal );

        var blackPen = g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1); 
        var myFont = ScriptUI.newFont("Arial", "BOLD", 20);
        g.drawString(self.targetImg_W + "," + self.targetImg_H, blackPen, 10, 5, myFont); 
        g.drawString("Mouse:"+self.centerX +","+self.centerY, blackPen, 10, 25, myFont); 
        g.drawString(srcX+","+srcY, blackPen, 10, 45, myFont); 
        g.drawString("sampleSize: " + sampleSize, blackPen, 10, 65, myFont); 

        // 1. 下地の黒い太線 (幅5px)
        var pBlack = g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0, 1], 5);
        g.moveTo(85, 100); g.lineTo(115, 100);
        g.moveTo(100, 85); g.lineTo(100, 115);

        // 2. 重ねる赤い細線 (幅2px)
        var pRed = g.newPen(g.PenType.SOLID_COLOR, [1, 0, 0, 1], 2);
        g.moveTo(85, 100); g.lineTo(115, 100);
        g.moveTo(100, 85); g.lineTo(100, 115);
    };
}

/**
 * 座標を更新して再描画させる
 */
CLoupePalette.prototype.update = function(img, img_W, img_H, scale, x, y) {
    this.targetImg = img;
    this.centerX = x;
    this.centerY = y;
    this.targetImg_W = img_W;
    this.targetImg_H = img_H;
    this.m_UIScale = scale;
    this.m_View.notify("onDraw");
};

CLoupePalette.prototype.show = function() { this.m_Win.show(); };
CLoupePalette.prototype.close = function() { this.m_Win.close(); };

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
    self.m_Loupe = new CLoupePalette();
    self.m_Loupe.show();

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


                    var zxzX =  self.mousePos.x; // マウスのローカルX座標
                    var zxzY =  self.mousePos.y; // マウスのローカルY座標

                    
                    
                        var pView   = pObj.m_Viewer;
                        var pCanvas = pView.m_Canvas;
                        var imageWidth   = pView.m_Image.width;      // 画像の幅
                        var imageHeight  = pView.m_Image.height;     // 画像の高さ
                        var canvasWidth  = pCanvas.size.width  * pView.m_UIScale;     // キャンバスの幅
                        var canvasHeight = pCanvas.size.height * pView.m_UIScale;    // キャンバスの高さ  
                        zxzX =  Math.floor( imageWidth  * ( self.mousePos.x / canvasWidth  ) );
                        zxzY =  Math.floor( imageHeight * ( self.mousePos.y / canvasHeight ) );
                    

                    // マウス位置に応じて拡大鏡を更新
                    self.m_Loupe.update(self.uiImage, imageWidth, imageHeight, pView.m_UIScale, zxzX, zxzY);
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
                        self.OnPickUp(event, pObj, imageFile); // メニュー表示へ
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
 * 1. PNG/JPG等を24bit非圧縮BMPに変換（前処理用）
 */
function createAnalysisBMP(srcFile) {
    if (!srcFile || !srcFile.exists) return null;

    var parentFolder = srcFile.path;
    
    // 1. 書き出し先のパスを決定（タイムスタンプで一意に）
    var timeStamp = new Date().getTime();
    var tempBMP = new File(parentFolder + "/zaz_spoit_" + timeStamp + ".bmp");

    var doc = null;

    try {
        // 2. ★新規ドキュメントを「追加」する
        // [カラーモード, 幅, 高さ] ※画像より十分大きいサイズで作成
        doc = app.documents.add(DocumentColorSpace.RGB, 2000, 2000);

        // 3. ★画像をドキュメントに配置する
        var pItem = doc.placedItems.add();
        pItem.file = srcFile;
        
        // 座標を左上(0,0)に固定
        pItem.position = [0, 0]; 

        // 4. 書き出しオプション（24bit非圧縮BMPを保証）
        var opts = new ImageCaptureOptions();
        opts.antiAliasing = false; // 色を忠実に再現するためOFF
        opts.matte = false;

        // 5. 画像のサイズに合わせて範囲を決定 [top, left, bottom, right]
        // Illustrator座標系：左上が(0,0)の場合、下方向はマイナス値
        var clipRect = [0, 0, -pItem.height, pItem.width];
        
        // BMPとして書き出しを実行
        doc.imageCapture(tempBMP, clipRect, opts);

        // 6. 後片付け：作成したドキュメントを保存せずに閉じる
        doc.close(SaveOptions.DONOTSAVECHANGES);

        $.writeln("Analysis BMP generated at: " + tempBMP.fsName);
        return tempBMP;

    } catch (e) {
        $.writeln("BMP Creation Error: " + e.message);
        if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
        return null;
    }
}

/**
 * 2. BMPバイナリから指定座標の色を高速抽出（クリック時用）
 */
function getPixelColorFromBMP(x, y, bmpFile) {
    if (!bmpFile || !bmpFile.exists) return null;
    try {
        bmpFile.encoding = "BINARY";
        bmpFile.open("r");
        bmpFile.seek(18);
        var w = readInt32(bmpFile);
        bmpFile.seek(22);
        var h = readInt32(bmpFile);
        
        var rowSize = Math.ceil((w * 3) / 4) * 4;
        var invY = h - 1 - Math.floor(y);
        var pos = 54 + (invY * rowSize) + (Math.floor(x) * 3);
        
        bmpFile.seek(pos);
        var b = bmpFile.read(1).charCodeAt(0);
        var g = bmpFile.read(1).charCodeAt(0);
        var r = bmpFile.read(1).charCodeAt(0);
        bmpFile.close();
        return [r, g, b];
    } catch (e) { return null; }
}

function readInt32(f) {
    var b = [f.read(1).charCodeAt(0), f.read(1).charCodeAt(0), f.read(1).charCodeAt(0), f.read(1).charCodeAt(0)];
    return (b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0];
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
        "  app.preferences.rulerUnits = Units.PIXELS;",
        "  var f = new File('" + imgFile.fullName + "');",
        "  if (!f.exists) return 'Error: File not found';",
        "  var doc = open(f, undefined, false);",
        "  app.activeDocument = doc;",
        "  if (doc.mode == DocumentMode.INDEXEDCOLOR) doc.changeMode(ChangeMode.RGB);",
        "  ",
        "  var safeX = Math.max(0, Math.min(" + targetX + ", doc.width.as('px') - 1));",
        "  var safeY = Math.max(0, Math.min(" + targetY + ", doc.height.as('px') - 1));",
        "  ",
        "  doc.colorSamplers.removeAll();",
        "  var sampler = doc.colorSamplers.add([safeX, safeY]);",
        "  var res = Math.round(sampler.color.rgb.red) + ',' + ",
        "            Math.round(sampler.color.rgb.green) + ',' + ",
        "            Math.round(sampler.color.rgb.blue);",
        "  ",
        "  // --- マーカー管理機能 ---",
        "  var groupName = 'AI_Picked_Colors';",
        "  var markerGroup;",
        "  try {",
        "    markerGroup = doc.layerSets.getByName(groupName);",
        "  } catch (e) {",
        "    markerGroup = doc.layerSets.add();",
        "    markerGroup.name = groupName;",
        "  }",
        "  ",
        "  var markerLayer = markerGroup.artLayers.add();", // グループ内に追加
        "  markerLayer.name = 'Color_' + res;",
        "  ",
        "  var region = [[safeX-2, safeY-2], [safeX+2, safeY-2], [safeX+2, safeY+2], [safeX-2, safeY+2]];",
        "  doc.selection.select(region);",
        "  var fillRGB = new SolidColor();",
        "  fillRGB.rgb.red = 255; fillRGB.rgb.green = 0; fillRGB.rgb.blue = 0;",
        "  doc.selection.fill(fillRGB);",
        "  doc.selection.deselect();",
        "  ",
        "  app.preferences.rulerUnits = savedRuler;",
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
    CViewer.call( this, pObj, pDialog, pPanelView, imageFile );      // コンストラクタ呼び出し
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
        menuWin.AddtMenu( LangStringsForViewer.Menu_ResetImageSize, function() { GlbObj.CreatePaletteObjects(); } );

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
        checkAndRunPS(imageFile, zxzX, zxzY, function(rgbArray) { GlbObj.PickUpedColors(rgbArray);});

        //var rgbArrayX = null;
        //analysisFile = createAnalysisBMP(imageFile);
        //var rgbArrayX = getPixelColorFromBMP(event.screenX, event.screenY, analysisFile);
        //if (rgbArrayX) {
        //    alert("CLI取得成功: RGB(" + rgbArrayX.join(",") + ")");
        //}

    } catch(e) {
        alert( e.message );
    }
}
