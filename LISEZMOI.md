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
- **schémas élec/eau** : pincement à deux doigts pour zoomer
- **tableaux** planning et budget : ils défilent horizontalement

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
- **💶 Budget** — liste d'achats pré-remplie (~4 200 €), par catégorie, avec
  magasins et prix. Coche = acheté. Modifie tout.
- **⚡ Électricité** — deux vues : **🗺 Schéma** (câbles à angles droits,
  couleurs par type : jaune = solaire, rouge = 12V, orange = alternateur,
  violet = 230V) et **🚐 Plan van** (vue de dessus : glisse chaque composant
  à sa vraie place, les longueurs de câbles se calculent toutes seules).
  Chaque câble affiche : courant (A), longueur, section à acheter (mm²),
  fusible conseillé (S = 2×ρ×L×I/ΔU, chute 3 %). Le **bilan énergie** est
  directement modifiable (W et h/j de chaque appareil, Ah des batteries).
  ➕ palette pour ajouter des composants (dont « Autre composant » libre),
  🗑 ou ⌫ pour supprimer.
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

🔗 **Relier** puis clique 2 blocs pour créer un câble/tuyau.
Clique un bloc/câble pour modifier ses valeurs (W, Ah, longueur, Ø…).
Molette = zoom, glisser le fond = déplacer la vue.
