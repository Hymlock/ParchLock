// Holds the engine worker's synchronous input request open until the page answers it.
// Stateless across service-worker restarts: every poll asks the page again, and the page
// keeps its answer until the engine moves on, so a restarted worker loses nothing.
const pending = new Map();
const POLL_MS = 20000; // stay well inside the browser's service-worker lifetime limits
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.endsWith('/eamon-input')) return;
  const id = url.searchParams.get('id');
  event.respondWith(new Promise(async resolve => {
    const previous = pending.get(id);
    if (previous) { clearTimeout(previous.timer); previous.resolve(new Response('', {status: 204})); }
    const timer = setTimeout(() => { pending.delete(id); resolve(new Response('', {status: 204})); }, POLL_MS);
    pending.set(id, {resolve, timer});
    const windows = await self.clients.matchAll({type: 'window'});
    for (const client of windows) client.postMessage({kind: 'eamon-poll', id});
  }));
});
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.kind !== 'eamon-answer') return;
  const item = pending.get(String(data.id));
  if (!item) return;
  clearTimeout(item.timer); pending.delete(String(data.id));
  item.resolve(data.cancel ? new Response('', {status: 409}) : new Response(JSON.stringify(data.value || ''), {status: 200}));
});
