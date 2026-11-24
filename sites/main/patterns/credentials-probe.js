// For the digital-credentials page: check DigitalCredential availability and
// query userAgentAllowsProtocol() for common verifiable credential protocols.

const PROTOCOLS = ["openid4vp", "openid4vp-v1-unsigned", "openid4vp-v1-signed", "org-iso-mdoc"];

export function run(el) {
  const hasApi = typeof window.DigitalCredential === "function";
  const canQuery = hasApi && typeof window.DigitalCredential.userAgentAllowsProtocol === "function";

  const rows = PROTOCOLS.map((proto) => {
    let ok = false;
    let note = "DigitalCredential API absent";
    if (canQuery) {
      try {
        ok = !!window.DigitalCredential.userAgentAllowsProtocol(proto);
        note = ok ? "allowed by this browser" : "not advertised by this browser";
      } catch (err) {
        note = `threw ${err.name}`;
      }
    } else if (hasApi) {
      note = "DigitalCredential exists, but userAgentAllowsProtocol() is not exposed";
    }
    return `<li><span class="jack${ok ? " on" : ""}"></span><code>${proto}</code> — ${note}</li>`;
  }).join("");

  el.insertAdjacentHTML("beforeend", `<h3>Supported credential protocols in this browser</h3>
    <p class="small muted">Uses <code>DigitalCredential.userAgentAllowsProtocol()</code> without opening a wallet prompt.</p>
    <ul class="checks">${rows}</ul>`);
}
