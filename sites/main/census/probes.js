// The checks behind /census/ and /missing/. Each one tries an
// integration surface in the browser that is reading the page and says what
// happened, in the same shape as /missing/probes.js:
//
//   { gap: true }   the thing is missing or does not work here
//   { gap: false }  this browser has it, or the check passed
//   { gap: null }   the check could not be run here
//
// Nothing here asks the person for anything. Checks that would show a prompt
// (registering a handler, sharing, installing) are on buttons, in ACTIONS.

const { sites } = await import("/_sites.js");
const OTHER = sites.notes;
export const otherHost = new URL(OTHER).host;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const has = (object, name) => !!object && name in object;
const fn = (object, name) => !!object && typeof object[name] === "function";
const list = (names) => names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names.at(-1) : names[0] || "nothing";

// The service worker for /census/, registered once and shared by the checks.
let worker;
const sw = () => worker ||= (async () => {
  if (!("serviceWorker" in navigator)) throw Object.assign(new Error("there is no navigator.serviceWorker"), { name: "Missing" });
  await navigator.serviceWorker.register("/census/sw.js", { scope: "/census/" });
  const reg = await Promise.race([navigator.serviceWorker.ready, wait(5000).then(() => null)]);
  if (!reg?.active) throw new Error("the service worker did not start in 5 seconds");
  return reg.active;
})();

// One ping, answered three ways. Each route resolves with the time it took or null.
let pinged;
const ping = () => pinged ||= (async () => {
  const active = await sw();
  const id = Math.random().toString(36).slice(2);
  const started = performance.now();
  const took = () => Math.round(performance.now() - started);
  const { port1, port2 } = new MessageChannel();
  const routes = {
    port: new Promise((r) => { port1.onmessage = (e) => e.data?.pong === id && r(took()); }),
    client: new Promise((r) => navigator.serviceWorker.addEventListener("message", function on(e) { if (e.data?.pong === id) { navigator.serviceWorker.removeEventListener("message", on); r(took()); } })),
    broadcast: new Promise((r) => { const c = new BroadcastChannel("integration"); c.onmessage = (e) => { if (e.data?.pong === id) { c.close(); r(took()); } }; }),
  };
  navigator.serviceWorker.startMessages?.();
  active.postMessage({ ping: id }, [port2]);
  const out = {};
  for (const [k, p] of Object.entries(routes)) out[k] = await Promise.race([p, wait(3000).then(() => null)]);
  port1.close();
  return out;
})();

const route = (key, what) => async () => {
  const ms = (await ping())[key];
  return ms === null ? { gap: true, text: `I sent my service worker a message and asked it to answer ${what}. Nothing came back in 3 seconds.` } : { gap: false, text: `I sent my service worker a message and it answered ${what}, ${ms} ms later.` };
};

// How the page is being shown: in a tab, or as an installed app.
export const displayMode = () => ["window-controls-overlay", "tabbed", "fullscreen", "standalone", "minimal-ui", "picture-in-picture", "browser"].find((m) => matchMedia(`(display-mode: ${m})`).matches) || "unknown";
const inApp = () => displayMode() !== "browser" && displayMode() !== "unknown";
const appNote = () => inApp() ? "" : " Most of this only does anything once the page is installed as an app, and it is open in a tab now.";

export const PROBES = {
  // Links with a scheme of their own.
  async rph() {
    if (!fn(navigator, "registerProtocolHandler")) return { gap: true, text: "navigator.registerProtocolHandler is not there, so a page in this browser cannot ask to handle web+ links." };
    return { gap: false, text: "navigator.registerProtocolHandler is there. A page can ask to handle a web+ scheme or one of the safelisted schemes such as mailto. The browser asks the person before it takes effect." };
  },
  async "rph-rules"() {
    if (!fn(navigator, "registerProtocolHandler")) return { gap: null, text: "There is no registerProtocolHandler to check." };
    const attempt = (scheme, url) => { try { navigator.registerProtocolHandler(scheme, url); return "no error"; } catch (err) { return err.name; } };
    const scheme = attempt("notsafelisted", location.origin + "/census/?u=%s");
    const origin = attempt("web+census", OTHER + "/census/?u=%s");
    const ok = scheme === "SecurityError" && origin === "SecurityError";
    return { gap: !ok, text: `A scheme that is neither web+ nor safelisted threw ${scheme}. A handler address on ${otherHost} threw ${origin}. ${ok ? "Both are refused, as the HTML Standard says, so a page can only name itself as the handler." : "The HTML Standard says both should throw SecurityError."}` };
  },
  async "rph-unregister"() {
    return fn(navigator, "unregisterProtocolHandler")
      ? { gap: false, text: "navigator.unregisterProtocolHandler is there, so a page can remove a handler it added." }
      : { gap: true, text: "navigator.unregisterProtocolHandler is not there. A page can add itself as a handler and cannot take itself off again. Only the person can, in the browser's settings." };
  },
  async "rph-query"() {
    return fn(navigator, "isProtocolHandlerRegistered")
      ? { gap: false, text: "navigator.isProtocolHandlerRegistered is there, so a page can ask whether a scheme has a handler." }
      : { gap: true, text: "There is no navigator.isProtocolHandlerRegistered, or anything else, that tells a page whether a scheme has a handler. A link to web+census: either opens something or does nothing, and the page that has the link cannot tell which." };
  },

  // The manifest.
  async manifest() {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return { gap: null, text: "This page has no manifest link." };
    try {
      const m = await (await fetch(link.href)).json();
      const keys = ["protocol_handlers", "file_handlers", "launch_handler", "share_target", "shortcuts"].filter((k) => k in m);
      return { gap: false, text: `This page links a manifest that declares ${list(keys)}. The browser reads it when the page is installed.` };
    } catch (err) { return { gap: null, text: `The manifest could not be read: ${err.message}.` }; }
  },
  async "manifest-read"() {
    // Everything a page can call that says anything about its own install.
    const found = [];
    if (fn(navigator, "getInstalledRelatedApps")) found.push("navigator.getInstalledRelatedApps (which says whether an app is installed, not what it handles)");
    if (fn(navigator, "isProtocolHandlerRegistered")) found.push("navigator.isProtocolHandlerRegistered");
    found.push("the display-mode media query (which says how this page is shown)");
    return { gap: true, text: `This page declares four kinds of handler in its manifest. No script API reports which of them the browser accepted, or whether the person turned any off. What a page can call: ${list(found)}.` };
  },
  async display() {
    const mode = displayMode();
    return { gap: false, text: `The display-mode media query says this page is shown as "${mode}".${mode === "browser" ? " That is an ordinary tab." : " That is an installed app's window."}` };
  },
  async "install-prompt"() {
    return "onbeforeinstallprompt" in window
      ? { gap: false, text: "The beforeinstallprompt event is there, so a page can keep the browser's install offer and show it from a button of its own. It is not in any standard." }
      : { gap: true, text: "There is no beforeinstallprompt event, so a page cannot offer to install itself. The person has to find the browser's own install control." };
  },
  async "install-api"() {
    return fn(navigator, "install")
      ? { gap: false, text: "navigator.install is there, so a page can ask the browser to install a web app, including one on another origin." }
      : { gap: true, text: "There is no navigator.install, so a page cannot ask the browser to install a web app from a button." };
  },
  async "related-apps"() {
    if (!fn(navigator, "getInstalledRelatedApps")) return { gap: true, text: "There is no navigator.getInstalledRelatedApps, so a page cannot ask whether its own app is installed." };
    try {
      const apps = await navigator.getInstalledRelatedApps();
      return { gap: false, text: `navigator.getInstalledRelatedApps is there and returned ${apps.length} app${apps.length === 1 ? "" : "s"}. It only lists apps named in the manifest's related_applications, and this manifest names none.` };
    } catch (err) { return { gap: false, text: `navigator.getInstalledRelatedApps is there. Calling it threw ${err.name}.` }; }
  },

  // Files.
  async "launch-queue"() {
    if (!has(window, "launchQueue")) return { gap: true, text: `There is no window.launchQueue, so a page cannot receive files or launches from file_handlers or launch_handler.${appNote()}` };
    const members = typeof LaunchParams === "function" ? Object.getOwnPropertyNames(LaunchParams.prototype).filter((k) => k !== "constructor") : [];
    return { gap: false, text: `window.launchQueue is there. Each launch arrives as a LaunchParams with ${list(members)}.${appNote()}` };
  },
  async "file-picker"() {
    return fn(window, "showOpenFilePicker")
      ? { gap: false, text: "window.showOpenFilePicker is there, so a page can ask the person for a file and keep a handle to write back to it." }
      : { gap: true, text: "There is no window.showOpenFilePicker. A page can read a file the person picks with an input element, and cannot write back to it." };
  },

  // Sharing.
  async share() {
    return fn(navigator, "share")
      ? { gap: false, text: "navigator.share is there, so a page can hand text, a link or files to another app the person picks." }
      : { gap: true, text: "There is no navigator.share, so a page cannot hand anything to another app through the system share sheet." };
  },
  async "share-files"() {
    if (!fn(navigator, "canShare")) return { gap: true, text: "There is no navigator.canShare, so a page cannot check whether a file can be shared." };
    const file = new File(["census"], "census.txt", { type: "text/plain" });
    const ok = navigator.canShare({ files: [file] });
    return { gap: !ok, text: `navigator.canShare says a text file ${ok ? "can" : "cannot"} be shared here.` };
  },
  async "share-target"() {
    return { gap: true, text: `There is no script API for share_target. A page cannot ask whether it is listed in the share sheet, and the app that shares cannot see where it went.${appNote()}` };
  },

  // The app's window.
  async badge() {
    return fn(navigator, "setAppBadge")
      ? { gap: false, text: "navigator.setAppBadge is there, so an installed app can put a count or a dot on its icon." }
      : { gap: true, text: "There is no navigator.setAppBadge, so an installed app cannot mark its icon." };
  },
  async wco() {
    return has(navigator, "windowControlsOverlay")
      ? { gap: false, text: `navigator.windowControlsOverlay is there. The title bar area is ${navigator.windowControlsOverlay.visible ? "given to the page now" : "not given to the page now"}.` }
      : { gap: true, text: "There is no navigator.windowControlsOverlay, so an installed app cannot draw into its title bar." };
  },

  // Service worker messaging.
  "sw-port": route("port", "on a MessagePort I gave it"),
  "sw-client": route("client", "with client.postMessage"),
  "sw-broadcast": route("broadcast", "on a BroadcastChannel"),
  async "sw-other-origin"() {
    if (!("serviceWorker" in navigator)) return { gap: null, text: "There is no navigator.serviceWorker here." };
    try {
      const reg = await navigator.serviceWorker.getRegistration(OTHER + "/");
      return { gap: false, text: `getRegistration for ${otherHost} returned ${reg ? "a registration" : "nothing, without an error"}.` };
    } catch (err) {
      return { gap: true, text: `I asked for the service worker of ${otherHost} with getRegistration and it threw ${err.name}. A page can only reach the service workers of its own origin. Reaching another origin's takes a frame from that origin.` };
    }
  },
  async "sw-launch"() {
    const active = await sw();
    const { port1, port2 } = new MessageChannel();
    const got = new Promise((r) => { port1.onmessage = (e) => r(e.data); });
    active.postMessage({ scope: true }, [port2]);
    const scope = await Promise.race([got, wait(3000).then(() => null)]);
    port1.close();
    if (!scope) return { gap: null, text: "The service worker did not answer in 3 seconds." };
    return scope.launch
      ? { gap: false, text: "The service worker has an onlaunch handler, so a launch could be dealt with without opening a window." }
      : { gap: true, text: `The service worker has no launch event. A link, a file or a share sent to the app always opens a window, even when there is nothing to show. The events it does have: ${list(scope.events)}.` };
  },
  async "launch-reply"() {
    if (typeof LaunchParams !== "function") return { gap: null, text: "There is no LaunchParams in this browser to look at." };
    const members = Object.getOwnPropertyNames(LaunchParams.prototype).filter((k) => k !== "constructor");
    const back = members.filter((k) => !["targetURL", "files"].includes(k));
    return back.length
      ? { gap: false, text: `LaunchParams has ${list(members)}. Check whether ${list(back)} can answer the app that started the launch.` }
      : { gap: true, text: `LaunchParams has ${list(members)}. Nothing on it leads back to the app or page that started the launch, so the app that is opened cannot answer.` };
  },
};

// Fill every element that names a check. An element with data-short gets
// Yes or No, and the whole sentence as its title.
export async function runAll(root = document) {
  const targets = [...root.querySelectorAll("[data-probe]")].filter((el) => !el.dataset.manual);
  const cache = new Map();
  await Promise.all(targets.map(async (el) => {
    const id = el.dataset.probe;
    if (!PROBES[id]) return;
    if (!cache.has(id)) cache.set(id, PROBES[id]().catch((err) => ({ gap: null, text: `The check could not run: ${err.message || err}.` })));
    show(el, await cache.get(id));
  }));
  return Object.fromEntries(await Promise.all([...cache].map(async ([id, p]) => [id, await p])));
}

export function show(el, result) {
  el.dataset.state = result.gap === true ? "gap" : result.gap === false ? "works" : "unknown";
  const short = el.dataset.short !== undefined;
  el.textContent = short ? (result.gap === true ? "No" : result.gap === false ? "Yes" : "Could not check") : result.text;
  if (short) el.title = result.text;
}

// A sentence for the tally line at the top of a page.
export function tally(el) {
  const seen = new Map();
  for (const node of document.querySelectorAll("[data-probe][data-state]")) seen.set(node.dataset.probe, node.dataset.state);
  const states = [...seen.values()];
  const n = (s) => states.filter((x) => x === s).length;
  el.textContent = `This page ran ${states.length} checks in your browser. ${n("works")} found the thing there and working. ${n("gap")} found it missing or refused.${n("unknown") ? ` ${n("unknown")} could not be run here.` : ""}`;
}
