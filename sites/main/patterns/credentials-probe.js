// For the digital-credentials page: which protocols this browser allows, and a
// button that makes one real request, for proof of age from a mobile driving
// licence. This page has no verifier. It shows what came back and checks none
// of it.

const PROTOCOLS = ["openid4vp-v1-unsigned", "openid4vp-v1-signed", "openid4vp-v1-multisigned", "org-iso-mdoc"];
const PROTOCOL = "openid4vp-v1-unsigned";

// An OpenID4VP request for one claim. The response is encrypted to a key made
// for this request, which a verifier would keep on its server. This page keeps
// it in memory and never decrypts anything.
async function buildRequest() {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const { kty, crv, x, y } = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return {
    response_type: "vp_token",
    response_mode: "dc_api.jwt",
    nonce,
    client_metadata: {
      jwks: { keys: [{ kty, crv, x, y, use: "enc", alg: "ECDH-ES", kid: "1" }] },
      encrypted_response_enc_values_supported: ["A128GCM"],
      vp_formats_supported: { mso_mdoc: { issuerauth_alg_values: [-7], deviceauth_alg_values: [-7] } },
    },
    dcql_query: {
      credentials: [{
        id: "licence",
        format: "mso_mdoc",
        meta: { doctype_value: "org.iso.18013.5.1.mDL" },
        claims: [{ path: ["org.iso.18013.5.1", "age_over_18"] }],
      }],
    },
  };
}

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

  el.insertAdjacentHTML("beforeend", `<h3>Ask a wallet for proof of age</h3>
    <p class="small">The button asks for one claim, <code>age_over_18</code>, from a mobile driving licence, over <code>${PROTOCOL}</code>. This page has no verifier, so it shows what came back and does not decrypt or check it.</p>
    <div class="row" style="margin-top:.5rem"><button type="button" id="dc-ask"${hasApi ? "" : " disabled"}>Ask for proof of age</button></div>
    <p id="dc-result" class="small" aria-live="polite"></p>
    <h3>Credential protocols this browser allows</h3>
    <p class="small muted">Asked with <code>DigitalCredential.userAgentAllowsProtocol()</code>. No wallet opens.</p>
    <ul class="checks">${rows}</ul>`);

  const result = el.querySelector("#dc-result");
  const say = (state, text) => { result.dataset.state = state; result.textContent = text; };
  el.querySelector("#dc-ask").addEventListener("click", async () => {
    say("waiting", "Asked the browser. It shows its own dialog, or hands over to a wallet.");
    try {
      const data = await buildRequest();
      const credential = await navigator.credentials.get({ digital: { requests: [{ protocol: PROTOCOL, data }] } });
      const fields = credential?.data && typeof credential.data === "object" ? Object.keys(credential.data).join(", ") : typeof credential?.data;
      const size = JSON.stringify(credential?.data ?? "").length;
      say("answered", `A wallet answered over ${credential.protocol}. The response has ${fields} (${size} characters), encrypted to a key this page made and then threw away.`);
    } catch (err) {
      say("failed", `No credential: ${err.name}. ${err.message}`);
    }
  });
}
