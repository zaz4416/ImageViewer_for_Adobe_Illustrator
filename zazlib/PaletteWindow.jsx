
// Ver.1.0 : 2026/01/25

$.localize = true;  // OSの言語に合わせてローカライズする

// アプリケーションのバージョンを取得
function appVersion() {
  var tmp = app.version.toString().split('.') ;
  var res = [] ;
  for(var i = 0, len = tmp.length ; i < len ; i++) {
    res.push(Number(tmp[i])) ;
  }
  return res ;
}


function ClassInheritance(subClass, superClass) {
    // 1. 静的プロパティ・メソッドの継承 (親クラス自体のプロパティを子にコピー)
    for (var prop in superClass) {
        if (superClass.hasOwnProperty(prop)) {
            subClass[prop] = superClass[prop];
        }
    }

    // 2. プロトタイプチェーンの構築 (代理関数を使用)
    function Surrogate() {
        this.constructor = subClass;
    }
    Surrogate.prototype = superClass.prototype;
    subClass.prototype = new Surrogate();

    // 3. 親クラスへのショートカット（子クラスから親のメソッドを呼びやすくする）
    // 例: subClass.superClass.methodName.call(this)
    subClass.superClass = superClass.prototype;
}


//----------------------------------------
//  ベースクラス CPaletteWindow
//----------------------------------------

 var _OriginalWindow = Window;
 // CPaletteWindowのコンストラクタをここで定義
 function CPaletteWindow( ReSizeAble ) {
    $.writeln( "コンストラクタ_CPaletteWindow" );

    // インスタンスプロパティ (thisをつけてある変数を指す)
    // this.m_Dialog   ← 開示しない変数とする

    if ( ReSizeAble ) {
        // リサイズ可能なダイアログを生成
        this.m_Dialog = new Window( "palette", "", undefined, {resizeable: true} );
    }
    else{
        // リサイズ固定なダイアログを生成        
        this.m_Dialog = new Window( "palette", "", undefined, {resizeable: false} );
    }

    // インスタンスのコンストラクタ（子クラス自身）の静的プロパティに保存することで、動的に静的プロパティを定義
    this.constructor.self = this;
}

// CPaletteWindowのメソッドをここで定義
//  ・ベースとしたいクラスに限り、下記のようにまとめてメソッドを記述しても良い。
//  ・サブクラスでは、個別にメソッドを記述すること。下記のようにまとめて記述してはいけない。
CPaletteWindow.prototype = {

    InitDialog: function(DlgName) {
        // ダイアログ追加
        var Dlg = this.GetDlg();
        Dlg.text          = DlgName;
        Dlg.orientation   = "column";
        Dlg.alignChildren = [ "fill", "fill" ];
        Dlg.opacity       = 0.7; // （不透明度）
        $.writeln( "ダイアログ[ "+DlgName+" ]を生成");
    },

    GetDlg: function() {
        return ( this.m_Dialog );
    },

    ShowDlg: function() {
        var Dlg = this.GetDlg();
        Dlg.show();
        $.writeln("ダイアログ表示");
    },

    CloseDlg: function() {
        var Dlg = this.GetDlg();
        Dlg.close();
        $.writeln("ダイアログ閉じた");
    },

    addEventListener: function( p1, p2 ) {
        var Dlg = this.GetDlg();
        return Dlg.addEventListener( p1, p2 );
    },

    AddPanel: function(Text) {
        var Dlg = this.GetDlg();
        var PanelText = Dlg.add( "panel") ;
        return PanelText;
    },

    AddRadioButton: function(Text) {
        var Dlg = this.GetDlg();
        var RadioButtonText = Dlg.add( "radiobutton") ;
        RadioButtonText.text = Text;
        return RadioButtonText;
    },

    AddEditText: function(Text) {
        var Dlg = this.GetDlg();
        var EdText = Dlg.add( "edittext") ;
        EdText.text = Text;
        return EdText;
    },

    AddStaticText: function(Text) {
        var Dlg = this.GetDlg();
        var StText = Dlg.add( "statictext") ;
        StText.text = Text;
        return StText;
    },

    AddButton: function(Text) {
        var Dlg = this.GetDlg();
        var Btn = Dlg.add( "button") ;
        Btn.text = Text;
        return Btn;
    },

    AddChkBox: function(Text, Value) {
        var Dlg = this.GetDlg();
        var ChkBox = Dlg.add("checkbox",undefined, "");
        ChkBox.text = Text;
        ChkBox.value = Value;
        return ChkBox;
    },

    CallFunc: function( FuncName ) {
        var bt = new BridgeTalk;
        bt.target = BridgeTalk.appSpecifier;

        // this.constructor.name にて、クラス名を取得する。 
        // サブクラスから呼ばれると、サブクラス名を取得できる。
        bt.body = this.constructor.name + "." + FuncName + "();";   // 静的メソッドを呼ぶ

        bt.send();
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
