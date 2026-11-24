// Interactive filter + search explorer shared by the Hub and /patterns/.
import { all, groups, byGroup, plain } from "/patterns/all.js";

export function mountExplorer(container) {
  let activeGroup = "all";
  let activeState = "all";
  let query = "";

  const liveCount = all.filter((p) => p.state === "live").length;

  container.innerHTML = `
    <div class="filter-bar" role="region" aria-label="Filter integration patterns">
      <div class="filter-row">
        <div class="filter-pills" data-role="groups">
          <button type="button" class="pill" data-group="all" aria-pressed="true">All (${all.length})</button>
          ${groups.map((g) => `<button type="button" class="pill" data-group="${g.id}" aria-pressed="false">${g.title}</button>`).join("")}
        </div>
        <input type="search" class="filter-search" id="pattern-search" placeholder="Search patterns, APIs, manifest keys" aria-label="Search patterns">
      </div>
      <div class="filter-row small">
        <div class="filter-pills" data-role="states">
          <button type="button" class="pill" data-state="all" aria-pressed="true">All states</button>
          <button type="button" class="pill" data-state="live" aria-pressed="false">Live demos (${liveCount})</button>
          <button type="button" class="pill" data-state="planned" aria-pressed="false">Planned (${all.length - liveCount})</button>
        </div>
        <span class="muted" id="pattern-tally" aria-live="polite"></span>
      </div>
    </div>
    <div id="groups"></div>`;

  const groupsEl = container.querySelector("#groups");
  const tallyEl = container.querySelector("#pattern-tally");

  function render() {
    const q = query.trim().toLowerCase();
    const visibleGroups = activeGroup === "all" ? groups : groups.filter((g) => g.id === activeGroup);
    let shown = 0;

    const sections = visibleGroups.map((g) => {
      const items = byGroup(g.id).filter((p) => {
        if (activeState !== "all" && p.state !== activeState) return false;
        if (!q) return true;
        const hay = `${p.id} ${plain(p.title)} ${plain(p.blurb)} ${(p.how || []).map(plain).join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
      if (!items.length) return "";
      shown += items.length;
      return `<section class="group" id="${g.id}">
        <div class="group-head">
          <h2>${g.title}</h2>
          <span class="group-count">${items.length} pattern${items.length === 1 ? "" : "s"}</span>
        </div>
        <p class="muted">${g.blurb}</p>
        <ul class="cards">${items.map((p) => `<li><a href="/patterns/${p.id}/">
          <strong>${p.title}</strong>
          <span>${plain(p.blurb).split(". ")[0].replace(/\.$/, "")}.</span>
          <div class="card-meta">
            <span class="${p.state}">${p.state === "live" ? "Live demo" : "Planned"}</span>
          </div>
        </a></li>`).join("")}</ul>
      </section>`;
    }).filter(Boolean);

    groupsEl.innerHTML = sections.length
      ? sections.join("")
      : `<div class="panel" style="margin-top:1rem"><p class="muted">Nothing matches. Clear the search, or go back to All.</p></div>`;
    tallyEl.textContent = `Showing ${shown} of ${all.length} patterns`;
  }

  container.querySelectorAll("[data-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeGroup = btn.dataset.group;
      container.querySelectorAll("[data-group]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      render();
    });
  });

  container.querySelectorAll("[data-state]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeState = btn.dataset.state;
      container.querySelectorAll("[data-state]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      render();
    });
  });

  container.querySelector("#pattern-search").addEventListener("input", (e) => {
    query = e.target.value;
    render();
  });

  render();
}
