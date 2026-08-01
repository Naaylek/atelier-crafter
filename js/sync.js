// Synchronisation automatique entre appareils via un Gist GitHub privé.
// Le jeton est saisi par toi, stocké uniquement dans CE navigateur, et n'est
// jamais envoyé ailleurs qu'à api.github.com. Révocable à tout moment.

import { state, setState, toast } from "./store.js";

const CFG_KEY = "atelier-crafter-sync";
const FILE = "atelier-crafter.json";
const API = "https://api.github.com";

let cfg = load();
let status = "off";   // off | ok | busy | error | conflict
let lastError = "";
let pushTimer = null;
let pulling = false;
let dirty = false; // modifications locales pas encore envoyées

function load() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; }
  catch { return {}; }
}
function saveCfg() { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); }

export const isConfigured = () => !!(cfg.token && cfg.gistId);
export const getStatus = () => ({ status, lastError, gistId: cfg.gistId, lastSync: cfg.lastSync });
export const getConfig = () => ({ ...cfg, token: cfg.token ? "•".repeat(12) : "" });

function setStatus(s, err = "") {
  status = s; lastError = err;
  window.dispatchEvent(new CustomEvent("sync-status"));
}

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: "Bearer " + cfg.token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!r.ok) {
    const msg = r.status === 401 ? "jeton invalide ou expiré"
      : r.status === 403 ? "jeton sans la permission « Gists »"
      : r.status === 404 ? "gist introuvable"
      : `erreur HTTP ${r.status}`;
    throw new Error(msg);
  }
  return r.json();
}

// Connecte un jeton : réutilise le gist existant ou en crée un nouveau (privé).
export async function connect(token) {
  cfg.token = token.trim();
  setStatus("busy");
  try {
    const gists = await api("/gists?per_page=100");
    const found = gists.find(g => g.files && g.files[FILE]);
    if (found) {
      cfg.gistId = found.id;
    } else {
      const created = await api("/gists", {
        method: "POST",
        body: JSON.stringify({
          description: "Atelier Crafter — sauvegarde (privé)",
          public: false,
          files: { [FILE]: { content: JSON.stringify({ savedAt: 0, state: null }) } },
        }),
      });
      cfg.gistId = created.id;
    }
    saveCfg();
    setStatus("ok");
    return { ok: true, created: !found };
  } catch (e) {
    cfg.token = null;
    setStatus("error", e.message);
    return { ok: false, error: e.message };
  }
}

export function disconnect() {
  cfg = {};
  localStorage.removeItem(CFG_KEY);
  setStatus("off");
}

async function readRemote() {
  const g = await api("/gists/" + cfg.gistId);
  const f = g.files?.[FILE];
  if (!f) return null;
  // les gros fichiers sont tronqués : on récupère alors le contenu brut
  const raw = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
  const parsed = JSON.parse(raw);
  return parsed && parsed.state ? parsed : null;
}

// Envoie l'état local vers le gist.
export async function push(silent = true) {
  if (!isConfigured()) return;
  setStatus("busy");
  try {
    const payload = { savedAt: Date.now(), device: deviceName(), state };
    await api("/gists/" + cfg.gistId, {
      method: "PATCH",
      body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(payload) } } }),
    });
    cfg.lastSync = payload.savedAt;
    saveCfg();
    dirty = false;
    setStatus("ok");
    if (!silent) toast("☁️ Sauvegardé en ligne");
  } catch (e) {
    setStatus("error", e.message);
    if (!silent) toast("⚠️ Synchro impossible : " + e.message);
  }
}

// Récupère l'état distant. Demande confirmation si les deux côtés ont bougé.
export async function pull(interactive = false) {
  if (!isConfigured() || pulling) return;
  pulling = true;
  setStatus("busy");
  try {
    const remote = await readRemote();
    if (!remote) { setStatus("ok"); return; }
    const localTime = cfg.lastSync || 0;
    if (remote.savedAt <= localTime && !interactive) { setStatus("ok"); return; }
    if (remote.savedAt <= localTime && interactive) {
      toast("☁️ Déjà à jour");
      setStatus("ok");
      return;
    }
    const quand = new Date(remote.savedAt).toLocaleString("fr-FR");
    // on ne remplace jamais en silence des modifications locales non envoyées
    const localModifie = dirty || (localStorage.getItem("atelier-crafter-v1") && localTime === 0);
    if (localModifie || interactive) {
      const ok = confirm(
        `Sauvegarde en ligne plus récente (${quand}${remote.device ? " · " + remote.device : ""}).\n\n` +
        `La charger ? Tes modifications locales non synchronisées seront remplacées.\n` +
        `(Annuler = garder le local, puis « ⬆️ Envoyer » pour écraser la version en ligne.)`);
      if (!ok) { setStatus("conflict"); return; }
    }
    setState(remote.state);
    cfg.lastSync = remote.savedAt;
    saveCfg();
    dirty = false;
    setStatus("ok");
    toast("☁️ Données récupérées (" + quand + ")");
  } catch (e) {
    setStatus("error", e.message);
    if (interactive) toast("⚠️ " + e.message);
  } finally {
    pulling = false;
  }
}

function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "PC";
  return "navigateur";
}

// Envoi automatique différé après chaque modification.
export function scheduleAutoPush() {
  if (!isConfigured() || pulling) return;
  dirty = true;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push(true), 4000);
}

export function init() {
  if (!isConfigured()) { setStatus("off"); return; }
  setStatus("ok");
  pull(false);
  window.addEventListener("store-changed", scheduleAutoPush);
  // dernier envoi avant fermeture de l'onglet
  window.addEventListener("beforeunload", () => {
    if (pushTimer) { clearTimeout(pushTimer); navigator.sendBeacon && push(true); }
  });
}
