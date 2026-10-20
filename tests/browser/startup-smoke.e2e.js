'use strict';
const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {launchBrowser}=require('./cdp-client');
(async()=>{
 const browser=await launchBrowser({url:process.env.TRAINLOG_E2E_URL||'http://127.0.0.1:4173/',downloadDir:fs.mkdtempSync(path.join(os.tmpdir(),'trainlog-smoke-'))});
 try{
  const html=await browser.evaluate('document.documentElement.outerHTML');
  const file=path.join(os.tmpdir(),'trainlog-smoke-dom-'+process.pid+'.html');
  fs.writeFileSync(file,html);
  try{const {spawnSync}=require('child_process');const result=spawnSync(process.execPath,[path.join(__dirname,'assert-rendered-dom.js'),file],{stdio:'inherit'});assert.strictEqual(result.status,0,'DOM smoke assertions failed')}finally{fs.rmSync(file,{force:true})}
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
