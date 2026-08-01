// Données par défaut — Atelier Crafter
// Toutes les dimensions en millimètres, prix en euros.

export const VAN = {
  L: 3365,          // longueur caisson
  W: 1780,          // largeur caisson
  H: 1650,          // hauteur caisson
  rearToArch: 485,  // espace entre l'arrière et les passages de roues
  archL: 1150,      // longueur passage de roue (ajustable)
  archW: 260,       // largeur passage de roue
  archH: 230,       // hauteur passage de roue
  totalL: 5926, totalH: 2469, wheelbase: 3665,
};

export const PHASES = [
  "0 · Préparation",
  "1 · Isolation",
  "2 · Électricité",
  "3 · Habillage",
  "4 · Meubles",
  "5 · Eau & gaz",
  "6 · Finitions",
  "7 · Mécanique & VASP",
];

let _id = 1;
const id = () => "d" + (_id++);

const T = (phase, name, dur, notes = "") =>
  ({ id: id(), phase, name, dur, date: "", status: "todo", notes });

export const DEFAULT_TASKS = [
  T(0, "Vider et nettoyer le caisson à fond (dégraissant)", 4),
  T(0, "Inspecter la tôle : rouille, trous, points à traiter", 2),
  T(0, "Traiter les points de rouille (brosse, Rustol/Frameto)", 4),
  T(0, "Boucher les trous éventuels (mastic / rivets + joint)", 2),
  T(0, "Relevés précis + gabarits carton des passages de roues", 3, "Servira pour la découpe des meubles"),
  T(0, "Graisser pédale d'embrayage qui couine", 1),
  T(0, "Sangle DIY maintien porte coulissante", 1),
  T(1, "Découper et poser isolant sol (XPS 20mm + pare-vapeur)", 5),
  T(1, "Poser plancher contreplaqué 15mm vissé", 5),
  T(1, "Isoler parois (laine de bois / Armaflex 25mm)", 8, "Armaflex collé sur tôle, combler les corps creux"),
  T(1, "Isoler plafond (Armaflex 25mm)", 4),
  T(1, "Isoler portes arrière et coulissante", 3),
  T(2, "Percer + poser passe-toit câbles panneaux solaires", 2, "Étanchéité Sikaflex 522 !"),
  T(2, "Fixer 2 panneaux solaires sur le toit (rails + colle)", 4),
  T(2, "Tirer les câbles (gaines) avant l'habillage des murs", 6, "Prévoir du mou et repérer chaque câble"),
  T(2, "Installer batterie auxiliaire + coupe-circuit", 2),
  T(2, "Câbler régulateur MPPT → batterie (fusibles)", 2),
  T(2, "Installer chargeur booster B2B sur alternateur", 3),
  T(2, "Poser boîte à fusibles 12V + bornier de masse", 2),
  T(2, "Câbler convertisseur 230V + prise", 2),
  T(2, "Poser interrupteurs, spots LED, prises USB", 4),
  T(2, "Tester TOUT le circuit avant de fermer les murs", 2, "Multimètre : tensions, polarités, chutes"),
  T(3, "Découper + poser lanterneau MaxxFan dans le toit", 4, "La découpe qui fait peur — mesurer 3 fois"),
  T(3, "Poser fenêtre(s) latérale(s) si prévu", 4),
  T(3, "Habiller parois (contreplaqué 5mm ou lambris)", 8),
  T(3, "Habiller plafond", 6),
  T(3, "Poser revêtement de sol (lino / parquet PVC)", 3),
  T(4, "Construire structure du lit (tasseaux + CP 15mm)", 8, "48,5 cm utiles entre roues et portes arrière"),
  T(4, "Sommier à lattes + découpe matelas", 3),
  T(4, "Construire caisson cuisine (évier + plaque + frigo)", 10),
  T(4, "Construire colonnes / rangements hauts", 8),
  T(4, "Fixer tous les meubles à la structure (VASP : arrimage)", 4),
  T(4, "Poser table + pied amovible", 2),
  T(5, "Installer réservoir eau propre + jauge", 3),
  T(5, "Poser pompe à eau + accumulateur + filtre", 3),
  T(5, "Raccorder évier + évacuation eaux grises", 3),
  T(5, "Tester circuit d'eau (fuites) 24h", 1),
  T(5, "Installer gaz : bouteille, détendeur, vanne, test savon", 3, "Norme : caisson gaz ventilé si VASP"),
  T(6, "Rideaux / occultants cabine et fenêtres", 3),
  T(6, "Finitions bois : ponçage, huile/vernis", 4),
  T(6, "Pesée du van chargé (CU restante)", 1),
  T(6, "Kit sécurité : extincteur, détecteur CO, trousse", 1),
  T(7, "Remplacer embrayage (~1000 €, garage)", 0, "D'origine à 208 500 km"),
  T(7, "Pare-brise fissuré : activer bris de glace", 1, "franchise à vérifier auprès de l'assureur"),
  T(7, "Diagnostiquer verrouillage automatique bizarre", 2, "Possible bug module de confort"),
  T(7, "Monter dossier VASP (plans, attestation gaz/élec)", 6),
  T(7, "Passage DREAL / homologation VASP", 4),
  T(7, "Changer d'assurance → MAIF (VASP)", 1),
];

export const BUDGET_CATS = ["Isolation", "Bois & habillage", "Électricité", "Eau & gaz", "Cuisine", "Couchage", "Ouvertures", "Quincaillerie", "Mécanique", "Divers"];

const B = (cat, name, store, price, qty = 1, notes = "") =>
  ({ id: id(), cat, name, store, price, qty, status: "todo", link: "", notes });

export const DEFAULT_BUDGET = [
  B("Isolation", "Armaflex 25mm (rouleau 6m²)", "Alvolta / Amazon", 95, 2),
  B("Isolation", "XPS 20mm sol (paquet)", "Leroy Merlin", 25, 2),
  B("Isolation", "Pare-vapeur + scotch alu", "Leroy Merlin", 30, 1),
  B("Bois & habillage", "Contreplaqué peuplier 15mm (plancher + meubles)", "Scierie locale", 55, 8, "Panneaux 2500×1220"),
  B("Bois & habillage", "Contreplaqué 5mm (habillage murs/plafond)", "Scierie locale", 25, 6),
  B("Bois & habillage", "Tasseaux 27×27 (lot)", "Leroy Merlin", 40, 1),
  B("Bois & habillage", "Lino / sol PVC (4m²)", "Leroy Merlin", 60, 1),
  B("Bois & habillage", "Huile dure / vernis bois", "Leroy Merlin", 30, 1),
  B("Électricité", "Batterie LiFePO4 100Ah 12V", "Amazon (LiTime)", 270, 1),
  B("Électricité", "Panneau solaire rigide 200W", "AliExpress / Amazon", 110, 2),
  B("Électricité", "Régulateur MPPT Victron 100/30", "Amazon", 130, 1),
  B("Électricité", "Chargeur B2B 12V 30A (Renogy/Victron)", "Amazon", 180, 1),
  B("Électricité", "Convertisseur pur sinus 1000W", "Amazon", 130, 1),
  B("Électricité", "Boîte 12 fusibles + bornier masse", "Amazon", 25, 1),
  B("Électricité", "Câble 16mm² rouge/noir (au mètre)", "123elec", 5, 10),
  B("Électricité", "Câble 2.5/4/6mm² + gaines", "123elec", 60, 1),
  B("Électricité", "Fusibles, porte-fusibles, cosses, manchons", "Amazon", 45, 1),
  B("Électricité", "Coupe-circuit + shunt/moniteur batterie", "Amazon", 60, 1),
  B("Électricité", "Passe-toit étanche + Sikaflex 522", "Amazon", 35, 1),
  B("Électricité", "Spots LED 12V ×6 + variateur", "Amazon", 45, 1),
  B("Électricité", "Prises USB-C / allume-cigare ×3", "Amazon", 30, 1),
  B("Électricité", "Interrupteurs 12V", "Amazon", 15, 1),
  B("Eau & gaz", "Réservoir eau propre 100L", "H2R Equipements", 90, 1),
  B("Eau & gaz", "Réservoir eaux grises 40L", "H2R Equipements", 45, 1),
  B("Eau & gaz", "Pompe Shurflo 12V 10L/min", "H2R Equipements", 85, 1),
  B("Eau & gaz", "Accumulateur / vase expansion", "H2R Equipements", 40, 1),
  B("Eau & gaz", "Tuyau alimentaire + raccords John Guest", "H2R Equipements", 50, 1),
  B("Eau & gaz", "Évier inox + mitigeur", "Amazon", 70, 1),
  B("Eau & gaz", "Plaque gaz 2 feux + bouteille 2.75kg + détendeur + lyre", "Leroy Merlin", 110, 1),
  B("Eau & gaz", "Vanne + caisson gaz ventilé (VASP)", "DIY", 30, 1),
  B("Cuisine", "Frigo compression 12V (Alpicool CF35 ou tiroir)", "Amazon", 250, 1),
  B("Cuisine", "Charnières, coulisses tiroirs, push-locks", "Amazon", 60, 1),
  B("Couchage", "Matelas mousse HR 140×190 (à découper)", "Emma / IKEA", 200, 1),
  B("Couchage", "Lattes de sommier", "IKEA", 30, 1),
  B("Ouvertures", "Lanterneau MaxxFan Deluxe", "H2R Equipements", 330, 1),
  B("Ouvertures", "Fenêtre latérale coulissante (option)", "H2R Equipements", 180, 1),
  B("Quincaillerie", "Visserie inox, équerres, colle, Sikaflex", "Leroy Merlin", 80, 1),
  B("Quincaillerie", "Rivets, écrous à sertir + pince", "Amazon", 35, 1),
  B("Divers", "Rideaux occultants + rail cabine", "Amazon", 60, 1),
  B("Divers", "Extincteur + détecteur CO", "Amazon", 40, 1),
  B("Divers", "Dossier VASP (DREAL)", "DREAL", 90, 1),
  B("Mécanique", "Embrayage (pièces + main d'œuvre)", "Garage", 1000, 1, "Hors budget aménagement — à prévoir"),
];

// ---------------- Électricité ----------------
// Bibliothèque : chaque type a des specs par défaut modifiables sur le nœud posé.
// role: source (produit), storage (stocke), conv (transforme), dist (distribue), load (consomme)
export const ELEC_LIB = [
  { type: "panneau",  icon: "☀️", name: "Panneau solaire", role: "source", U: 18, P: 200, note: "Vmp ~18V" },
  { type: "mppt",     icon: "🔆", name: "Régulateur MPPT", role: "conv", U: 12, A: 30, eff: 0.97 },
  { type: "b2b",      icon: "🔄", name: "Chargeur B2B (alternateur)", role: "source", U: 12, A: 30 },
  { type: "alternateur", icon: "🚐", name: "Alternateur / batterie moteur", role: "source", U: 12, A: 140 },
  { type: "secteur",  icon: "🔌", name: "Chargeur secteur 230V", role: "source", U: 12, A: 15 },
  { type: "batterie", icon: "🔋", name: "Batterie auxiliaire", role: "storage", U: 12, Ah: 100, chem: "LiFePO4" },
  { type: "coupe",    icon: "⛔", name: "Coupe-circuit", role: "dist", U: 12 },
  { type: "fusebox",  icon: "🧯", name: "Boîte à fusibles 12V", role: "dist", U: 12 },
  { type: "convertisseur", icon: "⚡", name: "Convertisseur 230V", role: "conv", U: 12, P: 1000, eff: 0.85 },
  { type: "frigo",    icon: "🧊", name: "Frigo 12V", role: "load", U: 12, P: 45, h: 8, note: "compresseur ~1/3 du temps" },
  { type: "pompe",    icon: "💧", name: "Pompe à eau", role: "load", U: 12, P: 60, h: 0.3 },
  { type: "led",      icon: "💡", name: "Éclairage LED", role: "load", U: 12, P: 20, h: 4 },
  { type: "maxxfan",  icon: "🌀", name: "Lanterneau / ventilation", role: "load", U: 12, P: 30, h: 4 },
  { type: "usb",      icon: "📱", name: "Prises USB / 12V", role: "load", U: 12, P: 30, h: 3 },
  { type: "chauffage",icon: "🔥", name: "Chauffage diesel (option)", role: "load", U: 12, P: 25, h: 6 },
  { type: "load230",  icon: "🖥", name: "Appareil 230V (via conv.)", role: "load", U: 230, P: 300, h: 1 },
  { type: "autre",    icon: "🔧", name: "Autre composant", role: "load", U: 12, P: 0, h: 0, note: "rôle modifiable" },
];

export const SECTIONS = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70];
export const FUSES = [2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 200];

// Schéma élec par défaut (positions en px du canvas)
const EN = (type, x, y, over = {}) => ({ id: id(), type, x, y, ...over });
const p1 = EN("panneau", 80, 60), p2 = EN("panneau", 80, 180);
const mppt = EN("mppt", 330, 110);
const bat = EN("batterie", 590, 170);
const coupe = EN("coupe", 590, 60);
const alt = EN("alternateur", 80, 320);
const b2b = EN("b2b", 330, 320);
const fb = EN("fusebox", 860, 110);
const conv = EN("convertisseur", 860, 300);
const frigo = EN("frigo", 1120, 30), pompe = EN("pompe", 1120, 110), led = EN("led", 1120, 190),
      fan = EN("maxxfan", 1120, 270), usb = EN("usb", 1120, 350);
const l230 = EN("load230", 1120, 440);
const EW = (a, b, len) => ({ id: id(), a: a.id, b: b.id, len });
export const DEFAULT_ELEC = {
  params: { U: 12, dropPct: 3, sunH: 4 },
  nodes: [p1, p2, mppt, bat, coupe, alt, b2b, fb, conv, frigo, pompe, led, fan, usb, l230],
  wires: [
    EW(p1, mppt, 6), EW(p2, mppt, 6), EW(mppt, bat, 2),
    EW(alt, b2b, 5), EW(b2b, bat, 2),
    EW(bat, fb, 2), EW(bat, conv, 1.5),
    EW(fb, frigo, 4), EW(fb, pompe, 4), EW(fb, led, 5), EW(fb, fan, 4), EW(fb, usb, 3),
    EW(conv, l230, 2),
  ],
};

// ---------------- Eau ----------------
export const EAU_LIB = [
  { type: "reservoir", icon: "🛢", name: "Réservoir eau propre", vol: 100 },
  { type: "gris",      icon: "🪣", name: "Réservoir eaux grises", vol: 40 },
  { type: "pompe",     icon: "⚙️", name: "Pompe 12V", flow: 10, note: "L/min" },
  { type: "accu",      icon: "🎈", name: "Accumulateur", vol: 1 },
  { type: "filtre",    icon: "🧽", name: "Filtre", },
  { type: "chauffe",   icon: "♨️", name: "Chauffe-eau (option)", vol: 6 },
  { type: "robinet",   icon: "🚰", name: "Mitigeur évier" },
  { type: "evier",     icon: "🥣", name: "Évier" },
  { type: "douche",    icon: "🚿", name: "Douchette (option)" },
  { type: "vanne",     icon: "🔀", name: "Vanne / T de dérivation" },
  { type: "remplissage", icon: "⛽", name: "Trappe de remplissage" },
  { type: "autre",     icon: "🔧", name: "Autre composant" },
];

const WN = (type, x, y, over = {}) => ({ id: id(), type, x, y, ...over });
const rempl = WN("remplissage", 80, 40);
const resv = WN("reservoir", 80, 160);
const pompeE = WN("pompe", 330, 160);
const accu = WN("accu", 560, 160);
const teeE = WN("vanne", 790, 160);
const robinet = WN("robinet", 1020, 90);
const evier = WN("evier", 1020, 220);
const gris = WN("gris", 1020, 360);
const WP = (a, b, dia) => ({ id: id(), a: a.id, b: b.id, dia });
export const DEFAULT_EAU = {
  params: { consoJour: 15 },
  nodes: [rempl, resv, pompeE, accu, teeE, robinet, evier, gris],
  pipes: [
    WP(rempl, resv, 38), WP(resv, pompeE, 12), WP(pompeE, accu, 12),
    WP(accu, teeE, 12), WP(teeE, robinet, 12), WP(robinet, evier, 12), WP(evier, gris, 25),
  ],
};

// ---------------- Van 3D : bibliothèque de meubles ----------------
export const FURN_LIB = [
  { name: "Lit fixe",             cat: "lit",       l: 1900, w: 1400, h: 600,  color: "#8d6e63" },
  { name: "Banquette / coffre",   cat: "lit",       l: 1200, w: 700,  h: 420,  color: "#8d6e63" },
  { name: "Meuble cuisine",       cat: "cuisine",   l: 1000, w: 600,  h: 900,  color: "#66994d" },
  { name: "Frigo / glacière",     cat: "cuisine",   l: 590,  w: 400,  h: 450,  color: "#66994d" },
  { name: "Colonne rangement",    cat: "rangement", l: 450,  w: 600,  h: 1200, color: "#b8875b" },
  { name: "Meuble haut",          cat: "rangement", l: 800,  w: 350,  h: 350,  color: "#b8875b" },
  { name: "Coffre / tiroir",      cat: "rangement", l: 800,  w: 500,  h: 400,  color: "#b8875b" },
  { name: "Réservoir eau",        cat: "eau",       l: 800,  w: 400,  h: 350,  color: "#4d94cc" },
  { name: "Douche / cabine",      cat: "eau",       l: 800,  w: 800,  h: 1650, color: "#4d94cc" },
  { name: "WC portable",          cat: "eau",       l: 420,  w: 370,  h: 320,  color: "#4d94cc" },
  { name: "Batterie + élec",      cat: "elec",      l: 500,  w: 350,  h: 400,  color: "#e6b34d" },
  { name: "Panneau solaire",      cat: "elec",      l: 1480, w: 670,  h: 40,   color: "#e6b34d", place: "roof" },
  { name: "Lanterneau",           cat: "elec",      l: 400,  w: 400,  h: 100,  color: "#e6b34d", place: "roof" },
  { name: "Table",                cat: "meuble",    l: 900,  w: 600,  h: 750,  color: "#999999" },
  { name: "Caisson libre",        cat: "meuble",    l: 500,  w: 500,  h: 500,  color: "#999999" },
];

// Tes 2 idées vanspace3D converties en vraies dimensions (approximatif — à ajuster !)
export const VS3D_LAYOUTS = [
 { label: "Idée V1 (vanspace3D)", items: [
  {name:"Réservoir eau 26L",cat:"eau",l:400,w:300,h:450,x:-610,z:-1254,place:"floor",color:"#4d94cc"},
  {name:"Batterie / élec",cat:"elec",l:500,w:350,h:400,x:610,z:-1378,place:"floor",color:"#e6b34d"},
  {name:"Colonne tiroirs",cat:"rangement",l:450,w:600,h:900,x:0,z:-1430,place:"floor",color:"#b8875b"},
  {name:"Coffre banquette G",cat:"rangement",l:1200,w:700,h:400,x:-540,z:-909,place:"floor",color:"#b8875b"},
  {name:"Coffre banquette D",cat:"rangement",l:1200,w:700,h:400,x:540,z:-909,place:"floor",color:"#b8875b"},
  {name:"Matelas banquette G",cat:"lit",l:1200,w:700,h:150,x:-540,z:-909,y:400,place:"floor",color:"#8d6e63"},
  {name:"Matelas banquette D",cat:"lit",l:1200,w:700,h:150,x:540,z:-909,y:400,place:"floor",color:"#8d6e63"},
  {name:"Dînette centrale (mode lit)",cat:"lit",l:900,w:380,h:150,x:0,z:-909,y:400,place:"floor",color:"#8d6e63"},
  {name:"Meuble cuisine 2 portes",cat:"cuisine",l:1000,w:600,h:900,x:590,z:520,place:"floor",color:"#66994d"},
  {name:"Plaque gaz 2 feux",cat:"cuisine",l:500,w:350,h:100,x:586,z:757,place:"counter",color:"#66994d"},
  {name:"Frigo Norcold N410",cat:"cuisine",l:530,w:530,h:830,x:590,z:164,place:"floor",color:"#66994d"},
  {name:"Meuble tiroirs cuisine",cat:"cuisine",l:1000,w:600,h:900,x:-574,z:370,place:"floor",color:"#66994d"},
  {name:"Évier Ruvati",cat:"eau",l:500,w:450,h:250,x:-516,z:555,place:"counter",color:"#4d94cc"},
  {name:"Douche cabine",cat:"eau",l:800,w:800,h:1650,x:-490,z:1322,place:"floor",color:"#4d94cc"},
  {name:"WC portable",cat:"eau",l:420,w:370,h:320,x:-600,z:912,place:"floor",color:"#4d94cc"},
  {name:"Meuble haut",cat:"rangement",l:800,w:350,h:350,x:715,z:-576,place:"upper",color:"#b8875b"},
  {name:"Meuble haut",cat:"rangement",l:800,w:350,h:350,x:715,z:-1344,place:"upper",color:"#b8875b"},
  {name:"Panneau solaire 160W",cat:"elec",l:1480,w:670,h:35,x:55,z:-997,place:"roof",color:"#e6b34d"},
  {name:"Panneau solaire 160W",cat:"elec",l:1480,w:670,h:35,x:55,z:-207,place:"roof",color:"#e6b34d"},
  {name:"Lanterneau MaxxFan",cat:"elec",l:400,w:400,h:100,x:30,z:1000,place:"roof",color:"#e6b34d"},
 ]},
 { label: "Idée V2 (vanspace3D)", items: [
  {name:"Réservoir eau 26L",cat:"eau",l:400,w:300,h:450,x:-610,z:-1254,place:"floor",color:"#4d94cc"},
  {name:"Batterie / élec",cat:"elec",l:500,w:350,h:400,x:610,z:-1378,place:"floor",color:"#e6b34d"},
  {name:"Frigo Norcold N410",cat:"cuisine",l:530,w:530,h:830,x:590,z:1405,place:"floor",color:"#66994d"},
  {name:"Douche cabine",cat:"eau",l:800,w:800,h:1650,x:-490,z:194,place:"floor",color:"#4d94cc"},
  {name:"WC portable",cat:"eau",l:420,w:370,h:320,x:-583,z:524,place:"floor",color:"#4d94cc"},
  {name:"Meuble haut",cat:"rangement",l:800,w:350,h:350,x:715,z:-576,place:"upper",color:"#b8875b"},
  {name:"Meuble haut",cat:"rangement",l:800,w:350,h:350,x:715,z:-1344,place:"upper",color:"#b8875b"},
  {name:"Panneau solaire 160W",cat:"elec",l:1480,w:670,h:35,x:55,z:-997,place:"roof",color:"#e6b34d"},
  {name:"Panneau solaire 160W",cat:"elec",l:1480,w:670,h:35,x:55,z:-207,place:"roof",color:"#e6b34d"},
  {name:"Lanterneau MaxxFan",cat:"elec",l:400,w:400,h:100,x:30,z:1000,place:"roof",color:"#e6b34d"},
  {name:"Colonne tiroirs",cat:"rangement",l:450,w:600,h:900,x:460,z:-484,place:"floor",color:"#b8875b"},
  {name:"Colonne tiroirs",cat:"rangement",l:450,w:600,h:900,x:-490,z:-1001,place:"floor",color:"#b8875b"},
  {name:"Table longue",cat:"meuble",l:1100,w:600,h:730,x:-14,z:-749,place:"floor",color:"#999999"},
  {name:"Banc latéral",cat:"lit",l:1200,w:450,h:400,x:-14,z:-1330,place:"floor",color:"#8d6e63"},
  {name:"Meuble d'angle",cat:"cuisine",l:600,w:600,h:900,x:-590,z:1404,place:"floor",color:"#66994d"},
  {name:"Meuble cuisine 2 portes",cat:"cuisine",l:1000,w:600,h:900,x:287,z:1419,place:"floor",color:"#66994d"},
  {name:"Meuble 1 porte",cat:"cuisine",l:550,w:600,h:900,x:-590,z:844,place:"floor",color:"#66994d"},
  {name:"Glacière Alpicool CF35",cat:"cuisine",l:590,w:320,h:380,x:130,z:969,place:"floor",color:"#66994d"},
  {name:"Évier Ruvati",cat:"eau",l:500,w:450,h:250,x:-576,z:849,place:"counter",color:"#4d94cc"},
  {name:"Bouteille gaz 2kg",cat:"cuisine",l:250,w:250,h:350,x:659,z:995,place:"floor",color:"#66994d"},
  {name:"Meuble haut",cat:"rangement",l:800,w:350,h:350,x:-640,z:1228,place:"upper",color:"#b8875b"},
  {name:"Meuble haut",cat:"rangement",l:800,w:350,h:350,x:92,z:1424,place:"upper",color:"#b8875b"},
  {name:"Plaque gaz 2 feux",cat:"cuisine",l:500,w:350,h:100,x:566,z:1404,place:"counter",color:"#66994d"},
 ]},
];
