// The notes app. Every way a note can arrive ends in arrive(): a web+note:
// link (/?u=...), a launch with files or a URL (launchQueue), a share
// (POST to /share, answered by sw.js), or the "New note" shortcut.
import { sites } from "/_sites.js";
import { render } from "/detect.js";

const $ = (id) => document.getElementById(id);
const editor = $("editor");
let handle = null; // the file this note was opened from, if any

$("hub-link").href = sites.main;
render($("checks"), ["rph", "launchQueue", "launchParams", "picker", "standalone"]);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

function arrive(how, detail) {
  const list = $("arrivals");
  if (list.firstElementChild?.classList.contains("muted")) list.innerHTML = "";
  const li = document.createElement("li");
  li.innerHTML = `<span class="who"></span> <span></span>`;
  li.firstElementChild.textContent = how;
  li.lastElementChild.textContent = detail;
  list.prepend(li);
}

function show(text, name = "Untitled note", fileHandle = null) {
  editor.value = text;
  $("file-name").textContent = name;
  handle = fileHandle;
  $("save-state").textContent = fileHandle ? "Save writes back to this file." : "";
}

// A web+note: link. The browser put the whole link, escaped once, after u=.
export function noteFromLink(u) {
  if (!u || !u.toLowerCase().startsWith("web+note:")) return null;
  const rest = u.slice("web+note:".length).replace(/^\/\//, "");
  try { return decodeURIComponent(rest); } catch { return rest; }
}

function fromUrl(url, how) {
  const params = url.searchParams;
  if (params.has("u")) {
    const text = noteFromLink(params.get("u"));
    if (text == null) return arrive(how, "a link that was not web+note:, ignored");
    show(text);
    arrive(how, "web+note: link, " + text.length + " characters");
  } else if (params.get("new")) {
    show("");
    arrive(how, "the New note shortcut");
  } else if (params.get("via") === "server") {
    show([params.get("title"), params.get("text"), params.get("url")].filter(Boolean).join("\n"));
    arrive(how, "a share that reached the server before the service worker was running");
  }
}

// The URL this page loaded with is handled here, whether it came from a
// registered link in a tab or an app launch. In an installed app the launch
// queue also reports that same first URL, so it is skipped there; later
// launches into a reused window arrive only through the queue.
const first = location.href;
let seenFirst = false;
fromUrl(new URL(first), "page load");

if ("launchQueue" in window) {
  window.launchQueue.setConsumer(async (params) => {
    if (params.files && params.files.length) {
      const fileHandle = params.files[0];
      const file = await fileHandle.getFile();
      show(await file.text(), file.name, fileHandle);
      arrive("launchQueue", `file ${file.name}, ${file.size} bytes`);
    } else if (params.targetURL) {
      const repeat = !seenFirst && params.targetURL === first;
      seenFirst = true;
      if (!repeat) fromUrl(new URL(params.targetURL), "launchQueue");
    }
  });
}

// A share the service worker kept.
if (new URL(location.href).searchParams.get("shared") && "caches" in window) {
  const res = await (await caches.open("shares")).match("/_shared/latest");
  if (res) {
    const shared = await res.json();
    const parts = [shared.title, shared.text, shared.url, ...shared.files.map((f) => f.text)].filter(Boolean);
    show(parts.join("\n\n"), shared.files[0]?.name || "Shared note");
    arrive("share_target", `title, text and url${shared.files.length ? ` and ${shared.files.length} file(s)` : ""}`);
  }
}

$("save").onclick = async () => {
  if (!handle) return $("download").click();
  try {
    const writable = await handle.createWritable();
    await writable.write(editor.value);
    await writable.close();
    $("save-state").textContent = "Saved to " + handle.name + ".";
  } catch (err) {
    $("save-state").textContent = "Not saved: " + err.message;
  }
};

$("open").onclick = async () => {
  if (!window.showOpenFilePicker) return ($("save-state").textContent = "This browser cannot open files in place.");
  try {
    const [fileHandle] = await window.showOpenFilePicker({ types: [{ description: "Notes", accept: { "application/x-webnote": [".webnote"], "text/plain": [".txt"] } }] });
    const file = await fileHandle.getFile();
    show(await file.text(), file.name, fileHandle);
    arrive("file picker", file.name);
  } catch {}
};

$("download").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([editor.value], { type: "application/x-webnote" }));
  a.download = ($("file-name").textContent.replace(/\.webnote$/, "") || "note") + ".webnote";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// Hand the first line to the tasks app with its own scheme. If nothing handles
// web+task:, the browser does nothing, so link to the app's page as well.
$("make-task").onclick = () => {
  const line = editor.value.split("\n").find((l) => l.trim()) || "";
  location.href = "web+task:" + encodeURIComponent(line.trim());
};

$("register").onclick = () => {
  try {
    navigator.registerProtocolHandler("web+note", location.origin + "/?u=%s");
    $("register-state").textContent = "Asked the browser. If you agreed, web+note: links now open here.";
  } catch (err) {
    $("register-state").textContent = "Not registered: " + err.message;
  }
};
