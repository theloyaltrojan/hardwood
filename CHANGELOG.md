# Changelog

All notable changes to Hardwood Legends. Dates are the day the work landed.

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
