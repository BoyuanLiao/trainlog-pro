(() => {
  'use strict';

  window.TrainLogLocales = window.TrainLogLocales || {};
  window.TrainLogLocales['zh-TW'] = Object.freeze({
    common:{save:'儲存',cancel:'取消',delete:'刪除',close:'關閉',back:'返回',search:'搜尋',all:'全部',more:'顯示更多',edit:'編輯',done:'完成'},
    actions:{manualEntry:'手動補登'},
    nav:{home:'首頁',training:'訓練',records:'紀錄',analysis:'分析',settings:'設定'},
    home:{weeklyMuscles:'本週肌群目標',recentProgress:'最近進步',recentWorkouts:'最近訓練'},
    records:{title:'訓練紀錄',month:'月份',muscle:'肌群',prevMonth:'← 上月',thisMonth:'本月',nextMonth:'下月 →',trained:'有訓練',untrained:'無訓練',today:'今天',trash:'回收筒',trashHint:'30 天後可手動清除'},
    analysis:{
      title:'分析',days7:'7 天',days30:'30 天',days90:'90 天',all:'全部',
      tabs:{overview:'總覽',muscle:'肌群與模式',exercise:'動作進步',load:'負荷與習慣'},
      highlights:'本期重點',summary:'訓練摘要',next:'下一步建議',prTimeline:'PR 與里程碑',
      muscleTarget:'肌群目標 vs 實際',muscleStimulus:'肌群刺激',movement:'動作模式',movementGap:'動作模式缺口',
      exerciseProgress:'動作進步與個人最佳（PR）',exerciseSearchLabel:'搜尋做過的動作',
      exerciseSearchPlaceholder:'搜尋動作、器械或肌群...',recentExercises:'最近做過',quickSwitch:'快速切換',
      byMuscle:'依肌群',filterAll:'篩選全部動作',attention:'值得關注',attentionHint:'依進步建議排序',
      allPerformed:'全部做過的動作',exerciseDetail:'動作詳細分析',loadTrend:'訓練負荷趨勢',
      effort:'訓練強度分布',consistency:'訓練一致性'
    },
    settings:{title:'設定',tutorial:'使用教學'},
    training:{start:'開始訓練',finish:'完成本次訓練',addExercise:'加入動作'},
    timer:{title:'組間休息',defaultLabel:'準備下一組',minus:'−10 秒',plus:'＋10 秒',skip:'跳過'},
    firstSetup:{kicker:'第一次使用設定',title:'先設定你的訓練偏好與目標',save:'完成設定並開始使用'},
    messages:{setupRequired:'請先完成所有必填項目',recordsEmpty:'這個月份沒有符合條件的紀錄。',insufficient:'資料不足'}
  });
})();
