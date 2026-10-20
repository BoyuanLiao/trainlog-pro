'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const CJK=/[\u4e00-\u9fff]/;
const read=file=>fs.readFileSync(file,'utf8');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):[full];
});

function directUiLiterals(source,file){
  const issues=[];
  for(const m of source.matchAll(/>([^<>{}\n]*[\u4e00-\u9fff][^<>{}\n]*)</g)){
    issues.push(file+': static template text: '+m[1].trim());
  }
  for(const m of source.matchAll(/\b(?:placeholder|aria-label|title)="([^"]*[\u4e00-\u9fff][^"]*)"/g)){
    issues.push(file+': untranslated UI attribute: '+m[1]);
  }
  for(const m of source.matchAll(/\b(?:toast|alert|confirm|prompt)\(\s*(['"])([^'"\n]*[\u4e00-\u9fff][^'"\n]*)\1/g)){
    issues.push(file+': direct UI call literal: '+m[2]);
  }
  source.split('\n').forEach((line,index)=>{
    if(/textContent\s*=\s*['"`][^'"\n]*[\u4e00-\u9fff]/.test(line)){
      issues.push(file+':'+(index+1)+': direct textContent literal');
    }
    if(/\b(?:title|desc|copy|reason|text|label)\s*:\s*['"`][^'"\n]*[\u4e00-\u9fff]/.test(line)){
      issues.push(file+':'+(index+1)+': direct presentation metadata literal');
    }
  });
  return issues;
}

const jsFiles=walk('js').filter(file=>file.endsWith('.js'))
  .filter(file=>!file.replaceAll('\\','/').startsWith('js/i18n/locales/'))
  .filter(file=>!file.replaceAll('\\','/').startsWith('js/data/'));
const jsIssues=jsFiles.flatMap(file=>directUiLiterals(read(file),file));
assert.deepStrictEqual(jsIssues,[],
  'Hardcoded user-facing Chinese must use tr(...) or locale-backed display helpers:\n'+jsIssues.join('\n'));

const localeAgnostic=[
  'js/analysis/progress.js',
  'js/training/progression.js',
  'js/training/progression-view.js',
  'js/training/lifecycle.js',
  'js/core/storage.js'
];
const pureIssues=localeAgnostic.filter(file=>CJK.test(read(file)));
assert.deepStrictEqual(pureIssues,[],
  'Locale-agnostic modules must not contain Chinese presentation copy: '+pureIssues.join(', '));

// index.html keeps readable zh-TW fallback text, but every Chinese text node/attribute
// must declare how i18n.apply() will replace it.
const html=read('index.html');
const voids=new Set(['input','img','br','hr','meta','link','source','area','base','col','embed','param','track','wbr']);
const stack=[],htmlIssues=[];
const tokenRe=/<\/?[A-Za-z][^>]*>|[^<]+/g;
let token;
while((token=tokenRe.exec(html))){
  const value=token[0];
  if(value.startsWith('</')){stack.pop();continue}
  if(value.startsWith('<')){
    const match=/^<([A-Za-z][\w-]*)([^>]*)>/.exec(value);
    if(!match)continue;
    const tag=match[1].toLowerCase(),attrs=match[2]||'';
    if(!voids.has(tag)&&!value.endsWith('/>'))stack.push({tag,attrs});
    continue;
  }
  if(!CJK.test(value))continue;
  const parent=stack.at(-1);
  if(!parent||['script','style'].includes(parent.tag)||/\bdata-i18n=/.test(parent.attrs))continue;
  htmlIssues.push('unannotated Chinese text in <'+parent.tag+'>: '+value.trim().replace(/\s+/g,' '));
}
for(const match of html.matchAll(/<[^>]*\bplaceholder="[^"]*[\u4e00-\u9fff][^"]*"[^>]*>/g)){
  if(!/\bdata-i18n-placeholder=/.test(match[0]))htmlIssues.push('placeholder missing data-i18n-placeholder: '+match[0]);
}
for(const match of html.matchAll(/<[^>]*\baria-label="[^"]*[\u4e00-\u9fff][^"]*"[^>]*>/g)){
  if(!/\bdata-i18n-aria=/.test(match[0]))htmlIssues.push('aria-label missing data-i18n-aria: '+match[0]);
}
for(const match of html.matchAll(/<[^>]*\btitle="[^"]*[\u4e00-\u9fff][^"]*"[^>]*>/g)){
  htmlIssues.push('Chinese title attribute has no supported i18n contract: '+match[0]);
}
assert.deepStrictEqual(htmlIssues,[],
  'index.html Chinese fallback must be i18n-annotated:\n'+htmlIssues.join('\n'));

console.log('i18n 3G hardcoded UI contract: 0 direct UI literals; HTML fallback fully annotated');
