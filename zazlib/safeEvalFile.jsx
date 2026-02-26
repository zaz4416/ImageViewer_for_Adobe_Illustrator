

// Ver.1.0 : 2026/02/26

if (typeof _LIBRARY_JSXINC_LOADED === "undefined") {
    var _LIBRARY_JSXINC_LOADED = true;

    function safeEvalFile(file) {
        // 1. 引数の File オブジェクトが有効かチェック
        if (!file || !(file instanceof File) || !file.exists) {
            return;
        }

        var path = file.absoluteURI;
        var alreadyIncluded = false;
        
        // 2. $.includedFiles が存在するかチェック
        // ExtendScript の実装によっては、ここで undefined エラーが出るのを防ぐ
        var includedList = $.includedFiles;

        if (includedList) {
            // 3. $.includedFiles は Array ではない場合があるため、
            // インデックス参照と length を慎重に扱う
            for (var i = 0; i < includedList.length; i++) {
                if (includedList[i] === path) {
                    alreadyIncluded = true;
                    break;
                }
            }
        }

        // 4. まだ読み込まれていない場合のみ実行
        if (!alreadyIncluded) {
            try {
                $.evalFile(file);
            } catch (e) {
                // 読み込みエラー時の処理
                alert("Error in safeEvalFile: " + e.message);
            }
        }
    }
}
