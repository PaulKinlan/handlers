// The chart app: it is lent a port by the reader, and that port is all it has.
import { sites } from "/_sites.js";
import { offerInstall } from "/install.js";
import { wrap, accept, closed } from "/hawser.js";
import { parse, serialize, numericColumn } from "/csv.js";

// Most of what the manifest declares only works once the app is installed.
offerInstall(document.getElementById("install"), "Charts", "Charts works in a tab. Installing gives it a window of its own.");

const $ = (id) => document.getElementById(id);
for (const a of document.querySelectorAll("a[data-main]")) a.href = sites.main + a.getAttribute("href");
for (const a of document.querySelectorAll("a[data-reader]")) a.href = sites.reader + a.getAttribute("href");
const state = (text, on) => { $("state").innerHTML = `<span class="jack${on ? " on" : ""}"></span>`; $("state").append(text); };
const result = (text, bad = false) => { $("result").textContent = text; $("result").className = "small" + (bad ? " bad" : ""); };

let remote = null, current = null, rows = null;

accept(sites.reader, async (port, { hello }) => {
  remote?.[Symbol.dispose]?.();
  remote = wrap(port);
  const mine = remote;
  document.body.dataset.link = "open";
  state(`Connected to ${hello?.from || "the reader"} on ${new URL(sites.reader).host}`, true);
  closed(mine).then(() => {
    if (remote !== mine) return;
    document.body.dataset.link = "closed";
    state("The reader took its port back. This app can no longer read or save the file.", false);
    $("save").disabled = $("add-row").disabled = true;
  });
  try {
    for await (const doc of mine.documents()) render(doc);
  } catch { /* the link closed */ }
});

if (window.opener) {
  // Say we are listening. The reader answers with a port, and only to this origin.
  opener.postMessage({ chart: "ready" }, sites.reader);
  state("Waiting for a port from the reader", false);
} else {
  $("alone").hidden = false;
}

function render(doc) {
  // The reader also sends the document again when only its saving switch
  // changed. Keep the edits in progress when the bytes are the same.
  const same = current && current.name === doc.name && current.text === doc.text;
  current = doc;
  $("doc").hidden = false;
  $("name").textContent = doc.name;
  $("meta").textContent = `${doc.text.length} characters, ${doc.saving ? "the reader allows saving" : doc.writable ? "the reader has not allowed saving" : "the reader holds no handle, so it cannot be saved"}.`;
  document.body.dataset.saving = String(doc.saving);
  if (same) return;
  $("save").disabled = false;
  const csv = doc.type === "text/csv" || doc.name.endsWith(".csv");
  $("table-wrap").hidden = $("add-row").hidden = !csv;
  $("textarea").hidden = csv;
  $("chart-panel").hidden = !csv;
  if (csv) {
    rows = parse(doc.text);
    drawTable();
  } else {
    rows = null;
    $("textarea").value = doc.text;
  }
  document.body.dataset.doc = doc.name;
  document.body.dataset.updated = String(Date.now());
}

function drawTable() {
  const table = $("table");
  table.replaceChildren();
  const width = Math.max(1, ...rows.map((r) => r.length));
  rows.forEach((row, r) => {
    const section = r === 0 ? table.createTHead() : (table.tBodies[0] || table.createTBody());
    const tr = section.insertRow();
    for (let c = 0; c < width; c++) {
      const cell = document.createElement(r === 0 ? "th" : "td");
      const input = document.createElement("input");
      input.value = row[c] ?? "";
      input.setAttribute("aria-label", r === 0 ? `Column ${c + 1} heading` : `${rows[0]?.[c] || "Column " + (c + 1)}, row ${r}`);
      input.dataset.r = r;
      input.dataset.c = c;
      input.oninput = () => { rows[r][c] = input.value; drawBars(); };
      cell.append(input);
      tr.append(cell);
    }
  });
  drawBars();
}

function drawBars() {
  const col = numericColumn(rows);
  const list = $("bars");
  list.replaceChildren();
  if (col < 0) { $("chart-title").textContent = "No column of numbers to chart"; return; }
  $("chart-title").textContent = `${rows[0][col]} by ${rows[0][0]}`;
  const data = rows.slice(1).filter((r) => r[0] || r[col]).map((r) => [r[0], Number(r[col]) || 0]);
  const max = Math.max(1, ...data.map(([, v]) => v));
  for (const [label, value] of data) {
    const li = document.createElement("li");
    li.innerHTML = `<span></span><div class="bar"></div><span></span>`;
    li.children[0].textContent = label;
    li.children[1].style.width = (value / max) * 100 + "%";
    li.children[2].textContent = value;
    list.append(li);
  }
}

$("add-row").onclick = () => {
  if (!rows) return;
  rows.push(new Array(rows[0]?.length || 1).fill(""));
  drawTable();
  $("table").querySelector("tbody tr:last-child input")?.focus();
};

$("save").onclick = async () => {
  if (!remote || !current) return;
  const text = rows ? serialize(rows) : $("textarea").value;
  result("Asking the reader to save");
  try {
    const info = await remote.write(text);
    result(`Saved. ${info.name} is now ${info.size} bytes.`);
  } catch (error) {
    result(`The reader refused: ${error.message}`, true);
  }
};
