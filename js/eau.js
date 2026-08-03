// Onglet Eau : schéma du circuit + plan 2D du van + volumes, autonomie, diamètres.
import { state, save, uid, fmt } from "./store.js";
import { EAU_LIB } from "./data.js";
import { Diagram } from "./diagram.js";
import { VanPlan, svgToPNG } from "./vanplan.js";
import { esc } from "./planning.js";
import { makeResizable } from "./ui.js";

let diag = null, plan = null, selKind = null, selObj = null;
let viewPlan = false;

const lib = t => EAU_LIB.find(l => l.type === t) || {};
const spec = n => ({ ...lib(n.type), ...n });

const DIAS = [10, 12, 16, 25, 38]; // diamètres courants mm (John Guest 12, évac 25, remplissage 38)

const NODE_COLORS = {
  reservoir: "#2456a6", gris: "#777770", pompe: "#8e44ad", accu: "#8e44ad",
  filtre: "#2e7d32", chauffe: "#c0392b", robinet: "#2980b9", evier: "#2980b9",
  douche: "#2980b9", vanne: "#777770", remplissage: "#2456a6", autre: "#777770",
};

// couleur tuyau : eau chaude = rouge, évacuation = gris, froide = bleu
function pipeColor(p) {
  const byId = Object.fromEntries(state.eau.nodes.map(n => [n.id, n]));
  const a = byId[p.a], b = byId[p.b];
  if (!a || !b) return "#4d94cc";
  if (a.type === "chauffe" || b.type === "chauffe") return "#c0392b";
  if (a.type === "gris" || b.type === "gris") return "#777770";
  if ((p.dia || 12) >= 25) return "#8a8175";
  return "#2980b9";
}

export function render(root) {
  root.innerHTML = `
    <div class="editor-wrap">
      <div class="editor-side">
        <h3>💧 Circuit d'eau</h3>
        <div class="toolrow">
          <button class="btn ${viewPlan ? "secondary" : ""}" id="wa-vschema">🗺 Schéma</button>
          <button class="btn ${viewPlan ? "" : "secondary"}" id="wa-vplan">🚐 Plan van</button>
        </div>
        <div class="toolrow">
          <button class="btn" id="wa-link" ${viewPlan ? "disabled" : ""}>🔗 Relier</button>
          <button class="btn danger small" id="wa-del" disabled>🗑</button>
          <button class="btn secondary small" id="wa-png">📷 PNG</button>
        </div>
        <div id="wa-props"></div>
        <fieldset><legend>➕ Ajouter un élément</legend>
          <div class="palette" id="wa-pal" style="max-height:200px;overflow-y:auto"></div>
        </fieldset>
        <fieldset><legend>Légende tuyaux</legend>
          <div style="font-size:11px;line-height:1.8">
            <span style="color:#2980b9">■</span> eau froide ·
            <span style="color:#c0392b">■</span> eau chaude ·
            <span style="color:#777770">■</span> évacuation / gris
          </div>
        </fieldset>
        <fieldset><legend>Paramètres</legend><div class="props">
          <div class="row"><label>Conso / jour</label><input type="number" id="wa-conso" min="1" style="width:70px"> L (à 2 pers.)</div>
        </div></fieldset>
        <div id="wa-bilan"></div>
      </div>
      <div class="editor-canvas" id="wa-canvas"></div>
    </div>`;

  makeResizable(root.querySelector(".editor-side"), "ac-side-diag");

  const E = state.eau;
  root.querySelector("#wa-conso").value = E.params.consoJour;
  root.querySelector("#wa-conso").onchange = e => { E.params.consoJour = +e.target.value || 15; save("eau", "Conso d'eau / jour"); refresh(); };

  const pal = root.querySelector("#wa-pal");
  EAU_LIB.forEach(l => {
    const b = document.createElement("button");
    b.innerHTML = `${l.icon} ${esc(l.name)}`;
    b.onclick = () => {
      const n = { id: uid(), type: l.type, x: 140 + Math.random() * 120, y: 120 + Math.random() * 120 };
      if (diag) { n.x = 100 - diag.view.x / diag.view.k + Math.random() * 80; n.y = 80 - diag.view.y / diag.view.k + Math.random() * 80; }
      E.nodes.push(n);
      save("eau", "Élément ajouté : " + l.name);
      rebuildCanvas(); refresh();
    };
    pal.appendChild(b);
  });

  const common = {
    nodes: () => E.nodes,
    edges: () => E.pipes,
    links: () => E.pipes,
    nodeIcon: n => lib(n.type).icon || "▫️",
    nodeTitle: n => spec(n).name || n.type,
    nodeColor: n => NODE_COLORS[n.type] || "#777",
    nodeSub: n => {
      const s = spec(n);
      if (["reservoir", "gris", "chauffe", "accu"].includes(n.type)) return `${s.vol || 0} L`;
      if (n.type === "pompe") return `${s.flow || 10} L/min · 12V`;
      return s.notes || "";
    },
    onSelect: (kind, obj) => { selKind = kind; selObj = obj; root.querySelector("#wa-del").disabled = !obj; renderProps(); },
    onChange: () => { save("eau"); refresh(); },
  };

  function rebuildCanvas() {
    const cv = root.querySelector("#wa-canvas");
    diag = null; plan = null;
    if (viewPlan) {
      plan = new VanPlan(cv, {
        ...common,
        linkColor: pipeColor,
        linkLabel: p => `Ø${p.dia || 12} · ${p.len || "?"} m`,
        onAutoLen: (pipe, m) => {
          if (pipe.autoLen === false) return;
          pipe.len = m;
        },
      });
    } else {
      diag = new Diagram(cv, {
        ...common,
        edgeColor: pipeColor,
        edgeLabel: p => [`Ø ${p.dia || 12} mm${p.len ? " · " + p.len + " m" : ""}`],
        onLink: (a, b) => { E.pipes.push({ id: uid(), a, b, dia: 12, autoLen: true }); save("eau", "Tuyau ajouté"); refresh(); },
      });
    }
  }

  root.querySelector("#wa-vschema").onclick = () => { viewPlan = false; render(root); };
  root.querySelector("#wa-vplan").onclick = () => { viewPlan = true; render(root); };
  root.querySelector("#wa-png").onclick = () => {
    const svg = root.querySelector("#wa-canvas svg");
    if (svg) svgToPNG(svg, viewPlan ? "eau-plan-van.png" : "eau-schema.png");
  };
  root.querySelector("#wa-link").onclick = () => {
    if (!diag) return;
    if (diag.linking) diag.stopLink(); else diag.startLink();
    root.querySelector("#wa-link").classList.toggle("secondary", diag.linking);
  };
  root.querySelector("#wa-del").onclick = deleteSel;
  root.onkeydown = e => {
    if ((e.key === "Delete" || e.key === "Backspace") && selObj && !["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) deleteSel();
  };
  root.tabIndex = 0;

  function deleteSel() {
    if (!selObj) return;
    if (selKind === "node") {
      E.nodes = E.nodes.filter(n => n.id !== selObj.id);
      E.pipes = E.pipes.filter(p => p.a !== selObj.id && p.b !== selObj.id);
      save("eau", "Élément supprimé");
    } else {
      E.pipes = E.pipes.filter(p => p.id !== selObj.id);
      save("eau", "Tuyau supprimé");
    }
    selObj = null; selKind = null;
    root.querySelector("#wa-del").disabled = true;
    refresh();
  }

  function renderProps() {
    const el = root.querySelector("#wa-props");
    if (!selObj) {
      el.innerHTML = `<fieldset><legend>✏️ Modifier</legend>
        <p class="muted" style="font-size:12px;margin:0">
        <strong>Clique un élément</strong> (ou un tuyau) dans le schéma :
        ses réglages s'ouvrent ici — nom, volume, débit, diamètre.${viewPlan
          ? "<br>Glisse-les à leur vraie place dans le van : les longueurs de tuyaux se calculent toutes seules."
          : "<br>🔗 Relier : clique 2 éléments."}</p></fieldset>`;
      return;
    }
    root.querySelector(".editor-side").scrollTop = 0;
    if (selKind === "node") {
      const n = E.nodes.find(x => x.id === selObj.id);
      if (!n) { el.innerHTML = ""; return; }
      const s = spec(n);
      el.innerHTML = `<fieldset class="sel-props"><legend>✏️ ${lib(n.type).icon || ""} ${esc(s.name)}</legend><div class="props">
        <div class="row"><label>Nom</label><input type="text" data-k="name" value="${esc(n.name ?? lib(n.type).name)}" style="width:150px"></div>
        ${["reservoir", "gris", "chauffe", "accu", "autre"].includes(n.type) ? `<div class="row"><label>Volume (L)</label><input type="number" data-k="vol" value="${s.vol || 0}"></div>` : ""}
        ${n.type === "pompe" ? `<div class="row"><label>Débit (L/min)</label><input type="number" data-k="flow" value="${s.flow || 10}"></div>` : ""}
        <div class="row"><label>Notes</label><input type="text" data-k="notes" value="${esc(n.notes || "")}" style="width:150px"></div>
      </div></fieldset>`;
      el.querySelectorAll("[data-k]").forEach(inp => inp.onchange = () => {
        n[inp.dataset.k] = inp.type === "number" ? +inp.value : inp.value;
        save("eau", "Élément modifié : " + spec(n).name);
        refresh();
      });
    } else {
      const p = E.pipes.find(x => x.id === selObj.id);
      if (!p) { el.innerHTML = ""; return; }
      el.innerHTML = `<fieldset class="sel-props"><legend>✏️ Tuyau</legend><div class="props">
        <div class="row"><label>Diamètre</label><select id="p-dia">
          ${DIAS.map(d => `<option value="${d}" ${(p.dia || 12) === d ? "selected" : ""}>Ø ${d} mm</option>`).join("")}
        </select></div>
        <div class="row"><label>Longueur (m)</label><input type="number" id="p-len" value="${p.len || 1}" min="0.3" step="0.1" ${p.autoLen !== false ? "disabled" : ""}></div>
        <div class="row"><label>Longueur auto</label><input type="checkbox" id="p-auto" ${p.autoLen !== false ? "checked" : ""}> <span class="muted" style="font-size:11px">depuis le plan 2D</span></div>
        <p class="muted" style="font-size:11px">Ø12 : alimentation (John Guest) · Ø25 : évacuation · Ø38 : remplissage.</p>
      </div></fieldset>`;
      el.querySelector("#p-dia").onchange = e => { p.dia = +e.target.value; save("eau", "Diamètre tuyau"); refresh(); };
      el.querySelector("#p-len").onchange = e => { p.len = +e.target.value || 1; save("eau", "Longueur tuyau"); refresh(); };
      el.querySelector("#p-auto").onchange = e => {
        p.autoLen = e.target.checked;
        if (p.autoLen && plan) plan.updateAutoLens();
        save("eau", "Longueur tuyau " + (p.autoLen ? "auto" : "manuelle"));
        refresh();
      };
    }
  }

  function renderBilan() {
    const el = root.querySelector("#wa-bilan");
    const resvs = E.nodes.filter(n => n.type === "reservoir");
    const griss = E.nodes.filter(n => n.type === "gris");
    const propre = resvs.reduce((t, n) => t + (spec(n).vol || 0), 0);
    const gris = griss.reduce((t, n) => t + (spec(n).vol || 0), 0);
    const conso = E.params.consoJour;
    const days = conso > 0 ? propre / conso : 0;
    const okGris = gris >= propre * 0.4;
    const totalTuyau = E.pipes.reduce((t, p) => t + (+p.len || 0), 0);
    el.innerHTML = `<fieldset><legend>🚰 Bilan eau <span class="muted" style="font-size:10px">(modifiable)</span></legend>
      <table class="calc-table">
        ${[...resvs, ...griss].map(n => `<tr data-rid="${n.id}">
          <td style="font-size:11px">${esc(spec(n).name)}</td>
          <td class="right"><input type="number" class="bl-vol" value="${spec(n).vol || 0}" step="5" style="width:52px;padding:2px 4px;font-size:11px"> L</td></tr>`).join("")}
        <tr><th>Eau propre embarquée</th><th class="right">${propre} L (${propre} kg)</th></tr>
        <tr><td>Eaux grises</td><td class="right">${gris} L</td></tr>
        <tr><th>Autonomie</th><th class="right">${fmt(days, 1)} jours</th></tr>
        <tr><td>Tuyauterie totale</td><td class="right">≈ ${fmt(totalTuyau, 1)} m</td></tr>
      </table>
      <p style="font-size:12px" class="${okGris ? "ok" : "warn"}">${okGris ? "✅ Capacité eaux grises correcte." : "⚠️ Réservoir gris petit vs eau propre (vise ≥ 40%)."}</p>
      <p class="muted" style="font-size:11px">Pense au poids : l'eau compte dans la charge utile.</p>
    </fieldset>`;
    el.querySelectorAll("tr[data-rid]").forEach(tr => {
      const n = E.nodes.find(x => x.id === tr.dataset.rid);
      tr.querySelector(".bl-vol").onchange = e => { n.vol = +e.target.value || 0; save("eau", "Volume : " + spec(n).name); refresh(); };
    });
  }

  function refresh() { (diag || plan)?.render(); renderBilan(); renderProps(); }
  rebuildCanvas();
  refresh();
}
