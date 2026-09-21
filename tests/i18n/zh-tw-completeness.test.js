'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('js/i18n/locales/zh-TW.js','utf8'),ctx);
const locale=ctx.window.TrainLogLocales?.['zh-TW'];
assert(locale,'zh-TW locale must exist');

function get(obj,key){return key.split('.').reduce((node,part)=>node&&node[part],obj)}
const sources=[fs.readFileSync('index.html','utf8'),fs.readFileSync('js/app.js','utf8')];
const keys=new Set();
for(const source of sources){
  for(const m of source.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g))keys.add(m[1]);
  for(const m of source.matchAll(/\btr\(\s*['"]([^'"]+)['"]/g))keys.add(m[1]);
}
const missing=[...keys].filter(key=>typeof get(locale,key)!=='string');
assert.deepStrictEqual(missing,[],'missing zh-TW translations: '+missing.join(', '));
assert(keys.size>=15,'i18n migration should cover a meaningful initial UI surface');

console.log('zh-TW completeness: '+keys.size+' referenced translation keys verified');
