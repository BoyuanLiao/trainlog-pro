'use strict';

const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {launchBrowser,sleep}=require('./cdp-client');

const BASE_URL=process.env.TRAINLOG_E2E_URL||'http://127.0.0.1:4173/';
const APP_KEY='trainlogProData';
const downloadDir=fs.mkdtempSync(path.join(os.tmpdir(),'trainlog-downloads-'));
let browser=null;

function timerSeconds(text){
  const m=String(text||'').trim().match(/(\d+):(\d+)/);
  return m?Number(m[1])*60+Number(m[2]):-1;
}

(async()=>{
  const b=browser=await launchBrowser({url:BASE_URL,downloadDir});
  const storage=()=>b.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(APP_KEY)})||'null')`);

  async function clearAndReload(){
    await b.evaluate('localStorage.clear()');
    await b.reload();
  }

  async function finishOnboarding({verifyValidation=false}={}){
    await b.waitFor("document.querySelector('#coachOverlay')?.classList.contains('show')",{timeout:5000,label:'initial tutorial'});
    await b.click('#coachSkip');
    await b.waitFor("document.querySelector('#firstSetupWrap')?.classList.contains('show')",{label:'first setup'});
    if(verifyValidation){
      await b.click('#firstSetupSave');
      await b.waitFor("document.querySelector('#toast')?.classList.contains('show')",{label:'setup validation toast'});
    }
    await b.setValue('#firstTrainingGoal','general');
    await b.setValue('#firstWeeklySessions','3');
    await b.setValue('#firstSessionMinutes','60');
    await b.setValue('#firstExperience','beginner');
    await b.setValue('#firstEquipmentPreference','machine');
    await b.click('[data-first-muscle="胸"]');
    await b.click('[data-first-muscle="背"]');
    await b.click('#firstSetupSave');
    await b.waitFor(`(()=>{const d=JSON.parse(localStorage.getItem('${APP_KEY}')||'null');return d?.settings?.preferencesSetupCompleted===true})()`,{label:'setup persistence'});
    await b.evaluate(`(()=>{const d=JSON.parse(localStorage.getItem('${APP_KEY}'));d.settings.pageTutorials={home:true,trainLanding:true,workout:true,records:true,analysis:true,settings:true};d.settings.workoutTutorialCompleted=true;localStorage.setItem('${APP_KEY}',JSON.stringify(d));location.reload()})()`);
    await b.waitFor("document.readyState==='complete'&&!!document.querySelector('#todayText')?.textContent.trim()",{timeout:12000,label:'onboarding reload'});
  }

  // 1) First-run tutorial, required fields and settings persistence.
  await clearAndReload();
  await finishOnboarding({verifyValidation:true});
  let data=await storage();
  assert.strictEqual(data.settings.weeklySessions,3);
  assert.deepStrictEqual(data.settings.priorityMuscles,['胸','背']);

  await b.click('[data-testid="nav-settings"]');
  await b.click('[data-settings-view="training"]');
  await b.setValue('#setUnit','lb');
  await b.setValue('#setRest','150');
  await b.setValue('#setWeeklySessions','4');
  await b.evaluate("document.querySelector('#setTrainingIntervalTimer').checked=false");
  await b.click('#saveSettings');
  data=await storage();
  assert.strictEqual(data.settings.unit,'lb');
  assert.strictEqual(data.settings.defaultRest,150);
  assert.strictEqual(data.settings.weeklySessions,4);
  assert.strictEqual(data.settings.trainingIntervalTimer,false);
  await b.reload();
  await b.click('[data-testid="nav-settings"]');
  await b.click('[data-settings-view="training"]');
  assert.strictEqual(await b.evaluate("document.querySelector('#setUnit').value"),'lb');
  assert.strictEqual(await b.evaluate("document.querySelector('#setRest').value"),'150');
  console.log('E2E 1/4 onboarding + settings persistence passed');

  // 2) Real workout -> records -> analysis -> edit/delete/restore.
  await clearAndReload();
  await finishOnboarding();
  await b.click('#quickStart');
  await b.click('#startBlank');
  await b.waitFor("!!document.querySelector('#smSave')",{label:'session meta'});
  await b.setValue('#smName','E2E Workout');
  await b.setValue('#smDuration','45');
  await b.setValue('#smGymName','E2E Gym');
  await b.click('#smSave');

  await b.click('#sessionAddEx');
  await b.setValue('#pickSearch','腿推','input');
  await b.waitFor(`!!document.querySelector('[data-pick="ex_legpress"]')`,{label:'leg press picker result'});
  await b.click('[data-pick="ex_legpress"]');
  await b.waitFor(`document.querySelectorAll('#sessionExercises [data-set="weight"]').length>=3`,{label:'leg press sets'});
  for(let i=0;i<3;i++){
    await b.setValue(`[data-set="weight"][data-e="0"][data-s="${i}"]`,'100');
    await b.setValue(`[data-set="reps"][data-e="0"][data-s="${i}"]`,'10');
    await b.click(`[data-complete="0,${i}"]`);
  }
  await b.click('#finishWorkout');
  await b.waitFor("!!document.querySelector('#doneClose')",{label:'workout complete modal'});
  await b.click('#doneClose');

  data=await storage();
  assert.strictEqual(data.workouts.length,1);
  assert.strictEqual(data.workouts[0].name,'E2E Workout');
  assert.strictEqual(data.workouts[0].duration,45);
  assert.strictEqual(data.workouts[0].gymNameSnapshot,'E2E Gym');
  assert.strictEqual(data.workouts[0].exercises[0].sets.filter(x=>x.completed).length,3);

  await b.click('[data-testid="nav-analysis"]');
  await b.click('[data-analysis-tab="muscle"]');
  await b.waitFor("document.querySelector('#muscleAnalysis')?.textContent.includes('腿')",{label:'muscle analysis'});
  const muscleText=await b.text('#muscleAnalysis');
  assert(muscleText.includes('3'),'leg stimulus should include three completed sets');
  await b.click('[data-analysis-tab="exercise"]');
  await b.waitFor("document.querySelector('#analysisExerciseRecent')?.textContent.includes('腿推')",{label:'exercise progress browser'});

  await b.click('[data-testid="nav-records"]');
  await b.waitFor("!!document.querySelector('#recordList [data-open]')",{label:'record entry'});
  await b.click('#recordList [data-open]');
  await b.setValue('#ewName','E2E Workout Edited');
  await b.click('#ewSave');
  data=await storage();
  assert.strictEqual(data.workouts[0].name,'E2E Workout Edited');
  await b.click('#recordList [data-open]');
  await b.click('#ewDelete');
  data=await storage();
  assert.strictEqual(data.workouts.length,0);
  assert.strictEqual(data.trash.length,1);
  await b.waitFor("!!document.querySelector('[data-restore]')",{label:'trash restore'});
  await b.click('[data-restore]');
  data=await storage();
  assert.strictEqual(data.workouts.length,1);
  assert.strictEqual(data.trash.length,0);
  console.log('E2E 2/4 workout + records + analysis + trash restore passed');

  // 3) Backup export -> change settings -> full restore import.
  await b.click('[data-testid="nav-settings"]');
  await b.click('[data-settings-view="data"]');
  await b.click('#exportJson');
  let backupFile='';
  for(let i=0;i<80;i++){
    const found=fs.readdirSync(downloadDir).find(x=>x.endsWith('.json')&&!x.endsWith('.crdownload'));
    if(found){backupFile=path.join(downloadDir,found);break}
    await sleep(100);
  }
  assert(backupFile&&fs.statSync(backupFile).size>100,'JSON backup should download');
  const backup=JSON.parse(fs.readFileSync(backupFile,'utf8'));
  assert.strictEqual(backup.backupMeta.format,'trainlog-pro-full-backup');
  assert.strictEqual(backup.workouts.length,1);

  await b.click('.settings-back');
  await b.click('[data-settings-view="training"]');
  await b.setValue('#setUnit','lb');
  await b.click('#saveSettings');
  assert.strictEqual((await storage()).settings.unit,'lb');

  await b.click('[data-testid="nav-settings"]');
  await b.click('[data-settings-view="data"]');
  await b.setFile('#importJson',backupFile);
  await b.waitFor("!!document.querySelector('#impConfirm')",{label:'import preview'});
  await b.setValue('#impMode','restore');
  await b.click('#impConfirm');
  data=await storage();
  assert.strictEqual(data.settings.unit,backup.settings.unit);
  assert.strictEqual(data.workouts.length,1);
  assert.strictEqual(data.workouts[0].name,'E2E Workout Edited');
  assert(data.snapshots.length>=1,'restore should retain a pre-import snapshot');
  console.log('E2E 3/4 JSON backup export + restore passed');

  // 4) Timer, system program, gym and owned equipment.
  await clearAndReload();
  await finishOnboarding();
  await b.click('#quickStart');
  await b.click('#startBlank');
  await b.click('#smSave');
  await b.click('[data-timer="60"]');
  await b.waitFor("!document.querySelector('#restOverlay').classList.contains('rest-hidden')",{label:'rest timer visible'});
  const before=timerSeconds(await b.text('#restOverlayTime'));
  await b.click('#restPlusBtn');
  const afterPlus=timerSeconds(await b.text('#restOverlayTime'));
  assert(afterPlus>=before+8,'+10 seconds should increase the timer');
  await b.click('#restHideBtn');
  assert.strictEqual(await b.evaluate("document.querySelector('#restOverlay').classList.contains('rest-hidden')"),true);
  assert.strictEqual(await b.evaluate("document.querySelector('#restFab').classList.contains('show')"),true);
  await b.click('#restFab');
  await b.click('#restSkipBtn');
  await b.waitFor("document.querySelector('#restOverlay').classList.contains('rest-hidden')&&!document.querySelector('#restFab').classList.contains('show')",{label:'timer stopped'});
  await b.click('#cancelWorkout');
  await b.waitFor("!JSON.parse(localStorage.getItem('trainlogProData')).activeWorkout",{label:'workout cancelled'});

  await b.click('[data-testid="nav-settings"]');
  await b.click('[data-settings-view="programs"]');
  await b.waitFor("!!document.querySelector('[data-program-import]')",{label:'system programs'});
  await b.click('[data-program-import]');
  data=await storage();
  assert(data.templates.length>0,'system program import should create templates');

  await b.click('[data-program-detail]');
  await b.waitFor("!!document.querySelector('[data-start-program-day]')",{label:'program detail'});
  await b.click('[data-start-program-day]');
  data=await storage();
  assert(data.activeWorkout&&data.activeWorkout.exercises.length>0,'system program day should start a populated workout');
  assert(data.activeWorkout.programDayMeta,'system program workout should preserve day metadata');
  await b.click('#cancelWorkout');
  await b.waitFor("!JSON.parse(localStorage.getItem('trainlogProData')).activeWorkout",{label:'program workout cancelled'});

  await b.click('[data-testid="nav-settings"]');
  await b.click('[data-settings-view="gym"]');
  b.cdp.setPromptText('E2E Gym 2');
  await b.click('#addGym');
  await b.waitFor("JSON.parse(localStorage.getItem('trainlogProData')).gyms.some(g=>g.name==='E2E Gym 2')",{label:'gym persisted'});
  await b.click('#addEquipment');
  await b.setValue('#manualEqName','E2E Cable');
  await b.setValue('#manualEqBrand','TestBrand');
  await b.setValue('#manualEqModel','E2E-01');
  await b.click('#manualEqSave');
  data=await storage();
  assert(data.equipment.some(x=>x.name==='E2E Cable'&&x.model==='E2E-01'));
  await b.waitFor("!!document.querySelector('[data-delgym]')",{label:'gym delete button'});
  await b.click('[data-delgym]');
  await b.waitFor("!JSON.parse(localStorage.getItem('trainlogProData')).gyms.some(g=>g.name==='E2E Gym 2')",{label:'gym deleted'});
  console.log('E2E 4/4 timer + program + gym/equipment passed');

  console.log('critical browser E2E: all 4 flows passed');
})().catch(err=>{
  console.error(err);
  process.exitCode=1;
}).finally(async()=>{
  if(browser){
    try{await browser.close()}catch(err){console.error('browser cleanup failed:',err)}
  }
  try{fs.rmSync(downloadDir,{recursive:true,force:true})}catch{}
});
