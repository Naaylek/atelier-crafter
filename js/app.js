// Point d'entrée : navigation onglets, undo/redo, historique, export/import.
import { exportJSON, importJSON, undo, redo, canUndo, canRedo, getHistory, jumpTo } from "./store.js";
import { bindLockButton, isUnlocked, reveal, MASK } from "./secret.js";
import * as sync from "./sync.js";
import * as dash from "./dash.js";
import * as planning from "./planning.js";
import * as budget from "./budget.js";
import * as elec from "./elec.js";
import * as eau from "./eau.js";
import * as van3d from "./van3d.js";
import { esc } from "./planning.js";

const MODULES = { dash, planning, budget, elec, eau, van: van3d };
let currentTab = "dash";

function show(tab) {
  currentTab = tab;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab").forEach(s => s.classList.toggle("active", s.id === "tab-" + tab));
  MODULES[tab].render(document.getElementById("tab-" + tab));
}

document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => show(b.dataset.tab));

// ---------- undo / redo ----------
const bUndo = document.getElementById("btn-undo");
const bRedo = document.getElementById("btn-redo");

function refreshUndoButtons() {
  bUndo.disabled = !canUndo();
  bRedo.disabled = !canRedo();
}

function rerenderCurrent() {
  if (currentTab === "van") van3d.hardRefresh();
  else MODULES[currentTab].render(document.getElementById("tab-" + currentTab));
  refreshUndoButtons();
  if (!histPanel.hidden) renderHistory();
}

bUndo.onclick = () => undo();
bRedo.onclick = () => redo();

window.addEventListener("keydown", e => {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod || e.key.toLowerCase() !== "z") return;
  // dans un champ texte, laisse l'annulation native du navigateur
  const t = document.activeElement;
  if (t && (t.tagName === "INPUT" && ["text", "number", "date"].includes(t.type) || t.tagName === "TEXTAREA")) return;
  e.preventDefault();
  e.shiftKey ? redo() : undo();
});

window.addEventListener("history-restored", rerenderCurrent);
window.addEventListener("store-changed", refreshUndoButtons);

// ---------- panneau historique ----------
const histPanel = document.getElementById("history-panel");
document.getElementById("btn-history").onclick = () => {
  histPanel.hidden = !histPanel.hidden;
  if (!histPanel.hidden) renderHistory();
};
document.getElementById("hp-close").onclick = () => histPanel.hidden = true;

function renderHistory() {
  const list = document.getElementById("hp-list");
  const h = getHistory().slice().reverse();
  list.innerHTML = h.map(e => `
    <div class="hp-item ${e.current ? "current" : ""}" data-i="${e.i}">
      <span class="t">${new Date(e.time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      <span>${esc(e.label)}</span>
    </div>`).join("");
  list.querySelectorAll(".hp-item").forEach(el => el.onclick = () => jumpTo(+el.dataset.i));
}

// ---------- synchro entre appareils ----------
const syncPanel = document.getElementById("sync-panel");
const syncBtn = document.getElementById("btn-sync");
const ICONS = { off: "☁️", ok: "✅", busy: "⏳", error: "⚠️", conflict: "🔀" };

document.getElementById("btn-sync").onclick = () => {
  syncPanel.hidden = !syncPanel.hidden;
  if (!syncPanel.hidden) renderSync();
};
document.getElementById("sp-close").onclick = () => syncPanel.hidden = true;

function refreshSyncBadge() {
  const s = sync.getStatus();
  syncBtn.textContent = ICONS[s.status] || "☁️";
  syncBtn.title = {
    off: "Synchro non configurée — cliquer pour l'activer",
    ok: "Synchro active" + (s.lastSync ? " · dernier envoi " + new Date(s.lastSync).toLocaleTimeString("fr-FR") : ""),
    busy: "Synchronisation en cours…",
    error: "Erreur de synchro : " + s.lastError,
    conflict: "Versions divergentes — ouvre le panneau",
  }[s.status];
}
window.addEventListener("sync-status", () => {
  refreshSyncBadge();
  if (!syncPanel.hidden) renderSync();
});

function renderSync() {
  const body = document.getElementById("sp-body");
  const s = sync.getStatus();
  if (!sync.isConfigured()) {
    body.innerHTML = `
      <p>Retrouve ton planning, ton budget et tes plans sur <strong>tous tes appareils</strong>,
      via un <strong>Gist GitHub privé</strong> (gratuit, ton compte).</p>
      <ol>
        <li>Ouvre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">cette page GitHub</a></li>
        <li>Nom : <em>atelier-crafter</em> · Expiration : au choix</li>
        <li><strong>Account permissions</strong> → <strong>Gists</strong> → <em>Read and write</em></li>
        <li>« Generate token », copie-le, colle-le ici :</li>
      </ol>
      <input type="password" id="sp-token" placeholder="github_pat_… (collé par toi)" autocomplete="off">
      <button class="btn" id="sp-connect" style="width:100%;margin-top:6px">🔗 Connecter</button>
      <div class="sp-note">🔐 Le jeton reste <strong>dans ce navigateur uniquement</strong> et ne part que vers github.com.
      Donne-lui <strong>seulement</strong> la permission « Gists » : il ne pourra pas toucher à tes dépôts.
      Révocable quand tu veux depuis GitHub.</div>
      <p class="muted" style="font-size:11px">À refaire une fois par appareil (téléphone, autre ordi).</p>`;
    body.querySelector("#sp-connect").onclick = async () => {
      const inp = body.querySelector("#sp-token");
      const t = inp.value.trim();
      if (!t) return alert("Colle d'abord ton jeton.");
      const btn = body.querySelector("#sp-connect");
      btn.disabled = true; btn.textContent = "⏳ Connexion…";
      const res = await sync.connect(t);
      inp.value = "";
      if (!res.ok) { alert("Connexion impossible : " + res.error); renderSync(); return; }
      if (res.created) { await sync.push(false); }
      else { await sync.pull(true); }
      sync.init();
      renderSync();
    };
    return;
  }
  body.innerHTML = `
    <p><strong>${ICONS[s.status]} ${{ ok: "Synchro active", busy: "Synchronisation…", error: "Erreur", conflict: "Versions divergentes" }[s.status] || "Prêt"}</strong></p>
    <p class="muted" style="font-size:11.5px">
      Dernier envoi : ${s.lastSync ? new Date(s.lastSync).toLocaleString("fr-FR") : "jamais"}<br>
      Gist : <a href="https://gist.github.com/${esc(s.gistId)}" target="_blank" rel="noopener">${esc(s.gistId.slice(0, 10))}…</a> (privé)
    </p>
    ${s.lastError ? `<div class="sp-note">⚠️ ${esc(s.lastError)}</div>` : ""}
    <p style="font-size:11.5px">Envoi automatique 4 s après chaque modification. Récupération à l'ouverture de la page.</p>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button class="btn small" id="sp-push">⬆️ Envoyer</button>
      <button class="btn small secondary" id="sp-pull">⬇️ Récupérer</button>
      <button class="btn small danger" id="sp-off">Déconnecter</button>
    </div>
    <div class="sp-note">Sur un autre appareil : ouvre cette même adresse et refais la connexion avec un jeton.</div>`;
  body.querySelector("#sp-push").onclick = () => sync.push(false);
  body.querySelector("#sp-pull").onclick = () => sync.pull(true);
  body.querySelector("#sp-off").onclick = () => {
    if (!confirm("Déconnecter la synchro sur cet appareil ?\nTes données locales et le gist en ligne sont conservés.")) return;
    sync.disconnect();
    renderSync();
  };
}

sync.init();
refreshSyncBadge();

// ---------- export / import ----------
document.getElementById("btn-export").onclick = exportJSON;
document.getElementById("btn-import").onclick = () => document.getElementById("file-import").click();
document.getElementById("file-import").onchange = e => {
  if (e.target.files[0]) importJSON(e.target.files[0]);
};

// ---------- infos privées (verrou) ----------
const lockBtnGlobal = document.getElementById("btn-lock-global");
function refreshSecretUI() {
  lockBtnGlobal.textContent = isUnlocked() ? "🔓" : "🔒";
  lockBtnGlobal.title = isUnlocked()
    ? "Masquer à nouveau les infos privées"
    : "Afficher les infos privées (code à 4 chiffres)";
  document.getElementById("hdr-plate").textContent = reveal("plate", MASK);
}
bindLockButton(lockBtnGlobal, refreshSecretUI);
window.addEventListener("secret-changed", () => {
  refreshSecretUI();
  rerenderCurrent();
});
refreshSecretUI();

refreshUndoButtons();
show("dash");
