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
| `sites/main/samples/` | `.webnote` and `.webtasks` files to open with the installed apps |
| `sites/notes/` | Notes app: `web+note:` protocol handler, `.webnote` file handler with save back, `launch_handler: focus-existing`, POST `share_target` with files (answered by `sw.js`), a shortcut, `note_taking` |
| `sites/tasks/` | Tasks app: `web+task:` protocol handler, `.webtasks` file handler, `launch_handler: navigate-existing`, GET `share_target`, app badge, `navigator.share()` out |
| `sites/reader/`, `sites/charts/` | Reader and Charts, for the `os-file-handoff` pattern. Reader declares `file_handlers` for `.csv`, `.txt` and `.md` with `launch_handler: focus-existing`, takes files from `launchQueue`, the picker, a drop or a sample, and lends the open file to Charts on another origin over a Hawser port (`reader.js` holds the logic and decides each save). Charts draws and edits the table through that port and never holds the file |
| `sites/shared/hawser.js` | Hawser, copied from Port Authority: remote objects over a `MessagePort`, with an allow list, revocation and errors that keep their class. `test/hawser.unit.mjs` comes with it |
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
| Reader | `sites/reader` | `http://reader.localhost:8787` | `ph-reader` (`deploy/reader.jsonc`) |
| Charts | `sites/charts` | `http://charts.localhost:8787` | `ph-charts` (`deploy/charts.jsonc`) |

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
main. Each Worker needs a build set up once in the Cloudflare dashboard.
