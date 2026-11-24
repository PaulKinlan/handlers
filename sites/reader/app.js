// The reader's page: where files come in, and the port that goes out.
import { sites } from "/_sites.js";
import { expose, offer } from "/hawser.js";
import { Reader, LENT } from "/reader.js";

const $ = (id) => document.getElementById(id);
const reader = new Reader({
  onwrite: (info) => { render(info); log(`Charts saved ${kb(info.size)} to ${info.name}.`); },
  onrefuse: (error) => log(`Refused a write from Charts: ${error.message}`),
});
window.reader = reader;   // for the browser tests
for (const a of document.querySelectorAll("a[data-main]")) a.href = sites.main + a.getAttribute("href");

const log = (text) => {
  const li = document.createElement("li");
  li.textContent = text;
  if ($("log").querySelector(".muted")) $("log").innerHTML = "";
  $("log").prepend(li);
};

// ---- how the page is running
const standalone = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: window-controls-overlay)").matches;
$("mode").textContent = standalone ? "an installed app" : "a tab. Install it to open files from your file manager";
$("launch").textContent = "launchQueue" in window
  ? (standalone ? "yes, through launchQueue" : "this browser supports it, once the app is installed")
  : "not in this browser. Use the picker, a drop, or the sample";

// ---- a file arrives
const kb = (n) => (n < 1024 ? n + " bytes" : (n / 1024).toFixed(1) + " KB");
const VIA = { os: "the operating system (file_handlers, launchQueue)", picker: "the file picker", drop: "a drop", input: "a file input (no handle)", sample: "the sample, in this origin's private file system" };

async function show(entry) {
  try {
    reader.allowSaving(false);
    const info = await reader.open(entry);
    render(info);
    log(`Opened ${info.name} from ${VIA[entry.via]}.`);
  } catch (error) {
    log(`Could not open the file: ${error.name}. ${error.message}`);
  }
}

function render(info) {
  $("facts").hidden = false;
  $("name").textContent = info.name;
  $("size").textContent = kb(info.size);
  $("via").textContent = VIA[info.via];
  $("writable").textContent = info.writable ? "yes, the reader holds a handle" : "no, only a copy of the bytes";
  const text = reader.text();
  $("text").textContent = text.length > 6000 ? text.slice(0, 6000) + "\n…" : text;
  $("saving").checked = reader.saving;
  $("saving").disabled = !info.writable;
  $("send").disabled = false;
  document.body.dataset.file = info.name;
}

// The operating system. With launch_handler "focus-existing", opening a
// second file while the reader is open lands here again, in the same window,
// so a port already lent stays alive and the other app sees the new file.
if ("launchQueue" in window) {
  launchQueue.setConsumer(async ({ files }) => {
    if (!files?.length) return;
    if (files.length > 1) log(`The operating system sent ${files.length} files. The reader opens the first.`);
    await show({ handle: files[0], via: "os" });
  });
}

$("choose").onclick = async () => {
  if (!window.showOpenFilePicker) return $("input").click();
  try {
    const [handle] = await showOpenFilePicker({ types: [{ description: "Tables and text", accept: { "text/csv": [".csv"], "text/plain": [".txt"], "text/markdown": [".md"] } }] });
    await show({ handle, via: "picker" });
  } catch (error) {
    if (error.name !== "AbortError") log(`The picker failed: ${error.name}.`);
  }
};
$("input").onchange = () => { const file = $("input").files[0]; if (file) show({ file, via: "input" }); };

const drop = $("drop");
drop.ondragover = (event) => { event.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = async (event) => {
  event.preventDefault();
  drop.classList.remove("over");
  const item = [...event.dataTransfer.items].find((i) => i.kind === "file");
  if (!item) return;
  const handle = item.getAsFileSystemHandle ? await item.getAsFileSystemHandle() : null;
  if (handle?.kind === "file") await show({ handle, via: "drop" });
  else if (item.getAsFile()) await show({ file: item.getAsFile(), via: "input" });
};

const SAMPLE = "plant,colour,count\nfern,green,3\nforget-me-not,blue,12\nfoxglove,purple,7\nprimrose,yellow,9\n";
$("sample").onclick = async () => {
  const dir = await navigator.storage.getDirectory();
  const handle = await dir.getFileHandle("plants.csv", { create: true });
  const w = await handle.createWritable();
  await w.write(SAMPLE);
  await w.close();
  await show({ handle, via: "sample" });
};

// ---- saving
$("saving").onchange = async () => {
  const want = $("saving").checked;
  const h = reader.handle;
  if (want && h) {
    // Asking here, on this page's own click, is the only place the browser
    // allows the prompt. The other app cannot cause it.
    const state = h.requestPermission ? await h.requestPermission({ mode: "readwrite" }) : "granted";
    if (state !== "granted") { $("saving").checked = false; log("The browser did not give write access, so saving stays off."); return; }
  }
  reader.allowSaving(want);
  log(want ? "The other app may now save to this file." : "Saving is off. A write from the other app will be refused.");
};

// ---- lending
let win = null, link = null, waiting = false;
const linkState = (text, on) => { $("link").innerHTML = `<span class="jack${on ? " on" : ""}"></span>`; $("link").append(text); document.body.dataset.link = on ? "open" : "closed"; };

$("send").onclick = () => {
  link?.close();
  waiting = true;
  win = window.open(`${sites.charts}/`, "handlers-chart");
  if (!win) { waiting = false; log("The browser blocked the window. Allow pop-ups for this site and try again."); return; }
  linkState("Waiting for Charts", false);
  log("Opened Charts and waited for it to say it was ready.");
};

addEventListener("message", (event) => {
  if (event.origin !== sites.charts || event.source !== win || event.data?.chart !== "ready" || !waiting) return;
  waiting = false;
  const port = offer(win, sites.charts, { from: "Reader" });
  const opened = expose(reader.lend(), port, { only: LENT, onclose: () => {
    if (link !== opened) return;
    link = null;
    $("revoke").disabled = true;
    linkState("No port lent", false);
    log("The port is closed. Charts can no longer reach the file.");
  } });
  link = opened;
  $("revoke").disabled = false;
  linkState(`Lent to ${new URL(sites.charts).host}`, true);
  log(`Sent a port to ${new URL(sites.charts).host}. It can reach ${LENT.join(", ")}.`);
});

$("revoke").onclick = () => { link?.close(); };
