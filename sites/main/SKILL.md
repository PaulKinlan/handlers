---
name: beyond-the-tab-integration-audit
description: Inspects an existing web app's codebase, manifest, service worker, docs, and plans to find OS and cross-app integration opportunities (protocol handlers, file handlers, launch handling, share targets, clipboard custom formats, window controls, Document PiP, badging, scope extensions, and brokered pickers) and returns a report of suggested next steps, while filtering out integrations that do not fit the app.
---

# Beyond the Tab: web app and OS integration review

Use this skill when someone asks you to look through an existing web app for places where it could integrate better with the operating system or with other apps.

Pattern catalogue, diagrams, and live demos: **https://beyondthetab.dev**
Known platform gaps and browser limits: **https://beyondthetab.dev/missing/**

---

## Main rule

**Do not recommend every API on this list.** Most sites only have a real use for two to five of them. Read the codebase, docs, and plans first, recommend only the integrations that fit what the app actually does, and say plainly why the rest do not fit.

---

## Step 1: Read the repo, docs, and plans

Gather concrete facts from the repository before making suggestions:

1. **What the app does and where it is going:**
   - Read `README.md`, docs, design notes, roadmaps, and open TODOs to see what workflows the app supports and which platforms matter.
2. **Manifest and installability:**
   - Find any `manifest.webmanifest`, `manifest.json`, or framework manifest generator (Next.js `manifest.ts`, Vite PWA config, Nuxt/SvelteKit config).
   - Check what is already declared: `id`, `start_url`, `scope`, `display`, `display_override`, `icons`, `shortcuts`, `protocol_handlers`, `file_handlers`, `share_target`, `launch_handler`, `handle_links`, `scope_extensions`, `related_applications`, `tab_strip`, `note_taking`, and `migrate_from`.
3. **Service worker and server routes:**
   - Find service worker files and server/edge routes (for example, whether a POST `share_target` has a service worker handler and a server fallback for cold starts).
   - Check for `/.well-known/web-app-origin-association` or multi-subdomain setups.
4. **Existing user flows in code:**
   - **Links:** URL structure, deep links to documents/notes/tasks/rooms, links shared out to chat or email.
   - **Files:** `<input type="file">`, drag-and-drop handlers, export/download code, local editing of files or media.
   - **Sharing and clipboard:** Share buttons, copy/paste handlers, structured data moved between views or apps.
   - **Attention and windows:** Unread or open counts, timers/calls/checklists/media controls that people keep on screen while using other apps, multi-window layouts, top toolbars.
   - **Between apps:** Checkout/payments, contact selection/invites, identity or age checks, companion native apps, or planned domain moves.

---

## Step 2: Check platform scope

If the repo docs do not say which platforms the app targets, ask briefly before writing the final list (or state your assumptions clearly if you cannot ask):

- **Browsers and OS:** Desktop Chromium (Windows, macOS, Linux), Android Chrome, Safari (iOS or macOS Add to Dock), Firefox?
- **ChromeOS:** Do people use this app on ChromeOS? Only suggest ChromeOS-only manifest features (`note_taking`, `lock_screen`) if ChromeOS is actually in scope. Otherwise note them as skipped.
- **Installed app vs tab:** Are users expected to install the site as an app? Most manifest handlers only run once installed, while `registerProtocolHandler`, `navigator.share()`, `documentPictureInPicture`, `getScreenDetails()`, async clipboard, and `getAsFileSystemHandle()` also work in a normal tab.

---

## Step 3: Check each integration surface

Check each group below against what you found in Step 1. For every API you suggest, make sure it matches a real workflow in the repo and check the browser support and traps.

### A. Links into apps (`/patterns/#links`)
| Pattern | When it fits | Browser notes and traps | Reference |
| --- | --- | --- | --- |
| **Custom URL schemes** (`protocol_handlers` / `registerProtocolHandler`) | Other sites or apps should link into this app by scheme (`web+...`, `mailto:`, `webcal:`) without hardcoding its origin. | No API reports whether a scheme has a handler (`isProtocolHandlerRegistered` was removed). One-way only, no reply channel. Treat the incoming URL as untrusted input. | `https://beyondthetab.dev/patterns/protocol-handlers/` |
| **Scheme detection** | The app renders outbound `web+` or custom-scheme links and wants a fallback when nothing handles them. | Only focus and timing heuristics exist. Do not rely on them for anything critical. | `https://beyondthetab.dev/patterns/scheme-detection/` |
| **Launch handling** (`launch_handler`) | Any installed app opened by links, files, or shares that should reuse an open window (`focus-existing` or `navigate-existing`) rather than opening duplicates. | With `focus-existing`, register `window.launchQueue.setConsumer()` early and handle `targetURL` yourself, otherwise launches appear to do nothing. | `https://beyondthetab.dev/patterns/launch-handler/` |
| **Link capturing** (`handle_links`) | Ordinary `https:` links to the app (from email or chat) should open in the installed window. | User settings override the manifest hint. The calling page cannot check whether a link will open in a tab or an app. | `https://beyondthetab.dev/patterns/link-capturing/` |
| **Multi-origin scope** (`scope_extensions`) | The product spans more than one subdomain or domain (for example app and docs) that should stay in one installed window. | Needs agreement from both sides: `scope_extensions` in the manifest and `/.well-known/web-app-origin-association` on the other origin. Silently ignored if either side disagrees. | `https://beyondthetab.dev/patterns/scope-extensions/` |
| **System "new note"** (`note_taking`) | **ChromeOS only.** Only suggest for note-taking apps whose users are on ChromeOS. | Ignored outside ChromeOS. | `https://beyondthetab.dev/patterns/note-taking/` |

### B. Files (`/patterns/#files`)
| Pattern | When it fits | Browser notes and traps | Reference |
| --- | --- | --- | --- |
| **Open with** (`file_handlers`) | The app views, converts, or edits specific file types (`.csv`, `.md`, `.json`, images, audio, or its own format). | Desktop Chromium installed apps only. Files arrive as `FileSystemFileHandle`s on `launchQueue`, not as URLs. | `https://beyondthetab.dev/patterns/file-handlers/` |
| **Save back in place** (`createWritable()`) | The app edits files and people expect Save to update the file on disk rather than downloading another copy. | Prompts for `readwrite` permission per handle/session. Writes to a temporary file and replaces the original on `close()`. | `https://beyondthetab.dev/patterns/file-save-back/` |
| **Drag-and-drop file handles** (`getAsFileSystemHandle()`) | The app already takes dropped files or folders and lets people edit them in place. | Call `item.getAsFileSystemHandle()` synchronously inside the `drop` handler before it returns. Keep `item.getAsFile()` as a fallback for other browsers. | `https://beyondthetab.dev/patterns/drag-handles/` |
| **Cross-origin file handoff** | The app opens local files and wants a viewer, plugin, or editor on another origin to read or save them without giving away the file handle. | Posting a `FileSystemFileHandle` to another origin fires `messageerror`. Keep the handle on the host origin and lend a revocable `MessagePort` instead. | `https://beyondthetab.dev/patterns/os-file-handoff/` |

### C. Sharing and clipboard (`/patterns/#sharing`)
| Pattern | When it fits | Browser notes and traps | Reference |
| --- | --- | --- | --- |
| **Receive shares** (`share_target`) | People send links, text, images, or files into this app from other apps (reading lists, notes, composers, uploaders). | Use GET for text/URLs; use POST `multipart/form-data` with a service worker (and a server fallback in case the service worker is not running yet) when accepting files. One-way only. | `https://beyondthetab.dev/patterns/share-target/` |
| **Send shares** (`navigator.share()`) | The app has share buttons or generates files/links that people send to other apps. | Needs a user gesture. Check `navigator.canShare()` before sharing files. Treat `AbortError` as the person closing the sheet. Resolves with `undefined`. | `https://beyondthetab.dev/patterns/web-share/` |
| **Structured clipboard** (Web Custom Formats) | People copy structured objects (tasks, cards, diagrams, tables) between web apps or across origins. | Custom MIME types must start with `web ` (for example `web application/x-myapp+json`). Always include a `text/plain` fallback and check `ClipboardItem.supports()`. | `https://beyondthetab.dev/patterns/clipboard/` |

### D. Presence in the OS and windows (`/patterns/#presence`)
| Pattern | When it fits | Browser notes and traps | Reference |
| --- | --- | --- | --- |
| **In-page install** (`navigator.install()` / `beforeinstallprompt`) | The app depends on install-gated handlers (files, share target, badges) or acts as a directory installing apps on other origins. | `navigator.install()` is still rolling out in Chromium. Keep plain fallback instructions for Safari and Firefox. | `https://beyondthetab.dev/patterns/web-install/` |
| **App icon badging** (`setAppBadge()`) | The app has a real count worth showing on its icon (unread items, open tasks, alerts). | Installed apps only (desktop Chromium and Safari Dock / Home Screen). Works from a page or service worker. Call `clearAppBadge()` when the count hits 0. | `https://beyondthetab.dev/patterns/badging/` |
| **Icon shortcuts** (`shortcuts`) | The app has 1 to 4 obvious entry actions ("New note", "Compose", "Start timer"). | Static manifest list; cannot change per user at runtime. Keep URLs inside scope. | `https://beyondthetab.dev/patterns/shortcuts/` |
| **Title bar overlay** (`window-controls-overlay`) | Desktop apps that benefit from putting a search box, document title, or compact bar in the title bar strip. | Desktop Chromium only. Use `env(titlebar-area-*)`, set `app-region: drag` on the bar, and `app-region: no-drag` on buttons/links inside it. | `https://beyondthetab.dev/patterns/window-chrome/` |
| **Tabbed app window** (`display_override: ["tabbed"]` + `tab_strip`) | Multi-document desktop apps (editors, mail, dashboards) where people keep several items open in one window. | Experimental in desktop Chromium. Put `"standalone"` after `"tabbed"` in `display_override` so other browsers fall back to it. | `https://beyondthetab.dev/patterns/tabbed-apps/` |
| **Floating window** (`documentPictureInPicture`) | Checklists, timers, calls, media controls, or scratchpads that people keep visible above other apps. | Desktop Chromium only, and works without installing. Copy stylesheets into the PiP document and move the DOM back on `pagehide`. | `https://beyondthetab.dev/patterns/document-pip/` |
| **Multi-screen placement** (`getScreenDetails()`) | Two-window tools (editor and preview, slides and speaker notes, multi-monitor panels). | Desktop Chromium only. Opening more than one window from one click can hit popup blockers unless allowed. | `https://beyondthetab.dev/patterns/window-management/` |
| **Origin migration** (`migrate_from`) | Docs or plans mention moving an installed PWA to another origin on the same site, such as a new subdomain, or merging subdomains. | Same-site only: it does not cover a move to a different registrable domain. Needs an `id` in the new manifest, and `allow_migration` for it in `/.well-known/web-app-origin-association` on the old origin. Permissions do not move. Origin storage (`localStorage`, IndexedDB) does not move with the install; data migration still needs code. | `https://beyondthetab.dev/patterns/app-migration/` |
| **Related app check** (`getInstalledRelatedApps()`) | The site has a companion native app or wants to check from a tab whether its own PWA is installed. | Both sides must declare the link (`related_applications` in the manifest and a reciprocal declaration on the other app). | `https://beyondthetab.dev/patterns/related-apps/` |
| **Run on OS login** | Workspace apps (mail, chat, status monitors) that people expect open when they sign in. | Controlled by OS/browser app settings or enterprise policy; no web API requests it. Always opens a visible window. | `https://beyondthetab.dev/patterns/run-on-os-login/` |

### E. Between apps (`/patterns/#between`)
| Pattern | When it fits | Browser notes and traps | Reference |
| --- | --- | --- | --- |
| **Payment Handler** | The app is a wallet or a merchant checkout that uses Payment Request with web payment methods. | Chromium only. Payment method manifest URLs must match exactly. Returns a `PaymentResponse` to the caller. | `https://beyondthetab.dev/patterns/payment-handler/` |
| **Digital Credentials API** | The app needs verified identity or age checks from an OS wallet (OpenID4VP or ISO mDoc). | Rolling out in Chrome and Safari. Check `DigitalCredential.userAgentAllowsProtocol()`. Returns a signed credential response. | `https://beyondthetab.dev/patterns/digital-credentials/` |
| **Contact Picker API** | Mobile flows (invites, recipients, bill splitting) where picking a few contacts avoids asking for full address-book access. | Chrome on Android primarily. Returns a one-time snapshot of the selected contacts. | `https://beyondthetab.dev/patterns/contact-picker/` |
| **Web Intents lineage and reply limits** | Useful check whenever designing a flow between two apps. | Links, files, and shares are one-way. Only narrow brokered pickers (payments, digital credentials, contacts) or an explicit `MessagePort` handoff return data to the caller. | `https://beyondthetab.dev/patterns/intents-lineage/` |

---

## Step 4: Do not invent missing browser APIs

Check your suggestions against https://beyondthetab.dev/missing/ before writing the report:

- Do not suggest checking whether a custom URL scheme is registered before rendering a link (no API exists).
- Do not assume `navigator.share()`, `share_target`, `protocol_handlers`, or `file_handlers` can send a result back to the caller on their own.
- Do not suggest sending a `FileSystemFileHandle` across origins with `postMessage` (it fails with `messageerror`).
- Do not suggest handling an OS launch silently in a service worker with no window (there is no shipped `onlaunch` event).
- Do not suggest querying at runtime which manifest handlers (`file_handlers`, `share_target`, `protocol_handlers`) the browser accepted or the user turned off.

---

## Step 5: Write the report

Return a direct, concrete report grounded in files from the repo:

1. **What the site already has**
   - List existing manifest fields, service workers, and OS integration code with file paths, plus any missing basics (such as a stable manifest `id`, 192px/512px icons, or a `launchQueue` consumer).
2. **Suggested integrations (in priority order)**
   - Group into **Small changes first** (low risk, clear UX win), **Bigger workflow additions**, and **Chromium-only / experimental options** (only where feature detection and fallback are clean).
   - For each item include:
     - Why it fits this specific app (citing actual files, routes, or plans in the repo)
     - Exact files and manifest keys to change
     - Browser support and what happens on browsers without it
     - Link to the pattern page (`https://beyondthetab.dev/patterns/<id>/`)
3. **Checked and skipped**
   - List the patterns that do *not* fit this app (including ChromeOS-only features if out of scope), with one plain sentence explaining why each was skipped.
4. **Next steps**
   - Propose 2 to 4 small, concrete PRs in order and ask the developer which one they want to start with.
