// How this page was opened, and the buttons that try each route by hand.
//
// The manifest sends every route to /census/ with ?via= saying which
// one it was: a web+census link (from registerProtocolHandler or from the
// manifest's protocol_handlers), a file (file_handlers), a share (share_target,
// through the service worker) or a shortcut. Launches into a window that is
// already open arrive on window.launchQueue instead, because launch_handler
// asks for focus-existing.

const VIA = {
  rph: "a web+census link, through the handler this page registered with registerProtocolHandler",
  "manifest-protocol": "a web+census link, through protocol_handlers in the manifest",
  file: "a file opened from the operating system, through file_handlers in the manifest",
  share: "a share from another app, through share_target in the manifest",
  shortcut: "one of the shortcuts in the manifest",
  start: "the installed app's own icon",
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const size = (n) => n < 1024 ? `${n} bytes` : `${(n / 1024).toFixed(1)} KB`;

// Writes one line to the log of launches.
export function logger(ol) {
  return (html, state = "works") => {
    const li = document.createElement("li");
    li.dataset.state = state;
    li.innerHTML = `<time>${new Date().toLocaleTimeString()}</time> ${html}`;
    ol.querySelector(".empty")?.remove();
    ol.append(li);
  };
}

export async function readLaunch(log) {
  const params = new URLSearchParams(location.search);
  const via = params.get("via");
  if (via && VIA[via]) {
    let line = `This page was opened by ${VIA[via]}.`;
    if (params.has("u")) line += ` The address it was given: <code>${esc(params.get("u"))}</code>.`;
    log(line);
  }
  // The opener check on /missing/ opens a web+census link in a
  // new window and waits to hear whether the handler can see who opened it.
  if (params.get("u")?.startsWith("web+census:opener-check")) {
    const channel = new BroadcastChannel("integration-opener");
    channel.postMessage({ opener: !!window.opener, referrer: document.referrer });
    channel.close();
  }
  if (via === "share") await readShare(log);
  if ("launchQueue" in window) {
    window.launchQueue.setConsumer(async (launch) => {
      const files = launch.files || [];
      const parts = [`A launch arrived on window.launchQueue for <code>${esc(launch.targetURL || "")}</code>`];
      if (files.length) {
        const read = await Promise.all(files.map(async (handle) => {
          const file = await handle.getFile();
          const head = file.type.startsWith("text/") || /\.(txt|census)$/.test(file.name) ? `: “${esc((await file.text()).slice(0, 80))}”` : "";
          return `${esc(file.name)} (${size(file.size)})${head}`;
        }));
        parts.push(`with ${files.length} file handle${files.length === 1 ? "" : "s"}: ${read.join("; ")}`);
      }
      log(parts.join(" ") + ".");
    });
  }
}

async function readShare(log) {
  const cache = await caches.open("integration-share");
  const res = await cache.match("/census/shared.json");
  if (!res) { log("The address says this was a share, and the service worker kept nothing.", "gap"); return; }
  const shared = await res.json();
  const bits = ["title", "text", "url"].filter((k) => shared[k]).map((k) => `${k} “${esc(shared[k])}”`);
  for (const f of shared.files) bits.push(`file ${esc(f.name)} (${esc(f.type || "no type")}, ${size(f.size)})`);
  log(`The service worker received a share and kept it: ${bits.join(", ") || "nothing in it"}.`);
}

// The buttons. Each returns { gap, text } like a check.
export const ACTIONS = {
  async register() {
    if (!("registerProtocolHandler" in navigator)) return { gap: true, text: "There is no registerProtocolHandler here." };
    try {
      navigator.registerProtocolHandler("web+census", location.origin + "/census/?via=rph&u=%s");
      return { gap: false, text: "I asked to handle web+census links. The browser shows its own question; answer it, then use the link below." };
    } catch (err) { return { gap: true, text: `registerProtocolHandler threw ${err.name}: ${err.message}` }; }
  },
  async pick() {
    if (!("showOpenFilePicker" in window)) return { gap: true, text: "There is no showOpenFilePicker here." };
    try {
      const [handle] = await window.showOpenFilePicker();
      const file = await handle.getFile();
      return { gap: false, text: `The person picked ${file.name} (${size(file.size)}), and this page now holds a handle to it that can be written to after asking.` };
    } catch (err) { return { gap: null, text: `No file: ${err.name}.` }; }
  },
  async share() {
    if (!("share" in navigator)) return { gap: true, text: "There is no navigator.share here." };
    const file = new File([`Shared from the integration census at ${new Date().toISOString()}\n`], "census.txt", { type: "text/plain" });
    const data = { title: "Integration census", text: "A file from the census page", url: location.origin + "/census/" };
    if (navigator.canShare?.({ files: [file] })) data.files = [file];
    try {
      const result = await navigator.share(data);
      return { gap: false, text: `The share finished. navigator.share resolved with ${result === undefined ? "undefined: nothing says which app received it or what it did" : JSON.stringify(result)}.` };
    } catch (err) { return { gap: null, text: `The share did not finish: ${err.name}.` }; }
  },
  async install() {
    if ("install" in navigator) {
      try {
        const result = await navigator.install();
        return { gap: false, text: `navigator.install resolved with ${JSON.stringify(result)}.` };
      } catch (err) { return { gap: null, text: `navigator.install threw ${err.name}: ${err.message}` }; }
    }
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice;
      deferred = null;
      return { gap: false, text: `The browser's install question was shown and the answer was ${choice.outcome}.` };
    }
    return { gap: true, text: "This browser has not offered to install the page. Look for an install control in the address bar or the browser's menu." };
  },
  // Opens a web+census link in a new window and waits for the handler page
  // to say whether it can see this window.
  async opener() {
    const channel = new BroadcastChannel("integration-opener");
    const heard = new Promise((r) => { channel.onmessage = (e) => r(e.data); });
    const win = window.open("web+census:opener-check-" + Date.now());
    const got = await Promise.race([heard, new Promise((r) => setTimeout(() => r(null), 8000))]);
    channel.close();
    try { win?.close(); } catch {}
    if (!got) return { gap: null, text: "No handler page answered in 8 seconds. Register this page as the web+census handler on /census/ first." };
    return got.opener
      ? { gap: false, text: `The handler page opened and window.opener was set, so it could post a message back to this window. document.referrer was ${got.referrer ? `“${esc(got.referrer)}”` : "empty"}.` }
      : { gap: true, text: `The handler page opened with no window.opener, so it has no way to answer this window. document.referrer was ${got.referrer ? `“${esc(got.referrer)}”` : "empty"}.` };
  },
};

let deferred = null;
addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferred = event; });
