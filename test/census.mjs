// The integration census and its "what is missing" page: every check reports,
// the service worker answers all three ways, the launch list reads ?via=, and
// the share target stores what it is sent.
// Needs `npx wrangler dev --port 8787` running, or LIVE=<workers.dev subdomain>.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const LIVE = process.env.LIVE;
const root = LIVE ? process.env.LIVE_MAIN || (LIVE.includes("workers.dev") ? `https://handlers.${LIVE}` : `https://${LIVE}`) : "http://hub.localhost:8787";
const shots = process.argv[2];
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? " " + extra : ""}`); if (!ok) failed++; };
const proxy = process.env.HTTPS_PROXY && LIVE ? { proxy: { server: process.env.HTTPS_PROXY } } : {};

const browser = await chromium.launch(proxy);
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const results = async (path) => {
  await page.goto(root + path);
  await page.waitForFunction(() => /This page ran \d+ checks/.test(document.getElementById("tally").textContent), null, { timeout: 20000 });
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-probe]:not([data-manual])")].map((el) => [el.dataset.probe, [el.dataset.state, el.title || el.textContent]])));
};

const got = await results("/census/?via=rph&u=web%2Bcensus%3Ahello");
const pending = Object.entries(got).filter(([, [state]]) => !state || state === "unknown");
check("census: every check reported a result", pending.length === 0, JSON.stringify(pending));
check("census: the service worker answers on a port, with client.postMessage and on a BroadcastChannel", ["sw-port", "sw-client", "sw-broadcast"].every((id) => got[id][0] === "works"), JSON.stringify(["sw-port", "sw-client", "sw-broadcast"].map((id) => got[id])));
check("census: registerProtocolHandler refuses unsafe schemes and other origins", got["rph-rules"][0] === "works", got["rph-rules"][1]);
const gaps = ["rph-query", "manifest-read", "share-target", "sw-other-origin", "sw-launch"];
check("census: the gaps the missing page describes are there in this Chromium", gaps.every((id) => got[id][0] === "gap"), JSON.stringify(gaps.filter((id) => got[id][0] !== "gap")));
check("census: the manifest declares every handler", /protocol_handlers, file_handlers, launch_handler, share_target and shortcuts/.test(got.manifest[1]), got.manifest[1]);
const launches = await page.locator("#launches").textContent();
check("census: the launch list says the page was opened by a web+census link", /registerProtocolHandler/.test(launches) && /web\+census:hello/.test(launches), launches);
const refs = await page.evaluate(() => document.querySelectorAll("a.ref").length);
check("census: refs.js linked the features to their documentation", refs > 10, String(refs));
if (shots) await page.screenshot({ path: `${shots}/integration.png`, fullPage: true });

// A share, posted the way the share sheet posts it, to the service worker.
const shared = await page.evaluate(async () => {
  const form = new FormData();
  form.append("title", "A title"); form.append("text", "Some text"); form.append("url", "https://example.com/");
  form.append("files", new File(["hello"], "hello.txt", { type: "text/plain" }));
  const res = await fetch("/census/share-target", { method: "POST", body: form, redirect: "manual" });
  return res.type;
});
await page.goto(root + "/census/?via=share");
await page.waitForFunction(() => /received a share/.test(document.getElementById("launches").textContent), null, { timeout: 10000 }).catch(() => {});
const shareLine = await page.locator("#launches").textContent();
check("census: the share target keeps a share and the page lists it", /title “A title”/.test(shareLine) && /hello\.txt/.test(shareLine), `${shared} ${shareLine}`);

const missing = await results("/missing/");
const pending2 = Object.entries(missing).filter(([, [state]]) => !state || state === "unknown");
check("missing: every check reported a result", pending2.length === 0, JSON.stringify(pending2));
const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute("href").split("#")[0]));
const broken = await page.evaluate(async (hrefs) => (await Promise.all(hrefs.map(async (h) => [h, (await fetch(h)).status]))).filter(([, s]) => s !== 200), [...new Set(links)]);
check("missing: every link into this site resolves", broken.length === 0, JSON.stringify(broken));
if (shots) await page.screenshot({ path: `${shots}/integration-missing.png`, fullPage: true });

check("no errors on either page", errors.length === 0, errors.join(" | "));
await browser.close();
process.exit(failed ? 1 : 0);
