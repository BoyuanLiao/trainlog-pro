'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const ctx=vm.createContext({
  console,Intl,Date,
  window:{},
  document:{documentElement:{lang:'zh-Hant'},querySelectorAll:()=>[]}
});
for(const file of ['zh-TW','en-US','ja-JP']){
  vm.runInContext(fs.readFileSync('js/i18n/locales/'+file+'.js','utf8'),ctx);
}
vm.runInContext(fs.readFileSync('js/i18n/i18n.js','utf8'),ctx);

const I=ctx.window.TrainLogI18n;
assert.strictEqual(I.setLocale('en-US'),'en-US');
assert.strictEqual(ctx.document.documentElement.lang,'en-US');
assert.strictEqual(I.t('nav.home'),'Home');
assert.strictEqual(I.t('training.start'),'Start workout');
assert.strictEqual(I.t('analysis.exerciseDetail'),'Detailed exercise analysis');
assert.strictEqual(I.t('feedback.settingsSaved'),'Settings saved');
assert.strictEqual(I.t('tutorialCopy.s01Title'),'Start a workout');

assert.strictEqual(I.setLocale('ja-JP'),'ja-JP');
assert.strictEqual(ctx.document.documentElement.lang,'ja-JP');
assert.strictEqual(I.t('nav.settings'),'設定');
assert.strictEqual(I.t('training.start'),'トレーニング開始');
assert.strictEqual(I.t('analysis.exerciseDetail'),'種目の詳細分析');
assert.strictEqual(I.t('feedback.settingsSaved'),'設定を保存しました');
assert.strictEqual(I.t('tutorialCopy.s01Title'),'トレーニング開始');

assert.strictEqual(I.setLocale('xx-YY'),'zh-TW');
assert.strictEqual(ctx.document.documentElement.lang,'zh-Hant');
console.log('locale switching: complete en-US, complete ja-JP, and zh-TW default passed');
