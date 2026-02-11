
// Ver.1.0 : 2026/02/10

$.localize = true;  // OSの言語に合わせてローカライズする


// --- グローバル関数 -----------------------------------------------------------------

// --- 辞書から自動翻訳処理 (en以外が未定義の場合、enを引用する) ---
function GetWordsFromDictionary(obj) {
    var result = {}; // 1. 戻り値用の新しいオブジェクトを作成
    
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === "object" && obj[key] !== null) {
                // 2. まず環境言語でlocalizeを試みる
                var translated = localize(obj[key]);
                
                // 3. 結果が空などの場合は en を強制引用し、新しいオブジェクトに格納
                result[key] = translated || obj[key].en || "";
            } else {
                // オブジェクトでない（既に文字列などの）場合もそのままコピー
                result[key] = obj[key];
            }
        }
    }
    return result; // 4. 翻訳済みの新しいオブジェクトを返す
}

// ---------------------------------------------------------------------------------
