// For the payment-handler page. This page is the shop: it asks the browser for
// the Wallet's payment method and shows what the Wallet sent back. The Wallet
// is on another origin, and this page loads nothing from it.

export function run(el, sites) {
  const method = sites.wallet + "/pay";
  el.insertAdjacentHTML("beforeend", `<h3>This page is the shop</h3>
    <p class="small">The button asks the browser for one payment method, <code>${method}</code>. That address is on the Wallet's origin. No money moves: the Wallet returns a made-up receipt.</p>
    <div class="row" style="margin-top:.5rem">
      <button type="button" id="pay-button">Pay £4.50 with the Wallet</button>
    </div>
    <ul class="checks" id="pay-checks" style="margin-top:.7rem">
      <li><span class="jack"></span>Can the browser find an app for that payment method? <span data-r="can">checking</span></li>
    </ul>
    <p id="pay-result" class="small" aria-live="polite"></p>`);

  const button = el.querySelector("#pay-button");
  const result = el.querySelector("#pay-result");
  const can = el.querySelector('[data-r="can"]');
  const say = (state, text) => { result.dataset.state = state; result.textContent = text; };

  if (typeof window.PaymentRequest !== "function") {
    button.disabled = true;
    can.textContent = "there is no PaymentRequest in this browser";
    return;
  }

  const request = () => new PaymentRequest(
    [{ supportedMethods: method, data: { order: "sample" } }],
    { total: { label: "A sample order", amount: { currency: "GBP", value: "4.50" } } },
  );

  request().canMakePayment().then((yes) => {
    can.textContent = yes ? "yes" : "no";
    can.parentElement.querySelector(".jack").classList.toggle("on", yes);
  }, (err) => { can.textContent = `the check failed: ${err.name}`; });

  button.addEventListener("click", async () => {
    say("waiting", "Asked the browser. The Wallet opens over this page.");
    try {
      const response = await request().show();
      say("paid", `The Wallet answered. methodName: ${response.methodName}. details: ${JSON.stringify(response.details)}`);
      // Tells the browser the shop is done, so it closes the Wallet's window.
      response.complete("success").catch(() => {});
    } catch (err) {
      const why = err.name === "AbortError" ? " The payment was declined, or the Wallet's window was closed."
        : err.name === "NotSupportedError" ? " The browser found no app for that payment method."
        : "";
      say("failed", `No payment: ${err.name}. ${err.message}${why}`);
    }
  });
}
