// For the scheme-detection page: run the common focus/visibility/popup
// heuristics against a scheme the reader can register (web+note:) and a
// control scheme that nothing handles, and report every signal observed.

function probeScheme(uri) {
  return new Promise((resolve) => {
    const started = performance.now();
    const events = [];
    const ms = () => Math.round(performance.now() - started);

    const onBlur = () => events.push(`blur at ${ms()} ms`);
    const onVis = () => events.push(`visibilitychange (${document.visibilityState}) at ${ms()} ms`);
    addEventListener("blur", onBlur, { once: true });
    document.addEventListener("visibilitychange", onVis, { once: true });

    let win = null;
    try { win = window.open(uri, "_blank"); } catch {}

    setTimeout(() => {
      removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);

      let popup = "blocked or did not open";
      if (win) {
        if (win.closed) {
          popup = "opened and closed itself";
        } else {
          try {
            const href = win.location.href;
            popup = href === "about:blank" ? "stayed on about:blank" : `still same-origin (${href})`;
            if (href === "about:blank") win.close();
          } catch {
            popup = "navigated to another origin (cross-origin access refused)";
          }
        }
      }

      const likely = events.length > 0 || popup.startsWith("navigated");
      resolve({ uri, likely, events, popup });
    }, 1500);
  });
}

export function run(el) {
  el.insertAdjacentHTML("beforeend", `<h3>Run the heuristics here</h3>
    <p class="small">Each button tries to open a custom scheme in a new window and watches for <code>blur</code>, <code>visibilitychange</code> and whether the window leaves <code>about:blank</code> over 1.5 s. Notice how switching tabs yourself or seeing a browser confirmation dialog produces the same signals.</p>
    <div class="row" style="margin-top:.6rem">
      <button type="button" data-scheme="web+note:Heuristic%20probe">Probe web+note:</button>
      <button type="button" class="quiet" data-scheme="web+unhandledprobe:test">Probe unhandled scheme</button>
    </div>
    <ul class="checks" id="scheme-results" style="margin-top:.8rem" aria-live="polite"></ul>`);

  const list = el.querySelector("#scheme-results");
  for (const btn of el.querySelectorAll("[data-scheme]")) {
    btn.addEventListener("click", async () => {
      const uri = btn.dataset.scheme;
      const li = document.createElement("li");
      li.innerHTML = `<span class="jack"></span><code></code> — waiting 1.5 s…`;
      li.querySelector("code").textContent = uri.split(":")[0] + ":";
      list.prepend(li);
      btn.disabled = true;
      const r = await probeScheme(uri);
      btn.disabled = false;
      li.querySelector(".jack").classList.toggle("on", r.likely);
      const signals = r.events.length ? r.events.join(", ") : "no blur or visibility change";
      li.innerHTML = `<span class="jack${r.likely ? " on" : ""}"></span><code></code> — ${r.likely ? "heuristic guesses handled" : "heuristic guesses unhandled"} (${signals}; window ${r.popup}).`;
      li.querySelector("code").textContent = uri.split(":")[0] + ":";
    });
  }
}
