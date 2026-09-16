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
WASD move, Shift sprint, Space shoot (hold and release the meter; sprint at the rim to dunk; on defense it
jumps to contest), E pass (steal on defense), R fake, Tab switch player, Esc pause.

**Arrow keys are your dribble moves**, and they work while you are still running with WASD, like a right
stick. Flick toward the rim to spin past, away from it to fade back, or across to cross over standing still
and burst sideways on the move. R pump fakes standing and hesitates on the move.

Settings has an **Advanced** control scheme that also puts every move on its own key, and **Assisted** shot
timing that releases the meter for you. Every binding is remappable and saved in the browser.

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

## License
MIT. See [LICENSE](LICENSE).
