/* TrainLog Pro — optional client-side Google Drive backups.
 * Uses Google Identity Services and the Drive appDataFolder scope.
 * No client secret and no access token are persisted.
 */
(() => {
  'use strict';
  const SCOPE='https://www.googleapis.com/auth/drive.appdata';
  const API='https://www.googleapis.com/drive/v3/files';
  const UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
  const NAME='trainlog-pro-backup-';
  const DEFAULT_CLIENT_ID='971667698268-87b5i36l79saj1c1b2qfqfmrlktp8eme.apps.googleusercontent.com';
  const $=id=>document.getElementById(id);
  const APP_KEY='trainlogProData';
  const ENABLED_KEY='trainlogProDriveAutoEnabled';
  const LAST_REMOTE_KEY='trainlogProDriveLastRemoteId';
  const LAST_SYNC_KEY='trainlogProDriveLastSyncedData';
  const EVER_KEY='trainlogProDriveEverConnected';
  const DELAY_MS=10000, MIN_INTERVAL_MS=60000;
  let pendingTimer=null, dirty=false, blocked=false, lastUploadAt=0;
  let lastSyncedData=localStorage.getItem(LAST_SYNC_KEY)||'';
  let lastRemoteId=localStorage.getItem(LAST_REMOTE_KEY)||'';
  let autoEnabled=localStorage.getItem(ENABLED_KEY)==='true';
  let pendingCloud=null;
  const previouslyUsed=()=>localStorage.getItem(EVER_KEY)==='true'||!!lastRemoteId;
  function showReconnect(){
    const panel=$('driveReconnectPanel');
    if(panel)panel.style.display=previouslyUsed()?'block':'block';
    const prompt=$('driveReconnectPrompt');
    if(prompt)prompt.textContent=previouslyUsed()
      ?'你曾使用 Google Drive 備份。重新連接可檢查雲端是否有較新的資料；不會自動覆寫。'
      :'如果已有其他裝置的 Google Drive 備份，可連接原 Google 帳號來找回資料。';
  }
  function showCompare(visible){
    const panel=$('driveComparePanel');
    if(panel)panel.style.display=visible?'block':'none';
  }
  function fingerprint(value){
    if(!value)return '';
    let h=2166136261;
    for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
    return value.length+':'+(h>>>0).toString(16);
  }
  const appRaw=()=>localStorage.getItem(APP_KEY)||'';
  const isAuthorized=()=>!!token && Date.now()<expiresAt-60000;
  const setStatus=message=>{status(message);const el=$('driveAutoStatus');if(el)el.textContent=message};
  function refreshToggle(){
    const checkbox=$('driveAutoEnabled');
    if(checkbox)checkbox.checked=autoEnabled;
  }
  function scheduleAuto(delay=DELAY_MS){
    clearTimeout(pendingTimer);pendingTimer=null;
    if(!autoEnabled||blocked||!dirty||busy)return;
    if(!isAuthorized()){setStatus('有未備份的變更，請按「立即備份」重新授權 Google 帳號');return}
    if(navigator.onLine===false){setStatus('離線中：變更已儲存於本機，恢復網路後重試');return}
    pendingTimer=setTimeout(()=>{pendingTimer=null;run('auto')},Math.max(delay,lastUploadAt+MIN_INTERVAL_MS-Date.now(),0));
    setStatus('有未備份變更，將於稍後自動備份至 Google Drive');
  }
  function dataChanged(){
    const raw=appRaw();
    if(!raw)return;
    dirty=fingerprint(raw)!==lastSyncedData;
    if(dirty)scheduleAuto();
  }
  function pauseAfterLocalReset(){
    clearTimeout(pendingTimer);pendingTimer=null;autoEnabled=false;dirty=false;blocked=false;
    localStorage.setItem(ENABLED_KEY,'false');refreshToggle();
    setStatus('本機資料已重設。自動雲端備份已暫停，以保護既有雲端備份');
  }
  let token='',expiresAt=0,client=null,busy=false,loadingGIS=null;
  const status=message=>{if($('driveBackupStatus'))$('driveBackupStatus').textContent=message};
  const errorText=err=>String(err?.message||err||'未知錯誤');
  function loadGIS(){
    if(window.google?.accounts?.oauth2)return Promise.resolve();
    if(loadingGIS)return loadingGIS;
    loadingGIS=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';
      s.async=true;s.onload=resolve;s.onerror=()=>{loadingGIS=null;reject(Error('Google 登入元件載入失敗'))};
      document.head.appendChild(s);
    });
    return loadingGIS;
  }
  async function authorize(){
    const id=DEFAULT_CLIENT_ID;
    if(token && Date.now()<expiresAt-60000)return token;
    await loadGIS();
    return new Promise((resolve,reject)=>{
      client=google.accounts.oauth2.initTokenClient({
        client_id:id,scope:SCOPE,
        callback:response=>{
          if(response?.error){reject(Error(response.error));return}
          token=response.access_token;
          expiresAt=Date.now()+(Number(response.expires_in)||3600)*1000;
          resolve(token);
        },
        error_callback:()=>reject(Error('Google 授權視窗已關閉或登入失敗'))
      });
      client.requestAccessToken({prompt:'consent'});
    });
  }
  async function api(url,options={}){
    const res=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,...(options.headers||{})}});
    if(!res.ok){
      if(res.status===401){token='';expiresAt=0}
      throw Error('Google Drive API '+res.status+': '+(await res.text()).slice(0,200));
    }
    if(res.status===204)return null;
    return res.json();
  }
  async function listFiles(){
    const items=[];let pageToken='';
    do {
      const params=new URLSearchParams({spaces:'appDataFolder',fields:'nextPageToken,files(id,name,createdTime,size)',pageSize:'100',q:"name contains 'trainlog-pro-backup-' and trashed = false"});
      if(pageToken)params.set('pageToken',pageToken);
      const result=await api(API+'?'+params);
      items.push(...(result.files||[]));pageToken=result.nextPageToken||'';
    }while(pageToken);
    return items.filter(f=>f.name.startsWith(NAME)&&f.name.endsWith('.json'))
      .sort((a,b)=>String(b.createdTime||'').localeCompare(String(a.createdTime||'')));
  }
  async function backup(isAuto=false){
    if(isAuto){
      if(!autoEnabled||blocked||!isAuthorized()||navigator.onLine===false)return;
      const remote=await listFiles();
      if((remote[0]?.id||'')!==lastRemoteId){
        blocked=true;
        setStatus('偵測到其他裝置的雲端備份變更；已暫停自動備份，請先檢查雲端資料');
        return;
      }
    }else await authorize();
    const capturedRaw=appRaw();
    const payload=JSON.stringify(window.TrainLogBackupBridge.buildBackupPayload());
    const metadata={name:NAME+new Date().toISOString().replace(/[:.]/g,'-')+'.json',parents:['appDataFolder'],mimeType:'application/json'};
    const boundary='trainlog'+Date.now();
    const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+
      '\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+payload+'\r\n--'+boundary+'--';
    const created=await api(UPLOAD+'?uploadType=multipart&fields=id,name,createdTime',{
      method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body
    });
    // Never remove the freshly-created backup; pruning failures are non-fatal.
    const all=await listFiles();
    for(const old of all.filter(f=>f.id!==created.id).slice(4)){
      try{await api(API+'/'+encodeURIComponent(old.id),{method:'DELETE'})}catch(err){console.warn('Drive backup pruning failed',err)}
    }
    localStorage.setItem(EVER_KEY,'true');
    lastRemoteId=created.id;
    lastSyncedData=fingerprint(capturedRaw);
    localStorage.setItem(LAST_REMOTE_KEY,lastRemoteId);
    localStorage.setItem(LAST_SYNC_KEY,lastSyncedData);
    lastUploadAt=Date.now();
    blocked=false;
    if(!isAuto){
      autoEnabled=true;localStorage.setItem(ENABLED_KEY,'true');refreshToggle();
    }
    dirty=fingerprint(appRaw())!==lastSyncedData;
    setStatus('備份成功：'+new Date().toLocaleString()+'（雲端保留最近 5 份）');
  }
  async function readCloud(){
    const files=await listFiles();
    if(!files.length)return null;
    const selected=files[0];
    const result=await fetch(API+'/'+encodeURIComponent(selected.id)+'?alt=media',{headers:{Authorization:'Bearer '+token}});
    if(!result.ok){
      if(result.status===401){token='';expiresAt=0}
      throw Error('讀取雲端備份失敗：'+result.status);
    }
    const incoming=await result.json();
    if(incoming?.backupMeta?.format!=='trainlog-pro-full-backup')throw Error('雲端檔案不是有效的 TrainLog Pro 完整備份');
    return {selected,incoming};
  }
  function compareCloud(cloud){
    const bridge=window.TrainLogBackupBridge;
    const local=bridge.summarizeLocal();
    const remote=bridge.summarizeRemote(cloud.incoming);
    const labels={workouts:'訓練紀錄',templates:'課表',exerciseLibrary:'動作',gyms:'健身房',equipment:'器材',bodyStatus:'身體狀態',strengthGoals:'力量目標'};
    const rows=Object.keys(labels).map(key=>{
      const a=local[key],b=remote[key];
      const left=new Set(a.ids),right=new Set(b.ids);
      const onlyLocal=a.ids.filter(id=>!right.has(id)).length;
      const onlyCloud=b.ids.filter(id=>!left.has(id)).length;
      return labels[key]+'：本機 '+a.count+'／雲端 '+b.count+
        (onlyLocal||onlyCloud?'（僅本機 '+onlyLocal+'／僅雲端 '+onlyCloud+'）':'');
    });
    rows.push('設定：'+(local.hasSettings?'本機有':'本機無')+'／'+(remote.hasSettings?'雲端有':'雲端無'));
    rows.push('訓練計畫：'+(local.hasPlan?'本機有':'本機無')+'／'+(remote.hasPlan?'雲端有':'雲端無'));
    rows.push('以上為數量及識別碼初步比較；相同識別碼的內容仍可能不同，恢復前請查看預覽。');
    const el=$('driveCompareSummary');
    if(el)el.textContent='最新雲端備份：'+cloud.selected.name+'\n'+rows.join('\n');
    if(el)el.style.whiteSpace='pre-line';
    showCompare(true);
  }
  async function reconnect(){
    // This operation is always started by a user gesture; no silent OAuth popup.
    await authorize();
    localStorage.setItem(EVER_KEY,'true');
    showReconnect();
    // Prevent auto-writing before the user reviews cloud data.
    blocked=true;clearTimeout(pendingTimer);pendingTimer=null;
    const cloud=await readCloud();
    if(!cloud){
      pendingCloud=null;showCompare(false);
      blocked=false;
      setStatus('Google Drive 已連接，但目前找不到 TrainLog Pro 雲端備份；本機資料未更動。');
      return;
    }
    pendingCloud=cloud;
    compareCloud(cloud);
    setStatus('已連接 Google Drive 並比對備份，請選擇是否預覽恢復／合併。自動備份暫停。');
  }
  function reviewCloud(){
    if(!pendingCloud)return;
    window.TrainLogBackupBridge.previewImport(pendingCloud.incoming,'json',pendingCloud.selected.name);
    lastRemoteId=pendingCloud.selected.id;
    localStorage.setItem(LAST_REMOTE_KEY,lastRemoteId);
    showCompare(false);
    setStatus('請在匯入預覽選擇恢復或合併。本機資料不會在確認前變更；自動備份仍暫停。');
    pendingCloud=null;
  }
  function dismissCloud(){
    pendingCloud=null;showCompare(false);
    blocked=true;clearTimeout(pendingTimer);pendingTimer=null;
    setStatus('已保留本機資料，自動備份暫停。若要重新開始上傳，請先確認雲端內容後手動備份。');
  }
  async function restore(){
    await authorize();
    localStorage.setItem(EVER_KEY,'true');
    const cloud=await readCloud();
    if(!cloud){setStatus('雲端尚無 TrainLog Pro 備份');return}
    pendingCloud=cloud;
    compareCloud(cloud);
    blocked=true;clearTimeout(pendingTimer);pendingTimer=null;
    setStatus('已取得最新雲端備份，請先查看本機與雲端資料的比較，再選擇預覽恢復／合併。');
  }
  async function run(action){
    if(busy)return;
    if(action==='auto'&&(!autoEnabled||blocked||!isAuthorized()))return;
    busy=true;
    for(const id of ['driveBackupNow','driveRestoreLatest'])if($(id))$(id).disabled=true;
    if(action!=='auto')setStatus(action==='backup'?'正在備份至 Google Drive…':'正在讀取雲端備份…');
    try{
      if(action==='restore')await restore();
      else if(action==='reconnect')await reconnect();
      else await backup(action==='auto');
    }catch(err){
      setStatus('操作失敗：'+errorText(err)+(action==='auto'?'；本機資料安全，稍後可重試':''));
      if(action==='auto'&&isAuthorized()&&navigator.onLine!==false){
        clearTimeout(pendingTimer);
        pendingTimer=setTimeout(()=>{pendingTimer=null;run('auto')},60000);
      }
    }finally{
      busy=false;
      for(const id of ['driveBackupNow','driveRestoreLatest'])if($(id))$(id).disabled=false;
      if(action==='auto'&&dirty&&!pendingTimer&&!blocked)scheduleAuto();
      if(action==='backup'&&dirty)scheduleAuto();
    }
  }
  function init(){
    if(!$('driveBackupNow')||!$('driveRestoreLatest'))return;
    $('driveBackupNow').addEventListener('click',()=>run('backup'));
    $('driveRestoreLatest').addEventListener('click',()=>run('restore'));
    $('driveReconnect')?.addEventListener('click',()=>run('reconnect'));
    $('driveReviewRestore')?.addEventListener('click',reviewCloud);
    $('driveDismissCompare')?.addEventListener('click',dismissCloud);
    showReconnect();
    const toggle=$('driveAutoEnabled');
    if(toggle){
      refreshToggle();
      toggle.addEventListener('change',()=>{
        autoEnabled=toggle.checked;
        localStorage.setItem(ENABLED_KEY,String(autoEnabled));
        blocked=false;
        if(!autoEnabled){clearTimeout(pendingTimer);pendingTimer=null;setStatus('自動備份已停用；仍可手動備份')}
        else{dirty=fingerprint(appRaw())!==lastSyncedData;scheduleAuto();if(!dirty)setStatus('自動備份已啟用，資料變更後將自動備份')}
      });
    }
    window.addEventListener('online',()=>{if(dirty)scheduleAuto(1000)});
    window.addEventListener('storage',event=>{if(event.key===APP_KEY)dataChanged()});
    window.addEventListener('pageshow',()=>{if(dirty)scheduleAuto(1000)});
    if(autoEnabled) {dirty=fingerprint(appRaw())!==lastSyncedData;scheduleAuto();}

    loadGIS().catch(err=>status('Google 授權元件預載失敗：'+errorText(err)));
    status('使用 Google 帳號授權後，即可備份或恢復健身紀錄。');
  }
  window.TrainLogCloudBackup=Object.freeze({dataChanged,pauseAfterLocalReset});
  init();
})();
