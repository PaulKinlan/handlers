// Installable apps in Chromium no longer need a service worker, but badging
// from the background and future offline work do. This one does nothing yet.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
