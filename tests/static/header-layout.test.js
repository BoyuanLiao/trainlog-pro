'use strict';
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/app.css','utf8');
assert(/class="top-identity"/.test(html),'header identity container needed for flex shrinking');
assert(/class="brand-logo"/.test(html),'header logo requires responsive styling');
assert(/class="brand-name"/.test(html),'header title requires responsive styling');
assert(/\.top>\.actions\s*\{[^}]*flex-wrap:nowrap/.test(css),'header actions must never wrap');
assert(/\.top>\.actions \.btn\s*\{[^}]*white-space:nowrap/.test(css),'header action labels must stay on one line');
assert(/@media\(max-width:520px\)/.test(css),'mobile header must be responsive');
assert(/class="top-meta"/.test(html),'version should live below app title');
assert(/class="top-meta"><span class="source-pill">v/.test(html),'version should remain visible without squeezing header buttons');
assert(!/\.top \.source-pill\s*\{\s*display:none/.test(css),'do not hide version on mobile');

console.log('header action single row contract passed');
