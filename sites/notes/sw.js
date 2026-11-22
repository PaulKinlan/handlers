// The notes app's service worker. It exists for one job: answering the POST
// that the system share sheet sends to /share. It keeps what was shared in a
// cache, then sends the window to the app, which reads it back.
const SHARED = "/_shared/latest";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share") return;
  event.respondWith((async () => {
    const form = await event.request.formData();
    const files = [];
    for (const file of form.getAll("files")) {
      if (typeof file === "string") continue;
      // Only text is kept. A share can carry large files; this demo needs none.
      files.push({ name: file.name, type: file.type, size: file.size, text: file.size < 200_000 ? await file.text() : "" });
    }
    const shared = { title: form.get("title") || "", text: form.get("text") || "", url: form.get("url") || "", files, at: Date.now() };
    const cache = await caches.open("shares");
    await cache.put(SHARED, new Response(JSON.stringify(shared), { headers: { "content-type": "application/json" } }));
    return Response.redirect("/?shared=1", 303);
  })());
});
