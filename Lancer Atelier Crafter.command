#!/bin/bash
# Double-clique ce fichier pour lancer Atelier Crafter dans ton navigateur.
cd "$(dirname "$0")"
PORT=8742
# si déjà lancé, on ouvre juste le navigateur
if lsof -i :$PORT >/dev/null 2>&1; then
  open "http://localhost:$PORT"
  exit 0
fi
( sleep 1 && open "http://localhost:$PORT" ) &
python3 serve.py
