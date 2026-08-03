# 🚐 Atelier Crafter

Appli tout-en-un pour l'aménagement du VW Crafter 35 L2H1 (2013).

## 🌍 En ligne

**https://naaylek.github.io/atelier-crafter/**

Accessible partout, sur n'importe quel appareil. Ajoute-la à ton écran
d'accueil sur téléphone (Partager → « Sur l'écran d'accueil »).

### Publier une mise à jour

Double-clique **`Mettre en ligne.command`** → en ligne ~30 s après.
(Ou en console : `git add -A && git commit -m "..." && git push`.)

## 📱 Téléphone & tablette

L'affichage s'adapte tout seul en dessous de 900 px de large
(l'affichage sur ordinateur, lui, ne change pas d'un pixel) :

- barre du haut compacte, onglets qui défilent du doigt
- le panneau de gauche devient un **tiroir** : bouton **☰ Réglages** en bas
  à gauche pour l'ouvrir, il se referme tout seul quand tu choisis un meuble
- **van 3D** : un doigt pour tourner, deux pour zoomer/déplacer ;
  la caméra se recadre automatiquement en portrait
- **schémas élec/eau ET plan van 2D** : pincement à deux doigts pour zoomer,
  un doigt sur le fond pour déplacer (le zoom de la page est neutralisé
  au-dessus du dessin, sinon le navigateur zoomait toute l'appli)
- **tableaux** planning et budget : chaque ligne devient une **fiche**,
  intitulé au-dessus et champ sur toute la largeur — les noms de tâches,
  articles, magasins et notes sont enfin lisibles

Ajoute le site à ton écran d'accueil (Partager → « Sur l'écran d'accueil ») :
il s'ouvre alors comme une vraie appli, sans barre de navigateur.

## 💻 En local (sans internet)

Double-clique **`Lancer Atelier Crafter.command`** → le navigateur s'ouvre sur
http://localhost:8742. Laisse la fenêtre Terminal ouverte pendant l'utilisation.

(Si macOS bloque le fichier : clic droit → Ouvrir, une seule fois.)

## ☁️ Synchro entre appareils

**Sur un appareil déjà ouvert une fois : rien à faire.** Tu ouvres l'adresse,
tes données sont là, et tout ce que tu modifies part tout seul 4 secondes après.
Ça revient aussi quand tu reviens sur l'onglet.

**Sur un appareil neuf** : la page te demande ton **mot de passe**, une fois.
C'est tout. Plus jamais ensuite sur cet appareil.

### Mise en place (une seule fois pour tout le projet)

La première fois seulement, le panneau ☁️ demande deux choses :

1. Ton **mot de passe** (choisis-le long et mémorisable, ex. `crafter-bleu-vacances`)
2. Une **clé d'écriture GitHub**, à créer une fois :
   https://github.com/settings/personal-access-tokens/new
   → Expiration : *No expiration* · **Account permissions → Gists → Read and write**

Ensuite, tu n'y reviens plus jamais : les autres appareils ne demandent que
le mot de passe.

### Comment c'est protégé

Tes données vivent dans un espace de stockage GitHub dont l'identifiant est
dans le code (donc visible). Mais **tout y est chiffré** (AES-GCM, clé dérivée
de ton mot de passe) : les données **et** la clé d'écriture. Sans le mot de
passe, quelqu'un qui trouve l'espace ne voit que du charabia et ne peut rien
modifier.

⚠️ **Le mot de passe n'est stocké nulle part et ne peut pas être retrouvé.**
S'il est perdu, il faut repartir d'une sauvegarde 💾 et refaire la mise en place.
La clé GitHub ne donne accès qu'à tes gists (jamais à tes dépôts) et reste
révocable depuis GitHub à tout moment.

Si deux appareils ont été modifiés chacun de leur côté, l'appli **demande**
avant de remplacer quoi que ce soit — jamais d'écrasement silencieux.

## 🔒 Infos privées

Plaque d'immatriculation, prix payé et assureur sont **chiffrés** (AES-GCM)
et masqués par défaut : `••••••`. Bouton **🔒** en haut à droite → code à
4 chiffres pour les afficher, re-clic pour re-masquer. Le déverrouillage
dure jusqu'au rechargement de la page.

⚠️ **Honnêteté** : un code à 4 chiffres protège d'un regard par-dessus
l'épaule, pas d'un attaquant motivé (~3 h de calcul pour tout essayer).
Pour du solide, demande un mot de passe plus long — c'est 10 s de travail.

### Changer le code

Modifie `CODE` dans le script de génération, relance-le, et remplace `BLOB`
dans `js/secret.js` par la sortie. Demande-moi, c'est immédiat.

## Les onglets

- **🏠 Tableau de bord** — avancement, budget, prochaine étape, fiche du van.
- **📋 Planning** — 48 tâches pré-remplies en 8 phases (préparation → VASP),
  durées, dates, statuts. Coche au fur et à mesure.
- **💶 Budget** — liste d'achats pré-remplie (~7 200 € hors mécanique), par
  catégorie, avec magasins, prix et notes. Coche = acheté. Modifie tout.
- **⚡ Électricité** — deux vues : **🗺 Schéma** (câbles à angles droits,
  couleurs par type : jaune = solaire, rouge = 12V, orange = alternateur,
  violet = 230V) et **🚐 Plan van** (vue de dessus : glisse chaque composant
  à sa vraie place, les longueurs de câbles se calculent toutes seules).
  Le **bilan énergie** est directement modifiable (W et h/j de chaque
  appareil, Ah et BMS des batteries).
  ➕ palette pour ajouter des composants (dont « Autre composant » libre),
  🗑 ou ⌫ pour supprimer.

### Comment la section de chaque câble est choisie

La section retenue est **la plus grande des trois** contraintes — le panneau
du câble affiche laquelle a tranché :

1. **Chute de tension** : S = 2 × ρ × L × I / ΔU (ρ cuivre 0,0175, chute 3 %
   réglable). C'est ce qui compte sur les longs câbles à faible courant.
2. **Échauffement** : la section doit tenir le courant en continu. Valeurs
   pour du câble souple à l'air libre, 30 °C — en faisceau serré, compter 0,7×.
3. **Calibre du fusible** : un fusible ne protège que s'il claque avant que le
   câble ne chauffe. Si le fusible dépasse ce que la section tient, l'appli
   monte d'un cran.

Minimum 1,5 mm² en 12 V (tenue aux vibrations) et 2,5 mm² en 230 V.

Le **fusible** vaut 1,25 × le courant nominal, **ou le courant d'appel** de
l'appareil s'il est plus grand (champ « courant d'appel » : bougie du Webasto,
démarrage du compresseur du frigo). Sans ça, un fusible calculé sur le courant
nominal saute à chaque démarrage.

Le **BMS de la batterie** plafonne tout : aucun câble 12 V ne peut voir plus
que ce que la batterie sait débiter. Quand c'est le cas, un ⚠️ BMS s'affiche.
Le bilan compare aussi l'appel de courant « tout allumé » à cette limite.

Sur une chaîne de panneaux en série, remplis **« Tension forcée »** sur le
câble qui descend au MPPT (36 V ici) : la section calculée en tient compte.
- **🔥 Chauffage** (budget) — Webasto Air Top 2000 STC. Attention : les
  0,9-2 kW annoncés sont **thermiques**. Côté électrique, il ne tire que
  ~30 W (et ~16 A pendant les 30 s de préchauffage bougie).
- **💧 Eau** — mêmes deux vues (schéma + plan van vue de dessus, longueurs
  de tuyaux auto). Couleurs : bleu = froide, rouge = chaude (chauffe-eau),
  gris = évacuation. Diamètres Ø10-38, bilan eau modifiable (volumes),
  autonomie en jours, métrage total de tuyau.
- **🚐 Van 3D** — ton Crafter aux dimensions EXACTES (3365×1780×1650 mm,
  passages de roues, 48,5 cm derrière les roues) + carrosserie 3D réelle en
  transparence. Drag & drop des meubles, redimensionnement, rotation,
  détection de chevauchements, cotes atelier (distance aux parois),
  vues Dessus/Gauche/Droite/Arrière/Avant, export PNG.
  Tes 2 idées vanspace3D sont pré-importées (approximatives — à ajuster).

## Raccourcis Van 3D

| Action | Commande |
|---|---|
| Sélectionner | clic sur un meuble (3D ou liste) |
| Déplacer | glisser, ou flèches (10 mm, ⇧ = 100 mm) |
| Pivoter 90° | R |
| Dupliquer | D |
| Supprimer | ⌫ |

## Outils gizmo (comme vanspace3D)

Barre du haut : **🖐 Souris** (glisser librement au sol) · **✥ Déplacer**
(flèches x/y/z précises, pas de 10 mm — permet aussi de monter/descendre) ·
**↻ Pivoter** (3 anneaux x/y/z, pas de 15°) · **⤢ Taille** (poignées sur les 3 axes).
Sélectionne un meuble puis choisis l'outil. Champs de rotation x/y/z précis
dans le panneau du meuble.

**🧲 Aimant** (activé par défaut) : en glissant un meuble, il se colle tout
seul (portée 80 mm) aux parois du caisson, aux passages de roues et aux bords
des meubles qui lui font face — bord à bord ou bords alignés. Des **lignes
vertes** apparaissent quand ça accroche. Clique le bouton pour désactiver.

**🔒 Verrou** : bloque toute sélection/déplacement à la souris — balade-toi
autour du van sous tous les angles sans risquer de bouger un meuble.
(Préférence mémorisée, clavier et gizmos bloqués aussi.)

## Faces masquables

Sélectionne un meuble → ligne **« Faces visibles »** : décoche une face pour
la supprimer (ex. la face avant de la douche = on comprend que c'est l'entrée).
Rectangulaire : 6 faces (avant/arrière/gauche/droite/dessus/dessous, par
rapport au meuble avant rotation). Cylindre : côté/dessus/dessous.
Coins arrondis : couvercles/parois. L'intérieur du meuble devient visible.

## Opacité & mise en valeur

- **Par meuble** : sélectionne-le → curseur « opacité » à côté de la couleur.
  Exemple : lit à 20 %, réservoirs et batterie à 100 % → l'eau et l'élec
  ressortent, le couchage s'efface.
- **Global** (panneau « 👁 Affichage ») : curseur **Surfaces** (opacité de
  toutes les faces) + curseur **Bords** (intensité des arêtes).
  Surfaces au minimum + bords à fond = vue « fil de fer » complète.

## Créer ses propres meubles

Panneau gauche → « 🛠 Créer mon propre meuble… » : nom, dimensions,
**forme** (rectangulaire, **coins arrondis** avec rayon réglable, **cylindre**),
couleur, placement. « ➕ Ajouter au plan » ou « 💾 + bibliothèque » pour le
réutiliser plus tard (bouton 💾 aussi sur tout meuble sélectionné).
La forme et le rayon restent modifiables après coup dans le panneau du meuble.

Un meuble en conflit garde sa couleur : c'est son **contour** qui devient rouge.
Le panneau latéral s'élargit en tirant la poignée verticale à sa droite
(pareil dans Élec et Eau).

## Annuler / rétablir

⌘Z = annuler, ⌘⇧Z = rétablir — ou les boutons ↩️ ↪️ en haut à droite.
🕘 ouvre l'historique complet : clique une ligne pour revenir à ce moment-là.
Tout est annulable : planning, budget, schémas, aménagement 3D.

## Tout est modifiable

- **Planning** : renomme une phase en cliquant son titre, « + Phase », ✕ pour
  supprimer (les tâches migrent), change la phase d'une tâche via sa liste.
- **Budget** : catégories renommables (✏️) / supprimables (✕) / « + catégorie ».
- **Tableau de bord** : notes « À surveiller » éditables.
- **Van 3D** : dimensions du caisson et passages de roues modifiables
  (panneau « Caisson & carrosserie »), 🧲 Recaler auto réaligne la carrosserie
  sur les essieux si elle est décalée.

## Mesures (Van 3D)

- **🏷️ Noms** : affiche/cache noms + dimensions des meubles.
- **📐 Cotes van** : affiche/cache les cotes du caisson (L, l, h, zone roues).
- **📏 Règle** : clique un 1er point puis un 2e (sol, murs, meubles…) —
  la mesure s'aimante sur l'axe dominant (longueur, largeur ou hauteur)
  et s'affiche en vert. Liste dans le panneau : 👁 pour montrer/cacher
  chaque mesure, ✕ pour la supprimer. Échap quitte la règle.

## Sauvegarde

Tout est enregistré automatiquement dans le navigateur (localStorage).
**💾 Exporter** crée un fichier JSON de secours ; **📂 Importer** le recharge.
Exporte régulièrement (et avant de vider le cache du navigateur !).

## Schémas élec/eau

**Clique un bloc ou un câble** : ses réglages s'ouvrent aussitôt **en haut du
panneau de gauche**, encadrés en orange. Tout y est modifiable — nom, rôle,
alimentation 12 V ou 230 V, puissance, heures par jour, courant d'appel, Ah et
BMS de la batterie, rendement, longueur et diamètre.

### Longueur des câbles et tuyaux

Le champ **Longueur** est saisissable dans les deux vues, Schéma comme Plan van.
Dès que tu tapes une valeur, elle est **figée** : le plan van ne l'écrasera plus,
même si tu déplaces les composants. Recoche **« Longueur auto »** pour revenir à
la longueur calculée depuis les positions réelles dans le van (chemin à angle
droit + 30 cm de mou).

### Trop de texte sur le plan van ?

Le bouton **🏷** fait tourner trois densités d'affichage, mémorisées :

- **Compact** (par défaut) — petits textes, tout reste lisible
- **Tout** — noms et infos câbles en grand
- **Icônes** — plus aucun texte, on ne voit que le cheminement

Dans tous les cas, chaque étiquette est posée sur une pastille claire pour
qu'aucun trait ne la barre.

🔗 **Relier** puis clique 2 blocs pour créer un câble/tuyau.
Molette = zoom, glisser le fond = déplacer la vue.

Le zoom suit l'amplitude réelle du geste : un cran de molette de souris fait
~11 %, un petit glissement à deux doigts sur le trackpad fait moins de 1 %.
(Avant, le trackpad appliquait 10 % par micro-évènement et ça partait en vrille.)

Les noms des blocs passent sur deux lignes plutôt que d'être coupés, et chaque
étiquette de câble est posée sur une pastille claire, au-dessus des blocs :
plus rien n'est masqué ni barré par un trait.
