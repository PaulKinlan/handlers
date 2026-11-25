# Beyond the Tab (beyondthetab.dev)

Experiments in how far an installed web app can hook into the operating system
and into other web apps: custom URL schemes, file handling, launch handling,
share targets, badges, shortcuts, and the rest. A companion to
[Port Authority](https://port-authority.dev), which covers `MessagePort`s
between sites; this project covers the registrations the browser and the
operating system make on an app's behalf.

## What is here

| Path | What it is |
| --- | --- |
| `sites/main/` | The hub: the home page with the demo apps and the agent skill, the list of patterns with filters (`explorer.js`), one page per pattern, and the old address of the Mover app (`moving/`) |
| `sites/main/SKILL.md`, `sites/main/skill/` | The agent skill, served at `https://beyondthetab.dev/SKILL.md`, and the `/skill/` page about it. A developer gives it to a coding agent, which checks their codebase, docs and plans against the patterns here and reports which integrations fit |
| `sites/main/patterns/all.js` | Every pattern as data (27 total across 5 groups): state (`live` or `planned`), how it works, what to build, what goes wrong, sources, Paul's related posts, related Port Authority pages |
| `sites/main/patterns/diagrams.js` | A sequence diagram for each pattern, drawn as inline SVG: who sends what to whom, and where the platform stops |
| `sites/main/patterns/_page.html` | Draws `/patterns/<id>/` for every pattern: the diagram, the live demo and the checks for this browser, then how it works, what you could build, what goes wrong |
| `sites/main/patterns/demos.js` | The live part of each pattern page: steps that use the demo apps, the feature checks for this browser, and the checks a page runs itself (`handoff-probe.js`, `scheme-probe.js`, `scope-probe.js`, `install-probe.js`, `screens-probe.js`, `contact-probe.js`, `intents-probe.js`, `related-apps-probe.js`, `credentials-probe.js`, `migration-probe.js`) |
| `sites/main/about/` | How the site came to be, what it is for, who built it and how it works |
| `sites/main/census/` | The integration census: 24 checks of how a web app can be opened (link schemes, manifest handlers, launch handling, sharing, install, badging, service worker messages, origin association), run in the reader's browser by `probes.js`, and a table of use cases marked works, partly or blocked. The page is itself installable: `manifest.json` declares `protocol_handlers` (`web+census:`), `file_handlers` (`.txt`, `.census`), POST `share_target` (answered by `sw.js`) and `launch_handler`, and `launches.js` lists what each route delivered. `test/census.mjs` is a Playwright check of both pages |
| `sites/main/missing/` | What web app integration is missing: eight gaps, each with the evidence, what it would enable, what to do today, and a live check from `census/probes.js` |
| `sites/main/samples/` | `.webnote`, `.webtasks`, and `.csv` files to open with the installed apps |
| `sites/notes/` | Notes app: `web+note:` protocol handler, `.webnote` file handler with save back, drag-and-drop file handles (`getAsFileSystemHandle`), structured clipboard paste (`web application/x-webtasks+json`), `launch_handler: focus-existing`, `handle_links: preferred`, `display_override: tabbed` + `tab_strip`, dynamic `scope_extensions` & `related_applications`, POST `share_target` with files, shortcut, `note_taking` |
| `sites/tasks/` | Tasks app: `web+task:` protocol handler, `.webtasks` file handler, `launch_handler: navigate-existing`, `handle_links: preferred`, GET `share_target`, app badge, `navigator.share()` out, structured clipboard copy, Window Controls Overlay (`display_override: window-controls-overlay`), and Document Picture-in-Picture pop-out |
| `sites/reader/`, `sites/charts/` | Reader and Charts, for the `os-file-handoff` pattern. Reader declares `file_handlers` for `.csv`, `.txt` and `.md` with `launch_handler: focus-existing`, takes files from `launchQueue`, the picker, a drop or a sample, and lends the open file to Charts on another origin over a Hawser port (`reader.js` holds the logic and decides each save). Charts draws and edits the table through that port and never holds the file |
| `sites/wallet/` | Wallet, for the `payment-handler` pattern. A payment app: `/pay` is its payment method, its manifest names `sw.js` under `serviceworker`, and Chrome installs that worker the first time a shop asks for the method. `sw.js` handles `paymentrequest`, opens `pay.html` over the shop and returns a made-up receipt. The shop is the pattern page on the hub (`pay-probe.js`) |
| `sites/main/moving/`, `sites/moved/` | Mover, for the `app-migration` pattern. A small app at its old address (`/moving/` on the hub) and at its new one (the `moved` origin). The Worker writes `migrate_to` into the old manifest, `migrate_from` into the new one, and `allow_migration` into the hub's association file |
| `sites/shared/hawser.js` | Hawser, copied from Port Authority: remote objects over a `MessagePort`, with an allow list, revocation and errors that keep their class. `test/hawser.unit.mjs` comes with it |
| `sites/shared/` | Served on every origin: `base.css`, `app.css`, `detect.js` (feature checks), `clipboard-format.js` (Web Custom Format encoder/decoder), `refs.js` (MDN and spec links) |
| `src/worker.js` | Cloudflare Worker: picks a site folder by hostname, serves `/_sites.js`, serves dynamic `/.well-known/web-app-origin-association` and Notes' dynamic manifest fields (`scope_extensions`, `related_applications`), and catches POST shares that arrive before a service worker is running |
| `scripts/icons.mjs` | Writes each app's PNG icons |

## Origins

Every manifest, protocol handler and file handler belongs to one origin, so each
demo app needs its own. One Worker script is deployed under several names:

| Site | Folder | Local | Deployed Worker |
| --- | --- | --- | --- |
| Hub | `sites/main` | `http://hub.localhost:8787` | `handlers` (`wrangler.jsonc`) |
| Notes | `sites/notes` | `http://notes.localhost:8787` | `ph-notes` (`deploy/notes.jsonc`) |
| Tasks | `sites/tasks` | `http://tasks.localhost:8787` | `ph-tasks` (`deploy/tasks.jsonc`) |
| Reader | `sites/reader` | `http://reader.localhost:8787` | `ph-reader` (`deploy/reader.jsonc`) |
| Charts | `sites/charts` | `http://charts.localhost:8787` | `ph-charts` (`deploy/charts.jsonc`) |
| Wallet | `sites/wallet` | `http://wallet.localhost:8787` | `ph-wallet` (`deploy/wallet.jsonc`) |
| Mover, new address | `sites/moved` | `http://moved.localhost:8787` | `ph-moved` (`deploy/moved.jsonc`) |

Pages find each other with `import { sites } from "/_sites.js"`.

To add a site: make `sites/<name>/`, add its labels to `LABELS`, `PROD` and
`LOCAL` in `src/worker.js`, and copy a `deploy/*.jsonc` with a new Worker name.

## Run it

Node 22 and Wrangler 4.

```sh
npm install
npm run dev        # wrangler dev --port 8787
npm test           # node --test test/*.unit.mjs
NODE_PATH=$(npm root -g) node test/files.mjs <screenshot-dir>   # Reader -> Charts in Chromium at 390px, with dev running
```

`test/files.mjs` covers everything up to the operating system's part. Opening
a file from the file manager into the installed Reader is tested by hand.

Then open `http://hub.localhost:8787`. Chromium resolves `*.localhost` to
your machine. Installing, protocol handlers and file handlers all work on
localhost without HTTPS.

## Deploy

Cloudflare Workers Builds runs `npx wrangler deploy` (and
`npx wrangler deploy -c deploy/<app>.jsonc` for each app) on every push to
main. The builds use the Cloudflare GitHub app, so the repository holds no
Cloudflare token. Each Worker has one build trigger, "Deploy on push to main":

| Worker | Deploy command | Address |
| --- | --- | --- |
| `handlers` | `npx wrangler deploy` | https://beyondthetab.dev |
| `ph-notes` | `npx wrangler deploy -c deploy/notes.jsonc` | https://notes.beyondthetab.dev |
| `ph-tasks` | `npx wrangler deploy -c deploy/tasks.jsonc` | https://tasks.beyondthetab.dev |
| `ph-reader` | `npx wrangler deploy -c deploy/reader.jsonc` | https://reader.beyondthetab.dev |
| `ph-charts` | `npx wrangler deploy -c deploy/charts.jsonc` | https://charts.beyondthetab.dev |
| `ph-wallet` | `npx wrangler deploy -c deploy/wallet.jsonc` | https://wallet.beyondthetab.dev |
| `ph-moved` | `npx wrangler deploy -c deploy/moved.jsonc` | https://moved.beyondthetab.dev |

A new app's Worker needs its own trigger: in the Cloudflare dashboard open the
Worker, then Settings, Build, connect `PaulKinlan/handlers`, branch `main`, and
set the deploy command to `npx wrangler deploy -c deploy/<app>.jsonc`. The
Worker must exist first, so either deploy it once by hand or create it in the
dashboard.
