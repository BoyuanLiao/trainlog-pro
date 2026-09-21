'use strict';

const fs=require('fs');
const assert=require('assert');

const file=process.argv[2];
assert(file,'usage: node tests/browser/assert-rendered-dom.js <dumped-dom.html>');
const dom=fs.readFileSync(file,'utf8');

assert(/<title>TrainLog Pro v[^<]+<\/title>/.test(dom),'browser did not load TrainLog Pro');
const today=dom.match(/id="todayText"[^>]*>([^<]+)<\/div>/)?.[1]?.trim();
assert(today,'startup JavaScript did not render #todayText');

[
  'data-testid="quick-start"',
  'data-testid="nav-home"',
  'data-testid="nav-records"',
  'data-testid="nav-analysis"',
  'data-testid="nav-settings"'
].forEach(marker=>assert(dom.includes(marker),'stable browser selector missing: '+marker));

assert(/id="homeKpis"[^>]*>\s*<div/.test(dom),'home renderer did not populate KPI DOM');
assert(/id="recordMuscle"[^>]*>\s*<option/.test(dom),'records renderer did not populate muscle filter');
assert(/id="analysisConfidence"[^>]*>\s*<div/.test(dom),'analysis renderer did not populate confidence DOM');

console.log('browser smoke: startup JavaScript rendered home, records and analysis DOM successfully');
