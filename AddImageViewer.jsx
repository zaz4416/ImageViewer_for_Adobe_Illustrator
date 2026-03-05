/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/
/* global $ */

// Ver.1.0 : 2026/03/05

#target illustrator
#targetengine "main"


// スクリプト実行時に外部のJSXを読み込む (#includeにすると、main関数が終了した時点で、ダイアログが表示されなくなる)
$.evalFile(GetScriptDir() + "ZazLib/ClassInheritance.jsx");
$.evalFile(GetScriptDir() + "ZazLib/Language.jsx");
$.evalFile(GetScriptDir() + "ZazLib/GlobalArray.jsx");
$.evalFile(GetScriptDir() + "ZazLib/PaletteWindow.jsx");
$.evalFile(GetScriptDir() + "CpopMenu.jsx");
$.evalFile(GetScriptDir() + "CViewer.jsx");


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
     Menu_ShowLoupe: {
        en : "Show loupe",
        ja : "拡大鏡を表示"
    },
    Menu_HiheLoupe: {
        en : "Hide loupe",
        ja : "拡大鏡を隠す"
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

// ---------------------------------------------------------------------------------

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

        {
            var viewer = GlbObj.m_Viewer;
            var state  = viewer.IsOpenLoupe() ? "Hide" : "Show";

            // キー名（Hide/Show）からラベルとメソッド名を自動選択
            var config = {
                Hide: { label: LangStringsForViewer.Menu_HiheLoupe, method: "HideLoupe" },
                Show: { label: LangStringsForViewer.Menu_ShowLoupe, method: "ShowLoupe" }
            }[state];

            menuWin.AddtMenu(config.label, function() { viewer[config.method](); });
        }

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

    } catch(e) {
        alert( e.message );
    }
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

    // コンストラクタや初期化メソッド内
    self.m_ColorHistory = []; // [ [r,g,b], [r,g,b], ... ]

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
            self.m_Viewer = new CViewerOpration( self, self.m_Dialog, self.m_PanelView, imageFile );
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
    var Canv  = self.m_Viewer.GetCanvas();
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
    var self = this.GetDialogObject();

    try {

        // ★ 強制的にアクティブ（最前面）にする
        self.m_Dialog.active = true;

        // ★対策1: Illustratorを最前面に呼び戻す
        // これをしないと、ドキュメントがあっても「無い」と判定されることがあります
        BridgeTalk.bringToFront("illustrator");

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

        // --- 履歴重複チェック ---
        var isDuplicate = false;
        var currentR = Number(rgbArray[0]);
        var currentG = Number(rgbArray[1]);
        var currentB = Number(rgbArray[2]);

        for (var i = 0; i < self.m_ColorHistory.length; i++) {
            var historyRGB = self.m_ColorHistory[i];
            // R, G, B すべてが許容範囲内であるか確認
            if (Math.abs(historyRGB[0] - currentR)< 3 && 
                Math.abs(historyRGB[1] - currentG)< 3&& 
                Math.abs(historyRGB[2] - currentB)< 3 ) {
                isDuplicate = true;
                break;
            }
        }


        // 重複していない場合のみ追加
        if (!isDuplicate) {
            // 念のためIllustratorを前面に呼び戻す
            // これにより操作権限が確実にIllustratorに戻ります
            BridgeTalk.bringToFront("illustrator");

            // 4. Illustratorのデフォルト塗り色にも反映（おまけ）
            {
                var bt = new BridgeTalk();
                bt.target = "illustrator"; // 自分自身をターゲットにする
                
                // 実行したいコードを文字列で記述
                bt.body = "if(app.documents.length > 0){" +
                        "  var doc = app.activeDocument;" +
                        "  var c = new RGBColor();" +
                        "  c.red=" + rgbArray[0] + "; c.green=" + rgbArray[1] + "; c.blue=" + rgbArray[2] + ";" +
                        "  doc.defaultFillColor = c;" +
                        "  app.redraw();" +
                        "}";
                        
                bt.send(); // 通信として投げることで、現在の「ロックされたスレッド」から脱出する
            }

            // 履歴に追加
            //履歴リストを表示した際に「直前に取った色」が一番上に来るように、unshiftで色を登録する
            self.m_ColorHistory.unshift([Number(rgbArray[0]), Number(rgbArray[1]), Number(rgbArray[2])]);
            $.writeln("History Count: " + self.m_ColorHistory.length);
        }


    } catch(e) {
        alert( e.message );
    }
}

CImageViewDLg.prototype.onEndOfDialogClick = function() {
    var  self = this.GetDialogObject();
    try {
        if ( self.m_Viewer !== null )
        {
            self.m_PanelView.remove(self.m_Viewer.GetCanvas());
            self.m_Viewer.close();
        }

        self.close();
    }
    catch(e) {
        alert( e.message );
    }
}

CImageViewDLg.prototype.onLoadImageClick = function() {
    var self = this.GetDialogObject();

    try {
        // 画像ファイル選択
        var imageFile = self.GetImageFile();

        if ( imageFile !== null ) {
            // 1. m_PanelView内のコントロールを削除
            if ( self.m_Viewer !== null )
            {
                self.m_PanelView.remove(self.m_Viewer.GetCanvas());
                self.m_Viewer.close();
            }

            // 2. レイアウトを更新（これを行わないと画面上が崩れる場合があります）
            self.m_PanelView.layout.layout(true);

            // 3. コンストラクタからの戻り値を得られないので、.ResultにCViewerの生成物を戻すようにした
            self.m_Viewer = new CViewerOpration( self, self.m_Dialog, self.m_PanelView, imageFile );
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

    return imageFile;
}

/**
 * 履歴にあるすべての色からカラーパレットを図形として生成する
 */
CImageViewDLg.prototype.CreatePaletteObjects = function() {
    var self = this.GetDialogObject();

    if (self.m_ColorHistory.length === 0) {
        alert("履歴がありません。先に色を取得してください。");
        return;
    }

    var doc = (app.documents.length > 0) ? app.activeDocument : app.documents.add(DocumentColorSpace.RGB);
    var startX = 100;
    var startY = 500;
    var rectSize = 50; // 四角のサイズ
    var gap = 10;      // 間隔

    for (var i = 0; i < this.m_ColorHistory.length; i++) {
        var rgb = this.m_ColorHistory[i];
        
        // 四角形を作成 [top, left, width, height]
        var rect = doc.pathItems.rectangle(startY, startX + (rectSize + gap) * i, rectSize, rectSize);
        
        // 色の設定
        var fillColor = new RGBColor();
        fillColor.red = rgb[0];
        fillColor.green = rgb[1];
        fillColor.blue = rgb[2];
        
        rect.fillColor = fillColor;
        rect.stroked = false; // 線なし
    }
    
    app.redraw();
    alert(this.m_ColorHistory.length + " 個の色でパレットを生成しました。");
};



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

            // ★ 強制的にアクティブ（最前面）にする
            Obj.m_Dialog.active = true;

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