// ParchLock Eamon host, service-worker side. Holds the engine worker's synchronous input request
// open until the page answers it. Stateless across service-worker restarts: every poll asks the
// page again, and the page keeps its answer until the engine moves on, so nothing is lost.
(function () {
  var pending = new Map();
  var POLL_MS = 20000; // stay well inside the browser's service-worker lifetime limits
  self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);
    if (url.origin !== self.location.origin || !/\/eamon-input$/.test(url.pathname)) return;
    var id = url.searchParams.get('id');
    event.respondWith(new Promise(function (resolve) {
      var previous = pending.get(id);
      if (previous) { clearTimeout(previous.timer); previous.resolve(new Response('', {status: 204})); }
      var timer = setTimeout(function () { pending.delete(id); resolve(new Response('', {status: 204})); }, POLL_MS);
      pending.set(id, {resolve: resolve, timer: timer});
      self.clients.matchAll({type: 'window'}).then(function (windows) {
        windows.forEach(function (client) { client.postMessage({kind: 'eamon-poll', id: id}); });
      });
    }));
  });
  self.addEventListener('message', function (event) {
    var data = event.data || {};
    // Lets a page confirm that the service worker controlling it carries this relay (an older one would not).
    if (data.kind === 'eamon-ping') { if (event.source) event.source.postMessage({kind: 'eamon-pong'}); return; }
    if (data.kind !== 'eamon-answer') return;
    var item = pending.get(String(data.id));
    if (!item) return;
    clearTimeout(item.timer); pending.delete(String(data.id));
    item.resolve(data.cancel ? new Response('', {status: 409}) : new Response(JSON.stringify(data.value || ''), {status: 200, headers: {'Cache-Control': 'no-store'}}));
  });
})();
