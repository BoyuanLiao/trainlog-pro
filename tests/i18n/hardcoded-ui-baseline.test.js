'use strict';

const fs=require('fs');
const assert=require('assert');

const app=fs.readFileSync('js/app.js','utf8');
const lines=app.split('\n');
const candidates=lines
  .map((line,index)=>({line:index+1,text:line.trim()}))
  .filter(row=>/[\u4e00-\u9fff]/.test(row.text))
  .filter(row=>/(toast\(|openModal\(|confirm\(|prompt\(|innerHTML|textContent|placeholder|<label|<button|<div|<span|aria-label|title=)/.test(row.text));

const MAX_HARDCODED_UI_LINES=160;
assert(
  candidates.length<=MAX_HARDCODED_UI_LINES,
  'hardcoded Chinese UI baseline regressed: '+candidates.length+' > '+MAX_HARDCODED_UI_LINES+
  '\nNew UI copy should use tr(...) / data-i18n instead of being written directly in app.js.'
);

console.log('i18n hardcoded UI baseline: '+candidates.length+' / '+MAX_HARDCODED_UI_LINES+' lines');
