// Beyond the Tab worker.
//
// Serves a different folder of /sites depending on the hostname, so one script
// can stand in for several unrelated origins: the hub, and the demo apps that
// the operating system and the browser hand links, files and shares to.
//
// Nothing here keeps state. Every integration in this project happens between
// the browser, the operating system and the pages themselves.

const LABELS = {
  beyondthetab: "main", handlers: "main", hub: "main", localhost: "main",
  "ph-notes": "notes", notes: "notes",
  "ph-tasks": "tasks", tasks: "tasks",
  "ph-reader": "reader", reader: "reader",
  "ph-charts": "charts", charts: "charts",
  "ph-wallet": "wallet", wallet: "wallet",
  "ph-moved": "moved", moved: "moved",
};
const PROD = { main: "handlers", notes: "ph-notes", tasks: "ph-tasks", reader: "ph-reader", charts: "ph-charts", wallet: "ph-wallet", moved: "ph-moved" };
const LOCAL = { main: "hub", notes: "notes", tasks: "tasks", reader: "reader", charts: "charts", wallet: "wallet", moved: "moved" };

const TYPES = {
  html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8", json: "application/json", svg: "image/svg+xml", txt: "text/plain; charset=utf-8",
  png: "image/png", ico: "image/x-icon", md: "text/markdown; charset=utf-8",
  webmanifest: "application/manifest+json",
  // The demo file types. They are the types the apps list under file_handlers.
  webnote: "application/x-webnote", webtasks: "application/x-webtasks", census: "application/x-census", csv: "text/csv; charset=utf-8",
};

// Files of these types are offered as downloads, so that the operating system,
// not the browser tab, decides what opens them.
const DOWNLOAD = new Set(["webnote", "webtasks", "census", "csv"]);

export function label(host) { return host.split(":")[0].split(".")[0]; }
export function siteFor(host) { return LABELS[label(host)] || "main"; }

// Where each site lives. Locally the names follow the host that was asked
// (hub.localhost:8787, notes.localhost:8787). Deployed with MAIN_HOST and no
// DEMO_SUFFIX, the hub lives at MAIN_HOST and each demo app on its own
// subdomain (notes.beyondthetab.dev, tasks.beyondthetab.dev, ...). With
// DEMO_SUFFIX set, each app falls back to its workers.dev address.
export function siteOrigins(url, env) {
  const host = url.host;
  const first = host.split(".")[0];
  const local = host.includes("localhost") || host.startsWith("127.");
  const out = {};
  if (!local && env.MAIN_HOST && !env.DEMO_SUFFIX) {
    for (const site of Object.keys(LOCAL)) {
      out[site] = site === "main" ? "https://" + env.MAIN_HOST : "https://" + site + "." + env.MAIN_HOST;
    }
    return out;
  }
  if (!local && env.DEMO_SUFFIX) {
    for (const [site, name] of Object.entries(PROD)) {
      out[site] = site === "main" && env.MAIN_HOST ? "https://" + env.MAIN_HOST : "https://" + name + env.DEMO_SUFFIX;
    }
    return out;
  }
  const rest = host.includes(".") ? host.slice(first.length) : "." + host;
  for (const [site, name] of Object.entries(LOCAL)) out[site] = url.protocol + "//" + name + rest;
  return out;
}

async function readAsset(env, key) {
  const res = await env.ASSETS.fetch(new Request("https://assets.local/" + key));
  return res.ok ? res.body : null;
}

export async function serve(env, site, pathname) {
  let path;
  try { path = decodeURIComponent(pathname); } catch { return null; }
  if (path.includes("..")) return null;
  if (path.endsWith("/")) path += "index.html";
  const candidates = [site + path, "shared" + path];
  if (!/\.[a-z0-9]+$/i.test(path)) candidates.push(site + path + "/index.html");
  // Each pattern has a page of its own, all drawn by one file.
  if (site === "main" && /^\/patterns\/[a-z0-9-]+\/index\.html$/.test(path)) candidates.push("main/patterns/_page.html");
  for (const key of candidates) {
    const body = await readAsset(env, key);
    if (!body) continue;
    const ext = key.split(".").pop().toLowerCase();
    const headers = {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": "no-cache",
      "access-control-allow-origin": "*",
    };
    if (DOWNLOAD.has(ext)) headers["content-disposition"] = `attachment; filename="${key.split("/").pop()}"`;
    // A service worker controls only the paths under its own folder unless the
    // server allows more. Each app's worker sits at its root anyway.
    if (key.endsWith("/sw.js")) headers["service-worker-allowed"] = "/";
    return new Response(body, { headers });
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const site = siteFor(url.host);

    // Every page learns where the other sites are from here, so links between
    // origins work the same locally and deployed.
    if (url.pathname === "/_sites.js") {
      const body = "export const sites = " + JSON.stringify(siteOrigins(url, env)) + ";\nexport const site = " + JSON.stringify(site) + ";\n";
      return new Response(body, { headers: { "content-type": TYPES.js, "access-control-allow-origin": "*", "cache-control": "no-cache" } });
    }

    const reading = request.method === "GET" || request.method === "HEAD";
    const json = (value, type = TYPES.json, extra = {}) => new Response(JSON.stringify(value, null, 2) + "\n", {
      headers: { "content-type": type, "access-control-allow-origin": "*", "cache-control": "no-cache", ...extra },
    });

    // What the hub agrees to, for apps on other origins. Notes may take
    // /patterns/scope-extensions/ into its scope (scope_extensions), and the
    // Mover app at /moving/ may move to the "moved" origin (migrate_from).
    if (url.pathname === "/.well-known/web-app-origin-association" && site === "main") {
      const origins = siteOrigins(url, env);
      return json({
        [origins.notes + "/"]: { scope: "/patterns/scope-extensions/" },
        [origins.moved + "/"]: { allow_migration: true },
      });
    }

    // The Mover app, for the app-migration pattern. The old address is
    // /moving/ on the hub and the new one is the "moved" origin. Each manifest
    // names the other, with the origins of wherever this is running.
    if (reading && site === "main" && url.pathname === "/moving/manifest.webmanifest") {
      const raw = await readAsset(env, "main/moving/manifest.webmanifest");
      if (raw) {
        const origins = siteOrigins(url, env);
        const manifest = JSON.parse(await new Response(raw).text());
        manifest.migrate_to = { id: origins.moved + "/", install_url: origins.moved + "/" };
        return json(manifest, TYPES.webmanifest);
      }
    }
    if (reading && site === "moved" && url.pathname === "/manifest.webmanifest") {
      const raw = await readAsset(env, "moved/manifest.webmanifest");
      if (raw) {
        const origins = siteOrigins(url, env);
        const manifest = JSON.parse(await new Response(raw).text());
        manifest.migrate_from = [{ id: origins.main + "/moving/", behavior: "suggest" }];
        return json(manifest, TYPES.webmanifest);
      }
    }

    // The Wallet's payment method, for the payment-handler pattern. A shop
    // names <wallet>/pay. The browser asks that address where the payment
    // method manifest is (the Link header), and the manifest names the web app
    // manifest of the app that handles the method.
    if (reading && site === "wallet" && (url.pathname === "/pay" || url.pathname === "/payment-manifest.json")) {
      const origins = siteOrigins(url, env);
      const link = url.pathname === "/pay" ? { link: `<${origins.wallet}/payment-manifest.json>; rel="payment-method-manifest"` } : {};
      return json({ default_applications: [origins.wallet + "/manifest.webmanifest"] }, TYPES.json, link);
    }

    // Inject the live hub origin into Notes' manifest scope_extensions (and
    // Notes' own URL into related_applications) so they match locally
    // (hub.localhost) and deployed (handlers.workers.dev / MAIN_HOST).
    if (reading && site === "notes" && url.pathname === "/manifest.webmanifest") {
      const raw = await readAsset(env, "notes/manifest.webmanifest");
      if (raw) {
        const origins = siteOrigins(url, env);
        const manifest = JSON.parse(await new Response(raw).text());
        manifest.scope_extensions = [{ type: "origin", origin: origins.main }];
        manifest.related_applications = [{ platform: "webapp", url: origins.notes + "/manifest.webmanifest" }];
        return json(manifest, TYPES.webmanifest);
      }
    }

    // A share target that uses POST is answered by the app's service worker.
    // If the worker is not running yet (the first share after install can
    // arrive before it controls the page), send the person to the app with
    // what was shared in the query, so the share is not lost.
    if (request.method === "POST" && ((site === "notes" && url.pathname === "/share") || (site === "main" && url.pathname === "/census/share-target"))) {
      const form = await request.formData().catch(() => null);
      const back = new URL(site === "main" ? "/census/" : "/", url);
      for (const key of ["title", "text", "url"]) {
        const value = form && form.get(key);
        if (typeof value === "string" && value) back.searchParams.set(key, value.slice(0, 2000));
      }
      back.searchParams.set("via", "server");
      return Response.redirect(back.toString(), 303);
    }

    if (!reading) return new Response("method not allowed", { status: 405 });
    return (await serve(env, site, url.pathname)) || new Response("Not found", { status: 404, headers: { "content-type": TYPES.txt } });
  },
};
