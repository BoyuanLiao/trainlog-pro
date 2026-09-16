const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const match=index.match(/<div class="analysis-panel hidden" data-analysis-panel="muscle">([\s\S]*?)<div class="analysis-panel hidden" data-analysis-panel="exercise">/);
assert(match,'muscle analysis panel must exist');
const panel=match[1];

for(const id of ['analysisMuscleTargets','muscleAnalysis','pplAnalysis','analysisMovementGaps']){
  assert(panel.includes(`id="${id}"`),`muscle panel must include ${id}`);
}
assert(!panel.includes('ui-standard-only'),'muscle analysis must not disappear in simple/advanced UI levels');
assert(!panel.includes('ui-advanced-only'),'movement analysis must not be restricted to advanced UI level');

console.log('analysis muscle panel regression passed');
