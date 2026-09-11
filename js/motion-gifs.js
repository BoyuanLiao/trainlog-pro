// TrainLog Pro v2.9.23 - Exercise Library animated exercise demos
(function(){
'use strict';

const DATA_URL='https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/exercises.json';
const GIF_BASE='https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/gifs/';
let libraryPromise=null;
let demoSeq=0;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(v){return String(v||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9\u4e00-\u9fff]+/g,' ').replace(/\s+/g,' ').trim()}
function englishHint(nameEn,label){
  const en=norm(nameEn);
  if(/[a-z]{3}/.test(en))return en;
  const s=String(label||'').toLowerCase();
  const hints=[
    [/背伸展|背部伸展|下背伸展|腰背伸展|羅馬椅/,'back extension'],
    [/腿伸|伸腿/,'leg extension'],[/腿彎|腿後勾/,'leg curl'],[/腿推|哈克/,'leg press'],
    [/髖外展|外展/,'hip abduction'],[/髖內收|內展|內收/,'hip adduction'],
    [/胸推/,'chest press'],[/蝴蝶|夾胸|飛鳥/,'chest fly'],[/肩推/,'shoulder press'],
    [/下拉/,'lat pulldown'],[/划船/,'seated row'],[/擴背|pullover/,'pullover'],
    [/側平舉/,'lateral raise'],[/二頭/,'biceps curl'],[/三頭/,'triceps extension'],
    [/臀推/,'hip thrust'],[/硬舉/,'deadlift'],[/深蹲/,'squat'],[/小腿/,'calf raise'],
    [/捲腹|腹肌/,'crunch'],[/旋轉/,'torso rotation'],[/跑步/,'treadmill'],
    [/橢圓/,'elliptical'],[/腳踏|單車|自行車/,'stationary bike']
  ];
  for(const [re,q] of hints)if(re.test(s))return q;
  return norm(label);
}
function tokens(s){
  const stop=new Set(['machine','exercise','seated','standing','lever','cable','plate','loaded','selectorized','horizontal','vertical','assisted','the','and']);
  return norm(s).split(' ').filter(x=>x.length>1&&!stop.has(x));
}
function equipmentText(item){return (item?.equipment||[]).join(' ').toLowerCase()}
function isMachineItem(item){
  const eq=equipmentText(item);
  return /machine|cable|treadmill|stationary bike|elliptical|smith|assisted/.test(eq);
}
function wantsMachineDemo(label='',nameEn='',equipmentName=''){
  const zh=String(label||'');
  const en=(String(nameEn||'')+' '+String(equipmentName||'')).toLowerCase();
  return zh.includes('機') || zh.includes('器械') || /machine|selectorized|plate[- ]loaded|lever|sled|smith/.test(en);
}
function isBackExtensionQuery(query='',label='',nameEn=''){
  const text=(norm(query)+' '+norm(nameEn)+' '+String(label||'')).toLowerCase();
  return /back extension|hyperextension|roman chair/.test(text) || /背伸展|背部伸展|下背伸展|腰背伸展|羅馬椅/.test(text);
}
function isBackExtensionItem(item){
  const name=norm(item?.name),targets=(item?.targetMuscles||[]).join(' ').toLowerCase();
  if(/back extension|hyperextension|roman chair/.test(name))return true;
  return /lower back|erector spinae|spinal erector/.test(targets) && /extension/.test(name);
}
function machinePreference(query,item,equipmentName='',label='',nameEn=''){
  const eq=equipmentText(item);
  let score=0;
  if(/press|extension|curl|abduction|adduction|pulldown|row|fly|raise|pullover/.test(query) && isMachineItem(item))score+=12;
  if(wantsMachineDemo(label,nameEn,equipmentName)){
    if(isMachineItem(item))score+=120;
    if(/dumbbell|barbell|body weight|bodyweight|kettlebell|band|medicine ball|ez bar/.test(eq))score-=180;
  }
  return score;
}
function scoreItem(item,query,equipmentName='',label='',nameEn=''){
  if(!item?.gif||!item?.name)return -1;
  const name=norm(item.name),q=norm(query),qt=tokens(q),nt=tokens(name);
  if(!q||!qt.length)return -1;
  let score=0;
  if(name===q)score+=180;
  if(name.includes(q))score+=90;
  if(q.includes(name)&&name.length>5)score+=45;
  let hit=0;
  for(const t of qt){
    if(nt.includes(t)){score+=24;hit++}
    else if(nt.some(n=>n.startsWith(t)||t.startsWith(n))){score+=10;hit+=0.5}
  }
  score+=Math.round((hit/qt.length)*50);
  if(/lat pulldown/.test(q)&&/lat pulldown/.test(name))score+=70;
  if(/chest press/.test(q)&&/chest press/.test(name))score+=70;
  if(/shoulder press/.test(q)&&/(shoulder press|military press|overhead press)/.test(name))score+=60;
  if(/leg press/.test(q)&&/leg press/.test(name))score+=70;
  if(/leg extension/.test(q)&&/leg extension/.test(name))score+=70;
  if(/leg curl/.test(q)&&/leg curl/.test(name))score+=70;
  if(/hip abduction/.test(q)&&/hip abduction/.test(name))score+=70;
  if(/hip adduction/.test(q)&&/hip adduction/.test(name))score+=70;
  if(/seated row|row/.test(q)&&/row/.test(name))score+=45;
  if(/chest fly/.test(q)&&/(fly|flye|pec deck)/.test(name))score+=55;
  if(/pullover/.test(q)&&/pullover/.test(name))score+=65;
if(isBackExtensionQuery(q,label,nameEn)){
  if(isBackExtensionItem(item))score+=400;
  else score-=500;
}
score+=machinePreference(q,item,equipmentName,label,nameEn);
  const eqHint=norm(equipmentName);
  if(eqHint&&/(cable|pulley)/.test(eqHint)&&(item.equipment||[]).some(x=>/cable/i.test(x)))score+=8;
  return score;
}
function bestMatch(items,nameEn,label,equipmentName){
  const rawQuery=englishHint(nameEn,label);
  const backExt=isBackExtensionQuery(rawQuery,label,nameEn);
  const q=backExt?'back extension':rawQuery;
  const machineOnly=wantsMachineDemo(label,nameEn,equipmentName);
  const pool=backExt?items.filter(isBackExtensionItem):(machineOnly?items.filter(isMachineItem):items);
  let best=null,bestScore=-1;
  for(const item of pool){const s=scoreItem(item,q,equipmentName,label,nameEn);if(s>bestScore){best=item;bestScore=s}}
  if(backExt && (!best || !isBackExtensionItem(best)))return null;
  return bestScore>=55?{item:best,score:bestScore,query:q}:null;
}
async function getLibrary(){
  if(!libraryPromise){
    libraryPromise=fetch(DATA_URL,{cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .then(x=>Array.isArray(x)?x:[])
      .catch(err=>{libraryPromise=null;throw err});
  }
  return libraryPromise;
}
function renderError(root,msg){
  root.innerHTML='<div class="motion-demo-title"><span>動作動畫</span><span class="pill">Exercise Library</span></div><div class="motion-demo-note">'+esc(msg)+'</div>';
}
async function loadDemo(domId,nameEn,label,equipmentName){
  const root=document.getElementById(domId);if(!root)return;
  try{
    const items=await getLibrary();
    const found=bestMatch(items,nameEn,label,equipmentName);
    if(!found){renderError(root,'Exercise Library 目前找不到足夠吻合的動畫，避免顯示錯誤動作。');return}
    const x=found.item,src=GIF_BASE+encodeURIComponent(x.gif);
    root.innerHTML='<div class="motion-demo-title"><span>動作動畫</span><span class="pill">Exercise Library</span></div>'+
      '<img class="exercise-library-gif" src="'+esc(src)+'" alt="'+esc(label||x.name)+' 動作動畫" loading="eager" referrerpolicy="no-referrer">'+
      '<div class="motion-demo-note"><b>對應：</b>'+esc(x.name)+'<br>第三方動畫來源：Exercise Library（GitHub）。實際器械設定、握距與活動範圍仍以現場器材及舒適動作為準。</div>';
    const img=root.querySelector('img');
    if(img)img.addEventListener('error',()=>renderError(root,'動畫檔載入失敗，請確認目前網路連線後再試一次。'),{once:true});
  }catch(err){renderError(root,'無法連線到 Exercise Library。這個動畫需要網路才能載入。')}
}
window.TrainLogMotion3DHtml=function(id,pattern,label,nameEn='',equipmentName=''){
  const domId='exerciseLibraryDemo_'+(++demoSeq);
  setTimeout(()=>loadDemo(domId,nameEn,label,equipmentName),0);
  return '<div id="'+domId+'" class="motion-demo motion-demo-3d"><div class="motion-demo-title"><span>動作動畫</span><span class="pill">Exercise Library</span></div><div class="motion-demo-note">正在尋找「'+esc(nameEn||label||'此動作')+'」的對應動畫…</div></div>';
};
})();
