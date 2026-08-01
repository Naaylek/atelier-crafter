// Infos privées (plaque, prix payé, assureur) chiffrées AES-GCM.
// Le texte en clair n'est PAS dans le code source : il faut le code pour le déchiffrer.
// ⚠️ Un code à 4 chiffres reste faible face à quelqu'un de déterminé (10 000 essais).
//    Pour changer de code : voir « Changer le code » dans LISEZMOI.md.

const BLOB = {
  v: 1,
  iter: 2000000,
  salt: "q9HrVX/1qCPydxFwtlAL0Q==",
  iv: "iNjUu+jhiqVB4yuM",
  data: "zNsF4xiDuiy12oKBPo91heL9OhRzqrVLbObWtC83SSAiCBQnHrf7zqLy7bdZjyD79ToOEy9HrvA+DQ6DDP+JHL4AKNGnXs8niB511TvUmKw3kJs+v4SxT3tS6nEtfYovnMmsFJs5a8m6Qwv+jqxDy8vrbv9GP6tIRrz+BKsQDQ==",
};

export const MASK = "••••••";

let revealed = null; // contenu déchiffré, vidé au rechargement de la page

const b64ToBytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export const isUnlocked = () => revealed !== null;

export async function unlock(code) {
  try {
    const salt = b64ToBytes(BLOB.salt), iv = b64ToBytes(BLOB.iv), data = b64ToBytes(BLOB.data);
    const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: BLOB.iter, hash: "SHA-256" },
      km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    revealed = JSON.parse(new TextDecoder().decode(clear));
    window.dispatchEvent(new CustomEvent("secret-changed"));
    return true;
  } catch {
    return false; // mauvais code
  }
}

export function lock() {
  revealed = null;
  window.dispatchEvent(new CustomEvent("secret-changed"));
}

// Valeur en clair si déverrouillé, sinon le masque (ou 0 pour les nombres).
export function reveal(key, maskedValue = MASK) {
  return revealed ? revealed[key] : maskedValue;
}

// Bouton 🔒 / 🔓 réutilisable ; à placer dans n'importe quelle page.
export function lockButtonHTML(id = "lockbtn") {
  return `<button class="btn small secondary" id="${id}" title="${isUnlocked()
    ? "Masquer à nouveau les infos privées"
    : "Afficher les infos privées (code à 4 chiffres)"}">${isUnlocked() ? "🔓 Masquer" : "🔒 Afficher"}</button>`;
}

export function bindLockButton(el, onDone) {
  if (!el) return;
  el.onclick = async () => {
    if (isUnlocked()) { lock(); onDone?.(); return; }
    const code = prompt("Code à 4 chiffres pour afficher les infos privées :");
    if (code === null) return;
    el.disabled = true;
    el.textContent = "⏳ …";
    const ok = await unlock(code.trim());
    el.disabled = false;
    if (!ok) alert("Code incorrect.");
    onDone?.();
  };
}
