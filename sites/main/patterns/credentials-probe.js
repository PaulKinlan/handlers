// For the digital-credentials page: check DigitalCredential availability and
// query userAgentAllowsProtocol() for common verifiable credential protocols.

const PROTOCOLS = ["openid4vp", "openid4vp-v1-unsigned", "openid4vp-v1-signed", "org-iso-mdoc"];

export function run(el) {
  const hasApi = typeof window.DigitalCredential === "function";
  const canQuery = hasApi && typeof window.DigitalCredential.userAgentAllowsProtocol === "function";

  const rows = PROTOCOLS.map((proto) => {
    let ok = false;
    let note = "there is no DigitalCredential here";
    if (canQuery) {
      try {
        ok = !!window.DigitalCredential.userAgentAllowsProtocol(proto);
        note = ok ? "allowed" : "not allowed";
      } catch (err) {
        note = `threw ${err.name}`;
      }
    } else if (hasApi) {
      note = "DigitalCredential is here, but userAgentAllowsProtocol() is not";
    }
    return `<li><span class="jack${ok ? " on" : ""}"></span><code>${proto}</code>: ${note}</li>`;
  }).join("");

  el.insertAdjacentHTML("beforeend", `<h3>Credential protocols this browser allows</h3>
    <p class="small muted">Asked with <code>DigitalCredential.userAgentAllowsProtocol()</code>. No wallet opens.</p>
    <ul class="checks">${rows}</ul>`);
}
