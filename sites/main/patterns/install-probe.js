// For the web-install page: invoke navigator.install() for each demo app on
// its own origin, reporting the browser's response.

export function run(el, sites) {
  const apps = [
    ["Notes", sites.notes],
    ["Tasks", sites.tasks],
    ["Reader", sites.reader],
    ["Charts", sites.charts],
  ];
  el.insertAdjacentHTML("beforeend", `<h3>Try cross-origin navigator.install()</h3>
    <p class="small">Each button asks the browser to install a demo app from its own origin. Requires the Web Install API (<code>navigator.install</code>) in Chromium.</p>
    <div class="row" style="margin-top:.6rem">${apps.map(([name, origin]) => `<button type="button" class="quiet" data-install="${origin}">Install ${name}</button>`).join("")}</div>
    <p id="install-result" class="small muted" style="margin-top:.6rem" aria-live="polite"></p>`);

  const out = el.querySelector("#install-result");
  for (const btn of el.querySelectorAll("[data-install]")) {
    btn.addEventListener("click", async () => {
      const origin = btn.dataset.install;
      if (typeof navigator.install !== "function") {
        out.textContent = `navigator.install() is not available in this browser. Open ${origin} and use the browser's install control instead.`;
        return;
      }
      out.textContent = `Asking the browser to install ${origin}…`;
      try {
        const res = await navigator.install(origin + "/", origin + "/");
        out.textContent = `navigator.install() resolved: ${JSON.stringify(res)}.`;
      } catch (err) {
        out.textContent = `navigator.install() rejected with ${err.name}: ${err.message}`;
      }
    });
  }
}
