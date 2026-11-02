'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

async function exercise({uploadFails=false}={}){
  const listeners={}, status={textContent:''}, deleted=[], uploaded=[];
  const elements={
    driveBackupNow:{disabled:false,addEventListener(type,cb){listeners.backup=cb}},
    driveRestoreLatest:{disabled:false,addEventListener(type,cb){listeners.restore=cb}},
    driveAutoEnabled:{checked:false,addEventListener(type,cb){listeners.toggle=cb}},
    driveAutoStatus:{textContent:''},
    driveBackupStatus:status,
    driveConnectionStatus:{textContent:''},
    driveReconnectPanel:{style:{display:'none'}},
    driveReconnectPrompt:{textContent:''},
    driveReconnectHome:{style:{display:'none'}},
    driveReconnect:{addEventListener(type,cb){listeners.reconnect=cb}},
    driveReconnectHomeButton:{addEventListener(type,cb){listeners.homeReconnect=cb}},
    driveComparePanel:{style:{display:'none'}},
    driveCompareSummary:{textContent:'',style:{}},
    driveReviewRestore:{addEventListener(type,cb){listeners.review=cb}},
    driveDismissCompare:{addEventListener(type,cb){listeners.dismiss=cb}}
  };
  const storage=new Map([['trainlogProData',JSON.stringify({workouts:[{id:'w1'}]})]]);
  const windowListeners={};
  const backup={app:'TrainLog Pro',workouts:[{id:'w1',name:'測試'}],backupMeta:{format:'trainlog-pro-full-backup'}};
  let preview=null, popupRequests=0, fileRequests=0;
  let files=[
    {id:'old1',name:'trainlog-pro-backup-1.json',createdTime:'2026-10-25T00:00:00Z'},
    {id:'old2',name:'trainlog-pro-backup-2.json',createdTime:'2026-10-24T00:00:00Z'},
    {id:'old3',name:'trainlog-pro-backup-3.json',createdTime:'2026-10-23T00:00:00Z'},
    {id:'old4',name:'trainlog-pro-backup-4.json',createdTime:'2026-10-22T00:00:00Z'},
    {id:'old5',name:'trainlog-pro-backup-5.json',createdTime:'2026-10-21T00:00:00Z'}
  ];
  function response(body,status=200){
    return {ok:status>=200&&status<300,status,async json(){return body},async text(){return JSON.stringify(body)}};
  }
  const google={accounts:{oauth2:{initTokenClient(config){
    assert.equal(config.scope,'https://www.googleapis.com/auth/drive.appdata');
    assert.equal(config.client_id,'971667698268-87b5i36l79saj1c1b2qfqfmrlktp8eme.apps.googleusercontent.com');
    return {requestAccessToken(){popupRequests++;config.callback({access_token:'token-test',expires_in:3600})}};
  }}}};
  const ctx={
    window:{google,addEventListener:(type,cb)=>{windowListeners[type]=cb},TrainLogBackupBridge:{
      buildBackupPayload:()=>backup,
      previewImport:(data,type,name)=>{preview={data,type,name}},
      summarizeLocal:()=>{
        const d=JSON.parse(storage.get('trainlogProData')||'{}');
        const result={};
        for(const k of ['workouts','templates','exerciseLibrary','gyms','equipment','bodyStatus','strengthGoals']){
          const a=d[k]||[];result[k]={count:a.length,ids:a.map(x=>String(x.id||x.date))};
        }
        result.hasSettings=!!d.settings;result.hasPlan=!!d.currentPlan;return result;
      },
      summarizeRemote:d=>{
        const result={};
        for(const k of ['workouts','templates','exerciseLibrary','gyms','equipment','bodyStatus','strengthGoals']){
          const a=d[k]||[];result[k]={count:a.length,ids:a.map(x=>String(x.id||x.date))};
        }
        result.hasSettings=!!d.settings;result.hasPlan=!!d.currentPlan;return result;
      }
    }},
    google,
    document:{getElementById:id=>elements[id]||null,createElement(){return {}},head:{appendChild(){}}},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(k,v)=>storage.set(k,v),removeItem:key=>storage.delete(key)},
    URL,URLSearchParams,Date,Promise,console,navigator:{onLine:true},
    setTimeout:(cb,ms)=>setTimeout(cb,ms>=10000?10:ms),clearTimeout,
    async fetch(url,opts={}){
      if(url.includes('uploadType=multipart')){
        if(uploadFails)return response({error:'upload unavailable'},503);
        const body=opts.body||'';
        assert(body.includes('測試'));
        assert.equal(opts.headers.Authorization,'Bearer token-test');
        const num=uploaded.length+1;
        const file={id:'new'+num,name:'trainlog-pro-backup-new'+num+'.json',createdTime:'2026-11-02T00:00:0'+num+'Z'};
        uploaded.push(body);files.unshift(file);return response(file);
      }
      if(url.includes('?alt=media')){fileRequests++;return response(backup)}
      if(url.includes('?')&&url.includes('spaces=appDataFolder'))return response({files});
      if(opts.method==='DELETE'){
        const id=url.split('/').pop();deleted.push(id);files=files.filter(f=>f.id!==id);
        return {ok:true,status:204};
      }
      throw Error('Unexpected request: '+url);
    }
  };
  vm.runInNewContext(fs.readFileSync('js/cloud/drive-backup.js','utf8'),ctx,{filename:'drive-backup.js'});
  assert(!elements.driveClientId,'OAuth Client ID must not require a user-visible input');
  assert.equal(elements.driveReconnectPanel.style.display,'block','reconnect control shown when not authorized');
  listeners.backup();
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(elements.driveReconnectPanel.style.display,'none','reconnect control hidden once authorized');
  assert.equal(elements.driveReconnectHome.style.display,'none','no reconnect home banner with valid OAuth');
  assert.equal(elements.driveConnectionStatus.textContent,'cloudBackup.connected');
  if(uploadFails){
    assert.equal(uploaded.length,0);
    assert.equal(deleted.length,0);
    assert(status.textContent.includes('操作失敗'));
  }else{
    assert.equal(uploaded.length,1);
    assert.deepEqual(deleted,['old5']);
    assert(files.some(f=>f.id==='new1'));
    assert.equal(files.length,5);
    assert(status.textContent.includes('備份成功'));
    listeners.restore();
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.equal(fileRequests,1);
    assert.equal(preview,null,'read should not open import before confirmation');
    assert.equal(elements.driveComparePanel.style.display,'block');
    assert(elements.driveCompareSummary.textContent.includes('訓練紀錄'));
    listeners.review();
    assert.equal(preview.type,'json');
    assert.equal(preview.data.workouts[0].id,'w1');
    assert.equal(preview.name,'trainlog-pro-backup-new1.json');
    assert.equal(elements.driveAutoEnabled.checked,true);
    assert.equal(storage.get('trainlogProDriveEverConnected'),'true');
    // Restore preview must not auto-overwrite cloud data.
    storage.set('trainlogProData',JSON.stringify({workouts:[{id:'w1'},{id:'w2'}]}));
    ctx.window.TrainLogCloudBackup.dataChanged();
    await new Promise(resolve=>setTimeout(resolve,35));
    assert.equal(uploaded.length,1);
    // A new manual backup re-enables the automatic pipeline.
    listeners.backup();
    await new Promise(resolve=>setTimeout(resolve,30));
    assert.equal(uploaded.length,2);
    storage.set('trainlogProData',JSON.stringify({workouts:[{id:'w1'},{id:'w2'},{id:'w3'}]}));
    ctx.window.TrainLogCloudBackup.dataChanged();
    await new Promise(resolve=>setTimeout(resolve,45));
    assert.equal(uploaded.length,3,'auto backup should upload changed local data');
    // Another device uploaded a newer version: no overwrite.
    files.unshift({id:'remote-device',name:'trainlog-pro-backup-external.json',createdTime:'2026-11-02T01:00:00Z'});
    storage.set('trainlogProData',JSON.stringify({workouts:[{id:'w4'}]}));
    ctx.window.TrainLogCloudBackup.dataChanged();
    await new Promise(resolve=>setTimeout(resolve,40));
    assert.equal(uploaded.length,3,'remote changes should block automatic upload');
    assert(status.textContent.includes('偵測到其他裝置'));
    ctx.window.TrainLogCloudBackup.pauseAfterLocalReset();
    assert.equal(elements.driveAutoEnabled.checked,false);
  }
  assert.equal(popupRequests,uploadFails?1:1);
  assert.equal(elements.driveBackupNow.disabled,false);
  assert.equal(elements.driveRestoreLatest.disabled,false);
}
(async()=>{
  await exercise();
  await exercise({uploadFails:true});
  console.log('Google Drive mocked backup/restore and failure safety passed');
})().catch(err=>{console.error(err);process.exitCode=1});
