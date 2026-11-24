// Every way a web app can hook into the operating system or another app, one
// entry per page. The page at /patterns/<id>/ is drawn from this list by
// _page.html in four parts: the live demo, how it works, what you could build
// with it, and what goes wrong.
//
// state: "live" has a running demo in this repo, "planned" does not yet.
// app:   which demo app carries the live demo, if any.
// links: primary sources first (specifications, explainers, MDN).
// blog:  Paul's own posts on the same idea, on paul.kinlan.me.
// pa:    related pages on Port Authority (port-authority.dev).

const BLOG = "https://paul.kinlan.me/";
const PA = "https://port-authority.dev/";

export const groups = [
  { id: "links", title: "Links into apps", blurb: "A URL, or a URL scheme, that opens an installed app instead of a tab." },
  { id: "files", title: "Files", blurb: "The operating system hands a file to a web app, and the app can save back to it." },
  { id: "sharing", title: "Sharing", blurb: "Content moves from one app to another through the system share sheet or the clipboard." },
  { id: "presence", title: "Presence in the OS", blurb: "An installed app shows up where native apps do: badges, shortcuts, the title bar." },
  { id: "between", title: "Between apps", blurb: "One app asks for something and the system, or the person, picks which app provides it." },
];

export const all = [
  // ------------------------------------------------------------ links
  {
    id: "protocol-handlers", group: "links", state: "live", app: "notes",
    title: "Custom URL schemes: web+note:",
    blurb: "A site asks the browser to send every <code>web+note:</code> link to it. Any page on any origin can then link to the app without knowing its address.",
    how: [
      "There are two ways to register. In a page, <code>navigator.registerProtocolHandler(\"web+note\", \"/?u=%s\")</code> asks the person once and works in a normal tab. In the manifest, <code>protocol_handlers</code> registers the same thing when the app is installed, and the browser asks the first time the app is launched from a link.",
      "When a link with that scheme is followed, the browser replaces <code>%s</code> with the whole link, escaped, and opens the handler URL on the app's own origin. The app reads its query string; nothing is passed to it in any other way.",
      "The handler URL must be on the same origin as the page or manifest that registers it, and must be HTTPS (or localhost).",
    ],
    build: [
      "A notes or bookmarking app that any page can send a snippet to with a plain link.",
      "A web mail client that becomes the handler for <code>mailto:</code>, one of the schemes the HTML standard safelists.",
      "A calendar that handles <code>webcal:</code> subscription links.",
      "A chat app that handles <code>xmpp:</code> or <code>matrix:</code> links.",
      "A decentralised-identity or wallet app that handles <code>did:</code>, <code>ethereum:</code> or <code>bitcoin:</code>.",
      "Several apps that all handle the same <code>web+</code> scheme, so the person picks which one opens it. This is the shape Web Intents had.",
    ],
    traps: [
      "No API says whether a handler is registered. <code>isProtocolHandlerRegistered</code> was removed from the standard. A link to an unregistered scheme fails without an error the page can see.",
      "Custom schemes must start with <code>web+</code> followed by lowercase ASCII letters. Anything else must be on the safelist.",
      "Safari does not implement <code>registerProtocolHandler</code>. Manifest <code>protocol_handlers</code> is Chromium on desktop only.",
      "The value arrives escaped once. Decoding it twice, or not at all, gives the wrong text for links that contain <code>%</code> or <code>&amp;</code>.",
      "Treat the incoming URL as untrusted input. Any page can construct one.",
    ],
    links: [
      ["HTML: custom scheme handlers", "https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers"],
      ["Manifest incubations: protocol_handlers", "https://wicg.github.io/manifest-incubations/"],
      ["MDN: registerProtocolHandler()", "https://developer.mozilla.org/en-US/docs/Web/API/Navigator/registerProtocolHandler"],
    ],
    blog: [["Detecting if a URL scheme can be handled", BLOG + "detecting-if-a-url-scheme-can-be-handled/"], ["What happened to Web Intents?", BLOG + "what-happened-to-web-intents/"]],
    pa: [["Port Authority: Web Intents for the agent era", PA]],
    related: ["scheme-detection", "launch-handler", "intents-lineage"],
  },
  {
    id: "scheme-detection", group: "links", state: "live",
    title: "Can this link be opened at all?",
    blurb: "Before showing a <code>web+note:</code> link, a page would like to know if anything will handle it. The platform has no API for that.",
    how: [
      "The only signals are side effects: the page losing focus when an external handler opens, or a popup window navigating off <code>about:blank</code>. Each is a heuristic and each browser behaves differently.",
      "The check on this page runs those heuristics in your browser against <code>web+note:</code> and against a scheme nothing handles, and lists what it saw.",
    ],
    build: ["A link that falls back to the web address of the app when the scheme is not handled.", "An install prompt shown only when the handler is missing."],
    traps: ["Heuristics based on focus or timing give false results when the person switches away, or when the browser shows its own prompt first.", "Probing for installed handlers is a fingerprinting vector, which is why browsers do not expose it."],
    links: [["HTML: custom scheme handlers", "https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers"]],
    blog: [["Detecting if a URL scheme can be handled", BLOG + "detecting-if-a-url-scheme-can-be-handled/"]],
    related: ["protocol-handlers"],
  },
  {
    id: "launch-handler", group: "links", state: "live", app: "notes",
    title: "One window, many launches: launch_handler",
    blurb: "When a link, a file or a share opens an app that is already running, <code>launch_handler</code> decides whether a new window opens or the existing one is reused.",
    how: [
      "The manifest sets <code>launch_handler.client_mode</code> to <code>navigate-new</code>, <code>navigate-existing</code>, <code>focus-existing</code> or <code>auto</code>.",
      "With <code>focus-existing</code> the window is brought forward and is not navigated. The page receives the launch through <code>window.launchQueue.setConsumer()</code>, with <code>targetURL</code> and, for file launches, <code>files</code>.",
      "The notes app uses <code>focus-existing</code>, so a second <code>web+note:</code> link adds a note to the open window instead of opening another one.",
    ],
    build: ["An editor that opens each file in a tab of one window.", "A media player where a new link adds to the queue instead of interrupting playback.", "A chat app where a link to a conversation switches to it in the open window."],
    traps: [
      "With <code>focus-existing</code>, the page has to handle <code>targetURL</code> itself. If it does not, the launch appears to do nothing.",
      "Call <code>setConsumer()</code> early. Launches that arrive before it are queued, but only for the current document.",
      "Only applies to installed apps, in Chromium.",
    ],
    links: [["Web App Launch Handler explainer", "https://github.com/WICG/web-app-launch"], ["Manifest incubations: launch_handler", "https://wicg.github.io/manifest-incubations/"]],
    related: ["protocol-handlers", "link-capturing", "file-handlers"],
  },
  {
    id: "link-capturing", group: "links", state: "live", app: "notes",
    title: "Plain https: links into an app: handle_links",
    blurb: "An ordinary <code>https:</code> link to a site the person has installed opens in the app's window instead of a tab.",
    how: [
      "<code>handle_links</code> in the manifest says where links inside the app's scope should open: in the installed app (<code>preferred</code>), in a tab (<code>not-preferred</code>), or wherever the browser decides (<code>auto</code>). It is a hint, and the person's setting wins.",
      "Notes has <code>handle_links: \"preferred\"</code> and <code>client_mode: \"focus-existing\"</code>. With link capturing on, an ordinary link to Notes from the hub goes to the Notes window that is already open.",
      "The person can turn link capturing on or off for each app in Chrome's app settings. The page that has the link cannot find out which way it will go.",
    ],
    build: [
      "A link to a document, sent in chat or email, that opens in the installed editor.",
      "A docs site whose links to the app open in the app's window.",
    ],
    traps: [
      "The person's setting wins over the manifest, and no API reports the setting.",
      "What happens depends on the operating system, the Chromium version and how the link is opened (<code>target=\"_blank\"</code> or the same tab).",
      "Links to another origin are not captured unless that origin agrees through <code>scope_extensions</code>.",
    ],
    links: [
      ["PWA URL / Link Capturing explainer", "https://github.com/WICG/pwa-url-handler/blob/main/handle_links/explainer.md"],
      ["Web App Launch Handler API", "https://wicg.github.io/web-app-launch/"],
    ],
    blog: [["Deep web app linking", BLOG + "deep-web-app-linking/"]],
    related: ["launch-handler", "scope-extensions"],
  },
  {
    id: "scope-extensions", group: "links", state: "live", app: "notes",
    title: "One app across several origins: scope_extensions",
    blurb: "An app whose pages live on more than one origin asks for links to all of them to open in the installed app.",
    how: [
      "The manifest lists the other origins under <code>scope_extensions</code>, and each of those origins publishes a <code>/.well-known/web-app-origin-association</code> file that names the app's manifest <code>id</code> and the <code>scope</code> it may have.",
      "On this site, Notes lists the hub's origin in its manifest, and the hub serves <code>/.well-known/web-app-origin-association</code> agreeing that Notes may have <code>/patterns/scope-extensions/</code>. The Worker writes both, so they match locally and deployed.",
      "This replaces the earlier <code>url_handlers</code> experiment. <code>migrate_from</code> uses the same file.",
    ],
    build: ["A product whose app and docs are on different subdomains.", "A regional site on several country domains that installs as one app."],
    traps: ["Both sides must agree, or the extension is ignored without an error.", "Whether it is on, and behind which flag, changes between Chromium versions.", "No script API tells a page whether the browser accepted the association."],
    links: [["scope_extensions explainer", "https://github.com/WICG/manifest-incubations/blob/gh-pages/scope_extensions-explainer.md"]],
    related: ["link-capturing", "app-migration", "launch-handler"],
  },
  {
    id: "note-taking", group: "links", state: "live", app: "notes",
    title: "The system's \"new note\" button: note_taking",
    blurb: "On ChromeOS a web app can be the note-taking app, opened by the stylus menu and the lock screen.",
    how: ["The manifest sets <code>note_taking.new_note_url</code>. The system opens that URL when the person asks for a new note."],
    build: ["The notes app in this repo, as the system note-taking app."],
    traps: ["ChromeOS only."],
    links: [["Manifest incubations: note_taking", "https://wicg.github.io/manifest-incubations/"]],
    related: ["shortcuts"],
  },

  // ------------------------------------------------------------ files
  {
    id: "file-handlers", group: "files", state: "live", app: "notes",
    title: "Open with: file_handlers",
    blurb: "An installed web app tells the operating system which file types it opens. Double-clicking a <code>.webnote</code> file then launches the notes app with the file.",
    how: [
      "The manifest lists <code>file_handlers</code>: an <code>action</code> URL and an <code>accept</code> map of MIME types to extensions. Installing the app registers it with the operating system.",
      "The file does not arrive as a URL. The page gets <code>FileSystemFileHandle</code>s from <code>launchQueue.setConsumer()</code>, and can read them, and after asking, write back to the same file.",
      "Download the sample file from the hub, open it from your file manager with the installed notes app, edit it, and save.",
    ],
    build: [
      "A text or code editor that is the default app for a file type.",
      "An image viewer for a format the operating system does not preview.",
      "A CSV or spreadsheet viewer, including one that hands the file on to a chart app on another origin (see OS file handoff).",
      "A diagram tool for its own file format, so files can be emailed and opened directly.",
    ],
    traps: [
      "Chromium on desktop only, and only for installed apps.",
      "The first time, the browser asks the person to allow the app to open the file. Saving back asks for write permission again.",
      "The action URL must be inside the app's scope.",
      "Changes to <code>file_handlers</code> reach the operating system only when the browser updates the installed manifest.",
    ],
    links: [["File handling explainer", "https://github.com/WICG/manifest-incubations/blob/gh-pages/file-handling-explainer.md"], ["File System Access", "https://wicg.github.io/file-system-access/"], ["MDN: LaunchQueue", "https://developer.mozilla.org/en-US/docs/Web/API/LaunchQueue"]],
    blog: [["Web sites as unintended silos", BLOG + "unintended-silos/"]],
    related: ["file-save-back", "os-file-handoff", "launch-handler"],
  },
  {
    id: "file-save-back", group: "files", state: "live", app: "notes",
    title: "Save to the file you opened",
    blurb: "A file handle from a launch, a picker or a drop can be written back, so a web app edits files in place like a native editor.",
    how: ["<code>handle.createWritable()</code> asks for write permission, then replaces the file's contents when the stream closes. The notes app does this when you press Save after opening a file."],
    build: ["Any editor launched by file_handlers.", "Recent files kept as handles in IndexedDB, reopened later after a permission prompt."],
    traps: ["Permission is per handle and can lapse when the app closes.", "Writes go to a temporary file first and replace the original on <code>close()</code>; a crash before that leaves the original unchanged."],
    links: [["File System Access", "https://wicg.github.io/file-system-access/"]],
    related: ["file-handlers", "drag-handles"],
  },
  {
    id: "drag-handles", group: "files", state: "live", app: "notes",
    title: "Dragging files between apps",
    blurb: "A file dragged from the desktop or another app arrives as a handle, not a copy, so the app can save back to it.",
    how: ["In a <code>drop</code> event, <code>DataTransferItem.getAsFileSystemHandle()</code> returns a handle for files and folders."],
    build: ["Drag a <code>.webnote</code> file onto the notes window to open it in place.", "Drag a folder onto an app to open a whole project."],
    traps: ["The handle must be requested during the drop event, before it returns.", "Chromium only."],
    links: [["File System Access: drag and drop", "https://wicg.github.io/file-system-access/"]],
    related: ["file-save-back"],
  },
  {
    id: "os-file-handoff", group: "files", state: "live", app: "reader",
    title: "A file from the OS, lent to an app on another origin",
    blurb: "An installed app opens a file from the operating system, then lends an app on another origin a <code>MessagePort</code> to that file instead of the file itself. It decides each save and can take the port back.",
    how: [
      "The Reader's manifest lists <code>file_handlers</code> for <code>.csv</code>, <code>.txt</code> and <code>.md</code>, and sets <code>launch_handler.client_mode</code> to <code>focus-existing</code>. The operating system starts the app and the page receives a <code>FileSystemFileHandle</code> through <code>launchQueue.setConsumer()</code>. A second file goes to the window already open, so anything the Reader has lent stays connected.",
      "The Reader opens Charts with <code>window.open()</code>. Charts says it is ready to its opener, addressed to the Reader's origin only. The Reader answers with one end of a <code>MessageChannel</code> and exposes four calls on it with Hawser: <code>describe()</code>, <code>text()</code>, <code>documents()</code> and <code>write()</code>. Charts takes ports from the Reader's origin and from nowhere else.",
      "<code>documents()</code> is an async generator. When the operating system hands the Reader another file, Charts receives it on the same port.",
      "<code>write()</code> is checked by the Reader every time: there must be a handle (a plain <code>File</code> from an input cannot be written back), the person must have ticked \"Let the other app save\" in the Reader, and the handle must have <code>readwrite</code> permission. The permission prompt can only come from a click in the Reader, so Charts cannot cause one.",
      "Why not post the handle itself? Within one origin that works. Posted to another origin, Chromium fires <code>messageerror</code> on the receiving side, because the handle cannot be rebuilt there. The check under Try it shows this in your browser. Posting a <code>File</code> crosses origins but gives a copy that cannot be saved back and cannot be taken back.",
    ],
    build: [
      "A viewer that uses a third-party renderer, such as a chart, map or 3D model viewer on another origin, without giving it the file.",
      "An editor that lets a plug-in on another origin edit one file for one session, with the editor approving each save.",
      "A file manager web app that opens a file in whichever web app the person picks, and stays the only holder of the handle.",
      "A spreadsheet that lends one range of an open file to a calculator or AI tool on another origin, read-only.",
      "A recorder that lends an audio file to a transcription app and takes the port back when it is done.",
    ],
    traps: [
      "File handling needs an installed app on desktop Chromium (Windows, macOS, Linux, ChromeOS). In a tab, <code>launchQueue</code> exists and is never called. The first launch asks the person whether the app may open that file type.",
      "Opening one installed app from another is not defined. <code>window.open()</code> may open a tab, a popup, or, with link capturing on, the other app's own window. If the opener is dropped on the way, Charts has nobody to say ready to and shows \"Open this from the reader\".",
      "A port does not survive a reload of either window. Charts cannot reconnect by itself; the person presses the button in the Reader again.",
      "<code>text()</code> sends the whole file as one string. For large files a <code>ReadableStream</code> over the port would be the next step.",
      "There is no way for one installed app to address another by manifest id and hand it a port, and no way to share a handle across origins even with the person's consent. The port is the workaround, and it lasts only as long as the Reader's window.",
    ],
    links: [
      ["Manifest incubations: file_handlers", "https://wicg.github.io/manifest-incubations/index.html#file_handlers-member"],
      ["File handling explainer", "https://wicg.github.io/file-handling/explainer.html"],
      ["Web App Launch Handler API: launch_handler, launchQueue", "https://wicg.github.io/web-app-launch/"],
      ["File System Access: handles and permissions", "https://wicg.github.io/file-system-access/"],
      ["File System Standard", "https://fs.spec.whatwg.org/"],
      ["HTML: MessagePort", "https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports"],
      ["Intent to Ship: File Handling (blink-dev)", "https://groups.google.com/a/chromium.org/g/blink-dev/c/Wxuo4lZi4vM"],
      ["MDN: file_handlers", "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/file_handlers"],
    ],
    pa: [["Port Authority: Comlink today, and Hawser", PA + "comlink/"], ["Port Authority: port patterns", PA + "patterns/"]],
    related: ["file-handlers", "file-save-back", "launch-handler", "drag-handles"],
  },

  // ------------------------------------------------------------ sharing
  {
    id: "share-target", group: "sharing", state: "live", app: "notes",
    title: "Receiving shares: share_target",
    blurb: "An installed web app appears in the system share sheet. Text, links and files shared from any app arrive at a URL the app chose.",
    how: [
      "The manifest's <code>share_target</code> names an <code>action</code>, a <code>method</code> and the names of the <code>params</code>. With GET, the share arrives in the query string. With POST and <code>multipart/form-data</code>, it can include files.",
      "A POST share is a real request. The notes app's service worker answers it, keeps what was shared, and redirects to the app. The Worker has a fallback for a share that arrives before the service worker is running.",
      "The tasks app uses the GET form, which needs no service worker.",
    ],
    build: [
      "Save to a reading list or notes app from any app.",
      "A photo editor that receives images from the camera app.",
      "A bookmarklet replacement on mobile, where bookmarklets do not work.",
      "Post to a social or Mastodon client from the share sheet.",
    ],
    traps: [
      "Only installed apps appear. Availability depends on the browser and the operating system share sheet: Chromium on Android and ChromeOS supports it; check other platforms with the probe on this page.",
      "Apps put the URL in different fields. Many send it in <code>text</code>, not <code>url</code>.",
      "Files need POST and <code>multipart/form-data</code>, and the accepted types must be listed.",
    ],
    links: [["Web Share Target", "https://w3c.github.io/web-share-target/"]],
    blog: [["Breaking down silos by sharing more on the web", BLOG + "breaking-down-silos-with-share-target-api/"], ["Registering as a Share Target", BLOG + "registering-as-a-share-target-with-the-web-share-target-api/"], ["Modern mobile bookmarklets with the ShareTarget API", BLOG + "modern-mobile-bookmarklets-with-the-sharetarget-api/"]],
    related: ["web-share", "clipboard"],
  },
  {
    id: "web-share", group: "sharing", state: "live", app: "tasks",
    title: "Sending shares: navigator.share()",
    blurb: "A page opens the system share sheet with text, a URL or files, and the person picks where they go, including other installed web apps.",
    how: ["<code>navigator.share({ title, text, url, files })</code> must run from a user gesture. <code>navigator.canShare()</code> says whether the data, in particular files, can be shared. The tasks app shares a task, which the notes app can receive."],
    build: ["A share button that hands content to whatever app the person uses, without a list of social networks.", "Handing a generated file to another app on the device."],
    traps: ["Rejects with <code>AbortError</code> when the person closes the sheet; that is not a failure.", "Desktop support varies by browser and operating system."],
    links: [["Web Share", "https://w3c.github.io/web-share/"]],
    blog: [["Creating a share button web component", BLOG + "creating-a-share-button-web-component/"]],
    related: ["share-target"],
  },
  {
    id: "clipboard", group: "sharing", state: "live", app: "tasks",
    title: "The clipboard as a channel between apps",
    blurb: "Two web apps can exchange structured data through the clipboard with custom formats, without either knowing about the other.",
    how: [
      "The async clipboard API writes <code>ClipboardItem</code>s. Web custom formats, named with a <code>web </code> prefix, carry types the browser does not sanitise, which another web app can read back.",
      "Tasks writes <code>text/plain</code> and <code>web application/x-webtasks+json</code>. Notes reads the custom format when it is there, and the plain text when it is not.",
    ],
    build: ["Copy a task in the tasks app and paste it as a structured note in the notes app.", "Copy a diagram between two drawing tools with full fidelity."],
    traps: ["Reading needs permission and focus.", "Web custom formats are Chromium only; other browsers see only the standard types."],
    links: [["Clipboard API", "https://w3c.github.io/clipboard-apis/"]],
    related: ["web-share"],
  },

  // ------------------------------------------------------------ presence
  {
    id: "web-install", group: "presence", state: "live",
    title: "Installing an app from a page: navigator.install()",
    blurb: "Most of the manifest only takes effect once the app is installed. <code>navigator.install()</code> lets a page offer the install from a button, for itself or for an app on another origin.",
    how: [
      "Until now a page had to catch the non-standard <code>beforeinstallprompt</code> event, and could only offer to install itself.",
      "The Web Install API adds <code>navigator.install()</code> and an <code>&lt;install&gt;</code> element. A page can ask to install itself, or an app on another origin by its install URL and manifest id. The browser shows its own dialog and the person decides.",
      "The buttons on this page ask the browser to install Notes, Tasks, Reader and Charts, each from its own origin.",
    ],
    build: [
      "A directory of web apps with an install button for each.",
      "An install button next to the feature that needs it, such as opening files, instead of pointing at the address bar.",
    ],
    traps: [
      "Still arriving in Chromium, behind a flag or an origin trial depending on the version. Firefox and Safari do not have it.",
      "Needs a user gesture. Installing an app on another origin is checked more strictly than installing the page itself.",
    ],
    links: [
      ["Web Install API explainer", "https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/WebInstall/explainer.md"],
      ["MDN: beforeinstallprompt", "https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event"],
    ],
    blog: [["onappinstalled", BLOG + "onappinstalled/"]],
    related: ["related-apps", "app-migration"],
  },
  {
    id: "badging", group: "presence", state: "live", app: "tasks",
    title: "A count on the app icon: setAppBadge()",
    blurb: "An installed app sets a number or dot on its icon in the dock, taskbar or home screen.",
    how: ["<code>navigator.setAppBadge(n)</code> and <code>clearAppBadge()</code>, from a page or a service worker. The tasks app shows the number of tasks not done."],
    build: ["Unread counts for mail and chat.", "Tasks due today.", "A build or deploy that needs attention."],
    traps: ["Only shows for installed apps.", "Supported in Chromium on desktop, and in Safari for web apps added to the Dock or Home Screen."],
    links: [["Badging API", "https://w3c.github.io/badging/"]],
    related: ["shortcuts"],
  },
  {
    id: "shortcuts", group: "presence", state: "live", app: "notes",
    title: "Jump lists and long-press menus: shortcuts",
    blurb: "The manifest lists actions that appear when the person right-clicks or long-presses the app icon.",
    how: ["Each entry in <code>shortcuts</code> has a name and a URL in the app's scope. The notes app lists \"New note\"."],
    build: ["Compose, new document, start a timer: the first thing people do in the app."],
    traps: ["The list is read when the manifest updates, so it cannot change per user at runtime."],
    links: [["Web App Manifest: shortcuts", "https://w3c.github.io/manifest/#shortcuts-member"]],
    related: ["badging", "note-taking"],
  },
  {
    id: "window-chrome", group: "presence", state: "live", app: "tasks",
    title: "Drawing into the title bar: Window Controls Overlay",
    blurb: "An installed desktop app can draw into its title bar, next to the window buttons, by asking for <code>window-controls-overlay</code> in <code>display_override</code>.",
    how: [
      "<code>display_override</code> lists <code>window-controls-overlay</code> first and <code>standalone</code> second, for browsers without it. When the person turns the overlay on, the CSS environment variables <code>titlebar-area-x</code>, <code>titlebar-area-y</code>, <code>titlebar-area-width</code> and <code>titlebar-area-height</code>, and <code>navigator.windowControlsOverlay</code>, give the rectangle the page can use.",
      "The Tasks app puts the number of open tasks in its title bar, and sets <code>app-region: drag</code> so the bar still moves the window.",
    ],
    build: ["A search box or the document title in the title bar, as native editors have.", "A toolbar in the title bar, to save height on a laptop screen."],
    traps: ["Chromium on desktop only. The person has to turn the overlay on, with the chevron in the title bar.", "Buttons and links in the bar need <code>app-region: no-drag</code>, or a click drags the window."],
    links: [["Window Controls Overlay", "https://wicg.github.io/window-controls-overlay/"], ["MDN: Window Controls Overlay API", "https://developer.mozilla.org/en-US/docs/Web/API/Window_Controls_Overlay_API"]],
    related: ["tabbed-apps", "document-pip"],
  },
  {
    id: "tabbed-apps", group: "presence", state: "live", app: "notes",
    title: "Tabs in the app's window: tabbed and tab_strip",
    blurb: "An installed desktop app can ask for a window with a tab strip, a pinned home tab and its own new-tab button.",
    how: [
      "<code>display_override: [\"tabbed\", \"standalone\"]</code> gives the installed window a tab strip, drawn by the browser. <code>tab_strip</code> in the manifest sets a pinned <code>home_tab</code>, matched by <code>scope_patterns</code>, and the URL that <code>new_tab_button</code> opens.",
      "Notes asks for <code>tabbed</code>, with <code>/</code> as the home tab and <code>/?new=1</code> for a new tab.",
    ],
    build: ["An editor where each file opens in a tab of one window.", "A mail app with the inbox pinned and each draft in its own tab."],
    traps: ["Experimental, in Chromium on desktop. Depending on the version it has to be turned on with a flag.", "<code>display_override</code> is an ordered list, so a browser without <code>tabbed</code> uses <code>standalone</code>."],
    links: [["Tabbed application mode explainer", "https://github.com/WICG/manifest-incubations/blob/gh-pages/tabbed-mode-explainer.md"], ["Manifest incubations: tab_strip", "https://wicg.github.io/manifest-incubations/"]],
    related: ["window-chrome", "launch-handler"],
  },
  {
    id: "document-pip", group: "presence", state: "live", app: "tasks",
    title: "A window that stays on top: Document Picture-in-Picture",
    blurb: "A page can move part of itself, such as a checklist or a timer, into a small window that stays above other apps.",
    how: [
      "<code>documentPictureInPicture.requestWindow({ width, height })</code> opens an empty window on the same origin that stays on top. The page copies its stylesheets in and moves DOM nodes across. They are the same nodes, so they keep their event listeners and state.",
      "In Tasks, <strong>Pop out</strong> moves the task list into that window. Closing the window puts the list back in the page.",
    ],
    build: ["A task list or timer that stays visible while the person works in another app.", "Media controls, the video strip of a call, or a live transcript."],
    traps: ["Chromium on desktop only.", "One window at a time, and opening it needs a user gesture.", "The new window has no styles until the page copies them in. Listen for <code>pagehide</code> to move the nodes back when the person closes it."],
    links: [["Document Picture-in-Picture specification", "https://wicg.github.io/document-picture-in-picture/"], ["MDN: Document Picture-in-Picture API", "https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API"]],
    related: ["window-chrome", "window-management"],
  },
  {
    id: "window-management", group: "presence", state: "live",
    title: "Windows on more than one screen: Window Management",
    blurb: "A page can ask which screens are connected, and open windows at a chosen place on each.",
    how: [
      "<code>window.getScreenDetails()</code> asks for permission, then returns each screen's usable area, scale and label.",
      "With those numbers a page can open two windows side by side, such as Reader and Charts, or put a presentation on the external screen.",
    ],
    build: ["Reader and Charts side by side on one screen.", "Slides on the projector and speaker notes on the laptop.", "An app that puts its windows back where they were, across several screens."],
    traps: ["Chromium on desktop only.", "Opening two windows from one click runs into the pop-up blocker, unless the person has allowed pop-ups for the site."],
    links: [["Window Management specification", "https://w3c.github.io/window-management/"], ["MDN: Window Management API", "https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API"]],
    related: ["document-pip", "os-file-handoff"],
  },
  {
    id: "app-migration", group: "presence", state: "planned",
    title: "Moving an installed app to a new domain: migrate_from",
    blurb: "An installed app is tied to its origin. <code>migrate_from</code> lets it move to a new domain without the person installing it again.",
    how: [
      "The manifest on the new origin names the old app's manifest id under <code>migrate_from</code>, and the old origin agrees in <code>/.well-known/web-app-origin-association</code>.",
      "When both sides agree, the browser offers the person the move. The icon, shortcuts, file handlers and protocol handlers then point at the new origin.",
    ],
    build: ["Moving an app from <code>*.workers.dev</code> to its own domain and keeping the installs it has.", "Folding several old subdomains into one origin."],
    traps: ["Early, Chromium only, and it changes between versions.", "Storage belongs to the origin. <code>localStorage</code>, IndexedDB and the Cache API do not move with the install, so the app has to move the person's data itself."],
    links: [["Web App Migration explainer", "https://github.com/WICG/manifest-incubations/blob/gh-pages/app-migration-explainer.md"]],
    related: ["scope-extensions", "web-install"],
  },
  {
    id: "run-on-os-login", group: "presence", state: "planned",
    title: "Starting with the computer: Run on OS Login",
    blurb: "An installed desktop app can start when the person signs in to Windows, macOS or Linux.",
    how: [
      "This one is not a manifest field. The person turns it on in the app's settings in the browser, or an administrator sets it with the <code>WebAppSettings</code> policy (<code>run_on_os_login</code>).",
      "With <code>launch_handler</code> and a badge, a mail or chat app is open and showing its count from the moment the person signs in.",
    ],
    build: ["A chat or mail app that is already open after sign-in.", "A small capture or sync tool, installed as an app."],
    traps: ["Chromium on desktop only. A site cannot ask for it, and cannot find out whether it is on.", "There is no launch event in the service worker, so starting at sign-in always opens a window."],
    links: [["Run on OS Login design notes (Chromium)", "https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/RunOnLogin/Explainer.md"]],
    related: ["launch-handler", "badging"],
  },
  {
    id: "related-apps", group: "presence", state: "live", app: "notes",
    title: "Is my other app installed? getInstalledRelatedApps()",
    blurb: "A site can ask whether its own native app or installed web app is present, if both declare the relationship.",
    how: [
      "The manifest lists <code>related_applications</code>; the other app must point back. <code>navigator.getInstalledRelatedApps()</code> then returns the ones that are installed.",
      "Notes lists its own manifest as a <code>webapp</code> entry, so a page on the Notes origin can ask whether Notes is installed.",
    ],
    build: ["Hide an install prompt when the app is already installed.", "Offer to open the installed app instead."],
    traps: ["Both sides must declare the relationship.", "Chromium only, and only on some platforms."],
    links: [["Get Installed Related Apps", "https://wicg.github.io/get-installed-related-apps/spec/"]],
    blog: [["onappinstalled", BLOG + "onappinstalled/"]],
    related: ["scheme-detection", "web-install"],
  },

  // ------------------------------------------------------------ between
  {
    id: "payment-handler", group: "between", state: "planned",
    title: "Being the app the browser asks to pay: Payment Handler",
    blurb: "A web app registers as a payment method, and the browser opens it when another site calls the Payment Request API.",
    how: ["A service worker registers the payment app, and a payment method manifest on the app's origin names it. When a merchant asks for that method, the browser runs the app's service worker and opens its window."],
    build: ["A demo wallet that pays a demo shop on another origin, so the handoff can be seen end to end."],
    traps: ["Chromium only.", "The payment method manifest and its URL must match exactly."],
    links: [["Payment Handler API", "https://w3c.github.io/payment-handler/"], ["Payment Request API", "https://w3c.github.io/payment-request/"]],
    related: ["digital-credentials", "intents-lineage"],
  },
  {
    id: "digital-credentials", group: "between", state: "planned",
    title: "Asking an OS wallet for proof: Digital Credentials API",
    blurb: "A site asks for a verified credential, such as proof of age, from a wallet app on the device, and gets a signed answer back.",
    how: [
      "The page calls <code>navigator.credentials.get({ digital: { requests: [...] } })</code> with a request in a protocol such as OpenID4VP or ISO mdoc.",
      "The browser passes the request to the operating system, the person approves what is shared in their wallet app, and the signed response comes back to the page. A link, a file or a share has no reply. This does.",
    ],
    build: ["An age check that does not need a photo of an ID.", "Proof of identity or membership from a wallet on the phone."],
    traps: ["Arriving in Chrome and Safari. The protocols, and the wallets that support them, are still changing.", "Testing it from end to end needs a wallet with a credential in it, and a verifier."],
    links: [["W3C Digital Credentials API", "https://w3c-fedid.github.io/digital-credentials/"], ["Chrome for Developers: Digital Credentials API", "https://developer.chrome.com/docs/identity/web-apis/digital-credentials"]],
    related: ["payment-handler", "contact-picker", "intents-lineage"],
  },
  {
    id: "contact-picker", group: "between", state: "live",
    title: "Picking from the system address book: Contact Picker API",
    blurb: "A page opens the operating system's contact picker and receives only the contacts and fields the person chose.",
    how: [
      "From a user gesture, <code>navigator.contacts.select([\"name\", \"email\"], { multiple: true })</code> opens the picker. The page never sees the address book. The promise resolves with the entries the person chose.",
      "This is the Web Intents \"pick\" verb, for one kind of data. Like Payment Handler and Digital Credentials, it returns something to the caller.",
    ],
    build: ["Inviting people, or splitting a bill, without typing addresses or giving the site the whole address book.", "Filling in a delivery address from a contact."],
    traps: ["Chrome on Android, and Safari behind a flag. Not in desktop browsers.", "The page gets a copy. Later changes to the contact do not reach it."],
    links: [["Contact Picker API specification", "https://w3c.github.io/contact-picker/spec/"], ["MDN: Contact Picker API", "https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API"]],
    related: ["digital-credentials", "intents-lineage"],
  },
  {
    id: "intents-lineage", group: "between", state: "live",
    title: "From Web Intents to today",
    blurb: "Protocol handlers, share targets, payment handlers, contact pickers and digital credentials each solve one slice of what Web Intents tried to solve in 2011: one app asks for an action and another provides it.",
    how: [
      "The table on this page lists each API next to the Web Intents verb it covers, whether the caller gets anything back, and whether your browser has it.",
      "The routes the operating system starts (schemes, files, shares) are one-way. The ones the browser brokers for a single kind of data (contacts, payments, credentials) return a response.",
    ],
    build: ["A table of verbs (share, open, pay, pick, verify, edit) and which platform API covers each, with a probe for each in the reader's browser."],
    traps: ["Each API has its own registration, its own prompt and its own platform support, which is the main cost compared with one intent system."],
    links: [["Web Intents (W3C Note)", "https://www.w3.org/TR/web-intents/"]],
    blog: [["Web Intents: a fresh look", BLOG + "web-intents-a-fresh-look/"], ["What were the UX issues with Web Intents?", BLOG + "what-were-the-ux-issues-with-web-intents/"], ["The web that never was", BLOG + "the-web-that-never-was/"]],
    pa: [["Port Authority", PA]],
    related: ["protocol-handlers", "share-target", "payment-handler", "digital-credentials", "contact-picker"],
  },
];

export const byGroup = (id) => all.filter((p) => p.group === id);
export const plain = (html) => String(html).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
