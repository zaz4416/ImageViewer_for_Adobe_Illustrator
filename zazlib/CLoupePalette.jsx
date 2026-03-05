/*
<javascriptresource>
<name></name>
</javascriptresource>
*/


// Ver.1.0 : 2026/03/05


var _LoupeZoom = 3; // 拡大鏡（ルーペ）の拡大率


// --- グローバル関数 -----------------------------------------------------------------

// ---------------------------------------------------------------------------------


/**
 * 拡大鏡（ルーペ）専用の浮動パレットクラス
 */
function CLoupePalette() {
    var self = this;

    self.zoom = _LoupeZoom; // 拡大率
    self.m_Win = new Window("palette", "拡大鏡 [x" + self.zoom + "]", undefined, {
        borderless: false,
        closeButton: false // ★ここに追加（×ボタンを非表示にする）
    });
    self.m_Win.margins = 5;
    
    // 200px四方の拡大表示領域
    self.m_View = self.m_Win.add("customview", [0, 0, 200, 200]);
    
    self.targetImg = null; // 表示対象のScriptUIImage
    self.centerX = 0;      // 元画像上の中心Xピクセル
    self.centerY = 0;      // 元画像上の中心Yピクセル
    
    // 描画ロジック
    self.m_View.onDraw = function() {

        var ViewSelf = this;

        var ViewWidth  = self.m_View.size.width;
        var ViewHeight = self.m_View.size.height;

        //if (!self.targetImg) return;
        var g = ViewSelf.graphics;

        // 背景を白で塗りつぶす処理
        var whiteBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1.0, 1.0, 1.0, 1.0]); // [R, G, B, A]
        g.rectPath(0, 0, ViewWidth, ViewHeight);
        g.fillPath(whiteBrush);

        // 拡大鏡のサイズに対して、元画像の何ピクセル分を切り出すか
        var UIScale = self.m_UIScale;
        var sampleSizeX = ViewWidth  / self.zoom ;
        var sampleSizeY = ViewHeight / self.zoom ;
        var srcX = self.centerX - (sampleSizeX / 2);
        var srcY = self.centerY - (sampleSizeY / 2);
        g.drawImage(self.targetImg, -srcX*self.zoom, -srcY*self.zoom, self.targetImg_W*self.zoom, self.targetImg_H*self.zoom );

        var blackPen = g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1); 
        var myFont = ScriptUI.newFont("Arial", "BOLD", 20);
        //g.drawString(self.targetImg_W + "," + self.targetImg_H, blackPen, 10, 5, myFont); 
        //g.drawString("Mouse:"+self.centerX +","+self.centerY, blackPen, 10, 25, myFont); 

        var CeX = ViewWidth  / 2;
        var CeY = ViewHeight / 2;
        var Lie = 15;

        // 1. 下地の黒い太線 (幅5px)
        var pBlack = g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0, 1], 5);
        g.moveTo(CeX-Lie, CeY); g.lineTo(CeX+Lie, CeY);
        g.moveTo(CeX, CeY-Lie); g.lineTo(CeX, CeY+Lie);
        g.strokePath(pBlack); // ★ここで黒い線が描画される

        // 2. 重ねる赤い細線 (幅2px)
        var pRed = g.newPen(g.PenType.SOLID_COLOR, [1, 0, 0, 1], 2);
        g.moveTo(CeX-Lie, CeY); g.lineTo(CeX+Lie, CeY);
        g.moveTo(CeX, CeY-Lie); g.lineTo(CeX, CeY+Lie);
        g.strokePath(pRed); // ★ここで赤い線が描画される
    };
}


// 座標を更新して再描画させる
CLoupePalette.prototype.update = function(img, img_W, img_H, scale, x, y) {
    this.targetImg = img;
    this.centerX = x;
    this.centerY = y;
    this.targetImg_W = img_W;
    this.targetImg_H = img_H;
    this.m_UIScale = scale;
    this.m_View.notify("onDraw");
};

// 拡大鏡の座標を設定する
CLoupePalette.prototype.Locate = function(loc_x, loc_Y) {
    var self               = this;
    self.m_Win.location.x = loc_x;
    self.m_Win.location.y = loc_Y;
};

// 拡大鏡の座標を取得する
CLoupePalette.prototype.GetLocation = function() {
    var self = this;
    return {
        x: self.m_Win.location.x ,
        y: self.m_Win.location.y
    };
};

CLoupePalette.prototype.show = function() { this.m_Win.show(); };
CLoupePalette.prototype.hide = function() { this.m_Win.hide(); };
CLoupePalette.prototype.close = function() { this.m_Win.close(); };
CLoupePalette.prototype.IsOpne = function() { return this.m_Win.visible; };
