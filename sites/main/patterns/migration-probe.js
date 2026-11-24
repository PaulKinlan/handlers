// For the app-migration page: interactive manifest + well-known generator
// showing the exact two-way handshake needed to move an installed app off its
// current origin onto a custom domain.

export async function run(el, sites) {
  const current = sites.notes;
  el.insertAdjacentHTML("beforeend", `<h3>Generate a migration handshake</h3>
    <p class="small muted">Enter a target domain to see the exact <code>migrate_from</code> and <code>/.well-known/web-app-origin-association</code> pair for moving Notes off <code>${current}</code>.</p>
    <div class="row" style="margin-top:.5rem">
      <label for="mig-host" style="margin:0">New origin</label>
      <input type="text" id="mig-host" value="https://notes.example" style="max-width:18rem">
    </div>
    <div style="display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));margin-top:.6rem">
      <div>
        <p class="small" style="margin-bottom:.35rem"><strong>1. New origin's manifest</strong></p>
        <pre id="mig-manifest" class="small"></pre>
      </div>
      <div>
        <p class="small" style="margin-bottom:.35rem"><strong>2. Old origin's <code>/.well-known/web-app-origin-association</code></strong></p>
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
      id: target + "/",
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
