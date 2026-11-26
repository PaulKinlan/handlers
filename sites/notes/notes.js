// The notes app. Every way a note can arrive ends in arrive(): a web+note:
// link (/?u=...), a launch with files or a URL (launchQueue), a share
// (POST to /share, answered by sw.js), or the "New note" shortcut.
import { sites } from "/_sites.js";
import { offerInstall } from "/install.js";
import { render } from "/detect.js";
import { TASKS_MIME, decodeTasks } from "/clipboard-format.js";

// Most of what the manifest declares only works once the app is installed.
offerInstall(document.getElementById("install"), "Notes", "Installing is what puts Notes in the share sheet, in the Open with list for .webnote files, and behind web+note: links.");

const $ = (id) => document.getElementById(id);
const editor = $("editor");
let handle = null; // the file this note was opened from, if any

$("hub-link").href = sites.main;
render($("checks"), ["rph", "launchQueue", "launchParams", "picker", "dropHandle", "clipboardCustom", "standalone"]);
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

// Dragging a file onto the editor panel gives a FileSystemFileHandle in
// Chromium, so Save writes back to the dropped file instead of downloading.
const panel = $("editor-panel");
panel.addEventListener("dragover", (e) => {
  if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); panel.classList.add("drop-over"); }
});
panel.addEventListener("dragleave", (e) => {
  if (!panel.contains(e.relatedTarget)) panel.classList.remove("drop-over");
});
panel.addEventListener("drop", async (e) => {
  e.preventDefault();
  panel.classList.remove("drop-over");
  const item = [...(e.dataTransfer?.items || [])].find((i) => i.kind === "file");
  if (!item) return;
  try {
    // Must request the handle synchronously before the drop event finishes.
    const handlePromise = typeof item.getAsFileSystemHandle === "function" ? item.getAsFileSystemHandle() : null;
    const fallbackFile = item.getAsFile();
    const dropped = handlePromise ? await handlePromise : null;
    if (dropped?.kind === "file") {
      const file = await dropped.getFile();
      show(await file.text(), file.name, dropped);
      arrive("drop (handle)", `${file.name}, ${file.size} bytes, with a handle`);
    } else if (dropped?.kind === "directory") {
      $("save-state").textContent = `Dropped folder "${dropped.name}". Drop a single note file to edit it.`;
      arrive("drop (directory)", dropped.name);
    } else if (fallbackFile) {
      show(await fallbackFile.text(), fallbackFile.name, null);
      $("save-state").textContent = "Opened a copy. This browser did not give a handle, so Save downloads the note.";
      arrive("drop (copy)", `${fallbackFile.name}, ${fallbackFile.size} bytes, a copy with no handle`);
    }
  } catch (err) {
    $("save-state").textContent = "Could not open dropped file: " + err.message;
  }
});

// Read a structured task list copied by the Tasks app using a Web Custom Format,
// falling back to text/plain when the browser or clipboard only has plain text.
$("paste-structured").onclick = async () => {
  if (!navigator.clipboard?.read) return ($("save-state").textContent = "Async clipboard read() is not available here.");
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types.includes(TASKS_MIME)) {
        const raw = await (await item.getType(TASKS_MIME)).text();
        const parsed = decodeTasks(raw);
        if (parsed) {
          show(parsed.markdown, "Tasks from clipboard");
          $("save-state").textContent = `Pasted ${parsed.tasks.length} task(s) from the custom format ${TASKS_MIME}.`;
          arrive("clipboard (custom)", `${parsed.tasks.length} task(s) (${parsed.open} open, ${parsed.done} done) from ${parsed.app}`);
          return;
        }
      }
    }
    for (const item of items) {
      if (item.types.includes("text/plain")) {
        const text = await (await item.getType("text/plain")).text();
        show(text, "Plain text from clipboard");
        $("save-state").textContent = "The clipboard had no task format, so this is the text/plain version.";
        arrive("clipboard (plain)", `${text.length} characters`);
        return;
      }
    }
    $("save-state").textContent = "Nothing readable on the clipboard.";
  } catch (err) {
    $("save-state").textContent = "Could not read clipboard: " + err.message;
  }
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
