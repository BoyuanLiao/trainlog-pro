from pathlib import Path

INDEX = Path('index.html')
APP = Path('js/app.js')
SW = Path('sw.js')
RECORDS_TEST = Path('tests/ui/records-page-regression.test.js')

index = INDEX.read_text(encoding='utf-8')
app = APP.read_text(encoding='utf-8')
sw = SW.read_text(encoding='utf-8')

old = "2.10.1"
new = "2.10.2"

if f"const APP_VERSION='{old}';" not in app:
    raise SystemExit('APP_VERSION anchor not found')
app = app.replace(f"const APP_VERSION='{old}';", f"const APP_VERSION='{new}';", 1)

# index.html is the cache-busting source of truth for static assets.
index = index.replace(old, new)
anchor = '<div class="section">訓練紀錄</div>'
shim = '<span id="manualFromRecords" hidden aria-hidden="true"></span>'
if shim not in index:
    if anchor not in index:
        raise SystemExit('records page anchor not found')
    index = index.replace(anchor, anchor + '\n    ' + shim, 1)

sw = sw.replace(f'TrainLog Pro v{old}', f'TrainLog Pro v{new}', 1)

records_test = """const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/app.js','utf8');

assert(index.includes('id=\"quickManual\"'),'global manual-entry button must remain available');
assert(app.includes(\"$('#quickManual').onclick=manualEntry\"),'global manual-entry handler must remain wired');

assert(!/<button[^>]+id=\"manualFromRecords\"/i.test(index),'records page must not add a visible duplicate manual-entry button');
assert(/id=\"manualFromRecords\"[^>]*hidden/i.test(index),'hidden legacy compatibility node must exist');
assert(!app.includes(\"$('#manualFromRecords').onclick=manualEntry\"),'current app must not wire the duplicate records-page entry');
assert(!app.includes(\"selector:'#manualFromRecords'\"),'current records tutorial must not target the removed duplicate button');

console.log('records page regression: no visible duplicate manual-entry button');
"""

INDEX.write_text(index, encoding='utf-8', newline='\n')
APP.write_text(app, encoding='utf-8', newline='\n')
SW.write_text(sw, encoding='utf-8', newline='\n')
RECORDS_TEST.write_text(records_test, encoding='utf-8', newline='\n')

print('startup cache compatibility fix applied')
