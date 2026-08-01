// Petits utilitaires d'interface.

// Rend un panneau latéral redimensionnable (poignée à droite).
// La largeur est mémorisée (préférence locale, hors undo/redo).
export function makeResizable(sideEl, storageKey) {
  const saved = +localStorage.getItem(storageKey);
  if (saved) sideEl.style.width = sideEl.style.minWidth = saved + "px";
  const rz = document.createElement("div");
  rz.className = "side-resizer";
  rz.title = "Glisser pour élargir le panneau";
  sideEl.after(rz);
  rz.addEventListener("pointerdown", ev => {
    ev.preventDefault();
    const startX = ev.clientX, startW = sideEl.getBoundingClientRect().width;
    document.body.style.cursor = "col-resize";
    const move = mv => {
      const w = Math.max(260, Math.min(680, startW + mv.clientX - startX));
      sideEl.style.width = sideEl.style.minWidth = w + "px";
      localStorage.setItem(storageKey, w);
    };
    const up = () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}
