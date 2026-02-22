/*
<javascriptresource>
<name>イメージ・ビューア</name>
</javascriptresource>
*/
/* global $ */

// Ver.1.0 : 2026/02/22

#target illustrator
#targetengine "main"


// スクリプト実行時に外部のJSXを読み込む (#includeにすると、main関数が終了した時点で、ダイアログが表示されなくなる)
$.evalFile(GetScriptDir() + "ZazLib/ClassInheritance.jsx");
$.evalFile(GetScriptDir() + "ZazLib/Language.jsx");
$.evalFile(GetScriptDir() + "ZazLib/GlobalArray.jsx");
$.evalFile(GetScriptDir() + "ZazLib/PaletteWindow.jsx");
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

// ディスプレイのスケーリング倍率を保存する
var _UIScale = 1.25; // デフォルト値（例: 1.25）。後で getUIScale 関数で上書きされる予定   



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


// ---------------------------------------------------------------------------------



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

        // 4. Illustratorのデフォルト塗り色にも反映（おまけ）
        if (app.documents.length > 0) {
            var doc = app.activeDocument;
            var newColor = new RGBColor();
            newColor.red = r;
            newColor.green = g;
            newColor.blue = b;

            // 塗り色を適用
            doc.defaultFillColor = newColor;
            
            // 画面を更新して反映を即座に見せる
            app.redraw();
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
                self.m_PanelView.remove(self.m_Viewer.GetCanvas());
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