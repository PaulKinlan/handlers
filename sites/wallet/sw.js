// The Wallet's service worker.
//
// The Wallet's pages never register it. Chrome installs it from the
// "serviceworker" member of the manifest the first time a shop asks for this
// payment method. It then receives the payment request, opens the Wallet's
// window over the shop, and answers the shop when the person approves or
// declines.

const METHOD = new URL("/pay", self.location).href;
const pending = new Map();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("paymentrequest", (event) => {
  const id = crypto.randomUUID();
  const { promise, resolve, reject } = Promise.withResolvers();
  pending.set(id, { event, resolve, reject });
  event.respondWith(promise);
  event.openWindow(`/pay.html?id=${id}`).then((client) => {
    if (client) return;
    pending.delete(id);
    reject(new DOMException("The Wallet's window did not open", "AbortError"));
  }, (error) => {
    pending.delete(id);
    reject(error);
  });
});

// The Wallet's window says it is ready, then says what the person chose.
self.addEventListener("message", (event) => {
  const { id, type } = event.data || {};
  const request = pending.get(id);
  if (!request) return;
  const { event: payment, resolve, reject } = request;
  if (type === "ready") {
    // Everything here came from the shop. A real wallet treats it as untrusted.
    event.source.postMessage({ type: "details", shop: payment.topOrigin, total: payment.total });
  } else if (type === "approve") {
    pending.delete(id);
    const receipt = { receipt: id, shop: payment.topOrigin, amount: payment.total.value, currency: payment.total.currency, approvedAt: new Date().toISOString() };
    event.waitUntil(record(receipt));
    resolve({ methodName: METHOD, details: receipt });
  } else if (type === "decline") {
    pending.delete(id);
    reject(new DOMException("Declined in the Wallet", "AbortError"));
  }
});

// Keeps the last few receipts, so the Wallet's own page can list them.
async function record(receipt) {
  const cache = await caches.open("payments");
  const kept = await cache.match("/_payments.json");
  const list = kept ? await kept.json() : [];
  list.unshift(receipt);
  await cache.put("/_payments.json", new Response(JSON.stringify(list.slice(0, 20)), { headers: { "content-type": "application/json" } }));
}
