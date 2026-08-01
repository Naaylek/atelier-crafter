// Synchronisation entre appareils.
//
// Principe : un espace de stockage GitHub (gist secret) dont l'identifiant est
// dans le code. Tout ce qu'il contient est CHIFFRÉ avec ton mot de passe :
// données ET clé d'écriture. Résultat, sur un nouvel appareil il n'y a qu'une
// seule chose à faire — taper le mot de passe. Une fois. Plus jamais ensuite.

import { state, setState, toast } from "./store.js";

const GIST_ID = "a82a08f543bf7cd4497e871043504de9";
const API = "https://api.github.com/gists/" + GIST_ID;
const ITER = 300000;

const PASS_KEY = "atelier-crafter-pass";
const SEEN_KEY = "atelier-crafter-seen"; // horodatage de la dernière synchro

let pass = localStorage.getItem(PASS_KEY) || null;
let key = null;      // clé AES dérivée (en mémoire)
let ghToken = null;  // clé d'écriture déchiffrée (en mémoire)
let status = "off";  // off | locked | ok | busy | error | conflict
let lastError = "";
let pushTimer = null, pulling = false, dirty = false;

const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export const isReady = () => !!(pass && key && ghToken);
export const hasPass = () => !!pass;

// L'espace de stockage a-t-il déjà été initialisé (par un premier appareil) ?
export async function needsSetup() {
  try {
    const { keyBox } = await readGist();
    return !(keyBox && keyBox.salt);
  } catch {
    return false; // en cas de pépin réseau on propose le mot de passe, pas une réinstallation
  }
}
export const getStatus = () => ({ status, lastError, lastSync: +(localStorage.getItem(SEEN_KEY) || 0) });

function setStatus(s, err = "") {
  status = s; lastError = err;
  window.dispatchEvent(new CustomEvent("sync-status"));
}

// ---------- chiffrement ----------
async function deriveKey(password, salt) {
  const km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptBox(obj, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(ct) };
}

async function decryptBox(box) {
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.data));
  return JSON.parse(dec.decode(clear));
}

// ---------- accès au stockage ----------
// Lecture : possible sans aucune authentification (gist secret).
async function readGist() {
  const r = await fetch(API, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
  if (!r.ok) throw new Error(r.status === 404 ? "espace de stockage introuvable" : `lecture impossible (HTTP ${r.status})`);
  const g = await r.json();
  const get = async name => {
    const f = g.files?.[name];
    if (!f) return null;
    const raw = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
    try { return JSON.parse(raw); } catch { return null; }
  };
  return { data: await get("data.json"), keyBox: await get("key.json") };
}

// Écriture : nécessite la clé, qui est déchiffrée depuis le stockage lui-même.
async function writeGist(files) {
  const r = await fetch(API, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + ghToken,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files }),
  });
  if (!r.ok) throw new Error(r.status === 401 ? "clé d'écriture refusée (révoquée ?)" : `écriture impossible (HTTP ${r.status})`);
}

// ---------- ouverture d'une session ----------
// Sur un appareil déjà configuré : appelé tout seul au chargement.
export async function openWith(password) {
  setStatus("busy");
  try {
    const { data, keyBox } = await readGist();
    if (!keyBox || !keyBox.salt) { setStatus("off"); return { ok: false, needSetup: true }; }
    key = await deriveKey(password, unb64(keyBox.salt));
    let unlocked;
    try { unlocked = await decryptBox(keyBox); }
    catch { key = null; setStatus("locked"); return { ok: false, wrongPass: true }; }
    ghToken = unlocked.token;
    pass = password;
    localStorage.setItem(PASS_KEY, password);
    setStatus("ok");
    if (data) await adopt(data, false);
    listen();
    return { ok: true };
  } catch (e) {
    setStatus("error", e.message);
    return { ok: false, error: e.message };
  }
}

// Première mise en place, une seule fois pour tout le projet.
export async function setup(password, token) {
  setStatus("busy");
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    key = await deriveKey(password, salt);
    ghToken = token.trim();
    const keyBox = await encryptBox({ token: ghToken }, salt);
    const dataBox = await encryptBox({ savedAt: Date.now(), device: deviceName(), state }, salt);
    await writeGist({
      "key.json": { content: JSON.stringify(keyBox) },
      "data.json": { content: JSON.stringify(dataBox) },
    });
    pass = password;
    localStorage.setItem(PASS_KEY, password);
    localStorage.setItem(SEEN_KEY, String(Date.now()));
    setStatus("ok");
    listen();
    return { ok: true };
  } catch (e) {
    key = null; ghToken = null;
    setStatus("error", e.message);
    return { ok: false, error: e.message };
  }
}

export function forget() {
  pass = null; key = null; ghToken = null;
  localStorage.removeItem(PASS_KEY);
  localStorage.removeItem(SEEN_KEY);
  setStatus("off");
}

// ---------- échanges ----------
async function adopt(box, interactive) {
  let payload;
  try { payload = await decryptBox(box); }
  catch { setStatus("error", "contenu illisible avec ce mot de passe"); return; }
  const seen = +(localStorage.getItem(SEEN_KEY) || 0);
  if (payload.savedAt <= seen) {
    if (interactive) toast("☁️ Déjà à jour");
    setStatus("ok");
    return;
  }
  const quand = new Date(payload.savedAt).toLocaleString("fr-FR");
  // on ne remplace jamais en silence des modifications locales non envoyées
  if (dirty || interactive) {
    const ok = confirm(
      `Version en ligne plus récente (${quand}${payload.device ? " · " + payload.device : ""}).\n\n` +
      `La charger ? Tes modifications locales non envoyées seront remplacées.\n` +
      `(Annuler = garder le local, puis « ⬆️ Envoyer » pour écraser la version en ligne.)`);
    if (!ok) { setStatus("conflict"); return; }
  }
  setState(payload.state);
  localStorage.setItem(SEEN_KEY, String(payload.savedAt));
  dirty = false;
  setStatus("ok");
  toast("☁️ Données récupérées (" + quand + ")");
}

export async function push(silent = true) {
  if (!isReady()) return;
  setStatus("busy");
  try {
    const { keyBox } = await readGist();
    const salt = unb64(keyBox.salt);
    const savedAt = Date.now();
    const box = await encryptBox({ savedAt, device: deviceName(), state }, salt);
    await writeGist({ "data.json": { content: JSON.stringify(box) } });
    localStorage.setItem(SEEN_KEY, String(savedAt));
    dirty = false;
    setStatus("ok");
    if (!silent) toast("☁️ Sauvegardé en ligne");
  } catch (e) {
    setStatus("error", e.message);
    if (!silent) toast("⚠️ " + e.message);
  }
}

export async function pull(interactive = false) {
  if (!isReady() || pulling) return;
  pulling = true;
  setStatus("busy");
  try {
    const { data } = await readGist();
    if (data) await adopt(data, interactive);
    else setStatus("ok");
  } catch (e) {
    setStatus("error", e.message);
    if (interactive) toast("⚠️ " + e.message);
  } finally { pulling = false; }
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

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("store-changed", () => {
    if (!isReady() || pulling) return;
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(true), 4000);
  });
  // en revenant sur l'onglet, on récupère ce qu'un autre appareil a pu envoyer
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isReady() && !dirty) pull(false);
  });
}

// Au chargement : si le mot de passe est déjà connu sur cet appareil, tout se
// fait tout seul. Sinon on attend qu'il soit saisi (une seule fois).
export function init() {
  if (!pass) { setStatus("off"); return; }
  setStatus("busy");
  openWith(pass).then(res => {
    if (res.wrongPass) { localStorage.removeItem(PASS_KEY); pass = null; }
  });
}
