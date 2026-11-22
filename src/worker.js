// Handlers worker.
//
// Serves a different folder of /sites depending on the hostname, so one script
// can stand in for several unrelated origins: the hub, and the demo apps that
// the operating system and the browser hand links, files and shares to.
//
// Nothing here keeps state. Every integration in this project happens between
// the browser, the operating system and the pages themselves.

const LABELS = {
  handlers: "main", hub: "main", localhost: "main",
  "ph-notes": "notes", notes: "notes",
  "ph-tasks": "tasks", tasks: "tasks",
  "ph-reader": "reader", reader: "reader",
  "ph-charts": "charts", charts: "charts",
};
const PROD = { main: "handlers", notes: "ph-notes", tasks: "ph-tasks", reader: "ph-reader", charts: "ph-charts" };
const LOCAL = { main: "hub", notes: "notes", tasks: "tasks", reader: "reader", charts: "charts" };

const TYPES = {
  html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8", json: "application/json", svg: "image/svg+xml", txt: "text/plain; charset=utf-8",
  png: "image/png", ico: "image/x-icon", md: "text/markdown; charset=utf-8",
  webmanifest: "application/manifest+json",
  // The demo file types. They are the types the apps list under file_handlers.
  webnote: "application/x-webnote", webtasks: "application/x-webtasks", csv: "text/csv; charset=utf-8",
};

// Files of these types are offered as downloads, so that the operating system,
// not the browser tab, decides what opens them.
const DOWNLOAD = new Set(["webnote", "webtasks", "csv"]);

export function label(host) { return host.split(":")[0].split(".")[0]; }
export function siteFor(host) { return LABELS[label(host)] || "main"; }

// Where each site lives. Locally the names follow the host that was asked
// (hub.localhost:8787, notes.localhost:8787). Deployed, each site is its
// Worker's workers.dev address, unless the hub has a domain (MAIN_HOST).
export function siteOrigins(url, env) {
  const host = url.host;
  const first = host.split(".")[0];
  const local = host.includes("localhost") || host.startsWith("127.");
  const out = {};
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

    // A share target that uses POST is answered by the app's service worker.
    // If the worker is not running yet (the first share after install can
    // arrive before it controls the page), send the person to the app with
    // what was shared in the query, so the share is not lost.
    if (request.method === "POST" && url.pathname === "/share" && site === "notes") {
      const form = await request.formData().catch(() => null);
      const back = new URL("/", url);
      for (const key of ["title", "text", "url"]) {
        const value = form && form.get(key);
        if (typeof value === "string" && value) back.searchParams.set(key, value.slice(0, 2000));
      }
      back.searchParams.set("via", "server");
      return Response.redirect(back.toString(), 303);
    }

    if (request.method !== "GET" && request.method !== "HEAD") return new Response("method not allowed", { status: 405 });
    return (await serve(env, site, url.pathname)) || new Response("Not found", { status: 404, headers: { "content-type": TYPES.txt } });
  },
};
