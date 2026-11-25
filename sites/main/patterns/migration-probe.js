// For the app-migration page: reads the three things that have to agree for
// the Mover app to move from /moving/ on this origin to its new origin, and
// says whether they do. The shapes follow the PWA Origin Migration explainer:
// https://github.com/WICG/manifest-incubations/blob/gh-pages/pwa-migration-explainer.md

export async function run(el, sites) {
  const oldId = location.origin + "/moving/";
  const newId = sites.moved + "/";
  el.insertAdjacentHTML("beforeend", `<h3>Do the three declarations agree?</h3>
    <p class="small">Read just now. Mover is moving from <code>${oldId}</code> to <code>${newId}</code>.</p>
    <ul class="checks" id="migration-probe">
      <li><span class="jack"></span>New manifest, <code>migrate_from</code>: <span data-r="from">checking</span></li>
      <li><span class="jack"></span>This origin's <code>/.well-known/web-app-origin-association</code>: <span data-r="waoa">checking</span></li>
      <li><span class="jack"></span>Old manifest, <code>migrate_to</code> (optional): <span data-r="to">checking</span></li>
    </ul>
    <div style="display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));margin-top:.6rem">
      <div><p class="small" style="margin-bottom:.35rem"><strong>In the manifest at the new address</strong></p><pre id="mig-new" class="small"></pre></div>
      <div><p class="small" style="margin-bottom:.35rem"><strong>On this origin, at <code>/.well-known/web-app-origin-association</code></strong></p><pre id="mig-waoa" class="small"></pre></div>
    </div>`);

  const list = el.querySelector("#migration-probe");
  const show = (key, text, ok) => {
    const span = list.querySelector(`[data-r="${key}"]`);
    span.textContent = text;
    span.parentElement.querySelector(".jack").classList.toggle("on", ok);
  };
  const read = async (url) => (await fetch(url)).json();
  const done = {};

  try {
    const manifest = await read(`${sites.moved}/manifest.webmanifest`);
    const from = (manifest.migrate_from || []).map((entry) => typeof entry === "string" ? entry : entry.id);
    done.from = from.includes(oldId);
    show("from", done.from ? `names ${oldId}` : `does not name ${oldId}`, done.from);
    el.querySelector("#mig-new").textContent = JSON.stringify({ id: manifest.id, migrate_from: manifest.migrate_from }, null, 2);
  } catch (err) {
    show("from", `could not read the new manifest: ${err.message}`, false);
  }

  try {
    const waoa = await read("/.well-known/web-app-origin-association");
    done.waoa = waoa[newId]?.allow_migration === true;
    show("waoa", done.waoa ? `allows the move to ${newId}` : `has no allow_migration for ${newId}`, done.waoa);
    el.querySelector("#mig-waoa").textContent = JSON.stringify({ [newId]: waoa[newId] }, null, 2);
  } catch (err) {
    show("waoa", `could not read the file: ${err.message}`, false);
  }

  try {
    const manifest = await read("/moving/manifest.webmanifest");
    done.to = manifest.migrate_to?.id === newId;
    show("to", done.to ? `names ${newId}` : "does not name the new address", done.to);
  } catch (err) {
    show("to", `could not read the old manifest: ${err.message}`, false);
  }

  list.dataset.done = JSON.stringify(done);
}
