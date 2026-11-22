// Unit tests for the file handoff demo: the reader's lent API over a Hawser
// link, and the chart app's CSV code. No browser:
//   node --test test/files.unit.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expose, wrap, closed } from "../sites/shared/hawser.js";
import { Reader, LENT, guessType } from "../sites/reader/reader.js";
import { parse, serialize, numericColumn } from "../sites/charts/csv.js";

// A stand-in for FileSystemFileHandle: getFile(), createWritable(), queryPermission().
function fakeHandle(name, text, permission = "granted") {
  const h = {
    name, text, permission, writesSeen: 0,
    async getFile() { return new File([h.text], name, { type: guessType(name), lastModified: 1 }); },
    async queryPermission() { return h.permission; },
    async createWritable() {
      let next = "";
      return { async write(t) { next += t; }, async close() { h.text = next; h.writesSeen++; } };
    },
  };
  return h;
}

const open = new Set();
// A remote call is a thenable, not a Promise; assert.rejects wants a Promise.
const settle = async (chain) => await chain;
function lent(reader) {
  const { port1, port2 } = new MessageChannel();
  open.add(port1); open.add(port2);
  const handle = expose(reader.lend(), port2, { only: LENT });
  return { remote: wrap(port1), handle };
}
test.afterEach(() => { for (const p of open) p.close(); open.clear(); });

test("describe and text cross the link", async () => {
  const reader = new Reader();
  await reader.open({ handle: fakeHandle("plants.csv", "name,count\nfern,3\n"), via: "os" });
  const { remote } = lent(reader);
  const info = await remote.describe();
  assert.equal(info.name, "plants.csv");
  assert.equal(info.type, "text/csv");
  assert.equal(info.via, "os");
  assert.equal(info.writable, true);
  assert.equal(info.saving, false);
  assert.equal(await remote.text(), "name,count\nfern,3\n");
});

test("write is refused until the reader allows saving", async () => {
  const reader = new Reader();
  const file = fakeHandle("a.csv", "x\n");
  await reader.open({ handle: file, via: "picker" });
  const { remote } = lent(reader);
  await assert.rejects(settle(remote.write("y\n")), (e) => e.name === "NotAllowedError" && /not allowed saving/.test(e.message));
  assert.equal(file.text, "x\n");
  reader.allowSaving(true);
  const after = await remote.write("y\n");
  assert.equal(file.text, "y\n");
  assert.equal(after.size, 2);
  assert.equal(await remote.text(), "y\n");
  assert.equal(reader.writes, 1);
});

test("write is refused without a handle, or without browser permission", async () => {
  const reader = new Reader();
  reader.allowSaving(true);
  await reader.open({ file: new File(["x"], "plain.txt"), via: "input" });
  const { remote } = lent(reader);
  await assert.rejects(settle(remote.write("y")), (e) => e.name === "NotAllowedError" && /without a handle/.test(e.message));
  const denied = fakeHandle("b.txt", "x", "prompt");
  await reader.open({ handle: denied, via: "os" });
  await assert.rejects(settle(remote.write("y")), (e) => e.name === "NotAllowedError" && /permission/.test(e.message));
  assert.equal(denied.text, "x");
});

test("write checks its argument", async () => {
  const reader = new Reader();
  reader.allowSaving(true);
  await reader.open({ handle: fakeHandle("c.txt", "x"), via: "os" });
  const { remote } = lent(reader);
  await assert.rejects(settle(remote.write(42)), (e) => e.name === "TypeError");
  await assert.rejects(settle(remote.write("z".repeat(1_000_001))), (e) => e.name === "RangeError");
});

test("only the four lent names are reachable", async () => {
  const reader = new Reader();
  await reader.open({ handle: fakeHandle("d.txt", "x"), via: "os" });
  const { remote } = lent(reader);
  await assert.rejects(settle(remote.allowSaving(true)));
  await assert.rejects(settle(remote.describe.constructor("return 1")));
  assert.equal(reader.saving, false);
});

test("documents() follows each file the operating system hands the reader", async () => {
  const reader = new Reader();
  await reader.open({ handle: fakeHandle("first.csv", "a\n"), via: "os" });
  const { remote } = lent(reader);
  const seen = [];
  const done = (async () => { for await (const doc of remote.documents()) { seen.push(doc.name + ":" + doc.text.trim()); if (seen.length === 2) break; } })();
  await new Promise((r) => setTimeout(r, 30));
  await reader.open({ handle: fakeHandle("second.csv", "b\n"), via: "os" });
  await done;
  assert.deepEqual(seen, ["first.csv:a", "second.csv:b"]);
});

test("closing the link ends the other side's access", async () => {
  const reader = new Reader();
  await reader.open({ handle: fakeHandle("e.txt", "x"), via: "os" });
  const { remote, handle } = lent(reader);
  assert.equal(await remote.text(), "x");
  handle.close();
  await closed(remote);
  await assert.rejects(settle(remote.text()));
});

test("csv: quotes, commas, newlines and CRLF survive a round trip", () => {
  const rows = [["name", "note"], ["fern", 'says "hi", twice'], ["moss", "two\nlines"], ["ivy", " padded "]];
  const text = serialize(rows);
  assert.deepEqual(parse(text), rows);
  assert.deepEqual(parse("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parse("a,b\n1,"), [["a", "b"], ["1", ""]]);
  assert.deepEqual(parse(""), []);
});

test("csv: finds the first numeric column after the labels", () => {
  assert.equal(numericColumn(parse("plant,colour,count\nfern,green,3\nmoss,green,12\n")), 2);
  assert.equal(numericColumn(parse("a,b\nx,y\n")), -1);
  assert.equal(numericColumn([["only header"]]), -1);
});

test("manifests declare file handling and launch handling", async () => {
  const reader = JSON.parse(await readFile(new URL("../sites/reader/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(reader.scope, "/");
  assert.equal(reader.file_handlers[0].action, "/");
  assert.deepEqual(reader.file_handlers[0].accept["text/csv"], [".csv"]);
  assert.deepEqual([reader.launch_handler.client_mode].flat()[0], "focus-existing");
  const chart = JSON.parse(await readFile(new URL("../sites/charts/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(chart.scope, "/");
  for (const m of [reader, chart]) {
    assert.ok(m.id && m.start_url.startsWith(m.scope));
    assert.ok(m.icons.some((i) => i.sizes === "512x512") && m.icons.some((i) => i.sizes === "192x192"));
  }
});
