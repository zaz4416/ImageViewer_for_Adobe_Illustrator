
// Ver.1.0 : 2025/12/27

// https://ai-scripting.docsforadobe.dev/jsobjref/Document.html
// http://www.openspc2.org/reibun/Illustrator/ref/index.html
// http://www.openspc2.org/book/IllustratorCS/
// https://qiita.com/comsk/items/06391cbf2eb25da46771
// https://bankuru01.com/color-with-illustrators-script/ // 色

// https://qiita.com/mori_goq/items/3d219dbe9d6740a77d97
// https://haraguai-is-bad.hatenablog.com/entry/2019/06/07/062902
// https://www.m2design.co.jp/m2lab/2017/12/13/ktips-05-script/
// https://sttk3.com/blog/tips/illustrator/select-faster-by-script.html
// https://sttk3.com/blog/tips/illustrator/crop-stroke.html // Illustratorの線をクローズパスで切り抜きたい！]
// https://2-hats.hateblo.jp/entry/2014/09/11/035246
// https://sttk3.com/blog/tips/illustrator/add-apperance-via-script.html
// https://qiita.com/onebitious/items/589b50f34a5828617140

// https://qiita.com/esflat/items/4acd3a60e48f44b44a37  // オブジェクトの種別や構造を取得する
// https://qiita.com/comsk/items/e033fbb0d0c1579fd6f9 // 【Illustrator】メニューコマンド以外のコマンドをjsで実行できる用にアクションに登録
// https://qiita.com/comsk/items/06391cbf2eb25da46771 .【Illustrator】メニューコマンドリスト
// http://data.openspc2.org/reibun/Illustrator/ref/index.html // Illustrator JavaScript Reference イラストレーター JavaScript リファレンス
// https://bankuru01.com/text-with-illustrators-text-with-illustrators/ // illustratorのスクリプト機能で［テキスト］を操るサンプルコード
// https://zenn.dev/penguin4731/articles/6f3289d9ad3b8d // Adobe Illustratorのスクリプトを作る方法( ダイアログ関連 )
// https://judicious-night-bca.notion.site/app-selectTool-3ed867bcb69340ad9e1308c41f298ff3 // ツールを切り替えるメソッドです。Illustrator 2020(v24)から追加されました。
// https://sttk3.com/blog/tips/illustrator/scripting-reference.html .// いろいろ書いてある
// https://www.ddc.co.jp/dtp/archives/20160222/150530.html// バージョン情報
// https://note.com/yucco72/n/nab4f2fcc9117 // 【Illustrator JavaScript】ExtendScriptで直線を描いてガイド化する
// http://www.openspc2.org/book/IllustratorCC2015/ // ダイアログ関連
// https://www.samuraiz.co.jp/adobeproduct/jrun/docs/jrun31j/html/Scripting_the_Visual_Tools_Object_Model/vtom7.htm //ActiveDocument オブジェクト
// https://haraguai-is-bad.hatenablog.com/entry/2019/06/07/062902 //コモノExtendScript100本ノック
// https://2-hats.hateblo.jp/entry/2014/09/11/035246
// https://2-hats.hateblo.jp/entry/2015/05/10/070408 //大ログ表示と、その処理
// https://dtpscriptin.com/statictext/    // 【ExtendScript】GUI : statictext（固定テキスト）
// https://qiita.com/tetsuoh/items/dcdf75b87613bc85e8ab //
// https://zenn.dev/asataka/scraps/45457c744309d7 //Adobe ExtendScriptをgitで管理したい


// ExtendScriptとは
// ExtendScriptとは、adobeの作ったECMA Script(ES3)準拠の独自言語。
// adobe製品で使用できるスクリプト言語になります。



// 定数定義
cCompoundPathItem = "CompoundPathItem"
cKindOfPathItem   = "PathItem";
cKindOfGroupItem  = "GroupItem";
cColorOfCMYKColor = "CMYKColor";
cColorOfGrayColor = "GrayColor";
cColorOfSpotColor = "SpotColor";
cKindOfLayer      = "Layer";


function GrouoUpColor(name)
{
 	var thePathObj = app.activeDocument.selection;	// 選択中のオブジェクトを取得
    
 	if ( ! KindOfItem( thePathObj, cKindOfGroupItem) )
    {
    	app.executeMenuCommand( "sendToFront" );	// 選択されているオブジェクトがグループではない場合に、重ね順>最前面へ
    }

    var NewGp = AddGroup( name );					// グループ追加
    MoveToGroup( NewGp );							// 追加したグループ内に、オブジェクトを移動させる
    
    return NewGp;
}


// アイテムの種類を判定する
function KindOfItem(thePathObj, ConstItem)
{
 	if ( thePathObj.toString().indexOf(ConstItem) == -1 )
    {
        return false;
    }
  
    return true;
}


/// グループ追加
 function AddGroup(Name)
{
    var ActiveLayer = activeDocument.activeLayer; 
	var thePathObj = app.activeDocument.selection;			// 選択中のオブジェクトを取得
    var Gp = ActiveLayer.groupItems.add();			// グループを追加
	Gp.name = Name;											// グループ名を決定
    Gp.move(thePathObj[0],ElementPlacement.PLACEBEFORE);	// 追加したグループを選択位置に移動させる

	return Gp;
}


// グループ内に、ドキュメントと同じ四角を挿入
function AddSameSizeRectangle(Gp)
{
 	var myDoc = app.activeDocument;											//ドキュメント
 	var rect = Gp.pathItems.rectangle(0, 0, myDoc.width, myDoc.height);		// 縦横のサイズをドキュメントと同じサイズに設定
	rect.move(Gp,ElementPlacement.PLACEATEND);								// 作成した四角を移動
 	rect.position = [0, 0];													// 座標の設定
	rect.stroked = false;													// 枠線の有無

	// RGB色の生成
	var RGBcolor = new RGBColor();
	RGBcolor.red   = 255;
	RGBcolor.green = 255;
	RGBcolor.blue  = 255;

	//CMYKカラーを生成する
	var CMYKcolor = new CMYKColor();
	//各色に0〜100の数値を入力
	CMYKcolor.cyan    = 0;
	CMYKcolor.magenta = 0;
	CMYKcolor.yellow  = 0;
	CMYKcolor.black   = 0;
	
	rect.fillColor = CMYKcolor;												// 塗りつぶしの色の設定
}


// グループ内に、オブジェクトを移動させる
 function MoveToGroup(Gp)
{
	// 選択されているオブジェクトを得る
	var ITEM = app.activeDocument.selection;
	var ITEMSArray = [];

	if( ITEM.constructor.name !== 'Array' )
	{
		// 配列ごとPUSH
		ITEMSArray.push(ITEM);
	}
	else
	{
		// そのままPUSH
		ITEMSArray = ITEM;
	}

	//Gp.selected = true;

	// moveパラメータ(移動先)
	// ElementPlacement.INSIDE	      指定したオブジェクトの内側
	// ElementPlacement.PLACEBEFORE       指定したオブジェクトの前
	// ElementPlacement.PLACEATBEGINNING  指定したオブジェクトの先頭
	// ElementPlacement.PLACEAFTER        指定したオブジェクトの後
	// ElementPlacement.PLACEATEND        指定したオブジェクトの末尾

    var Count = ITEMSArray.length;
	// 選択オブジェクトをグループ化
	for(i=Count-1; i>=0; i--)
	{
		// ITEMSArrayに入っているオブジェクトをGpに移動させる
		ITEMSArray[i].move(Gp,ElementPlacement.PLACEATEND);
	}
}


// オブジェクトを移動させる
 function MoveItem(SrcItem, Gp)
{ 
    var leng = SrcItem.length;
    
	// 選択オブジェクトをグループ化
	for(i=leng-1; i>=0; i--)
	{    
        	// moveパラメータ(移動先)
            // ElementPlacement.INSIDE	      指定したオブジェクトの内側
            // ElementPlacement.PLACEBEFORE       指定したオブジェクトの前
            // ElementPlacement.PLACEATBEGINNING  指定したオブジェクトの先頭
            // ElementPlacement.PLACEAFTER        指定したオブジェクトの後
            // ElementPlacement.PLACEATEND        指定したオブジェクトの末尾
		// Iに入っているオブジェクトをGpに移動させる
         if ( SrcItem[i].selected )
         {
            SrcItem[i].move(Gp,ElementPlacement.PLACEATEND);
        }
	}
}


// グループ内に、オブジェクトを移動させる
 function MoveToGroupInside(Obj, Gp)
{
	// 選択されているオブジェクトを得る
	var ITEM = Obj;
	var ITEMSArray = [];

	if( ITEM.constructor.name !== 'Array' )
	{
		// 配列ごとPUSH
		ITEMSArray.push(ITEM);
	}
	else
	{
		// そのままPUSH
		ITEMSArray = ITEM;
	}

	//Gp.selected = true;

	// moveパラメータ(移動先)
	// ElementPlacement.INSIDE	      指定したオブジェクトの内側
	// ElementPlacement.PLACEBEFORE       指定したオブジェクトの前
	// ElementPlacement.PLACEATBEGINNING  指定したオブジェクトの先頭
	// ElementPlacement.PLACEAFTER        指定したオブジェクトの後
	// ElementPlacement.PLACEATEND        指定したオブジェクトの末尾

    var Count = ITEMSArray.length;
	// 選択オブジェクトをグループ化
	for(i=Count-1; i>=0; i--)
	{
		// ITEMSArrayに入っているオブジェクトをGpに移動させる
		ITEMSArray[i].move(Gp,ElementPlacement.INSIDE);
	}
}


/**
  * スクリプト実行元アプリケーションのバージョンを取得して数値の配列にする。16.0.4の場合[16, 0, 4]
  * @return {Array of numbers}
*/
/*
  // fxgの読み込みとアクションの即時生成が必要なため，Illustrator CS6のみで処理可能
  if(appVersion()[0] != 16) {
    var msg = {en : 'This script requires Illustrator CS6.', ja : 'このスクリプトは Illustrator CS6 のみに対応しています。'} ;
    alert(msg) ;
    return ;
  }
*/
function appVersion() {
  var tmp = app.version.toString().split('.') ;
  var res = [] ;
  for(var i = 0, len = tmp.length ; i < len ; i++) {
    res.push(Number(tmp[i])) ;
  }
  return res ;
}

//グループ解除
function removeGroup(GP){
	if(GP.constructor.name !== 'GroupItem')return false;
	var gpItems = GP.pageItems;
	var moveItems =[];
	for(i=0;i<gpItems.length;i++){
				moveItems.push(gpItems[i]);
	}
	while(moveX = moveItems.shift()){
				moveX.move(GP,ElementPlacement.PLACEBEFORE);		
	}
	GP.remove();
	return true
}


//グループ化
function makeGroup(ITEM){
	var ITEMSArray= [];	
	ITEM.constructor.name !== 'Array' ? ITEMSArray.push(ITEM) : ITEMSArray = ITEM;
	var NEWGP = app.activeDocument.groupItems.add();
	NEWGP.move(ITEMSArray[0],ElementPlacement.PLACEBEFORE);
	for(i=0;i<ITEMSArray.length;i++){
		ITEMSArray[i].move(NEWGP,ElementPlacement.PLACEATEND);
	}
	return true;
}
//makeGroup(app.activeDocument.selection);


// 選択されているアイテムから、グループを選択する
function SetGroupBySelectionItem()
{
     var SrcGr = app.activeDocument.selection[0];

    // 親がレイヤーでない場合に
    if( (SrcGr.parent.toString().indexOf(cKindOfLayer)) == -1 )
    {
        // ダイレクト選択にて、パスを選択した場合、そのパスが所属しているグループを選択する
        if ( SrcGr.toString().indexOf(cKindOfGroupItem)  == -1 )
        { 
            var xPointedGr = SrcGr.parent;
            
            app.activeDocument.selection = xPointedGr; // ここで再選択
            //app.redraw();                                  // 再描画禁止 (再描画すると、選択先を参照できなくundefiedになってしまう）
     
            if ( app.activeDocument.selection.length == 0 ) throw new Error("グループができません。");
     
            SrcGr = xPointedGr;
        }
    }

    // ダイレクト選択されたものが、グループでない場合は、undefineとする
    if ( SrcGr.toString().indexOf(cKindOfGroupItem)  == -1 )
    { 
        SrcGr = undefined;
    }
     
     return SrcGr;
}
