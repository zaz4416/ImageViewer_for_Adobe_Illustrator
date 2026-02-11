
// Ver.1.0 : 2026/02/10


// --- グローバル関数 -----------------------------------------------------------------

// アプリケーションのバージョンを取得
function appVersion() {
  var tmp = app.version.toString().split('.') ;
  var res = [] ;
  for(var i = 0, len = tmp.length ; i < len ; i++) {
    res.push(Number(tmp[i])) ;
  }
  return res ;
}

// ---------------------------------------------------------------------------------


//----------------------------------------
//  ベースクラス CPaletteWindow
//----------------------------------------

 var _OriginalWindow = Window;
 // CPaletteWindowのコンストラクタをここで定義
 function CPaletteWindow( scriptName, MaxInstance, ReSizeAble ) {
    var self = this;
    self.m_Dialog = null;
    self.m_ArrayOfObj = new CGlobalArray( scriptName, MaxInstance );

    if ( self.Is_it_possible_to_register() ) {
        $.writeln( "コンストラクタ_CPaletteWindow" );
        var resizableProp = { resizeable: ReSizeAble };
        self.m_Dialog = new Window("palette", scriptName, undefined, resizableProp);
    } else {
        self.m_ArrayOfObj = null;
    }

    // インスタンスのコンストラクタ（子クラス自身）の静的プロパティに保存することで、動的に静的プロパティを定義
    self.constructor.self = self;
}

// CPaletteWindowのメソッドをここで定義
//  ・ベースとしたいクラスに限り、下記のようにまとめてメソッドを記述しても良い。
//  ・サブクラスでは、個別にメソッドを記述すること。下記のようにまとめて記述してはいけない。
CPaletteWindow.prototype = {

    SetDialogTitle: function(title) {
        var self = this;
        if ( self.m_Dialog ) {
            self.m_Dialog.text = title;
        }
    },

    GetDialogTitle: function() {
        var self = this;
        if ( self.m_Dialog ) {
            return self.m_Dialog.text;
        }
        return "";
    },

    GetGlobalIndex: function() {
        var self = this;
        if ( self.m_ArrayOfObj ) {
            return  self.m_ArrayOfObj.ArrayIndex;
        } else {
            return -1;
        }
    },

    GetGlobalDialog: function() {
        var self = this;
        if ( self.m_ArrayOfObj ) {
            return self.m_ArrayOfObj.GetGlobalObject();
        }
        return null;
    },

    GetDialogObject: function() {
        var self = this;
        if ( self.m_ArrayOfObj ) {
            return self.m_ArrayOfObj.GetGlobalObject();
        }
        return null;
    },

    IsDialg: function() {
        var self = this;
        if (self.m_Dialog!= null) {
            return true;
        }
        return false;
    },

    DirectCallFunc: function( FuncName ) {
        var self = this;
        if ( self.m_ArrayOfObj ) {
            eval( self.m_ArrayOfObj.GetGlobalClass() + FuncName ); 
        } 
    },

    Is_it_possible_to_register: function() {
        var self = this;
        return self.m_ArrayOfObj.Is_it_possible_to_register();
    },

    CallFunc: function( FuncName ) {
            var self = this;
        if ( self.m_ArrayOfObj && self.m_ArrayOfObj.ArrayIndex >= 0 ) {
            var bt = new BridgeTalk;
            bt.target = BridgeTalk.appSpecifier;
            bt.body   = self.m_ArrayOfObj.GetGlobalClass() + FuncName;
            bt.send();
        } else {
            alert("Undefine ArrayIndex in CallFuncWithGlobalArray.");
        }
    },

    RegisterInstance: function() {
        var self = this;
        if ( self.m_ArrayOfObj ) {
            return self.m_ArrayOfObj.RegisterInstance( self );
        }
    },

    GetDlg: function() {
        var self = this;
        if (self.m_Dialog) {
            return ( self.m_Dialog );
        }
        return null;
    },

    show: function() {
        var self = this.GetGlobalDialog();
        if (self && self.m_Dialog) {
            self.m_Dialog.center(); // 中央に表示
            self.m_Dialog.show();
            $.writeln("show()");
        } else {
            $.writeln("Error: Global instance not found for show().");
        }
    },

    close: function() {
        var self = this.GetGlobalDialog();
        if ( self.m_ArrayOfObj && self.m_Dialog) {
            self.m_Dialog.close();

            //--- close後のメモリ解放 ---
            self.m_ArrayOfObj.DeleteObject();

            // 2. メモリ解放（念のため）
            self.m_Dialog = null;
            return true; // 閉じることを許可
        }
    },

    addEventListener: function( p1, p2 ) {
        var self = this;
        var Dlg = self.GetDlg();
        return Dlg.addEventListener( p1, p2 );
    },

    AddPanel: function(Text) {
        var self = this;
        var Dlg = self.GetDlg();
        var PanelText = Dlg.add( "panel") ;
        return PanelText;
    },

    AddRadioButton: function(Text) {
        var self = this;
        var Dlg = self.GetDlg();
        var RadioButtonText = Dlg.add( "radiobutton") ;
        RadioButtonText.text = Text;
        return RadioButtonText;
    },

    AddEditText: function(Text) {
        var self = this;
        var Dlg = self.GetDlg();
        var EdText = Dlg.add( "edittext") ;
        EdText.text = Text;
        return EdText;
    },

    AddStaticText: function(Text) {
        var self = this;
        var Dlg = self.GetDlg();
        var StText = Dlg.add( "statictext") ;
        StText.text = Text;
        return StText;
    },

    AddButton: function(Text) {
        var self = this;
        var Dlg = self.GetDlg();
        var Btn = Dlg.add( "button") ;
        Btn.text = Text;
        return Btn;
    },

    AddChkBox: function(Text, Value) {
        var self = this;
        var Dlg = self.GetDlg();
        var ChkBox = Dlg.add("checkbox",undefined, "");
        ChkBox.text = Text;
        ChkBox.value = Value;
        return ChkBox;
    },

    LoadGUIfromJSX: function( GUI_JSX_Path ) {
        var self = this;

        // 1. 偽のコンストラクタ（既存のダイアログを返す）
        var FakeWindow = function() {
            $.writeln( "オーバーライドされたwindowを実行" );
            return self.m_Dialog;
        };
        // オリジナルのWindowプロトタイプを継承させておく（instanceof対策）
        FakeWindow.prototype = _OriginalWindow.prototype;

        // 2. 外部ファイルのコードを文字列として読み込む
        // ※ $.fileName を使うことで、このJSXファイルからの相対パスを正確に取得
        var currentPath = new File($.fileName).path;
        var guiFile = new File( GUI_JSX_Path) ;
        
        var guiCode = "";
        if (guiFile.open("r")) {
            guiCode = guiFile.read();
            guiFile.close();
        } else {
            alert("GUI定義ファイルが見つかりません: " + guiFile.fullName);
            return false;
        }

        // 3. 即時関数によるスコープの差し替え
        // 第1引数に FakeWindow を渡すことで、guiCode 内の "new Window" が
        // グローバルの Window ではなく、FakeWindow（= self.m_Dialog）を参照します
        (function(Window) {
            try {
                // 1. guiCode から "var 変数名" をすべて抜き出す（正規表現）
                var varNames = [];
                var match;
                // var の後ろにある単語を抽出する正規表現
                var regex = /var\s+([a-zA-Z0-9_]+)/g;
                while ((match = regex.exec(guiCode)) !== null) {
                    varNames.push(match[1]);
                }

                // 2. 変数を外に引き出すための「エクスポート用コード」を生成
                // eval の末尾で実行させ、定義された変数を return させる
                var exportSnippet = "\n; (function(){ \n var __result = {};";
                for (var i = 0; i < varNames.length; i++) {
                    var v = varNames[i];
                    // 変数が定義されている場合のみ、戻り値のオブジェクトに格納
                    exportSnippet += "if(typeof " + v + " !== 'undefined') __result['" + v + "'] = " + v + ";\n";
                }
                exportSnippet += "return __result; \n })();";

                // 3. 元のコードとエクスポートコードを合体させて eval を実行し、結果を受け取る
                var extractedVars = eval(guiCode + exportSnippet);

                // 4. 受け取った変数を一括で self (インスタンス) に紐付ける
                for (var key in extractedVars) {
                    if (extractedVars.hasOwnProperty(key)) {
                        // button1, group1 などが自動的に self に登録される
                        self[key] = extractedVars[key];
                        $.writeln("GUIプロパティ追加: " + key); // デバッグ用
                    }
                }
            } catch (e) {
                alert("GUI実行エラー: " + e.message);
                return false;
            }
        })(FakeWindow);
        return true;
    }

} // prototype
