# Hardwood Legends

**Play it:** https://theloyaltrojan.github.io/hardwood/

[![CI](https://github.com/theloyaltrojan/hardwood/actions/workflows/ci.yml/badge.svg)](https://github.com/theloyaltrojan/hardwood/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Arcade-sim basketball in the style of modern console hoops games, running entirely from **one file**: `index.html`.
No build step. Open the file in a browser and play.

- Three.js (pinned r128 from cdnjs) is the only external dependency.
- Everything else — court, players, ball, crowd, sounds — is procedurally generated in code.
- Original teams and players only. No real-league marks.
- 24 invented clubs across two conferences, with change strips so two similar colourways never share a court.

## Modes
MyPark · MyCareer · 1v1 streetball · 2v2 · 3v3 half court · 5v5 full court · practice gym · peer-to-peer multiplayer (WebRTC).

On the Play screen, click either jersey to pick from all 24 teams at once instead of stepping through with the arrows.

## Store
Main menu → **Store**. Playing earns coins: buckets, threes, dunks, blocks, steals and assists all pay, with
a bonus for a perfect release and another for scoring through contact, plus a lump sum at the final buzzer.
There is a **daily reward** with a streak that builds for a week.

Coins buy looks and nothing else — no purchase touches a rating. Six **ball skins** and six **perfect
release effects**, the latter firing off your fingertips whenever you green a shot. Wallet, purchases and
streak live in `localStorage`, same as everything else.

## Shooting
The perfect-release window is **4.4% of the meter**, so greening a shot is a real ask — and a green from the
player you control still goes in. Everything else is graded down from there.

How open you are matters more than anything else about a jumper. The penalty curves sharply with the
nearest defender's distance: a hand in your face is close to hopeless, a defender two strides away barely
registers. The shot feedback tells you which it was — `WIDE OPEN`, `CONTESTED` or `SMOTHERED` next to the
timing call.

## MyPark
Main menu → **MyPark** in the sidebar (or **Go to MyPark** from the career hub). It uses your MyCareer build, so make a
player first.

**The park is player only.** Nobody in it is CPU-driven, so a court fills when real people step on its
pads and not before. Alone you can walk the place and stand on a pad, but a run needs someone else: open a
**Multiplayer** lobby, share the code, and everyone who joins and walks in appears in the park with you.

You walk the park as your own character in third person — WASD to move, Shift to run. Six half courts ring
a plaza, two each of **1v1**, **2v2** and **3v3**, colour-coded by the paint in the key. Every court has team
pads behind the midcourt line, one cluster per side. Walk onto a free pad, press **Space** to claim it, and
when every pad on that court is taken it tips off *on that court* after a short countdown, using the same
engine and the same controls as every other mode. Step off the pad to drop out before the tip.

The host owns the pads and decides when a court tips off, so two people can never claim the same spot.
Everyone on court plays as their own MyCareer build. If a court fills without you, you are free to walk over
and watch it from the sidelines — the game plays out where it stands in the lobby, not on a separate screen.
When it ends, everyone spills back into the park and the court reopens.

**Press T to chat.** Messages appear in the log bottom-left and as a bubble over the speaker's head. In a
multiplayer lobby chat goes to everyone over the same peer connection the games use.

One run happens at a time: a court that fills while another is live waits its turn. Escape opens the pause
menu, and quitting from there walks you back out to the menu.

## MyCareer
Main menu → **MyCareer**. Build a player — name, position, height, number, look, and an archetype that sets how
high each attribute can ever go — then spend your starting points across six categories and pick one of three
clubs that want you.

From there it's a 12-game season, playoffs for the top eight in your conference, and a Finals. You control
your own player the whole game; no switching. Every game grades your box score and pays XP, which you spend on
attributes back at the hub. Seasons roll over into the next one and your history stacks up.

The whole career — build, XP, standings, season history, rings — lives in one object in `localStorage`, so you
can close the tab and pick it up later. There's a **Sim this one** button when you'd rather skip a night, and a
**Delete this career** button when you want to start over.

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
MyCareer is single player, so it is disabled while a lobby is open.

Signaling uses the free public PeerJS cloud (loaded from a CDN only when you open the Multiplayer panel). To run your own
signaling server, set `CONFIG.net.peerServer` to `{ host, port, path, secure }` for any PeerServer instance.
Game traffic is peer-to-peer WebRTC: the host simulates, guests send inputs, and the host streams compact binary snapshots.
Players on a team with one human keep auto-switch (control follows the ball); teams with several humans lock each person to their player.

There is also a **Direct connect** fallback for two players that needs no signaling server at all: exchange the offer and answer codes by hand.

## Ads

The game ships with AdSense wired up but switched **off**. With `CONFIG.ads.client` empty nothing is
fetched and nothing is injected — no script tag, no `<ins>`, no cookie. Fill in three strings near the
top of `index.html` and the units turn themselves on:

```js
ads: {
  client: 'ca-pub-0000000000000000',   // your publisher id
  menuSlot: '1234567890',              // a responsive display unit
  finalSlot: '0987654321',             // a second responsive display unit
  ...
}
```

Where they go, and why only there:

| Slot | Placement |
| --- | --- |
| `menuSlot` | Main menu. A rectangle in the dead space under the nav when the window is tall enough for one, otherwise a banner across the bottom, otherwise nothing. |
| `finalSlot` | Under the buttons on the final-whistle card. |

Nothing renders over a live court, and nothing renders on the pause menu, where an ad would sit
next to Resume and Quit and collect misclicks. A unit fills once; a new whistle may fill a fresh one
no sooner than `minRefreshMs`, because AdSense does not allow refreshing an ad without a user action.
A slot takes up no space until a unit actually lands in it and gives the space back if the fill never
arrives, so an ad blocker, an offline tab and an unfilled slot all leave the layout untouched. Two
tests guard this: one that no ad code exists with no publisher id, one that no slot is ever on screen
during play.

`bottomBarOnDesktop` is off by default, so a short laptop window carries no menu ad rather than push
Tip Off under the fold. Turn it on to trade that for more fill.

### Before it pays

Code is the easy part. AdSense also wants:

- **A domain you own.** `*.github.io` is generally not accepted as the site on a new AdSense account,
  and you cannot serve `ads.txt` from the root of `theloyaltrojan.github.io` without owning that repo.
  Point a real domain at Pages with a `CNAME` file and add the site as that domain.
- **`ads.txt` at the domain root**, containing exactly one line with your own publisher id:
  `google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0`. It is deliberately *not* in this repo:
  an `ads.txt` that does not list your real id tells buyers nobody is authorised to sell the inventory,
  which is worse than having no file at all.
- **A privacy policy.** [`privacy.html`](privacy.html) is written and linked from the menu footer. Read
  it before you publish — it describes what this build does, and it is yours to stand behind.
- **A consent message for EEA/UK traffic.** Turn on Google's own CMP under Privacy & messaging in the
  AdSense console. It needs no code here.

Do not enable Auto ads. They inject units wherever they like, including over the canvas, which is
both a policy problem and a gameplay one.

## Dev
The game has no build step and no dependencies. Open `index.html` and it runs.

```
node .claude/serve.js     # serve the folder on http://127.0.0.1:8765
```

### Tests
The game stays dependency-free; the test suite needs one headless browser.

```
npm install
npx playwright install chromium    # or skip it, the runner falls back to installed Chrome
npm test
```

`tests/run.mjs` is a regression suite. Every case in it is either a bug that actually shipped and had to
be found by measurement, or an invariant whose breakage was expensive:

- the game boots and draws a frame, and says plainly when it cannot
- every mode simulates clean
- only the recorded ball holder believes they have the ball
- nobody shoots from the far end of the court
- how open you are moves the odds, monotonically and steeply up close
- shooting stays in a believable band
- no two clubs share a court in similar colours
- a career records a game, rolls through playoffs into the next season, and survives a reload
- coins are earned, spent and remembered, and only the player you control earns
- the park is player only and will not start a run alone
- it holds its frame budget

`node tests/parse.mjs` is the quick one: it pulls the inline script out of the HTML and checks it parses.
CI runs both on every push.

### Layout
One file, `index.html`, with the script split into modules delimited by `// ==== BEGIN <NAME> ====`
markers in dependency order: CONFIG, UTIL, INPUT, AUDIO, DATA, COURT, PLAYER, CAREER, BANK, PARK, MOVES,
BALL, SHOOTING, DUNKS, AI, GAME, CAMERA, RENDER, UI, NET, MAIN. Gameplay constants live in the single
`CONFIG` object at the top. Physics runs at a fixed 120 Hz, decoupled from rendering with interpolation.

## License
MIT. See [LICENSE](LICENSE).
