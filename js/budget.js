// Onglet Budget : articles, catégories 100% modifiables, totaux vs budget max.
import { state, save, uid, eur } from "./store.js";
import { esc } from "./planning.js";
import { reveal, isUnlocked, MASK } from "./secret.js";

let filterCat = "all";

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
      <button class="btn" id="bu-add">+ Article</button>
      <span class="spacer"></span>
      <button class="btn secondary" id="bu-print">🖨 Imprimer liste courses</button>
    </div>

    <div style="overflow-x:auto"><table class="grid"><thead><tr>
      <th style="width:28px">✓</th><th>Article</th><th style="width:150px">Catégorie</th><th style="width:140px">Où acheter</th>
      <th style="width:90px">Prix unit.</th><th style="width:55px">Qté</th><th style="width:90px" class="right">Total</th>
      <th>Notes / lien</th><th style="width:40px"></th>
    </tr></thead><tbody id="bu-body"></tbody></table></div>`;

  // chips catégories, renommables/supprimables
  const catsEl = root.querySelector("#bu-cats");
  cats.forEach((c, ci) => {
    const t = sum(items.filter(i => i.cat === c));
    const d = document.createElement("div");
    d.innerHTML = `<strong>${eur(t)}</strong>
      <button class="btn small secondary" data-ren="${ci}" title="Renommer" style="padding:1px 5px">✏️</button>
      <button class="btn small danger" data-delc="${ci}" title="Supprimer la catégorie" style="padding:1px 5px">✕</button>
      <br><span class="muted">${esc(c)}</span>`;
    catsEl.appendChild(d);
  });
  catsEl.querySelectorAll("[data-ren]").forEach(b => b.onclick = () => {
    const ci = +b.dataset.ren;
    const n = prompt("Nouveau nom de la catégorie :", cats[ci]);
    if (!n || n === cats[ci]) return;
    items.forEach(i => { if (i.cat === cats[ci]) i.cat = n; });
    if (filterCat === cats[ci]) filterCat = n;
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
  const shown = items.filter(i => filterCat === "all" || i.cat === filterCat);
  body.innerHTML = shown.map(i => `
    <tr data-id="${i.id}">
      <td data-label="Acheté"><input type="checkbox" class="b-check" ${i.status === "done" ? "checked" : ""} title="Acheté ?"></td>
      <td data-label="Article" class="c-main"><input type="text" class="b-name" value="${esc(i.name)}" ${i.status === "done" ? 'style="color:#888"' : ""}></td>
      <td data-label="Catégorie"><select class="b-cat">${cats.map(c => `<option ${i.cat === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></td>
      <td data-label="Où acheter" class="w-s c-main"><input type="text" class="b-store" value="${esc(i.store || "")}"></td>
      <td data-label="Prix unit."><input type="number" class="b-price" value="${i.price}" min="0" step="0.5" style="width:75px"></td>
      <td data-label="Qté"><input type="number" class="b-qty" value="${i.qty}" min="0" style="width:50px"></td>
      <td data-label="Total" class="right"><strong>${eur(i.price * i.qty)}</strong></td>
      <td data-label="Notes" class="w-s c-main"><input type="text" class="b-notes" value="${esc(i.notes || "")}" placeholder="…"></td>
      <td data-label="" class="c-act"><button class="btn small danger b-del">✕</button></td>
    </tr>`).join("");

  root.querySelector("#bu-max").onchange = e => { state.budget.max = +e.target.value || 5000; save("budget", "Budget max modifié"); render(root); };
  root.querySelector("#bu-filter").onchange = e => { filterCat = e.target.value; render(root); };
  root.querySelector("#bu-print").onclick = () => window.print();
  root.querySelector("#bu-add").onclick = () => {
    state.budget.items.unshift({ id: uid(), cat: filterCat === "all" ? cats[cats.length - 1] : filterCat, name: "Nouvel article", store: "", price: 0, qty: 1, status: "todo", link: "", notes: "" });
    save("budget", "Article ajouté");
    render(root);
  };
  body.querySelectorAll("tr").forEach(tr => {
    const i = items.find(x => x.id === tr.dataset.id);
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
