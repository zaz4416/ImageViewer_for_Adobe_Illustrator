/*
<javascriptresource>
<name></name>
</javascriptresource>
*/


// Ver.1.0 : 2026/03/05


// ディスプレイのスケーリング倍率を保存する
var _UIScale = 1.25; // デフォルト値（例: 1.25）。後で getUIScale 関数で上書きされる予定 

#include "CLoupePalette.jsx"    // 拡大鏡のクラス


// --- グローバル関数 -----------------------------------------------------------------

/**
 * 現在のスケーリング倍率（UI係数）を取得する
 * @param {Control} control 表示済みのUIパーツ
 * @returns {Number} 倍率 (1.0, 1.25, 2.0 など)
 */
function getUIScale(control) {
    if (!control.screenBounds) return 1.25;
    
    // 物理幅 / 論理幅 を計算
    var scale = control.screenBounds.width / control.size.width;
    
    // 小数点第2位で丸める（誤差対策）
    return Math.round(scale * 100) / 100;
}


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


//------------------------------------------------
// 画像上の座標を、ウィンドウ内のローカル座標に変換して返す
//------------------------------------------------
function GetObjectLocalLocation(obj) {
    // ウィンドウ内での obj の累積相対座標を計算
    // (location は直近の親からの距離なので、親を遡って全部足す)
    var totalRelX = 0;
    var totalRelY = 0;
    var target = obj;

     while (target && target.type !== 'window') {
        totalRelX += target.location.x;
        totalRelY += target.location.y;
         
        // 親要素が Panel や Group の場合、その内側の余白(margins)も考慮する
        if (target.parent && (target.parent.type === 'panel' || target.parent.type === 'group')) {
            // margins.left / top が設定されている場合は加算
            if (target.parent.margins) {
                totalRelX += target.parent.margins.left;
                totalRelY += target.parent.margins.top;
            }
        }
        target = target.parent;
    }

    return {
        x:  totalRelX,
        y:  totalRelY + 10 // 10pxのオフセットを追加
    };
}


//---------------------------------------------------------------------
// マウスイベントのスクリーン座標を、obj（キャンバス）内のローカル座標に変換して返す
//---------------------------------------------------------------------
function GetMouseLocalLocation(event, obj) {
    var absLocation = GetObjectLocalLocation(obj);

    // マウスの絶対座標から「ウィンドウ位置 + キャンバス相対位置」を引く
    var localX = Math.floor(event.screenX - absLocation.x);
    var localY = Math.floor(event.screenY - absLocation.y);

    return {
        x:  localX,
        y:  localY
    };
}


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

    // ★ 対策1: ウィンドウをアクティブに設定
    progressWin.active = true;
    progressWin.show();
    
    // ★ 対策2: 表示直後にOSに描画を強制する
    progressWin.update();

    //alert("Staet")

    var isLaunched = false;

    // --- 起動待ちループ ---
    while (retryCount < maxRetry) {
        if (BridgeTalk.isRunning(targetApp)) {
            isLaunched = true;
            break; // ループを抜ける
        }
        
        retryCount++;
        if (bar) bar.value = retryCount;
        progressWin.update();
        $.sleep(1000);
    }

    if (isLaunched) {
        $.sleep(2000); // 起動直後の安定待ち
        
        // --- 2. 画像が読み込まれているか確認する通信を開始 ---
        // この時点ではまだ progressWin は開いたままです
        checkImageOpenedInPS(imgFile, function(isOpened) {
            
            // 通信完了でプログレス窓を閉じる
            if (progressWin) {
                progressWin.close();
            }

            if (isOpened) {
                // 画像があれば解析へ
                getPixelColorViaPS(imgFile, x, y, callback);
            } else {
                alert("Photoshopで画像が開かれていません。");
            }
        });
        
    } else {
        progressWin.close();
        alert("タイムアウト：Photoshopの起動が確認できませんでした。");
    }

    //alert("End")
}

// ---------------------------------------------------------------------------------

//-----------------------------------
// クラス CViewer
//-----------------------------------
function CViewer(pObj, pDialog, pPanelView, imageFile) {
    var self         = this;
    self.Result      = null;
    self.GlobalScale = 0.25;            // 画像を表示する際のスケーリング（モニター解像度に合わせて調整される）
    self.m_Image     = null;            // 画像のオリジナルサイズ {width, height, ratio} を保持するオブジェクト
    self.mousePos    = { x: 0, y: 0 };  // マウスのローカル座標を保存するオブジェクト
    self.m_UIScale   = _UIScale;        // ディスプレイのスケーリング倍率を保存する
    self.m_Loupe = null;

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
                    if ( self.m_Loupe  !== null ) {
                        self.m_Loupe.update(self.uiImage, imageWidth, imageHeight, pView.m_UIScale, zxzX, zxzY);
                    }
                }
            }

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


CViewer.prototype.close = function() {
    try {
        var self = this;
        if ( self.m_Loupe !== null ) {
            self.m_Loupe.close();
        }

    } catch(e) {
        alert( e.message );
    }
};

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

CViewer.prototype.ShowLoupe= function() {
    try {
        var self = this;
        if ( self.m_Loupe === null ) {
            self.m_Loupe = new CLoupePalette();
        }
        self.m_Loupe.show();
    } catch(e) {
        alert( e.message );
    }
}

CViewer.prototype.HideLoupe= function() {
    try {
        var self = this;
        if ( self.m_Loupe !== null ) {
            self.m_Loupe.hide();
        }
    } catch(e) {
        alert( e.message );
    }
}

CViewer.prototype.IsOpenLoupe= function(pObj) {
    var self = this;
    if ( self.m_Loupe !== null ) {
        return self.m_Loupe.IsOpne();
    }
    return false;
}


/**
 * Photoshop側で画像が開かれているか確認し、なければ読み込む
 * 完了後、Photoshop側からIllustratorを最前面に呼び戻す
 */
function checkImageOpenedInPS(imgFile, onCheckComplete) {
    var bt = new BridgeTalk();
    bt.target = "photoshop";

    var psCheckCode = [
        "(function() {",
        "    var f = new File('" + imgFile.fullName + "');",
        "    var targetDoc = null;",
        "    var success = false;",
        "    ",
        "    // 1. すでに開いているドキュメントから一致するものを探す",
        "    if (app.documents.length > 0) {",
        "        for (var i = 0; i < app.documents.length; i++) {",
        "            if (decodeURI(app.documents[i].fullName) === decodeURI(f.fullName)) {",
        "                targetDoc = app.documents[i];",
        "                app.activeDocument = targetDoc;",
        "                success = true; break;",
        "            }",
        "        }",
        "    }",
        "    ",
        "    // 2. 開いていない場合は読み込みを試みる",
        "    if (!success) {",
        "        if (!f.exists) return 'Error: File not found';",
        "        try {",
        "            app.displayDialogs = DialogModes.NO;",
        "            var openedDoc = open(f);",
        "            if (openedDoc) {",
        "                app.activeDocument = openedDoc;",
        "                success = true;",
        "            }",
        "        } catch (e) {",
        "            return 'Error: ' + e.message;",
        "        }",
        "    }",
        "    ",
        "    // ★【重要】処理が終わったら、Photoshop側からIllustratorを前面に出す",
        "    // 送信元(PS)から命令を出すことで、OSのフォーカス規制を突破しやすくなります",
        "    if (success) BridgeTalk.bringToFront('illustrator');",
        "    ",
        "    return success ? 'true' : 'false';",
        "})();"
    ].join("\n");

    bt.body = psCheckCode;

    bt.onResult = function(resObj) {
        var res = resObj.body.replace(/[\r\n]/g, "");

        if (res.indexOf("Error") !== -1) {
            $.writeln("PS Check Error: " + res);
            onCheckComplete(false);
            return;
        }

        onCheckComplete(res === "true");
    };

    bt.onError = function(errObj) {
        $.writeln("BridgeTalk Error: " + errObj.body);
        onCheckComplete(false);
    };

    bt.send();
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
        "    var savedRuler = app.preferences.rulerUnits;",
        "    app.preferences.rulerUnits = Units.PIXELS;",
        "    var f = new File('" + imgFile.fullName + "');",
        "    if (!f.exists) return 'Error: File not found';",
        "    ",
        "    var doc = open(f);",
        "    app.activeDocument = doc;",
        "    if (doc.mode === DocumentMode.INDEXEDCOLOR) doc.changeMode(ChangeMode.RGB);",
        "    ",
        "    // 座標のクランプ処理（ドキュメントサイズ内に収める）",
        "    var w = doc.width.as('px');",
        "    var h = doc.height.as('px');",
        "    var safeX = Math.max(0, Math.min(" + targetX + ", w - 1));",
        "    var safeY = Math.max(0, Math.min(" + targetY + ", h - 1));",
        "    ",
        "    // サンプラーで色を取得",
        "    doc.colorSamplers.removeAll();",
        "    var sampler = doc.colorSamplers.add([safeX, safeY]);",
        "    var rgb = sampler.color.rgb;",
        "    var res = Math.round(rgb.red) + ',' + Math.round(rgb.green) + ',' + Math.round(rgb.blue);",
        "    ",
        "    // --- マーカー管理（レイヤーセット構造の最適化） ---",
        "    var groupName = 'AI_Picked_Colors';",
        "    var markerGroup;",
        "    try {",
        "        markerGroup = doc.layerSets.getByName(groupName);",
        "    } catch (e) {",
        "        markerGroup = doc.layerSets.add();",
        "        markerGroup.name = groupName;",
        "    }",
        "    ",
        "    // 新規レイヤー作成と描画処理",
        "    var markerLayer = markerGroup.artLayers.add();",
        "    markerLayer.name = 'Color_' + res + ' (at ' + Math.round(safeX) + ',' + Math.round(safeY) + ')';",
        "    ",
        "    // 選択範囲を作成（4pxの正方形）",
        "    var r = 2; // 半径",
        "    var region = [[safeX-r, safeY-r], [safeX+r, safeY-r], [safeX+r, safeY+r], [safeX-r, safeY+r]];",
        "    doc.selection.select(region);",
        "    ",
        "    var fillColor = new SolidColor();",
        "    fillColor.rgb.red = 255; fillColor.rgb.green = 0; fillColor.rgb.blue = 0;",
        "    ",
        "    try {",
        "        doc.selection.fill(fillColor);",
        "        doc.selection.deselect();",
        "    } catch(e) {",
        "        // 背景レイヤーのみの場合などのエラー回避",
        "    }",
        "    ",
        "    app.preferences.rulerUnits = savedRuler;",
        "    return res;",
        "})();"
    ].join("\n");

    bt.body = psCode;


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
