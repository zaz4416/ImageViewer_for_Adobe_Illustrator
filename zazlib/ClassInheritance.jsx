
// Ver.1.0 : 2026/02/12-A12
//_/_/_/_/_/_/_/_/_/_/_/_/
// クラス継承するためのコード
//_/_/_/_/_/_/_/_/_/_/_/_/

// --- グローバル関数 -----------------------------------------------------------------

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

// ---------------------------------------------------------------------------------
