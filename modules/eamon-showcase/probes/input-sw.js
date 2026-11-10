const pending = new Map();
let sequence = 0;
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname !== '/probe-input') return;
  event.respondWith(new Promise(async resolve => {
    const id = ++sequence;
    const timer = setTimeout(() => {pending.delete(id); resolve(new Response('Timed out', {status:408}));}, 10000);
    pending.set(id, {resolve,timer});
    const windows = await self.clients.matchAll({type:'window'});
    for (const client of windows) client.postMessage({kind:'input',id,prompt:url.searchParams.get('prompt')});
  }));
});
self.addEventListener('message', event => {
  const item = pending.get(event.data.id);
  if (!item) return;
  clearTimeout(item.timer); pending.delete(event.data.id);
  item.resolve(new Response(event.data.value || '', {status:event.data.cancel ? 409 : 200}));
});
