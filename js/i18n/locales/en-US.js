(() => {
  'use strict';

  window.TrainLogLocales = window.TrainLogLocales || {};
  window.TrainLogLocales['en-US'] = Object.freeze({
    common:{save:'Save',cancel:'Cancel',delete:'Delete',close:'Close',back:'Back',search:'Search',all:'All',more:'Show more',edit:'Edit',done:'Done'},
    language:{label:'Interface language',zhTW:'Traditional Chinese',enUS:'English',jaJP:'Japanese',hint:'Changes apply immediately. Text not translated yet will temporarily fall back to Traditional Chinese.'},
    actions:{manualEntry:'Manual entry'},
    nav:{home:'Home',training:'Training',records:'Records',analysis:'Analysis',settings:'Settings'},
    home:{weeklyMuscles:'Weekly muscle targets',recentProgress:'Recent progress',recentWorkouts:'Recent workouts'},
    records:{title:'Training records',month:'Month',muscle:'Muscle group',prevMonth:'← Previous',thisMonth:'This month',nextMonth:'Next →',trained:'Trained',untrained:'No training',today:'Today',trash:'Trash',trashHint:'Can be cleared manually after 30 days'},
    analysis:{title:'Analysis',days7:'7 days',days30:'30 days',days90:'90 days',all:'All',tabs:{overview:'Overview',muscle:'Muscles & patterns',exercise:'Exercise progress',load:'Load & habits'}},
    settings:{title:'Settings',tutorial:'Tutorial'},
    training:{start:'Start workout'}
  });
})();