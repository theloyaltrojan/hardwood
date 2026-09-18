# Changelog

All notable changes to Hardwood Legends. Dates are the day the work landed.

## [1.3.0] — 2026-09-17

Seventeen changes asked for in one go. The measurements are in the commits.

### Added
- **A real over-the-shoulder camera**, now the default. 11.5m down the floor from the ball at 3.8m,
  looking past the handler at the rim. It backs out through the baseline when it needs the room and
  hides whatever hoop rig it ends up behind, which is what 2K does.
- **Thirty clubs** — real cities, invented nicknames, no borrowed marks. Kit separation holds across
  all 870 ordered pairings.
- **A skyline, trees and bleachers in MyPark.** It had lights and benches and still read as empty
  because there was no horizon past the fence. All instanced, one material each; the park holds 60 FPS.
- **Stamina tiers for the AI.** Every trip names what sprinting is worth to it, so bots conserve.

### Changed
- **Overall is weighted by position.** A flat mean over sixteen ratings moved by an eighth of a point
  per upgrade and looked broken.
- **Shot selection.** 75% of shots came from the paint against about 40% in a real game. Now 39/28/33.
- **Progression is slower and earned.** Steeper curve — 39 XP at rating 40, 1365 at 85 — with XP off
  the box score as you play.
- **Nothing pays in the gym.** One player, no defence, no clock. The workout paid 600 on every replay,
  which made it the fastest money in the game; it is an onboarding bonus and pays once.
- **The workout runs itself the first time you press Tip Off**, and lives in Controls after that. It
  and MyPark are out of the play menu.
- **Dribble moves snap.** A symmetric sine envelope spent as long arriving as leaving; it peaks a third
  of the way in now, and the shoulders turn into the change of direction.
- **Name tags are people only.** Release effects fire on an excellent release, not only a perfect one.
- **Defaults**: camera behind, control follows the ball, gym ball return 1.5s.

### Fixed
- **Multiplayer had no ICE servers at all.** Two public STUN entries and a candidate pool of 4 —
  most of why connecting was slow and why managed Chromebooks could not connect. Without a TURN relay,
  a locked-down school network can still block it entirely.
- **CPU team-mates could not pass to you.** The human pass bias read three CONFIG values that were
  never defined, so the expected value came out NaN and the person holding the controller was never
  a candidate. The exact opposite of the intent.
- **Defenders stacking on the same patch of floor** — 40% of the time a defender's nearest team-mate
  was inside 1.8m, now 33%.

## [1.2.0] — 2026-09-16

### Added
- **Google AdSense, off by default.** Two display slots — one on the main menu, one under the buttons
  on the final-whistle card — that stay completely inert until a publisher id is filled in: no script
  fetched, no element injected, no cookie set. Nothing ever renders over a live court or on the pause
  menu. A slot occupies no space until a unit lands in it and gives the space straight back if the fill
  never arrives, so an ad blocker, an offline tab and an unfilled slot all leave the layout untouched.
  The menu unit sits in the dead space beside the nav when the window is tall enough to hold one and is
  skipped rather than pushing Tip Off under the fold. See the README for what AdSense wants beyond code.
- **Publisher id, `ads.txt` and site verification.** Verification goes through a `google-adsense-account`
  meta tag rather than pasting Google's snippet into the page, so booting and playing still fetch nothing
  from Google. The slot ids are still blank, and a slot with no id is skipped, so the build stays inert
  until the units exist. Note `ads.txt` needs to live at the root of the host to be found, and this is a
  project site, so the root copy lives in the `theloyaltrojan.github.io` repo instead.
- **Both slot ids are in.** `2295316765` on the menu, `2738617000` on the final whistle. Verified against
  live AdSense: both place, both come back `unfilled` while the site waits on review, and both give the
  space back four seconds later without moving Tip Off or the post-game buttons.
- **A privacy policy** at `privacy.html`, linked from the menu, covering what the game keeps in
  `localStorage`, what MyPark and multiplayer reveal to the people you connect to, and the ad cookies.

## [1.1.0] — 2026-09-16

### Added
- **Tutorial** — a seven-step workout in an empty gym covering moving, finishing, the shot meter, greening
  a release, dribble moves and finishing on the move. Nothing in it can be failed. Pays 600 coins.
- **Your created player suits up in every mode**, not just MyCareer and MyPark, taking whichever roster
  slot the mode actually fields nearest their position. A setting picks whether you control your own player
  or whoever has the ball.

### Changed
- **AI shot creation.** A covered passing lane used to veto a pass outright, so the handler usually found
  nobody and forced a smothered shot; it is now a risk the value model prices in. Off-ball players slide
  along the arc away from their man instead of standing on a mark, and off-ball denial scales with the
  defender's rating rather than pinning everyone at arm's length. Field goal percentage across fifteen
  seeded runs moves from 33.5 to about 40, with a fifth more passing.
- **Spacing spots are real three-point spots.** The old "corner" spot sat 6.45m from the basket and inside
  the corner line — a long two, the worst shot in basketball, taken every possession.
- **Colour is handled properly.** Three r128 predates colour management, so every hex literal in the game
  was being read as a linear value and then gamma-encoded on the way out — which is why everything looked
  like a pastel toy. Authored colours are now converted to linear on the way in. Kits are red and gold
  instead of pink and cream, skin tones separate, hair is hair. The arena, the park and the particle
  shader were rebalanced around the change.
- **The arena looks like an arena.** A dim bowl against a lit floor rather than the reverse, light pools
  baked into the floor texture, an LED ribbon with a dot grid around the front row, a hanging scoreboard,
  and a crowd of tapered bodies with per-seat jitter instead of rows of identical bright cubes.
- **The players look like players.** A real kit — collar and sleeve trim, a waistband, side panels down
  the jersey and the shorts — all merged into the same single draw call as the body. Shoes with a heel
  counter, a rounded toe box and a foam midsole instead of two stacked boxes. Contact shading baked into
  the vertex colours under the jaw, the shorts hem and the knee. Rounder limbs, and two more hairstyles
  (braids and locs).

### Fixed
- The hanging scoreboard was sitting at chest height on halfway: `Group.add()` returns the group, not the
  child, so placing its cap moved the whole board.
- Jersey numbers wrapped a third of the way around the torso and read as two loose digits.
- The head poked through the top of its own hair on two of the styles.
- Leaving a game for MyPark left all ten arena players standing in the park. With no match frame they hang
  off the scene rather than off the court group, so hiding the arena did not hide them.

## [1.0.0] — 2026-09-16

The first version with everything wired together: a career, a park, a store, and a test suite that
guards them.

### Added
- **MyPark** — a walkable outdoor lobby you enter as your MyCareer player. Six half courts (two each of
  1v1, 2v2 and 3v3) around a plaza, team pads behind each midcourt line, and live chat on `T`. Fill every
  pad on a court and it tips off where it stands, with everyone else free to walk over and watch from the
  sideline. Player only: everyone in the park is a real connection, and the host owns pad and court state.
- **MyCareer** — build a player (name, position, height, number, look, archetype), pick from three clubs,
  then play a 12-game season, a top-eight conference bracket and a Finals. Games grade your box score and
  pay XP you spend against your archetype's ceilings. Seasons roll over and history stacks up.
- **Store** — coins from playing, a daily reward with a week-long streak, six ball skins and six perfect
  release effects. Everything in it is cosmetic; no purchase touches a rating.
- **24-team league** across two conferences, with automatic change strips so two clubs never share a court
  in similar colours.
- **2v2** as a first-class mode.
- Dribble moves on the arrow keys, usable as a second stick while you are still running with WASD.
- A boot screen that says plainly what went wrong when the renderer cannot start.
- A committed regression suite (`npm test`) and CI.

### Changed
- **Shooting is harder and reads better.** The perfect release window is 4.4% of the meter, down from 9%.
  How open you are now decides a jumper: the contest penalty curves steeply with the nearest defender's
  distance, and the shot feedback says whether the look was wide open, contested or smothered.
- Dribble moves ramp into their push instead of teleporting velocity, blend poses in and out, and hand
  steering back partway through, so none of them feels like a lockout.
- Defenders play their man rather than drifting toward the ball.
- The AI compares shooting, driving and passing in expected points against a patience bar that drops with
  the shot clock.

### Fixed
- Players who lost the ball kept believing they still had it, which let them start a shot that teleported
  the live ball across the court and fired it at their own basket from 25 metres.
- Shot odds had no distance falloff past the arc, which made a half-court heave the highest-value shot on
  the floor in the AI's own model.
- A created player with a one-word name crashed the scoring callout on an assist.
- Blocks never fired, dunks could not miss, and perfect releases were auto-made for the CPU.

[1.0.0]: https://github.com/theloyaltrojan/hardwood/releases/tag/v1.0.0
