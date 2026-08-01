// Onglet Électricité : schéma 12V/230V + plan 2D du van + calculs P, U, I, sections, fusibles.
import { state, save, uid, fmt } from "./store.js";
import { ELEC_LIB, SECTIONS, FUSES } from "./data.js";
import { Diagram } from "./diagram.js";
import { VanPlan, svgToPNG } from "./vanplan.js";
import { esc } from "./planning.js";
import { makeResizable } from "./ui.js";

const RHO = 0.0175; // Ω·mm²/m (cuivre)
const ROLE_COLORS = { source: "#c0392b", storage: "#2456a6", conv: "#8e44ad", dist: "#777770", load: "#2e7d32" };
const ROLE_NAMES = { source: "Producteur", storage: "Stockage", conv: "Conversion", dist: "Distribution", load: "Consommateur" };

let diag = null, plan = null, selKind = null, selObj = null;
let viewPlan = false;

const lib = t => ELEC_LIB.find(l => l.type === t) || {};
const spec = n => ({ ...lib(n.type), ...n }); // valeurs du nœud écrasent la bibliothèque
const roleOf = n => n.role || lib(n.type).role || "load";

// ---------- calculs réseau ----------
function computeWires() {
  const E = state.elec;
  const nodes = E.nodes, wires = E.wires;
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  wires.forEach(w => { if (byId[w.a] && byId[w.b]) { adj[w.a].push(w); adj[w.b].push(w); } });

  const bat = nodes.find(n => n.type === "batterie");
  const dist = {};
  if (bat) {
    dist[bat.id] = 0;
    const q = [bat.id];
    while (q.length) {
      const cur = q.shift();
      adj[cur].forEach(w => {
        const other = w.a === cur ? w.b : w.a;
        if (dist[other] === undefined) { dist[other] = dist[cur] + 1; q.push(other); }
      });
    }
  }

  const wireU = w => {
    const a = spec(byId[w.a]), b = spec(byId[w.b]);
    if (a.type === "load230" || b.type === "load230") return 230;
    if (a.type === "panneau" || b.type === "panneau")
      return a.type === "panneau" ? (a.U || 18) : (b.U || 18);
    return E.params.U;
  };

  const memo = {};
  const neighbors = nid => adj[nid].map(w => ({ w, n: byId[w.a === nid ? w.b : w.a] }));

  function branchI(nodeId, viaWire, seen) {
    const key = nodeId + "|" + viaWire.id;
    if (memo[key] !== undefined) return memo[key];
    if (seen.has(nodeId)) return 0;
    seen.add(nodeId);
    const s = spec(byId[nodeId]);
    const role = roleOf(byId[nodeId]);
    const U = E.params.U;
    let I = 0;
    if (role === "load") {
      I = s.type === "load230" ? (s.P || 0) / 230 : (s.P || 0) / U;
    } else if (s.type === "convertisseur") {
      const loads = neighbors(nodeId).filter(x => spec(x.n).type === "load230");
      const P = loads.length ? loads.reduce((t, x) => t + (spec(x.n).P || 0), 0) : (s.P || 0);
      I = P / (U * (s.eff || 0.85));
    } else if (s.type === "mppt") {
      const panels = neighbors(nodeId).filter(x => spec(x.n).type === "panneau");
      const P = panels.reduce((t, x) => t + (spec(x.n).P || 0), 0);
      I = P / U;
    } else if (s.type === "panneau") {
      I = (s.P || 0) / (s.U || 18);
    } else if (s.type === "b2b" || s.type === "secteur") {
      I = s.A || 0;
    } else if (s.type === "alternateur") {
      const b2bs = neighbors(nodeId).filter(x => spec(x.n).type === "b2b");
      I = b2bs.length ? b2bs.reduce((t, x) => t + (spec(x.n).A || 0), 0) : (s.A || 0);
    } else if (role === "source") {
      I = s.A || (s.P || 0) / U;
    } else if (role === "dist" || role === "storage" || role === "conv") {
      I = adj[nodeId].filter(w => w.id !== viaWire.id)
        .reduce((t, w) => {
          const other = w.a === nodeId ? w.b : w.a;
          return t + branchI(other, w, seen);
        }, 0);
    }
    memo[key] = I;
    return I;
  }

  return wires.map(w => {
    if (!byId[w.a] || !byId[w.b]) return { w, I: 0, U: 12, S: 0, Snorm: null, fuse: null };
    const da = dist[w.a] ?? 99, db = dist[w.b] ?? 99;
    let far = da >= db ? w.a : w.b;
    if (da === 99 && db === 99) far = roleOf(byId[w.a]) === "source" ? w.b : w.a;
    const I = branchI(far, w, new Set([w.a === far ? w.b : w.a]));
    const U = wireU(w);
    const dU = (E.params.dropPct / 100) * U;
    const L = +w.len || 1;
    const S = dU > 0 ? (2 * RHO * L * I) / dU : 0;
    const Snorm = SECTIONS.find(s => s >= S) || null;
    const fuse = U > 48 ? null : (FUSES.find(f => f >= I * 1.25) || null);
    return { w, I, U, S, Snorm, fuse };
  });
}

function energyBalance() {
  const E = state.elec;
  const U = E.params.U;
  const loads = E.nodes.filter(n => roleOf(n) === "load").map(n => {
    const s = spec(n);
    const eff = s.type === "load230" ? 0.85 : 1;
    return { n, name: s.name, P: s.P || 0, h: s.h || 0, Wh: (s.P || 0) * (s.h || 0) / eff };
  });
  const conso = loads.reduce((t, l) => t + l.Wh, 0);
  const panels = E.nodes.filter(n => n.type === "panneau");
  const prod = panels.reduce((t, n) => t + (spec(n).P || 0), 0) * E.params.sunH * 0.75;
  const bats = E.nodes.filter(n => n.type === "batterie");
  const capWh = bats.reduce((t, n) => {
    const s = spec(n);
    return t + (s.Ah || 0) * U * (s.chem === "LiFePO4" ? 0.8 : 0.5);
  }, 0);
  return { loads, bats, conso, prod, capWh, autonomy: conso > 0 ? capWh / conso : Infinity };
}

// couleur d'un câble selon sa nature (comme sur un vrai schéma)
function wireColor(e, calcFor) {
  const c = calcFor(e);
  if (c && c.Snorm === null && c.S > 0) return "#e74c3c";
  const E = state.elec;
  const byId = Object.fromEntries(E.nodes.map(n => [n.id, n]));
  const a = byId[e.a], b = byId[e.b];
  if (!a || !b) return "#888";
  if (spec(a).type === "load230" || spec(b).type === "load230") return "#8e44ad"; // 230V
  if (spec(a).type === "panneau" || spec(b).type === "panneau") return "#d4a017"; // PV
  if (["b2b", "alternateur"].includes(a.type) || ["b2b", "alternateur"].includes(b.type)) return "#e67e22"; // alternateur
  return "#cc3333"; // 12V (paire +/-)
}

// ---------- rendu ----------
export function render(root) {
  root.innerHTML = `
    <div class="editor-wrap">
      <div class="editor-side">
        <h3>⚡ Électricité</h3>
        <div class="toolrow">
          <button class="btn ${viewPlan ? "secondary" : ""}" id="el-vschema">🗺 Schéma</button>
          <button class="btn ${viewPlan ? "" : "secondary"}" id="el-vplan">🚐 Plan van</button>
        </div>
        <div class="toolrow">
          <button class="btn" id="el-link" ${viewPlan ? "disabled" : ""}>🔗 Relier</button>
          <button class="btn danger small" id="el-del" disabled>🗑</button>
          <button class="btn secondary small" id="el-png">📷 PNG</button>
        </div>
        <fieldset><legend>➕ Ajouter un composant</legend>
          <div class="palette" id="el-pal" style="max-height:200px;overflow-y:auto"></div>
        </fieldset>
        <fieldset><legend>Légende câbles</legend>
          <div style="font-size:11px;line-height:1.8">
            <span style="color:#d4a017">■</span> panneaux solaires ·
            <span style="color:#cc3333">■</span> 12V (paire +/–) ·
            <span style="color:#e67e22">■</span> alternateur ·
            <span style="color:#8e44ad">■</span> 230V ·
            <span style="color:#e74c3c">■</span> ⚠️ section &gt; 70 mm²
          </div>
        </fieldset>
        <fieldset><legend>Paramètres</legend>
          <div class="props">
            <div class="row"><label>Tension réseau</label>
              <select id="el-u"><option value="12">12 V</option><option value="24">24 V</option></select></div>
            <div class="row"><label>Chute max</label><input type="number" id="el-drop" step="0.5" min="1" max="10" style="width:60px"> %</div>
            <div class="row"><label>Soleil équiv.</label><input type="number" id="el-sun" step="0.5" min="1" max="8" style="width:60px"> h/j</div>
          </div>
        </fieldset>
        <div id="el-props"></div>
        <div id="el-bilan"></div>
      </div>
      <div class="editor-canvas" id="el-canvas"></div>
    </div>`;

  makeResizable(root.querySelector(".editor-side"), "ac-side-diag");

  const E = state.elec;
  root.querySelector("#el-u").value = E.params.U;
  root.querySelector("#el-drop").value = E.params.dropPct;
  root.querySelector("#el-sun").value = E.params.sunH;
  ["u", "drop", "sun"].forEach(k => {
    root.querySelector("#el-" + k).onchange = e => {
      E.params[{ u: "U", drop: "dropPct", sun: "sunH" }[k]] = +e.target.value;
      save("elec", "Paramètres élec"); refresh();
    };
  });

  const pal = root.querySelector("#el-pal");
  ELEC_LIB.forEach(l => {
    const b = document.createElement("button");
    b.innerHTML = `${l.icon} ${esc(l.name)}`;
    b.onclick = () => {
      const n = { id: uid(), type: l.type, x: 120 + Math.random() * 120, y: 100 + Math.random() * 120 };
      if (diag) { n.x = 100 - diag.view.x / diag.view.k + Math.random() * 80; n.y = 80 - diag.view.y / diag.view.k + Math.random() * 80; }
      E.nodes.push(n);
      save("elec", "Composant ajouté : " + l.name);
      rebuildCanvas(); refresh();
    };
    pal.appendChild(b);
  });

  let calc = computeWires();
  const calcFor = w => calc.find(c => c.w.id === w.id);

  const common = {
    nodes: () => E.nodes,
    edges: () => E.wires,
    links: () => E.wires,
    nodeIcon: n => lib(n.type).icon || "▫️",
    nodeTitle: n => spec(n).name || n.type,
    nodeColor: n => ROLE_COLORS[roleOf(n)] || "#777",
    nodeSub: n => {
      const s = spec(n);
      const role = roleOf(n);
      if (role === "load") return `${s.P || 0} W · ${fmt((s.P || 0) / (s.type === "load230" ? 230 : E.params.U), 1)} A · ${s.h || 0} h/j`;
      if (s.type === "panneau") return `${s.P || 0} W · Vmp ${s.U || 18} V`;
      if (s.type === "batterie") return `${s.Ah || 0} Ah · ${s.chem || "?"} · ${fmt((s.Ah || 0) * E.params.U)} Wh`;
      if (s.type === "convertisseur") return `${s.P || 0} W · η ${Math.round((s.eff || .85) * 100)}%`;
      if (["mppt", "b2b", "secteur", "alternateur"].includes(s.type)) return `${s.A || 0} A max`;
      return ROLE_NAMES[role] || "";
    },
    onSelect: (kind, obj) => { selKind = kind; selObj = obj; root.querySelector("#el-del").disabled = !obj; renderProps(); },
    onChange: () => { save("elec"); refresh(); },
  };

  function rebuildCanvas() {
    const cv = root.querySelector("#el-canvas");
    diag = null; plan = null;
    if (viewPlan) {
      plan = new VanPlan(cv, {
        ...common,
        linkColor: e => wireColor(e, calcFor),
        linkLabel: e => {
          const c = calcFor(e);
          return c && c.I ? `${fmt(c.I, 1)}A · ${e.len}m · ${c.Snorm ? c.Snorm + "mm²" : "⚠️"}` : `${e.len || 1} m`;
        },
        onAutoLen: (wire, m, notify) => {
          if (wire.autoLen === false) return;
          if (wire.len !== m) {
            wire.len = m;
            if (notify) { calc = computeWires(); }
          }
        },
      });
    } else {
      diag = new Diagram(cv, {
        ...common,
        edgeColor: e => wireColor(e, calcFor),
        edgeLabel: e => {
          const c = calcFor(e);
          if (!c || !c.I) return [`${e.len || 1} m`];
          return [`${fmt(c.I, 1)} A · ${e.len || 1} m`, `→ ${c.Snorm ? c.Snorm + " mm²" : "⚠️ >70mm²"}${c.fuse ? " · fus. " + c.fuse + " A" : ""}`];
        },
        onLink: (a, b) => { E.wires.push({ id: uid(), a, b, len: 2, autoLen: true }); save("elec", "Câble ajouté"); refresh(); },
      });
    }
  }

  root.querySelector("#el-vschema").onclick = () => { viewPlan = false; render(root); };
  root.querySelector("#el-vplan").onclick = () => { viewPlan = true; render(root); };
  root.querySelector("#el-png").onclick = () => {
    const svg = root.querySelector("#el-canvas svg");
    if (svg) svgToPNG(svg, viewPlan ? "elec-plan-van.png" : "elec-schema.png");
  };
  root.querySelector("#el-link").onclick = () => {
    if (!diag) return;
    if (diag.linking) diag.stopLink(); else diag.startLink();
    root.querySelector("#el-link").classList.toggle("secondary", diag.linking);
  };
  root.querySelector("#el-del").onclick = deleteSel;
  root.onkeydown = e => {
    if ((e.key === "Delete" || e.key === "Backspace") && selObj && !["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) deleteSel();
  };
  root.tabIndex = 0;

  function deleteSel() {
    if (!selObj) return;
    if (selKind === "node") {
      E.nodes = E.nodes.filter(n => n.id !== selObj.id);
      E.wires = E.wires.filter(w => w.a !== selObj.id && w.b !== selObj.id);
      save("elec", "Composant supprimé");
    } else {
      E.wires = E.wires.filter(w => w.id !== selObj.id);
      save("elec", "Câble supprimé");
    }
    selObj = null; selKind = null;
    root.querySelector("#el-del").disabled = true;
    refresh();
  }

  function refresh() {
    calc = computeWires();
    (diag || plan)?.render();
    renderBilan();
    renderProps();
  }

  function renderProps() {
    const el = root.querySelector("#el-props");
    if (!selObj) {
      el.innerHTML = `<p class="muted" style="font-size:12px">${viewPlan
        ? "Glisse les composants à leur vraie place dans le van : les longueurs de câbles se calculent toutes seules. Clique un câble pour le détail."
        : "Clique un composant ou un câble pour l'éditer.<br>🔗 Relier : clique 2 composants.<br>Molette = zoom, fond = déplacer."}</p>`;
      return;
    }
    if (selKind === "node") {
      const n = E.nodes.find(x => x.id === selObj.id);
      if (!n) { el.innerHTML = ""; return; }
      const s = spec(n);
      const role = roleOf(n);
      const F = (label, key, stp = 1) =>
        `<div class="row"><label>${label}</label><input type="number" data-k="${key}" value="${n[key] ?? lib(n.type)[key] ?? 0}" step="${stp}"></div>`;
      el.innerHTML = `<fieldset><legend>${lib(n.type).icon || ""} ${esc(s.name)}</legend><div class="props">
        <div class="row"><label>Nom</label><input type="text" data-k="name" value="${esc(n.name ?? lib(n.type).name)}" style="width:150px"></div>
        ${n.type === "autre" ? `<div class="row"><label>Rôle</label><select data-k="role">
            ${Object.entries(ROLE_NAMES).map(([k, v]) => `<option value="${k}" ${role === k ? "selected" : ""}>${v}</option>`).join("")}
          </select></div>` : ""}
        ${role === "load" || n.type === "convertisseur" || n.type === "panneau" || n.type === "autre" ? F("Puissance (W)", "P", 5) : ""}
        ${n.type === "panneau" ? F("Vmp (V)", "U", 0.5) : ""}
        ${["mppt", "b2b", "secteur", "alternateur"].includes(n.type) || (n.type === "autre" && role === "source") ? F("Courant max (A)", "A", 1) : ""}
        ${n.type === "batterie" ? F("Capacité (Ah)", "Ah", 5) : ""}
        ${n.type === "batterie" ? `<div class="row"><label>Chimie</label><select data-k="chem">
            <option ${s.chem === "LiFePO4" ? "selected" : ""}>LiFePO4</option>
            <option ${s.chem === "AGM" ? "selected" : ""}>AGM</option>
            <option ${s.chem === "GEL" ? "selected" : ""}>GEL</option></select></div>` : ""}
        ${role === "load" ? F("Utilisation (h/j)", "h", 0.5) : ""}
        ${n.type === "convertisseur" || n.type === "mppt" ? F("Rendement (0-1)", "eff", 0.01) : ""}
        <div class="row"><label>Notes</label><input type="text" data-k="notes" value="${esc(n.notes || "")}" style="width:150px"></div>
      </div></fieldset>`;
      el.querySelectorAll("[data-k]").forEach(inp => inp.onchange = () => {
        const k = inp.dataset.k;
        n[k] = inp.type === "number" ? +inp.value : inp.value;
        save("elec", "Composant modifié : " + spec(n).name);
        refresh();
      });
    } else {
      const w = E.wires.find(x => x.id === selObj.id);
      if (!w) { el.innerHTML = ""; return; }
      const c = calcFor(w) || {};
      el.innerHTML = `<fieldset><legend>Câble</legend><div class="props">
        <div class="row"><label>Longueur (m)</label><input type="number" id="w-len" value="${w.len || 1}" min="0.5" step="0.1" ${w.autoLen !== false ? "disabled" : ""}></div>
        <div class="row"><label>Longueur auto</label><input type="checkbox" id="w-auto" ${w.autoLen !== false ? "checked" : ""} title="Calculée depuis le plan 2D du van"> <span class="muted" style="font-size:11px">depuis le plan 2D</span></div>
        <table class="calc-table">
          <tr><td>Tension</td><td><strong>${c.U || "?"} V</strong></td></tr>
          <tr><td>Courant</td><td><strong>${fmt(c.I || 0, 1)} A</strong></td></tr>
          <tr><td>Section mini calculée</td><td>${fmt(c.S || 0, 2)} mm²</td></tr>
          <tr><td>Section à acheter</td><td><strong>${c.Snorm ? c.Snorm + " mm²" : "⚠️ trop gros, raccourcir"}</strong></td></tr>
          <tr><td>Fusible conseillé</td><td><strong>${c.fuse ? c.fuse + " A" : "—"}</strong></td></tr>
        </table>
        <p class="muted" style="font-size:11px">S = 2×ρ×L×I / ΔU, ρ cuivre 0,0175 · chute ${E.params.dropPct}% · fusible ≈ 1,25×I, au départ batterie, au plus près !</p>
      </div></fieldset>`;
      el.querySelector("#w-len").onchange = e => { w.len = +e.target.value || 1; save("elec", "Longueur câble"); refresh(); };
      el.querySelector("#w-auto").onchange = e => {
        w.autoLen = e.target.checked;
        if (w.autoLen && plan) plan.updateAutoLens();
        save("elec", "Longueur câble " + (w.autoLen ? "auto" : "manuelle"));
        refresh();
      };
    }
  }

  function renderBilan() {
    const b = energyBalance();
    const el = root.querySelector("#el-bilan");
    const ok = b.prod >= b.conso;
    el.innerHTML = `<fieldset><legend>☀️ Bilan énergie / jour <span class="muted" style="font-size:10px">(modifiable)</span></legend>
      <table class="calc-table">
        <tr><th></th><th style="width:52px">W</th><th style="width:46px">h/j</th><th class="right">Wh/j</th></tr>
        ${b.loads.map(l => `<tr data-nid="${l.n.id}">
          <td style="font-size:11px">${esc(l.name)}</td>
          <td><input type="number" class="bl-p" value="${l.P}" step="5" style="width:48px;padding:2px 4px;font-size:11px"></td>
          <td><input type="number" class="bl-h" value="${l.h}" step="0.5" style="width:42px;padding:2px 4px;font-size:11px"></td>
          <td class="right">${fmt(l.Wh)}</td></tr>`).join("")}
        <tr><th colspan="3">Consommation totale</th><th class="right">${fmt(b.conso)} Wh/j</th></tr>
        <tr><td colspan="3">Production solaire (${E.params.sunH} h × 75%)</td><td class="right ${ok ? "ok" : "bad"}">${fmt(b.prod)} Wh/j</td></tr>
        ${b.bats.map(n => `<tr data-bid="${n.id}">
          <td colspan="2" style="font-size:11px">${esc(spec(n).name)}</td>
          <td><input type="number" class="bl-ah" value="${spec(n).Ah || 0}" step="10" style="width:48px;padding:2px 4px;font-size:11px"></td>
          <td class="right">${fmt((spec(n).Ah || 0) * E.params.U * (spec(n).chem === "LiFePO4" ? 0.8 : 0.5))} Wh ut.</td></tr>`).join("")}
        <tr><th colspan="3">Autonomie sans soleil</th><th class="right">${b.autonomy === Infinity ? "∞" : fmt(b.autonomy, 1) + " j"}</th></tr>
      </table>
      <p style="font-size:12px" class="${ok ? "ok" : "bad"}">${ok ? "✅ Le solaire couvre la conso journalière." : "⚠️ Solaire insuffisant : ajoute des panneaux, du soleil, ou roule (B2B)."}</p>
    </fieldset>`;
    el.querySelectorAll("tr[data-nid]").forEach(tr => {
      const n = E.nodes.find(x => x.id === tr.dataset.nid);
      tr.querySelector(".bl-p").onchange = e => { n.P = +e.target.value || 0; save("elec", "Bilan : " + spec(n).name); refresh(); };
      tr.querySelector(".bl-h").onchange = e => { n.h = +e.target.value || 0; save("elec", "Bilan : " + spec(n).name); refresh(); };
    });
    el.querySelectorAll("tr[data-bid]").forEach(tr => {
      const n = E.nodes.find(x => x.id === tr.dataset.bid);
      tr.querySelector(".bl-ah").onchange = e => { n.Ah = +e.target.value || 0; save("elec", "Capacité batterie"); refresh(); };
    });
  }

  rebuildCanvas();
  refresh();
}
