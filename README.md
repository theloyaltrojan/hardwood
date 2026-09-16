# Hardwood Legends

**Play it:** https://theloyaltrojan.github.io/hardwood/

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
Main menu → **Multiplayer**. Type a name, click **Create lobby**, and share the 6-character code. Friends click **Join lobby** with the code.
Everyone can switch between the two teams (or spectate); up to five humans per side, CPU fills the rest. The host picks the mode
(1v1 / 3v3 / 5v5) and presses **Start game**; quitting a game returns the whole lobby to the lobby screen.

Signaling uses the free public PeerJS cloud (loaded from a CDN only when you open the Multiplayer panel). To run your own
signaling server, set `CONFIG.net.peerServer` to `{ host, port, path, secure }` for any PeerServer instance.
Game traffic is peer-to-peer WebRTC: the host simulates, guests send inputs, and the host streams compact binary snapshots.
Players on a team with one human keep auto-switch (control follows the ball); teams with several humans lock each person to their player.

There is also a **Direct connect** fallback for two players that needs no signaling server at all: exchange the offer and answer codes by hand.

## Dev
`node .claude/serve.js` serves the folder on http://127.0.0.1:8765 (only needed for the in-app preview; the file works from `file://` too).
