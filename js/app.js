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
const ICONS = { off: "☁️", locked: "🔑", ok: "✅", busy: "⏳", error: "⚠️", conflict: "🔀" };

syncBtn.onclick = () => {
  syncPanel.hidden = !syncPanel.hidden;
  if (!syncPanel.hidden) renderSync();
};
document.getElementById("sp-close").onclick = () => syncPanel.hidden = true;

function refreshSyncBadge() {
  const s = sync.getStatus();
  syncBtn.textContent = ICONS[s.status] || "☁️";
  syncBtn.title = {
    off: "Synchro à mettre en place",
    locked: "Mot de passe à saisir",
    ok: "Synchro active" + (s.lastSync ? " · dernier envoi " + new Date(s.lastSync).toLocaleTimeString("fr-FR") : ""),
    busy: "Synchronisation en cours…",
    error: "Erreur : " + s.lastError,
    conflict: "Versions divergentes — ouvre le panneau",
  }[s.status] || "Synchro";
}
window.addEventListener("sync-status", () => {
  refreshSyncBadge();
  if (!syncPanel.hidden) renderSync();
});

// Écran « mot de passe » : le seul geste demandé sur un nouvel appareil.
function viewPassword(body, err) {
  body.innerHTML = `
    <p>Tape ton mot de passe de synchro. <strong>Une seule fois sur cet appareil</strong> —
    ensuite tout se met à jour tout seul, ici comme ailleurs.</p>
    <input type="password" id="sp-pass" placeholder="mot de passe" autocomplete="current-password">
    <button class="btn" id="sp-open" style="width:100%;margin-top:6px">🔓 Ouvrir</button>
    ${err ? `<div class="sp-note">❌ ${esc(err)}</div>` : ""}
    <p class="muted" style="font-size:11px;margin-top:8px">Mot de passe oublié ? Il n'est stocké nulle part et ne peut pas être retrouvé —
    il faudrait repartir d'une sauvegarde 💾 et refaire la mise en place.</p>`;
  const go = async () => {
    const p = body.querySelector("#sp-pass").value;
    if (!p) return;
    const btn = body.querySelector("#sp-open");
    btn.disabled = true; btn.textContent = "⏳ Ouverture…";
    const res = await sync.openWith(p);
    if (res.ok) { syncPanel.hidden = true; return; }
    if (res.needSetup) { renderSync(); return; }
    viewPassword(body, res.wrongPass ? "Mot de passe incorrect." : res.error);
  };
  body.querySelector("#sp-open").onclick = go;
  body.querySelector("#sp-pass").onkeydown = e => { if (e.key === "Enter") go(); };
  body.querySelector("#sp-pass").focus();
}

// Mise en place initiale : une seule fois pour tout le projet, pas par appareil.
function viewSetup(body) {
  body.innerHTML = `
    <p><strong>Mise en place — une seule fois pour tout le projet.</strong>
    Ensuite, sur n'importe quel appareil, il n'y aura plus qu'un mot de passe à taper.</p>
    <p style="margin-top:8px"><strong>1. Choisis un mot de passe</strong> (mémorisable et long, ex. <em>crafter-bleu-vacances</em>) :</p>
    <input type="password" id="sp-p1" placeholder="mot de passe" autocomplete="new-password">
    <input type="password" id="sp-p2" placeholder="le même, pour vérifier" autocomplete="new-password">
    <p style="margin-top:8px"><strong>2. Une clé d'écriture GitHub</strong>, à créer une fois :</p>
    <ol>
      <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Ouvrir la page GitHub</a></li>
      <li>Nom : <em>atelier-crafter</em> · Expiration : <strong>No expiration</strong></li>
      <li><strong>Account permissions</strong> → <strong>Gists</strong> → <em>Read and write</em></li>
      <li>« Generate token », copie, colle ici :</li>
    </ol>
    <input type="password" id="sp-tok" placeholder="github_pat_…" autocomplete="off">
    <button class="btn" id="sp-go" style="width:100%;margin-top:6px">✅ Terminer la mise en place</button>
    <div class="sp-note">🔐 La clé est <strong>chiffrée avec ton mot de passe</strong> avant d'être stockée.
    Sans le mot de passe, elle est illisible — et elle ne donne accès qu'à tes gists, jamais à tes dépôts.
    Révocable à tout moment depuis GitHub.</div>`;
  body.querySelector("#sp-go").onclick = async () => {
    const p1 = body.querySelector("#sp-p1").value, p2 = body.querySelector("#sp-p2").value;
    const tok = body.querySelector("#sp-tok").value.trim();
    if (p1.length < 8) return alert("Mot de passe trop court : 8 caractères minimum.");
    if (p1 !== p2) return alert("Les deux mots de passe ne correspondent pas.");
    if (!tok) return alert("Colle la clé GitHub.");
    const btn = body.querySelector("#sp-go");
    btn.disabled = true; btn.textContent = "⏳ Mise en place…";
    const res = await sync.setup(p1, tok);
    if (!res.ok) { alert("Échec : " + res.error); renderSync(); return; }
    toast("☁️ Synchro en place — plus rien à faire ailleurs qu'un mot de passe");
    syncPanel.hidden = true;
  };
}

function viewActive(body) {
  const s = sync.getStatus();
  body.innerHTML = `
    <p><strong>${ICONS[s.status]} ${{ ok: "Synchro active", busy: "Synchronisation…", error: "Erreur", conflict: "Versions divergentes" }[s.status] || "Prête"}</strong></p>
    <p class="muted" style="font-size:11.5px">Dernier échange : ${s.lastSync ? new Date(s.lastSync).toLocaleString("fr-FR") : "jamais"}</p>
    ${s.lastError ? `<div class="sp-note">⚠️ ${esc(s.lastError)}</div>` : ""}
    <p style="font-size:11.5px">Envoi automatique 4 s après chaque modification, récupération à l'ouverture
    et au retour sur l'onglet.</p>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button class="btn small" id="sp-push">⬆️ Envoyer</button>
      <button class="btn small secondary" id="sp-pull">⬇️ Récupérer</button>
      <button class="btn small danger" id="sp-forget">Oublier ici</button>
    </div>
    <div class="sp-note">Sur un autre appareil : ouvre la même adresse, tape le mot de passe. C'est tout.</div>`;
  body.querySelector("#sp-push").onclick = () => sync.push(false);
  body.querySelector("#sp-pull").onclick = () => sync.pull(true);
  body.querySelector("#sp-forget").onclick = () => {
    if (!confirm("Oublier le mot de passe sur cet appareil ?\nTes données restent en ligne et en local.")) return;
    sync.forget();
    renderSync();
  };
}

let setupNeeded = null; // null = pas encore vérifié
async function renderSync() {
  const body = document.getElementById("sp-body");
  if (sync.isReady()) return viewActive(body);
  if (setupNeeded === null) {
    body.innerHTML = `<p class="muted">⏳ Vérification…</p>`;
    setupNeeded = await sync.needsSetup();
  }
  setupNeeded ? viewSetup(body) : viewPassword(body);
}

sync.init();
refreshSyncBadge();
// Premier passage sur cet appareil alors que la synchro existe déjà :
// on ouvre directement le champ mot de passe, il n'y a que ça à faire.
if (!sync.hasPass()) {
  sync.needsSetup().then(need => {
    setupNeeded = need;
    if (!need) { syncPanel.hidden = false; renderSync(); }
  });
}
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
