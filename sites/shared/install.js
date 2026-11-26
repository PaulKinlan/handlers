// Offers to install the app this page belongs to, from a button on the page.
//
// Most of what a manifest declares (share_target, file_handlers,
// protocol_handlers, shortcuts) only takes effect once the app is installed,
// and a page cannot install itself without the person. Chromium fires
// beforeinstallprompt when the page can be installed. Keeping that event lets
// a button on the page show the browser's install dialog. navigator.install()
// does the same where it exists. Other browsers give a page no way to ask, so
// the button says where their own control is.

const INSTALLED = "(display-mode: standalone), (display-mode: window-controls-overlay), (display-mode: tabbed), (display-mode: minimal-ui), (display-mode: fullscreen)";
const MANUAL = "This browser has not offered to install this page. In Chrome or Edge, use the install icon in the address bar. In Safari, use Share, then Add to Dock on a Mac or Add to Home Screen on a phone. If it is already installed, open it from your apps.";

let offer = null;     // the beforeinstallprompt event, kept for the button
let justInstalled = false;
const redraw = new Set();
const all = () => { for (const draw of redraw) draw(); };

// Registered as soon as the module loads: the event can fire before any button is drawn.
addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); offer = event; all(); });
addEventListener("appinstalled", () => { offer = null; justInstalled = true; all(); });

export const installed = () => matchMedia(INSTALLED).matches;

// el: where the button goes. name: the app's name. gains: one sentence on what
// installing makes work.
export function offerInstall(el, name, gains) {
  el.innerHTML = `<button type="button" class="accent" data-install>Install ${name}</button><span class="small muted" data-install-state aria-live="polite"></span>`;
  const button = el.querySelector("[data-install]");
  const state = el.querySelector("[data-install-state]");
  let said = "";   // what the last press led to, if it did not install

  const draw = () => {
    if (installed()) {
      button.hidden = true;
      state.textContent = `${name} is installed, and this is its window.`;
      el.dataset.install = "installed";
    } else if (justInstalled) {
      button.hidden = true;
      state.textContent = `${name} is installed. Open it from your apps.`;
      el.dataset.install = "installed";
    } else {
      button.hidden = false;
      state.textContent = said || gains;
      el.dataset.install = offer ? "offered" : typeof navigator.install === "function" ? "api" : "manual";
    }
  };

  button.addEventListener("click", async () => {
    said = "";
    if (offer) {
      const event = offer;
      offer = null;   // the browser lets each event show its dialog once
      event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") justInstalled = true;
      else said = "Not installed. Press the button again, or use the browser's own install control.";
    } else if (typeof navigator.install === "function") {
      try { await navigator.install(); justInstalled = true; }
      catch (err) { said = `Not installed: ${err.name}. Press the button again, or use the install icon in the address bar.`; }
    } else {
      said = MANUAL;
    }
    all();
  });

  redraw.add(draw);
  matchMedia(INSTALLED).addEventListener("change", draw);
  draw();
}
