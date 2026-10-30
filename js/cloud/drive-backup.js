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
  const CLIENT_KEY='trainlogProGoogleClientId';
  const $=id=>document.getElementById(id);
  let token='',expiresAt=0,client=null,busy=false;
  const status=message=>{if($('driveBackupStatus'))$('driveBackupStatus').textContent=message};
  const errorText=err=>String(err?.message||err||'未知錯誤');
  const clientId=()=>($('driveClientId')?.value||'').trim();
  function saveClientId(){
    const id=clientId();
    if(id && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(id))throw Error('OAuth Client ID 格式不正確');
    if(id)localStorage.setItem(CLIENT_KEY,id);
    else localStorage.removeItem(CLIENT_KEY);
    client=null;
    return id;
  }
  function loadGIS(){
    if(window.google?.accounts?.oauth2)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://accounts.google.com/gsi/client';
      s.async=true;s.onload=resolve;s.onerror=()=>reject(Error('Google 登入元件載入失敗'));
      document.head.appendChild(s);
    });
  }
  async function authorize(){
    const id=saveClientId();
    if(!id)throw Error('請先填入 Google OAuth Client ID');
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
      const params=new URLSearchParams({spaces:'appDataFolder',fields:'nextPageToken,files(id,name,createdTime,size)',page_size:'100',q:"name contains 'trainlog-pro-backup-' and trashed = false"});
      if(pageToken)params.set('page_token',pageToken);
      const result=await api(API+'?'+params);
      items.push(...(result.files||[]));pageToken=result.nextPageToken||'';
    }while(pageToken);
    return items.filter(f=>f.name.startsWith(NAME)&&f.name.endsWith('.json'))
      .sort((a,b)=>String(b.createdTime||'').localeCompare(String(a.createdTime||'')));
  }
  async function backup(){
    await authorize();
    const payload=JSON.stringify(buildBackupPayload());
    const metadata={name:NAME+new Date().toISOString().replace(/[:.]/g,'-')+'.json',parents:['appDataFolder'],mimeType:'application/json'};
    const boundary='trainlog'+Date.now();
    const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+
      '\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+payload+'\r\n--'+boundary+'--';
    await api(UPLOAD+'?uploadType=multipart&fields=id,name,createdTime',{
      method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body
    });
    // Never remove the freshly-created backup; pruning failures are non-fatal.
    const all=await listFiles();
    for(const old of all.slice(5)){
      try{await api(API+'/'+encodeURIComponent(old.id),{method:'DELETE'})}catch(err){console.warn('Drive backup pruning failed',err)}
    }
    status('備份成功：'+new Date().toLocaleString()+'（雲端保留最近 5 份）');
  }
  async function restore(){
    await authorize();
    const files=await listFiles();
    if(!files.length){status('雲端尚無 TrainLog Pro 備份');return}
    const selected=files[0];
    const result=await fetch(API+'/'+encodeURIComponent(selected.id)+'?alt=media',{headers:{Authorization:'Bearer '+token}});
    if(!result.ok)throw Error('讀取雲端備份失敗：'+result.status);
    const incoming=await result.json();
    if(incoming?.backupMeta?.format!=='trainlog-pro-full-backup')throw Error('雲端檔案不是有效的 TrainLog Pro 完整備份');
    previewImport(incoming,'json',selected.name);
    status('已載入最新雲端備份。請確認匯入預覽並選擇恢復或合併；目前本機資料尚未更動。');
  }
  async function run(action){
    if(busy)return;
    busy=true;
    for(const id of ['driveBackupNow','driveRestoreLatest'])if($(id))$(id).disabled=true;
    status(action==='backup'?'正在備份至 Google Drive…':'正在讀取雲端備份…');
    try{await (action==='backup'?backup():restore())}
    catch(err){status('操作失敗：'+errorText(err))}
    finally{busy=false;for(const id of ['driveBackupNow','driveRestoreLatest'])if($(id))$(id).disabled=false}
  }
  function init(){
    const input=$('driveClientId');
    if(!input)return;
    input.value=localStorage.getItem(CLIENT_KEY)||'';
    input.addEventListener('change',()=>{try{saveClientId();status('OAuth 設定已保存於這台裝置')}catch(err){status(errorText(err))}});
    $('driveBackupNow').addEventListener('click',()=>run('backup'));
    $('driveRestoreLatest').addEventListener('click',()=>run('restore'));
    status('尚未連線。請設定 Google OAuth Client ID，再按「立即備份」。');
  }
  init();
})();
