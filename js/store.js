// Store central : état + persistance localStorage + export/import + historique undo/redo.
import { VAN, DEFAULT_TASKS, DEFAULT_BUDGET, DEFAULT_ELEC, DEFAULT_EAU, VS3D_LAYOUTS, PHASES, BUDGET_CATS } from "./data.js";

const KEY = "atelier-crafter-v1";
let _uid = Date.now() % 100000;
export const uid = () => "u" + (_uid++).toString(36) + Math.random().toString(36).slice(2, 6);

// alignement carrosserie mesuré sur le modèle 3D (essieux ↔ passages de roues)
export const SHELL_DEFAULT = { visible: true, x: 0, y: -570, z: 1040, scale: 10, opacity: 0.3 };

const DEFAULT_NOTES = [
  "Embrayage d'origine (208 500 km) → ~1 000 €",
  "Pare-brise fissuré → faire jouer le bris de glace",
  "Porte coulissante : pas de maintien ouvert",
  "Verrouillage auto bizarre → module de confort ?",
  "VASP → changer d'assurance (MAIF)",
];

function freshState() {
  const layouts = VS3D_LAYOUTS.map((l, i) => ({
    id: "layout" + i,
    label: l.label,
    items: l.items.map(it => ({ id: uid(), rot: 0, y: null, ...it })),
    measures: [],
  }));
  layouts.push({ id: "layout-custom", label: "Mon plan définitif", items: [], measures: [] });
  return {
    version: 1,
    van: { ...VAN, shell: { ...SHELL_DEFAULT } },
    planning: { phases: PHASES.slice(), tasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)) },
    budget: { max: 5000, cats: BUDGET_CATS.slice(), items: JSON.parse(JSON.stringify(DEFAULT_BUDGET)) },
    elec: JSON.parse(JSON.stringify(DEFAULT_ELEC)),
    eau: JSON.parse(JSON.stringify(DEFAULT_EAU)),
    notes: DEFAULT_NOTES.slice(),
    customLib: [],
    layouts,
    activeLayout: 0,
  };
}

// migration des états créés par d'anciennes versions
function migrate(s) {
  if (!s.planning.phases) s.planning.phases = PHASES.slice();
  if (!s.budget.cats) s.budget.cats = BUDGET_CATS.slice();
  if (!s.notes) s.notes = DEFAULT_NOTES.slice();
  if (!s.customLib) s.customLib = [];
  s.layouts.forEach(l => { if (!l.measures) l.measures = []; });
  // anciens décalages carrosserie par défaut → valeur mesurée sur les essieux
  if (s.van.shell && (s.van.shell.z === 180 || s.van.shell.z === 1100)) s.van.shell.z = SHELL_DEFAULT.z;
  return s;
}

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === 1) return migrate(s);
    }
  } catch (e) { console.warn("load failed", e); }
  return freshState();
}

// ---------------- historique (undo / redo) ----------------
const HISTORY_MAX = 100;
let history = [{ label: "État initial", time: Date.now(), snap: JSON.stringify(state) }];
let hPointer = 0;

export const canUndo = () => hPointer > 0;
export const canRedo = () => hPointer < history.length - 1;
export const getHistory = () => history.map((h, i) => ({ label: h.label, time: h.time, current: i === hPointer, i }));

function pushHistory(label) {
  const snap = JSON.stringify(state);
  if (snap === history[hPointer].snap) return;
  history = history.slice(0, hPointer + 1);
  const last = history[history.length - 1];
  // regroupe les modifications rapprochées de même nature (sliders, saisie…)
  if (last.label === label && Date.now() - last.time < 800) {
    last.snap = snap; last.time = Date.now();
  } else {
    history.push({ label, time: Date.now(), snap });
    if (history.length > HISTORY_MAX) history.shift();
  }
  hPointer = history.length - 1;
}

function applySnapshot(i) {
  hPointer = Math.max(0, Math.min(history.length - 1, i));
  state = migrate(JSON.parse(history[hPointer].snap));
  persist();
  window.dispatchEvent(new CustomEvent("history-restored"));
}

export function undo() { if (canUndo()) { applySnapshot(hPointer - 1); toast("↩️ " + history[hPointer + 1].label + " annulé"); } }
export function redo() { if (canRedo()) { applySnapshot(hPointer + 1); toast("↪️ Rétabli : " + history[hPointer].label); } }
export function jumpTo(i) { applySnapshot(i); toast("🕘 Retour à : " + history[hPointer].label); }

// ---------------- sauvegarde ----------------
const LABELS = {
  planning: "Planning modifié", budget: "Budget modifié", elec: "Schéma élec modifié",
  eau: "Circuit d'eau modifié", van: "Aménagement 3D modifié", notes: "Notes modifiées", "": "Modification",
};

let saveTimer = null;
export function save(section = "", label = "") {
  pushHistory(label || LABELS[section] || LABELS[""]);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 250);
  window.dispatchEvent(new CustomEvent("store-changed", { detail: section }));
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.error("save failed", e); toast("⚠️ Sauvegarde impossible : " + e.message); }
}

export function resetAll() {
  if (!confirm("Tout réinitialiser aux valeurs par défaut ? Tes données actuelles seront perdues (exporte-les avant si besoin).")) return;
  state = freshState();
  localStorage.setItem(KEY, JSON.stringify(state));
  location.reload();
}

export function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const d = new Date().toISOString().slice(0, 10);
  a.download = `atelier-crafter-${d}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("💾 Données exportées");
}

export function importJSON(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s || s.version !== 1) throw new Error("format inconnu");
      state = migrate(s);
      localStorage.setItem(KEY, JSON.stringify(state));
      location.reload();
    } catch (e) { toast("❌ Import impossible : " + e.message); }
  };
  r.readAsText(file);
}

export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2500);
}

export const fmt = (n, dec = 0) =>
  (Math.round(n * 10 ** dec) / 10 ** dec).toLocaleString("fr-FR", { maximumFractionDigits: dec });
export const eur = n => fmt(n, 2).replace(/[,.]00$/, "") + " €";
