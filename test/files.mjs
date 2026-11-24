// Browser run for the os-file-handoff pattern: Reader (ph-reader) lends
// Charts (ph-charts) a port to a file, and the pattern page checks what a
// file handle does when posted to another origin.
// The operating system's part (file_handlers, launchQueue) needs an installed
// app and is tested by hand; here the file comes from the reader's sample.
// Needs `npx wrangler dev --port 8787` running, or LIVE=<workers.dev subdomain>
// (and LIVE_MAIN=<origin of the hub> when it has a domain of its own).
//   NODE_PATH=$(npm root -g) node test/files.mjs <screenshot-dir>
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const LIVE = process.env.LIVE;
const workersDev = LIVE && LIVE.includes("workers.dev");
const main = LIVE ? process.env.LIVE_MAIN || (workersDev ? `https://handlers.${LIVE}` : `https://${LIVE}`) : "http://hub.localhost:8787";
const library = LIVE ? (workersDev ? `https://ph-reader.${LIVE}` : `https://reader.${LIVE}`) : "http://reader.localhost:8787";
const browser = await chromium.launch(process.env.HTTPS_PROXY && LIVE ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const errors = [];
const watch = (page) => { page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text())); };
let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? " " + extra : ""}`); if (!ok) failed++; };
const until = async (read, test, ms = 8000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await read(); if (test(v)) return v; await new Promise((r) => setTimeout(r, 100)); } return v; };
const shot = async (page, name) => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}/${name}.png`, fullPage: true }); };
const wide = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

// ---- the reader
const reader = await context.newPage();
watch(reader);
await reader.goto(library + "/");
check("reader: links its manifest", (await reader.evaluate(async () => (await (await fetch(document.querySelector("link[rel=manifest]").href)).json()).file_handlers.length)) === 1);
check("reader: says it is running in a tab", /a tab/.test(await reader.locator("#mode").innerText()));
check("reader: nothing to lend before a file is open", await reader.locator("#send").isDisabled());
await reader.click("#sample");
await reader.waitForSelector("body[data-file='plants.csv']");
check("reader: opened the sample with a handle", /yes/.test(await reader.locator("#writable").innerText()));
check("reader: no sideways scroll at 390px", !(await wide(reader)));

// ---- lend it
const [chart] = await Promise.all([reader.waitForEvent("popup"), reader.click("#send")]);
watch(chart);
await chart.setViewportSize({ width: 390, height: 844 });
await chart.waitForSelector("body[data-link='open'][data-doc='plants.csv']");
check("chart: is on another origin", new URL(chart.url()).origin !== new URL(library).origin, new URL(chart.url()).host);
check("reader: shows the port as lent", (await reader.getAttribute("body", "data-link")) === "open");
check("chart: drew a bar for each row", (await chart.locator("#bars li").count()) === 4);
check("chart: titled the chart from the header", (await chart.locator("#chart-title").innerText()) === "count by plant");
check("chart: no sideways scroll at 390px", !(await wide(chart)));
await shot(chart, "files-chart");

// ---- saving is refused until the reader allows it
await chart.fill('input[data-r="1"][data-c="2"]', "30");
await chart.click("#save");
const refused = await until(() => chart.locator("#result").innerText(), (v) => /refused/.test(v));
check("chart: the reader refused the first save", /has not allowed saving/.test(refused), refused);
check("reader: logged the refusal", /Refused a write/.test(await reader.locator("#log").innerText()));
check("reader: the file is unchanged", /fern,green,3\n/.test(await reader.locator("#text").innerText()));
await reader.check("#saving");
await chart.waitForSelector("body[data-saving='true']");
check("chart: kept the edit while the saving switch changed", (await chart.inputValue('input[data-r="1"][data-c="2"]')) === "30");
await chart.click("#save");
const saved = await until(() => chart.locator("#result").innerText(), (v) => /^Saved/.test(v));
check("chart: saved through the port", /^Saved/.test(saved), saved);
check("reader: the file now has the new number", /fern,green,30/.test(await until(() => reader.locator("#text").innerText(), (v) => /fern,green,30/.test(v))));
check("reader: the bytes on disk changed", (await reader.evaluate(async () => (await (await (await navigator.storage.getDirectory()).getFileHandle("plants.csv")).getFile()).text())).includes("fern,green,30"));
await shot(reader, "files-reader");

// ---- a second file on the same port, as launch_handler focus-existing does
await reader.evaluate(async () => {
  const dir = await navigator.storage.getDirectory();
  const handle = await dir.getFileHandle("notes.md", { create: true });
  const w = await handle.createWritable(); await w.write("# Plant notes\nWater the fern."); await w.close();
  await window.reader.open({ handle, via: "os" });
});
await chart.waitForSelector("body[data-doc='notes.md']");
check("chart: followed the next file on the same port", (await chart.inputValue("#textarea")).startsWith("# Plant notes"));
check("chart: text files get a text box, not a table", await chart.locator("#table-wrap").isHidden());

// ---- take it back
await reader.click("#revoke");
await chart.waitForSelector("body[data-link='closed']");
check("chart: knows the port was taken back", /took its port back/.test(await chart.locator("#state").innerText()));
check("chart: cannot save any more", await chart.locator("#save").isDisabled());

// ---- opened with no opener
const alone = await context.newPage();
await alone.goto(chart.url());
check("chart: alone, it says to open it from the reader", await alone.locator("#alone").isVisible());
await alone.close();

// ---- the explainer and its checks
const page = await context.newPage();
watch(page);
await page.goto(main + "/patterns/os-file-handoff/");
await page.waitForSelector("#handoff-probe[data-done]", { timeout: 15000 });
const done = JSON.parse(await page.getAttribute("#handoff-probe", "data-done"));
check("files: a handle reaches a frame on the same origin", done.same === "file", JSON.stringify(done));
check("files: a handle sent to another origin is a messageerror", done.cross === "messageerror");
check("files: the page is marked live", /Live demo/.test(await page.locator("#state").innerText()));
check("files: links to both apps", (await page.locator(`.steps a[href="${library}"]`).count()) === 1);
check("files: no sideways scroll at 390px", !(await wide(page)));
await shot(page, "files-page");

check("no page errors", errors.length === 0, errors.join(" | "));
await browser.close();
process.exit(failed ? 1 : 0);
