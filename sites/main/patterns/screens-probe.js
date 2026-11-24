// For the window-management page: enumerate displays via getScreenDetails()
// and optionally open Reader and Charts tiled side-by-side.

export function run(el, sites) {
  el.insertAdjacentHTML("beforeend", `<h3>Inspect your displays</h3>
    <p class="small">Asking for screen details requires a click and permission. Once granted, the page sees every monitor's bounds and can place windows side-by-side.</p>
    <div class="row" style="margin-top:.6rem">
      <button type="button" id="wm-check">List screens</button>
      <button type="button" id="wm-tile" class="quiet" disabled>Open Reader &amp; Charts side-by-side</button>
    </div>
    <ul class="checks" id="wm-list" style="margin-top:.7rem" aria-live="polite"></ul>`);

  const list = el.querySelector("#wm-list");
  const tile = el.querySelector("#wm-tile");
  let details = null;

  el.querySelector("#wm-check").addEventListener("click", async () => {
    if (typeof window.getScreenDetails !== "function") {
      list.innerHTML = `<li><span class="jack"></span><code>window.getScreenDetails()</code> is not available in this browser.</li>`;
      return;
    }
    try {
      details = await window.getScreenDetails();
      list.innerHTML = details.screens.map((s, i) => `<li><span class="jack on"></span>Screen ${i + 1}${s.label ? ` (${s.label})` : ""}: ${s.availWidth}×${s.availHeight} at (${s.availLeft}, ${s.availTop})${s.isPrimary ? " — primary" : ""}</li>`).join("");
      tile.disabled = false;
    } catch (err) {
      list.innerHTML = `<li><span class="jack"></span>Permission refused or failed: ${err.name} (${err.message})</li>`;
    }
  });

  tile.addEventListener("click", () => {
    const s = details?.currentScreen || details?.screens?.[0];
    if (!s) return;
    const half = Math.floor(s.availWidth / 2);
    window.open(sites.reader + "/", "wm-reader", `left=${s.availLeft},top=${s.availTop},width=${half},height=${s.availHeight}`);
    window.open(sites.charts + "/", "wm-charts", `left=${s.availLeft + half},top=${s.availTop},width=${half},height=${s.availHeight}`);
  });
}
