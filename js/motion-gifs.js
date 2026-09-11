// TrainLog Pro v2.9.24 - Exercise Library animated exercise demos
(function(){
'use strict';

const DATA_URL='https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/exercises.json';
const GIF_BASE='https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/gifs/';
let libraryPromise=null;
let demoSeq=0;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(v){return String(v||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9\u4e00-\u9fff]+/g,' ').replace(/\s+/g,' ').trim()}
function toArray(v){return Array.isArray(v)?v:(v==null?[]:[v])}
function itemText(item){return norm([item?.name,...toArray(item?.equipment)].filter(Boolean).join(' '))}
function equipmentText(item){return norm(toArray(item?.equipment).join(' '))}

function englishHint(nameEn,label){
  const en=norm(nameEn);
  if(/[a-z]{3}/.test(en))return en;
  const s=String(label||'').toLowerCase();
  const hints=[
    [/背伸展|背部伸展|下背伸展|腰背伸展|羅馬椅/,'back extension'],
    [/腿伸|伸腿/,'leg extension'],[/腿彎|腿後勾/,'leg curl'],[/腿推|哈克/,'leg press'],
    [/髖外展|外展|外側大腿/,'hip abduction'],[/髖內收|內展|內收|內側大腿/,'hip adduction'],
    [/胸推/,'chest press'],[/蝴蝶|夾胸|飛鳥/,'chest fly'],[/肩推/,'shoulder press'],
    [/下拉/,'lat pulldown'],[/划船/,'seated row'],[/擴背|pullover/,'pullover'],
    [/後三角|反向飛鳥/,'reverse fly'],[/側平舉/,'lateral raise'],[/二頭/,'biceps curl'],[/三頭/,'triceps extension'],
    [/臀推/,'hip thrust'],[/硬舉/,'deadlift'],[/深蹲/,'squat'],[/小腿/,'calf raise'],
    [/捲腹|腹肌/,'crunch'],[/旋轉/,'torso rotation'],[/跑步/,'treadmill'],
    [/橢圓/,'elliptical'],[/腳踏|單車|自行車/,'stationary bike']
  ];
  for(const [re,q] of hints)if(re.test(s))return q;
  return norm(label);
}

function tokens(s){
  const stop=new Set(['exercise','the','and','with','using','for']);
  return norm(s).split(' ').filter(x=>x.length>1&&!stop.has(x));
}

const EQUIPMENT_RULES=[
  ['stability_ball',/(stability ball|exercise ball|swiss ball|fitness ball|bosu|平衡球|瑜珈球)/],
  ['medicine_ball',/(medicine ball|藥球)/],
  ['dumbbell',/(dumbbell|啞鈴)/],
  ['barbell',/(barbell|ez bar|ez-bar|槓鈴)/],
  ['kettlebell',/(kettlebell|壺鈴)/],
  ['band',/(resistance band|elastic band|exercise band|banded|彈力帶)/],
  ['cable',/(cable machine|cable|pulley|functional trainer|滑輪|纜繩)/],
  ['smith',/(smith machine|smith|史密斯)/],
  ['bodyweight',/(body weight|bodyweight|calisthenic|no equipment|徒手|自體重)/],
  ['bench',/(roman chair|hyperextension bench|back extension bench|bench|羅馬椅)/],
  ['pullup_bar',/(pull up bar|pull-up bar|chin up bar|單槓)/],
  ['machine',/(\bmachine\b|selectorized|selectorised|plate loaded|plate-loaded|leverage machine|lever machine|lever|sled machine|assisted machine|weight stack|機械式|固定式器械|器械|機台|訓練機)/],
  ['machine',/(treadmill|elliptical|stationary bike|exercise bike|recumbent bike|rowing machine|跑步機|橢圓機|腳踏車機)/]
];

function equipmentFamilies(text){
  const s=norm(text),out=new Set();
  for(const [family,re] of EQUIPMENT_RULES)if(re.test(s))out.add(family);
  // "machine" inside Cable Machine / Smith Machine must not turn those into a generic selectorized machine.
  if(out.has('cable')||out.has('smith'))out.delete('machine');
  return out;
}
function explicitRequestedFamily(nameEn='',label='',equipmentName=''){
  const eqFamilies=equipmentFamilies(equipmentName);
  if(eqFamilies.size)return [...eqFamilies][0];
  const nameFamilies=equipmentFamilies(nameEn);
  if(nameFamilies.size)return [...nameFamilies][0];
  const labelFamilies=equipmentFamilies(label);
  if(labelFamilies.size)return [...labelFamilies][0];
  const zh=String(label||'');
  if(/機|器械/.test(zh) && !/滑輪|史密斯/.test(zh))return 'machine';
  return '';
}
function candidateFamilies(item){return equipmentFamilies(itemText(item))}
function equipmentCompatible(required,item){
  if(!required)return true;
  const families=candidateFamilies(item);
  if(required==='machine'){
    if(families.has('machine'))return true;
    // Unknown equipment is not good enough for a query that explicitly requests a fixed machine.
    return false;
  }
  return families.has(required);
}

const CONCEPT_RULES=[
  ['back_extension',/(back extension|hyperextension|hyper extension|roman chair|背伸展|腰背伸展|下背伸展)/],
  ['leg_extension',/(leg extension|knee extension|腿伸|伸腿)/],
  ['leg_curl',/(leg curl|hamstring curl|knee flexion|腿彎|腿後勾)/],
  ['hip_abduction',/(hip abduction|hip abductor|abductor machine|outer thigh|髖外展|外側大腿)/],
  ['hip_adduction',/(hip adduction|hip adductor|adductor machine|inner thigh|髖內收|內側大腿)/],
  ['leg_press',/(leg press|hack press|腿推)/],
  ['chest_fly',/(chest fly|chest flye|pec deck|butterfly|fly machine|夾胸|胸飛鳥|蝴蝶機)/],
  ['chest_press',/(chest press|bench press|horizontal press|胸推)/],
  ['shoulder_press',/(shoulder press|overhead press|military press|肩推)/],
  ['reverse_fly',/(reverse fly|reverse flye|rear delt fly|rear delt machine|後三角|反向飛鳥)/],
  ['lateral_raise',/(lateral raise|side raise|側平舉)/],
  ['lat_pulldown',/(lat pulldown|lat pull down|pulldown|pull down|下拉)/],
  ['upright_row',/(upright row|直立划船)/],
  ['row',/(seated row|chest supported row|machine row|low row|\brow\b|划船)/],
  ['pullover',/(pullover|pull over|擴背)/],
  ['biceps_curl',/(biceps curl|bicep curl|preacher curl|arm curl|二頭)/],
  ['triceps_extension',/(triceps extension|tricep extension|triceps pushdown|tricep pushdown|pushdown|三頭)/],
  ['hip_thrust',/(hip thrust|glute drive|臀推)/],
  ['deadlift',/(deadlift|硬舉)/],
  ['squat',/(squat|hack squat|深蹲)/],
  ['calf_raise',/(calf raise|calf press|小腿)/],
  ['crunch',/(abdominal crunch|ab crunch|crunch|捲腹)/],
  ['torso_rotation',/(torso rotation|rotary torso|trunk rotation|軀幹旋轉)/],
  ['treadmill',/(treadmill|跑步機)/],
  ['elliptical',/(elliptical|cross trainer|橢圓)/],
  ['stationary_bike',/(stationary bike|exercise bike|recumbent bike|spin bike|腳踏車|單車)/]
];
function concepts(text){
  const s=norm(text),out=new Set();
  for(const [name,re] of CONCEPT_RULES)if(re.test(s))out.add(name);
  return out;
}
const CONFLICT_GROUPS=[
  ['leg_extension','leg_curl'],
  ['hip_abduction','hip_adduction'],
  ['chest_press','chest_fly'],
  ['row','upright_row','lat_pulldown','pullover'],
  ['shoulder_press','lateral_raise','reverse_fly'],
  ['biceps_curl','triceps_extension'],
  ['leg_press','calf_raise'],
  ['back_extension','crunch','torso_rotation'],
  ['hip_thrust','back_extension'],
  ['treadmill','elliptical','stationary_bike']
];
function hasConceptConflict(queryConcepts,itemConcepts){
  for(const group of CONFLICT_GROUPS){
    const q=group.find(x=>queryConcepts.has(x));
    if(!q)continue;
    for(const other of group)if(other!==q&&itemConcepts.has(other))return true;
  }
  return false;
}
function strongConcept(text){
  const c=concepts(text);
  for(const [name] of CONCEPT_RULES)if(c.has(name))return name;
  return '';
}

function positionFlags(text){
  const s=norm(text),out=new Set();
  if(/\bseated\b|坐姿/.test(s))out.add('seated');
  if(/\bstanding\b|站姿/.test(s))out.add('standing');
  if(/\blying\b|\bsupine\b|\bprone\b|臥姿|俯臥|仰臥/.test(s))out.add('lying');
  if(/\bincline\b|上斜/.test(s))out.add('incline');
  if(/\bdecline\b|下斜/.test(s))out.add('decline');
  return out;
}
function positionConflict(query,item){
  const q=positionFlags(query),x=positionFlags(item);
  const posture=['seated','standing','lying'];
  const angle=['incline','decline'];
  const qPost=posture.find(v=>q.has(v)),xPost=posture.find(v=>x.has(v));
  if(qPost&&xPost&&qPost!==xPost)return true;
  const qAngle=angle.find(v=>q.has(v)),xAngle=angle.find(v=>x.has(v));
  return !!(qAngle&&xAngle&&qAngle!==xAngle);
}

function compatibleCandidate(item,queryInfo){
  if(!item?.gif||!item?.name)return false;
  if(!equipmentCompatible(queryInfo.requiredFamily,item))return false;
  const candidate=itemText(item);
  const itemConcepts=concepts(candidate);
  if(queryInfo.primaryConcept && !itemConcepts.has(queryInfo.primaryConcept))return false;
  if(hasConceptConflict(queryInfo.queryConcepts,itemConcepts))return false;
  if(positionConflict(queryInfo.semanticText,candidate))return false;
  return true;
}

function scoreItem(item,queryInfo){
  const name=norm(item.name),q=norm(queryInfo.query),qt=tokens(q),nt=tokens(name);
  if(!q||!qt.length)return -1;
  let score=0;
  if(name===q)score+=220;
  if(name.includes(q))score+=105;
  if(q.includes(name)&&name.length>5)score+=55;
  let hit=0;
  for(const t of qt){
    if(nt.includes(t)){score+=24;hit++}
    else if(nt.some(n=>n.startsWith(t)||t.startsWith(n))){score+=9;hit+=0.4}
  }
  score+=Math.round((hit/qt.length)*55);
  if(queryInfo.primaryConcept && concepts(itemText(item)).has(queryInfo.primaryConcept))score+=110;
  if(queryInfo.requiredFamily && candidateFamilies(item).has(queryInfo.requiredFamily))score+=90;
  const qPos=positionFlags(queryInfo.semanticText),xPos=positionFlags(itemText(item));
  qPos.forEach(v=>{if(xPos.has(v))score+=18});
  return score;
}

function makeQueryInfo(nameEn,label,equipmentName){
  const query=englishHint(nameEn,label);
  // Movement identity comes from the exercise itself. A combo machine name such as
  // "Inner / Outer Thigh Machine" must not overwrite an exercise like Hip Adduction.
  const actionText=norm([query,nameEn,label].filter(Boolean).join(' '));
  const semanticText=norm([actionText,equipmentName].filter(Boolean).join(' '));
  return {
    query,
    semanticText,
    requiredFamily:explicitRequestedFamily(nameEn,label,equipmentName),
    queryConcepts:concepts(actionText),
    primaryConcept:strongConcept(actionText)
  };
}
function bestMatch(items,nameEn,label,equipmentName){
  const info=makeQueryInfo(nameEn,label,equipmentName);
  if(!info.query)return null;
  const pool=(items||[]).filter(item=>compatibleCandidate(item,info));
  let best=null,bestScore=-1;
  for(const item of pool){
    const s=scoreItem(item,info);
    if(s>bestScore){best=item;bestScore=s}
  }
  // A strict family/concept filter may legitimately leave no usable demo. Wrong is worse than missing.
  return bestScore>=70?{item:best,score:bestScore,query:info.query}:null;
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
