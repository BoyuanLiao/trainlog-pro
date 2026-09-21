'use strict';

const {spawn}=require('child_process');
const fs=require('fs');
const os=require('os');
const path=require('path');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

class CDP {
  constructor(wsUrl){
    this.ws=new WebSocket(wsUrl);
    this.nextId=1;
    this.pending=new Map();
    this.handlers=new Map();
  }
  async open(){
    await new Promise((resolve,reject)=>{
      this.ws.addEventListener('open',resolve,{once:true});
      this.ws.addEventListener('error',reject,{once:true});
    });
    this.ws.addEventListener('message',event=>{
      const msg=JSON.parse(event.data);
      if(msg.id){
        const p=this.pending.get(msg.id);
        if(!p)return;
        this.pending.delete(msg.id);
        if(msg.error)p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result||{});
        return;
      }
      const list=this.handlers.get(msg.method)||[];
      list.forEach(fn=>Promise.resolve().then(()=>fn(msg.params||{})).catch(()=>{}));
    });
  }
  on(method,fn){
    if(!this.handlers.has(method))this.handlers.set(method,[]);
    this.handlers.get(method).push(fn);
  }
  send(method,params={}){
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close(){try{this.ws.close()}catch{}}
}

async function launchBrowser({url,downloadDir}){
  if(typeof WebSocket!=='function')throw new Error('Node WebSocket global is required');
  const chrome=process.env.CHROME_BIN||'google-chrome';
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'trainlog-cdp-'));
  fs.mkdirSync(downloadDir,{recursive:true});
  const args=[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--remote-debugging-port=9222','--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`,'about:blank'
  ];
  const proc=spawn(chrome,args,{stdio:['ignore','pipe','pipe']});
  let stderr='';
  proc.stderr.on('data',d=>{stderr+=d.toString()});

  let list=null;
  for(let i=0;i<80;i++){
    try{
      const res=await fetch('http://127.0.0.1:9222/json/list');
      if(res.ok){
        const rows=await res.json();
        list=rows.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);
        if(list)break;
      }
    }catch{}
    await sleep(100);
  }
  if(!list){
    proc.kill('SIGKILL');
    throw new Error('Chrome remote debugging did not start: '+stderr.slice(-2000));
  }

  const cdp=new CDP(list.webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  try{await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir})}catch{}

  let promptText='';
  cdp.setPromptText=text=>{promptText=String(text||'')};
  cdp.on('Page.javascriptDialogOpening',async p=>{
    await cdp.send('Page.handleJavaScriptDialog',{
      accept:true,
      promptText:p.type==='prompt'?promptText:''
    });
    promptText='';
  });

  async function evaluate(expression){
    const r=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(r.exceptionDetails)throw new Error('Browser evaluation failed: '+JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }
  async function waitFor(expression,{timeout=8000,interval=80,label=expression}={}){
    const start=Date.now();
    while(Date.now()-start<timeout){
      try{if(await evaluate(expression))return true}catch{}
      await sleep(interval);
    }
    throw new Error('Timed out waiting for '+label);
  }
  async function click(selector){
    const q=JSON.stringify(selector);
    await waitFor(`!!document.querySelector(${q})`,{label:selector});
    return evaluate(`(()=>{const el=document.querySelector(${q});el.click();return true})()`);
  }
  async function setValue(selector,value,event='change'){
    const q=JSON.stringify(selector),v=JSON.stringify(String(value));
    await waitFor(`!!document.querySelector(${q})`,{label:selector});
    return evaluate(`(()=>{const el=document.querySelector(${q});el.value=${v};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));return el.value})()`);
  }
  async function text(selector){
    const q=JSON.stringify(selector);
    await waitFor(`!!document.querySelector(${q})`,{label:selector});
    return evaluate(`document.querySelector(${q}).textContent`);
  }
  async function setFile(selector,file){
    const doc=await cdp.send('DOM.getDocument',{depth:1});
    const q=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});
    if(!q.nodeId)throw new Error('File input not found: '+selector);
    await cdp.send('DOM.setFileInputFiles',{nodeId:q.nodeId,files:[file]});
  }
  async function reload(){
    await cdp.send('Page.reload',{ignoreCache:true});
    await waitFor("document.readyState==='complete'&&!!document.querySelector('#todayText')?.textContent.trim()",{timeout:12000,label:'app reload'});
  }
  async function navigate(target=url){
    await cdp.send('Page.navigate',{url:target});
    await waitFor("document.readyState==='complete'&&!!document.querySelector('#todayText')?.textContent.trim()",{timeout:12000,label:'app startup'});
  }

  await navigate(url);
  return {
    cdp,proc,profile,downloadDir,evaluate,waitFor,click,setValue,text,setFile,reload,navigate,
    async close(){
      cdp.close();
      proc.kill('SIGTERM');
      await sleep(100);
      try{fs.rmSync(profile,{recursive:true,force:true})}catch{}
    }
  };
}

module.exports={launchBrowser,sleep};
