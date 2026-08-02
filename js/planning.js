// Onglet Planning : tâches par phase, statut, durée, dates. Phases 100% modifiables.
import { state, save, uid } from "./store.js";

const STATUS = { todo: "À faire", doing: "En cours", done: "Fait" };
let filterStatus = "all";
let collapsed = {};

export function render(root) {
  const tasks = state.planning.tasks;
  const phases = state.planning.phases;
  const totalH = tasks.reduce((s, t) => s + (+t.dur || 0), 0);
  const doneH = tasks.filter(t => t.status === "done").reduce((s, t) => s + (+t.dur || 0), 0);
  const nDone = tasks.filter(t => t.status === "done").length;

  root.innerHTML = `
    <h2>📋 Planning de production</h2>
    <div class="cards">
      <div class="card stat"><div class="lbl">Tâches</div><div class="big">${nDone} / ${tasks.length}</div>
        <div class="progress"><div style="width:${tasks.length ? nDone / tasks.length * 100 : 0}%"></div></div></div>
      <div class="card stat"><div class="lbl">Heures estimées</div><div class="big">${totalH} h</div>
        <div class="muted">${doneH} h faites · reste ${totalH - doneH} h ≈ ${Math.ceil((totalH - doneH) / 12)} week-ends</div></div>
      <div class="card stat"><div class="lbl">Prochaine tâche</div>
        <div>${nextTask() ? "▶️ " + esc(nextTask().name) : "🎉 Tout est fait !"}</div></div>
    </div>
    <div class="toolrow">
      <label>Filtre :</label>
      <select id="pl-filter">
        <option value="all">Toutes</option>
        <option value="todo" ${filterStatus === "todo" ? "selected" : ""}>À faire</option>
        <option value="doing" ${filterStatus === "doing" ? "selected" : ""}>En cours</option>
        <option value="done" ${filterStatus === "done" ? "selected" : ""}>Faites</option>
      </select>
      <button class="btn secondary" id="pl-addphase">+ Phase</button>
      <span class="spacer"></span>
      <button class="btn" id="pl-print">🖨 Imprimer</button>
    </div>
    <div id="pl-phases"></div>`;

  const cont = root.querySelector("#pl-phases");
  phases.forEach((phaseName, pi) => {
    const pts = tasks.filter(t => t.phase === pi && (filterStatus === "all" || t.status === filterStatus));
    const all = tasks.filter(t => t.phase === pi);
    if (filterStatus !== "all" && !pts.length) return;
    const pdone = all.filter(t => t.status === "done").length;
    const ph = document.createElement("div");
    ph.className = "phase-block";
    ph.innerHTML = `
      <div class="phase-head" data-phase="${pi}">
        <span class="ph-caret">${collapsed[pi] ? "▸" : "▾"}</span>
        <input type="text" class="ph-name" value="${esc(phaseName)}" title="Clique pour renommer la phase"
               style="font-weight:700;border:none;background:transparent;min-width:220px">
        <span class="muted">${pdone}/${all.length} · ${all.reduce((s, t) => s + (+t.dur || 0), 0)} h</span>
        <div class="progress"><div style="width:${all.length ? pdone / all.length * 100 : 0}%"></div></div>
        <button class="btn small secondary" data-add="${pi}">+ tâche</button>
        <button class="btn small danger ph-del" data-del="${pi}" title="Supprimer la phase">✕</button>
      </div>
      <div class="phase-body" ${collapsed[pi] ? "hidden" : ""}>
        <table class="grid"><thead><tr>
          <th style="width:28px"></th><th>Tâche</th><th style="width:70px">Durée (h)</th>
          <th style="width:150px">Date prévue</th><th style="width:110px">Statut</th>
          <th style="width:150px">Phase</th><th>Notes</th><th style="width:60px"></th>
        </tr></thead><tbody>
          ${pts.map(t => rowHTML(t, phases)).join("")}
        </tbody></table>
      </div>`;
    cont.appendChild(ph);
  });

  // events
  root.querySelector("#pl-filter").onchange = e => { filterStatus = e.target.value; render(root); };
  root.querySelector("#pl-print").onclick = () => window.print();
  root.querySelector("#pl-addphase").onclick = () => {
    const n = prompt("Nom de la nouvelle phase :", (phases.length) + " · Nouvelle phase");
    if (!n) return;
    phases.push(n);
    save("planning", "Phase « " + n + " » ajoutée");
    render(root);
  };

  cont.querySelectorAll(".ph-caret").forEach(c => c.onclick = () => {
    const pi = c.closest(".phase-head").dataset.phase;
    collapsed[pi] = !collapsed[pi]; render(root);
  });
  cont.querySelectorAll(".ph-name").forEach(inp => inp.onchange = () => {
    const pi = +inp.closest(".phase-head").dataset.phase;
    phases[pi] = inp.value;
    save("planning", "Phase renommée : " + inp.value);
  });
  cont.querySelectorAll(".ph-del").forEach(b => b.onclick = () => {
    const pi = +b.dataset.del;
    const nb = tasks.filter(t => t.phase === pi).length;
    if (phases.length <= 1) return alert("Impossible : dernière phase.");
    if (!confirm(`Supprimer la phase « ${phases[pi]} » ?${nb ? `\nSes ${nb} tâche(s) iront dans « ${phases[pi === 0 ? 1 : 0]} ».` : ""}`)) return;
    const dest = pi === 0 ? 0 : 0; // les tâches vont dans la première phase restante
    state.planning.tasks.forEach(t => {
      if (t.phase === pi) t.phase = dest;
      else if (t.phase > pi) t.phase--;
    });
    phases.splice(pi, 1);
    save("planning", "Phase supprimée");
    render(root);
  });
  cont.querySelectorAll("[data-add]").forEach(b => b.onclick = e => {
    e.stopPropagation();
    state.planning.tasks.push({ id: uid(), phase: +b.dataset.add, name: "Nouvelle tâche", dur: 1, date: "", status: "todo", notes: "" });
    save("planning", "Tâche ajoutée");
    render(root);
  });
  cont.querySelectorAll("tr[data-id]").forEach(tr => {
    const t = state.planning.tasks.find(x => x.id === tr.dataset.id);
    tr.querySelector(".t-status").onchange = e => { t.status = e.target.value; save("planning", "Statut : " + t.name); render(root); };
    tr.querySelector(".t-name").onchange = e => { t.name = e.target.value; save("planning", "Tâche renommée"); };
    tr.querySelector(".t-dur").onchange = e => { t.dur = +e.target.value || 0; save("planning", "Durée : " + t.name); render(root); };
    tr.querySelector(".t-date").onchange = e => { t.date = e.target.value; save("planning", "Date : " + t.name); };
    tr.querySelector(".t-notes").onchange = e => { t.notes = e.target.value; save("planning", "Note : " + t.name); };
    tr.querySelector(".t-phase").onchange = e => { t.phase = +e.target.value; save("planning", "Phase changée : " + t.name); render(root); };
    tr.querySelector(".t-del").onclick = () => {
      if (!confirm("Supprimer cette tâche ?")) return;
      state.planning.tasks = state.planning.tasks.filter(x => x.id !== t.id);
      save("planning", "Tâche supprimée : " + t.name);
      render(root);
    };
    tr.querySelector(".t-check").onchange = e => {
      t.status = e.target.checked ? "done" : "todo";
      save("planning", (e.target.checked ? "Fait : " : "À refaire : ") + t.name);
      render(root);
    };
  });
}

// data-label : sert d'intitulé quand les lignes deviennent des fiches (téléphone)
function rowHTML(t, phases) {
  return `<tr data-id="${t.id}">
    <td data-label="Fait"><input type="checkbox" class="t-check" ${t.status === "done" ? "checked" : ""}></td>
    <td data-label="Tâche" class="c-main"><input type="text" class="t-name" value="${esc(t.name)}" ${t.status === "done" ? 'style="text-decoration:line-through;color:#999"' : ""}></td>
    <td data-label="Durée (h)"><input type="number" class="t-dur" value="${t.dur}" min="0" step="0.5" style="width:60px"></td>
    <td data-label="Date prévue"><input type="date" class="t-date" value="${t.date || ""}"></td>
    <td data-label="Statut"><select class="t-status">
      ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${t.status === k ? "selected" : ""}>${v}</option>`).join("")}
    </select></td>
    <td data-label="Phase"><select class="t-phase">
      ${phases.map((p, i) => `<option value="${i}" ${t.phase === i ? "selected" : ""}>${esc(p)}</option>`).join("")}
    </select></td>
    <td data-label="Notes" class="w-s c-main"><input type="text" class="t-notes" value="${esc(t.notes || "")}" placeholder="…"></td>
    <td data-label="" class="c-act"><button class="btn small danger t-del" title="Supprimer">✕</button></td>
  </tr>`;
}

function nextTask() {
  const t = state.planning.tasks;
  return t.find(x => x.status === "doing") || t.find(x => x.status === "todo");
}

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
