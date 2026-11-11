// Standalone probe page only. Inside ParchLock the app's own service worker loads the same relay.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
importScripts('./input-relay.js');
