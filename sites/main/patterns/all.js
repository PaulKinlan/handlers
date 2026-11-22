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
    id: "scheme-detection", group: "links", state: "planned",
    title: "Can this link be opened at all?",
    blurb: "Before showing a <code>web+note:</code> link, a page would like to know if anything will handle it. The platform has no API for that.",
    how: [
      "The only signals are side effects: the page losing focus when an external handler opens, or a navigation that never happens. Each is a heuristic and each browser behaves differently.",
      "A demo here would run each heuristic in the reader's browser and report what it saw, with and without the notes app registered.",
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
    related: ["protocol-handlers", "file-handlers"],
  },
  {
    id: "scope-extensions", group: "links", state: "planned",
    title: "One app across several origins: scope_extensions",
    blurb: "An app whose pages live on more than one origin asks for links to all of them to open in the installed app.",
    how: [
      "The manifest lists the other origins under <code>scope_extensions</code>, and each of those origins publishes a <code>/.well-known/web-app-origin-association</code> file that agrees.",
      "This replaces the earlier <code>url_handlers</code> experiment. It is a proposal in development in Chromium, not a shipped feature.",
      "This repo is a good test bed because every app already runs on its own origin.",
    ],
    build: ["A product whose app and docs are on different subdomains.", "A regional site on several country domains that installs as one app."],
    traps: ["Both sides must agree, or the extension is ignored without an error.", "Availability changes between Chromium versions while it is in development."],
    links: [["scope_extensions explainer", "https://github.com/WICG/manifest-incubations/blob/gh-pages/scope_extensions-explainer.md"]],
    related: ["launch-handler"],
  },
  {
    id: "note-taking", group: "links", state: "planned", app: "notes",
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
    id: "drag-handles", group: "files", state: "planned",
    title: "Dragging files between apps",
    blurb: "A file dragged from the desktop or another app arrives as a handle, not a copy, so the app can save back to it.",
    how: ["In a <code>drop</code> event, <code>DataTransferItem.getAsFileSystemHandle()</code> returns a handle for files and folders."],
    build: ["Drag a <code>.webnote</code> file onto the notes window to open it in place.", "Drag a folder onto an app to open a whole project."],
    traps: ["The handle must be requested during the drop event, before it returns.", "Chromium only."],
    links: [["File System Access: drag and drop", "https://wicg.github.io/file-system-access/"]],
    related: ["file-save-back"],
  },
  {
    id: "os-file-handoff", group: "files", state: "planned",
    title: "OS file handoff to another origin",
    blurb: "An installed app opens a file from the operating system, then lends another origin a <code>MessagePort</code> to that file instead of a copy.",
    how: ["The reader app gets the handle from <code>launchQueue</code>, and passes a port to a chart app on another origin. The chart app reads through the port and never holds the file. This is being built in its own thread and lands here."],
    build: ["A viewer that uses a third-party renderer without giving it the file.", "An app that lets a plug-in on another origin edit one file for one session."],
    traps: ["The other origin can only reach what the port exposes; closing the port ends its access."],
    links: [["HTML: MessagePort", "https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports"]],
    pa: [["Port Authority: port patterns", PA + "patterns/"], ["Port Authority: Comlink today", PA + "comlink/"]],
    related: ["file-handlers"],
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
    id: "clipboard", group: "sharing", state: "planned",
    title: "The clipboard as a channel between apps",
    blurb: "Two web apps can exchange structured data through the clipboard with custom formats, without either knowing about the other.",
    how: ["The async clipboard API writes <code>ClipboardItem</code>s. Web custom formats, named with a <code>web </code> prefix, carry types the browser does not sanitise, which another web app can read back."],
    build: ["Copy a task in the tasks app and paste it as a structured note in the notes app.", "Copy a diagram between two drawing tools with full fidelity."],
    traps: ["Reading needs permission and focus.", "Web custom formats are Chromium only; other browsers see only the standard types."],
    links: [["Clipboard API", "https://w3c.github.io/clipboard-apis/"]],
    related: ["web-share"],
  },

  // ------------------------------------------------------------ presence
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
    id: "window-chrome", group: "presence", state: "planned",
    title: "The title bar and the window: display_override",
    blurb: "An installed app can draw into the title bar area, or ask for a tabbed window, through <code>display_override</code>.",
    how: ["<code>window-controls-overlay</code> gives the page the title bar area, with its size in CSS environment variables. <code>tabbed</code> is an experimental mode that gives an app a tab strip."],
    build: ["A search box or document title in the title bar, like native editors.", "An app that opens several documents in tabs."],
    traps: ["Chromium on desktop. Tabbed mode is experimental."],
    links: [["Window Controls Overlay", "https://wicg.github.io/window-controls-overlay/"]],
    related: ["launch-handler"],
  },
  {
    id: "related-apps", group: "presence", state: "planned",
    title: "Is my other app installed? getInstalledRelatedApps()",
    blurb: "A site can ask whether its own native app or installed web app is present, if both declare the relationship.",
    how: ["The manifest lists <code>related_applications</code>; the other app must point back. <code>navigator.getInstalledRelatedApps()</code> then returns the ones that are installed."],
    build: ["Hide an install prompt when the app is already installed.", "Offer to open the installed app instead."],
    traps: ["Both sides must declare the relationship.", "Chromium only, and only on some platforms."],
    links: [["Get Installed Related Apps", "https://wicg.github.io/get-installed-related-apps/spec/"]],
    blog: [["onappinstalled", BLOG + "onappinstalled/"]],
    related: ["scheme-detection"],
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
    related: ["intents-lineage"],
  },
  {
    id: "intents-lineage", group: "between", state: "planned",
    title: "From Web Intents to today",
    blurb: "Protocol handlers, share targets and payment handlers each solve one slice of what Web Intents tried to solve in 2011: one app asks for an action and another provides it.",
    how: ["This page lines up each surviving API with the verb it handles, and where the gaps are. Port Authority covers the MessagePort-based version of the same idea, for agents."],
    build: ["A table of verbs (share, open, pay, pick, edit) and which platform API covers each, with a probe for each in the reader's browser."],
    traps: ["Each API has its own registration, its own prompt and its own platform support, which is the main cost compared with one intent system."],
    links: [["Web Intents (W3C Note)", "https://www.w3.org/TR/web-intents/"]],
    blog: [["Web Intents: a fresh look", BLOG + "web-intents-a-fresh-look/"], ["What were the UX issues with Web Intents?", BLOG + "what-were-the-ux-issues-with-web-intents/"], ["The web that never was", BLOG + "the-web-that-never-was/"]],
    pa: [["Port Authority", PA]],
    related: ["protocol-handlers", "share-target", "payment-handler"],
  },
];

export const byGroup = (id) => all.filter((p) => p.group === id);
export const plain = (html) => String(html).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
