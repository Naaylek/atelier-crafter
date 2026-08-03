// Plan 2D du van vu de dessus (partagé élec / eau).
// Les composants du schéma se placent à leur position réelle dans le van ;
// les liaisons sont routées à angle droit et leur longueur est calculée.
// Coordonnées van : vz = longueur (mm, - arrière … + cabine), vx = largeur (mm).
// À l'écran : van horizontal, arrière à gauche, cabine à droite.
import { state } from "./store.js";
import { esc } from "./planning.js";
import { zoomStep } from "./diagram.js";

const CAB_LEN = 1900; // longueur cabine dessinée (indicatif)
const MARGIN = 700;   // marge autour du van (composants hors caisson autorisés)

// Densité d'affichage. Avec 20 composants serrés dans le coffre arrière,
// tout afficher rend le plan illisible : on peut réduire, ou tout couper.
export const LABEL_MODES = {
  full:    { label: "🏷 Tout",     f: 9.5, clip: 18, name: true,  link: true },
  compact: { label: "🏷 Compact",  f: 7,   clip: 12, name: true,  link: true },
  icons:   { label: "🏷 Icônes",   f: 0,   clip: 0,  name: false, link: false },
};
export const LABEL_ORDER = ["compact", "full", "icons"];
const LS_KEY = "ac-vanplan-labels";

// Longueur (m) entre deux composants d'après leur place réelle dans le van :
// cheminement à angle droit + 30 cm de mou. Renvoie null si non plaçable.
// Exportée pour que la vue « Schéma », qui n'a pas de plan sous la main,
// puisse elle aussi revenir à la longueur calculée.
export function autoLenFor(a, b) {
  if (!a || !b || a.vz === undefined || b.vz === undefined) return null;
  const mm = Math.abs(a.vz - b.vz) + Math.abs(a.vx - b.vx);
  return Math.max(0.5, Math.round((mm / 1000 + 0.3) * 10) / 10);
}

export class VanPlan {
  /**
   * opts: {
   *   nodes: () => [...], links: () => [...],
   *   nodeIcon(n), nodeTitle(n), nodeColor(n),
   *   linkColor(l), linkLabel(l),
   *   onChange(), onSelect(kind, obj), onAutoLen(link, meters)
   * }
   */
  constructor(container, opts) {
    this.o = opts;
    this.el = container;
    this.sel = null;
    this.z = 1; this.ox = 0; this.oy = 0;   // zoom / déplacement de la vue
    this.labels = localStorage.getItem(LS_KEY) || "compact";
    container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block"></svg>`;
    this.svg = container.querySelector("svg");
    this.ensurePositions();
    this.bindZoom();
    new ResizeObserver(() => this.render()).observe(container);
    this.render();
  }

  // Molette (ordinateur) et pincement à deux doigts (téléphone).
  // Sans « touch-action: none » + preventDefault, le navigateur zoomerait la PAGE.
  bindZoom() {
    this.svg.style.touchAction = "none";
    const touches = new Map();
    let pinch = null, pan = null;
    const dist = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const mid = () => { const [a, b] = [...touches.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
    const stopNative = ev => { if (!ev.touches || ev.touches.length > 1) ev.preventDefault(); };
    this.svg.addEventListener("touchstart", stopNative, { passive: false });
    this.svg.addEventListener("touchmove", stopNative, { passive: false });
    ["gesturestart", "gesturechange", "gestureend"].forEach(t =>
      this.svg.addEventListener(t, e => e.preventDefault(), { passive: false }));

    this.svg.addEventListener("wheel", ev => {
      ev.preventDefault();
      this.zoomAt(ev.clientX, ev.clientY, zoomStep(ev));
    }, { passive: false });

    this.svg.addEventListener("pointerdown", ev => {
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.size === 2) { pan = null; pinch = { d: dist() }; return; }
      if (ev.target === this.svg) pan = { x: ev.clientX, y: ev.clientY, ox: this.ox, oy: this.oy };
    });
    this.svg.addEventListener("pointermove", ev => {
      if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && touches.size === 2) {
        const d = dist(), m = mid();
        this.zoomAt(m.x, m.y, d / pinch.d);
        pinch.d = d;
        return;
      }
      if (pan) {
        this.ox = pan.ox + ev.clientX - pan.x;
        this.oy = pan.oy + ev.clientY - pan.y;
        this.applyView();
      }
    });
    const release = ev => {
      touches.delete(ev.pointerId);
      if (touches.size < 2) pinch = null;
      if (touches.size === 0) pan = null;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  // zoome en gardant immobile le point visé
  zoomAt(clientX, clientY, factor) {
    const r = this.svg.getBoundingClientRect();
    const z = Math.min(6, Math.max(1, this.z * factor));
    const px = clientX - r.left, py = clientY - r.top;
    this.ox = px - (px - this.ox) * (z / this.z);
    this.oy = py - (py - this.oy) * (z / this.z);
    this.z = z;
    if (z === 1) { this.ox = 0; this.oy = 0; }   // dézoomé à fond : on recentre
    this.applyView();
  }

  applyView() {
    const g = this.svg.querySelector(".vp-view");
    if (g) g.setAttribute("transform", `translate(${this.ox},${this.oy}) scale(${this.z})`);
  }

  // place les composants jamais positionnés sur une grille au centre
  ensurePositions() {
    const V = state.van;
    let i = 0;
    this.o.nodes().forEach(n => {
      if (n.vx === undefined || n.vx === null) {
        n.vx = -V.W / 2 + 300 + (i % 4) * 400;
        n.vz = -V.L / 2 + 400 + Math.floor(i / 4) * 500;
        i++;
      }
    });
    if (i) this.updateAutoLens(false);
  }

  // Tout / Compact / Icônes seules — mémorisé d'une fois sur l'autre
  cycleLabels() {
    const i = LABEL_ORDER.indexOf(this.labels);
    this.labels = LABEL_ORDER[(i + 1) % LABEL_ORDER.length];
    localStorage.setItem(LS_KEY, this.labels);
    this.render();
    return this.labels;
  }

  // mm van -> px écran
  sx(vz) { return this.pad + (vz + state.van.L / 2 + MARGIN) * this.k; }
  sy(vx) { return this.pad + (vx + state.van.W / 2 + MARGIN) * this.k; }
  // px écran -> mm van (en défaisant d'abord le zoom / déplacement de la vue)
  toVan(ev) {
    const r = this.svg.getBoundingClientRect();
    const px = (ev.clientX - r.left - this.ox) / this.z;
    const py = (ev.clientY - r.top - this.oy) / this.z;
    return {
      vz: (px - this.pad) / this.k - state.van.L / 2 - MARGIN,
      vx: (py - this.pad) / this.k - state.van.W / 2 - MARGIN,
    };
  }

  updateAutoLens(notify = true) {
    if (!this.o.onAutoLen) return;
    const byId = Object.fromEntries(this.o.nodes().map(n => [n.id, n]));
    this.o.links().forEach(l => {
      const m = autoLenFor(byId[l.a], byId[l.b]);
      if (m !== null) this.o.onAutoLen(l, m, notify);
    });
  }

  select(sel) {
    this.sel = sel;
    this.render();
    if (this.o.onSelect) {
      if (!sel) this.o.onSelect(null, null);
      else if (sel.kind === "node") this.o.onSelect("node", this.o.nodes().find(n => n.id === sel.id));
      else this.o.onSelect("edge", this.o.links().find(l => l.id === sel.id));
    }
  }

  render() {
    const V = state.van;
    const w = this.el.clientWidth || 900, h = this.el.clientHeight || 500;
    this.pad = 14;
    const totW = V.L + CAB_LEN + 2 * MARGIN, totH = V.W + 2 * MARGIN;
    this.k = Math.min((w - 2 * this.pad) / totW, (h - 2 * this.pad) / totH);
    const k = this.k;
    const nodes = this.o.nodes(), links = this.o.links();
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

    const X = vz => this.sx(vz), Y = vx => this.sy(vx);
    const rearX = X(-V.L / 2), frontX = X(V.L / 2), topY = Y(-V.W / 2), botY = Y(V.W / 2);
    const archZ0 = -V.L / 2 + V.rearToArch;

    let svg = `
      <!-- caisson -->
      <rect x="${rearX}" y="${topY}" width="${V.L * k}" height="${V.W * k}" fill="#faf7f1" stroke="#8a8175" stroke-width="2" rx="6"/>
      <!-- cabine -->
      <path d="M${frontX},${topY} h${CAB_LEN * 0.55 * k} q${CAB_LEN * 0.45 * k},${V.W * 0.12 * k} ${CAB_LEN * 0.45 * k},${V.W * 0.5 * k} q0,${V.W * 0.38 * k} -${CAB_LEN * 0.45 * k},${V.W * 0.5 * k} h-${CAB_LEN * 0.55 * k} z"
            fill="#efece4" stroke="#b7ac9c" stroke-width="1.5"/>
      <text x="${frontX + CAB_LEN * 0.45 * k}" y="${Y(0) + 4}" font-size="11" fill="#8a8175" text-anchor="middle">CABINE</text>
      <text x="${rearX - 6}" y="${Y(0) + 4}" font-size="11" fill="#8a8175" text-anchor="end" transform="rotate(-90 ${rearX - 6} ${Y(0)})">PORTES ARRIÈRE</text>
      <!-- passages de roues -->
      <rect x="${X(archZ0)}" y="${topY}" width="${V.archL * k}" height="${V.archW * k}" fill="#d5d0c6" stroke="#8a8175" rx="4"/>
      <rect x="${X(archZ0)}" y="${botY - V.archW * k}" width="${V.archL * k}" height="${V.archW * k}" fill="#d5d0c6" stroke="#8a8175" rx="4"/>
      <!-- porte coulissante (droite = bas du plan) -->
      <rect x="${X(V.L / 2 - 1325)}" y="${botY - 3}" width="${1250 * k}" height="6" fill="#4c9a52" rx="3"/>
      <text x="${X(V.L / 2 - 700)}" y="${botY + 13}" font-size="9" fill="#4c9a52" text-anchor="middle">porte coulissante</text>
      <!-- cotes -->
      <text x="${X(0)}" y="${topY - 6}" font-size="10" fill="#8a8175" text-anchor="middle">${V.L} mm</text>
      <text x="${rearX + (V.rearToArch / 2) * k}" y="${topY - 6}" font-size="9" fill="#4d94cc" text-anchor="middle">${V.rearToArch}</text>`;

    // liaisons (angle droit : vertical puis horizontal)
    // trois densités d'affichage : le plan devient vite illisible avec 20
    // composants, on peut donc réduire le texte ou ne garder que les icônes
    const M = LABEL_MODES[this.labels] || LABEL_MODES.compact;

    links.forEach(l => {
      const a = byId[l.a], b = byId[l.b];
      if (!a || !b) return;
      const ax = X(a.vz), ay = Y(a.vx), bx = X(b.vz), by = Y(b.vx);
      const selc = this.sel?.kind === "edge" && this.sel.id === l.id;
      const col = this.o.linkColor ? this.o.linkColor(l) : "#cc3333";
      const d = `M${ax},${ay} L${ax},${by} L${bx},${by}`;
      const txt = M.link && this.o.linkLabel ? this.o.linkLabel(l) : "";
      svg += `<g data-link="${l.id}" style="cursor:pointer">
        <path d="${d}" fill="none" stroke="${col}" stroke-width="${selc ? 4.5 : 2.5}" stroke-linejoin="round" opacity="0.9"/>
        <path d="${d}" fill="none" stroke="transparent" stroke-width="12"/>
        ${txt ? `<text class="vp-label" x="${(ax + bx) / 2}" y="${by - 5}" font-size="${M.f}" fill="#555" text-anchor="middle" style="pointer-events:none">${esc(txt)}</text>` : ""}
      </g>`;
    });

    // composants
    nodes.forEach(n => {
      const x = X(n.vz), y = Y(n.vx);
      const selc = this.sel?.kind === "node" && this.sel.id === n.id;
      const col = this.o.nodeColor ? this.o.nodeColor(n) : "#c96f2f";
      svg += `<g data-node="${n.id}" style="cursor:grab">
        <circle cx="${x}" cy="${y}" r="17" fill="#fff" stroke="${selc ? "#c96f2f" : col}" stroke-width="${selc ? 3 : 1.8}"/>
        <text x="${x}" y="${y + 5.5}" font-size="15" text-anchor="middle" style="pointer-events:none">${this.o.nodeIcon(n)}</text>
        ${M.name ? `<text class="vp-label" x="${x}" y="${y + 29}" font-size="${M.f}" font-weight="600" fill="#2b2620" text-anchor="middle" style="pointer-events:none">${esc(clip(this.o.nodeTitle(n), M.clip))}</text>` : ""}
      </g>`;
    });

    // tout le dessin vit dans un groupe : c'est lui qu'on zoome / déplace
    this.svg.innerHTML = `<g class="vp-view" transform="translate(${this.ox},${this.oy}) scale(${this.z})">${svg}</g>`;
    haloLabels(this.svg);

    // interactions
    this.svg.querySelectorAll("[data-link]").forEach(g => {
      g.addEventListener("pointerdown", ev => { ev.stopPropagation(); this.select({ kind: "edge", id: g.dataset.link }); });
    });
    this.svg.querySelectorAll("[data-node]").forEach(g => {
      g.addEventListener("pointerdown", ev => {
        ev.stopPropagation();
        const n = nodes.find(x => x.id === g.dataset.node);
        this.select({ kind: "node", id: n.id });
        const start = this.toVan(ev);
        const ox = n.vx, oz = n.vz;
        const move = mv => {
          const p = this.toVan(mv);
          n.vz = Math.round((oz + p.vz - start.vz) / 10) * 10;
          n.vx = Math.round((ox + p.vx - start.vx) / 10) * 10;
          // borne : caisson + marge
          n.vz = Math.max(-state.van.L / 2 - MARGIN + 100, Math.min(state.van.L / 2 + CAB_LEN, n.vz));
          n.vx = Math.max(-state.van.W / 2 - MARGIN + 100, Math.min(state.van.W / 2 + MARGIN - 100, n.vx));
          this.render();
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          this.updateAutoLens();
          this.o.onChange();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
    });
    this.svg.addEventListener("pointerdown", () => this.select(null), { once: true });
  }
}

// Pastille claire derrière chaque étiquette, sinon les traits et les cercles
// passent au travers du texte.
const SVGNS = "http://www.w3.org/2000/svg";
function haloLabels(svg) {
  svg.querySelectorAll("text.vp-label").forEach(t => {
    let bb;
    try { bb = t.getBBox(); } catch { return; }
    if (!bb.width) return;
    const r = document.createElementNS(SVGNS, "rect");
    r.setAttribute("class", "wire-label-bg");
    r.setAttribute("x", bb.x - 2);
    r.setAttribute("y", bb.y - 1);
    r.setAttribute("width", bb.width + 4);
    r.setAttribute("height", bb.height + 2);
    r.setAttribute("rx", 2.5);
    t.parentNode.insertBefore(r, t);
  });
}

// export PNG d'un SVG
export function svgToPNG(svgEl, filename) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  const r = svgEl.getBoundingClientRect();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = r.width * 2; c.height = r.height * 2;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = filename;
    a.click();
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}">${xml.replace(/<svg[^>]*>|<\/svg>/g, "")}</svg>`
  );
}

const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
