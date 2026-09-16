# Hardwood Legends

Arcade-sim basketball in the style of modern console hoops games, running entirely from **one file**: `index.html`.
No build step. Open the file in a browser and play.

- Three.js (pinned r128 from cdnjs) is the only external dependency.
- Everything else — court, players, ball, crowd, sounds — is procedurally generated in code.
- Original teams and players only. No real-league marks.

## Modes
1v1 streetball · 3v3 half court · 5v5 full court · practice gym · peer-to-peer multiplayer (WebRTC, manual signaling).

## Controls
WASD move · Shift sprint · Space shoot/jump · X sidestep · C crossover · V stepback · Z spin · R hesitation · Q pump fake ·
E pass · F steal · Tab switch · Esc pause · ` debug overlay. Keybinds are remappable (saved to localStorage).

## Multiplayer
Main menu → Multiplayer. One player clicks **Host a game** and sends the offer code to a friend (any chat app).
The friend clicks **Join a game**, pastes it, clicks **Create answer**, and sends the answer code back. The host pastes it and clicks **Connect**.
Once connected, the host picks a mode from the main menu; the game starts on both screens (host = home team, guest = away team).
The host runs the simulation; the guest sends inputs, predicts their own movement, and interpolates everything else.

## Dev
`node .claude/serve.js` serves the folder on http://127.0.0.1:8765 (only needed for the in-app preview; the file works from `file://` too).
