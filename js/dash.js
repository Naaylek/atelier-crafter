// Tableau de bord : vue d'ensemble du projet.
import { state, eur, fmt, resetAll, save } from "./store.js";
import { esc } from "./planning.js";
import { reveal, isUnlocked, MASK } from "./secret.js";

export function render(root) {
  const tasks = state.planning.tasks;
  const nDone = tasks.filter(t => t.status === "done").length;
  const totalH = tasks.reduce((s, t) => s + (+t.dur || 0), 0);
  const restH = tasks.filter(t => t.status !== "done").reduce((s, t) => s + (+t.dur || 0), 0);

  const bItems = state.budget.items;
  const bSum = a => a.reduce((s, i) => s + i.price * i.qty, 0);
  const total = bSum(bItems.filter(i => i.cat !== "Mécanique"));
  const spent = bSum(bItems.filter(i => i.status === "done"));
  const max = state.budget.max;

  const next = tasks.find(t => t.status === "doing") || tasks.find(t => t.status === "todo");
  const V = state.van;
  const nMeubles = (state.layouts[state.activeLayout] || {}).items?.length || 0;

  root.innerHTML = `
    <h2>🏠 Tableau de bord — projet fourgon vacances</h2>
    <div class="cards">
      <div class="card stat">
        <div class="lbl">Avancement chantier</div>
        <div class="big">${tasks.length ? Math.round(nDone / tasks.length * 100) : 0}%</div>
        <div class="progress"><div style="width:${tasks.length ? nDone / tasks.length * 100 : 0}%"></div></div>
        <div class="muted">${nDone}/${tasks.length} tâches · reste ~${restH} h de boulot</div>
      </div>
      <div class="card stat">
        <div class="lbl">Budget aménagement</div>
        <div class="big ${total > max ? "bad" : "ok"}">${eur(total)}</div>
        <div class="progress"><div class="${total > max ? "over" : ""}" style="width:${Math.min(100, total / max * 100)}%"></div></div>
        <div class="muted">sur ${eur(max)} · déjà dépensé ${eur(spent)}</div>
      </div>
      <div class="card stat">
        <div class="lbl">Prochaine étape</div>
        <div style="font-size:15px">${next ? "▶️ " + esc(next.name) : "🎉 Chantier terminé !"}</div>
        <div class="muted">${next && next.notes ? esc(next.notes) : ""}</div>
      </div>
      <div class="card stat">
        <div class="lbl">Plan actif</div>
        <div style="font-size:15px">🚐 ${esc((state.layouts[state.activeLayout] || {}).label || "—")}</div>
        <div class="muted">${nMeubles} meuble(s) placé(s)</div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <h3>🚐 Le van</h3>
        <table class="calc-table">
          <tr><td>Modèle</td><td>VW Crafter 35 L2H1 · 2.0 TDI 163ch · 2013</td></tr>
          <tr><td>Caisson utile</td><td><strong>${V.L} × ${V.W} × ${V.H} mm</strong></td></tr>
          <tr><td>Roues → portes arrière</td><td>${V.rearToArch} mm</td></tr>
          <tr><td>Empattement / long. totale</td><td>${V.wheelbase} / ${V.totalL} mm</td></tr>
          <tr><td>Kilométrage</td><td>208 500 km · CT ok 04/2028</td></tr>
          <tr><td>Immatriculation</td><td>${esc(String(reveal("plate")))}</td></tr>
          <tr><td>Assurance</td><td>${esc(String(reveal("insurer")))}</td></tr>
          <tr><td>Coût van</td><td>${isUnlocked() ? eur(reveal("vanCost")) + " (achat + carte grise)" : MASK}</td></tr>
        </table>
        ${isUnlocked() ? "" : `<p class="muted" style="font-size:11px;margin-top:6px">🔒 Infos privées masquées — bouton 🔒 en haut à droite pour les afficher.</p>`}
      </div>
      <div class="card">
        <h3>⚠️ À surveiller <button class="btn small secondary" id="note-add">+ note</button></h3>
        <div id="notes-list">
          ${state.notes.map((n, i) => `
            <div style="display:flex;gap:6px;margin-bottom:4px">
              <input type="text" data-note="${i}" value="${esc(n)}" style="flex:1;font-size:13px">
              <button class="btn small danger" data-delnote="${i}">✕</button>
            </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>💡 Raccourcis</h3>
        <p style="font-size:13px">
          <strong>Van 3D</strong> : glisser = déplacer · flèches = 10 mm · R = pivoter · D = dupliquer.<br>
          <strong>Élec/Eau</strong> : 🔗 Relier puis cliquer 2 blocs · molette = zoom.<br>
          <strong>Sauvegarde</strong> : tout est enregistré automatiquement dans le navigateur.
          Pense à <em>💾 Exporter</em> régulièrement (fichier de secours) !
        </p>
        <button class="btn danger small" id="dash-reset">♻️ Tout réinitialiser</button>
      </div>
    </div>`;

  root.querySelector("#dash-reset").onclick = resetAll;
  root.querySelector("#note-add").onclick = () => {
    state.notes.push("Nouvelle note");
    save("notes", "Note ajoutée");
    render(root);
  };
  root.querySelectorAll("[data-note]").forEach(inp => inp.onchange = () => {
    state.notes[+inp.dataset.note] = inp.value;
    save("notes", "Note modifiée");
  });
  root.querySelectorAll("[data-delnote]").forEach(b => b.onclick = () => {
    state.notes.splice(+b.dataset.delnote, 1);
    save("notes", "Note supprimée");
    render(root);
  });
}
