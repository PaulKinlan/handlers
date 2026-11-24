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
  assert.equal(siteFor("beyondthetab.dev"), "main");
  assert.equal(siteFor("notes.beyondthetab.dev"), "notes");
  assert.equal(siteFor("hub.localhost:8787"), "main");
  assert.equal(siteFor("notes.localhost:8787"), "notes");
  assert.equal(siteFor("ph-tasks.kinlan-test.workers.dev"), "tasks");
  assert.equal(siteFor("handlers.kinlan-test.workers.dev"), "main");
  assert.equal(siteFor("unknown.example"), "main");
});

test("each site knows where the others are, locally and deployed", () => {
  assert.deepEqual(siteOrigins(new URL("http://notes.localhost:8787/"), env), { main: "http://hub.localhost:8787", notes: "http://notes.localhost:8787", tasks: "http://tasks.localhost:8787", reader: "http://reader.localhost:8787", charts: "http://charts.localhost:8787" });
  assert.equal(siteOrigins(new URL("https://ph-reader.kinlan-test.workers.dev/"), env).charts, "https://ph-charts.kinlan-test.workers.dev");
  assert.equal(siteOrigins(new URL("https://ph-notes.kinlan-test.workers.dev/"), env).tasks, "https://ph-tasks.kinlan-test.workers.dev");
  assert.equal(siteOrigins(new URL("https://ph-notes.kinlan-test.workers.dev/"), { ...env, MAIN_HOST: "beyondthetab.dev" }).main, "https://beyondthetab.dev");
  assert.deepEqual(siteOrigins(new URL("https://beyondthetab.dev/"), { ...env, MAIN_HOST: "beyondthetab.dev", DEMO_SUFFIX: "" }), {
    main: "https://beyondthetab.dev",
    notes: "https://notes.beyondthetab.dev",
    tasks: "https://tasks.beyondthetab.dev",
    reader: "https://reader.beyondthetab.dev",
    charts: "https://charts.beyondthetab.dev",
  });
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
  for (const host of ["reader.localhost", "charts.localhost"]) {
    const res = await get(`http://${host}/manifest.webmanifest`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/manifest+json");
  }
  assert.equal((await get("http://hub.localhost/manifest.webmanifest")).status, 404);
});

test("shared files are served on every origin", async () => {
  for (const host of ["hub", "notes", "tasks", "reader", "charts"]) assert.equal((await get(`http://${host}.localhost/base.css`)).status, 200);
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
  const census = await get("http://hub.localhost/census/sample.census");
  assert.equal(census.headers.get("content-type"), "application/x-census");
  assert.match(census.headers.get("content-disposition"), /attachment/);
});

test("a share that reaches the server is sent on to the app", async () => {
  const form = new FormData();
  form.set("title", "T"); form.set("text", "a & b");
  const res = await get("http://notes.localhost/share", { method: "POST", body: form });
  assert.equal(res.status, 303);
  const to = new URL(res.headers.get("location"));
  assert.equal(to.pathname, "/");
  assert.equal(to.searchParams.get("text"), "a & b");
  assert.equal(to.searchParams.get("via"), "server");

  const censusForm = new FormData();
  censusForm.set("title", "Census"); censusForm.set("url", "https://example.com/");
  const censusRes = await get("http://hub.localhost/census/share-target", { method: "POST", body: censusForm });
  assert.equal(censusRes.status, 303);
  const censusTo = new URL(censusRes.headers.get("location"));
  assert.equal(censusTo.pathname, "/census/");
  assert.equal(censusTo.searchParams.get("title"), "Census");
  assert.equal(censusTo.searchParams.get("via"), "server");
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

test("every live pattern has a demo and every check id exists in detect.js", async () => {
  const { all } = await import("../sites/main/patterns/all.js");
  const { probes } = await import("../sites/shared/detect.js");
  const demosSrc = readFileSync(new URL("main/patterns/demos.js", root), "utf8");
  const probeIds = new Set(probes.map((p) => p.id));

  for (const p of all) {
    if (p.state === "live") {
      const hasEntry = new RegExp(`["']?${p.id.replace(/-/g, "\\-")}["']?\\s*:\\s*\\(`).test(demosSrc);
      assert.ok(hasEntry, `live pattern "${p.id}" is missing from demos.js`);
    }
  }
  for (const match of demosSrc.matchAll(/checks:\s*\[([^\]]+)\]/g)) {
    for (const id of match[1].matchAll(/["']([^"']+)["']/g)) {
      assert.ok(probeIds.has(id[1]), `demos.js references unknown probe "${id[1]}"`);
    }
  }
});

test("every pattern has a valid workflow diagram", async () => {
  const { all } = await import("../sites/main/patterns/all.js");
  const { diagrams, renderDiagram } = await import("../sites/main/patterns/diagrams.js");
  for (const p of all) {
    const spec = diagrams[p.id];
    assert.ok(spec, `pattern "${p.id}" is missing a diagram`);
    assert.ok(spec.actors.length >= 2 && spec.steps.length >= 1, p.id);
    for (const s of spec.steps) {
      assert.ok(s.from >= 0 && s.from < spec.actors.length, `${p.id} step.from out of range`);
      assert.ok(s.to >= 0 && s.to < spec.actors.length, `${p.id} step.to out of range`);
    }
    const html = renderDiagram(p.id);
    assert.match(html, /<svg /);
    assert.match(html, /<figcaption/);
  }
});

test("scope_extensions, related_applications and web-app-origin-association match locally and deployed", async () => {
  const localManifest = await (await get("http://notes.localhost:8787/manifest.webmanifest")).json();
  assert.deepEqual(localManifest.scope_extensions, [{ type: "origin", origin: "http://hub.localhost:8787" }]);
  assert.deepEqual(localManifest.related_applications, [{ platform: "webapp", url: "http://notes.localhost:8787/manifest.webmanifest" }]);
  const localAssoc = await (await get("http://hub.localhost:8787/.well-known/web-app-origin-association")).json();
  assert.deepEqual(localAssoc["http://notes.localhost:8787/"], { scope: "/patterns/scope-extensions/" });

  const prodManifest = await (await get("https://ph-notes.kinlan-test.workers.dev/manifest.webmanifest")).json();
  assert.deepEqual(prodManifest.scope_extensions, [{ type: "origin", origin: "https://handlers.kinlan-test.workers.dev" }]);
  assert.deepEqual(prodManifest.related_applications, [{ platform: "webapp", url: "https://ph-notes.kinlan-test.workers.dev/manifest.webmanifest" }]);
  const prodAssoc = await (await get("https://handlers.kinlan-test.workers.dev/.well-known/web-app-origin-association")).json();
  assert.deepEqual(prodAssoc["https://ph-notes.kinlan-test.workers.dev/"], { scope: "/patterns/scope-extensions/" });

  const domainEnv = { ...env, MAIN_HOST: "beyondthetab.dev", DEMO_SUFFIX: "" };
  const domainManifest = await (await worker.fetch(new Request("https://notes.beyondthetab.dev/manifest.webmanifest"), domainEnv)).json();
  assert.deepEqual(domainManifest.scope_extensions, [{ type: "origin", origin: "https://beyondthetab.dev" }]);
  assert.deepEqual(domainManifest.related_applications, [{ platform: "webapp", url: "https://notes.beyondthetab.dev/manifest.webmanifest" }]);
  const domainAssoc = await (await worker.fetch(new Request("https://beyondthetab.dev/.well-known/web-app-origin-association"), domainEnv)).json();
  assert.deepEqual(domainAssoc["https://notes.beyondthetab.dev/"], { scope: "/patterns/scope-extensions/" });
});

