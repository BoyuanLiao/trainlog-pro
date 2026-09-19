'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const ROOT=path.resolve(__dirname,'../..');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'js/app.js'),'utf8');

const appVersion=app.match(/const APP_VERSION='([^']+)'/)?.[1];
const titleVersion=index.match(/<title>TrainLog Pro v([^<]+)<\/title>/)?.[1];
const pillVersion=index.match(/class="source-pill">v([^<]+)<\/span>/)?.[1];

assert(appVersion,'APP_VERSION must be declared');
assert.strictEqual(titleVersion,appVersion,'document title must match APP_VERSION');
assert.strictEqual(pillVersion,appVersion,'visible source-pill version must match APP_VERSION');

// HTML ids must be unique: duplicate ids make querySelector/getElementById behavior ambiguous.
const ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const seen=new Set(),duplicates=new Set();
ids.forEach(id=>seen.has(id)?duplicates.add(id):seen.add(id));
assert.deepStrictEqual([...duplicates],[],'HTML ids must be unique');

// Every local stylesheet/script referenced by index.html must exist and carry the active cache key.
const refs=[...index.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(m=>m[1])
  .filter(ref=>!ref.startsWith('http:')&&!ref.startsWith('https:')&&!ref.startsWith('data:')&&!ref.startsWith('#'));
refs.forEach(ref=>{
  const [file,query='']=ref.split('?');
  assert(fs.existsSync(path.join(ROOT,file)),'missing local asset: '+file);
  if(/\.(?:js|css)$/.test(file)){
    const version=new URLSearchParams(query).get('v');
    assert.strictEqual(version,appVersion,file+' cache key must match APP_VERSION');
  }
});

// Critical dependency order must remain deterministic and app.js must load last.
const scripts=[...index.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
const required=[
  'js/data/glossary.js','js/data/equipment.js','js/data/exercises.js','js/data/programs.js',
  'js/analysis/training-metrics.js','js/analysis/progress.js',
  'js/core/utils.js','js/core/migration.js','js/core/storage.js',
  'js/training/metrics.js','js/training/lifecycle.js','js/training/mutations.js',
  'js/training/progression.js','js/training/progression-actions.js','js/training/progression-view.js',
  'js/ui/exercise-progress-browser.js','js/app.js'
];
required.forEach(file=>assert(scripts.includes(file),'missing required script '+file));
for(let i=1;i<required.length;i++){
  assert(scripts.indexOf(required[i-1])<scripts.indexOf(required[i]),required[i-1]+' must load before '+required[i]);
}
assert.strictEqual(scripts.at(-1),'js/app.js','app.js must be the final application script');

// Critical app mount points used by the main navigation/analysis must remain present.
[
  'homePage','trainPage','recordsPage','analysisPage','settingsPage',
  'analysisMuscleTargets','muscleAnalysis','pplAnalysis','analysisMovementGaps',
  'activeWorkout','recordList','modalWrap','toast'
].forEach(id=>assert(index.includes(`id="${id}"`),'missing critical DOM mount #'+id));

console.log(`app structure: ${ids.length} unique ids and ${refs.length} local assets verified for v${appVersion}`);
