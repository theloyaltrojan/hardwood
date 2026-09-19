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
Main menu → **Multiplayer**. The panel checks your network as it opens and says whether direct connections work from it.
Type a name, click **Create lobby**, and share the 8-character code. Friends click **Join lobby** with the code; each stage
of the join shows on screen with a clock, and it usually takes about a second. Everyone can switch between the two teams (or
spectate); up to five humans per side, CPU fills the rest. The host picks the mode (1v1 / 3v3 / 5v5) and presses **Start game**;
quitting a game returns the whole lobby to the lobby screen. MyCareer is single player, so it is disabled while a lobby is open.

Lobbies are found through several public nostr relays at once (`CONFIG.net.nostrRelays`), with offers encrypted under a key
derived from the code. Game traffic is peer-to-peer WebRTC, host at the centre: the host simulates, guests send inputs, and the
host streams compact binary snapshots. Players on a team with one human keep auto-switch (control follows the ball); teams with
several humans lock each person to their player.

Some networks block peer-to-peer outright (school Chromebooks, often phones on mobile data). The game says so within a second
instead of hanging, and plays through a relay when one is configured: see [`relay/README.md`](relay/README.md) for the free
Cloudflare Worker, or TURN. There is also a **Direct connect** fallback for two players that needs no signaling at all:
exchange the offer and answer codes by hand.

## Ads

**The game shows no ads and loads no ad code.** Display ads are on [`guide.html`](guide.html), the how-to-play
guide, next to about 2,000 words of real writing. AdSense does not allow ads on screens without publisher
content: a main menu is navigation, and a pause or final-whistle screen is a dead end, not content. This site
was flagged for exactly that in September 2026, when the game had units on its menu and final card.

| Where | What |
| --- | --- |
| `guide.html` | Two responsive display units (slots `2295316765`, `2738617000`), each after a full section of text, labelled *Advertisement* only when they actually fill. |
| The game | Nothing, with `CONFIG.ads.h5` off (the default): no script, no units, and so no Auto ads either. |

The only approved way to put ads *inside* a game is Google's **H5 Games Ads** (the Ad Placement API), which an
AdSense account has to apply for separately. The integration is built and tested and switched off:

- `'next'`: an interstitial when you leave the final-whistle card, the natural break in a game. Never during play.
- `'reward'`: an opt-in *Watch an ad: +50 coins* button on that card, shown only when Google has an ad ready, paid only
  when the ad is watched.
- Nothing ever waits on an ad unless Google's `onReady` has fired. For an account not approved for H5, Google accepts
  `adBreak()` and then never answers, and a Rematch button waiting on it would hang forever.

To turn it on once approved: set `CONFIG.ads.h5 = true`, exclude `/hardwood/` from Auto ads in the AdSense console
(loading the tag in the game page would otherwise let Auto ads over the canvas), and update `privacy.html`, which today
says the game shows none. `h5Test` runs Google's mock ads for trying the flow; never ship it on.

### Before it pays

- **Verification** is the `google-adsense-account` meta tag in `<head>`, plus `ads.txt`.
- **`ads.txt` has to sit at the root of the host.** The one that counts lives in
  [`theloyaltrojan.github.io`](https://github.com/theloyaltrojan/theloyaltrojan.github.io) and is live at
  [theloyaltrojan.github.io/ads.txt](https://theloyaltrojan.github.io/ads.txt).
- **A privacy policy.** [`privacy.html`](privacy.html) is linked from the menu footer, the guide and the root page.
- **A consent message for EEA/UK traffic.** Turn on Google's own CMP under Privacy & messaging in the AdSense console.
- **Review.** After a policy fix, request a review from AdSense → Sites → the site → *Request review*. It usually takes a
  few days, sometimes 2-4 weeks. Don't remove and re-add the site; that restarts the queue.

## Dev
The game has no build step and no dependencies. Open `index.html` and it runs.

```
node .claude/serve.js     # serve the folder on http://127.0.0.1:8765
```

### Tests
The game stays dependency-free; the test suite needs one headless browser.

```
npm install
npx playwright install chromium chromium-headless-shell   # Chrome is used first if installed; the shell simulates a school network
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
- the game never loads ad code or shows an ad unit on any screen; H5 ads never hold the game up and pay only for a
  watched ad; the guide's ads sit after real writing
- a guest joins a lobby by code in seconds and its own keys move its player; a wrong code says so; a network that
  blocks UDP is told at once and plays through the relay; nobody can take over a relay room
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
