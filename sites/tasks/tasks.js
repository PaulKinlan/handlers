// The tasks app. Tasks are kept in localStorage on this origin. They arrive
// from web+task: links, .webtasks files (one task per line), the share sheet
// (GET, so the share is just a query string) and the form.
import { sites } from "/_sites.js";
import { render } from "/detect.js";

const $ = (id) => document.getElementById(id);
const KEY = "tasks";
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem(KEY)) || []; } catch {}

$("hub-link").href = sites.main;
render($("checks"), ["rph", "launchQueue", "share", "standalone"]);
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

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch {}
  const open = tasks.filter((t) => !t.done).length;
  // Shown on the icon only when the app is installed.
  if (navigator.setAppBadge) (open ? navigator.setAppBadge(open) : navigator.clearAppBadge()).catch(() => {});
  draw();
}

function draw() {
  $("items").innerHTML = "";
  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = task.done ? "done" : "";
    const box = document.createElement("input");
    box.type = "checkbox"; box.checked = task.done; box.setAttribute("aria-label", "Done");
    box.onchange = () => { task.done = box.checked; save(); };
    const text = document.createElement("span");
    text.textContent = task.text;
    li.append(box, text);
    $("items").append(li);
  }
  if (!tasks.length) $("items").innerHTML = `<li class="muted">No tasks.</li>`;
}

function add(text, how) {
  const lines = String(text).split("\n").map((l) => l.replace(/^[-*\[\] x]+/i, "").trim()).filter(Boolean).slice(0, 50);
  for (const line of lines) tasks.push({ text: line.slice(0, 300), done: false });
  if (lines.length) arrive(how, `${lines.length} task(s)`);
  save();
}

export function taskFromLink(u) {
  if (!u || !u.toLowerCase().startsWith("web+task:")) return null;
  const rest = u.slice("web+task:".length).replace(/^\/\//, "");
  try { return decodeURIComponent(rest); } catch { return rest; }
}

function fromUrl(url, how) {
  const p = url.searchParams;
  if (p.has("u")) {
    const text = taskFromLink(p.get("u"));
    if (text) add(text, how + ", web+task: link");
  } else if (p.has("title") || p.has("text") || p.has("url")) {
    add([p.get("title"), p.get("text"), p.get("url")].filter(Boolean).join(" "), how + ", share_target (GET)");
  }
  if ([...p.keys()].length) history.replaceState(null, "", "/");
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
    if (params.files?.length) {
      for (const fileHandle of params.files) {
        const file = await fileHandle.getFile();
        add(await file.text(), "launchQueue, file " + file.name);
      }
    } else if (params.targetURL) {
      const repeat = !seenFirst && params.targetURL === first;
      seenFirst = true;
      if (!repeat) fromUrl(new URL(params.targetURL), "launchQueue");
    }
  });
}
draw();

$("add").onsubmit = (e) => { e.preventDefault(); if ($("new").value.trim()) add($("new").value, "form"); $("new").value = ""; };

$("share").onclick = async () => {
  const text = tasks.filter((t) => !t.done).map((t) => "- " + t.text).join("\n");
  if (!navigator.share) return ($("state").textContent = "navigator.share() is not available here.");
  try { await navigator.share({ title: "Tasks", text }); $("state").textContent = "Shared."; }
  catch (err) { $("state").textContent = err.name === "AbortError" ? "Share sheet closed." : "Not shared: " + err.message; }
};

$("to-note").onclick = () => {
  location.href = "web+note:" + encodeURIComponent(tasks.filter((t) => !t.done).map((t) => "- " + t.text).join("\n"));
};

$("download").onclick = () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([tasks.map((t) => t.text).join("\n")], { type: "application/x-webtasks" }));
  a.download = "tasks.webtasks";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

$("register").onclick = () => {
  try { navigator.registerProtocolHandler("web+task", location.origin + "/?u=%s"); $("state").textContent = "Asked the browser to send web+task: links here."; }
  catch (err) { $("state").textContent = "Not registered: " + err.message; }
};
