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
  "5 · Eau & chauffage",
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
  T(2, "Installer batterie 300Ah + coupe-circuit 300 A + SmartShunt", 3, "Tous les négatifs (charge comprise) côté charge du shunt"),
  T(2, "Câbler régulateur MPPT → batterie (10 mm², fusible 50 A)", 2),
  T(2, "Installer chargeur booster B2B sur alternateur", 3, "25 mm² sur les 6 m moteur→coffre, fusible 50 A à chaque bout"),
  T(2, "Poser boîte à fusibles 12V + borniers + / −", 2),
  T(2, "Câbler onduleur (95 mm² + fusible ANL 250 A au ras du +)", 3, "Relier le neutre de sortie au châssis, sinon le différentiel ne sert à rien"),
  T(2, "Poser différentiel 30 mA + prise 230V intérieure", 2),
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
  T(5, "Installer chauffe-eau 12V Elgena + câble 6 mm² / fusible 25 A", 3, "Verrouiller : jamais en même temps que la plaque induction"),
  T(5, "Installer chauffage Webasto : piquage réservoir, échappement, silencieux", 6, "Homologué ECE R10/R122 → accepté en VASP. Faire poser si doute sur le piquage"),
  T(5, "Poser plaque induction + son circuit 230V", 2, "Plus de gaz du tout → plus de caisson ventilé ni d'attestation gaz"),
  T(6, "Rideaux / occultants cabine et fenêtres", 3),
  T(6, "Finitions bois : ponçage, huile/vernis", 4),
  T(6, "Pesée du van chargé (CU restante)", 1),
  T(6, "Kit sécurité : extincteur, détecteur CO, trousse", 1),
  T(7, "Remplacer embrayage (~1000 €, garage)", 0, "D'origine à 208 500 km"),
  T(7, "Pare-brise fissuré : activer bris de glace", 1, "franchise à vérifier auprès de l'assureur"),
  T(7, "Diagnostiquer verrouillage automatique bizarre", 2, "Possible bug module de confort"),
  T(7, "Monter dossier VASP (plans, attestation élec)", 6, "Pas de gaz à bord → pas d'attestation gaz ni de caisson ventilé à justifier"),
  T(7, "Passage DREAL / homologation VASP", 4),
  T(7, "Changer d'assurance → MAIF (VASP)", 1),
];

export const BUDGET_CATS = ["Isolation", "Bois & habillage", "Électricité", "Chauffage", "Eau", "Cuisine", "Couchage", "Ouvertures", "Quincaillerie", "Mécanique", "Divers"];

// Numéro de révision des données pré-remplies. Incrémenté quand la liste
// d'achats / le schéma élec de référence change : store.js migre alors les
// états déjà enregistrés (voir migrate()).
export const DATA_REV = 3;

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
  // --- Électricité : liste détaillée. price = milieu de fourchette, la
  //     fourchette et le « pourquoi » sont dans les notes.
  B("Électricité", "Panneau solaire rigide 200W", "AliExpress / Amazon", 165, 2, "300-360 € les deux · ~1520×670 mm · montés EN SÉRIE (36 V) : moins de perte dans le câble, mais un seul panneau à l'ombre pénalise les deux"),
  B("Électricité", "Rails + pattes + Sikaflex 252 (fixation panneaux)", "Amazon / H2R", 60, 1, "Collage sur les nervures de toit, sans percer"),
  B("Électricité", "Passe-toit étanche double + Sikaflex 522", "Amazon", 35, 1, "Le point qui fuit si c'est bâclé"),
  B("Électricité", "Câble solaire 6 mm² (10 m) + connecteurs MC4", "123elec / Amazon", 40, 1, "Le calcul donne 2,5 mm², mais les MC4 se sertissent en 4/6 mm²"),
  B("Électricité", "Régulateur MPPT Victron SmartSolar 100/30", "Victron / Amazon", 140, 1, "100 V entrée max · 30 A sortie · Bluetooth. 400 W crête ≈ 29 A : pile la limite du 30 A"),
  B("Électricité", "Chargeur B2B Victron Orion-Tr Smart 12/12-30A", "Victron / Amazon", 165, 1, "150-180 € · profil LiFePO4 dédié, isolé galvaniquement"),
  B("Électricité", "Fusibles de ligne B2B 50 A ×2 + porte-fusibles", "123elec", 20, 1, "Un à CHAQUE bout : côté batterie moteur et côté batterie auxiliaire"),
  B("Électricité", "Chargeur secteur 230V ~20 A", "À définir", 115, 1, "80-150 € · usage occasionnel (camping avec prise, garage)"),
  B("Électricité", "Onduleur pur sinus 2000-2200 W isolation galvanique", "À définir", 300, 1, "250-350 € · ⚠️ 2200 W = ~200 A côté 12 V, soit tout le BMS. Voir l'alerte de l'onglet ⚡"),
  B("Électricité", "Batterie LiTime 12V 300Ah LiFePO4", "LiTime", 595, 1, "570-620 € · 3840 Wh · BMS 200 A continu / 800 A pendant 1 s"),
  B("Électricité", "Moniteur de batterie Victron SmartShunt 500A/50mV", "Victron / Amazon", 115, 1, "100-130 € · seul moyen de connaître le vrai % de charge d'une LiFePO4"),
  B("Électricité", "Fusible ANL 250 A + porte-fusible (batterie → onduleur)", "123elec", 22, 1, "15-30 € · à monter au plus près du + batterie"),
  B("Électricité", "Boîte à fusibles 12 voies + bornier de masse", "Amazon", 75, 1, "50-100 € · protection de chaque circuit 12 V"),
  B("Électricité", "Coupe-circuit général 300 A", "Amazon", 30, 1, "20-40 € · coupe tout le 12 V d'un quart de tour"),
  B("Électricité", "Borniers de répartition + / − (busbars 300 A)", "123elec", 25, 1, "20-30 € · points de raccordement communs"),
  B("Électricité", "Panneau de commandes (interrupteurs éclairage / pompe / ventilo)", "Amazon", 45, 1, "30-60 € · distinct du monitoring batterie"),
  B("Électricité", "Éclairage LED : 6 plafonniers + 2 bandeaux", "Amazon", 115, 1, "80-150 € · ~20 W cumulé"),
  B("Électricité", "Prises 12V / USB-C ×3", "Amazon", 45, 1, "30-60 €"),
  B("Électricité", "Interrupteur différentiel 30 mA + disjoncteur 230V", "Leroy Merlin", 45, 1, "30-60 € · ⚠️ ne protège QUE si le neutre de sortie de l'onduleur est relié au châssis"),
  B("Électricité", "Prise 230V intérieure + entrée secteur", "Leroy Merlin", 22, 1, "15-30 € · entrée près d'une porte, pas de perçage extérieur"),
  B("Électricité", "Câble batterie → onduleur 95 mm² (2 × 1,5 m) + cosses serties", "123elec", 130, 1, "Section calculée par l'appli : 95 mm², fusible 250 A. Faire sertir les cosses (pince hydraulique)"),
  B("Électricité", "Câbles souples 1,5 / 2,5 / 6 / 10 / 25 mm² + gaines annelées", "123elec", 200, 1, "150-250 € · sections exactes câble par câble dans l'onglet ⚡"),
  B("Électricité", "Cosses, porte-fusibles, fusibles à lames, gaine thermo, colliers", "Amazon / 123elec", 60, 1, ""),
  B("Chauffage", "Chauffage diesel Webasto Air Top 2000 STC", "Webasto / revendeur", 800, 1, "Prix confirmé · 0,9-2 kW THERMIQUES mais seulement ~30 W électriques · homologué ECE R10/R122 → accepté en VASP"),
  B("Chauffage", "Kit pose : piquage réservoir, silencieux, passe-plancher", "Webasto / Amazon", 110, 1, "Rarement inclus dans le kit de base"),
  B("Eau", "Réservoir eau propre 100L", "H2R Equipements", 90, 1),
  B("Eau", "Réservoir eaux grises 40L", "H2R Equipements", 45, 1),
  B("Eau", "Pompe Shurflo 12V 10L/min", "H2R Equipements", 85, 1, "~60 W · consommateur 12 V, présent aussi dans l'onglet ⚡"),
  B("Eau", "Accumulateur / vase expansion", "H2R Equipements", 40, 1),
  B("Eau", "Tuyau alimentaire + raccords John Guest", "H2R Equipements", 50, 1),
  B("Eau", "Évier inox + mitigeur", "Amazon", 70, 1),
  B("Eau", "Chauffe-eau 12V Elgena KB6 (6 L / 200 W)", "H2R Equipements", 375, 1, "300-450 € · ~315 Wh par chauffe : le 2e plus gros poste de conso après la plaque"),
  B("Cuisine", "Frigo compresseur 12V (Vitrifrigo C51i / Dometic CRX50)", "H2R / Amazon", 550, 1, "400-700 € · ⚠️ modèle non tranché · ~0,3-0,5 kWh/24 h"),
  B("Cuisine", "Plaque induction Brunner 2 foyers 2000 W", "Brunner / H2R", 145, 1, "130-160 € à confirmer · remplace le gaz → plus de bouteille, plus de caisson ventilé, dossier VASP simplifié"),
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
// v230: true  → l'appareil est alimenté en 230 V (derrière l'onduleur)
// Ipeak       → courant d'appel au démarrage (A) : c'est LUI qui dimensionne
//               le fusible, sinon un fusible calculé sur le courant nominal
//               saute à chaque démarrage (bougie du Webasto, compresseur du frigo)
export const ELEC_LIB = [
  { type: "panneau",  icon: "☀️", name: "Panneau solaire 200W", role: "source", U: 18, P: 200,
    note: "Vmp ~18 V · Voc ~24 V · 2 en série = 36 V (≈48 V à vide, ~54 V par grand froid)" },
  { type: "mppt",     icon: "🔆", name: "MPPT Victron 100/30", role: "conv", U: 12, A: 30, eff: 0.97,
    note: "100 V entrée max · 30 A sortie · Bluetooth" },
  { type: "b2b",      icon: "🔄", name: "Chargeur B2B Orion-Tr 12/12-30", role: "source", U: 12, A: 30,
    note: "profil LiFePO4 · isolé galvaniquement · un fusible à chaque extrémité" },
  { type: "alternateur", icon: "🚐", name: "Alternateur / batterie moteur", role: "source", U: 12, A: 140 },
  { type: "secteur",  icon: "🔌", name: "Chargeur secteur 230V", role: "source", U: 12, A: 20,
    note: "usage occasionnel (camping avec prise, garage)" },
  { type: "batterie", icon: "🔋", name: "Batterie LiTime 300Ah", role: "storage", U: 12, Ah: 300, chem: "LiFePO4", bms: 200,
    note: "3840 Wh · BMS 200 A continu / 800 A pendant 1 s" },
  { type: "shunt",    icon: "📟", name: "SmartShunt 500A (moniteur)", role: "dist", U: 12,
    note: "sur le − de la batterie : TOUS les négatifs, charge comprise, passent côté charge" },
  { type: "coupe",    icon: "⛔", name: "Coupe-circuit général 300A", role: "dist", U: 12 },
  { type: "bornier",  icon: "🔗", name: "Bornier + / − (busbar)", role: "dist", U: 12 },
  { type: "fusebox",  icon: "🧯", name: "Boîte à fusibles 12V", role: "dist", U: 12 },
  { type: "convertisseur", icon: "⚡", name: "Onduleur pur sinus 2200W", role: "conv", U: 12, P: 2200, eff: 0.88,
    note: "isolation galvanique · relier le neutre de sortie au châssis, sinon le différentiel 30 mA ne déclenche pas" },
  { type: "frigo",    icon: "🧊", name: "Frigo compresseur 12V", role: "load", U: 12, P: 50, h: 8, Ipeak: 12,
    note: "~0,3-0,5 kWh/24 h · compresseur ~1/3 du temps · pic au démarrage du compresseur" },
  { type: "chauffeeau", icon: "♨️", name: "Chauffe-eau 12V Elgena KB6", role: "load", U: 12, P: 200, h: 3.2, Ipeak: 18,
    note: "6 L · ~315 Wh par chauffe · 1 cycle/personne/jour · JAMAIS en même temps que la plaque" },
  { type: "pompe",    icon: "💧", name: "Pompe à eau 12V", role: "load", U: 12, P: 60, h: 0.3, Ipeak: 8 },
  { type: "led",      icon: "💡", name: "Éclairage LED (6 spots + 2 bandeaux)", role: "load", U: 12, P: 20, h: 4 },
  { type: "maxxfan",  icon: "🌀", name: "Lanterneau Maxxair", role: "load", U: 12, P: 30, h: 4, Ipeak: 5 },
  { type: "usb",      icon: "📱", name: "Prises USB / 12V", role: "load", U: 12, P: 30, h: 3 },
  { type: "chauffage",icon: "🔥", name: "Chauffage diesel Webasto AT2000", role: "load", U: 12, P: 30, h: 6, Ipeak: 16,
    note: "⚠️ 30 W ÉLECTRIQUES — les 0,9-2 kW annoncés sont THERMIQUES · pic bougie ~16 A au démarrage" },
  { type: "induction",icon: "🍳", name: "Plaque induction 2 foyers", role: "load", U: 230, v230: true, P: 2000, h: 0.5,
    note: "2000 W · jamais en même temps que le chauffe-eau ni la charge du laptop" },
  { type: "load230",  icon: "🖥", name: "Appareil 230V (laptop, photo…)", role: "load", U: 230, v230: true, P: 100, h: 3 },
  { type: "autre",    icon: "🔧", name: "Autre composant", role: "load", U: 12, P: 0, h: 0, note: "rôle modifiable" },
];

// 1,5 mm² mini : en dessous, la tenue mécanique aux vibrations n'est plus assurée.
export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];

// Intensité admissible (A) — câble souple cuivre, à l'air libre, 30 °C ambiant.
// Prudent sur les petites sections (elles voyagent en faisceau / gaine),
// réaliste sur les grosses (câble batterie posé seul).
// En faisceau serré ou en gaine fermée : compter ~0,7×.
export const AMPACITY = {
  1.5: 15, 2.5: 21, 4: 28, 6: 36, 10: 52, 16: 71,
  25: 96, 35: 125, 50: 170, 70: 230, 95: 290, 120: 340,
};

export const FUSES = [2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 200, 250, 300, 400];

// Schéma élec par défaut.
//   x, y   = position sur le schéma (px)
//   vx, vz = position réelle dans le van (mm) → sert au « Plan van » 2D et au
//            calcul automatique des longueurs de câbles
const EN = (type, x, y, over = {}) => ({ id: id(), type, x, y, ...over });
const p1    = EN("panneau", 60, 40,  { name: "Panneau solaire 1", vz: -600, vx: 150 });
const p2    = EN("panneau", 60, 156, { name: "Panneau solaire 2", vz: 200,  vx: 150 });
// le « coffre élec » : 3 rangées sur toute la largeur de l'arrière du van
const mppt  = EN("mppt", 320, 98,           { vz: -1080, vx: 760 });
const alt   = EN("alternateur", 60, 330,    { vz: 1600,  vx: 0 });
const b2b   = EN("b2b", 320, 330,           { vz: -1080, vx: 380 });
const sect  = EN("secteur", 320, 470,       { vz: -1080, vx: 20 });
const bat   = EN("batterie", 600, 260,      { vz: -1600, vx: 380 });
const shunt = EN("shunt", 600, 400,         { vz: -1600, vx: 20 });
const coupe = EN("coupe", 860, 400,         { vz: -1350, vx: 20 });
const bus   = EN("bornier", 860, 260,       { vz: -1350, vx: 380 });
const fb    = EN("fusebox", 1120, 120,      { vz: -1350, vx: 760 });
const conv  = EN("convertisseur", 1120, 600,{ vz: -1600, vx: 760 });
const frigo = EN("frigo", 1400, 20,         { vz: 350,   vx: 620 });
const led   = EN("led", 1400, 112,          { vz: -100,  vx: -250 });
const pompe = EN("pompe", 1400, 204,        { vz: -1150, vx: -620 });
const fan   = EN("maxxfan", 1400, 296,      { vz: 1050,  vx: 0 });
const usb   = EN("usb", 1400, 388,          { vz: -700,  vx: -780 });
const chauf = EN("chauffage", 1400, 480,    { vz: -1500, vx: -550 });
const ceau  = EN("chauffeeau", 1400, 572,   { vz: 600,   vx: -620 });
const indu  = EN("induction", 1400, 664,    { vz: 850,   vx: 620 });
const lap   = EN("load230", 1400, 756, { name: "Laptop / photo / drone", vz: -800, vx: -250 });

// len = longueur en mètres. autoLen:false → longueur figée à la main
// (le plan 2D est vu de dessus : il ignore la hauteur, donc il sous-estime
//  les câbles qui montent au toit ou passent dans le compartiment moteur).
// Uw = tension forcée sur le câble (ici la tension de la chaîne solaire).
const EW = (a, b, len, over = {}) => ({ id: id(), a: a.id, b: b.id, len, ...over });
export const DEFAULT_ELEC = {
  params: { U: 12, dropPct: 3, sunH: 4 },
  nodes: [p1, p2, mppt, alt, b2b, sect, bat, shunt, coupe, bus, fb, conv,
          frigo, led, pompe, fan, usb, chauf, ceau, indu, lap],
  wires: [
    EW(p1, p2, 1.2, { autoLen: false }),          // les 2 panneaux en série
    EW(p2, mppt, 5, { autoLen: false, Uw: 36 }),  // chaîne 36 V → passe-toit → MPPT
    EW(mppt, bat, 1.2),
    EW(alt, b2b, 6, { autoLen: false }),          // compartiment moteur → coffre arrière
    EW(b2b, bat, 0.8),
    EW(sect, bat, 1.2),
    EW(bat, shunt, 0.7), EW(shunt, coupe, 0.6), EW(coupe, bus, 0.7),
    EW(bus, conv, 0.9), EW(bus, fb, 0.7),
    EW(fb, frigo, 1.9), EW(fb, led, 2.4), EW(fb, pompe, 1.7), EW(fb, fan, 3.3),
    EW(fb, usb, 2.3), EW(fb, chauf, 1.9), EW(fb, ceau, 3.4),
    EW(conv, indu, 3), EW(conv, lap, 1.6),
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
const rempl = WN("remplissage", 60, 40);
const resv = WN("reservoir", 60, 180);
const pompeE = WN("pompe", 340, 180);
const accu = WN("accu", 620, 180);
const teeE = WN("vanne", 900, 180);
const robinet = WN("robinet", 1180, 80);
const evier = WN("evier", 1180, 230);
const gris = WN("gris", 1180, 380);
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
  {name:"Plaque induction 2 feux",cat:"cuisine",l:500,w:350,h:100,x:586,z:757,place:"counter",color:"#66994d"},
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
  {name:"Plaque induction 2 feux",cat:"cuisine",l:500,w:350,h:100,x:566,z:1404,place:"counter",color:"#66994d"},
 ]},
];
