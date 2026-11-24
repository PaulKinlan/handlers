// For the scheme-detection page: try the usual focus, visibility and popup
// heuristics against a scheme the reader can register (web+note:) and against
// one that nothing handles, and list every signal seen.

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

      let popup = "was blocked or did not open";
      let left = false;
      if (win) {
        if (win.closed) {
          popup = "opened and closed";
        } else {
          try {
            const href = win.location.href;
            popup = href === "about:blank" ? "stayed on about:blank" : `is still on this origin (${href})`;
            if (href === "about:blank") win.close();
          } catch {
            popup = "went to another origin";
            left = true;
          }
        }
      }

      resolve({ uri, likely: events.length > 0 || left, events, popup });
    }, 1500);
  });
}

export function run(el) {
  el.insertAdjacentHTML("beforeend", `<h3>Try the heuristics</h3>
    <p class="small">Each button opens a link with a custom scheme in a new window, then watches for 1.5 seconds: did this page lose focus, did it become hidden, did the new window leave <code>about:blank</code>. Switching tabs yourself, or a prompt from the browser, gives the same signals.</p>
    <div class="row" style="margin-top:.6rem">
      <button type="button" data-scheme="web+note:Heuristic%20probe">Try web+note:</button>
      <button type="button" class="quiet" data-scheme="web+unhandledprobe:test">Try a scheme nothing handles</button>
    </div>
    <ul class="checks" id="scheme-results" style="margin-top:.8rem" aria-live="polite"></ul>`);

  const list = el.querySelector("#scheme-results");
  for (const btn of el.querySelectorAll("[data-scheme]")) {
    btn.addEventListener("click", async () => {
      const uri = btn.dataset.scheme;
      const scheme = uri.split(":")[0] + ":";
      const li = document.createElement("li");
      li.innerHTML = `<span class="jack"></span><code></code>: waiting 1.5 s`;
      li.querySelector("code").textContent = scheme;
      list.prepend(li);
      btn.disabled = true;
      const r = await probeScheme(uri);
      btn.disabled = false;
      const signals = r.events.length ? r.events.join(", ") : "no blur or visibility change";
      li.innerHTML = `<span class="jack${r.likely ? " on" : ""}"></span><code></code>: ${r.likely ? "the guess is that something handled it" : "the guess is that nothing handled it"} (${signals}; the new window ${r.popup}).`;
      li.querySelector("code").textContent = scheme;
    });
  }
}
