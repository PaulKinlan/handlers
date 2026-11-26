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
      "Press <strong>Try web+note:</strong> below before Notes has registered, then <strong>Try a scheme nothing handles</strong>, and compare the two.",
      `Open Notes and press <strong>Handle web+note: links here</strong>, or install it. Come back and try both again. ${link(s.notes, "Open Notes")}`,
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
      `Install Notes. Its manifest has <code>handle_links: "preferred"</code> and <code>client_mode: "focus-existing"</code>. ${link(s.notes, "Open Notes")}`,
      `Follow this link. It is an ordinary link to Notes, not a <code>web+</code> one. If link capturing is on for Notes, it opens in the Notes window and not in a tab. ${link(s.notes + "/?new=1", "A new note, by an ordinary link")}`,
      "Turn link capturing off for Notes in Chrome's app settings, and follow the link again.",
    ],
  }),
  "scope-extensions": (s) => ({
    checks: ["standalone"],
    steps: [
      `Install Notes. Its manifest lists this origin under <code>scope_extensions</code>, and this origin serves <code>/.well-known/web-app-origin-association</code> to agree, for <code>/patterns/scope-extensions/</code> only. ${link(s.notes, "Open Notes")}`,
      `Read both halves: ${link(s.notes + "/manifest.webmanifest", "Notes manifest")} ${link("/.well-known/web-app-origin-association", "The association file")}`,
      "Where Chromium has scope extensions on, a link from Notes to this page stays in the Notes window and does not open a tab.",
    ],
    after: (el) => import("/patterns/scope-probe.js").then((m) => m.run(el, s)),
  }),
  "note-taking": (s) => ({
    checks: ["standalone"],
    steps: [
      `Install Notes on ChromeOS. Its manifest sets <code>note_taking.new_note_url</code> to <code>/?new=1</code>. ${link(s.notes, "Open Notes")}`,
      "In the ChromeOS settings, choose Beyond the Tab Notes as the note-taking app.",
      "Choose \"Create note\" from the stylus menu. Notes opens on an empty note and lists the launch under \"What arrived\".",
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
      `Download a sample file. ${link("/samples/hello.webnote", "hello.webnote")} ${link("/samples/plants.csv", "plants.csv")}`,
      `Drag <code>hello.webnote</code> from your file manager onto the editor in Notes. In Chromium, Notes gets a <code>FileSystemFileHandle</code> and not a copy. ${link(s.notes, "Open Notes")}`,
      "Change the text and press <strong>Save</strong>. The file on disk changes.",
      `Reader takes a drop too. Drag <code>plants.csv</code> onto it, then lend it to Charts. ${link(s.reader, "Open Reader")}`,
    ],
  }),
  "share-target": (s) => ({
    checks: ["share", "shareFiles", "standalone"],
    steps: [
      `Install Notes (POST, with files) and Tasks (GET). ${link(s.notes, "Open Notes")} ${link(s.tasks, "Open Tasks")}`,
      "On Android, ChromeOS or Windows, share a page or a text file from another app, and pick Notes or Tasks in the share sheet.",
      "On a Mac they are not in the sheet. Chrome does not register share targets on macOS.",
    ],
  }),
  "web-share": (s) => ({
    checks: ["share", "shareFiles"],
    steps: [
      `In Tasks, press Share the list. The system share sheet opens. ${link(s.tasks, "Open Tasks")}`,
      "On Android, ChromeOS and Windows, an installed Notes is one of the places the list can go.",
      "On a Mac it is not. The Notes in that sheet is Apple's. Use <strong>Send to Notes</strong> in Tasks instead, which goes by the <code>web+note:</code> scheme.",
    ],
  }),
  clipboard: (s) => ({
    checks: ["clipboard", "clipboardCustom"],
    steps: [
      `Open Tasks, add two tasks, mark one done, and press <strong>Copy structured</strong>. Tasks writes <code>text/plain</code> and <code>web application/x-webtasks+json</code> to the clipboard. ${link(s.tasks, "Open Tasks")}`,
      `Open Notes, which is on another origin, and press <strong>Paste from Tasks</strong>. Notes reads the custom format and lists how many tasks were open and done under "What arrived". ${link(s.notes, "Open Notes")}`,
      "Paste into a text editor as well. It gets the <code>text/plain</code> version.",
    ],
  }),
  "web-install": (s) => ({
    checks: ["installApi", "installPrompt", "relatedApps"],
    steps: [
      "Press a button below. Each one calls <code>navigator.install()</code> for a demo app on another origin.",
      `If your browser does not have <code>navigator.install()</code>, open the app and use the install button in the address bar. ${link(s.notes, "Open Notes")} ${link(s.tasks, "Open Tasks")}`,
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
      `Install Tasks. Its manifest has <code>display_override: ["window-controls-overlay", "standalone"]</code>. ${link(s.tasks, "Open Tasks")}`,
      "In the Tasks window, in Chrome or Edge on desktop, press the chevron next to the window buttons to turn the overlay on.",
      "The title bar now shows the number of open tasks. It still drags the window, because of <code>app-region: drag</code>.",
    ],
  }),
  "tabbed-apps": (s) => ({
    checks: ["standalone"],
    steps: [
      `Install Notes in Chromium on desktop, with tabbed mode turned on. Its manifest has <code>display_override: ["tabbed", "standalone"]</code> and a <code>tab_strip</code> with a pinned home tab and a <code>new_tab_button</code>. ${link(s.notes, "Open Notes")}`,
      "Press <code>+</code> in the tab strip. A new note opens in a tab, and the home tab stays pinned.",
    ],
  }),
  "document-pip": (s) => ({
    checks: ["documentPip"],
    steps: [
      `Open Tasks in Chrome or Edge on desktop. It does not need to be installed. ${link(s.tasks, "Open Tasks")}`,
      "Add a task, then press <strong>Pop out</strong>. The task list moves into a small window that stays above other apps.",
      "Tick a task in that window, then close it or press <strong>Dock back</strong>. The list goes back into the page, with the tick.",
    ],
  }),
  "window-management": (s) => ({
    checks: ["windowManagement"],
    steps: [
      "Press <strong>List screens</strong> below and allow the permission. The page lists each screen.",
      "Press <strong>Open Reader and Charts side by side</strong>. Each opens in one half of the screen.",
    ],
    after: (el) => import("/patterns/screens-probe.js").then((m) => m.run(el, s)),
  }),
  "contact-picker": () => ({
    checks: ["contactPicker"],
    steps: [
      "Open this page in Chrome on Android and press <strong>Pick a contact</strong> below.",
      "Choose one or more contacts. The fields you chose come back to the page, which <code>navigator.share()</code> never does.",
    ],
    after: (el) => import("/patterns/contact-probe.js").then((m) => m.run(el)),
  }),
  "related-apps": (s) => ({
    checks: ["relatedApps", "standalone"],
    steps: [
      `Notes lists itself under <code>related_applications</code>, so a page on Notes can ask whether Notes is installed. ${link(s.notes, "Open Notes")} ${link(s.notes + "/manifest.webmanifest", "Notes manifest")}`,
      "Install Notes, open it in an ordinary tab, and run <code>await navigator.getInstalledRelatedApps()</code> in DevTools. The check below asks the same from this origin.",
    ],
    after: (el) => import("/patterns/related-apps-probe.js").then((m) => m.run(el, s)),
  }),
  "app-migration": (s) => ({
    checks: ["standalone"],
    steps: [
      `Open Mover at its old address, which is on this origin, and install it. ${link("/moving/", "Open Mover, old address")}`,
      `Close the app and open it again. A browser with origin migration reads the old manifest, checks it against the new one and against this origin's association file, and offers to update the app to its new address. ${link(s.moved, "Mover, new address")}`,
      "On <code>localhost</code> the two addresses are not on the same site, so the browser will not offer the move. The check below still reads all three declarations.",
    ],
    after: (el) => import("/patterns/migration-probe.js").then((m) => m.run(el, s)),
  }),
  "run-on-os-login": (s) => ({
    checks: ["standalone"],
    steps: [
      `Install Tasks in Chrome on Windows, macOS or Linux, and add a task so that it has a count to show. ${link(s.tasks, "Open Tasks")}`,
      "Open <code>chrome://apps</code>, right-click Tasks and choose <strong>Start app when you sign in</strong>.",
      "Sign out of the computer and sign in again. Tasks opens in its own window, with the count on its icon. The time the window opened is shown in Tasks, under \"This browser\".",
    ],
  }),
  "payment-handler": (s) => ({
    checks: ["paymentRequest"],
    steps: [
      "Press <strong>Pay £4.50 with the Wallet</strong> below, in Chrome. This page is the shop.",
      "The first time, Chrome installs the Wallet's service worker from the Wallet's manifest. Then the Wallet's window opens over this page, on the Wallet's origin.",
      "Press <strong>Approve</strong> in the Wallet. Its receipt comes back to this page. Press <strong>Decline</strong> instead and this page gets an <code>AbortError</code>.",
      `Open the Wallet in a tab. It lists the payment, which its service worker recorded with no Wallet page open. ${link(s.wallet, "Open the Wallet")}`,
    ],
    after: (el) => import("/patterns/pay-probe.js").then((m) => m.run(el, s)),
  }),
  "digital-credentials": () => ({
    checks: ["digitalCredentials"],
    steps: [
      "Press <strong>Ask for proof of age</strong> below, in Chrome 141 or later.",
      "On a phone with a wallet that holds a mobile driving licence, the wallet asks whether to share one claim, <code>age_over_18</code>. On a desktop, Chrome offers to continue on a phone.",
      "Approve it, and the response comes back to this page. Cancel, and this page gets an error. Either way the page says what it received.",
    ],
    after: (el) => import("/patterns/credentials-probe.js").then((m) => m.run(el)),
  }),
  "intents-lineage": () => ({
    checks: ["rph", "launchQueue", "share", "contactPicker", "digitalCredentials"],
    steps: [
      "The table below lists the Web Intents verbs, the API that covers each one today, whether the caller gets a reply, and whether your browser has it.",
      `Each API in the table links to its page here. The gaps are listed on <a href="/missing/">What web app integration is missing</a>.`,
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
