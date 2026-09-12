const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/app.js','utf8');

assert(index.includes('id="quickManual"'),'global manual-entry button must remain available');
assert(app.includes("$('#quickManual').onclick=manualEntry"),'global manual-entry handler must remain wired');

assert(!index.includes('id="manualFromRecords"'),'records page must not add a duplicate manual-entry button');
assert(!app.includes("$('#manualFromRecords').onclick=manualEntry"),'duplicate records-page manual-entry handler must not exist');
assert(!app.includes("selector:'#manualFromRecords'"),'records tutorial must not target the removed duplicate button');

console.log('records page regression: duplicate manual-entry button absent');
