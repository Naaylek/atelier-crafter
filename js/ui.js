// Petits utilitaires d'interface.

// Panneau latéral : redimensionnable à la souris sur ordinateur,
// tiroir coulissant sur téléphone / tablette.
// La largeur est mémorisée (préférence locale, hors undo/redo).
export function makeResizable(sideEl, storageKey) {
  // les onglets se re-rendent à chaque visite : ne pas empiler les poignées
  if (sideEl.dataset.uiReady) return;
  sideEl.dataset.uiReady = "1";

  const saved = +localStorage.getItem(storageKey);
  if (saved) sideEl.style.width = sideEl.style.minWidth = saved + "px";

  // --- poignée de redimensionnement (ordinateur) ---
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

  // --- tiroir (téléphone / tablette) ---
  sideEl.classList.add("side-drawer");
  const toggle = document.createElement("button");
  toggle.className = "drawer-toggle";
  toggle.type = "button";
  toggle.innerHTML = "☰ Réglages";
  toggle.title = "Ouvrir / fermer le panneau";
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  sideEl.parentElement.append(toggle, backdrop);

  const setOpen = open => {
    sideEl.classList.toggle("open", open);
    backdrop.classList.toggle("show", open);
    toggle.innerHTML = open ? "✕ Fermer" : "☰ Réglages";
  };
  toggle.onclick = () => setOpen(!sideEl.classList.contains("open"));
  backdrop.onclick = () => setOpen(false);
  // sur petit écran, agir sur un élément referme le tiroir pour voir le résultat
  sideEl.addEventListener("click", ev => {
    if (window.innerWidth > 900) return;
    if (ev.target.closest(".item-row, .palette button")) setOpen(false);
  });
}
