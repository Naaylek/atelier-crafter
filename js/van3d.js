// Onglet Van 3D : éditeur d'aménagement drag & drop (style vanspace3D)
// Unités scène = millimètres. Origine = centre du plancher du caisson.
// x = largeur (droite +), y = hauteur, z = longueur (+ vers la cabine).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { state, save, uid, toast, fmt, SHELL_DEFAULT } from "./store.js";
import { FURN_LIB } from "./data.js";
import { esc } from "./planning.js";
import { makeResizable } from "./ui.js";

let inited = false;
let renderer, scene, camPersp, camOrtho, activeCam, controls, raycaster, pointer;
let vanGroup, shellModel, furnGroup, labelGroup, measureGroup, vanDimsGroup, tempMarker;
let tc = null, tool = "drag"; // drag | move | rotate | scale
let snapOn = localStorage.getItem("ac-snap") !== "0"; // aimantation (préférence locale)
let lockOn = localStorage.getItem("ac-lock") === "1"; // verrou : regarder sans rien déplacer
let surfOpacity = +(localStorage.getItem("ac-surf") ?? 1);   // opacité globale des surfaces
let edgeOpacity = +(localStorage.getItem("ac-edge") ?? 0.5); // opacité globale des bords
let selId = null, dragging = null;
let sideEl, canvasEl, rootEl, viewMode = "persp";
let showLabels = true, showVanDims = false, measureMode = false, measureStart = null;

const SHAPES = { box: "Rectangulaire", rounded: "Coins arrondis", cyl: "Cylindre" };

// faces masquables par forme — l'ordre suit les groupes de matériaux de three.js
const FACE_DEFS = {
  box: [
    { k: "px", label: "Droite" }, { k: "nx", label: "Gauche" },
    { k: "py", label: "Dessus" }, { k: "ny", label: "Dessous" },
    { k: "pz", label: "Avant" }, { k: "nz", label: "Arrière" },
  ],
  cyl: [
    { k: "side", label: "Côté" }, { k: "py", label: "Dessus" }, { k: "ny", label: "Dessous" },
  ],
  rounded: [
    { k: "lids", label: "Dessus + dessous" }, { k: "walls", label: "Parois" },
  ],
};

const V = () => state.van;
const layout = () => state.layouts[state.activeLayout] || state.layouts[0];
const items = () => layout().items;
const measures = () => { if (!layout().measures) layout().measures = []; return layout().measures; };

// hauteur du bas d'un objet selon son placement
function bottomY(it) {
  if (it.y !== null && it.y !== undefined) return it.y;
  if (it.place === "counter") return 900;
  if (it.place === "upper") return V().H - it.h - 150;
  if (it.place === "roof") return V().H + 30;
  return 0;
}

export function render(root) {
  if (inited) { onShow(); return; }
  inited = true;
  rootEl = root;

  root.innerHTML = `
    <div id="van-wrap">
      <div id="van-side"></div>
      <div id="van-canvas">
        <div id="van-views">
          <button data-v="persp" class="active">🎥 3D</button>
          <button data-v="top">⬇️ Dessus</button>
          <button data-v="left">⬅️ Gauche</button>
          <button data-v="right">➡️ Droite</button>
          <button data-v="back">🚪 Arrière</button>
          <button data-v="front">🚗 Avant</button>
          <span style="width:1px;background:#d8d2c6;margin:2px 2px"></span>
          <button data-tool="drag" class="active" title="Glisser librement au sol">🖐 Souris</button>
          <button data-tool="move" title="Flèches de déplacement précises (x/y/z)">✥ Déplacer</button>
          <button data-tool="rotate" title="Anneau de rotation (pas de 15°)">↻ Pivoter</button>
          <button data-tool="scale" title="Poignées de redimensionnement">⤢ Taille</button>
          <button id="btn-snap" title="Aimanter aux parois du caisson, passages de roues et autres meubles (±80 mm)">🧲 Aimant</button>
          <button id="btn-lock" title="Verrouiller : regarder le van sous tous les angles sans risquer de déplacer un meuble">🔒 Verrou</button>
          <span style="width:1px;background:#d8d2c6;margin:2px 2px"></span>
          <button id="btn-labels" class="active" title="Afficher/cacher noms et dimensions des meubles">🏷️ Noms</button>
          <button id="btn-vandims" title="Afficher/cacher les cotes du caisson">📐 Cotes van</button>
          <button id="btn-measure" title="Outil règle : clique 2 points pour mesurer">📏 Règle</button>
          <button id="btn-png" title="Exporter en image PNG">📷 PNG</button>
        </div>
        <div id="van-hint">Clic = sélection · glisser = déplacer · flèches = pas de 10mm (⇧=100) · R = pivoter · ⌫ = supprimer</div>
      </div>
    </div>`;

  sideEl = root.querySelector("#van-side");
  canvasEl = root.querySelector("#van-canvas");
  makeResizable(sideEl, "ac-side-van");

  initThree();
  buildVan();
  loadShell();
  rebuildFurniture();
  renderSide();

  root.querySelectorAll("#van-views [data-v]").forEach(b => b.onclick = () => setView(b.dataset.v, root));
  root.querySelectorAll("#van-views [data-tool]").forEach(b => b.onclick = () => setTool(b.dataset.tool));
  const snapBtn = root.querySelector("#btn-snap");
  snapBtn.classList.toggle("active", snapOn);
  snapBtn.onclick = () => {
    snapOn = !snapOn;
    localStorage.setItem("ac-snap", snapOn ? "1" : "0");
    snapBtn.classList.toggle("active", snapOn);
    toast(snapOn ? "🧲 Aimantation activée" : "🧲 Aimantation désactivée");
  };
  const lockBtn = root.querySelector("#btn-lock");
  lockBtn.classList.toggle("active", lockOn);
  lockBtn.onclick = () => {
    lockOn = !lockOn;
    localStorage.setItem("ac-lock", lockOn ? "1" : "0");
    lockBtn.classList.toggle("active", lockOn);
    if (lockOn && tc) tc.detach();
    else attachGizmo();
    toast(lockOn ? "🔒 Meubles verrouillés — balade-toi sans risque" : "🔓 Meubles déverrouillés");
  };
  root.querySelector("#btn-png").onclick = exportPNG;
  root.querySelector("#btn-labels").onclick = e => {
    showLabels = !showLabels;
    e.target.classList.toggle("active", showLabels);
    rebuildLabels();
  };
  root.querySelector("#btn-vandims").onclick = e => {
    showVanDims = !showVanDims;
    e.target.classList.toggle("active", showVanDims);
    rebuildVanDims();
  };
  root.querySelector("#btn-measure").onclick = e => setMeasureMode(!measureMode);

  window.addEventListener("keydown", onKey);
}

export function onShow() { resize(); }

// rafraîchissement complet depuis l'état (undo/redo, import…)
export function hardRefresh() {
  if (!inited) return;
  buildVan();
  updateShell();
  rebuildFurniture();
  rebuildMeasures();
  rebuildVanDims();
  renderSide();
}

// ---------------- three.js ----------------
function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  canvasEl.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0ede6);

  camPersp = new THREE.PerspectiveCamera(50, 1, 10, 60000);
  camPersp.position.set(3800, 3200, 4800);
  const d = 2600;
  camOrtho = new THREE.OrthographicCamera(-d, d, d, -d, -50000, 50000);
  activeCam = camPersp;

  controls = new OrbitControls(camPersp, renderer.domElement);
  controls.target.set(0, 700, 0);
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.update();

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
  sun.position.set(3000, 6000, 2000);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdde8ff, 0.5);
  fill.position.set(-3000, 2000, -3000);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9000, 48),
    new THREE.MeshLambertMaterial({ color: 0xe2ddd2 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -572;
  scene.add(ground);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  // gizmo façon vanspace3D : déplacer / pivoter / redimensionner
  tc = new TransformControls(camPersp, renderer.domElement);
  tc.setSize(0.9);
  tc.setTranslationSnap(10);
  tc.setRotationSnap(THREE.MathUtils.degToRad(15));
  tc.addEventListener("dragging-changed", e => {
    if (e.value) { controls.enabled = false; }
    else { controls.enabled = activeCam === camPersp; clearSnapGuides(); commitTransform(); }
  });
  // aimant en direct pendant le déplacement au gizmo
  tc.addEventListener("objectChange", () => {
    if (tool !== "move" || !selId || !snapOn || !tc.object) return;
    const it = items().find(i => i.id === selId);
    if (!it) return;
    const m = tc.object;
    const tmp = { ...it, x: m.position.x, z: m.position.z };
    const snapped = applySnap(tmp);
    m.position.x = tmp.x;
    m.position.z = tmp.z;
    showSnapGuides(tmp, snapped);
  });
  scene.add(tc);

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", () => {
    clearSnapGuides();
    if (dragging) { dragging = null; controls.enabled = true; save("van", "Meuble déplacé"); renderSide(); }
  });

  // accès debug console (window.__van)
  window.__van = {
    get scene() { return scene; }, get cam() { return activeCam; },
    get furn() { return furnGroup; }, THREE,
    get renderer() { return renderer; },
    frames: 0, lastError: null,
    pick(fx, fy) {
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(fx * 2 - 1, -(fy * 2 - 1)), activeCam);
      return rc.intersectObjects(scene.children, true).slice(0, 3)
        .map(h => ({ obj: h.object.type, name: h.object.userData.itemId || h.object.parent?.type, p: h.point.toArray().map(v => Math.round(v)) }));
    },
  };

  new ResizeObserver(resize).observe(canvasEl);
  renderer.setAnimationLoop(() => {
    try {
      if (activeCam === camPersp) controls.update();
      renderer.render(scene, activeCam);
      window.__van.frames++;
    } catch (e) {
      // ne tue jamais la boucle de rendu ; garde la 1re erreur pour debug
      if (!window.__van.lastError) {
        window.__van.lastError = e.stack || String(e);
        console.error("Erreur boucle 3D :", e);
      }
    }
  });
  resize();
}

function resize() {
  if (!renderer) return;
  const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camPersp.aspect = w / h;
  camPersp.updateProjectionMatrix();
  const a = w / h, d = 2400;
  camOrtho.left = -d * a; camOrtho.right = d * a; camOrtho.top = d; camOrtho.bottom = -d;
  camOrtho.updateProjectionMatrix();
}

// caisson procédural aux dimensions exactes
function buildVan() {
  if (vanGroup) scene.remove(vanGroup);
  vanGroup = new THREE.Group();
  const { L, W, H, rearToArch, archL, archW, archH } = V();
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xcbb894 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 20, L), floorMat);
  floor.position.y = -10;
  floor.userData.isFloor = true;
  vanGroup.add(floor);

  const grid = new THREE.GridHelper(4000, 40, 0xbbb3a4, 0xdad3c6);
  grid.position.y = 1;
  grid.scale.set(W / 4000, 1, L / 4000);
  grid.raycast = () => {};
  vanGroup.add(grid);

  const mkWall = (w, h, px, py, pz, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(px, py, pz);
    m.rotation.y = ry;
    vanGroup.add(m);
  };
  mkWall(L, H, -W / 2, H / 2, 0, Math.PI / 2);   // gauche
  mkWall(L, H, W / 2, H / 2, 0, -Math.PI / 2);   // droite
  mkWall(W, H, 0, H / 2, -L / 2, 0);             // arrière (portes)
  mkWall(W, H, 0, H / 2, L / 2, Math.PI);        // cloison cabine

  // arêtes du caisson
  const box = new THREE.BoxGeometry(W, H, L);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0x8a8175 }));
  edges.position.y = H / 2;
  edges.raycast = () => {};
  vanGroup.add(edges);

  // passages de roues
  const archMat = new THREE.MeshLambertMaterial({ color: 0x555049 });
  const archZ = -L / 2 + rearToArch + archL / 2;
  [-1, 1].forEach(s => {
    const arch = new THREE.Mesh(new THREE.BoxGeometry(archW, archH, archL), archMat);
    arch.position.set(s * (W / 2 - archW / 2), archH / 2, archZ);
    arch.userData.isArch = true;
    vanGroup.add(arch);
  });

  // marquage porte coulissante (côté droit, vers l'avant)
  const doorMark = new THREE.Mesh(
    new THREE.PlaneGeometry(1250, H - 200),
    new THREE.MeshBasicMaterial({ color: 0x4c9a52, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  );
  doorMark.rotation.y = -Math.PI / 2;
  doorMark.position.set(W / 2 - 4, (H - 200) / 2 + 50, L / 2 - 700);
  doorMark.raycast = () => {};
  vanGroup.add(doorMark);

  vanGroup.add(makeLabel("◀ PORTES ARRIÈRE", 0, H + 150, -L / 2, 900));
  vanGroup.add(makeLabel("CABINE ▶", 0, H + 150, L / 2, 700));
  scene.add(vanGroup);
  rebuildVanDims();
}

let glbCache = null;
function loadShell() {
  const sh = V().shell;
  if (shellModel) { scene.remove(shellModel); shellModel = null; }
  if (!sh.visible) return;
  const apply = gltf => {
    shellModel = gltf.scene.clone ? gltf.scene.clone(true) : gltf.scene;
    shellModel.traverse(o => {
      if (o.isMesh) {
        o.material = new THREE.MeshLambertMaterial({ color: 0x39598f, transparent: true, opacity: sh.opacity, depthWrite: false });
        o.raycast = () => {}; // ne bloque pas la souris
      }
    });
    shellModel.scale.setScalar(sh.scale);
    shellModel.position.set(sh.x, sh.y, sh.z);
    scene.add(shellModel);
  };
  if (glbCache) { apply(glbCache); return; }
  new GLTFLoader().load("assets/crafter.glb",
    g => { glbCache = g; apply(g); },
    undefined,
    () => toast("⚠️ Modèle 3D Crafter introuvable (assets/crafter.glb)"));
}

function updateShell() {
  const sh = V().shell;
  if (!shellModel) { loadShell(); return; }
  shellModel.visible = sh.visible;
  shellModel.position.set(sh.x, sh.y, sh.z);
  shellModel.scale.setScalar(sh.scale);
  shellModel.traverse(o => { if (o.isMesh) o.material.opacity = sh.opacity; });
}

// ---------------- meubles ----------------
// géométrie selon la forme : boîte, coins arrondis (rayon en mm) ou cylindre
function buildGeo(it) {
  const shape = it.shape || "box";
  if (shape === "cyl") {
    return new THREE.CylinderGeometry(it.w / 2, it.w / 2, it.h, 32);
  }
  if (shape === "rounded") {
    const r = Math.max(1, Math.min(it.radius || 60, it.w / 2 - 1, it.l / 2 - 1));
    const w = it.w, l = it.l;
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -l / 2);
    s.lineTo(w / 2 - r, -l / 2); s.quadraticCurveTo(w / 2, -l / 2, w / 2, -l / 2 + r);
    s.lineTo(w / 2, l / 2 - r); s.quadraticCurveTo(w / 2, l / 2, w / 2 - r, l / 2);
    s.lineTo(-w / 2 + r, l / 2); s.quadraticCurveTo(-w / 2, l / 2, -w / 2, l / 2 - r);
    s.lineTo(-w / 2, -l / 2 + r); s.quadraticCurveTo(-w / 2, -l / 2, -w / 2 + r, -l / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: it.h, bevelEnabled: false, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -it.h / 2, 0);
    return g;
  }
  return new THREE.BoxGeometry(it.w, it.h, it.l); // w = largeur (x), l = longueur (z)
}

function rebuildFurniture() {
  if (tc) tc.detach();
  if (furnGroup) scene.remove(furnGroup);
  furnGroup = new THREE.Group();
  items().forEach(it => {
    const geo = buildGeo(it);
    // un matériau par face → faces masquables individuellement
    const defs = FACE_DEFS[it.shape || "box"];
    const hidden = it.hiddenFaces || [];
    const mat = defs.map(d => {
      const mm = new THREE.MeshLambertMaterial({ color: new THREE.Color(it.color || "#999"), side: THREE.DoubleSide });
      mm.userData.hidden = hidden.includes(d.k);
      mm.visible = !mm.userData.hidden;
      return mm;
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.itemId = it.id;
    placeMesh(mesh, it);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0x33302a, transparent: true, opacity: 0.5 }));
    edge.raycast = () => {};
    mesh.add(edge);
    furnGroup.add(mesh);
  });
  scene.add(furnGroup);
  updateHighlights();
  rebuildLabels();
  rebuildMeasures();
  attachGizmo();
}

// ---------------- gizmo ----------------
function setTool(t) {
  tool = t;
  rootEl.querySelectorAll("#van-views [data-tool]").forEach(b => b.classList.toggle("active", b.dataset.tool === t));
  attachGizmo();
}

function attachGizmo() {
  if (!tc) return;
  const mesh = selId ? meshOf(selId) : null;
  if (lockOn || tool === "drag" || !mesh) { tc.detach(); return; }
  tc.setMode(tool === "move" ? "translate" : tool);
  tc.showX = true; tc.showY = true; tc.showZ = true;
  tc.attach(mesh);
}

// applique la transformation du gizmo à l'objet (fin de glisser)
function commitTransform() {
  if (!tc || !tc.object || !selId) return;
  const it = items().find(i => i.id === selId);
  const m = tc.object;
  if (!it) return;
  const r10 = v => Math.round(v / 10) * 10;
  if (tool === "move") {
    it.x = r10(m.position.x);
    it.z = r10(m.position.z);
    it.y = Math.max(0, r10(m.position.y - it.h / 2));
    applySnap(it);
  } else if (tool === "rotate") {
    const snap = a => ((Math.round(THREE.MathUtils.radToDeg(a) / 15) * 15) % 360 + 360) % 360;
    it.rotX = snap(m.rotation.x);
    it.rot = snap(m.rotation.y);
    it.rotZ = snap(m.rotation.z);
  } else if (tool === "scale") {
    it.w = Math.max(20, r10(it.w * m.scale.x));
    it.h = Math.max(20, r10(it.h * m.scale.y));
    it.l = Math.max(20, r10(it.l * m.scale.z));
    if (it.shape === "cyl") it.l = it.w; // cylindre : diamètre unique
    m.scale.set(1, 1, 1);
  }
  save("van", { move: "Meuble déplacé : ", rotate: "Meuble pivoté : ", scale: "Meuble redimensionné : " }[tool] + it.name);
  rebuildFurniture();
  renderSide();
}

function placeMesh(mesh, it) {
  mesh.position.set(it.x, bottomY(it) + it.h / 2, it.z);
  const d2r = THREE.MathUtils.degToRad;
  mesh.rotation.set(d2r(it.rotX || 0), d2r(it.rot || 0), d2r(it.rotZ || 0));
}

function meshOf(id) { return furnGroup.children.find(m => m.userData.itemId === id); }

function itemAABB(it) {
  // boîte englobante exacte quelle que soit la rotation (les 8 coins tournés)
  const d2r = THREE.MathUtils.degToRad;
  const e = new THREE.Euler(d2r(it.rotX || 0), d2r(it.rot || 0), d2r(it.rotZ || 0));
  const cy = bottomY(it) + it.h / 2;
  const v = new THREE.Vector3();
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    v.set(sx * it.w / 2, sy * it.h / 2, sz * it.l / 2).applyEuler(e);
    minX = Math.min(minX, it.x + v.x); maxX = Math.max(maxX, it.x + v.x);
    minY = Math.min(minY, cy + v.y); maxY = Math.max(maxY, cy + v.y);
    minZ = Math.min(minZ, it.z + v.z); maxZ = Math.max(maxZ, it.z + v.z);
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

// aimantation : colle le centre de l'objet pour que ses bords touchent
// les parois, les passages de roues ou les bords des autres meubles (±30 mm)
function applySnap(it) {
  if (!snapOn) return { x: false, z: false };
  const { L, W, rearToArch, archL } = V();
  const bb = itemAABB(it);
  const hw = (bb.maxX - bb.minX) / 2, hl = (bb.maxZ - bb.minZ) / 2;
  const TH = 80; // portée de l'aimant (mm)
  const candX = [-W / 2 + hw, W / 2 - hw];
  const candZ = [-L / 2 + hl, L / 2 - hl,
    -L / 2 + rearToArch - hl,             // collé derrière le passage de roue
    -L / 2 + rearToArch + archL + hl];    // collé devant le passage de roue
  items().forEach(o => {
    if (o.id === it.id || o.place === "roof") return;
    const ob = itemAABB(o);
    // on ne colle en x que si les objets se font face en z (et inversement)
    const faceZ = bb.minZ < ob.maxZ + TH && bb.maxZ > ob.minZ - TH;
    const faceX = bb.minX < ob.maxX + TH && bb.maxX > ob.minX - TH;
    if (faceZ) candX.push(ob.minX - hw, ob.maxX + hw, ob.minX + hw, ob.maxX - hw);
    if (faceX) candZ.push(ob.minZ - hl, ob.maxZ + hl, ob.minZ + hl, ob.maxZ - hl);
  });
  let bestX = null, dx = TH;
  candX.forEach(c => { const d = Math.abs(c - it.x); if (d < dx) { dx = d; bestX = c; } });
  let bestZ = null, dz = TH;
  candZ.forEach(c => { const d = Math.abs(c - it.z); if (d < dz) { dz = d; bestZ = c; } });
  if (bestX !== null) it.x = Math.round(bestX);
  if (bestZ !== null) it.z = Math.round(bestZ);
  return { x: bestX !== null, z: bestZ !== null };
}

// lignes vertes de guidage quand l'aimant accroche
let snapGuides = null;
function clearSnapGuides() {
  if (snapGuides) { scene.remove(snapGuides); snapGuides = null; }
}
function showSnapGuides(it, snapped) {
  clearSnapGuides();
  if (!snapped.x && !snapped.z) return;
  const { L, W } = V();
  snapGuides = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0x2e7d32, depthTest: false, transparent: true, opacity: 0.9 });
  const y = bottomY(it) + 8;
  const mkLine = (a, b) => {
    const li = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), mat);
    li.raycast = () => {};
    snapGuides.add(li);
  };
  const bb = itemAABB(it);
  if (snapped.x) { // aligné en largeur : lignes sur toute la longueur aux bords
    mkLine([bb.minX, y, -L / 2], [bb.minX, y, L / 2]);
    mkLine([bb.maxX, y, -L / 2], [bb.maxX, y, L / 2]);
  }
  if (snapped.z) { // aligné en longueur : lignes sur toute la largeur aux bords
    mkLine([-W / 2, y, bb.minZ], [W / 2, y, bb.minZ]);
    mkLine([-W / 2, y, bb.maxZ], [W / 2, y, bb.maxZ]);
  }
  scene.add(snapGuides);
}

function overlaps(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ && a.minY < b.maxY && a.maxY > b.minY;
}

function checkWarnings(it) {
  const w = [];
  const { L, W, H, rearToArch, archL, archW, archH } = V();
  const bb = itemAABB(it);
  if (it.place !== "roof") {
    if (bb.minX < -W / 2 - 1 || bb.maxX > W / 2 + 1 || bb.minZ < -L / 2 - 1 || bb.maxZ > L / 2 + 1) w.push("dépasse du caisson");
    if (bb.maxY > H + 1) w.push("touche le plafond (" + H + " mm)");
    const archZ0 = -L / 2 + rearToArch;
    [[-W / 2, -W / 2 + archW], [W / 2 - archW, W / 2]].forEach(([x0, x1]) => {
      if (overlaps(bb, { minX: x0, maxX: x1, minZ: archZ0, maxZ: archZ0 + archL, minY: 0, maxY: archH }))
        w.push("chevauche un passage de roue");
    });
    items().forEach(o => {
      if (o.id !== it.id && o.place !== "roof" && overlaps(bb, itemAABB(o))) w.push("chevauche « " + o.name + " »");
    });
  }
  return w;
}

// ---------------- étiquettes ----------------
function makeLabel(text, x, y, z, width = 600, bg = "rgba(255,255,255,.85)") {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = "600 28px -apple-system, Helvetica";
  const tw = Math.max(60, ctx.measureText(text).width + 24);
  c.width = tw; c.height = 44;
  const ctx2 = c.getContext("2d");
  ctx2.fillStyle = bg;
  ctx2.roundRect(0, 0, tw, 44, 10); ctx2.fill();
  ctx2.font = "600 28px -apple-system, Helvetica";
  ctx2.fillStyle = "#2b2620";
  ctx2.textBaseline = "middle";
  ctx2.fillText(text, 12, 24);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sp.scale.set(width, width * 44 / tw, 1);
  sp.position.set(x, y, z);
  sp.raycast = () => {};
  return sp;
}

function rebuildLabels() {
  if (labelGroup) scene.remove(labelGroup);
  labelGroup = new THREE.Group();
  if (showLabels) {
    items().forEach(it => {
      const lbl = makeLabel(`${it.name} · ${it.l}×${it.w}×${it.h}`, it.x, bottomY(it) + it.h + 90, it.z, Math.min(900, 90 + it.name.length * 38));
      labelGroup.add(lbl);
    });
  }
  scene.add(labelGroup);
}

// ---------------- cotes du caisson ----------------
function dimLine(a, b, labelText, color = 0xc96f2f) {
  const g = new THREE.Group();
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]),
    new THREE.LineBasicMaterial({ color, depthTest: false })
  );
  line.raycast = () => {};
  g.add(line);
  // petites croix aux extrémités
  [a, b].forEach(p => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(18, 8, 8), new THREE.MeshBasicMaterial({ color, depthTest: false }));
    s.position.set(...p);
    s.raycast = () => {};
    g.add(s);
  });
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  g.add(makeLabel(labelText, mid[0], mid[1] + 70, mid[2], 500, "rgba(253,243,234,.95)"));
  return g;
}

function rebuildVanDims() {
  if (vanDimsGroup) scene.remove(vanDimsGroup);
  vanDimsGroup = new THREE.Group();
  if (showVanDims) {
    const { L, W, H, rearToArch, archL } = V();
    const m = 60; // marge visuelle
    vanDimsGroup.add(dimLine([-W / 2 - m, 0, -L / 2], [-W / 2 - m, 0, L / 2], `L ${L} mm`));
    vanDimsGroup.add(dimLine([-W / 2, 0, -L / 2 - m], [W / 2, 0, -L / 2 - m], `l ${W} mm`));
    vanDimsGroup.add(dimLine([-W / 2 - m, 0, -L / 2 - m], [-W / 2 - m, H, -L / 2 - m], `h ${H} mm`));
    vanDimsGroup.add(dimLine([W / 2 + m, 0, -L / 2], [W / 2 + m, 0, -L / 2 + rearToArch], `${rearToArch} mm`, 0x4d94cc));
    vanDimsGroup.add(dimLine([W / 2 + m, 0, -L / 2 + rearToArch], [W / 2 + m, 0, -L / 2 + rearToArch + archL], `roue ${archL} mm`, 0x4d94cc));
  }
  scene.add(vanDimsGroup);
}

// ---------------- outil règle ----------------
function setMeasureMode(on) {
  measureMode = on;
  measureStart = null;
  clearTempMarker();
  rootEl.querySelector("#btn-measure").classList.toggle("active", on);
  renderer.domElement.style.cursor = on ? "crosshair" : "default";
  rootEl.querySelector("#van-hint").textContent = on
    ? "📏 Règle : clique un 1er point, puis un 2e — la mesure s'aimante sur l'axe dominant. Échap = annuler."
    : "Clic = sélection · glisser = déplacer · flèches = pas de 10mm (⇧=100) · R = pivoter · ⌫ = supprimer";
}

function clearTempMarker() {
  if (tempMarker) { scene.remove(tempMarker); tempMarker = null; }
}

function measureTargets() {
  return [...furnGroup.children, ...vanGroup.children.filter(o => o.isMesh)];
}

function snapPoint(p) {
  return { x: Math.round(p.x / 5) * 5, y: Math.round(p.y / 5) * 5, z: Math.round(p.z / 5) * 5 };
}

function handleMeasureClick() {
  const hits = raycaster.intersectObjects(measureTargets(), false);
  if (!hits.length) return;
  const p = snapPoint(hits[0].point);
  if (!measureStart) {
    measureStart = p;
    tempMarker = new THREE.Mesh(new THREE.SphereGeometry(26, 12, 12), new THREE.MeshBasicMaterial({ color: 0xc96f2f, depthTest: false }));
    tempMarker.position.set(p.x, p.y, p.z);
    tempMarker.raycast = () => {};
    scene.add(tempMarker);
    return;
  }
  // aimante sur l'axe dominant
  const dx = p.x - measureStart.x, dy = p.y - measureStart.y, dz = p.z - measureStart.z;
  const ax = Math.abs(dx), ay = Math.abs(dy), az = Math.abs(dz);
  const b = { ...measureStart };
  let axis = "x";
  if (ax >= ay && ax >= az) { b.x = p.x; axis = "x"; }
  else if (ay >= ax && ay >= az) { b.y = p.y; axis = "y"; }
  else { b.z = p.z; axis = "z"; }
  const len = Math.abs(b.x - measureStart.x) + Math.abs(b.y - measureStart.y) + Math.abs(b.z - measureStart.z);
  if (len < 5) { measureStart = null; clearTempMarker(); return; }
  measures().push({ id: uid(), a: measureStart, b, axis, visible: true });
  measureStart = null;
  clearTempMarker();
  save("van", `Mesure ${fmt(len)} mm ajoutée`);
  rebuildMeasures();
  renderSide();
}

const AXIS_ICON = { x: "↔ largeur", y: "↕ hauteur", z: "⇅ longueur" };

function rebuildMeasures() {
  if (measureGroup) scene.remove(measureGroup);
  measureGroup = new THREE.Group();
  measures().forEach(msr => {
    if (!msr.visible) return;
    const len = dist(msr);
    const g = dimLine([msr.a.x, msr.a.y, msr.a.z], [msr.b.x, msr.b.y, msr.b.z], `${fmt(len)} mm`, 0x2e7d32);
    measureGroup.add(g);
  });
  scene.add(measureGroup);
}

const dist = m => Math.abs(m.b.x - m.a.x) + Math.abs(m.b.y - m.a.y) + Math.abs(m.b.z - m.a.z);

// ---------------- interaction ----------------
function setPointer(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
}

function onPointerDown(ev) {
  if (tc && (tc.dragging || tc.axis)) return; // le gizmo a la main
  setPointer(ev);
  raycaster.setFromCamera(pointer, activeCam);
  if (measureMode) { handleMeasureClick(); return; }
  if (lockOn) return; // verrou : la souris ne fait que tourner la caméra
  const hits = raycaster.intersectObjects(furnGroup.children, false);
  if (hits.length) {
    const mesh = hits[0].object;
    selId = mesh.userData.itemId;
    const it = items().find(i => i.id === selId);
    if (tool === "drag") {
      controls.enabled = false;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(bottomY(it) + 1));
      const hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, hit);
      dragging = { id: selId, plane, offX: it.x - hit.x, offZ: it.z - hit.z };
    }
    updateHighlights();
    attachGizmo();
    renderSide();
  } else {
    selId = null;
    updateHighlights();
    attachGizmo();
    renderSide();
  }
}

function onPointerMove(ev) {
  if (!dragging) return;
  setPointer(ev);
  raycaster.setFromCamera(pointer, activeCam);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragging.plane, hit)) return;
  const it = items().find(i => i.id === dragging.id);
  if (!it) return;
  it.x = Math.round((hit.x + dragging.offX) / 10) * 10;
  it.z = Math.round((hit.z + dragging.offZ) / 10) * 10;
  const snapped = applySnap(it);
  showSnapGuides(it, snapped);
  const m = meshOf(it.id);
  if (m) placeMesh(m, it);
  updateHighlights(false);
  rebuildLabels();
}

function onKey(e) {
  if (!inited) return;
  const active = document.querySelector("#tab-van.active");
  if (!active) return;
  if (e.key === "Escape" && measureMode) { setMeasureMode(false); return; }
  if (lockOn || !selId) return;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
  const it = items().find(i => i.id === selId);
  if (!it) return;
  const step = e.shiftKey ? 100 : 10;
  let handled = true;
  switch (e.key) {
    case "ArrowUp": it.z += step; break;
    case "ArrowDown": it.z -= step; break;
    case "ArrowLeft": it.x -= step; break;
    case "ArrowRight": it.x += step; break;
    case "r": case "R": it.rot = ((it.rot || 0) + 90) % 360; break;
    case "d": case "D": duplicateItem(it); return;
    case "Delete": case "Backspace": deleteItem(it); return;
    default: handled = false;
  }
  if (handled) {
    e.preventDefault();
    const m = meshOf(it.id);
    if (m) placeMesh(m, it);
    updateHighlights();
    rebuildLabels();
    save("van", "Meuble déplacé : " + it.name);
    renderSide();
  }
}

function updateHighlights(full = true) {
  items().forEach(it => {
    const m = meshOf(it.id);
    if (!m) return;
    const warn = checkWarnings(it).length > 0;
    // la couleur choisie est TOUJOURS respectée ; conflit = contour rouge épais
    const base = it.opacity ?? 0.9;
    const op = Math.min(1, it.id === selId ? base + 0.1 : base) * surfOpacity;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach(mat => {
      if (mat.userData.hidden) { mat.visible = false; return; }
      mat.color.set(it.color || "#999");
      mat.emissive = new THREE.Color(it.id === selId ? 0x442200 : 0x000000);
      mat.transparent = true;
      mat.opacity = op;
      mat.depthWrite = op > 0.5; // les objets très transparents ne masquent pas les autres
    });
    const edge = m.children[0];
    if (edge) {
      edge.material.color.set(warn ? 0xc94f3d : 0x33302a);
      edge.material.opacity = warn ? 1 : edgeOpacity;
    }
  });
}

function setView(v, root) {
  viewMode = v;
  root.querySelectorAll("#van-views [data-v]").forEach(b => b.classList.toggle("active", b.dataset.v === v));
  const { L, W, H } = V();
  if (v === "persp") { activeCam = camPersp; controls.enabled = true; if (tc) tc.camera = camPersp; return; }
  controls.enabled = false;
  activeCam = camOrtho;
  if (tc) tc.camera = camOrtho;
  const c = camOrtho;
  if (v === "top") { c.position.set(0, 8000, 0); c.up.set(0, 0, -1); c.lookAt(0, 0, 0); }
  if (v === "left") { c.position.set(-8000, H / 2, 0); c.up.set(0, 1, 0); c.lookAt(0, H / 2, 0); }
  if (v === "right") { c.position.set(8000, H / 2, 0); c.up.set(0, 1, 0); c.lookAt(0, H / 2, 0); }
  if (v === "back") { c.position.set(0, H / 2, -8000); c.up.set(0, 1, 0); c.lookAt(0, H / 2, 0); }
  if (v === "front") { c.position.set(0, H / 2, 8000); c.up.set(0, 1, 0); c.lookAt(0, H / 2, 0); }
  c.updateProjectionMatrix();
}

function exportPNG() {
  renderer.render(scene, activeCam);
  const a = document.createElement("a");
  a.href = renderer.domElement.toDataURL("image/png");
  a.download = `crafter-${layout().label.replace(/\W+/g, "-")}-${viewMode}.png`;
  a.click();
  toast("📷 Image exportée");
}

// ---------------- panneau latéral ----------------
function duplicateItem(it) {
  const copy = { ...it, id: uid(), x: it.x + 100, z: it.z + 100, name: it.name, hiddenFaces: [...(it.hiddenFaces || [])] };
  items().push(copy);
  selId = copy.id;
  rebuildFurniture(); save("van", "Meuble dupliqué : " + it.name); renderSide();
}

function deleteItem(it) {
  if (!confirm("Supprimer « " + it.name + " » ?")) return;
  layout().items = items().filter(i => i.id !== it.id);
  selId = null;
  rebuildFurniture(); save("van", "Meuble supprimé : " + it.name); renderSide();
}

function renderSide() {
  const { L, W, H, rearToArch, archL, archW, archH, shell } = V();
  const it = items().find(i => i.id === selId);
  const allWarns = items().flatMap(i => checkWarnings(i).map(w => `« ${i.name} » ${w}`));

  sideEl.innerHTML = `
    <h3>🚐 Aménagement</h3>
    <div class="toolrow">
      <select id="v-layout" style="flex:1">
        ${state.layouts.map((l, i) => `<option value="${i}" ${i === state.activeLayout ? "selected" : ""}>${esc(l.label)}</option>`).join("")}
      </select>
    </div>
    <div class="toolrow">
      <button class="btn small secondary" id="v-lay-new">+ Plan</button>
      <button class="btn small secondary" id="v-lay-dup">Dupliquer</button>
      <button class="btn small secondary" id="v-lay-ren">Renommer</button>
      <button class="btn small danger" id="v-lay-del">✕</button>
    </div>

    <fieldset><legend>➕ Ajouter un meuble</legend>
      <div class="palette" id="v-pal" style="max-height:180px;overflow-y:auto"></div>
      <details id="v-create" style="margin-top:8px">
        <summary style="cursor:pointer;font-size:12.5px;font-weight:600;color:var(--accent)">🛠 Créer mon propre meuble…</summary>
        <div class="props" style="margin-top:6px">
          <div class="row"><label>Nom</label><input type="text" id="c-name" value="Mon meuble" style="width:150px"></div>
          <div class="row"><label>Dimensions</label>
            L <input type="number" id="c-l" value="600" step="10" style="width:58px">
            l <input type="number" id="c-w" value="400" step="10" style="width:58px">
            h <input type="number" id="c-h" value="500" step="10" style="width:58px"></div>
          <div class="row"><label>Forme</label><select id="c-shape">
            ${Object.entries(SHAPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select></div>
          <div class="row"><label>Rayon arrondi</label><input type="number" id="c-radius" value="60" step="10" min="10" style="width:58px"> mm</div>
          <div class="row"><label>Couleur</label><input type="color" id="c-color" value="#b8875b">
            <select id="c-place">
              <option value="floor">au sol</option><option value="counter">plan de travail</option>
              <option value="upper">en hauteur</option><option value="roof">sur le toit</option>
            </select></div>
          <div class="row">
            <button class="btn small" id="c-add">➕ Ajouter au plan</button>
            <button class="btn small secondary" id="c-addlib" title="Ajoute aussi ce meuble à ta bibliothèque pour le réutiliser">💾 + bibliothèque</button>
          </div>
        </div>
      </details>
    </fieldset>

    ${it ? propsHTML(it) : `<p class="muted" style="font-size:12px">Clique un meuble dans la 3D ou dans la liste.</p>`}

    <fieldset><legend>Meubles du plan (${items().length})</legend>
      <div id="v-items">${items().map(i => `
        <div class="item-row ${i.id === selId ? "sel" : ""}" data-id="${i.id}">
          <span class="dot" style="background:${i.color}"></span>
          <span class="nm">${esc(i.name)}</span>
          <span class="muted" style="font-size:11px">${i.l}×${i.w}×${i.h}</span>
        </div>`).join("") || `<span class="muted" style="font-size:12px">Vide — ajoute des meubles !</span>`}
      </div>
    </fieldset>

    <fieldset><legend>📏 Mesures (${measures().length})</legend>
      <div id="v-measures">${measures().map(m => `
        <div class="item-row" data-mid="${m.id}">
          <span class="dot" style="background:${m.visible ? "#2e7d32" : "#ccc"}"></span>
          <span class="nm"><strong>${fmt(dist(m))} mm</strong> <span class="muted">${AXIS_ICON[m.axis]}</span></span>
          <button class="btn small secondary m-eye" title="Afficher/cacher">${m.visible ? "👁" : "🚫"}</button>
          <button class="btn small danger m-del" title="Supprimer">✕</button>
        </div>`).join("") || `<span class="muted" style="font-size:12px">Active 📏 Règle puis clique 2 points.</span>`}
      </div>
    </fieldset>

    ${allWarns.length ? `<details class="warns"><summary>⚠️ ${allWarns.length} conflit(s) — cliquer pour voir</summary>
      <div class="warn-list">⚠️ ${allWarns.map(esc).join("<br>⚠️ ")}</div></details>`
      : `<p class="ok" style="font-size:12px">✅ Aucun conflit détecté</p>`}

    <fieldset><legend>👁 Affichage</legend><div class="props">
      <div class="row"><label>Surfaces</label><input type="range" id="v-surf" min="0" max="1" step="0.05" value="${surfOpacity}" title="Opacité globale des surfaces — baisse-la pour un rendu fil de fer"></div>
      <div class="row"><label>Bords</label><input type="range" id="v-edge" min="0.1" max="1" step="0.05" value="${edgeOpacity}" title="Intensité des arêtes"></div>
      <p class="muted" style="font-size:11px;margin:0">Surfaces basses + bords à fond = vue « fil de fer ». L'opacité de chaque meuble se règle sur le meuble sélectionné.</p>
    </div></fieldset>

    <fieldset><legend>Caisson & carrosserie</legend><div class="props">
      <div class="row"><label>Caisson (mm)</label>
        L <input type="number" id="v-vanL" value="${L}" step="5" style="width:62px">
        l <input type="number" id="v-vanW" value="${W}" step="5" style="width:58px">
        h <input type="number" id="v-vanH" value="${H}" step="5" style="width:58px"></div>
      <div class="row"><label>Roues↔arrière</label><input type="number" id="v-r2a" value="${rearToArch}" step="5" style="width:70px"> mm</div>
      <div class="row"><label>Passage roue</label>
        L <input type="number" id="v-archL" value="${archL}" style="width:60px">
        l <input type="number" id="v-archW" value="${archW}" style="width:55px">
        h <input type="number" id="v-archH" value="${archH}" style="width:55px"></div>
      <div class="row"><label>Carrosserie 3D</label><input type="checkbox" id="v-shell" ${shell.visible ? "checked" : ""}>
        opacité <input type="range" id="v-shellop" min="0.05" max="0.8" step="0.05" value="${shell.opacity}" style="width:70px"></div>
      <div class="row"><label>Décalage</label>
        x <input type="number" id="v-shx" value="${shell.x}" step="10" style="width:55px">
        y <input type="number" id="v-shy" value="${shell.y}" step="10" style="width:55px">
        z <input type="number" id="v-shz" value="${shell.z}" step="10" style="width:55px"></div>
      <div class="row"><button class="btn small secondary" id="v-shalign" title="Réaligne la carrosserie sur les passages de roues (mesuré sur les essieux du modèle 3D)">🧲 Recaler auto</button></div>
    </div></fieldset>`;

  // — events
  sideEl.querySelector("#v-layout").onchange = e => { state.activeLayout = +e.target.value; selId = null; save("van", "Plan actif changé"); rebuildFurniture(); renderSide(); };
  sideEl.querySelector("#v-lay-new").onclick = () => {
    state.layouts.push({ id: uid(), label: "Nouveau plan", items: [], measures: [] });
    state.activeLayout = state.layouts.length - 1;
    save("van", "Plan créé"); rebuildFurniture(); renderSide();
  };
  sideEl.querySelector("#v-lay-dup").onclick = () => {
    const src = layout();
    state.layouts.push({ id: uid(), label: src.label + " (copie)", items: src.items.map(i => ({ ...i, id: uid() })), measures: (src.measures || []).map(m => ({ ...m, id: uid() })) });
    state.activeLayout = state.layouts.length - 1;
    save("van", "Plan dupliqué"); rebuildFurniture(); renderSide();
  };
  sideEl.querySelector("#v-lay-ren").onclick = () => {
    const n = prompt("Nom du plan :", layout().label);
    if (n) { layout().label = n; save("van", "Plan renommé : " + n); renderSide(); }
  };
  sideEl.querySelector("#v-lay-del").onclick = () => {
    if (state.layouts.length <= 1) { toast("Impossible : dernier plan"); return; }
    if (!confirm("Supprimer le plan « " + layout().label + " » ?")) return;
    state.layouts.splice(state.activeLayout, 1);
    state.activeLayout = 0; selId = null;
    save("van", "Plan supprimé"); rebuildFurniture(); renderSide();
  };

  const pal = sideEl.querySelector("#v-pal");
  const addFromLib = f => {
    const item = { id: uid(), name: f.name, cat: f.cat || "perso", l: f.l, w: f.w, h: f.h, x: 0, z: 0, y: null, rot: 0, place: f.place || "floor", color: f.color, shape: f.shape || "box", radius: f.radius || 0 };
    if (item.shape === "cyl") item.l = item.w; // cylindre : diamètre
    items().push(item);
    selId = item.id;
    rebuildFurniture(); save("van", "Meuble ajouté : " + f.name); renderSide();
  };
  FURN_LIB.forEach(f => {
    const b = document.createElement("button");
    b.textContent = f.name;
    b.onclick = () => addFromLib(f);
    pal.appendChild(b);
  });
  state.customLib.forEach((f, fi) => {
    const b = document.createElement("button");
    b.innerHTML = `🛠 ${esc(f.name)} <span style="float:right;color:#c94f3d" title="Retirer de ma bibliothèque">✕</span>`;
    b.onclick = ev => {
      if (ev.target.tagName === "SPAN") {
        if (!confirm("Retirer « " + f.name + " » de ta bibliothèque ?")) return;
        state.customLib.splice(fi, 1);
        save("van", "Meuble retiré de la bibliothèque");
        renderSide();
        return;
      }
      addFromLib(f);
    };
    pal.appendChild(b);
  });

  // création de meuble personnalisé
  const readCreate = () => ({
    name: sideEl.querySelector("#c-name").value || "Mon meuble",
    l: +sideEl.querySelector("#c-l").value || 600,
    w: +sideEl.querySelector("#c-w").value || 400,
    h: +sideEl.querySelector("#c-h").value || 500,
    shape: sideEl.querySelector("#c-shape").value,
    radius: +sideEl.querySelector("#c-radius").value || 60,
    color: sideEl.querySelector("#c-color").value,
    place: sideEl.querySelector("#c-place").value,
  });
  sideEl.querySelector("#c-add").onclick = () => addFromLib(readCreate());
  sideEl.querySelector("#c-addlib").onclick = () => {
    const f = readCreate();
    state.customLib.push(f);
    addFromLib(f);
    toast("💾 « " + f.name + " » ajouté à ta bibliothèque");
  };

  sideEl.querySelectorAll(".item-row[data-id]").forEach(r => r.onclick = () => {
    selId = r.dataset.id; updateHighlights(); renderSide();
  });

  sideEl.querySelectorAll(".item-row[data-mid]").forEach(r => {
    const m = measures().find(x => x.id === r.dataset.mid);
    r.querySelector(".m-eye").onclick = e => {
      e.stopPropagation();
      m.visible = !m.visible;
      save("van", "Mesure " + (m.visible ? "affichée" : "masquée"));
      rebuildMeasures(); renderSide();
    };
    r.querySelector(".m-del").onclick = e => {
      e.stopPropagation();
      layout().measures = measures().filter(x => x.id !== m.id);
      save("van", "Mesure supprimée");
      rebuildMeasures(); renderSide();
    };
  });

  if (it) bindProps(it);

  const updVan = (sel, key) => {
    const e = sideEl.querySelector(sel);
    if (e) e.onchange = ev => {
      V()[key] = +ev.target.value;
      save("van", "Dimensions caisson modifiées");
      buildVan(); rebuildFurniture(); renderSide();
    };
  };
  updVan("#v-vanL", "L"); updVan("#v-vanW", "W"); updVan("#v-vanH", "H");
  updVan("#v-r2a", "rearToArch");
  updVan("#v-archL", "archL"); updVan("#v-archW", "archW"); updVan("#v-archH", "archH");

  sideEl.querySelector("#v-surf").oninput = e => {
    surfOpacity = +e.target.value;
    localStorage.setItem("ac-surf", surfOpacity);
    updateHighlights();
  };
  sideEl.querySelector("#v-edge").oninput = e => {
    edgeOpacity = +e.target.value;
    localStorage.setItem("ac-edge", edgeOpacity);
    updateHighlights();
  };
  sideEl.querySelector("#v-shell").onchange = e => { V().shell.visible = e.target.checked; save("van", "Carrosserie " + (e.target.checked ? "affichée" : "masquée")); loadShell(); };
  sideEl.querySelector("#v-shellop").oninput = e => { V().shell.opacity = +e.target.value; updateShell(); save("van", "Opacité carrosserie"); };
  sideEl.querySelector("#v-shx").onchange = e => { V().shell.x = +e.target.value; updateShell(); save("van", "Décalage carrosserie"); };
  sideEl.querySelector("#v-shy").onchange = e => { V().shell.y = +e.target.value; updateShell(); save("van", "Décalage carrosserie"); };
  sideEl.querySelector("#v-shz").onchange = e => { V().shell.z = +e.target.value; updateShell(); save("van", "Décalage carrosserie"); };
  sideEl.querySelector("#v-shalign").onclick = () => {
    Object.assign(V().shell, { x: SHELL_DEFAULT.x, y: SHELL_DEFAULT.y, z: SHELL_DEFAULT.z, scale: SHELL_DEFAULT.scale });
    save("van", "Carrosserie recalée");
    updateShell(); renderSide();
    toast("🧲 Carrosserie recalée sur les essieux");
  };
}

function propsHTML(it) {
  const { L, W } = V();
  const bb = itemAABB(it);
  const warns = checkWarnings(it);
  return `<fieldset><legend>✏️ ${esc(it.name)}</legend><div class="props">
    <div class="row"><label>Nom</label><input type="text" id="i-name" value="${esc(it.name)}" style="width:160px"></div>
    <div class="row"><label>Dimensions</label>
      L <input type="number" id="i-l" value="${it.l}" step="10" style="width:60px">
      l <input type="number" id="i-w" value="${it.w}" step="10" style="width:60px">
      h <input type="number" id="i-h" value="${it.h}" step="10" style="width:60px"></div>
    <div class="row"><label>Position</label>
      x <input type="number" id="i-x" value="${it.x}" step="10" style="width:60px">
      z <input type="number" id="i-z" value="${it.z}" step="10" style="width:60px"></div>
    <div class="row"><label>Hauteur du bas</label><input type="number" id="i-y" value="${bottomY(it)}" step="10" style="width:70px"> mm</div>
    <div class="row"><label>Rotation</label><button class="btn small secondary" id="i-rot">↻ 90°</button>
      x <input type="number" id="i-rotx" value="${it.rotX || 0}" step="15" style="width:52px">
      y <input type="number" id="i-roty" value="${it.rot || 0}" step="15" style="width:52px">
      z <input type="number" id="i-rotz" value="${it.rotZ || 0}" step="15" style="width:52px"></div>
    <div class="row"><label>Couleur</label><input type="color" id="i-color" value="${it.color || "#999999"}">
      opacité <input type="range" id="i-op" min="0.05" max="1" step="0.05" value="${it.opacity ?? 0.9}" style="width:80px" title="Opacité de ce meuble"></div>
    <div class="row"><label>Faces visibles</label><span style="font-size:11.5px;display:flex;flex-wrap:wrap;gap:6px">
      ${FACE_DEFS[it.shape || "box"].map(d => `<label style="white-space:nowrap;cursor:pointer">
        <input type="checkbox" class="i-face" data-face="${d.k}" ${(it.hiddenFaces || []).includes(d.k) ? "" : "checked"}> ${d.label}</label>`).join("")}
    </span></div>
    <div class="row"><label>Forme</label><select id="i-shape">
      ${Object.entries(SHAPES).map(([k, v]) => `<option value="${k}" ${(it.shape || "box") === k ? "selected" : ""}>${v}</option>`).join("")}
    </select>
    ${(it.shape || "box") === "rounded" ? `rayon <input type="number" id="i-radius" value="${it.radius || 60}" step="10" min="10" style="width:55px">` : ""}</div>
    <div class="row"><label>Repères atelier</label><span class="muted" style="font-size:11px">
      bord arrière à ${fmt(bb.minZ + L / 2)} mm des portes<br>
      bord gauche à ${fmt(bb.minX + W / 2)} mm de la paroi G</span></div>
    ${warns.length ? `<div class="warn-list">⚠️ ${warns.map(esc).join("<br>⚠️ ")}</div>` : ""}
    <div class="row">
      <button class="btn small" id="i-dup">⧉ Dupliquer</button>
      <button class="btn small secondary" id="i-savelib" title="Enregistrer ce meuble dans ma bibliothèque">💾</button>
      <button class="btn small danger" id="i-del">🗑 Supprimer</button></div>
  </div></fieldset>`;
}

function bindProps(it) {
  const U = (sel, key, isNum = true) => {
    const e = sideEl.querySelector(sel);
    if (!e) return;
    e.onchange = ev => {
      it[key] = isNum ? +ev.target.value : ev.target.value;
      rebuildFurniture(); save("van", "Meuble modifié : " + it.name); renderSide();
    };
  };
  U("#i-name", "name", false);
  U("#i-l", "l"); U("#i-w", "w"); U("#i-h", "h");
  U("#i-x", "x"); U("#i-z", "z"); U("#i-y", "y");
  U("#i-color", "color", false);
  U("#i-radius", "radius");
  U("#i-rotx", "rotX"); U("#i-roty", "rot"); U("#i-rotz", "rotZ");
  const sh = sideEl.querySelector("#i-shape");
  if (sh) sh.onchange = () => {
    it.shape = sh.value;
    it.hiddenFaces = []; // les faces dépendent de la forme
    if (it.shape === "cyl") it.l = it.w;
    rebuildFurniture(); save("van", "Forme : " + it.name); renderSide();
  };
  sideEl.querySelectorAll(".i-face").forEach(cb => cb.onchange = () => {
    const f = cb.dataset.face;
    it.hiddenFaces = (it.hiddenFaces || []).filter(k => k !== f);
    if (!cb.checked) it.hiddenFaces.push(f);
    rebuildFurniture();
    save("van", "Faces modifiées : " + it.name);
  });
  const op = sideEl.querySelector("#i-op");
  op.oninput = () => { it.opacity = +op.value; updateHighlights(); };
  op.onchange = () => { it.opacity = +op.value; save("van", "Opacité : " + it.name); updateHighlights(); };
  sideEl.querySelector("#i-rot").onclick = () => { it.rot = ((it.rot || 0) + 90) % 360; rebuildFurniture(); save("van", "Meuble pivoté : " + it.name); renderSide(); };
  sideEl.querySelector("#i-dup").onclick = () => duplicateItem(it);
  sideEl.querySelector("#i-savelib").onclick = () => {
    state.customLib.push({ name: it.name, l: it.l, w: it.w, h: it.h, color: it.color, shape: it.shape || "box", radius: it.radius || 0, place: it.place || "floor" });
    save("van", "Meuble enregistré en bibliothèque : " + it.name);
    renderSide();
    toast("💾 « " + it.name + " » ajouté à ta bibliothèque");
  };
  sideEl.querySelector("#i-del").onclick = () => deleteItem(it);
}
