// Inline SVG sequence diagrams for every pattern page. Each diagram maps the
// actors (origins, browser, OS, service worker), the messages or handles that
// cross between them, and where a platform gap (no reply, cross-origin block)
// stops the flow. Uses the site's CSS variables so it adapts to light and dark
// mode with zero external dependencies.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const diagrams = {
  "protocol-handlers": {
    caption: "Custom schemes route a plain link through the browser to whichever origin registered the scheme, with no channel back.",
    actors: [
      { label: "Any page", sub: "Origin A", tone: "a" },
      { label: "Browser / OS", sub: "Scheme registry", tone: "sys" },
      { label: "Notes app", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: 'registerProtocolHandler("web+note", "/?u=%s")', sub: "or manifest protocol_handlers on install" },
      { from: 0, to: 1, label: '<a href="web+note:Hello">', sub: "names the scheme, not Origin B" },
      { from: 1, to: 2, label: "Open /?u=web%2Bnote%3AHello", sub: "user confirms on first use" },
      { from: 2, to: 0, label: "No reply channel or window.opener", sub: "one-way handoff", kind: "gap" },
    ],
  },
  "scheme-detection": {
    caption: "Because no API reports whether a scheme is registered, pages fall back to fragile focus and timing heuristics.",
    actors: [
      { label: "Calling page", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "No query API", tone: "sys" },
      { label: "Handler app", sub: "If registered", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "isProtocolHandlerRegistered() removed", sub: "cannot ask before showing a link", kind: "gap" },
      { from: 0, to: 1, label: 'window.open("web+note:probe")', sub: "start timer; listen for blur / visibilitychange" },
      { from: 1, to: 2, label: "Opens handler or shows prompt", sub: "calling window may lose focus", kind: "dashed" },
      { from: 1, to: 0, label: "After 1.5 s: guess from side effects", sub: "switching tabs causes false positives", kind: "dashed" },
    ],
  },
  "launch-handler": {
    caption: "With focus-existing, a second launch reuses the open window and delivers LaunchParams to launchQueue instead of reloading.",
    actors: [
      { label: "Link / File / Share", sub: "OS trigger", tone: "a" },
      { label: "Browser", sub: "client_mode: focus-existing", tone: "sys" },
      { label: "Notes window", sub: "Installed app", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "1st launch: web+note:First" },
      { from: 1, to: 2, label: "Opens window; page calls launchQueue.setConsumer()" },
      { from: 0, to: 1, label: "2nd launch: web+note:Second" },
      { from: 1, to: 2, label: "Focuses existing window → LaunchParams { targetURL }", sub: "no reload; in-memory state stays intact" },
    ],
  },
  "link-capturing": {
    caption: "With handle_links: preferred, ordinary https: links to an installed app are intercepted by the browser and routed into the app window.",
    actors: [
      { label: "Any page / Chat", sub: "Plain https: link", tone: "a" },
      { label: "Browser", sub: "handle_links + user setting", tone: "sys" },
      { label: "Notes window", sub: "Installed app", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: 'Manifest: handle_links: "preferred"' },
      { from: 0, to: 1, label: "User clicks https://notes…/?new=1" },
      { from: 1, to: 2, label: "Captures navigation into installed window", sub: "user setting overrides manifest hint" },
      { from: 1, to: 0, label: "No API tells Origin A whether link was captured", kind: "gap" },
    ],
  },
  "scope-extensions": {
    caption: "Extending an app's scope across origins requires a two-way agreement: the manifest asks and the other origin's well-known file agrees.",
    actors: [
      { label: "Installed app", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "Verifies handshake", tone: "sys" },
      { label: "Second site", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Manifest declares scope_extensions: [Origin B]" },
      { from: 1, to: 2, label: "GET /.well-known/web-app-origin-association" },
      { from: 2, to: 1, label: '{ "<Origin A id>": { "scope": "/" } }', sub: "explicit opt-in" },
      { from: 1, to: 0, label: "Links to Origin B open inside the app window", sub: "ignored silently if either side disagrees" },
    ],
  },
  "note-taking": {
    caption: "On ChromeOS, the manifest's note_taking member connects the system stylus and lock-screen menus straight to the app.",
    actors: [
      { label: "Stylus / Lock screen", sub: "ChromeOS UI", tone: "a" },
      { label: "Operating system", sub: "Default note app", tone: "sys" },
      { label: "Notes app", sub: "Installed PWA", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: 'Manifest: note_taking.new_note_url = "/?new=1"' },
      { from: 0, to: 1, label: 'User taps "Create note"' },
      { from: 1, to: 2, label: "Launches Notes at /?new=1", sub: "opens directly to a blank note" },
    ],
  },
  "file-handlers": {
    caption: "Installing the app registers its file extensions with the OS; opening a file delivers a live FileSystemFileHandle on launchQueue.",
    actors: [
      { label: "File manager", sub: "Operating system", tone: "a" },
      { label: "Browser", sub: "Manifest file_handlers", tone: "sys" },
      { label: "Notes app", sub: "Installed PWA", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: "Install registers .webnote → action /" },
      { from: 0, to: 1, label: "User opens hello.webnote" },
      { from: 1, to: 1, label: "First-time permission prompt to open file type" },
      { from: 1, to: 2, label: "launchQueue delivers LaunchParams { files: [handle] }", sub: "live handle, not a URL" },
    ],
  },
  "file-save-back": {
    caption: "Because the app holds a FileSystemFileHandle, saving writes atomically back to the same file on disk after write permission.",
    actors: [
      { label: "Notes app", sub: "Holds file handle", tone: "b" },
      { label: "Browser", sub: "Permission gate", tone: "sys" },
      { label: "File on disk", sub: "Operating system", tone: "a" },
    ],
    steps: [
      { from: 2, to: 0, label: "Opened via launchQueue, picker, or drag-and-drop" },
      { from: 0, to: 1, label: "User clicks Save → handle.createWritable()" },
      { from: 1, to: 1, label: "Asks user for readwrite permission" },
      { from: 1, to: 2, label: "Writes temp file, swaps into place on close()", sub: "original stays safe if interrupted" },
    ],
  },
  "drag-handles": {
    caption: "Requesting getAsFileSystemHandle() synchronously during the drop event upgrades a dragged file from a read-only copy to a writable handle.",
    actors: [
      { label: "Desktop / App", sub: "Drag source", tone: "a" },
      { label: "Browser", sub: "drop event", tone: "sys" },
      { label: "Notes / Reader", sub: "Drop target", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "User drags hello.webnote onto the window" },
      { from: 2, to: 1, label: "item.getAsFileSystemHandle() (must run during drop)" },
      { from: 1, to: 2, label: "Returns FileSystemFileHandle", sub: "falls back to read-only File copy elsewhere" },
      { from: 2, to: 0, label: "Save writes back to the dropped file on disk", kind: "dashed" },
    ],
  },
  "os-file-handoff": {
    caption: "File handles cannot cross origins, so Reader keeps the OS handle and lends Charts a revocable Hawser MessagePort instead.",
    actors: [
      { label: "OS / Disk", sub: "file_handlers", tone: "sys" },
      { label: "Reader", sub: "Origin A (holds handle)", tone: "a" },
      { label: "Charts", sub: "Origin B (renderer)", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "launchQueue delivers FileSystemFileHandle" },
      { from: 1, to: 2, label: "postMessage(handle) cross-origin → messageerror", sub: "cannot transfer handles across origins", kind: "gap" },
      { from: 1, to: 2, label: "Opens Charts + lends narrowed MessagePort", sub: "describe(), text(), documents(), write()" },
      { from: 2, to: 1, label: "write(csv) → Reader checks toggle & permission", sub: "Reader writes to Disk only if allowed" },
      { from: 1, to: 2, label: "revoke() closes the port; Charts loses access", kind: "dashed" },
    ],
  },
  "share-target": {
    caption: "A POST share arrives as a multipart form request intercepted by the service worker, which stashes the payload and redirects to the app.",
    actors: [
      { label: "Any app", sub: "Sender", tone: "a" },
      { label: "Share sheet", sub: "OS", tone: "sys" },
      { label: "Service worker", sub: "Origin B", tone: "sw" },
      { label: "Notes page", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Shares text, URL, or files" },
      { from: 1, to: 2, label: "POST /share (multipart/form-data)" },
      { from: 2, to: 3, label: "Caches files → 303 redirect to /?shared=1", sub: "Worker fallback if SW is cold" },
      { from: 3, to: 0, label: "No response returns to the sharing app", kind: "gap" },
    ],
  },
  "web-share": {
    caption: "navigator.share() hands content to the OS share sheet on a user gesture, but resolves with undefined so the sender never learns the outcome.",
    actors: [
      { label: "Tasks app", sub: "Origin A", tone: "a" },
      { label: "System share sheet", sub: "Browser / OS", tone: "sys" },
      { label: "Chosen app", sub: "Native or PWA", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "User click → navigator.share({ title, text, files })" },
      { from: 1, to: 2, label: "User picks destination; OS delivers payload" },
      { from: 1, to: 0, label: "Resolves with undefined (or AbortError)", sub: "sender never sees which app or any result", kind: "gap" },
    ],
  },
  clipboard: {
    caption: "Web Custom Formats ('web ' prefix) let two unrelated origins exchange unsanitised structured data through the OS clipboard alongside plain text.",
    actors: [
      { label: "Tasks app", sub: "Origin A", tone: "a" },
      { label: "OS Clipboard", sub: "Multi-format item", tone: "sys" },
      { label: "Notes app", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "clipboard.write([ClipboardItem])", sub: "text/plain + web application/x-webtasks+json" },
      { from: 2, to: 1, label: "User clicks Paste → navigator.clipboard.read()", sub: "requires focus and permission" },
      { from: 1, to: 2, label: "Delivers structured JSON tasks untouched", sub: "other apps read the text/plain fallback" },
    ],
  },
  "web-install": {
    caption: "navigator.install() lets a page—or a directory on another origin—request installation through a browser-controlled consent dialog.",
    actors: [
      { label: "Hub / Catalog", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "Install dialog", tone: "sys" },
      { label: "Target app", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "User click → navigator.install(originB, idB)" },
      { from: 1, to: 2, label: "Fetches Origin B manifest & icons" },
      { from: 1, to: 1, label: "Shows browser install confirmation dialog" },
      { from: 1, to: 0, label: "Resolves after install; OS handlers activate", kind: "dashed" },
    ],
  },
  badging: {
    caption: "Either the open page or a background service worker can set or clear a count on the installed app's OS icon.",
    actors: [
      { label: "Tasks / SW", sub: "Installed app", tone: "a" },
      { label: "Browser", sub: "Badging API", tone: "sys" },
      { label: "Dock / Home screen", sub: "Operating system", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "navigator.setAppBadge(3)", sub: "works from page or service worker" },
      { from: 1, to: 2, label: "Shows count or dot on the app icon" },
      { from: 0, to: 1, label: "navigator.clearAppBadge()", sub: "removes badge when open tasks hit 0" },
    ],
  },
  shortcuts: {
    caption: "Shortcuts are declared statically in the manifest and surfaced in the OS icon context menu after install.",
    actors: [
      { label: "Manifest", sub: "Static shortcuts[]", tone: "a" },
      { label: "OS icon menu", sub: "Right-click / long-press", tone: "sys" },
      { label: "Notes app", sub: "Installed window", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'Install registers { name: "New note", url: "/?new=1" }' },
      { from: 1, to: 2, label: 'User picks "New note" from app icon menu' },
      { from: 2, to: 2, label: "Opens /?new=1 (list cannot be updated at runtime)" },
    ],
  },
  "window-chrome": {
    caption: "display_override hands the title-bar strip to the page via CSS env() variables so the app can render controls alongside OS window buttons.",
    actors: [
      { label: "Manifest", sub: "display_override", tone: "a" },
      { label: "Browser frame", sub: "Window controls", tone: "sys" },
      { label: "Tasks page", sub: "CSS + JS", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'display_override: ["window-controls-overlay"]' },
      { from: 1, to: 2, label: "Exposes env(titlebar-area-x / width / height)", sub: "fires geometrychange on resize" },
      { from: 2, to: 1, label: "Draws count in title bar; sets app-region: drag" },
    ],
  },
  "tabbed-apps": {
    caption: "tabbed display mode plus tab_strip lets an installed desktop app keep a pinned home tab and open documents in native app tabs.",
    actors: [
      { label: "Notes manifest", sub: "display_override + tab_strip", tone: "a" },
      { label: "App window frame", sub: "Browser tab strip", tone: "sys" },
      { label: "Notes tabs", sub: "Home + document tabs", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'display_override: ["tabbed", "standalone"]' },
      { from: 0, to: 1, label: "tab_strip: pinned home_tab + new_tab_button (/?new=1)" },
      { from: 1, to: 2, label: "User clicks + → opens new tab inside same app window" },
    ],
  },
  "document-pip": {
    caption: "Document Picture-in-Picture opens a same-origin always-on-top OS window and moves live DOM nodes into it, returning them on close.",
    actors: [
      { label: "Tasks tab", sub: "Main document", tone: "a" },
      { label: "Browser / OS", sub: "Always-on-top window", tone: "sys" },
      { label: "PiP document", sub: "Same origin", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "User click → documentPictureInPicture.requestWindow()" },
      { from: 1, to: 2, label: "Opens floating OS window above other apps" },
      { from: 0, to: 2, label: "Copies CSS & moves live #tasks-panel DOM in" },
      { from: 2, to: 0, label: "pagehide fires on close → DOM docks back cleanly", kind: "dashed" },
    ],
  },
  "window-management": {
    caption: "After permission, getScreenDetails() exposes every monitor's geometry so an app can tile companion windows across displays.",
    actors: [
      { label: "App page", sub: "User gesture", tone: "a" },
      { label: "Browser / OS", sub: "Display list", tone: "sys" },
      { label: "Companion windows", sub: "Reader + Charts", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "window.getScreenDetails() (prompts once)" },
      { from: 1, to: 0, label: "Returns ScreenDetailed[] with exact bounds", kind: "dashed" },
      { from: 0, to: 2, label: "window.open() with left/top/width/height per display" },
    ],
  },
  "app-migration": {
    caption: "migrate_from uses the same well-known two-way handshake as scope_extensions to move an installed app cleanly onto a new origin.",
    actors: [
      { label: "New origin", sub: "Manifest migrate_from", tone: "b" },
      { label: "Browser", sub: "Verifies & prompts user", tone: "sys" },
      { label: "Old origin", sub: "Installed app", tone: "a" },
    ],
    steps: [
      { from: 0, to: 1, label: "New manifest declares migrate_from: [old id]" },
      { from: 1, to: 2, label: "GET /.well-known/web-app-origin-association" },
      { from: 2, to: 1, label: "Old origin confirms new manifest id" },
      { from: 1, to: 0, label: "User accepts → OS icon & handlers move (storage does not)", kind: "dashed" },
    ],
  },
  "run-on-os-login": {
    caption: "Startup launch is configured via OS/browser settings or enterprise policy and opens the installed app window at sign-in.",
    actors: [
      { label: "OS Sign-in", sub: "Desktop boot", tone: "a" },
      { label: "Browser / Policy", sub: "App login setting", tone: "sys" },
      { label: "Installed PWA", sub: "Window opens", tone: "b" },
    ],
    steps: [
      { from: 1, to: 0, label: "User or enterprise policy enables Run on OS Login" },
      { from: 0, to: 1, label: "User signs in to operating system" },
      { from: 1, to: 2, label: "Launches app window (no headless SW launch event)" },
    ],
  },
  "related-apps": {
    caption: "getInstalledRelatedApps() only reports apps that share a two-way declaration, preventing arbitrary sites from probing what is installed.",
    actors: [
      { label: "Web page", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "Verifies mutual link", tone: "sys" },
      { label: "Related app", sub: "Native or PWA", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Manifest lists related_applications[]" },
      { from: 2, to: 1, label: "App asset links / manifest points back to Origin A" },
      { from: 0, to: 1, label: "navigator.getInstalledRelatedApps()" },
      { from: 1, to: 0, label: "Returns only verified, installed matches", kind: "dashed" },
    ],
  },
  "payment-handler": {
    caption: "Unlike links, files, and shares, Payment Handler is a full request/response loop brokered by the browser.",
    actors: [
      { label: "Merchant", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "Payment Request UI", tone: "sys" },
      { label: "Wallet app", sub: "Origin B (SW + window)", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: "Registers payment method manifest & instrument" },
      { from: 0, to: 1, label: "new PaymentRequest(method, details).show()" },
      { from: 1, to: 2, label: "Wakes Wallet SW (paymentrequest) & opens sheet" },
      { from: 2, to: 0, label: "User approves → returns signed PaymentResponse", sub: "complete round trip with a reply" },
    ],
  },
  "digital-credentials": {
    caption: "Digital Credentials brokers a verification request through the browser and OS to a wallet app, returning a signed presentation to the site.",
    actors: [
      { label: "Relying site", sub: "Origin A", tone: "a" },
      { label: "Browser / OS", sub: "Credential broker", tone: "sys" },
      { label: "Wallet app", sub: "Native / OS wallet", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "navigator.credentials.get({ digital })" },
      { from: 1, to: 2, label: "Forwards request (OpenID4VP / mDoc) to wallet" },
      { from: 2, to: 1, label: "User approves specific claims in wallet" },
      { from: 1, to: 0, label: "Returns signed DigitalCredential response", sub: "brokered round trip with a reply" },
    ],
  },
  "contact-picker": {
    caption: "Contact Picker opens the native address book on Android Chrome and returns only the user-selected entries to the calling page.",
    actors: [
      { label: "Web app", sub: "User gesture", tone: "a" },
      { label: "Browser / OS", sub: "Native contact sheet", tone: "sys" },
      { label: "Address book", sub: "Device contacts", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'navigator.contacts.select(["name", "email"])' },
      { from: 1, to: 2, label: "User chooses specific contacts & fields" },
      { from: 1, to: 0, label: "Resolves with selected snapshot only", sub: "returns data without full address-book access" },
    ],
  },
  "intents-lineage": {
    caption: "Web Intents aimed for one brokered verb/reply model; today each verb has its own API and almost none carry a reply back.",
    actors: [
      { label: "Calling app", sub: "Origin A", tone: "a" },
      { label: "Browser / OS", sub: "Separate registries", tone: "sys" },
      { label: "Provider app", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "open (web+ / file) · share() · pay (PaymentRequest)" },
      { from: 1, to: 2, label: "Routes via protocol_handlers, file_handlers, share_target, Payment" },
      { from: 2, to: 0, label: "Only Payment returns a reply; links, files & shares stop here", sub: "MessagePort handoff is the manual bridge", kind: "gap" },
    ],
  },
};

const TONE = {
  a: { stroke: "var(--ink)", fill: "var(--panel)", badge: "var(--accent)", badgeInk: "#ffffff" },
  b: { stroke: "var(--teal)", fill: "var(--panel)", badge: "var(--teal)", badgeInk: "#ffffff" },
  sys: { stroke: "var(--muted)", fill: "var(--paper)", badge: "var(--muted)", badgeInk: "var(--paper)" },
  sw: { stroke: "var(--ink)", fill: "var(--paper)", badge: "var(--ink)", badgeInk: "var(--paper)" },
};

export function renderDiagram(id) {
  const spec = diagrams[id];
  if (!spec) return "";

  const W = 760;
  const n = spec.actors.length;
  const padX = n === 4 ? 14 : 20;
  const gap = n === 4 ? 16 : 36;
  const boxW = Math.floor((W - padX * 2 - gap * (n - 1)) / n);
  const boxH = 48;
  const topY = 14;
  const xs = spec.actors.map((_, i) => Math.round(padX + i * (boxW + gap) + boxW / 2));

  const rowH = 66;
  const startY = topY + boxH + 42;
  const H = startY + (spec.steps.length - 1) * rowH + 46;

  const lines = [];
  lines.push(`<svg class="diagram-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="diag-title-${esc(id)} diag-desc-${esc(id)}">`);
  lines.push(`<title id="diag-title-${esc(id)}">Workflow diagram</title>`);
  lines.push(`<desc id="diag-desc-${esc(id)}">${esc(spec.caption)}</desc>`);
  lines.push(`<defs>
    <marker id="arr-ink-${esc(id)}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--ink)"/>
    </marker>
    <marker id="arr-gap-${esc(id)}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--red)"/>
    </marker>
  </defs>`);

  // Lifelines behind everything
  for (let i = 0; i < n; i++) {
    const tone = TONE[spec.actors[i].tone] || TONE.sys;
    lines.push(`<line x1="${xs[i]}" y1="${topY + boxH}" x2="${xs[i]}" y2="${H - 14}" stroke="${tone.stroke}" stroke-opacity="0.32" stroke-width="2" stroke-dasharray="5 5"/>`);
  }

  // Actor header boxes
  for (let i = 0; i < n; i++) {
    const a = spec.actors[i];
    const tone = TONE[a.tone] || TONE.sys;
    const bx = xs[i] - boxW / 2;
    const dash = a.tone === "sys" || a.tone === "sw" ? ' stroke-dasharray="6 4"' : "";
    lines.push(`<rect x="${bx}" y="${topY}" width="${boxW}" height="${boxH}" rx="12" fill="${tone.fill}" stroke="${tone.stroke}" stroke-width="2"${dash}/>`);
    lines.push(`<text x="${xs[i]}" y="${topY + 21}" text-anchor="middle" fill="var(--ink)" font-family="var(--display)" font-weight="700" font-size="14">${esc(a.label)}</text>`);
    if (a.sub) {
      lines.push(`<text x="${xs[i]}" y="${topY + 38}" text-anchor="middle" fill="var(--muted)" font-family="var(--body)" font-size="11.5">${esc(a.sub)}</text>`);
    }
  }

  // Steps
  spec.steps.forEach((step, idx) => {
    const y = startY + idx * rowH;
    const isGap = step.kind === "gap";
    const isDashed = step.kind === "dashed" || isGap;
    const stroke = isGap ? "var(--red)" : "var(--ink)";
    const marker = isGap ? `url(#arr-gap-${esc(id)})` : `url(#arr-ink-${esc(id)})`;
    const num = idx + 1;

    if (step.from === step.to) {
      const cx = xs[step.from];
      const pillW = Math.min(340, Math.max(210, step.label.length * 6.8 + 44));
      const px = Math.max(12, Math.min(W - pillW - 12, cx - pillW / 2));
      lines.push(`<rect x="${px}" y="${y - 20}" width="${pillW}" height="34" rx="10" fill="var(--paper)" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
      lines.push(`<circle cx="${px + 16}" cy="${y - 3}" r="9" fill="${isGap ? "var(--red)" : "var(--ink)"}"/>`);
      lines.push(`<text x="${px + 16}" y="${y + 1}" text-anchor="middle" fill="var(--paper)" font-family="var(--body)" font-weight="700" font-size="10.5">${num}</text>`);
      lines.push(`<text x="${px + 32}" y="${y + 1}" fill="var(--ink)" font-family="var(--body)" font-weight="600" font-size="12.5">${esc(step.label)}</text>`);
      return;
    }

    const x1 = xs[step.from];
    const x2 = xs[step.to];
    const dir = x2 > x1 ? 1 : -1;
    const ax1 = x1 + dir * 10;
    const ax2 = x2 - dir * 10;
    const midX = (x1 + x2) / 2;

    // Arrow line
    lines.push(`<line x1="${ax1}" y1="${y}" x2="${ax2}" y2="${y}" stroke="${stroke}" stroke-width="2"${isDashed ? ' stroke-dasharray="6 4"' : ""} marker-end="${marker}"/>`);

    // Step number pill at origin of arrow
    const badgeX = x1;
    lines.push(`<circle cx="${badgeX}" cy="${y}" r="10" fill="${isGap ? "var(--red)" : "var(--accent)"}"/>`);
    lines.push(`<text x="${badgeX}" y="${y + 3.5}" text-anchor="middle" fill="#ffffff" font-family="var(--body)" font-weight="700" font-size="11">${isGap ? "✕" : num}</text>`);

    // Background halo pill for label so lifelines never cut through text
    const labelW = Math.min(W - 40, Math.max(120, step.label.length * 6.5 + 18));
    const lx = Math.max(16, Math.min(W - labelW - 16, midX - labelW / 2));
    const textCenter = lx + labelW / 2;
    lines.push(`<rect x="${lx}" y="${y - 25}" width="${labelW}" height="19" rx="5" fill="var(--surface)" fill-opacity="0.96"/>`);
    lines.push(`<text x="${textCenter}" y="${y - 11}" text-anchor="middle" fill="${isGap ? "var(--red)" : "var(--ink)"}" font-family="var(--mono)" font-weight="600" font-size="11.5">${esc(step.label)}</text>`);

    if (step.sub) {
      const subW = Math.min(W - 40, Math.max(100, step.sub.length * 5.8 + 16));
      const sx = Math.max(16, Math.min(W - subW - 16, midX - subW / 2));
      lines.push(`<rect x="${sx}" y="${y + 6}" width="${subW}" height="17" rx="5" fill="var(--surface)" fill-opacity="0.96"/>`);
      lines.push(`<text x="${sx + subW / 2}" y="${y + 18}" text-anchor="middle" fill="var(--muted)" font-family="var(--body)" font-size="11">${esc(step.sub)}</text>`);
    }
  });

  lines.push(`</svg>`);
  return `<figure class="panel diagram">
    <div class="diagram-head"><h2>How it flows</h2><span class="small muted">Actors, origin boundaries and handoffs</span></div>
    <div class="diagram-canvas">${lines.join("\n")}</div>
    <figcaption class="small muted">${esc(spec.caption)}</figcaption>
  </figure>`;
}
