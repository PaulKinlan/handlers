// The Worker picks a site by hostname and serves its files. These tests run
// it against an in-memory stand-in for the static assets binding.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import worker, { siteFor, siteOrigins } from "../src/worker.js";

const root = new URL("../sites/", import.meta.url);
const env = {
  DEMO_SUFFIX: ".kinlan-test.workers.dev", MAIN_HOST: "",
  ASSETS: { fetch: async (req) => {
    const key = new URL(req.url).pathname.slice(1);
    const file = new URL(key, root);
    return existsSync(file) && !key.endsWith("/") ? new Response(readFileSync(file)) : new Response(null, { status: 404 });
  } },
};
const get = (url, init) => worker.fetch(new Request(url, init), env);

test("sites are chosen by the first label of the host", () => {
  assert.equal(siteFor("hub.localhost:8787"), "main");
  assert.equal(siteFor("notes.localhost:8787"), "notes");
  assert.equal(siteFor("ph-tasks.kinlan-test.workers.dev"), "tasks");
  assert.equal(siteFor("handlers.kinlan-test.workers.dev"), "main");
  assert.equal(siteFor("unknown.example"), "main");
});

test("each site knows where the others are, locally and deployed", () => {
  assert.deepEqual(siteOrigins(new URL("http://notes.localhost:8787/"), env), { main: "http://hub.localhost:8787", notes: "http://notes.localhost:8787", tasks: "http://tasks.localhost:8787" });
  assert.equal(siteOrigins(new URL("https://ph-notes.kinlan-test.workers.dev/"), env).tasks, "https://ph-tasks.kinlan-test.workers.dev");
  assert.equal(siteOrigins(new URL("https://ph-notes.kinlan-test.workers.dev/"), { ...env, MAIN_HOST: "handlers.example" }).main, "https://handlers.example");
});

test("each app serves its own manifest, with the handlers it registers", async () => {
  for (const [host, scheme] of [["notes.localhost", "web+note"], ["tasks.localhost", "web+task"]]) {
    const res = await get(`http://${host}/manifest.webmanifest`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/manifest+json");
    const manifest = await res.json();
    assert.equal(manifest.protocol_handlers[0].protocol, scheme);
    assert.match(manifest.protocol_handlers[0].url, /%s/);
    assert.ok(manifest.file_handlers.length);
    assert.ok(manifest.share_target.action);
  }
  assert.equal((await get("http://hub.localhost/manifest.webmanifest")).status, 404);
});

test("shared files are served on every origin", async () => {
  for (const host of ["hub", "notes", "tasks"]) assert.equal((await get(`http://${host}.localhost/base.css`)).status, 200);
});

test("pattern pages are all drawn by one file", async () => {
  const res = await get("http://hub.localhost/patterns/protocol-handlers/");
  assert.equal(res.status, 200);
  assert.match(await res.text(), /The four parts/);
});

test("sample files are downloads with their own type", async () => {
  const res = await get("http://hub.localhost/samples/hello.webnote");
  assert.equal(res.headers.get("content-type"), "application/x-webnote");
  assert.match(res.headers.get("content-disposition"), /attachment/);
});

test("a share that reaches the server is sent on to the app", async () => {
  const form = new FormData();
  form.set("title", "T"); form.set("text", "a & b");
  const res = await get("http://notes.localhost/share", { method: "POST", body: form });
  assert.equal(res.status, 303);
  const to = new URL(res.headers.get("location"));
  assert.equal(to.searchParams.get("text"), "a & b");
  assert.equal(to.searchParams.get("via"), "server");
});

test("paths that climb out of a site are refused", async () => {
  assert.equal((await get("http://hub.localhost/%2e%2e/notes/index.html")).status, 404);
  assert.equal((await get("http://hub.localhost/%E0%A4%A")).status, 404);
});

test("every pattern has the four parts and a known group", async () => {
  const { all, groups } = await import("../sites/main/patterns/all.js");
  const ids = new Set(all.map((p) => p.id));
  assert.equal(ids.size, all.length);
  for (const p of all) {
    assert.ok(groups.some((g) => g.id === p.group), p.id);
    for (const key of ["title", "blurb", "how", "build", "traps"]) assert.ok(p[key] && p[key].length, `${p.id}.${key}`);
    for (const r of p.related || []) assert.ok(ids.has(r), `${p.id} relates to missing ${r}`);
  }
});

