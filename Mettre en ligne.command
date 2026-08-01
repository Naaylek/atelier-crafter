#!/bin/bash
# Double-clique pour publier tes changements sur
#   https://naaylek.github.io/atelier-crafter/
cd "$(dirname "$0")"

# Nouvelle version de cache : force les navigateurs à reprendre les derniers fichiers
V=$(date +%s)
/usr/bin/sed -i '' -E "s/\?v=[0-9]+/?v=$V/g" index.html

if [ -z "$(git status --porcelain)" ]; then
  echo "✅ Rien à publier — le site est déjà à jour."
  read -p "Entrée pour fermer..."
  exit 0
fi

git add -A
git commit -q -m "Mise à jour du $(date '+%d/%m/%Y à %H:%M')"
if ! git push -q; then
  echo "❌ Envoi impossible (pas de connexion ? droits GitHub ?)"
  read -p "Entrée pour fermer..."
  exit 1
fi

echo "🚀 Envoyé ! Mise en ligne dans ~40 secondes…"
sleep 40
open "https://naaylek.github.io/atelier-crafter/"
echo "✅ Terminé : https://naaylek.github.io/atelier-crafter/"
read -p "Entrée pour fermer..."
