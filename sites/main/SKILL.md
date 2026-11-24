---
name: beyond-the-tab-integration-audit
description: Audits an existing web application's codebase, manifest, service worker, docs, and product plans to identify high-value OS and cross-app integration opportunities (protocol handlers, file handlers, launch handling, share targets, clipboard custom formats, window chrome, Document PiP, badging, scope extensions, and brokered pickers) and returns a prioritized report of recommended next steps—while explicitly filtering out integrations that do not fit the product.
---

# Beyond the Tab: Web App & OS Integration Audit

Use this skill when a developer asks you to evaluate how their web application can better integrate with the operating system and with other apps—going beyond a standard browser tab.

Reference catalog, live demos, and workflow diagrams: **https://beyondthetab.dev**
Known platform gaps and browser traps: **https://beyondthetab.dev/missing/**

---

## Core Principle

**Do not recommend every web API.** Most sites only benefit from 2–5 OS integrations. Your job is to read the codebase, docs, and plans deeply enough to recommend only integrations that genuinely fit the product's workflows—and to explicitly explain why the others do *not* make sense here.

---

## Step 1: Inspect the Codebase, Docs, and Plans

Before suggesting anything, gather concrete evidence from the repository:

1. **Product context & plans:**
   - Read `README.md`, docs, PRDs, architecture notes, changelogs, roadmaps, and open TODOs to understand what the app does, who uses it, and what platforms matter.
2. **Installability & manifest baseline:**
   - Locate any `manifest.webmanifest`, `manifest.json`, or framework manifest generator (e.g., Next.js `manifest.ts`, Vite PWA plugin config, Nuxt/SvelteKit config).
   - Check existing `id`, `start_url`, `scope`, `display`, `display_override`, `icons`, `shortcuts`, `protocol_handlers`, `file_handlers`, `share_target`, `launch_handler`, `handle_links`, `scope_extensions`, `related_applications`, `tab_strip`, `note_taking`, and `migrate_from`.
3. **Service worker & server routes:**
   - Locate service worker files and server/edge routes (e.g., whether a POST `share_target` has both a service worker handler and a cold-start server fallback).
   - Check `/.well-known/web-app-origin-association` or multi-origin / multi-subdomain configs.
4. **Core user workflows in code:**
   - **Links & deep linking:** URL routing, entity URLs (docs, notes, tasks, messages, rooms), outbound/inbound links from emails or chat.
   - **Files:** `<input type="file">`, drag-and-drop handlers, export/download flows, document/media/CSV/code editing, local-first storage.
   - **Sharing & clipboard:** Share buttons, copy/paste handlers, rich structured data copied between views or apps.
   - **Attention & windowing:** Unread/pending counters, timers/calls/checklists/media players that users keep visible while multitasking, multi-window or multi-monitor views, top toolbars/search bars.
   - **Cross-app & brokered flows:** Checkout/payments, contact selection/invites, identity/age verification, companion native apps or planned domain migrations.

---

## Step 2: Clarify Platform Scope (Only Ask What Isn't Clear)

If the repository docs do not already specify target platforms, ask the user a brief, concrete question before finalizing priorities (or state your assumptions clearly if running non-interactively):

- **Primary platforms:** Desktop Chromium (Windows/macOS/Linux), Android Chrome, Safari (iOS / macOS Add to Dock), Firefox?
- **ChromeOS:** Are ChromeOS users in scope? (Only recommend ChromeOS-specific manifest integrations like `note_taking` or `lock_screen` if the user confirms ChromeOS matters—otherwise note them as out of scope.)
- **Install posture:** Are users expected to install the web app (PWA), or is it strictly a transient tab experience? (Note: most manifest handlers only activate after install, whereas `registerProtocolHandler`, `navigator.share()`, `documentPictureInPicture`, `getScreenDetails()`, `clipboard`, and `getAsFileSystemHandle()` work in ordinary tabs too.)

---

## Step 3: Evaluate Every Integration Surface

Assess each group below against the evidence from Step 1. For each candidate, verify it solves a real user job in *this* app, check browser support, and watch out for the platform traps listed.

### A. Links & Launch (`/patterns/#links`)
| Pattern | When it makes sense | Key checks & traps | Reference |
| --- | --- | --- | --- |
| **Custom URL schemes** (`protocol_handlers` / `registerProtocolHandler`) | Other sites/apps should link into this app by intent (`web+…`, `mailto:`, `webcal:`) without hardcoding your origin. | No API can query whether a scheme is registered (`isProtocolHandlerRegistered` was removed). One-way handoff only; no reply channel. Treat incoming URLs as untrusted. | `https://beyondthetab.dev/patterns/protocol-handlers/` |
| **Scheme detection** | App renders outbound `web+` or native custom-scheme links and needs graceful fallback UX. | Only fragile focus/visibility heuristics exist—never rely on them for critical flows. | `https://beyondthetab.dev/patterns/scheme-detection/` |
| **Launch handling** (`launch_handler`) | Any installable app that receives links, files, or shares and should reuse an existing window (`focus-existing` / `navigate-existing`) instead of spawning duplicates. | With `focus-existing`, you **must** register `window.launchQueue.setConsumer()` early and handle `targetURL` yourself, or launches appear to do nothing. | `https://beyondthetab.dev/patterns/launch-handler/` |
| **Link capturing** (`handle_links`) | Deep links shared in chat/email (`https://…`) should open inside the installed app window. | User settings override the manifest hint; calling pages cannot detect whether a link will be captured. | `https://beyondthetab.dev/patterns/link-capturing/` |
| **Multi-origin scope** (`scope_extensions`) | Product spans multiple subdomains or domains (e.g. app + docs + auth/checkout) that should stay inside one installed app window. | Requires two-way handshake: `scope_extensions` in manifest **and** `/.well-known/web-app-origin-association` on each partner origin. Silently ignored if either side disagrees. | `https://beyondthetab.dev/patterns/scope-extensions/` |
| **System "new note"** (`note_taking`) | **ChromeOS only**—only recommend for note-taking/capture apps whose users are on ChromeOS. | Ignored outside ChromeOS. | `https://beyondthetab.dev/patterns/note-taking/` |

### B. Files (`/patterns/#files`)
| Pattern | When it makes sense | Key checks & traps | Reference |
| --- | --- | --- | --- |
| **Open with** (`file_handlers`) | App views, converts, or edits specific file formats (`.csv`, `.md`, `.json`, images, audio, custom formats). | Desktop Chromium installed apps only. Files arrive as `FileSystemFileHandle`s on `launchQueue`, never as URLs. | `https://beyondthetab.dev/patterns/file-handlers/` |
| **Save back in place** (`createWritable()`) | App is an editor where users expect `Cmd/Ctrl+S` to update the opened file on disk instead of triggering repeated downloads. | Requires `readwrite` permission prompt per handle/session; writes atomically on `close()`. | `https://beyondthetab.dev/patterns/file-save-back/` |
| **Drag-and-drop file handles** (`getAsFileSystemHandle()`) | App already accepts dropped files/folders and users edit or inspect them in place. | Must call `item.getAsFileSystemHandle()` synchronously during the `drop` event; keep `item.getAsFile()` fallback for non-Chromium browsers. | `https://beyondthetab.dev/patterns/drag-handles/` |
| **Cross-origin file handoff** | App opens local files and wants plugins, renderers, or partner tools on another origin to read/edit them safely. | `FileSystemFileHandle` **cannot** cross origins (`messageerror`). Keep the handle on the host origin and lend a revocable, permission-gated `MessagePort` instead. | `https://beyondthetab.dev/patterns/os-file-handoff/` |

### C. Sharing & Clipboard (`/patterns/#sharing`)
| Pattern | When it makes sense | Key checks & traps | Reference |
| --- | --- | --- | --- |
| **Receive shares** (`share_target`) | Users frequently send links, snippets, images, or files *into* the app from other apps (bookmarks, notes, social composers, uploaders). | Use GET for simple text/URL; use POST `multipart/form-data` + service worker (+ server fallback for cold-start shares) when accepting files. One-way only—no result returns to sender. | `https://beyondthetab.dev/patterns/share-target/` |
| **Send shares** (`navigator.share()`) | App has share buttons or generates files/links users want to hand to arbitrary installed apps. | Requires user gesture. Check `navigator.canShare()` for files. Handle `AbortError` as normal cancel. Resolves with `undefined` (sender never learns which app received it). | `https://beyondthetab.dev/patterns/web-share/` |
| **Structured clipboard** (Web Custom Formats) | Users copy structured domain objects (tasks, cards, diagrams, tables, rich nodes) between web apps or separate origins. | Prefix custom MIME types with `web ` (e.g. `web application/x-myapp+json`) and always include a `text/plain` fallback. Check `ClipboardItem.supports()`. | `https://beyondthetab.dev/patterns/clipboard/` |

### D. Presence in the OS & Windowing (`/patterns/#presence`)
| Pattern | When it makes sense | Key checks & traps | Reference |
| --- | --- | --- | --- |
| **In-page install** (`navigator.install()` / `beforeinstallprompt`) | App relies on install-gated handlers (files, share target, badges) or runs a multi-app catalog/hub. | `navigator.install()` is still rolling out in Chromium; keep graceful fallback guidance for Safari/Firefox. | `https://beyondthetab.dev/patterns/web-install/` |
| **App icon badging** (`setAppBadge()`) | App has meaningful unread counts, pending tasks, alerts, or active status. | Installed apps only (desktop Chromium + Safari Dock/Home Screen). Works from page or service worker. Always clear with `clearAppBadge()` at 0. | `https://beyondthetab.dev/patterns/badging/` |
| **Icon shortcuts** (`shortcuts`) | App has 1–4 high-frequency entry actions ("New document", "Compose", "Start timer"). | Static manifest list—cannot be personalized per user at runtime. Keep labels concise and URLs inside scope. | `https://beyondthetab.dev/patterns/shortcuts/` |
| **Title bar integration** (`window-controls-overlay`) | Desktop-heavy productivity/editor/media apps that benefit from a search bar, document title, or compact toolbar in the title bar. | Desktop Chromium only. Use `env(titlebar-area-*)` and mark draggable areas with `app-region: drag` and interactive children with `app-region: no-drag`. | `https://beyondthetab.dev/patterns/window-chrome/` |
| **Native app tabs** (`display_override: ["tabbed"]` + `tab_strip`) | Multi-document apps (editors, IDEs, mail/chat, dashboards) where users open several items simultaneously. | Experimental desktop Chromium feature; put `"standalone"` after `"tabbed"` in `display_override` for safe fallback. | `https://beyondthetab.dev/patterns/tabbed-apps/` |
| **Always-on-top floating window** (`documentPictureInPicture`) | Checklists, timers, live calls, media controls, scratchpads, or live status monitors users keep visible over other apps. | Works in desktop Chromium **even without installing**. Copy stylesheets into the PiP document and restore DOM on `pagehide`. | `https://beyondthetab.dev/patterns/document-pip/` |
| **Multi-screen placement** (`getScreenDetails()`) | Dual-view tools (editor + preview, presenter notes + slides, multi-panel analytics). | Desktop Chromium only; opening multiple windows from one click can hit popup blockers unless permitted. | `https://beyondthetab.dev/patterns/window-management/` |
| **Domain migration** (`migrate_from`) | Plans/docs mention moving an installed PWA to a new domain or consolidating subdomains. | Uses `/.well-known/web-app-origin-association`. Origin storage (`localStorage`/IndexedDB) does **not** migrate automatically—plan data transfer too. | `https://beyondthetab.dev/patterns/app-migration/` |
| **Related app detection** (`getInstalledRelatedApps()`) | Site has a companion native app or wants to detect whether its own PWA is already installed from a browser tab. | Requires mutual declaration (`related_applications` in manifest + reciprocal verification). | `https://beyondthetab.dev/patterns/related-apps/` |
| **Run on OS login** | Persistent workspace tools (mail, chat, monitoring) expected to be ready at desktop sign-in. | Controlled by user settings or enterprise policy—no web API to request it. Every launch opens a visible window (no headless SW launch event). | `https://beyondthetab.dev/patterns/run-on-os-login/` |

### E. Between Apps — Brokered APIs (`/patterns/#between`)
| Pattern | When it makes sense | Key checks & traps | Reference |
| --- | --- | --- | --- |
| **Payment Handler** | App is a wallet/payment provider or merchant checkout supporting web payment methods. | Chromium only; exact payment method manifest URL matching required. One of the few brokered flows that returns a reply. | `https://beyondthetab.dev/patterns/payment-handler/` |
| **Digital Credentials API** | App needs verified age checks, identity proofs, or wallet credentials (OpenID4VP / ISO mDoc). | Rolling out across Chrome/Safari; check `DigitalCredential.userAgentAllowsProtocol()`. Returns a signed presentation. | `https://beyondthetab.dev/patterns/digital-credentials/` |
| **Contact Picker API** | Mobile web flows (invites, recipients, bill-splitting) where users pick contacts without granting full address-book OAuth. | Primarily Chrome on Android; returns a one-time snapshot. | `https://beyondthetab.dev/patterns/contact-picker/` |
| **Web Intents lineage & reply gaps** | Architectural check whenever designing cross-app workflows. | Remember: links, files, and shares are **one-way**; only narrow brokered pickers (Payment, Digital Credentials, Contact Picker) or an explicit `MessagePort` handoff return data. | `https://beyondthetab.dev/patterns/intents-lineage/` |

---

## Step 4: Guardrails (Do Not Hallucinate Missing Platform Features)

Before finalizing recommendations, double-check against known web platform gaps (https://beyondthetab.dev/missing/):
- **Never propose** checking whether a custom URL scheme is registered before rendering a link (no API exists).
- **Never propose** reading a result back from `navigator.share()`, `share_target`, `protocol_handlers`, or `file_handlers` without an explicit bridge (e.g., `MessagePort` or server callback).
- **Never propose** passing a `FileSystemFileHandle` via `postMessage` to another origin (throws `messageerror`).
- **Never propose** handling an OS launch silently inside a service worker with no window (there is no shipped `onlaunch` SW event).
- **Never propose** querying at runtime which manifest handlers (`file_handlers`, `share_target`, `protocol_handlers`) the browser accepted or the user disabled (no API exists).

---

## Step 5: Produce the Audit Report

Present a clear, actionable report grounded in specific files from the developer's repository:

1. **Current Integration Baseline**
   - Summarize what the app already has (manifest fields, service worker, existing handlers/APIs) with clickable file paths, plus any foundational gaps (e.g., missing stable manifest `id`, missing 192px/512px icons, missing `launchQueue` consumer).
2. **Recommended Integrations (Prioritized)**
   - Group into **Quick Wins** (small manifest/JS changes, immediate UX gain), **High-Leverage Integrations** (meaningful workflow upgrades), and **Chrome-First / Progressive Bets** (feature-detected enhancements).
   - For each recommendation include:
     - **Why it fits *this* app** (referencing specific existing files, features, or roadmap items)
     - **Exact implementation touchpoints** (manifest keys, JS hooks, server/SW fallbacks)
     - **Browser support & graceful fallback**
     - **Pattern reference URL** (`https://beyondthetab.dev/patterns/<id>/`)
3. **Evaluated & Not Recommended**
   - Briefly list the integrations you considered and deliberately skipped (including ChromeOS-only features if out of scope) with a 1-sentence reason each—proving the audit is tailored rather than a generic checklist.
4. **Suggested Next Steps**
   - A concrete 2–4 step implementation sequence (starting with the highest-value, lowest-risk PR) and ask the developer which one they want to implement first.
