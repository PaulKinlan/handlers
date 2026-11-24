// For the related-apps page: call navigator.getInstalledRelatedApps() live and
// inspect Notes' self-declared related_applications entry.

export async function run(el, sites) {
  el.insertAdjacentHTML("beforeend", `<h3>Check getInstalledRelatedApps() here</h3>
    <ul class="checks" id="related-probe">
      <li><span class="jack"></span>This origin's <code>getInstalledRelatedApps()</code>: <span data-r="call">checking…</span></li>
      <li><span class="jack"></span>Notes manifest <code>related_applications</code>: <span data-r="notes">checking…</span></li>
    </ul>`);

  const list = el.querySelector("#related-probe");
  const show = (key, text, ok) => {
    const span = list.querySelector(`[data-r="${key}"]`);
    span.textContent = text;
    span.parentElement.querySelector(".jack").classList.toggle("on", ok);
  };

  if (typeof navigator.getInstalledRelatedApps !== "function") {
    show("call", "API is not available in this browser", false);
  } else {
    try {
      const apps = await navigator.getInstalledRelatedApps();
      show("call", apps.length ? `found ${apps.length}: ${JSON.stringify(apps)}` : "returned 0 apps (this hub page has no manifest related_applications)", true);
    } catch (err) {
      show("call", `threw ${err.name}: ${err.message}`, false);
    }
  }

  try {
    const m = await (await fetch(`${sites.notes}/manifest.webmanifest`)).json();
    const rel = m.related_applications || [];
    const ok = rel.some((r) => r.platform === "webapp" && r.url === `${sites.notes}/manifest.webmanifest`);
    show("notes", ok ? `declares self webapp (${sites.notes}/manifest.webmanifest)` : "none declared", ok);
  } catch (err) {
    show("notes", `could not inspect Notes manifest: ${err.message}`, false);
  }
}
