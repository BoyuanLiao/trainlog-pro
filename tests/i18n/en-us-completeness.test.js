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
const en=flatten(load('js/i18n/locales/en-US.js','en-US'));

const missing=[...zh.keys()].filter(key=>!en.has(key));
const extra=[...en.keys()].filter(key=>!zh.has(key));
assert.deepStrictEqual(missing,[],'missing en-US translations: '+JSON.stringify(missing));
assert.deepStrictEqual(extra,[],'unexpected en-US keys: '+JSON.stringify(extra));

const placeholderIssues=[];
for(const [key,zhValue] of zh){
  const a=tokens(zhValue),b=tokens(en.get(key));
  if(JSON.stringify(a)!==JSON.stringify(b))placeholderIssues.push({key,zh:a,en:b});
}
assert.deepStrictEqual(placeholderIssues,[],'placeholder mismatch: '+JSON.stringify(placeholderIssues));

const cjk=/[\u3400-\u9fff\uf900-\ufaff]/;
const untranslated=[...en.entries()].filter(([,value])=>cjk.test(value)).map(([key,value])=>({key,value}));
assert.deepStrictEqual(untranslated,[],'en-US must not contain Chinese UI copy: '+JSON.stringify(untranslated));

assert(en.size>=300,'en-US should cover the full UI catalog; only '+en.size+' string leaves were found');
console.log('en-US completeness: '+en.size+' translations match zh-TW keys and placeholders with no Chinese UI copy');
