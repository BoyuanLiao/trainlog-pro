// TrainLog Pro v2.10.2 - offline cache for Exercise Library animations
'use strict';
const EXERCISE_CACHE='trainlog-exercise-library-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  let url;try{url=new URL(req.url)}catch{return}
  const isExerciseLibrary=url.hostname==='raw.githubusercontent.com'&&url.pathname.startsWith('/mohamedatef90/exercise-library/main/');
  if(!isExerciseLibrary)return;
  event.respondWith((async()=>{
    const cache=await caches.open(EXERCISE_CACHE);
    const cached=await cache.match(req);
    const network=fetch(req).then(async response=>{
      if(response&&(response.ok||response.type==='opaque')){
        try{await cache.put(req,response.clone())}catch{}
      }
      return response;
    }).catch(()=>null);
    if(cached){network.catch(()=>{});return cached}
    const response=await network;
    return response||new Response('',{status:504,statusText:'Exercise Library unavailable offline'});
  })());
});
