// The Wallet's own page. It lists the receipts the service worker kept, and
// says whether the service worker is installed. This page does not register
// the service worker: Chrome does, from the manifest, when a shop first asks
// for the payment method.
import { sites } from "/_sites.js";
import { render } from "/detect.js";

const $ = (id) => document.getElementById(id);
for (const a of document.querySelectorAll("a[data-main]")) a.href = sites.main + a.getAttribute("href");
$("method").textContent = location.origin + "/pay";
render($("checks"), ["paymentRequest", "standalone"]);

const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/") : null;
$("worker").textContent = registration
  ? "installed"
  : "not installed yet. The browser installs it the first time a shop asks for this payment method.";

if ("caches" in window) {
  const kept = await (await caches.open("payments")).match("/_payments.json");
  const list = kept ? await kept.json() : [];
  if (list.length) {
    $("payments").innerHTML = "";
    for (const p of list) {
      const li = document.createElement("li");
      const amount = new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency }).format(p.amount);
      li.innerHTML = `<span class="who"></span> <span></span>`;
      li.firstElementChild.textContent = amount;
      li.lastElementChild.textContent = `to ${new URL(p.shop).host}, ${new Date(p.approvedAt).toLocaleString()}`;
      $("payments").append(li);
    }
  }
}
