'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

function load(file,locale){
  const ctx=vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
  const value=ctx.window.TrainLogLocales?.[locale];
  assert(value,locale+' locale must exist');
  return value;
}
function flatten(obj,prefix='',out=new Map()){
  for(const [key,value] of Object.entries(obj||{})){
    const path=prefix?prefix+'.'+key:key;
    if(typeof value==='string')out.set(path,value);
    else if(value&&typeof value==='object')flatten(value,path,out);
  }
  return out;
}
function tokens(value){
  return [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(m=>m[1]).sort();
}

const zh=flatten(load('js/i18n/locales/zh-TW.js','zh-TW'));
const ja=flatten(load('js/i18n/locales/ja-JP.js','ja-JP'));

const missing=[...zh.keys()].filter(key=>!ja.has(key));
const extra=[...ja.keys()].filter(key=>!zh.has(key));
assert.deepStrictEqual(missing,[],'missing ja-JP translations: '+JSON.stringify(missing));
assert.deepStrictEqual(extra,[],'unexpected ja-JP keys: '+JSON.stringify(extra));

const placeholderIssues=[];
for(const [key,zhValue] of zh){
  const a=tokens(zhValue),b=tokens(ja.get(key));
  if(JSON.stringify(a)!==JSON.stringify(b))placeholderIssues.push({key,zh:a,ja:b});
}
assert.deepStrictEqual(placeholderIssues,[],'placeholder mismatch: '+JSON.stringify(placeholderIssues));

assert(ja.size>=300,'ja-JP should cover the full UI catalog; only '+ja.size+' string leaves were found');
const kana=[...ja.values()].filter(value=>/[ぁ-んァ-ヶ]/.test(value)).length;
assert(kana>=150,'ja-JP should contain substantial Japanese translation coverage; kana leaves='+kana);
console.log('ja-JP completeness: '+ja.size+' translations match zh-TW keys and placeholders');
