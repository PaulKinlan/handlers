// Inline SVG sequence diagrams for every pattern page. Each diagram maps the
// actors (origins, browser, OS, service worker), the messages or handles that
// cross between them, and where a platform gap (no reply, cross-origin block)
// stops the flow. Uses the site's CSS variables so it adapts to light and dark
// mode with zero external dependencies.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const diagrams = {
  "protocol-handlers": {
    caption: "A link names a scheme, the browser sends it to the origin that registered the scheme, and nothing comes back.",
    actors: [
      { label: "Any page", sub: "Origin A", tone: "a" },
      { label: "Browser / OS", sub: "Scheme registry", tone: "sys" },
      { label: "Notes app", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: 'registerProtocolHandler("web+note", "/?u=%s")', sub: "or protocol_handlers in the manifest, on install" },
      { from: 0, to: 1, label: '<a href="web+note:Hello">', sub: "names the scheme, not Origin B" },
      { from: 1, to: 2, label: "Open /?u=web%2Bnote%3AHello", sub: "the person confirms the first time" },
      { from: 2, to: 0, label: "No reply, and no window.opener", sub: "one way", kind: "gap" },
    ],
  },
  "scheme-detection": {
    caption: "No API says whether a scheme has a handler, so a page can only guess from focus and timing.",
    actors: [
      { label: "Calling page", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "No API to ask", tone: "sys" },
      { label: "Handler app", sub: "If there is one", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "isProtocolHandlerRegistered() was removed", sub: "the page cannot ask before showing a link", kind: "gap" },
      { from: 0, to: 1, label: 'window.open("web+note:probe")', sub: "start a timer; listen for blur and visibilitychange" },
      { from: 1, to: 2, label: "Opens the handler, or shows a prompt", sub: "the calling window may lose focus", kind: "dashed" },
      { from: 1, to: 0, label: "After 1.5 s: guess from what happened", sub: "switching tabs gives the same signals", kind: "dashed" },
    ],
  },
  "launch-handler": {
    caption: "With focus-existing, a second launch goes to the window that is already open and arrives on launchQueue. The page is not reloaded.",
    actors: [
      { label: "Link / file / share", sub: "From the OS", tone: "a" },
      { label: "Browser", sub: "client_mode: focus-existing", tone: "sys" },
      { label: "Notes window", sub: "Installed app", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "First launch: web+note:First" },
      { from: 1, to: 2, label: "Opens a window; the page calls launchQueue.setConsumer()" },
      { from: 0, to: 1, label: "Second launch: web+note:Second" },
      { from: 1, to: 2, label: "Focuses the open window → LaunchParams { targetURL }", sub: "no reload, so the page keeps its state" },
    ],
  },
  "link-capturing": {
    caption: "With handle_links: preferred, the browser opens an ordinary https: link to an installed app in the app's window.",
    actors: [
      { label: "Any page or chat", sub: "An https: link", tone: "a" },
      { label: "Browser", sub: "handle_links and a setting", tone: "sys" },
      { label: "Notes window", sub: "Installed app", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: 'Manifest: handle_links: "preferred"' },
      { from: 0, to: 1, label: "The person follows https://notes…/?new=1" },
      { from: 1, to: 2, label: "Opens it in the installed window", sub: "the person's setting wins over the manifest" },
      { from: 1, to: 0, label: "Origin A cannot tell where the link opened", kind: "gap" },
    ],
  },
  "scope-extensions": {
    caption: "Both sides have to agree: the app's manifest names the other origin, and the other origin's well-known file names the app.",
    actors: [
      { label: "Installed app", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "Checks both sides", tone: "sys" },
      { label: "Second site", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Manifest: scope_extensions: [Origin B]" },
      { from: 1, to: 2, label: "GET /.well-known/web-app-origin-association" },
      { from: 2, to: 1, label: '{ "<Origin A id>": { "scope": "/" } }', sub: "Origin B agrees" },
      { from: 1, to: 0, label: "Links to Origin B open in the app's window", sub: "ignored, with no error, if either side disagrees" },
    ],
  },
  "note-taking": {
    caption: "On ChromeOS, note_taking in the manifest makes the app the one that the stylus menu and the lock screen open for a new note.",
    actors: [
      { label: "Stylus / lock screen", sub: "ChromeOS", tone: "a" },
      { label: "Operating system", sub: "Note-taking app setting", tone: "sys" },
      { label: "Notes app", sub: "Installed app", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: 'Manifest: note_taking.new_note_url = "/?new=1"' },
      { from: 0, to: 1, label: 'The person chooses "Create note"' },
      { from: 1, to: 2, label: "Opens Notes at /?new=1", sub: "on an empty note" },
    ],
  },
  "file-handlers": {
    caption: "Installing the app registers its file types with the operating system. Opening a file gives the page a FileSystemFileHandle on launchQueue.",
    actors: [
      { label: "File manager", sub: "Operating system", tone: "a" },
      { label: "Browser", sub: "file_handlers in the manifest", tone: "sys" },
      { label: "Notes app", sub: "Installed app", tone: "b" },
    ],
    steps: [
      { from: 2, to: 1, label: "Install registers .webnote → action /" },
      { from: 0, to: 1, label: "The person opens hello.webnote" },
      { from: 1, to: 1, label: "Asks, the first time, whether Notes may open it" },
      { from: 1, to: 2, label: "launchQueue: LaunchParams { files: [handle] }", sub: "a handle, not a URL" },
    ],
  },
  "file-save-back": {
    caption: "The app holds a handle to the file, so once the person allows writing, Save replaces the file on disk.",
    actors: [
      { label: "Notes app", sub: "Holds the handle", tone: "b" },
      { label: "Browser", sub: "Asks for permission", tone: "sys" },
      { label: "File on disk", sub: "Operating system", tone: "a" },
    ],
    steps: [
      { from: 2, to: 0, label: "Opened by a launch, the picker or a drop" },
      { from: 0, to: 1, label: "Save → handle.createWritable()" },
      { from: 1, to: 1, label: "Asks the person for readwrite permission" },
      { from: 1, to: 2, label: "Writes a temporary file, swaps it in on close()", sub: "the original is untouched if it fails" },
    ],
  },
  "drag-handles": {
    caption: "Asking for getAsFileSystemHandle() during the drop event gives the page a handle it can write to, instead of a copy.",
    actors: [
      { label: "Desktop or app", sub: "Where the drag starts", tone: "a" },
      { label: "Browser", sub: "drop event", tone: "sys" },
      { label: "Notes / Reader", sub: "Where it lands", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "The person drags hello.webnote onto the window" },
      { from: 2, to: 1, label: "item.getAsFileSystemHandle(), inside the drop handler" },
      { from: 1, to: 2, label: "Returns a FileSystemFileHandle", sub: "other browsers give a File, which is a copy" },
      { from: 2, to: 0, label: "Save writes to the file that was dropped", kind: "dashed" },
    ],
  },
  "os-file-handoff": {
    caption: "A file handle cannot be sent to another origin, so Reader keeps it and lends Charts a MessagePort that Reader can take back.",
    actors: [
      { label: "OS / disk", sub: "file_handlers", tone: "sys" },
      { label: "Reader", sub: "Origin A, holds the handle", tone: "a" },
      { label: "Charts", sub: "Origin B, draws the file", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "launchQueue gives Reader a FileSystemFileHandle" },
      { from: 1, to: 2, label: "postMessage(handle) to another origin → messageerror", sub: "the handle cannot be rebuilt there", kind: "gap" },
      { from: 1, to: 2, label: "Opens Charts and lends it a MessagePort", sub: "describe(), text(), documents(), write()" },
      { from: 2, to: 1, label: "write(csv) → Reader checks its switch and the permission", sub: "Reader writes to disk only if both allow it" },
      { from: 1, to: 2, label: "Reader closes the port; Charts can no longer reach the file", kind: "dashed" },
    ],
  },
  "share-target": {
    caption: "A POST share is a form request. The service worker answers it, keeps what was shared and redirects to the app.",
    actors: [
      { label: "Any app", sub: "Shares something", tone: "a" },
      { label: "Share sheet", sub: "OS", tone: "sys" },
      { label: "Service worker", sub: "Origin B", tone: "sw" },
      { label: "Notes page", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Shares text, a URL or files" },
      { from: 1, to: 2, label: "POST /share (multipart/form-data)" },
      { from: 2, to: 3, label: "Keeps the files → 303 to /?shared=1", sub: "the server answers if the service worker is not running" },
      { from: 3, to: 0, label: "Nothing goes back to the app that shared", kind: "gap" },
    ],
  },
  "web-share": {
    caption: "navigator.share() opens the share sheet from a user gesture and resolves with undefined. The page that shared is not told where it went.",
    actors: [
      { label: "Tasks app", sub: "Origin A", tone: "a" },
      { label: "Share sheet", sub: "Browser / OS", tone: "sys" },
      { label: "The app chosen", sub: "Native or web", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Click → navigator.share({ title, text, files })" },
      { from: 1, to: 2, label: "The person picks an app; the OS hands it over" },
      { from: 1, to: 0, label: "Resolves with undefined (or AbortError)", sub: "nothing says which app got it", kind: "gap" },
    ],
  },
  clipboard: {
    caption: "A custom format with the 'web ' prefix sits on the clipboard next to plain text, and a web app on another origin can read it back unchanged.",
    actors: [
      { label: "Tasks app", sub: "Origin A", tone: "a" },
      { label: "OS clipboard", sub: "One item, two formats", tone: "sys" },
      { label: "Notes app", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "clipboard.write([ClipboardItem])", sub: "text/plain and web application/x-webtasks+json" },
      { from: 2, to: 1, label: "Paste → navigator.clipboard.read()", sub: "needs focus and permission" },
      { from: 1, to: 2, label: "Notes gets the JSON as Tasks wrote it", sub: "other apps read text/plain" },
    ],
  },
  "web-install": {
    caption: "A page calls navigator.install() for itself or for an app on another origin. The browser shows its own dialog and the person decides.",
    actors: [
      { label: "Hub or directory", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "Install dialog", tone: "sys" },
      { label: "The app", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Click → navigator.install(originB, idB)" },
      { from: 1, to: 2, label: "Fetches Origin B's manifest and icons" },
      { from: 1, to: 1, label: "Shows the browser's install dialog" },
      { from: 1, to: 0, label: "Resolves after install; the handlers take effect", kind: "dashed" },
    ],
  },
  badging: {
    caption: "A page or a service worker sets a count on the installed app's icon, and clears it.",
    actors: [
      { label: "Tasks / service worker", sub: "Installed app", tone: "a" },
      { label: "Browser", sub: "Badging API", tone: "sys" },
      { label: "Dock / home screen", sub: "Operating system", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "navigator.setAppBadge(3)", sub: "from a page or a service worker" },
      { from: 1, to: 2, label: "Shows a count or a dot on the icon" },
      { from: 0, to: 1, label: "navigator.clearAppBadge()", sub: "when nothing is left to do" },
    ],
  },
  shortcuts: {
    caption: "The manifest lists the shortcuts. After install they appear in the menu on the app's icon.",
    actors: [
      { label: "Manifest", sub: "shortcuts[]", tone: "a" },
      { label: "Icon menu", sub: "Right-click or long-press", tone: "sys" },
      { label: "Notes app", sub: "Installed window", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'Install registers { name: "New note", url: "/?new=1" }' },
      { from: 1, to: 2, label: 'The person picks "New note" from the icon menu' },
      { from: 2, to: 2, label: "Opens /?new=1 (the list cannot change at runtime)" },
    ],
  },
  "window-chrome": {
    caption: "display_override asks for the title bar area. The browser gives its size in CSS env() variables and the page draws there, next to the window buttons.",
    actors: [
      { label: "Manifest", sub: "display_override", tone: "a" },
      { label: "Window frame", sub: "Window buttons", tone: "sys" },
      { label: "Tasks page", sub: "CSS and JS", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'display_override: ["window-controls-overlay"]' },
      { from: 1, to: 2, label: "env(titlebar-area-x / width / height)", sub: "geometrychange fires when the window is resized" },
      { from: 2, to: 1, label: "Draws the count in the title bar; app-region: drag" },
    ],
  },
  "tabbed-apps": {
    caption: "With tabbed and tab_strip in the manifest, the installed window has a tab strip, a pinned home tab and a new-tab button.",
    actors: [
      { label: "Notes manifest", sub: "display_override + tab_strip", tone: "a" },
      { label: "Window frame", sub: "Tab strip, drawn by the browser", tone: "sys" },
      { label: "Notes tabs", sub: "Home and documents", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'display_override: ["tabbed", "standalone"]' },
      { from: 0, to: 1, label: "tab_strip: home_tab pinned; new_tab_button → /?new=1" },
      { from: 1, to: 2, label: "The person presses + → a new tab in the same window" },
    ],
  },
  "document-pip": {
    caption: "The page opens an always-on-top window on its own origin, moves DOM nodes into it, and takes them back when the window closes.",
    actors: [
      { label: "Tasks tab", sub: "The page", tone: "a" },
      { label: "Browser / OS", sub: "Always-on-top window", tone: "sys" },
      { label: "PiP document", sub: "Same origin", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Click → documentPictureInPicture.requestWindow()" },
      { from: 1, to: 2, label: "Opens a window that stays above other apps" },
      { from: 0, to: 2, label: "Copies the CSS in and moves #tasks-panel across" },
      { from: 2, to: 0, label: "pagehide on close → the page takes the nodes back", kind: "dashed" },
    ],
  },
  "window-management": {
    caption: "Once the person allows it, getScreenDetails() gives the size and position of each screen, and the page opens windows where it wants them.",
    actors: [
      { label: "App page", sub: "From a click", tone: "a" },
      { label: "Browser / OS", sub: "List of screens", tone: "sys" },
      { label: "Other windows", sub: "Reader and Charts", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "window.getScreenDetails() (asks once)" },
      { from: 1, to: 0, label: "Returns the bounds of each screen", kind: "dashed" },
      { from: 0, to: 2, label: "window.open() with left, top, width and height" },
    ],
  },
  "app-migration": {
    caption: "The new origin's manifest names the old app, the old origin's well-known file agrees, and the browser offers the person the move.",
    actors: [
      { label: "New origin", sub: "migrate_from in the manifest", tone: "b" },
      { label: "Browser", sub: "Checks, then asks the person", tone: "sys" },
      { label: "Old origin", sub: "Installed app", tone: "a" },
    ],
    steps: [
      { from: 0, to: 1, label: "New manifest: migrate_from: [old id]", sub: "both origins must be on the same site" },
      { from: 1, to: 2, label: "GET /.well-known/web-app-origin-association" },
      { from: 2, to: 1, label: '{ "<new id>": { "allow_migration": true } }', sub: "the old origin agrees" },
      { from: 1, to: 0, label: "The person accepts → the install moves", sub: "storage and permissions do not", kind: "dashed" },
    ],
  },
  "run-on-os-login": {
    caption: "The person, or a policy, turns on starting at sign-in. The browser then opens the app's window when they sign in.",
    actors: [
      { label: "Sign-in", sub: "Desktop OS", tone: "a" },
      { label: "Browser / policy", sub: "The app's start-up setting", tone: "sys" },
      { label: "Installed app", sub: "A window opens", tone: "b" },
    ],
    steps: [
      { from: 1, to: 0, label: "The person or a policy turns on Run on OS Login" },
      { from: 0, to: 1, label: "The person signs in" },
      { from: 1, to: 2, label: "Opens the app's window (the service worker gets no launch event)" },
    ],
  },
  "related-apps": {
    caption: "getInstalledRelatedApps() only lists apps that both sides have declared, so a site cannot ask about apps that are not its own.",
    actors: [
      { label: "Web page", sub: "Origin A", tone: "a" },
      { label: "Browser", sub: "Checks both declarations", tone: "sys" },
      { label: "Related app", sub: "Native or web", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "Manifest lists related_applications[]" },
      { from: 2, to: 1, label: "The app points back at Origin A" },
      { from: 0, to: 1, label: "navigator.getInstalledRelatedApps()" },
      { from: 1, to: 0, label: "Returns the declared apps that are installed", kind: "dashed" },
    ],
  },
  "payment-handler": {
    caption: "A shop asks, the browser finds and opens the wallet, and the wallet's answer goes back to the shop. Links, files and shares have no such reply.",
    actors: [
      { label: "Shop", sub: "Origin A, this page", tone: "a" },
      { label: "Browser", sub: "Payment Request", tone: "sys" },
      { label: "Wallet", sub: "Origin B, worker and window", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "new PaymentRequest(method, details).show()" },
      { from: 1, to: 2, label: "GET <wallet>/pay → payment method manifest", sub: "then installs the service worker named in the app's manifest" },
      { from: 1, to: 2, label: "paymentrequest event in the wallet's service worker" },
      { from: 2, to: 0, label: "The person approves → PaymentResponse", sub: "the caller gets a reply" },
    ],
  },
  "digital-credentials": {
    caption: "The site asks, the browser and operating system pass the request to a wallet, and the signed response comes back to the site.",
    actors: [
      { label: "Site that asks", sub: "Origin A", tone: "a" },
      { label: "Browser / OS", sub: "Passes the request on", tone: "sys" },
      { label: "Wallet app", sub: "On the device", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "navigator.credentials.get({ digital })" },
      { from: 1, to: 2, label: "Passes the request (OpenID4VP or mdoc) to the wallet" },
      { from: 2, to: 1, label: "The person approves what is shared" },
      { from: 1, to: 0, label: "Returns the signed response", sub: "the caller gets a reply" },
    ],
  },
  "contact-picker": {
    caption: "The page opens the system contact picker and gets back only the entries the person chose.",
    actors: [
      { label: "Web app", sub: "From a click", tone: "a" },
      { label: "Browser / OS", sub: "Contact picker", tone: "sys" },
      { label: "Address book", sub: "On the device", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: 'navigator.contacts.select(["name", "email"])' },
      { from: 1, to: 2, label: "The person chooses contacts and fields" },
      { from: 1, to: 0, label: "Resolves with a copy of what was chosen", sub: "the page never sees the rest of the address book" },
    ],
  },
  "intents-lineage": {
    caption: "Web Intents had one way to ask for an action and get a reply. Today each verb has its own API, and most of them have no reply.",
    actors: [
      { label: "App that asks", sub: "Origin A", tone: "a" },
      { label: "Browser / OS", sub: "One registry per API", tone: "sys" },
      { label: "App that answers", sub: "Origin B", tone: "b" },
    ],
    steps: [
      { from: 0, to: 1, label: "open (web+ or a file) · share() · pay (PaymentRequest)" },
      { from: 1, to: 2, label: "protocol_handlers, file_handlers, share_target, Payment Handler" },
      { from: 2, to: 0, label: "Payments return a reply; links, files and shares stop here", sub: "a MessagePort is the workaround", kind: "gap" },
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
  lines.push(`<title id="diag-title-${esc(id)}">Diagram</title>`);
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
    <div class="diagram-head"><h2>What happens</h2><span class="small muted">Who sends what, in order</span></div>
    <div class="diagram-canvas">${lines.join("\n")}</div>
    <figcaption class="small muted">${esc(spec.caption)}</figcaption>
  </figure>`;
}
