// Store central : état + persistance localStorage + export/import + historique undo/redo.
import { VAN, DEFAULT_TASKS, DEFAULT_BUDGET, DEFAULT_ELEC, DEFAULT_EAU, VS3D_LAYOUTS, PHASES, BUDGET_CATS, DATA_REV } from "./data.js";

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
    rev: DATA_REV,
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
  if (!(s.rev >= 2)) migrateRev2(s);
  if (!(s.rev >= 3)) migrateRev3(s);
  return s;
}

// rev 3 — les blocs des schémas ont grandi (nom complet sur 2 lignes) :
// on réétale les positions pour qu'ils ne se recouvrent plus. Seuls x et y
// bougent ; les valeurs, les câbles et les positions dans le van ne changent pas.
function respread(list, refs) {
  const byType = {};
  refs.forEach(r => (byType[r.type] = byType[r.type] || []).push(r));
  const seen = {};
  list.forEach(n => {
    const i = (seen[n.type] = (seen[n.type] || 0) + 1) - 1;
    const ref = (byType[n.type] || [])[i];
    if (ref) { n.x = ref.x; n.y = ref.y; }
  });
}

function migrateRev3(s) {
  respread(s.elec.nodes, DEFAULT_ELEC.nodes);
  respread(s.eau.nodes, DEFAULT_EAU.nodes);
  s.rev = 3;
}

// rev 2 — refonte électricité : batterie 300Ah, onduleur 2200W, chauffage
// Webasto, chauffe-eau 12V, plaque induction à la place du gaz.
// Tout ce qui est déjà coché « acheté » est conservé tel quel.
const REV2_DROP = [
  "Batterie LiFePO4 100Ah 12V", "Panneau solaire rigide 200W",
  "Régulateur MPPT Victron 100/30", "Chargeur B2B 12V 30A (Renogy/Victron)",
  "Convertisseur pur sinus 1000W", "Boîte 12 fusibles + bornier masse",
  "Câble 16mm² rouge/noir (au mètre)", "Câble 2.5/4/6mm² + gaines",
  "Fusibles, porte-fusibles, cosses, manchons", "Coupe-circuit + shunt/moniteur batterie",
  "Passe-toit étanche + Sikaflex 522", "Spots LED 12V ×6 + variateur",
  "Prises USB-C / allume-cigare ×3", "Interrupteurs 12V",
  "Plaque gaz 2 feux + bouteille 2.75kg + détendeur + lyre",
  "Vanne + caisson gaz ventilé (VASP)",
  "Frigo compression 12V (Alpicool CF35 ou tiroir)",
];
// anciens libellés de tâches → nouveaux (seulement si la tâche est encore à faire)
const REV2_TASKS = {
  "Installer batterie auxiliaire + coupe-circuit": "Installer batterie 300Ah + coupe-circuit 300 A + SmartShunt",
  "Câbler régulateur MPPT → batterie (fusibles)": "Câbler régulateur MPPT → batterie (10 mm², fusible 50 A)",
  "Poser boîte à fusibles 12V + bornier de masse": "Poser boîte à fusibles 12V + borniers + / −",
  "Câbler convertisseur 230V + prise": "Câbler onduleur (95 mm² + fusible ANL 250 A au ras du +)",
  "Installer gaz : bouteille, détendeur, vanne, test savon": "Poser plaque induction + son circuit 230V",
  "Monter dossier VASP (plans, attestation gaz/élec)": "Monter dossier VASP (plans, attestation élec)",
};

function migrateRev2(s) {
  const B = s.budget;
  // "Eau & gaz" n'a plus de gaz
  if (B.cats.includes("Eau & gaz")) {
    B.cats = B.cats.map(c => (c === "Eau & gaz" ? "Eau" : c));
    B.items.forEach(it => { if (it.cat === "Eau & gaz") it.cat = "Eau"; });
  }
  if (!B.cats.includes("Chauffage")) {
    const at = B.cats.indexOf("Électricité");
    B.cats.splice(at >= 0 ? at + 1 : B.cats.length, 0, "Chauffage");
  }
  // on ne jette que les lignes jamais achetées
  B.items = B.items.filter(it => !(REV2_DROP.includes(it.name) && it.status !== "done"));
  const have = new Set(B.items.map(it => it.name));
  DEFAULT_BUDGET
    .filter(b => ["Électricité", "Chauffage", "Eau", "Cuisine"].includes(b.cat) && !have.has(b.name))
    .forEach(b => B.items.push({ ...JSON.parse(JSON.stringify(b)), id: uid() }));

  // schéma élec entièrement remplacé (il était pré-rempli par défaut)
  s.elec = JSON.parse(JSON.stringify(DEFAULT_ELEC));

  // planning : les quelques lignes devenues fausses
  const P = s.planning;
  const iGaz = P.phases.findIndex(p => p === "5 · Eau & gaz");
  if (iGaz >= 0) P.phases[iGaz] = "5 · Eau & chauffage";
  P.tasks.forEach(t => {
    if (t.status !== "done" && REV2_TASKS[t.name]) t.name = REV2_TASKS[t.name];
  });
  const names = new Set(P.tasks.map(t => t.name));
  DEFAULT_TASKS
    .filter(t => !names.has(t.name) && [
      "Poser différentiel 30 mA + prise 230V intérieure",
      "Installer chauffe-eau 12V Elgena + câble 6 mm² / fusible 25 A",
      "Installer chauffage Webasto : piquage réservoir, échappement, silencieux",
    ].includes(t.name))
    .forEach(t => P.tasks.push({ ...JSON.parse(JSON.stringify(t)), id: uid() }));

  s.rev = 2;
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

// Remplace tout l'état (utilisé par la synchro) sans perdre l'historique undo.
export function setState(newState) {
  state = migrate(newState);
  persist();
  pushHistory("Données récupérées en ligne");
  window.dispatchEvent(new CustomEvent("history-restored"));
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
