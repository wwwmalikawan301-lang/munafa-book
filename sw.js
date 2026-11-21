const CACHE='munafa-v17';
const FILES=['./','index.html','style.css','lang.js','app.js','auth.js','data.js','staff.js','firebase-config.js','manifest.json','icon.svg','privacy.html'];
const OPTIONAL=['icon-192.png','icon-512.png','icon-512-maskable.png'];
const HOSTS=['www.gstatic.com','fonts.googleapis.com','fonts.gstatic.com'];
const grab=(c,f,must)=>fetch(new Request(f,{cache:'reload'})).then(r=>{
  if(!r.ok)throw new Error(f);
  return c.put(f,r);
}).catch(err=>{if(must)throw err});
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all([
    ...FILES.map(f=>grab(c,f,true)),
    ...OPTIONAL.map(f=>grab(c,f,false))
  ])));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const same=u.origin===location.origin;
  if(!same&&!HOSTS.includes(u.hostname))return;
  const store=res=>{
    if(res&&res.ok){const c=res.clone();caches.open(CACHE).then(k=>k.put(e.request,c))}
    return res;
  };
  if(same){
    e.respondWith(
      fetch(e.request,{cache:'no-cache'}).then(store).catch(()=>
        caches.match(e.request,{ignoreSearch:true}).then(r=>r||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()))
      )
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(store)));
});
