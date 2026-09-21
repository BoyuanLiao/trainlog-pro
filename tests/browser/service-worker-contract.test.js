'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync(path.resolve(__dirname,'../../sw.js'),'utf8');
const handlers={};
let skipped=false,claimed=false,openedCache='';
const cachedResponse={ok:true,type:'basic',clone(){return this}};
const cache={
  async match(){return null},
  async put(){}
};
const sandbox={
  URL,Response,Promise,
  self:{
    addEventListener:(name,fn)=>{handlers[name]=fn},
    skipWaiting:()=>{skipped=true},
    clients:{claim:()=>{claimed=true}}
  },
  caches:{open:async name=>{openedCache=name;return cache}},
  fetch:async()=>cachedResponse
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'sw.js'});

assert(handlers.install&&handlers.activate&&handlers.fetch,'service worker must register lifecycle handlers');
handlers.install();
assert.strictEqual(skipped,true);
let activationPromise=null;
handlers.activate({waitUntil:p=>{activationPromise=p}});
await activationPromise;
assert.strictEqual(claimed,true);

let appIntercepted=false;
handlers.fetch({
  request:{method:'GET',url:'http://127.0.0.1:4173/js/app.js?v=2.10.6'},
  respondWith:()=>{appIntercepted=true}
});
assert.strictEqual(appIntercepted,false,'app assets must remain outside the exercise-library cache');

let postIntercepted=false;
handlers.fetch({
  request:{method:'POST',url:'https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/a.gif'},
  respondWith:()=>{postIntercepted=true}
});
assert.strictEqual(postIntercepted,false,'non-GET requests must never be intercepted');

let exercisePromise=null;
handlers.fetch({
  request:{method:'GET',url:'https://raw.githubusercontent.com/mohamedatef90/exercise-library/main/animations/test.gif'},
  respondWith:p=>{exercisePromise=p}
});
assert(exercisePromise,'exercise library GET should be intercepted');
const response=await exercisePromise;
assert.strictEqual(response,cachedResponse);
assert.strictEqual(openedCache,'trainlog-exercise-library-v1');

let otherGithub=false;
handlers.fetch({
  request:{method:'GET',url:'https://raw.githubusercontent.com/other/project/main/test.gif'},
  respondWith:()=>{otherGithub=true}
});
assert.strictEqual(otherGithub,false,'unrelated raw GitHub assets must not be intercepted');

console.log('service worker contract: scope, methods and cache behavior passed');
