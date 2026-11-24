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
  { id: "dropHandle", name: "DataTransferItem.getAsFileSystemHandle()", ok: () => typeof DataTransferItem === "function" && typeof DataTransferItem.prototype.getAsFileSystemHandle === "function" },
  { id: "clipboard", name: "navigator.clipboard.write()", ok: () => typeof navigator.clipboard?.write === "function" && typeof ClipboardItem === "function" },
  { id: "clipboardCustom", name: 'ClipboardItem.supports("web …")', ok: () => typeof ClipboardItem === "function" && typeof ClipboardItem.supports === "function" && ClipboardItem.supports("web application/x-webtasks+json") },
  { id: "badge", name: "navigator.setAppBadge()", ok: () => typeof navigator.setAppBadge === "function" },
  { id: "wco", name: "navigator.windowControlsOverlay", ok: () => "windowControlsOverlay" in navigator },
  { id: "installApi", name: "navigator.install()", ok: () => typeof navigator.install === "function" },
  { id: "installPrompt", name: "beforeinstallprompt", ok: () => "onbeforeinstallprompt" in window },
  { id: "documentPip", name: "window.documentPictureInPicture", ok: () => typeof window.documentPictureInPicture?.requestWindow === "function" },
  { id: "windowManagement", name: "window.getScreenDetails()", ok: () => typeof window.getScreenDetails === "function" },
  { id: "digitalCredentials", name: "DigitalCredential API", ok: () => typeof window.DigitalCredential === "function" },
  { id: "contactPicker", name: "navigator.contacts.select()", ok: () => typeof navigator.contacts?.select === "function" },
  { id: "relatedApps", name: "navigator.getInstalledRelatedApps()", ok: () => typeof navigator.getInstalledRelatedApps === "function" },
  { id: "standalone", name: "Running as an installed app", ok: () => matchMedia("(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: tabbed), (display-mode: minimal-ui)").matches },
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
