// What this browser offers for each integration, checked in the page that
// asks. None of these checks says whether the person has installed an app or
// registered a handler: no API reports that.
export const probes = [
  { id: "rph", name: "navigator.registerProtocolHandler()", ok: () => typeof navigator.registerProtocolHandler === "function" },
  { id: "launchQueue", name: "window.launchQueue", ok: () => "launchQueue" in window },
  { id: "launchParams", name: "LaunchParams.files", ok: () => "LaunchParams" in window && "files" in LaunchParams.prototype },
  { id: "share", name: "navigator.share()", ok: () => typeof navigator.share === "function" },
  { id: "shareFiles", name: "navigator.canShare({ files })", ok: () => typeof navigator.canShare === "function" && navigator.canShare({ files: [new File(["x"], "x.txt", { type: "text/plain" })] }) },
  { id: "picker", name: "window.showOpenFilePicker()", ok: () => typeof window.showOpenFilePicker === "function" },
  { id: "standalone", name: "Running as an installed app", ok: () => matchMedia("(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: minimal-ui)").matches },
];

export function check(ids) {
  return probes.filter((p) => !ids || ids.includes(p.id)).map((p) => {
    let ok = false;
    try { ok = !!p.ok(); } catch {}
    return { ...p, ok };
  });
}

// A small list of what is and is not available, for the top of a demo.
export function render(el, ids) {
  el.innerHTML = check(ids).map((p) => `<li><span class="jack${p.ok ? " on" : ""}"></span><code>${p.name}</code> ${p.ok ? "is available" : "is not available here"}</li>`).join("");
}
