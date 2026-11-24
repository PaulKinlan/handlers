// For the contact-picker page: ask the OS contact picker for names/emails
// and show what came back (demonstrating a brokered OS picker with a reply).

export function run(el) {
  el.insertAdjacentHTML("beforeend", `<h3>Try the OS contact picker</h3>
    <p class="small">On Android Chrome, this opens the operating system's contact picker and returns only the fields you approve. Desktop browsers generally do not expose it.</p>
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
        ? `Returned ${picked.length} contact(s) with properties: ${Object.keys(picked[0]).join(", ")}.`
        : "Picker closed with no contacts selected.";
    } catch (err) {
      out.textContent = `Contact picker failed: ${err.name} (${err.message})`;
    }
  });
}
