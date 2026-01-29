
/*
Code for Import https://scriptui.joonas.me — (Triple click to select): 
{"activeId":1,"items":{"item-0":{"id":0,"type":"Dialog","parentId":false,"style":{"enabled":true,"varName":"Dgl","windowType":"Dialog","creationProps":{"su1PanelCoordinates":false,"maximizeButton":false,"minimizeButton":false,"independent":false,"closeButton":true,"borderless":false,"resizeable":false},"text":"Jpegビューア","preferredSize":[0,0],"margins":16,"orientation":"column","spacing":10,"alignChildren":["center","top"]}},"item-1":{"id":1,"type":"Panel","parentId":0,"style":{"enabled":true,"varName":"m_PanelView","creationProps":{"borderStyle":"etched","su1PanelCoordinates":false},"text":"画像","preferredSize":[0,0],"margins":10,"orientation":"column","spacing":10,"alignChildren":["left","top"],"alignment":null}},"item-2":{"id":2,"type":"Button","parentId":0,"style":{"enabled":true,"varName":"m_close","text":"閉じる","justify":"center","preferredSize":[0,0],"alignment":null,"helpTip":null}}},"order":[0,1,2],"settings":{"importJSON":true,"indentSize":false,"cepExport":false,"includeCSSJS":true,"showDialog":false,"functionWrapper":false,"afterEffectsDockable":false,"itemReferenceList":"None"}}
*/ 

// DGL
// ===
var Dgl = new Window("dialog"); 
    Dgl.text = "Jpegビューア"; 
    Dgl.orientation = "column"; 
    Dgl.alignChildren = ["center","top"]; 
    Dgl.spacing = 10; 
    Dgl.margins = 16; 

// M_PANELVIEW
// ===========
var m_PanelView = Dgl.add("panel", undefined, undefined, {name: "m_PanelView"}); 
    m_PanelView.text = "画像"; 
    m_PanelView.orientation = "column"; 
    m_PanelView.alignChildren = ["left","top"]; 
    m_PanelView.spacing = 10; 
    m_PanelView.margins = 10; 

var m_close = Dgl.add("button", undefined, undefined, {name: "m_close"}); 
    m_close.text = "閉じる"; 

