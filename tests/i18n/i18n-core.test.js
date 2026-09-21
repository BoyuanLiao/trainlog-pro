'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const ctx=vm.createContext({
  console, Intl, Date,
  window:{},
  document:{documentElement:{lang:'zh-Hant'},querySelectorAll:()=>[]}
});
vm.runInContext(fs.readFileSync('js/i18n/locales/zh-TW.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('js/i18n/i18n.js','utf8'),ctx);

const I=ctx.window.TrainLogI18n;
assert(I,'TrainLogI18n must exist');
assert.strictEqual(I.DEFAULT_LOCALE,'zh-TW');
assert.strictEqual(I.locale(),'zh-TW');
assert.strictEqual(I.t('nav.home'),'首頁');
assert.strictEqual(I.t('training.start'),'開始訓練');
assert.strictEqual(I.t('missing.key'),'missing.key');
assert.strictEqual(I.setLocale('unknown'),'zh-TW');
assert.strictEqual(I.has('analysis.tabs.muscle'),true);
assert.strictEqual(I.has('analysis.tabs.nope'),false);
assert(I.formatDate(new Date('2026-09-21T00:00:00Z'),{year:'numeric'}).includes('2026'));
assert(I.formatNumber(1234).length>=4);

console.log('i18n core: zh-TW lookup, fallback and Intl formatting passed');
