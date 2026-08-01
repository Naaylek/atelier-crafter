#!/usr/bin/env python3
"""Petit serveur local anti-cache pour Atelier Crafter."""
import http.server
import os

PORT = 8742
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # le navigateur revalide à chaque chargement → toujours la dernière version
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, *args):
        pass  # silence


if __name__ == "__main__":
    print(f"🚐 Atelier Crafter — http://localhost:{PORT}  (Ctrl+C pour quitter)")
    http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
