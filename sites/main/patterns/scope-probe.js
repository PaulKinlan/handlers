// For the scope-extensions page: verify the live two-way handshake between
// Notes' manifest (scope_extensions) and this origin's
// /.well-known/web-app-origin-association file.

export async function run(el, sites) {
  el.insertAdjacentHTML("beforeend", `<h3>Live handshake check</h3>
    <p class="small">Fetching both sides of the agreement now: Notes' manifest and this origin's <code>/.well-known/web-app-origin-association</code>.</p>
    <ul class="checks" id="scope-probe">
      <li><span class="jack"></span>Notes manifest <code>scope_extensions</code>: <span data-r="manifest">checking…</span></li>
      <li><span class="jack"></span>Hub <code>/.well-known/web-app-origin-association</code>: <span data-r="waoa">checking…</span></li>
    </ul>`);

  const list = el.querySelector("#scope-probe");
  const show = (key, text, ok) => {
    const span = list.querySelector(`[data-r="${key}"]`);
    span.textContent = text;
    span.parentElement.querySelector(".jack").classList.toggle("on", ok);
  };

  try {
    const manifest = await (await fetch(`${sites.notes}/manifest.webmanifest`)).json();
    const ext = manifest.scope_extensions || [];
    const matches = ext.some((e) => e.type === "origin" && e.origin === location.origin);
    show("manifest", matches ? `lists ${location.origin}` : `does not list ${location.origin} (${JSON.stringify(ext)})`, matches);
  } catch (err) {
    show("manifest", `could not fetch Notes manifest: ${err.message}`, false);
  }

  try {
    const waoa = await (await fetch("/.well-known/web-app-origin-association")).json();
    const entry = waoa[sites.notes + "/"];
    show("waoa", entry ? `agrees for ${sites.notes}/ (scope "${entry.scope || "/"}")` : `no entry for ${sites.notes}/`, !!entry);
  } catch (err) {
    show("waoa", `could not fetch association file: ${err.message}`, false);
  }
}
