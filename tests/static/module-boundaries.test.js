'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const ROOT=path.resolve(__dirname,'../..');
const pureModules=[
  'js/core/utils.js',
  'js/analysis/progress.js',
  'js/analysis/training-metrics.js',
  'js/training/metrics.js',
  'js/training/lifecycle.js',
  'js/training/mutations.js',
  'js/training/progression.js',
  'js/training/progression-actions.js',
  'js/training/progression-view.js'
];

pureModules.forEach(file=>{
  const source=fs.readFileSync(path.join(ROOT,file),'utf8');
  assert(!/\bdocument\s*\./.test(source),file+' must not access document');
  assert(!/\blocalStorage\s*\./.test(source),file+' must not access localStorage');
  assert(!/\bdata\s*\./.test(source),file+' must not read mutable app data directly');
  assert(!/querySelector\s*\(/.test(source),file+' must not query the DOM');
});

const storage=fs.readFileSync(path.join(ROOT,'js/core/storage.js'),'utf8');
assert(!/\bdocument\s*\./.test(storage),'storage core must remain DOM-free');
assert(!/\blocalStorage\s*\./.test(storage),'storage core must use its injected storage adapter');

console.log('module boundaries: pure modules remain isolated from DOM/app state');
