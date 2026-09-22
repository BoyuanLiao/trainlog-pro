(() => {
  'use strict';

  window.TrainLogLocales = window.TrainLogLocales || {};
  window.TrainLogLocales['ja-JP'] = Object.freeze({
    common:{save:'保存',cancel:'キャンセル',delete:'削除',close:'閉じる',back:'戻る',search:'検索',all:'すべて',more:'さらに表示',edit:'編集',done:'完了'},
    language:{label:'表示言語',zhTW:'繁體中文',enUS:'English',jaJP:'日本語',hint:'変更はすぐに反映されます。未翻訳の文字は一時的に繁体字中国語で表示されます。'},
    actions:{manualEntry:'手動入力'},
    nav:{home:'ホーム',training:'トレーニング',records:'記録',analysis:'分析',settings:'設定'},
    home:{weeklyMuscles:'今週の筋群目標',recentProgress:'最近の進捗',recentWorkouts:'最近のトレーニング'},
    records:{title:'トレーニング記録',month:'月',muscle:'筋群',prevMonth:'← 前月',thisMonth:'今月',nextMonth:'次月 →',trained:'トレーニングあり',untrained:'トレーニングなし',today:'今日',trash:'ゴミ箱',trashHint:'30日後に手動で削除できます'},
    analysis:{title:'分析',days7:'7日',days30:'30日',days90:'90日',all:'すべて',tabs:{overview:'概要',muscle:'筋群・動作',exercise:'種目の進捗',load:'負荷・習慣'}},
    settings:{title:'設定',tutorial:'使い方'},
    training:{start:'トレーニング開始'}
  });
})();