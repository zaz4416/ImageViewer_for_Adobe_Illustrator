/*
<javascriptresource>
<name></name>
</javascriptresource>
*/


// Ver.1.0 : 2026/02/22



//-----------------------------------
// クラス CPopMenu
//-----------------------------------

// コンストラクタ

function CPopMenu( event ) {
    var self = this;

    self.m_Menu = new Window("palette", undefined, undefined, {borderless: true});
    self.m_Menu.orientation = "column";
    self.m_Menu.alignChildren = "fill";
    self.m_Menu.spacing = 0;
    self.m_Menu.margins = 2; // 境界線

    event.screenX, event.screenY 
    // 表示位置の決定（マウスのクリック位置を計算）
    // event から座標を取得し、スクリーン座標へ変換
    self.m_Menu.location = [event.screenX, event.screenY];

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
