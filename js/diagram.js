// Éditeur de schéma 2D générique (SVG) : nœuds déplaçables + liaisons.
// Utilisé par les onglets Électricité et Eau.
import { esc } from "./planning.js";

const NW = 150, NH = 58; // taille nœud

export class Diagram {
  /**
   * opts: {
   *   nodes: () => [...], edges: () => [...],
   *   nodeTitle(n), nodeSub(n), nodeIcon(n),
   *   edgeLabel(e), edgeColor(e),
   *   onChange(), onSelect(kind, objOrNull), canLink(a,b)
   * }
   */
  constructor(container, opts) {
    this.o = opts;
    this.sel = null;            // {kind:'node'|'edge', id}
    this.linkFrom = null;       // node id en mode liaison
    this.linking = false;
    this.view = { x: 0, y: 0, k: 1 };

    container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4"><circle cx="4" cy="4" r="3" fill="#888"/></marker>
      </defs>
      <g class="viewport"><g class="edges"></g><g class="nodes"></g></g>
    </svg>`;
    this.svg = container.querySelector("svg");
    this.vp = this.svg.querySelector(".viewport");
    this.gEdges = this.svg.querySelector(".edges");
    this.gNodes = this.svg.querySelector(".nodes");
    this.bindPanZoom();
    this.fit(container);
    this.render();
  }

  // cadre la vue sur l'ensemble des nœuds
  fit(container) {
    const nodes = this.o.nodes();
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map(n => n.x)) - 40;
    const maxX = Math.max(...nodes.map(n => n.x)) + NW + 40;
    const minY = Math.min(...nodes.map(n => n.y)) - 40;
    const maxY = Math.max(...nodes.map(n => n.y)) + NH + 40;
    const cw = container.clientWidth || 1000, ch = container.clientHeight || 600;
    let k = Math.min(cw / (maxX - minX), ch / (maxY - minY));
    // sur écran étroit, on garde une taille lisible quitte à faire glisser
    const kMin = cw < 700 ? 0.55 : 0.3;
    k = Math.min(1.4, Math.max(kMin, k));
    this.view.k = k;
    this.view.x = (cw - (maxX - minX) * k) / 2 - minX * k;
    this.view.y = (ch - (maxY - minY) * k) / 2 - minY * k;
  }

  toWorld(ev) {
    const r = this.svg.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left - this.view.x) / this.view.k,
      y: (ev.clientY - r.top - this.view.y) / this.view.k,
    };
  }

  bindPanZoom() {
    let pan = null;
    const touches = new Map();   // doigts posés, pour le pincement
    let pinch = null;

    const dist = () => {
      const [a, b] = [...touches.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const mid = () => {
      const [a, b] = [...touches.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    this.svg.addEventListener("pointerdown", ev => {
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.size === 2) {   // deux doigts : on pince, pas on déplace
        pan = null;
        pinch = { d: dist(), k: this.view.k, m: mid(), vx: this.view.x, vy: this.view.y };
        return;
      }
      if (ev.target === this.svg || ev.target.closest(".viewport") === null || ev.target.tagName === "svg") {
        pan = { x: ev.clientX, y: ev.clientY, vx: this.view.x, vy: this.view.y };
        this.select(null);
      }
    });
    this.svg.addEventListener("pointermove", ev => {
      if (touches.has(ev.pointerId)) touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && touches.size === 2) {
        const r = this.svg.getBoundingClientRect();
        const k = Math.min(2.5, Math.max(0.2, pinch.k * (dist() / pinch.d)));
        // garde le point entre les doigts immobile pendant le zoom
        const wx = (pinch.m.x - r.left - pinch.vx) / pinch.k;
        const wy = (pinch.m.y - r.top - pinch.vy) / pinch.k;
        const m = mid();
        this.view.k = k;
        this.view.x = m.x - r.left - wx * k;
        this.view.y = m.y - r.top - wy * k;
        this.applyView();
        return;
      }
      if (pan) {
        this.view.x = pan.vx + ev.clientX - pan.x;
        this.view.y = pan.vy + ev.clientY - pan.y;
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
    this.svg.addEventListener("wheel", ev => {
      ev.preventDefault();
      const w = this.toWorld(ev);
      const k = Math.min(2.5, Math.max(0.3, this.view.k * (ev.deltaY < 0 ? 1.1 : 0.9)));
      const r = this.svg.getBoundingClientRect();
      this.view.x = ev.clientX - r.left - w.x * k;
      this.view.y = ev.clientY - r.top - w.y * k;
      this.view.k = k;
      this.applyView();
    }, { passive: false });
  }

  applyView() {
    this.vp.setAttribute("transform", `translate(${this.view.x},${this.view.y}) scale(${this.view.k})`);
  }

  startLink() {
    this.linking = true; this.linkFrom = null;
    this.svg.classList.add("linking");
  }
  stopLink() {
    this.linking = false; this.linkFrom = null;
    this.svg.classList.remove("linking");
    this.render();
  }

  select(selOrNull) {
    this.sel = selOrNull;
    this.render();
    if (this.o.onSelect) {
      if (!selOrNull) this.o.onSelect(null, null);
      else if (selOrNull.kind === "node") this.o.onSelect("node", this.o.nodes().find(n => n.id === selOrNull.id));
      else this.o.onSelect("edge", this.o.edges().find(e => e.id === selOrNull.id));
    }
  }

  center(n) { return { x: n.x + NW / 2, y: n.y + NH / 2 }; }

  render() {
    const nodes = this.o.nodes(), edges = this.o.edges();
    const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
    this.applyView();

    // edges — routage à angle droit (sortie latérale, coude au milieu)
    this.gEdges.innerHTML = "";
    edges.forEach(e => {
      const a = byId[e.a], b = byId[e.b];
      if (!a || !b) return;
      const ca = this.center(a), cb = this.center(b);
      const goRight = cb.x >= ca.x;
      const sx = goRight ? a.x + NW : a.x, sy = ca.y;          // sortie côté le plus proche
      const tx = goRight ? b.x : b.x + NW, ty = cb.y;          // entrée côté opposé
      const mx = (sx + tx) / 2;
      const d = `M${sx},${sy} L${mx},${sy} L${mx},${ty} L${tx},${ty}`;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const sel = this.sel?.kind === "edge" && this.sel.id === e.id;
      const col = this.o.edgeColor ? this.o.edgeColor(e) : "#888";
      g.innerHTML = `
        <path class="wire ${sel ? "sel" : ""}" d="${d}" stroke="${col}" stroke-linejoin="round"/>
        <path d="${d}" stroke="transparent" stroke-width="14" fill="none" style="cursor:pointer"/>
        <circle cx="${sx}" cy="${sy}" r="3.5" fill="${col}"/>
        <circle cx="${tx}" cy="${ty}" r="3.5" fill="${col}"/>
        ${(this.o.edgeLabel ? this.o.edgeLabel(e) : []).map((t, i) =>
          `<text class="wire-label" x="${mx + 4}" y="${(sy + ty) / 2 - 8 + i * 12}" text-anchor="middle">${esc(t)}</text>`).join("")}`;
      g.addEventListener("pointerdown", ev => { ev.stopPropagation(); this.select({ kind: "edge", id: e.id }); });
      this.gEdges.appendChild(g);
    });

    // nodes
    this.gNodes.innerHTML = "";
    nodes.forEach(n => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const sel = this.sel?.kind === "node" && this.sel.id === n.id;
      const isLinkSrc = this.linkFrom === n.id;
      g.setAttribute("class", "diag-node" + (sel ? " sel" : ""));
      g.setAttribute("transform", `translate(${n.x},${n.y})`);
      const roleCol = this.o.nodeColor ? this.o.nodeColor(n) : "#b7ac9c";
      g.innerHTML = `
        <rect class="body" width="${NW}" height="${NH}" rx="8" stroke="${roleCol}" ${isLinkSrc ? 'style="stroke:#c96f2f;stroke-dasharray:5 3;stroke-width:2.5"' : ""}/>
        <rect x="0" y="0" width="5" height="${NH}" rx="2.5" fill="${roleCol}"/>
        <text x="12" y="24" font-size="17">${this.o.nodeIcon(n)}</text>
        <text x="38" y="22" font-size="12" font-weight="600">${esc(clip(this.o.nodeTitle(n), 16))}</text>
        <text x="38" y="40" font-size="10.5" fill="#8a8175">${esc(clip(this.o.nodeSub(n) || "", 21))}</text>`;
      g.addEventListener("pointerdown", ev => {
        ev.stopPropagation();
        if (this.linking) {
          if (!this.linkFrom) { this.linkFrom = n.id; this.render(); }
          else if (this.linkFrom !== n.id) {
            if (!this.o.canLink || this.o.canLink(this.linkFrom, n.id)) {
              this.o.onLink(this.linkFrom, n.id);
            }
            this.stopLink();
          }
          return;
        }
        this.select({ kind: "node", id: n.id });
        // drag
        const start = this.toWorld(ev);
        const ox = n.x, oy = n.y;
        const move = mv => {
          const w = this.toWorld(mv);
          n.x = Math.round((ox + w.x - start.x) / 10) * 10;
          n.y = Math.round((oy + w.y - start.y) / 10) * 10;
          this.render();
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          this.o.onChange();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
      this.gNodes.appendChild(g);
    });
  }
}

const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
export { NW, NH };
