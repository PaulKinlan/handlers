// For the app-migration page: writes out what each side publishes to move an
// installed app to another origin on the same site. The shapes follow the PWA
// Origin Migration explainer:
// https://github.com/WICG/manifest-incubations/blob/gh-pages/pwa-migration-explainer.md

export async function run(el, sites) {
  const current = sites.notes;
  // A sibling of the Notes origin, so the example is same-site.
  const sibling = new URL(current);
  sibling.hostname = ["notebook", ...sibling.hostname.split(".").slice(1)].join(".");

  el.insertAdjacentHTML("beforeend", `<h3>What each side would publish</h3>
    <p class="small muted">Type the origin Notes would move to. It is on <code>${current}</code> now, and the new origin has to be on the same site.</p>
    <div class="row" style="margin-top:.5rem">
      <label for="mig-host" style="margin:0">New origin</label>
      <input type="text" id="mig-host" value="${sibling.origin}" style="max-width:20rem">
    </div>
    <div style="display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));margin-top:.6rem">
      <div>
        <p class="small" style="margin-bottom:.35rem"><strong>1. In the manifest on the new origin</strong></p>
        <pre id="mig-manifest" class="small"></pre>
      </div>
      <div>
        <p class="small" style="margin-bottom:.35rem"><strong>2. On the old origin, at <code>/.well-known/web-app-origin-association</code></strong></p>
        <pre id="mig-waoa" class="small"></pre>
      </div>
    </div>`);

  const input = el.querySelector("#mig-host");
  const mOut = el.querySelector("#mig-manifest");
  const wOut = el.querySelector("#mig-waoa");

  function draw() {
    let target = input.value.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//.test(target)) target = "https://" + target;
    mOut.textContent = JSON.stringify({
      id: "/",
      start_url: "/",
      migrate_from: [{ id: current + "/", behavior: "suggest" }],
    }, null, 2);
    wOut.textContent = JSON.stringify({
      [target + "/"]: { allow_migration: true },
    }, null, 2);
  }

  input.addEventListener("input", draw);
  draw();
}
