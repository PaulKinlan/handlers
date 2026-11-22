// The service worker for /census/. It does three jobs:
//
// 1. Answers the census page's messages three ways (on a port it was given,
//    with Client.postMessage, and on a BroadcastChannel), so the page can
//    check each route from a page to its own service worker.
// 2. Reports what its global scope has, such as a launch event.
// 3. Receives a share. The manifest's share_target posts a form here. The
//    worker keeps what was shared in the Cache API and sends the window on to
//    the census page, which reads it back and lists it.

const SHARED = "integration-share";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.ping) {
    const at = Date.now();
    if (event.ports[0]) event.ports[0].postMessage({ pong: data.ping, via: "port", at });
    if (event.source && "postMessage" in event.source) event.source.postMessage({ pong: data.ping, via: "client", at });
    const channel = new BroadcastChannel("integration");
    channel.postMessage({ pong: data.ping, via: "broadcast", at });
    channel.close();
  }
  if (data.scope && event.ports[0]) {
    // A launch event in the worker was proposed alongside launch_handler.
    // List the events this scope does have, so the page can say what is there.
    const events = [];
    for (let o = self; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
      for (const key of Object.getOwnPropertyNames(o)) if (key.startsWith("on") && !events.includes(key.slice(2))) events.push(key.slice(2));
    }
    event.ports[0].postMessage({ launch: "onlaunch" in self, events: events.sort() });
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/census/share-target") return;
  event.respondWith((async () => {
    const form = await event.request.formData();
    const files = form.getAll("files").filter((f) => f instanceof File);
    const cache = await caches.open(SHARED);
    const record = {
      at: new Date().toISOString(),
      title: form.get("title") || "",
      text: form.get("text") || "",
      url: form.get("url") || "",
      files: files.map((f, i) => ({ name: f.name, type: f.type, size: f.size, key: `/census/shared/${i}` })),
    };
    await Promise.all(files.map((f, i) => cache.put(`/census/shared/${i}`, new Response(f, { headers: { "content-type": f.type || "application/octet-stream" } }))));
    await cache.put("/census/shared.json", new Response(JSON.stringify(record), { headers: { "content-type": "application/json" } }));
    return Response.redirect("/census/?via=share", 303);
  })());
});
