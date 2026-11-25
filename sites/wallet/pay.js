// The Wallet's window, which the service worker opens over the shop. It asks
// the service worker what the shop wants, shows it, and sends back the choice.
const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get("id");
const workers = navigator.serviceWorker;
$("origin").textContent = location.host;

async function send(type) {
  const registration = await workers.ready;
  (workers.controller || registration.active).postMessage({ id, type });
}

if (!id || !workers) {
  $("amount").textContent = "Open this from a shop";
  $("state").textContent = "This window is opened by the browser when a shop asks for the Wallet's payment method.";
} else {
  workers.addEventListener("message", (event) => {
    if (event.data?.type !== "details") return;
    const { shop, total } = event.data;
    $("amount").textContent = "Pay " + new Intl.NumberFormat(undefined, { style: "currency", currency: total.currency }).format(total.value);
    $("who").textContent = `${new URL(shop).host} is asking.`;
    $("approve").disabled = $("decline").disabled = false;
    document.body.dataset.ready = "true";
  });
  workers.startMessages();
  $("approve").onclick = () => { $("state").textContent = "Approved. Going back to the shop."; send("approve"); };
  $("decline").onclick = () => { $("state").textContent = "Declined. Going back to the shop."; send("decline"); };
  send("ready");
}
