# Handlers (working name)

Experiments in how far an installed web app can hook into the operating system
and into other web apps: custom URL schemes, file handling, launch handling,
share targets, badges, shortcuts, and the rest. A companion to
[Port Authority](https://port-authority.dev), which covers `MessagePort`s
between sites; this project covers the registrations the browser and the
operating system make on an app's behalf.

## What is here

| Path | What it is |
| --- | --- |
| `sites/main/` | The hub: home page, `/patterns/` index, and one page per pattern |
| `sites/main/patterns/all.js` | Every pattern as data: group, state (`live` or `planned`), how it works, what to build, what goes wrong, sources, Paul's related posts, related Port Authority pages |
| `sites/main/patterns/_page.html` | Draws `/patterns/<id>/` for every pattern: the live demo, then how it works, what you could build, what goes wrong |
| `sites/main/patterns/demos.js` | The live part of each pattern page: steps that use the demo apps, and the feature checks for this browser |
| `sites/main/census/` | The integration census: 23 checks of how a web app can be opened (link schemes, manifest handlers, launch handling, sharing, install, badging, service worker messages), run in the reader's browser by `probes.js`, and a table of use cases marked works, partly or blocked. The page is itself installable: `manifest.json` declares `protocol_handlers` (`web+census:`), `file_handlers` (`.txt`, `.census`), POST `share_target` (answered by `sw.js`) and `launch_handler`, and `launches.js` lists what each route delivered. `test/census.mjs` is a Playwright check of both pages |
| `sites/main/missing/` | What web app integration is missing: eight gaps, each with the evidence, what it would enable, what to do today, and a check from `census/probes.js` where one can run |
| `sites/main/samples/` | `.webnote` and `.webtasks` files to open with the installed apps |
| `sites/notes/` | Notes app: `web+note:` protocol handler, `.webnote` file handler with save back, `launch_handler: focus-existing`, POST `share_target` with files (answered by `sw.js`), a shortcut, `note_taking` |
| `sites/tasks/` | Tasks app: `web+task:` protocol handler, `.webtasks` file handler, `launch_handler: navigate-existing`, GET `share_target`, app badge, `navigator.share()` out |
| `sites/shared/` | Served on every origin: `base.css`, `app.css`, `detect.js` (feature checks), `refs.js` (MDN and spec links, carried over from Port Authority) |
| `src/worker.js` | Cloudflare Worker: picks a site folder by hostname, serves `/_sites.js` (where every site lives), and catches a POST share that arrives before the service worker is running |
| `scripts/icons.mjs` | Writes each app's PNG icons |

## Origins

Every manifest, protocol handler and file handler belongs to one origin, so each
demo app needs its own. One Worker script is deployed under several names:

| Site | Folder | Local | Deployed Worker |
| --- | --- | --- | --- |
| Hub | `sites/main` | `http://hub.localhost:8787` | `handlers` (`wrangler.jsonc`) |
| Notes | `sites/notes` | `http://notes.localhost:8787` | `ph-notes` (`deploy/notes.jsonc`) |
| Tasks | `sites/tasks` | `http://tasks.localhost:8787` | `ph-tasks` (`deploy/tasks.jsonc`) |

Pages find each other with `import { sites } from "/_sites.js"`.

To add a site: make `sites/<name>/`, add its labels to `LABELS`, `PROD` and
`LOCAL` in `src/worker.js`, and copy a `deploy/*.jsonc` with a new Worker name.

## Run it

Node 22 and Wrangler 4.

```sh
npm install
npm run dev        # wrangler dev --port 8787
npm test           # node --test test/*.unit.mjs
```

Then open `http://hub.localhost:8787`. Chromium resolves `*.localhost` to
your machine. Installing, protocol handlers and file handlers all work on
localhost without HTTPS.

## Deploy

Cloudflare Workers Builds runs `npx wrangler deploy` (and
`npx wrangler deploy -c deploy/<app>.jsonc` for each app) on every push to
main. Each Worker needs a build set up once in the Cloudflare dashboard.
