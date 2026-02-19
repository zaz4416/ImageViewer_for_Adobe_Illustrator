/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/
/* global $ */

// Ver.1.0 : 2026/02/19

#target illustrator
#targetengine "main"


// スクリプト実行時に外部のJSXを読み込む (#includeにすると、main関数が終了した時点で、ダイアログが表示されなくなる)
$.evalFile(GetScriptDir() + "ZazLib/ClassInheritance.jsx");
$.evalFile(GetScriptDir() + "ZazLib/Language.jsx");
$.evalFile(GetScriptDir() + "ZazLib/GlobalArray.jsx");
$.evalFile(GetScriptDir() + "ZazLib/PaletteWindow.jsx");


// 言語ごとの辞書を定義
var MyDictionaryForViewer = {
    GUI_JSX: {
        en : "GUI/Panele_ImageViewer/ScriptUI Dialog Builder - Export_EN.jsx",
        ja : "GUI/Panele_ImageViewer/ScriptUI Dialog Builder - Export_JP.jsx"
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
        ja : "画像サイズを,リセット"
    },
    Msg_cant_run: {
        en: "Can't run",
        ja: "これ以上、起動できません"
    }
};


// --- 辞書から自動翻訳処理 ---
var LangStringsForViewer = GetWordsFromDictionary( MyDictionaryForViewer );

// オブジェクトの最大保持数
var _MAX_INSTANCES = 5;


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
 * 実行中スクリプトの親フォルダ（Folderオブジェクト）を返す。
 * なお、戻り値の最後には/が付与される。
 */
function GetScriptDir() {
    var selfFile = null;
    try {
        selfFile = new File(decodeURI($.fileName || Folder.current.fullName));
    } catch (e) {
        return Folder.current.fullName.replace(/\/*$/, "/");
    }
    var dirPath = (selfFile !== null) ? selfFile.parent.fullName : Folder.current.fullName;

    // 末尾にスラッシュがなければ付与して返す
    return dirPath.replace(/\/*$/, "/");
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

// ---------------------------------------------------------------------------------


//-----------------------------------
// クラス CViewer
//-----------------------------------

// コンストラクタ
function CViewer(pObj, pDialog, pPanelView, imageFile) {

    var self         = this;
    self.Result      = null;
    self.xDialog     = pDialog;
    self.GlobalScale = 0.25;            // 画像を表示する際のスケーリング（モニター解像度に合わせて調整される）
    self.m_Image     = null;            // 画像のオリジナルサイズ {width, height, ratio} を保持するオブジェクト
    self.mousePos    = { x: 0, y: 0 };  // マウスのローカル座標を保存するオブジェクト
    self.m_UIScale   = 1.25;            // ディスプレイのスケーリング倍率を保存する（例: 1.25）

    try{
        self.m_Image = self.getImageSize(imageFile);
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
CViewer.prototype.showContextMenu = function(event, pObj) {
    try {
        var GlbObj = pObj.GetDialogObject();

        // 1. 枠なしの小型パレットを作成（これがメニューの実体になる）
        var menuWin = new CPopMenu( event.screenX, event.screenY );
        
        // 2. メニュー項目の追加（ボタンの見た目をフラットにしてメニューに見せる）
        menuWin.AddtMenu( LangStringsForViewer.Menu_LoadImage, function() { GlbObj.onLoadImageClick(); } );
        menuWin.AddtMenu( LangStringsForViewer.Menu_ResetImageSize);

        // 3. メニューを表示
        menuWin.show();
    } catch(e) {
        alert( e.message );
    }
}


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
 * 左クリックメニューの構築と表示
 */
CViewer.prototype.OnPickUp = function(event, pObj, imageFile) {
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

    try {
        btn = self.m_Menu.add("button", undefined, MenuString);
        btn.onClick = function() {
            self.m_Menu.close();
            if (typeof func === "function") func();
        };
    } catch(e) {
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
function CImageViewDLg( scriptName ) { 
    CPaletteWindow.call( this, scriptName, _MAX_INSTANCES, true );      // コンストラクタ
    var self = this;

    self.m_Viewer = null;   // ビューアは未定義状態
    self.isResizing = false; // 無限ループ防止フラグ (onResizing サイズ変更中に呼び出される)

    if ( self.IsDialg()) {
        // GUI用のスクリプトを読み込む
        if ( self.LoadGUIfromJSX( GetScriptDir() + LangStringsForViewer.GUI_JSX ) )
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
            self.m_Viewer = new CViewer( self, self.m_Dialog, self.m_PanelView, imageFile );
            self.m_Viewer = self.m_Viewer.Result;

            if ( self.m_Viewer === null ) {
                alert(LangStringsForViewer.Msg_CantLoadImage);
                return;
            } 

            // パラメータ変更
            self.m_Dialog.opacity = 1.0;   // 不透明度 

            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            // インスタンスメソッドを呼ぶための紐付け
            //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            // onResizing サイズ変更中に呼び出される
            self.m_Dialog.onResizing = function() { 
                self.onResizing();
            };

            // 最後に、新しいインスタンスを追加
            self.RegisterInstance();
        }
        else {
            alert( LangStringsForViewer.Msg_UndefineGUI );
            return;
        }
    }
}

ClassInheritance(CImageViewDLg, CPaletteWindow);   // クラス継承


// ClassInheritanceの後ろで、追加したいメソッドを定義
CImageViewDLg.prototype.onResizing = function() {

    var self = this.GetDialogObject();

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

CImageViewDLg.prototype.PickUpedColors = function(rgbArray) {
    //alert("Picked up color - R:" + rgbArray[0] + " G:" + rgbArray[1] + " B:" + rgbArray[2]);

    var self = this.GetDialogObject();

    try {

        // 1. 文字列を数値に変換
        var r = Number(rgbArray[0]);
        var g = Number(rgbArray[1]);
        var b = Number(rgbArray[2]);

        // 2. テキストラベルの更新 (RGB形式とHEX形式)
        var hex = "#" + 
            ("0" + r.toString(16)).slice(-2) + 
            ("0" + g.toString(16)).slice(-2) + 
            ("0" + b.toString(16)).slice(-2);
        
        if (self.m_ColorLabel) {
            self.m_ColorLabel.text = "(" + r + ", " + g + ", " + b + ")  HEX: " + hex.toUpperCase();
        }

        // 3. 色見本パネルの背景色を更新
        if (self.m_ColorBox) {
            var gph = self.m_ColorBox.graphics;
            // ScriptUIは 0.0 ～ 1.0 の範囲で指定するため 255 で割る
            var normR = r / 255;
            var normG = g / 255;
            var normB = b / 255;
            
            var myBrush = gph.newBrush(gph.BrushType.SOLID_COLOR, [normR, normG, normB, 1]);
            gph.backgroundColor = myBrush;
        }

        // 4. Illustratorのデフォルト塗り色にも反映（おまけ）
        if (app.documents.length > 0) {
            var newColor = new RGBColor();
            newColor.red = r;
            newColor.green = g;
            newColor.blue = b;
            app.activeDocument.defaultFillColor = newColor;
        }

    } catch(e) {
        alert( e.message );
    }
}

CImageViewDLg.prototype.onEndOfDialogClick = function() {
    var  self = this.GetDialogObject();;
    try {
        self.close();
    }
    catch(e) {
        alert( e.message );
    }
}

CImageViewDLg.prototype.onLoadImageClick = function() {
    var self = this.GetDialogObject();;

    try {
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
            self.m_Viewer = new CViewer( self, self.m_Dialog, self.m_PanelView, imageFile );
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


function main()
{
    var appName = app.name;
    // 実行結果の例:
    // "Adobe Illustrator"
    // "Adobe Photoshop"

    // バージョン・チェック
    if( appName === "Adobe Illustrator" && appVersion()[0]  >= 24 )
    {
        // 実行中のスクリプト名を取得（拡張子なし）
        var scriptName = decodeURI(File($.fileName).name).replace(/\.[^\.]+$/, "");

        var Obj = new CImageViewDLg(scriptName);  // 新しいインスタンスを生成
        if ( Obj.IsDialg() ) {
            // インデックスをタイトルの先頭に表示
            var Index = Obj.GetGlobalIndex();
            var Title = Obj.GetDialogTitle();
            Obj.SetDialogTitle( "[" + Index + "]" + Title );

            Obj.show();                     // インスタンスを表示

            // palette なら show() の直後でもここが実行される
            $.writeln("表示されました！"); 
        }else {
            alert( LangStringsForViewer.Msg_cant_run );
        }
    }
    else
    {
        alert( LangStringsForViewer.Msg_Require ) ; 
    }
}

main();