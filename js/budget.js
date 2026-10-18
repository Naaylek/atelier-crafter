// Onglet Budget : articles, catégories 100% modifiables, totaux vs budget max.
import { state, save, uid, eur } from "./store.js";
import { esc } from "./planning.js";
import { reveal, isUnlocked, MASK } from "./secret.js";

let filterCat = "all";
let lastMoved = null;   // ligne / catégorie à faire clignoter après un déplacement

// Couleur par catégorie : celle choisie par l'utilisateur, sinon une couleur
// par défaut stable (par nom pour les catégories connues, sinon tirée du nom
// lui-même, pour qu'elle ne change pas quand on réordonne).
const CAT_COLORS = {
  "Isolation": "#8e7cc3", "Bois & habillage": "#b8875b", "Électricité": "#e0a526",
  "Chauffage": "#e07a3f", "Gaz": "#d0574a", "Eau": "#4d94cc", "Cuisine": "#5f9e4a",
  "Couchage": "#a1887f", "Ouvertures": "#3fa7a3", "Quincaillerie": "#8a8a80",
  "Mécanique": "#56687a", "Divers": "#c08bb0",
};
const PALETTE = ["#8e7cc3", "#e0a526", "#4d94cc", "#5f9e4a", "#e07a3f", "#3fa7a3", "#c08bb0", "#b8875b", "#d0574a", "#56687a"];
const isHex = c => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
export function catColor(c) {
  const mine = state.budget.catColors && state.budget.catColors[c];
  if (isHex(mine)) return mine;
  if (CAT_COLORS[c]) return CAT_COLORS[c];
  let h = 0;
  for (const ch of String(c)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// regroupé par catégorie (défaut) ou ordre libre — préférence d'affichage
// propre à chaque appareil
const LS_GROUP = "ac-budget-group";
const getGrouped = () => { try { return localStorage.getItem(LS_GROUP) !== "0"; } catch { return true; } };
const setGrouped = v => { try { localStorage.setItem(LS_GROUP, v ? "1" : "0"); } catch {} };

export function render(root) {
  const items = state.budget.items;
  const cats = state.budget.cats;
  const total = sum(items);
  const spent = sum(items.filter(i => i.status === "done"));
  const totalHorsMeca = sum(items.filter(i => i.cat !== "Mécanique"));
  const max = state.budget.max;

  root.innerHTML = `
    <h2>💶 Budget aménagement</h2>
    <div class="cards">
      <div class="card stat"><div class="lbl">Total estimé (hors mécanique)</div>
        <div class="big ${totalHorsMeca > max ? "bad" : "ok"}">${eur(totalHorsMeca)}</div>
        <div class="progress"><div class="${totalHorsMeca > max ? "over" : ""}" style="width:${Math.min(100, totalHorsMeca / max * 100)}%"></div></div>
        <div class="muted">Budget : <input type="number" id="bu-max" value="${max}" style="width:90px"> € ${totalHorsMeca > max ? `· dépassement ${eur(totalHorsMeca - max)}` : `· marge ${eur(max - totalHorsMeca)}`}</div></div>
      <div class="card stat"><div class="lbl">Déjà dépensé</div><div class="big">${eur(spent)}</div>
        <div class="muted">${items.filter(i => i.status === "done").length} article(s) acheté(s)</div></div>
      <div class="card stat"><div class="lbl">Reste à acheter</div><div class="big">${eur(total - spent)}</div>
        <div class="muted">${items.filter(i => i.status !== "done").length} article(s)</div></div>
      <div class="card stat"><div class="lbl">Total avec mécanique</div><div class="big">${eur(total)}</div>
        <div class="muted">${isUnlocked()
          ? `van acheté : ${eur(reveal("vanCost"))} · projet complet : ${eur(total + reveal("vanCost"))}`
          : `van acheté : ${MASK} · projet complet : ${MASK}`}</div></div>
    </div>

    <div class="card"><h3>Par catégorie <button class="btn small secondary" id="bu-addcat">+ catégorie</button></h3>
      <div id="bu-cats" style="display:flex;flex-wrap:wrap;gap:14px"></div></div>

    <div class="toolrow">
      <label>Catégorie :</label>
      <select id="bu-filter">
        <option value="all">Toutes</option>
        ${cats.map(c => `<option ${filterCat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}
      </select>
      <label>Affichage :</label>
      <select id="bu-group">
        <option value="1" ${getGrouped() ? "selected" : ""}>Par catégorie</option>
        <option value="0" ${getGrouped() ? "" : "selected"}>Ordre libre</option>
      </select>
      <button class="btn" id="bu-add">+ Article</button>
      <span class="spacer"></span>
      <button class="btn secondary" id="bu-print">🖨 Imprimer liste courses</button>
    </div>

    <div style="overflow-x:auto"><table class="grid"><thead><tr>
      <th style="width:28px">✓</th><th>Article</th><th style="width:150px">Catégorie</th><th style="width:140px">Où acheter</th>
      <th style="width:90px">Prix unit.</th><th style="width:55px">Qté</th><th style="width:90px" class="right">Total</th>
      <th>Notes / lien</th><th style="width:96px"></th>
    </tr></thead><tbody id="bu-body"></tbody></table></div>`;

  // chips catégories, renommables/supprimables
  const catsEl = root.querySelector("#bu-cats");
  cats.forEach((c, ci) => {
    const t = sum(items.filter(i => i.cat === c));
    const d = document.createElement("div");
    d.className = "cat-chip";
    d.style.setProperty("--cc", catColor(c));
    d.innerHTML = `<strong>${eur(t)}</strong>
      <button class="btn small secondary" data-ren="${ci}" title="Renommer" style="padding:1px 5px">✏️</button>
      <button class="btn small danger" data-delc="${ci}" title="Supprimer la catégorie" style="padding:1px 5px">✕</button>
      <br><label class="cat-swatch" title="Changer la couleur"><input type="color" data-col="${ci}" value="${catColor(c)}"></label><span class="muted">${esc(c)}</span>`;
    catsEl.appendChild(d);
  });
  catsEl.querySelectorAll("[data-col]").forEach(inp => inp.onchange = () => {
    const c = cats[+inp.dataset.col];
    state.budget.catColors = state.budget.catColors || {};
    state.budget.catColors[c] = inp.value;
    save("budget", "Couleur : " + c);
    render(root);
  });
  catsEl.querySelectorAll("[data-ren]").forEach(b => b.onclick = () => {
    const ci = +b.dataset.ren;
    const n = prompt("Nouveau nom de la catégorie :", cats[ci]);
    if (!n || n === cats[ci]) return;
    items.forEach(i => { if (i.cat === cats[ci]) i.cat = n; });
    if (filterCat === cats[ci]) filterCat = n;
    const cc = state.budget.catColors;
    if (cc && cc[cats[ci]]) { cc[n] = cc[cats[ci]]; delete cc[cats[ci]]; }
    cats[ci] = n;
    save("budget", "Catégorie renommée : " + n);
    render(root);
  });
  catsEl.querySelectorAll("[data-delc]").forEach(b => b.onclick = () => {
    const ci = +b.dataset.delc;
    if (cats.length <= 1) return alert("Impossible : dernière catégorie.");
    const nb = items.filter(i => i.cat === cats[ci]).length;
    const dest = cats[ci === 0 ? 1 : 0];
    if (!confirm(`Supprimer « ${cats[ci]} » ?${nb ? `\nSes ${nb} article(s) iront dans « ${dest} ».` : ""}`)) return;
    items.forEach(i => { if (i.cat === cats[ci]) i.cat = dest; });
    if (filterCat === cats[ci]) filterCat = "all";
    if (state.budget.catColors) delete state.budget.catColors[cats[ci]];
    cats.splice(ci, 1);
    save("budget", "Catégorie supprimée");
    render(root);
  });
  root.querySelector("#bu-addcat").onclick = () => {
    const n = prompt("Nom de la nouvelle catégorie :");
    if (!n || cats.includes(n)) return;
    cats.push(n);
    save("budget", "Catégorie ajoutée : " + n);
    render(root);
  };

  const body = root.querySelector("#bu-body");
  const grouped = getGrouped();
  const shown = items.filter(i => filterCat === "all" || i.cat === filterCat);

  // ordre des groupes : celui des catégories, puis les éventuelles catégories
  // orphelines (article dont la catégorie a disparu) pour ne rien perdre
  const groupOrder = cats.slice();
  shown.forEach(i => { if (!groupOrder.includes(i.cat)) groupOrder.push(i.cat); });

  // liste dans l'ordre d'affichage : c'est elle qui définit « au-dessus / en dessous »
  const order = grouped
    ? groupOrder.flatMap(c => shown.filter(i => i.cat === c))
    : shown;

  const rowHTML = (i, k) => {
    const prev = order[k - 1], next = order[k + 1];
    const upOk = prev && (!grouped || prev.cat === i.cat);
    const downOk = next && (!grouped || next.cat === i.cat);
    return `
    <tr data-id="${i.id}" class="cat-row${lastMoved === i.id ? " moved" : ""}" style="--cc:${catColor(i.cat)}">
      <td data-label="Acheté"><input type="checkbox" class="b-check" ${i.status === "done" ? "checked" : ""} title="Acheté ?"></td>
      <td data-label="Article" class="c-main"><input type="text" class="b-name" value="${esc(i.name)}" ${i.status === "done" ? 'style="color:#888"' : ""}></td>
      <td data-label="Catégorie"><select class="b-cat">${groupOrder.map(c => `<option ${i.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></td>
      <td data-label="Où acheter" class="w-s c-main"><input type="text" class="b-store" value="${esc(i.store || "")}"></td>
      <td data-label="Prix unit."><input type="number" class="b-price" value="${i.price}" min="0" step="0.5" style="width:75px"></td>
      <td data-label="Qté"><input type="number" class="b-qty" value="${i.qty}" min="0" style="width:50px"></td>
      <td data-label="Total" class="right"><strong>${eur(i.price * i.qty)}</strong></td>
      <td data-label="Notes" class="w-s c-main"><input type="text" class="b-notes" value="${esc(i.notes || "")}" placeholder="…"></td>
      <td data-label="" class="c-act"><span class="b-move">
          <button class="btn small secondary b-up" title="Monter" ${upOk ? "" : "disabled"}>▲</button><button class="btn small secondary b-down" title="Descendre" ${downOk ? "" : "disabled"}>▼</button>
        </span><button class="btn small danger b-del" title="Supprimer">✕</button></td>
    </tr>`;
  };

  if (grouped) {
    body.innerHTML = groupOrder.map(c => {
      const list = order.filter(i => i.cat === c);
      if (!list.length && filterCat !== "all") return "";
      if (!list.length && !cats.includes(c)) return "";
      const ci = cats.indexOf(c);
      const head = `
    <tr class="grp${lastMoved === "cat:" + c ? " moved" : ""}" data-cat="${esc(c)}" style="--cc:${catColor(c)}">
      <td colspan="9" data-label=""><div class="grp-in">
        <span class="grp-dot"></span><strong>${esc(c)}</strong>
        <span class="muted">${list.length} article${list.length > 1 ? "s" : ""}</span>
        <span class="spacer"></span>
        <strong>${eur(sum(list))}</strong>
        <span class="grp-act">
          <button class="btn small secondary g-add" title="Ajouter un article dans cette catégorie">+ article</button>
          ${ci >= 0 && filterCat === "all" ? `<button class="btn small secondary g-up" title="Monter la catégorie" ${ci > 0 ? "" : "disabled"}>▲</button><button class="btn small secondary g-down" title="Descendre la catégorie" ${ci < cats.length - 1 ? "" : "disabled"}>▼</button>` : ""}
        </span>
      </div></td>
    </tr>`;
      return head + list.map(i => rowHTML(i, order.indexOf(i))).join("");
    }).join("");
  } else {
    body.innerHTML = order.map((i, k) => rowHTML(i, k)).join("");
  }
  lastMoved = null;

  // échange un article avec son voisin d'affichage (au sein de sa catégorie
  // en mode groupé) : seules ces deux lignes bougent, le reste garde sa place
  const moveItem = (id, dir) => {
    const k = order.findIndex(x => x.id === id);
    const me = order[k], nb = order[k + dir];
    if (!me || !nb || (grouped && nb.cat !== me.cat)) return;
    const arr = state.budget.items;
    const a = arr.indexOf(me), b = arr.indexOf(nb);
    [arr[a], arr[b]] = [arr[b], arr[a]];
    lastMoved = id;
    save("budget", "Ligne déplacée : " + me.name);
    render(root);
  };
  const moveCat = (c, dir) => {
    const ci = cats.indexOf(c), cj = ci + dir;
    if (ci < 0 || cj < 0 || cj >= cats.length) return;
    [cats[ci], cats[cj]] = [cats[cj], cats[ci]];
    lastMoved = "cat:" + c;
    save("budget", "Catégorie déplacée : " + c);
    render(root);
  };

  body.querySelectorAll("tr.grp").forEach(tr => {
    const c = tr.dataset.cat;
    tr.querySelector(".g-add").onclick = () => {
      // le nouvel article s'insère en bas de sa catégorie
      const arr = state.budget.items;
      let at = -1;
      arr.forEach((x, k) => { if (x.cat === c) at = k; });
      const it = { id: uid(), cat: c, name: "Nouvel article", store: "", price: 0, qty: 1, status: "todo", link: "", notes: "" };
      if (at >= 0) arr.splice(at + 1, 0, it); else arr.push(it);
      lastMoved = it.id;
      save("budget", "Article ajouté dans " + c);
      render(root);
      root.querySelector(`tr[data-id="${it.id}"] .b-name`)?.select();
    };
    tr.querySelector(".g-up")?.addEventListener("click", () => moveCat(c, -1));
    tr.querySelector(".g-down")?.addEventListener("click", () => moveCat(c, 1));
  });

  root.querySelector("#bu-max").onchange = e => { state.budget.max = +e.target.value || 5000; save("budget", "Budget max modifié"); render(root); };
  root.querySelector("#bu-filter").onchange = e => { filterCat = e.target.value; render(root); };
  root.querySelector("#bu-group").onchange = e => { setGrouped(e.target.value === "1"); render(root); };
  root.querySelector("#bu-print").onclick = () => window.print();
  root.querySelector("#bu-add").onclick = () => {
    state.budget.items.unshift({ id: uid(), cat: filterCat === "all" ? cats[cats.length - 1] : filterCat, name: "Nouvel article", store: "", price: 0, qty: 1, status: "todo", link: "", notes: "" });
    save("budget", "Article ajouté");
    render(root);
  };
  body.querySelectorAll("tr[data-id]").forEach(tr => {
    const i = items.find(x => x.id === tr.dataset.id);
    tr.querySelector(".b-up").onclick = () => moveItem(i.id, -1);
    tr.querySelector(".b-down").onclick = () => moveItem(i.id, 1);
    const upd = (sel, key, num, label) => tr.querySelector(sel).onchange = e => {
      i[key] = num ? (+e.target.value || 0) : e.target.value;
      save("budget", label + " : " + i.name);
      render(root);
    };
    upd(".b-name", "name", 0, "Article renommé"); upd(".b-cat", "cat", 0, "Catégorie");
    upd(".b-store", "store", 0, "Magasin"); upd(".b-price", "price", 1, "Prix");
    upd(".b-qty", "qty", 1, "Quantité"); upd(".b-notes", "notes", 0, "Note");
    tr.querySelector(".b-check").onchange = e => {
      i.status = e.target.checked ? "done" : "todo";
      save("budget", (e.target.checked ? "Acheté : " : "À racheter : ") + i.name);
      render(root);
    };
    tr.querySelector(".b-del").onclick = () => {
      if (!confirm("Supprimer « " + i.name + " » ?")) return;
      state.budget.items = items.filter(x => x.id !== i.id);
      save("budget", "Article supprimé : " + i.name);
      render(root);
    };
  });
}

const sum = arr => arr.reduce((s, i) => s + (+i.price || 0) * (+i.qty || 0), 0);
