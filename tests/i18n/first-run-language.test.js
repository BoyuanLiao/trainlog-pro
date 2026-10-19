'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const migrationSource=fs.readFileSync('js/core/migration.js','utf8');
assert(migrationSource.includes("localeSetupCompleted:false"),'fresh data must require first-run language selection');
assert(migrationSource.includes("raw.settings?.localeSetupCompleted==null"),'migration must preserve existing users without showing the new chooser');

const app=fs.readFileSync('js/app.js','utf8');
assert(app.includes("function renderFirstLanguage()"),'app must render first-run language chooser');
assert(app.includes("data.settings.localeSetupCompleted!==true||data.settings.tutorialCompleted===true"),'app tutorial must wait for language selection');
assert(app.includes("data.settings.localeSetupCompleted===true&&data.settings.tutorialCompleted===true"),'preference setup must wait until language selection and tutorial are complete');
assert(app.includes("$('[data-first-locale]').forEach(button=>{"),'first-run language chooser must bind all locale buttons');
assert(app.includes("data.settings.locale=i18n.setLocale(button.dataset.firstLocale)"),'first-run language choice must switch locale immediately');
assert(app.includes("localStorage.setItem(APP_KEY,JSON.stringify(data))"),'first-run locale must be persisted');

const html=fs.readFileSync('index.html','utf8');
for(const locale of ['zh-TW','en-US','ja-JP'])assert(html.includes('data-first-locale="'+locale+'"'),'missing first-run locale option '+locale);
for(const key of ['languageSetup.kicker','languageSetup.title','languageSetup.copy','languageSetup.continue'])assert(html.includes('data-i18n="'+key+'"'),'missing first-run i18n key '+key);

const context=vm.createContext({window:{}});
for(const locale of ['zh-TW','en-US','ja-JP'])vm.runInContext(fs.readFileSync('js/i18n/locales/'+locale+'.js','utf8'),context);
for(const locale of ['zh-TW','en-US','ja-JP']){
  const catalog=context.window.TrainLogLocales[locale];
  assert(catalog.languageSetup?.title,'missing languageSetup.title in '+locale);
  assert(catalog.languageSetup?.continue,'missing languageSetup.continue in '+locale);
}
console.log('first-run language setup contract passed');
