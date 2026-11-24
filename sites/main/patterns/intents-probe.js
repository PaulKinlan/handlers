// For the intents-lineage page: interactive Web Intents verb matrix mapping
// each classic intent verb to today's fragmented platform API, whether the
// caller gets a reply back, and live availability in the reader's browser.

const VERBS = [
  {
    verb: "Open link / scheme",
    api: "registerProtocolHandler / protocol_handlers",
    pattern: "protocol-handlers",
    reply: { ok: false, label: "No" },
    check: () => typeof navigator.registerProtocolHandler === "function",
  },
  {
    verb: "Open file from OS",
    api: "file_handlers + launchQueue",
    pattern: "file-handlers",
    reply: { ok: false, label: "No (handle only)" },
    check: () => "launchQueue" in window,
  },
  {
    verb: "Edit file across origins",
    api: "File handle + Hawser MessagePort",
    pattern: "os-file-handoff",
    reply: { ok: true, label: "Manual port" },
    check: () => typeof MessageChannel === "function" && typeof window.showOpenFilePicker === "function",
  },
  {
    verb: "Share out",
    api: "navigator.share()",
    pattern: "web-share",
    reply: { ok: false, label: "No (undefined)" },
    check: () => typeof navigator.share === "function",
  },
  {
    verb: "Receive share",
    api: "manifest share_target",
    pattern: "share-target",
    reply: { ok: false, label: "No (navigation)" },
    check: () => "serviceWorker" in navigator,
  },
  {
    verb: "Copy / paste structured data",
    api: 'ClipboardItem ("web " custom format)',
    pattern: "clipboard",
    reply: { ok: false, label: "Clipboard only" },
    check: () => typeof ClipboardItem === "function" && typeof ClipboardItem.supports === "function" && ClipboardItem.supports("web application/x-webtasks+json"),
  },
  {
    verb: "Pick contact",
    api: "navigator.contacts.select()",
    pattern: "contact-picker",
    reply: { ok: true, label: "Yes (Promise)" },
    check: () => typeof navigator.contacts?.select === "function",
  },
  {
    verb: "Pay",
    api: "PaymentRequest + Payment Handler",
    pattern: "payment-handler",
    reply: { ok: true, label: "Yes (PaymentResponse)" },
    check: () => typeof window.PaymentRequest === "function",
  },
  {
    verb: "Verify identity / credential",
    api: "navigator.credentials.get({ digital })",
    pattern: "digital-credentials",
    reply: { ok: true, label: "Yes (DigitalCredential)" },
    check: () => typeof window.DigitalCredential === "function",
  },
];

export function run(el) {
  const rows = VERBS.map((v) => {
    let here = false;
    try { here = !!v.check(); } catch {}
    return `<tr>
      <td><strong>${v.verb}</strong></td>
      <td><a href="/patterns/${v.pattern}/"><code>${v.api}</code></a></td>
      <td><span class="jack${v.reply.ok ? " on" : ""}"></span>${v.reply.label}</td>
      <td><span class="jack${here ? " on" : ""}"></span>${here ? "Available" : "Not here"}</td>
    </tr>`;
  }).join("");

  el.insertAdjacentHTML("beforeend", `<h3>Web Intents verbs mapped to today's APIs</h3>
    <p class="small muted">Checked live in your browser. Notice how almost every OS-launched route (links, files, shares) is one-way; only narrow brokered pickers return an answer.</p>
    <div style="overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);padding:.25rem .75rem">
      <table style="border-collapse:collapse;width:100%;min-width:34rem;font-size:var(--step--1)">
        <thead>
          <tr style="text-align:left;font-family:var(--mono);font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)">
            <th style="padding:.6rem .6rem .6rem 0">Verb</th>
            <th style="padding:.6rem">Platform API</th>
            <th style="padding:.6rem">Returns reply?</th>
            <th style="padding:.6rem 0 .6rem .6rem">In this browser</th>
          </tr>
        </thead>
        <tbody>${rows.replaceAll("<tr>", '<tr style="border-top:1px solid var(--line)">').replaceAll("<td>", '<td style="padding:.55rem .6rem .55rem 0;vertical-align:top">')}</tbody>
      </table>
    </div>`);
}
