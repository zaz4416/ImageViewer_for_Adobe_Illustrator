
// Ver.1.0 : 2026/03/01


//-----------------------------------
// クラス CControlIndex
//-----------------------------------

// 1. コンストラクタ定義
function CControlIndex(storageKey, Max) {
    var self = this;
    self.MAX_INSTANCES = Max;
    self.indexKey = "idx_"   + storageKey;

    // $.global[self.indexKey] が未定義の時にだけ、初期化
    if ( $.global[self.indexKey] === undefined ) {
        self.Init();
    }
}

// 初期化
CControlIndex.prototype.Init = function() {
    var self = this;
    $.global[self.indexKey] = [];
    for ( var lp=self.MAX_INSTANCES-1; lp>=0; lp-- ) {
        $.global[self.indexKey].push(lp);
    }
}

// インデックスを得る
CControlIndex.prototype.GetIndex = function( Max ) {
    var self = this;
    var index = -1;

    // 配列が存在し、かつ中身がある間だけ実行
    if ( $.global[self.indexKey] !== undefined && $.global[self.indexKey].length > 0 ) {
        index = $.global[self.indexKey].pop();
    }

    return index;
}

// 登録可能か
CControlIndex.prototype.Is_it_possible_to_register = function() {
    var self = this;

    // 配列が存在し、かつ中身がある間だけ実行
    if ( $.global[self.indexKey] === undefined ) {
        return false;
    } else {
        if ( $.global[self.indexKey].length == 0 ) {
            return false;
        }
    }

    return true;
}

// インデックスが破棄された
CControlIndex.prototype.DeleteIndex = function( idx ) {
    var self = this;
    var pool = $.global[self.indexKey];
    
    // 二重登録防止チェック
    for (var i = 0; i < pool.length; i++) {
        if (pool[i] === idx) return; 
    }
    
    pool.push(idx);
}


//-----------------------------------
// クラス CGlobalArray
//-----------------------------------

// 1. コンストラクタ定義
function CGlobalArray(storageKey, maxCount) {
    var self = this;

    self.ArrayIndex = -1;
    self.MAX_INSTANCES = maxCount || 5;
    self.m_ControlIndex = new CControlIndex( storageKey, self.MAX_INSTANCES );

    // 1. グローバルに格納するためのユニークなキー名を作成
    self.storageKey = "store_" + storageKey;


    // 2. ブラケット記法 [] を使って、動的に $.global のプロパティにアクセス
    if (!($.global[self.storageKey] instanceof Array)) {
        $.writeln("$.global[self.storageKey] を新規に生成");
        self.m_ControlIndex.Init();
        $.global[self.storageKey] = [];
    } else {
        if ( $.global[self.storageKey].length > self.MAX_INSTANCES ) {
            // なんからの理由で、this.MAX_INSTANCES を超える登録があった場合は、強制的にメモリ解放させる
            $.writeln("$.global[self.storageKey] をすべて破棄して、新規に生成");
            self.CloseAllInstances();
            self.m_ControlIndex.Init();
            $.global[self.storageKey] = [];
        }
    }
}


CGlobalArray.prototype.Is_it_possible_to_register = function(obj) {
    var self = this;
    return self.m_ControlIndex.Is_it_possible_to_register();
}


/**
 * オブジェクトのプロトタイプを継承しつつ、プロパティをコピーする（ES3互換）
 * @param {Object} obj - コピー元のインスタンス
 * @returns {Object} - 新しく生成されたクローン
 */
CGlobalArray.prototype.cloneInstance = function(obj) {
    if (obj === null || typeof obj !== "object") return obj;

    var clone;
    // constructor が存在し、それが Object ではない場合（独自クラスの場合）
    if (obj.constructor && obj.constructor !== Object) {
        var F = function() {};
        F.prototype = obj.constructor.prototype;
        clone = new F();
        clone.constructor = obj.constructor; // constructorを復元
    } else {
        clone = {};
    }

    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            clone[key] = obj[key];
        }
    }
    return clone;
}


/**
 * $.global[self.storageKey] に、オブジェクトのクローンを登録する
 * @param {Object} newInst - 登録したいインスタンス（実体）
 * @returns {number} - 登録されたインデックス番号(0〜, 失敗時は -1）
 */
CGlobalArray.prototype.RegisterInstance = function(newInst) {
    var self = this;
 
    // 1. 管理プールから空いているインデックスを取得
    var idx = self.m_ControlIndex.GetIndex();

    // 空き番号がない場合は -1 が返る
    if ( idx != -1 ) {
        // --- 2. 上書き・再利用前の解放処理 ---
        // 同じスロットに古いデータが残っている場合の安全策
        if ($.global[self.storageKey] [idx]) {
            var oldInst = $.global[self.storageKey] [idx];
            
            // UI（ダイアログ）を閉じて破棄
            if (oldInst.m_Dialog) {
                try {
                    oldInst.m_Dialog.close();
                    oldInst.m_Dialog = null; 
                } catch(e) {
                    $.writeln("Previous dialog close failed: " + e);
                }
            }
            
            // オブジェクトの全プロパティを削除して参照を切る
            for (var prop in oldInst) {
                if (oldInst.hasOwnProperty(prop)) {
                    oldInst[prop] = null;
                }
            }
            $.global[self.storageKey] [idx] = null; // 明示的にnullを代入
        }

        // --- 3. メモリの強制回収 ---
        $.gc(); 

        // --- 4. インデックスの同期 ---
        // クローンを作成する前に、実体側の管理用インデックスを更新
        self.ArrayIndex = idx;
        newInst.m_ArrayOfObj.ArrayIndex = idx;

        // --- 5. クローンの作成と格納 ---
        // プロトタイプを継承した独立したコピーを作成
        var cloned = self.cloneInstance(newInst);
        
        // クローン側にも自身のインデックスを刻印（BridgeTalk等で利用するため）
        cloned.m_ArrayOfObj.ArrayIndex = idx;
        
        // グローバル配列の指定スロットに格納
        $.global[self.storageKey][idx] = cloned;

        $.writeln("オブジェクト登録完了。No: " + newInst.m_ArrayOfObj.ArrayIndex);
        return idx
    } else {
        alert("Undefine Dialog")
    }

    return -1;
}


/**
 * $.global[self.storageKey] への文字列を返します
 * @returns {文字列} - $.global[self.storageKey] への文字列
 */
CGlobalArray.prototype.GetGlobalClass = function() {
    var self = this;
    var name = "$.global['" + self.storageKey + "'][" + self.ArrayIndex + "]";
    return name;
}


/**
 * $.global[self.storageKey] へのオブジェクトを返します
 * @returns {オブジェクト} - $.global[self.storageKey] へのオブジェクト
 */
CGlobalArray.prototype.GetGlobalStorageKey = function() {
    var self = this;
    return $.global[self.storageKey];
}


/**
 * $.global[self.storageKey][elf.OsbjectNo] へのオブジェクトを返します
 * @returns {オブジェクト} - $.global[self.storageKey][elf.OsbjectNo] へのオブジェクト
 */
CGlobalArray.prototype.GetGlobalObject = function() {
    var self = this;
    return self.GetGlobalStorageKey()[self.ArrayIndex];
}


/**
 * 全てのインスタンスを一括で閉じるような操作も可能になります
 */
CGlobalArray.prototype.CloseAllInstances = function() {
    var self = this;

    if ( $.global[self.storageKey].length > 0 ) {
        var instances = $.global[self.storageKey] ;
        for (var i = 0; i < instances.length; i++) {
            if (instances[i].m_Dialog) {
                instances[i].m_Dialog.close();
            }
        }
        $.global[self.storageKey]  = []; // 配列をリセット
    }
}


/**
 * ArrayIndexが指している配列要素をメモリ解放し、インデックスをプールに戻す
 */
CGlobalArray.prototype.DeleteObject = function() {
    var self = this;
    var storage = self.GetGlobalStorageKey(); // $.global[self.storageKey]
    var idx = self.ArrayIndex;

    // 1. 指定されたインデックスにオブジェクトが存在するか確認
    if (storage && storage[idx]) {
        var oldInst = storage[idx];
                
        // 2. オブジェクト内の全プロパティを再帰的に削除して参照を切る
        for (var prop in oldInst) {
            if (oldInst.hasOwnProperty(prop)) {
                oldInst[prop] = null;
            }
        }
        
        // 3. 配列のスロットを空にする
        storage[idx] = null; 

        // 4. 管理プールに使用済みインデックスを返却する
        self.m_ControlIndex.DeleteIndex(idx);

        $.writeln("Index " + idx + " のインスタンスをメモリ解放し、プールに返却しました。");

        // 5. ArrayIndexを無効値リセット（誤操作防止）
        self.ArrayIndex = -1;

        // --- 6. 配列全体のクリーンアップ判定 ---
        // 配列のすべての要素が null になった場合は、配列そのものを $.global から削除する
        var length = storage.length;
        var allNullFlag = true;
        for (var lp = 0; lp < length; lp++) {
            if (storage[lp] !== null) {
                allNullFlag = false;
                break;
            }
        }

        if (allNullFlag) {
            // プロパティ名としての参照を完全に削除（単なる [] 代入より確実）
            delete $.global[self.storageKey];

            // インデックス管理側も初期状態（全空き状態）にリセット
            self.m_ControlIndex.Init();
            
            // ガベージコレクションを強制実行して物理メモリを解放
            $.gc();

            $.writeln("全インスタンスが解放されたため、$.global['" + self.storageKey + "'] をリセットしました。");
        }
    }
}
