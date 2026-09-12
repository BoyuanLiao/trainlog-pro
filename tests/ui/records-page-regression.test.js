const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/app.js','utf8');

assert(index.includes('id="quickManual"'),'global manual-entry button must remain available');
assert(app.includes("$('#quickManual').onclick=manualEntry"),'global manual-entry handler must remain wired');

assert(!/<button[^>]+id="manualFromRecords"/i.test(index),'records page must not add a visible duplicate manual-entry button');
assert(/id="manualFromRecords"[^>]*hidden/i.test(index),'hidden legacy compatibility node must exist');
assert(!app.includes("$('#manualFromRecords').onclick=manualEntry"),'current app must not wire the duplicate records-page entry');
assert(!app.includes("selector:'#manualFromRecords'"),'current records tutorial must not target the removed duplicate button');

console.log('records page regression: no visible duplicate manual-entry button');
