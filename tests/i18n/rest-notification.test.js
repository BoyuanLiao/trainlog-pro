'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const app=fs.readFileSync('js/app.js','utf8'),html=fs.readFileSync('index.html','utf8');
assert(app.includes('showRestNotification();toast(tr(\'feedback.restFinished\'))'));
assert(app.includes("if(timerFinished)return;"));
assert(app.includes("if(data.settings.restTimerNotification!==true||restNotificationStatus()!=='granted')return"));
assert(app.includes('Notification.requestPermission()'));
assert(app.includes("data.settings.restTimerNotification=false"));
assert(html.includes('id="setRestNotification"'));
assert(app.includes('id="drawerRestNotification"'));
for(const locale of ['zh-TW','en-US','ja-JP']){const context=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('js/i18n/locales/'+locale+'.js','utf8'),context);for(const key of ['setting','hint','title','enabled','denied','unsupported','secure'])assert(context.window.TrainLogLocales[locale].restNotification[key],locale+' '+key)}
console.log('rest notification contract passed');
