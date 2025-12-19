
// Ver.1.0 : 2025/12/20


// アプリケーションのバージョンを取得
function appVersion() {
  var tmp = app.version.toString().split('.') ;
  var res = [] ;
  for(var i = 0, len = tmp.length ; i < len ; i++) {
    res.push(Number(tmp[i])) ;
  }
  return res ;
}


//----------------------------------------
//  ベースクラス CPaletteWindow
//----------------------------------------
  
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

    InitInstance: function(InstanceName) {
        this.m_InstanceName = InstanceName;
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
        bt.body = this.m_InstanceName + "." + FuncName + "();";
        bt.send();
    }
} // prototype
