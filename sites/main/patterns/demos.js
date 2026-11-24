// The live part of each pattern page. Each demo is a few steps to try, using
// the demo apps on their own origins, and the checks that matter for it in
// this browser. Patterns without an entry here show only the checks.
import { render } from "/detect.js";

const link = (href, text) => `<a class="button quiet" href="${href}">${text}</a>`;

export const demos = {
  "protocol-handlers": (s) => ({
    checks: ["rph", "standalone"],
    steps: [
      `Open the Notes app and press <strong>Handle web+note: links here</strong>, or install it. ${link(s.notes, "Open Notes")}`,
      `Come back and follow this link. It names no origin; the browser sends it to whichever app registered the scheme. ${link("web+note:Hello%20from%20the%20hub%20%26%20a%20%25%20sign", "web+note:Hello from the hub")}`,
      `Do the same for Tasks, then send a task from here. ${link(s.tasks, "Open Tasks")} ${link("web+task:Write%20the%20launch_handler%20page", "web+task:Write the launch_handler page")}`,
    ],
  }),
  "scheme-detection": (s) => ({
    checks: ["rph"],
    steps: [
      "Press <strong>Probe web+note:</strong> below before registering Notes, then compare it with <strong>Probe unhandled scheme</strong>.",
      `Open Notes and press <strong>Handle web+note: links here</strong> (or install it), then come back and run the probe again. ${link(s.notes, "Open Notes")}`,
    ],
    after: (el) => import("/patterns/scheme-probe.js").then((m) => m.run(el)),
  }),
  "launch-handler": (s) => ({
    checks: ["launchQueue", "standalone"],
    steps: [
      `Install Notes (<code>focus-existing</code>) and Tasks (<code>navigate-existing</code>). ${link(s.notes, "Open Notes")} ${link(s.tasks, "Open Tasks")}`,
      `With Notes open, follow these two links one after the other. Both arrive in the same window, listed under "What arrived". ${link("web+note:First", "web+note:First")} ${link("web+note:Second", "web+note:Second")}`,
    ],
  }),
  "link-capturing": (s) => ({
    checks: ["launchQueue", "standalone"],
    steps: [
      `Install Notes (which declares <code>handle_links: "preferred"</code> and <code>client_mode: "focus-existing"</code>). ${link(s.notes, "Open Notes")}`,
      `Click this ordinary link to Notes (not a <code>web+</code> scheme). If link capturing is enabled in Chrome for Notes, it opens in the installed window rather than a browser tab. ${link(s.notes + "/?new=1", "Open a new note via https/http link")}`,
      "Check Chrome's App Settings for Notes (Supported links / Open supported links in app) to toggle capturing on or off and compare.",
    ],
  }),
  "scope-extensions": (s) => ({
    checks: ["standalone"],
    steps: [
      `Install Notes from its own origin. Its manifest declares <code>scope_extensions</code> including this Hub origin, and the Hub serves <code>/.well-known/web-app-origin-association</code> agreeing for <code>/patterns/scope-extensions/</code>. ${link(s.notes, "Open Notes")}`,
      `Inspect both sides of the handshake directly: ${link(s.notes + "/manifest.webmanifest", "Notes manifest")} ${link("/.well-known/web-app-origin-association", "Hub association file")}`,
      "With scope extensions enabled in Chromium, following a link to this page from Notes stays inside the installed app window instead of popping out to a browser tab.",
    ],
    after: (el) => import("/patterns/scope-probe.js").then((m) => m.run(el, s)),
  }),
  "note-taking": (s) => ({
    checks: ["standalone"],
    steps: [
      `Install Notes on ChromeOS. Its manifest declares <code>note_taking.new_note_url</code> pointing at <code>/?new=1</code>. ${link(s.notes, "Open Notes")}`,
      "Open ChromeOS Settings → Stylus (or the lock screen note-taking setting) and select Beyond the Tab Notes as the note-taking app.",
      "Trigger \"Create note\" from the stylus menu. Notes opens directly to a blank note and logs the launch.",
    ],
  }),
  "file-handlers": (s) => ({
    checks: ["launchQueue", "launchParams", "standalone"],
    steps: [
      `Install Notes. ${link(s.notes, "Open Notes")}`,
      `Download a sample file. ${link("/samples/hello.webnote", "hello.webnote")} ${link("/samples/list.webtasks", "list.webtasks (for Tasks)")}`,
      "Open the file from your file manager with Open with, Beyond the Tab Notes. The browser asks once whether Notes may open it.",
    ],
  }),
  "file-save-back": (s) => ({
    checks: ["launchParams", "picker"],
    steps: [`In Notes, open <code>hello.webnote</code> (by launch or with Open a file), change it, and press Save. Then open the file in a text editor. ${link(s.notes, "Open Notes")}`],
  }),
  "drag-handles": (s) => ({
    checks: ["dropHandle", "picker"],
    steps: [
      `Download a sample note or CSV file. ${link("/samples/hello.webnote", "hello.webnote")} ${link("/samples/plants.csv", "plants.csv")}`,
      `Drag <code>hello.webnote</code> from your desktop onto the editor panel in Notes. In Chromium, Notes receives a writable <code>FileSystemFileHandle</code> instead of a copy. ${link(s.notes, "Open Notes")}`,
      "Edit the text and press <strong>Save</strong>. Your changes are written back to the file on disk.",
      `You can also drag <code>plants.csv</code> onto Reader to drop a handle and lend it to Charts. ${link(s.reader, "Open Reader")}`,
    ],
  }),
  "share-target": (s) => ({
    checks: ["share", "shareFiles", "standalone"],
    steps: [
      `Install Notes (POST, with files) and Tasks (GET). ${link(s.notes, "Open Notes")} ${link(s.tasks, "Open Tasks")}`,
      "Share a page or a text file from another app, and pick Notes or Tasks in the share sheet.",
    ],
  }),
  "web-share": (s) => ({
    checks: ["share", "shareFiles"],
    steps: [`In Tasks, press Share the list. If Notes is installed, it is one of the places the list can go. ${link(s.tasks, "Open Tasks")}`],
  }),
  clipboard: (s) => ({
    checks: ["clipboard", "clipboardCustom"],
    steps: [
      `Open Tasks, add a couple of tasks (mark one done), and press <strong>Copy structured</strong>. Tasks writes both <code>text/plain</code> and the custom format <code>web application/x-webtasks+json</code>. ${link(s.tasks, "Open Tasks")}`,
      `Open Notes on its own origin and press <strong>Paste from Tasks</strong>. Notes reads the custom format and logs the structured task counts under "What arrived". ${link(s.notes, "Open Notes")}`,
      "Paste into any plain text editor as well to see the <code>text/plain</code> fallback.",
    ],
  }),
  "web-install": (s) => ({
    checks: ["installApi", "installPrompt", "relatedApps"],
    steps: [
      "Use the buttons below to invoke <code>navigator.install()</code> for any of the four demo apps across origins.",
      `If <code>navigator.install()</code> is not enabled in your browser yet, open an app directly and use the browser's address-bar install button. ${link(s.notes, "Open Notes")} ${link(s.tasks, "Open Tasks")}`,
    ],
    after: (el) => import("/patterns/install-probe.js").then((m) => m.run(el, s)),
  }),
  badging: (s) => ({
    checks: ["badge", "standalone"],
    steps: [`Install Tasks and add a few tasks. The icon shows how many are not done. ${link(s.tasks, "Open Tasks")}`],
  }),
  "window-chrome": (s) => ({
    checks: ["wco", "standalone"],
    steps: [
      `Install Tasks (which declares <code>display_override: ["window-controls-overlay", "standalone"]</code>). ${link(s.tasks, "Open Tasks")}`,
      "In the installed Tasks window on desktop Chrome/Edge, click the small chevron next to the window controls to toggle Window Controls Overlay on.",
      "The teal Tasks title bar expands beside the OS buttons showing the live open-task count, and remains draggable via <code>app-region: drag</code>.",
    ],
  }),
  "tabbed-apps": (s) => ({
    checks: ["standalone"],
    steps: [
      `Install Notes on desktop Chromium (with tabbed PWA mode enabled). Its manifest declares <code>display_override: ["tabbed", "standalone"]</code> and a <code>tab_strip</code> with a pinned home tab and <code>new_tab_button</code>. ${link(s.notes, "Open Notes")}`,
      "Click the <code>+</code> button in the installed window's tab strip to open a fresh note tab while keeping the home tab pinned.",
    ],
  }),
  "document-pip": (s) => ({
    checks: ["documentPip"],
    steps: [
      `Open Tasks in desktop Chrome or Edge (no install required). ${link(s.tasks, "Open Tasks")}`,
      "Add a task or two, then press <strong>Pop out</strong>. The live task panel moves into an always-on-top OS window that floats above other apps.",
      "Check off a task inside the floating window, then close it or press <strong>Dock back</strong> to return it cleanly to the page.",
    ],
  }),
  "window-management": (s) => ({
    checks: ["windowManagement"],
    steps: [
      "Press <strong>List screens</strong> below and grant Window Management permission to inspect every connected monitor.",
      "Press <strong>Open Reader &amp; Charts side-by-side</strong> to tile the two cross-origin demo apps across the left and right halves of your display.",
    ],
    after: (el) => import("/patterns/screens-probe.js").then((m) => m.run(el, s)),
  }),
  "contact-picker": () => ({
    checks: ["contactPicker"],
    steps: [
      "Open this page in Chrome on Android and press <strong>Pick a contact</strong> below.",
      "Select one or more contacts in the OS sheet and observe that—unlike <code>navigator.share()</code>—the selected fields come back directly to the page.",
    ],
    after: (el) => import("/patterns/contact-probe.js").then((m) => m.run(el)),
  }),
  "related-apps": (s) => ({
    checks: ["relatedApps", "standalone"],
    steps: [
      `Notes declares itself in <code>related_applications</code> so its own pages can ask whether the PWA is installed. ${link(s.notes, "Open Notes")} ${link(s.notes + "/manifest.webmanifest", "Inspect Notes manifest")}`,
      "Install Notes, then open Notes in a normal browser tab and call <code>await navigator.getInstalledRelatedApps()</code> in DevTools (or inspect the live check below).",
    ],
    after: (el) => import("/patterns/related-apps-probe.js").then((m) => m.run(el, s)),
  }),
  "app-migration": (s) => ({
    checks: ["installApi", "standalone"],
    steps: [
      "Enter a target domain below to inspect the exact <code>migrate_from</code> manifest entry and <code>/.well-known/web-app-origin-association</code> confirmation file needed to migrate an installed app without reinstalling.",
      `Compare with the live association file already served on this Hub: ${link("/.well-known/web-app-origin-association", "Hub association file")}`,
    ],
    after: (el) => import("/patterns/migration-probe.js").then((m) => m.run(el, s)),
  }),
  "digital-credentials": () => ({
    checks: ["digitalCredentials"],
    steps: [
      "Check the protocol probe below to see which verifiable credential protocols (such as <code>openid4vp</code> or <code>org-iso-mdoc</code>) your browser currently advertises.",
    ],
    after: (el) => import("/patterns/credentials-probe.js").then((m) => m.run(el)),
  }),
  "intents-lineage": () => ({
    checks: ["rph", "launchQueue", "share", "contactPicker", "digitalCredentials"],
    steps: [
      "Review the live verb matrix below to see which classic Web Intents verbs work in your browser today—and which ones can actually return a reply to the calling app.",
      `Follow any API link in the table to try its multi-origin demo or see <a href="/missing/">What web app integration is missing</a>.`,
    ],
    after: (el) => import("/patterns/intents-probe.js").then((m) => m.run(el)),
  }),
  "os-file-handoff": (s) => ({
    checks: ["launchQueue", "launchParams", "picker", "standalone"],
    steps: [
      `Install Reader and Charts from desktop Chrome or Edge. Each is on its own origin. ${link(s.reader, "Open Reader")} ${link(s.charts, "Open Charts")}`,
      `In your file manager, open a <code>.csv</code> file with Open with, Beyond the Tab Reader. No CSV to hand? Download one, or press "Use a sample file" in the Reader. ${link("/samples/plants.csv", "plants.csv")}`,
      "In the Reader, press <strong>Open in Charts</strong>. Charts gets a port and draws the table.",
      "In Charts, change a number and press <strong>Save to the file</strong>. The Reader refuses. Tick \"Let the other app save to this file\" in the Reader and save again. The file on disk changes.",
      "Open a second <code>.csv</code> with the Reader. The window you already have receives it (<code>focus-existing</code>), and Charts shows it on the same port.",
      "Press <strong>Take the port back</strong> in the Reader. Charts can no longer read or save.",
    ],
    after: (el) => import("/patterns/handoff-probe.js").then((m) => m.run(el, s)),
  }),
  shortcuts: (s) => ({
    checks: ["standalone"],
    steps: [`Install Notes, then right-click or long-press its icon and pick New note. ${link(s.notes, "Open Notes")}`],
  }),
};

export function mount(el, pattern, sites) {
  const demo = demos[pattern.id]?.(sites);
  el.innerHTML = `<div class="panel ruled demo-box">
    ${demo ? `<h2>Try it</h2><ol class="steps">${demo.steps.map((s) => `<li>${s}</li>`).join("")}</ol>` : `<h2>Not built yet</h2><p>This page lists what the demo will show. The checks below run now.</p>`}
    <h3>In this browser</h3><ul class="checks"></ul></div>`;
  render(el.querySelector(".checks"), demo?.checks);
  // A demo can add a check of its own that runs in the page.
  demo?.after?.(el.querySelector(".demo-box"));
}
