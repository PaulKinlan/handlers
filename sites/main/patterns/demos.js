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
  "launch-handler": (s) => ({
    checks: ["launchQueue", "standalone"],
    steps: [
      `Install Notes (<code>focus-existing</code>) and Tasks (<code>navigate-existing</code>). ${link(s.notes, "Open Notes")} ${link(s.tasks, "Open Tasks")}`,
      `With Notes open, follow these two links one after the other. Both arrive in the same window, listed under "What arrived". ${link("web+note:First", "web+note:First")} ${link("web+note:Second", "web+note:Second")}`,
    ],
  }),
  "file-handlers": (s) => ({
    checks: ["launchQueue", "launchParams", "standalone"],
    steps: [
      `Install Notes. ${link(s.notes, "Open Notes")}`,
      `Download a sample file. ${link("/samples/hello.webnote", "hello.webnote")} ${link("/samples/list.webtasks", "list.webtasks (for Tasks)")}`,
      "Open the file from your file manager with Open with, Handlers Notes. The browser asks once whether Notes may open it.",
    ],
  }),
  "file-save-back": (s) => ({
    checks: ["launchParams", "picker"],
    steps: [`In Notes, open <code>hello.webnote</code> (by launch or with Open a file), change it, and press Save. Then open the file in a text editor. ${link(s.notes, "Open Notes")}`],
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
  badging: (s) => ({
    checks: ["standalone"],
    steps: [`Install Tasks and add a few tasks. The icon shows how many are not done. ${link(s.tasks, "Open Tasks")}`],
  }),
  "os-file-handoff": (s) => ({
    checks: ["launchQueue", "launchParams", "picker", "standalone"],
    steps: [
      `Install Reader and Charts from desktop Chrome or Edge. Each is on its own origin. ${link(s.reader, "Open Reader")} ${link(s.charts, "Open Charts")}`,
      `In your file manager, open a <code>.csv</code> file with Open with, Handlers Reader. No CSV to hand? Download one, or press "Use a sample file" in the Reader. ${link("/samples/plants.csv", "plants.csv")}`,
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
