'use strict';

const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
[
  'quick-start','quick-manual','nav-home','nav-training','nav-records','nav-analysis','nav-settings',
  'analysis-tab-overview','analysis-tab-muscle','analysis-tab-exercise','analysis-tab-load'
].forEach(id=>assert(index.includes(`data-testid="${id}"`),'missing stable data-testid '+id));

assert(index.includes('js/i18n/locales/zh-TW.js?v=2.11.0'));
assert(index.includes('js/i18n/i18n.js?v=2.11.0'));
assert(index.indexOf('js/i18n/locales/zh-TW.js')<index.indexOf('js/i18n/i18n.js'));
assert(index.indexOf('js/i18n/i18n.js')<index.indexOf('js/app.js'));

console.log('i18n DOM contract: stable selectors and script order passed');
