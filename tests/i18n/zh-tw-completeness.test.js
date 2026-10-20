'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('js/i18n/locales/zh-TW.js','utf8'),ctx);
const locale=ctx.window.TrainLogLocales?.['zh-TW'];
assert(locale,'zh-TW locale must exist');

function get(obj,key){return key.split('.').reduce((node,part)=>node&&node[part],obj)}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):[full];
})}

const sources=[
  {file:'index.html',source:fs.readFileSync('index.html','utf8')},
  ...walk('js')
    .filter(file=>file.endsWith('.js'))
    .filter(file=>!file.replaceAll('\\','/').startsWith('js/i18n/locales/'))
    .map(file=>({file,source:fs.readFileSync(file,'utf8')}))
];
const keys=new Map();
function add(key,file){
  if(!keys.has(key))keys.set(key,new Set());
  keys.get(key).add(file);
}
for(const {file,source} of sources){
  for(const m of source.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g))add(m[1],file);
  for(const m of source.matchAll(/\btr\(\s*['"]([^'"]+)['"]/g))add(m[1],file);
  for(const m of source.matchAll(/\b(?:messageKey|labelKey|reasonKey|titleKey|copyKey|nameKey|shortKey|descKey)\s*:\s*['"]([^'"]+)['"]/g))add(m[1],file);
  // Locale-key maps such as MUSCLE_I18N are passed to tr() indirectly.
  for(const m of source.matchAll(/['"]((?:domain|tutorialCopy|analysisProgress|progression)\.[A-Za-z0-9_.-]+)['"]/g))add(m[1],file);
}
const missing=[...keys.keys()].filter(key=>typeof get(locale,key)!=='string')
  .map(key=>({key,files:[...keys.get(key)]}));
assert.deepStrictEqual(missing,[],'missing zh-TW translations: '+JSON.stringify(missing));

assert(keys.size>=300,'i18n migration should cover the full UI surface; only '+keys.size+' keys were referenced');
console.log('zh-TW completeness: '+keys.size+' referenced translation keys verified across index.html and js/**/*.js');
