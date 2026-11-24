// For the contact-picker page: ask the OS contact picker for names/emails
// and show what came back (demonstrating a brokered OS picker with a reply).

export function run(el) {
  el.insertAdjacentHTML("beforeend", `<h3>Try the contact picker</h3>
    <p class="small">In Chrome on Android this opens the system contact picker, and the page gets only what you choose. Desktop browsers do not have it.</p>
    <div class="row" style="margin-top:.6rem">
      <button type="button" id="cp-pick">Pick a contact</button>
    </div>
    <p id="cp-result" class="small muted" style="margin-top:.6rem" aria-live="polite"></p>`);

  const out = el.querySelector("#cp-result");
  el.querySelector("#cp-pick").addEventListener("click", async () => {
    if (!navigator.contacts?.select) {
      out.textContent = "navigator.contacts.select() is not available in this browser.";
      return;
    }
    try {
      const props = (await navigator.contacts.getProperties?.()) || ["name", "email"];
      const picked = await navigator.contacts.select(props.filter((p) => ["name", "email", "tel"].includes(p)), { multiple: true });
      out.textContent = picked.length
        ? `Got ${picked.length} contact(s), with ${Object.keys(picked[0]).join(", ")}.`
        : "The picker closed with nothing chosen.";
    } catch (err) {
      out.textContent = `Contact picker failed: ${err.name} (${err.message})`;
    }
  });
}
