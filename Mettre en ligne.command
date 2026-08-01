#!/bin/bash
# Double-clique pour publier tes changements sur https://naaylek.github.io/atelier-crafter/
cd "$(dirname "$0")"
if [ -z "$(git status --porcelain)" ]; then
  echo "✅ Rien à publier — le site est déjà à jour."
  read -p "Entrée pour fermer..."
  exit 0
fi
git add -A
git commit -m "Mise à jour du $(date '+%d/%m/%Y à %H:%M')"
git push
echo ""
echo "🚀 Envoyé ! En ligne dans ~30 secondes :"
echo "   https://naaylek.github.io/atelier-crafter/"
read -p "Entrée pour fermer..."
