const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('js/app.js','utf8');

const version=app.match(/const APP_VERSION='([^']+)'/)?.[1];
assert(version,'APP_VERSION must exist');

// The records-page markup changed after v2.10.1. Reusing the same asset key can
// pair the new HTML with a cached old app.js that still binds manualFromRecords.
assert.notStrictEqual(version,'2.10.1','records-page DOM change must use a fresh asset cache key');

const localAssets=[...index.matchAll(/(?:src|href)="((?:js|css)\/[^"]+\?v=([^"]+))"/g)];
assert(localAssets.length>0,'versioned local JS/CSS assets must exist');
for(const [,asset,assetVersion] of localAssets){
  assert.strictEqual(assetVersion,version,`${asset} cache key must match APP_VERSION`);
}

assert(!/<button[^>]+id="manualFromRecords"/i.test(index),'records page must not restore a visible manual-entry button');
assert(/id="manualFromRecords"[^>]*hidden/i.test(index),'hidden manualFromRecords compatibility node must exist for cached v2.10.1 JS');

console.log(`startup cache compatibility: ${version} with hidden legacy DOM shim`);
