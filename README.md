# Klik

Tiny games, together. Two phones, one game, played during a video call.

This folder is the live site (GitHub Pages). It is built from the game files in the Klik project with `klik-site/build.py`; edit the games there and rebuild rather than editing these files by hand.

- `index.html`: home page
- `hex.html`, `othello.html`, `slider.html`, `eye.html`: the games
- `klik-sync.js`: syncs moves between phones through Firebase Realtime Database
- `firebase-config.js`: the Firebase web config (public by design)
- `database.rules.json`: the database rules to paste into Firebase
