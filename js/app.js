// Point d'entrée : navigation onglets, undo/redo, historique, export/import.
import { exportJSON, importJSON, undo, redo, canUndo, canRedo, getHistory, jumpTo } from "./store.js";
import { bindLockButton, isUnlocked, reveal, MASK } from "./secret.js";
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
