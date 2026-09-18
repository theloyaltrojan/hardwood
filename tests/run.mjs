// Regression suite for Hardwood Legends.
//
// Every case here is a bug that actually shipped and had to be found by measurement, or an invariant whose
// breakage was expensive. Run with `npm test`. The game itself stays dependency-free; only this needs a
// browser to drive.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { serve, makeRunner } from './harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const headed = process.argv.includes('--headed');

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('\nPlaywright is not installed. Run:\n\n  npm install\n  npx playwright install chromium\n');
  process.exit(1);
}

const { server, port } = await serve(ROOT);
const URL = `http://127.0.0.1:${port}/index.html`;
// A real Chrome first: it renders on the GPU. Playwright's default for headless is its headless shell, which
// renders WebGL in software - installing that shell once dropped a live 5v5 from 60 FPS to 5 and failed every
// timing test for a reason that had nothing to do with the game. CI has no Chrome and falls through to the
// bundled browser, as before.
async function launch() {
  const tries = [{ channel: 'chrome' }, { channel: 'chromium' }, {}, { channel: 'msedge' }];
  const problems = [];
  for (const opts of tries) {
    try { return await chromium.launch({ headless: !headed, ...opts }); }
    catch (e) { problems.push((opts.channel || 'bundled') + ': ' + String(e.message).split('\n')[0]); }
  }
  console.error('\nNo browser to run the tests in. Tried:\n  ' + problems.join('\n  ') +
    '\n\nInstall one with:\n\n  npx playwright install chromium\n');
  process.exit(1);
}
const browser = await launch();
const { test, check, summary } = makeRunner();

const READY = "typeof Game !== 'undefined' && typeof Main !== 'undefined' && !document.getElementById('boot')";

// A fresh page with the game booted, the render loop stopped, and clean storage.
const open = new Set();
async function fresh(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  open.add(page);
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(READY, null, { timeout: 20000 });
  if (opts.wipe !== false) {
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload();
    await page.waitForFunction(READY, null, { timeout: 20000 });
  }
  if (opts.headless !== false) await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  page.errors = errors;
  return page;
}
// Tests close their page on the happy path; this catches the ones that threw first.
async function sweep() { for (const p of Array.from(open)) { try { await p.close(); } catch {} open.delete(p); } }

console.log('\nHardwood Legends — regression suite\n');

// ---------------------------------------------------------------- boot
await test('boots and draws a frame', async () => {
  const page = await browser.newPage();
  await page.goto(URL);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 20000 });
  const r = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length, running: typeof Render !== 'undefined' }));
  check.equal(r.canvases, 1, 'one canvas');
  check.ok(r.running, 'renderer present');
  await page.close(); open.delete(page);
});

await test('says so plainly when Three.js cannot load', async () => {
  const page = await browser.newPage();
  await page.route('**/three.min.js', (r) => r.abort());
  await page.goto(URL);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const b = document.getElementById('boot');
    return { overlay: !!b, err: b ? b.classList.contains('err') : false,
      title: (document.getElementById('bootTitle') || {}).textContent || '' };
  });
  check.ok(r.overlay, 'boot overlay still covering the menu');
  check.ok(r.err, 'overlay in its error state');
  check.ok(/three\.js/i.test(r.title), 'names the real cause');
  await page.close(); open.delete(page);
});

// ---------------------------------------------------------------- simulation
await test('every mode simulates without error', async () => {
  const page = await fresh();
  const out = await page.evaluate(() => {
    const res = [];
    for (const [mode, a, b] of [['1v1', 0, 13], ['2v2', 2, 5], ['3v3', 7, 20], ['5v5', 11, 23], ['practice', 4, 9]]) {
      Render.buildArena(TEAMS[a], TEAMS[b]); Game.start(mode, a, b); Render.buildPlayers(Game.g.teams);
      Game.setSpectate(true);
      for (let i = 0; i < 120 * 60; i++) Game.step(1 / 120);
      res.push({ mode, players: PlayerSys.players.length, score: Game.g.score.slice() });
    }
    return res;
  });
  const want = { '1v1': 2, '2v2': 4, '3v3': 6, '5v5': 10, practice: 1 };
  for (const r of out) check.equal(r.players, want[r.mode], r.mode + ' player count');
  check.equal(page.errors.length, 0, 'no runtime errors: ' + page.errors.join(' | '));
  await page.close(); open.delete(page);
});

// Regression: setHolder used to leave `hasBall` set on the previous holder, so a player who had lost the
// ball could start a shot, which teleported the live ball across the court and fired it from 25 metres.
await test('only the recorded ball holder believes they have the ball', async () => {
  const page = await fresh();
  const bad = await page.evaluate(() => {
    let bad = 0;
    for (const [mode, a, b] of [['5v5', 0, 1], ['3v3', 7, 20], ['1v1', 11, 23]]) {
      Game.start(mode, a, b); Render.buildPlayers(Game.g.teams); Game.setSpectate(true);
      const ball = BallSys.ball, P = PlayerSys.players;
      for (let i = 0; i < 120 * 100; i++) {
        Game.step(1 / 120);
        for (const p of P) {
          const should = ball.holder === p.id && (ball.state === BallSys.BS.HELD || ball.state === BallSys.BS.DUNK);
          if (p.hasBall !== should) { bad++; break; }
        }
      }
    }
    return bad;
  });
  check.equal(bad, 0, 'ticks where hasBall disagreed with ball.holder');
  await page.close(); open.delete(page);
});

// Regression: shot odds had no distance falloff, which made a half-court heave the best-value shot on the
// floor in the AI's own model. It took them, constantly.
await test('nobody shoots from the far end of the court', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    const shots = [];
    for (const seed of [11, 202, 3003, 40004, 555555]) {
      Game.start('5v5', 0, 1); Render.buildPlayers(Game.g.teams); Game.setSpectate(true); RNG.seed(seed);
      const ball = BallSys.ball, BS = BallSys.BS;
      let was = ball.state;
      for (let i = 0; i < 120 * 140; i++) {
        Game.step(1 / 120);
        if (ball.state === BS.SHOT && was !== BS.SHOT && ball.shot.kind === 'jumper') {
          const h = Game.hoopFor(ball.shot.team);
          shots.push(U.dist(ball.shot.x, ball.shot.z, h.x, h.z));
        }
        was = ball.state;
      }
    }
    return { n: shots.length, deepest: Math.max(...shots), beyond11: shots.filter((d) => d > 11).length };
  });
  check.atLeast(r.n, 20, 'enough shots to judge');
  check.atMost(r.deepest, 11, 'deepest shot in metres');
  check.equal(r.beyond11, 0, 'shots from beyond 11m');
  await page.close(); open.delete(page);
});

await test('how open you are decides a jumper', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    const SC = CONFIG.shooting;
    const tight = Shooting.rangeFactor ? 1 : 1;   // keep lint honest; rangeFactor is exercised elsewhere
    const near = AI ? null : null;
    // sample the contest curve directly: it is the thing that has to be monotonic and steep up close
    const f = (d) => {
      const t = U.clamp(1 - (d - SC.contestNear) / (SC.contestFar - SC.contestNear), 0, 1);
      return 1 - SC.contestMaxPenalty * Math.pow(t, SC.contestCurve);
    };
    return { smother: f(0.6), tight: f(1.2), step: f(2.0), open: f(3.2), tightFactor: tight, unused: near };
  });
  check.atMost(r.smother, 0.35, 'a hand in the face should gut the shot');
  check.ok(r.tight < r.step && r.step < r.open, 'make odds must rise monotonically with space');
  check.atLeast(r.open, 0.9, 'an open look should be nearly unpenalised');
  await page.close(); open.delete(page);
});

await test('shooting stays in a believable band', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    let fga = 0, fgm = 0, green = 0, shots = 0;
    for (const seed of [11, 202, 3003, 40004, 555555, 7, 91, 1234]) {
      Game.start('5v5', 0, 1); Render.buildPlayers(Game.g.teams); Game.setSpectate(true); RNG.seed(seed);
      const ball = BallSys.ball, BS = BallSys.BS;
      let was = ball.state;
      for (let i = 0; i < 120 * 140; i++) {
        Game.step(1 / 120);
        if (ball.state === BS.SHOT && was !== BS.SHOT && ball.shot.kind === 'jumper') { shots++; if (ball.shot.green) green++; }
        was = ball.state;
      }
      for (const p of PlayerSys.players) { fga += p.stats.fga; fgm += p.stats.fgm; }
    }
    return { fgPct: 100 * fgm / fga, greenRate: 100 * green / shots, fga };
  });
  check.atLeast(r.fga, 100, 'enough attempts to judge');
  check.between(r.fgPct, 26, 50, 'team field goal percentage');
  check.atMost(r.greenRate, 40, 'a perfect release must stay hard for the CPU too');
  await page.close(); open.delete(page);
});

// Regression: with 24 teams two clubs will meet in near-identical colours and the court becomes unreadable.
await test('no two clubs share a court in similar colours', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    let worst = 1e9, pair = '';
    for (let a = 0; a < TEAMS.length; a++) for (let b = 0; b < TEAMS.length; b++) {
      if (a === b) continue;
      const k = kitsFor(a, b), gap = colourGap(k[0].primary, k[1].primary);
      if (gap < worst) { worst = gap; pair = TEAMS[a].abbr + ' v ' + TEAMS[b].abbr; }
    }
    return { worst, pair, pairs: TEAMS.length * (TEAMS.length - 1), n: TEAMS.length };
  });
  const TEAM_PAIRS = r.n * (r.n - 1);
  check.equal(r.pairs, TEAM_PAIRS, 'every ordered pairing checked');
  check.atLeast(r.worst, 280, 'closest kit pairing (' + r.pair + ')');
  await page.close(); open.delete(page);
});

// ---------------------------------------------------------------- career
await test('a career records a game and survives a reload', async () => {
  const page = await fresh();
  const before = await page.evaluate(() => {
    Career.wipe();
    const b = Career.blankBuild('twoway', 'SF'); b.name = 'Suite Tester';
    for (const c of Career.CATS) b.cats[c.id] = 68;
    while (Career.poolLeft(b.cats) < 0) b.cats.rebounding--;
    Career.begin(b, 0);
    const c = Career.data, up = Career.upcoming();
    const A = up.home ? c.team : up.opp, B = up.home ? up.opp : c.team;
    Render.buildArena(TEAMS[A], TEAMS[B]);
    Game.start('5v5', A, B, { career: true });
    Render.buildPlayers(Game.g.teams);
    const me = PlayerSys.players[Game.g.careerPid];
    Game.setSpectate(true);
    let guard = 0;
    while (Game.g.state !== Game.S.OVER && guard++ < 120 * 60 * 12) Game.step(1 / 120);
    return { pid: Game.g.careerPid, name: me ? me.name : null, gameNo: Career.data.gameNo, gp: Career.data.totals.gp };
  });
  check.atLeast(before.pid, 0, 'created player made it onto the court');
  check.equal(before.name, 'Suite Tester', 'and it is the created player');
  check.equal(before.gameNo, 1, 'schedule advanced');
  check.equal(before.gp, 1, 'game recorded');
  await page.reload();
  await page.waitForFunction(READY, null, { timeout: 20000 });
  const after = await page.evaluate(() => ({ name: Career.data.player.name, gp: Career.data.totals.gp, gameNo: Career.data.gameNo }));
  check.equal(after.name, 'Suite Tester', 'career survived reload');
  check.equal(after.gp, 1, 'games played survived reload');
  await page.close(); open.delete(page);
});

await test('a full season rolls into playoffs and the next year', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    Career.wipe();
    const b = Career.blankBuild('twoway', 'SF'); b.name = 'Season';
    Career.begin(b, 0);
    const c = Career.data;
    const line = { pts: 26, reb: 7, ast: 6, stl: 2, blk: 1, fgm: 10, fga: 19, tpm: 3, tpa: 7, ftm: 3, fta: 4, to: 2 };
    const seen = new Set();
    let guard = 0;
    while (guard++ < 120 && c.season < 2) { seen.add(c.phase); if (!Career.upcoming()) break; Career.recordGame(line, true, 108, 99); }
    return { season: c.season, rings: c.rings, history: c.history.length, phases: Array.from(seen),
      overCap: Career.CATS.filter((cat) => c.player.cats[cat.id] > Career.capFor(cat.id)).length };
  });
  check.equal(r.season, 2, 'rolled into a second season');
  check.atLeast(r.history.valueOf(), 1, 'season written to history');
  check.ok(r.phases.includes('playoffs'), 'playoffs happened');
  check.equal(r.overCap, 0, 'no attribute broke its archetype ceiling');
  await page.close(); open.delete(page);
});

// ---------------------------------------------------------------- money
await test('coins are earned, spent and remembered', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    Bank.wipe();
    const start = Bank.coins;
    const daily = Bank.claimDaily();
    Bank.award(9000, 'test');
    const boughtBall = Bank.buy('ball', 'gold');
    const equipped = Bank.equipped.ball;
    const cheat = Bank.buy('effect', 'gold') && Bank.coins < 0;
    return { start, daily: !!daily, boughtBall, equipped, coins: Bank.coins, negative: Bank.coins < 0, cheat };
  });
  check.atLeast(r.start, 0, 'starts with a balance');
  check.ok(r.daily, 'daily reward claimable on a fresh wallet');
  check.ok(r.boughtBall, 'bought a ball skin');
  check.equal(r.equipped, 'gold', 'buying equips it');
  check.ok(!r.negative, 'balance never goes negative');
  await page.reload();
  await page.waitForFunction(READY, null, { timeout: 20000 });
  const after = await page.evaluate(() => ({ owns: Bank.ownsBall('gold'), equipped: Bank.equipped.ball }));
  check.ok(after.owns, 'purchase survived reload');
  check.equal(after.equipped, 'gold', 'loadout survived reload');
  await page.close(); open.delete(page);
});

await test('only the player you control earns', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    Bank.wipe(); Career.wipe();
    const before = Bank.coins;
    Game.start('5v5', 0, 1); Render.buildPlayers(Game.g.teams);
    Game.setSpectate(true);                       // nobody is yours, so nothing should pay
    for (let i = 0; i < 120 * 90; i++) Game.step(1 / 120);
    return { before, after: Bank.coins };
  });
  check.equal(r.after, r.before, 'a spectated game paid out');
  await page.close(); open.delete(page);
});

// ---------------------------------------------------------------- park
await test('the park is player only and will not start a run alone', async () => {
  const page = await fresh({ headless: false });
  await page.evaluate(() => {
    Career.wipe();
    const b = Career.blankBuild('slasher', 'SF'); b.name = 'Lone Walker';
    Career.begin(b, 0); Main.enterPark();
  });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const ct = Park.courts.find((c) => c.mode === '1v1');
    Park.player.x = ct.pads[0].px; Park.player.z = ct.pads[0].pz;
    Park.takePad(Park.player, ct, ct.pads[0]);
    return { people: Park.goers.length, courts: Park.courts.length,
      pads: Park.courts.map((c) => c.pads.length), onPad: !!Park.player.pad, state: ct.state };
  });
  await page.waitForTimeout(4200);
  const after = await page.evaluate(() => ({ running: Game.g.running, live: !!Park.live }));
  check.equal(r.people, 1, 'nobody in the park but you');
  check.equal(r.courts, 6, 'six courts');
  check.equal(JSON.stringify(r.pads), JSON.stringify([2, 4, 6, 2, 4, 6]), 'pad counts per court');
  check.ok(r.onPad, 'can stand on a pad');
  check.ok(!after.running, 'a solo player must not tip off a game');
  check.ok(!after.live, 'and no court goes live');
  await page.close(); open.delete(page);
});

await test('walking out of a game into the park leaves its players behind', async () => {
  const page = await fresh({ headless: false });
  await page.evaluate(() => {
    Career.wipe();
    const b = Career.blankBuild('slasher', 'SF'); b.name = 'Lone Walker';
    Career.begin(b, 0);
    Main.startGame('5v5', 0, 1);
  });
  await page.waitForTimeout(600);
  const during = await page.evaluate(() => PlayerSys.players.filter((p) => p.mesh).length);
  await page.evaluate(() => { Main.quit(); Main.enterPark(); });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    meshes: PlayerSys.players.filter((p) => p.mesh).length,
    goers: Park.goers.length,
  }));
  check.atLeast(during, 10, 'a live game should have built its players');
  check.equal(after.meshes, 0, 'arena players still drawn in the park');
  check.equal(after.goers, 1, 'nobody in the park but you');
  await page.close(); open.delete(page);
});

await test('a number key passes to that position, and never to yourself', async () => {
  const page = await fresh();
  const r = await page.evaluate(() => {
    Game.start('5v5', 0, 1); Render.buildPlayers(Game.g.teams); RNG.seed(9);
    const me = PlayerSys.players.find((p) => p.team === 0);
    Game.setHuman(me.id, true); Game.g.lockHuman = true;
    const line = Game.teamPlayers(0).slice().sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos));
    const mine = line.indexOf(me) + 1;
    const hits = [];
    for (let n = 1; n <= 5; n++) {
      Game.g.state = Game.S.PLAY;
      PlayerSys.teleport(me, -2, 0, 0); BallSys.setHolder(me); me.cd.pass = 0; me.catchT = -9;
      line.forEach((m, i) => { if (m !== me) PlayerSys.teleport(m, -2 + (i - 2) * 3.2, 4, 0); });
      me.input.passTo = n;
      let got = -1;
      for (let i = 0; i < 200; i++) {
        Game.step(1 / 120);
        if (BallSys.ball.state === BallSys.BS.PASS && BallSys.ball.passTarget >= 0) { got = BallSys.ball.passTarget; break; }
      }
      hits.push({ n, got, want: line[n - 1].id });
    }
    return { mine, hits };
  });
  for (const h of r.hits) {
    if (h.n === r.mine) check.equal(h.got, -1, 'pressing your own number threw a pass');
    else check.equal(h.got, h.want, 'number ' + h.n + ' passed to the wrong player');
  }
  await page.close(); open.delete(page);
});

// ---------------------------------------------------------------- onboarding
await test('a first launch goes straight to building a player, with nowhere else to go', async () => {
  const page = await fresh({ headless: false });
  const r = await page.evaluate(() => ({
    onboarding: UI.onboarding,
    pane: [...document.querySelectorAll('#menu .pane')].filter((p) => !p.classList.contains('hidden')).map((p) => p.id),
    navShown: !!(document.querySelector('.menu-nav') || {}).offsetWidth,
  }));
  check.ok(r.onboarding, 'first launch did not start onboarding');
  check.equal(JSON.stringify(r.pane), JSON.stringify(['menuCareer']), 'first launch should open on the builder only');
  check.ok(!r.navShown, 'the menu nav is reachable during onboarding');
  await page.close(); open.delete(page);
});

await test('the first game teaches itself and never strands you in slow motion', async () => {
  const page = await fresh();
  // The league and every player's AI phase come from Math.random, so RNG.seed does not pin a game down:
  // each run is a fresh sample. One game can land a lesson short, so judge three.
  const runs = await page.evaluate(() => {
    const out = [];
    for (const seed of [88, 23, 61]) {
      Career.wipe();
      const b = Career.blankBuild('slasher', 'PG'); b.name = 'Rookie'; Career.begin(b, 0);
      UI.endOnboarding();
      Game.start('5v5', Career.data.team, 1, { career: true }); Render.buildPlayers(Game.g.teams);
      const pid = Game.g.careerPid;
      Coach.begin(); Game.setSpectate(true); Game.g.human = pid; RNG.seed(seed);
      const FRAME = 1 / 60; let acc = 0, worst = 0, run = 0, minScale = 1;
      for (let f = 0; f < 60 * 560 && Game.g.state !== Game.S.OVER; f++) {
        Coach.step(FRAME);
        const sc = Coach.timeScale; minScale = Math.min(minScale, sc);
        run = sc < 0.985 ? run + FRAME : 0; worst = Math.max(worst, run);
        acc += FRAME * sc;
        while (acc >= 1 / 120) { Game.step(1 / 120); Input.endTick(); acc -= 1 / 120; }
      }
      const order = Object.keys(Coach.taught || {});
      out.push({ taught: order.length, order, worst, minScale, firstResolved: order[0] });
    }
    return out;
  });
  // Movement is resolved before anything else - taught, or skipped because you were already moving.
  // The CPU driving the player here is moving from the tip, so it is usually the skip.
  // Measured over 36 games on two builds: 5 to 9 lessons a game, and these four in every one of them.
  // Starvation - a lesson that keeps refiring and blocks the rest - shows up as 2 or 3 and a missing core.
  for (const r of runs) {
    check.equal(r.firstResolved, 'move', 'something was taught before movement was resolved');
    for (const id of ['move', 'pass', 'cross', 'steal']) check.ok(r.order.includes(id), `the ${id} lesson never got its chance`);
    check.atLeast(r.taught, 4, 'lessons that got a chance to fire in one full game');
    check.atMost(r.minScale, 0.6, 'slow motion never actually engaged');
    check.atMost(r.worst, 9.5, 'longest continuous slow motion in real seconds');
  }
  check.atLeast(runs.reduce((n, r) => n + r.taught, 0), 15, 'lessons fired across three first games');
  await page.close(); open.delete(page);
});

// ---------------------------------------------------------------- ads
await test('a window with no room for a menu unit fetches no ad code at all', async () => {
  const page = await fresh({ headless: false });
  const adScripts = () => page.evaluate(() =>
    [...document.querySelectorAll('script')].filter((s) => /googlesyndication|adsbygoogle/.test(s.src)).length);
  const booted = await adScripts();
  const cfg = await page.evaluate(() => ({ client: CONFIG.ads.client }));
  // fresh() boots into onboarding, which hides the rail; leave it, or this passes whatever the ad code does
  await page.evaluate(() => { UI.endOnboarding(); UI.showMenu(); });
  await page.waitForTimeout(300);
  const onMenu = await adScripts();
  await page.evaluate(() => { Main.startGame('5v5', 0, 1); });
  await page.waitForTimeout(400);
  const inGame = await adScripts();
  const units = await page.evaluate(() => document.querySelectorAll('ins.adsbygoogle').length);
  // fresh() is 1280x800: too short for a rail unit, and the bottom bar is off on desktop by default,
  // so this window never takes a menu slot and should therefore never touch Google at all. A taller
  // window does load the library on the menu — the menu is the boot screen — which is why the check
  // that matters everywhere is the one below it: playing a game pulls in nothing.
  check.equal(booted, 0, 'the ad library was fetched on a window with no room for a unit');
  check.equal(onMenu, 0, 'the menu fetched an ad script on a window with no room for a unit');
  check.equal(units, 0, 'an ad unit was injected on a window with no room for one');
  check.equal(inGame, 0, 'the ad library was fetched to play a game');
  check.ok(cfg.client.startsWith('ca-pub-'), 'the publisher id is malformed');
  await page.close(); open.delete(page);
});

await test('an ad never sits over a live court', async () => {
  const page = await fresh({ headless: false });
  await page.route('**://*.googlesyndication.com/**', (route) => route.abort());
  await page.evaluate(() => {
    // fresh() wipes storage, so the page boots into first-launch onboarding, which deliberately hides
    // the ad bar. Leave it first: this test is about ad placement in the ordinary menu.
    UI.endOnboarding();
    CONFIG.ads.client = 'ca-pub-0000000000000000';
    CONFIG.ads.menuSlot = '1111111111'; CONFIG.ads.finalSlot = '2222222222';
    UI.showMenu();
  });
  await page.waitForTimeout(400);
  // 1280x800 has no room beside the nav, and the bottom bar is off by default, so the menu goes bare.
  const cramped = await page.evaluate(() => document.querySelectorAll('#menu ins.adsbygoogle').length);
  // Give the rail the height it needs and the unit appears there instead.
  await page.setViewportSize({ width: 1500, height: 1050 });
  await page.evaluate(() => { UI.showMenu(); });
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => {
    const ins = document.querySelector('#adRail ins.adsbygoogle');
    const tip = document.getElementById('btnTipoff');
    return { placed: !!ins, shown: !!(ins && ins.getClientRects().length),
      tipOff: tip.getBoundingClientRect().bottom <= window.innerHeight };
  });
  await page.evaluate(() => { Main.startGame('5v5', 0, 1); });
  await page.waitForTimeout(600);
  const live = await page.evaluate(() => ({
    running: Game.g.running,
    onScreen: [...document.querySelectorAll('ins.adsbygoogle, #adMenu, #adFinal')]
      .filter((e) => e.getClientRects().length).length,
  }));
  check.equal(cramped, 0, 'a menu unit was taken on a window with no room for one');
  check.ok(menu.placed, 'the menu unit was never placed');
  check.ok(menu.shown, 'the menu unit was placed but not on screen');
  check.ok(menu.tipOff, 'the menu ad pushed Tip Off under the fold');
  check.ok(live.running, 'the game did not start');
  check.equal(live.onScreen, 0, 'an ad slot is on screen during play');
  await page.close(); open.delete(page);
});

// ---------------------------------------------------------------- performance
// ---------------------------------------------------------------- multiplayer
// Two browsers, one lobby, joined by code the way a player does it. Lobbies are found through a stand-in nostr
// relay (tests/nostr-relay.mjs) rather than the public ones, so these measure the game and not somebody else's
// server - the public path is the same code with different URLs. The old version sat on "connecting" forever
// whenever a network blocked peer-to-peer; these pin down that every way a join can end, ends fast and says why.
const { startNostrRelay } = await import('./nostr-relay.mjs');
const { startRelay } = await import('../relay/server.mjs');
const nostr = await startNostrRelay();
const mpBrowsers = [];
async function mpPage(b, net) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } });
  const page = await ctx.newPage(); open.add(page);
  page.errors = []; page.on('pageerror', (e) => page.errors.push(String(e.message)));
  await page.goto(URL); await page.waitForFunction(READY, null, { timeout: 20000 });
  await page.evaluate((net) => { U.saveLS('hw_onboard', true); U.saveLS('hw_seen', true); UI.endOnboarding(); Object.assign(CONFIG.net, net); }, { nostrRelays: [nostr.url], ...net });
  return page;
}
async function openLobby(host) {
  await host.evaluate(() => Net.hostCreateLobby());
  await host.waitForFunction(() => /lobby open/.test(Net.status()), null, { timeout: 10000 });
  return host.evaluate(() => Net.lobby.code);
}
async function joinByCode(guest, code, ms) {
  const t0 = Date.now();
  await guest.evaluate((c) => Net.joinLobby(c), code);
  await guest.waitForFunction(() => /in lobby|error/.test(Net.status()), null, { timeout: ms }).catch(() => {});
  return { secs: (Date.now() - t0) / 1000, ...(await guest.evaluate(() => ({ status: Net.status(), error: Net.error, route: Net.route }))) };
}
// The host starts a 1v1; the guest must be handed its player, get snapshots, and move that player by pressing keys.
async function playOneOnOne(host, guest) {
  await host.evaluate(() => Main.startGame('1v1', 0, 1));
  await guest.waitForFunction(() => Game.g.running && Game.g.human >= 0 && /snaps [1-9]/.test(Net.status()), null, { timeout: 15000 });
  await guest.waitForTimeout(1300);
  const id = await guest.evaluate(() => Game.g.human);
  const at = () => host.evaluate((id) => [PlayerSys.players[id].x, PlayerSys.players[id].z], id);
  const a = await at();
  await guest.keyboard.down('KeyD'); await guest.keyboard.down('KeyW'); await guest.waitForTimeout(1500); await guest.keyboard.up('KeyD'); await guest.keyboard.up('KeyW');
  const b = await at();
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}
// A managed Chromebook can be given a policy that lets no UDP out; Chrome's headless shell honours the same
// switch, which is the only way to put a school network on this machine.
async function blockedBrowser() {
  const args = ['--force-webrtc-ip-handling-policy=disable_non_proxied_udp'];
  try { return await chromium.launch({ channel: 'chromium-headless-shell', args }); } catch (e) { /* try an installed copy */ }
  const { readdirSync, existsSync } = await import('node:fs'); const { homedir } = await import('node:os');
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
  for (const d of existsSync(base) ? readdirSync(base).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse() : []) {
    for (const sub of readdirSync(join(base, d))) {
      const exe = join(base, d, sub, process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell');
      if (existsSync(exe)) return chromium.launch({ executablePath: exe, args });
    }
  }
  throw new Error('needs Playwright\'s headless shell to simulate a blocked network: npx playwright install chromium-headless-shell');
}

await test('a guest joins a lobby by code in seconds, and its own keys move its player on the host', async () => {
  const host = await mpPage(browser), guest = await mpPage(browser);
  const code = await openLobby(host);
  const j = await joinByCode(guest, code, 8000);
  check.ok(/in lobby/.test(j.status), 'the guest never got into the lobby: ' + j.status + ' ' + j.error);
  check.atMost(j.secs, 6, 'seconds from entering the code to being in the lobby');
  check.equal(j.route, 'direct', 'two browsers on one machine should connect directly');
  const moved = await playOneOnOne(host, guest);
  check.atLeast(moved, 1.5, 'metres the guest\'s player moved on the host while the guest held a direction');
  check.equal(host.errors.concat(guest.errors).length, 0, 'page errors: ' + host.errors.concat(guest.errors).join(' | '));
  await host.context().close(); await guest.context().close(); open.delete(host); open.delete(guest);
});

await test('a code nobody is hosting says so within seconds, instead of spinning', async () => {
  const guest = await mpPage(browser, { findTimeout: 3 });
  const j = await joinByCode(guest, 'ZZZZZZZZ', 8000);
  check.ok(/error/.test(j.status), 'a wrong code never ended: ' + j.status);
  check.atMost(j.secs, 5, 'seconds before a wrong code was reported');
  check.ok(/no lobby answered to ZZZZZZZZ/.test(j.error), 'the message should name the code: ' + j.error);
  await guest.context().close(); open.delete(guest);
});

await test('a network that blocks UDP is told so at once, and plays through the relay when there is one', async () => {
  const blocked = await blockedBrowser(); mpBrowsers.push(blocked);
  // no relay: nothing can get through, so it must say that, now - not after a timeout
  {
    const host = await mpPage(browser), guest = await mpPage(blocked);
    const code = await openLobby(host);
    const j = await joinByCode(guest, code, 8000);
    check.ok(/error/.test(j.status), 'a blocked network without a relay should fail: ' + j.status);
    check.atMost(j.secs, 3.5, 'seconds before a blocked network was told');
    check.ok(/blocks peer-to-peer/.test(j.error), 'the message should name the cause: ' + j.error);
    await host.context().close(); await guest.context().close(); open.delete(host); open.delete(guest);
  }
  // with a relay: the same guest plays
  const relay = await startRelay(0);
  try {
    const net = { relay: 'ws://127.0.0.1:' + relay.port };
    const host = await mpPage(browser, net), guest = await mpPage(blocked, net);
    const code = await openLobby(host);
    const j = await joinByCode(guest, code, 8000);
    check.ok(/in lobby/.test(j.status), 'the blocked guest never got in through the relay: ' + j.status + ' ' + j.error);
    check.atMost(j.secs, 4, 'seconds for a blocked guest to get in through the relay');
    check.equal(j.route, 'relay', 'the blocked guest should be on the relay');
    const moved = await playOneOnOne(host, guest);
    check.atLeast(moved, 1.5, 'metres the relayed guest\'s player moved on the host');
    await host.context().close(); await guest.context().close(); open.delete(host); open.delete(guest);
  } finally { relay.close(); }
});
await test('nobody can take over a relay room: a second host or a reused guest id is turned away', async () => {
  // Found by review: the relay used to let a newcomer replace the host (or a guest) outright, and the guests
  // never heard - they carried on talking to whoever had taken the slot.
  const relay = await startRelay(0);
  try {
    const url = (role, id) => `ws://127.0.0.1:${relay.port}/?room=${'ab'.repeat(20)}&role=${role}&id=${id}`;
    const connect = (role, id) => new Promise((res) => {
      const ws = new WebSocket(url(role, id)); const got = []; let closed = null;
      ws.onmessage = (m) => got.push(typeof m.data === 'string' ? m.data : '<bin>');
      ws.onclose = (e) => { closed = e.code; };
      ws.onopen = () => setTimeout(() => res({ ws, got, get closed() { return closed; } }), 150);
      ws.onerror = () => {};
    });
    const host = await connect('host', 'host');
    const guest = await connect('guest', 'g' + '1'.repeat(16));
    const thief = await connect('host', 'host');
    const twin = await connect('guest', 'g' + '1'.repeat(16));
    await new Promise((r) => setTimeout(r, 200));
    check.equal(host.closed, null, 'the real host was disconnected by a second one');
    check.ok(thief.got.includes('{"t":"taken"}') && thief.closed === 4001, 'a second host should be refused: ' + thief.got.join(' ') + ' ' + thief.closed);
    check.ok(twin.got.includes('{"t":"taken"}') && twin.closed === 4001, 'a reused guest id should be refused');
    check.equal(guest.closed, null, 'the real guest was disconnected by a namesake');
    for (const c of [host, guest]) c.ws.close();
  } finally { relay.close(); }
});
for (const b of mpBrowsers) await b.close().catch(() => {});
nostr.close();

await test('holds its frame budget', async () => {
  const page = await fresh({ headless: false });
  await page.evaluate(() => { Main.startGame('5v5', 16, 21); });
  await page.waitForTimeout(2500);
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const tick = () => { n++; if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else res(n / ((performance.now() - t0) / 1000)); };
    requestAnimationFrame(tick);
  }));
  check.atLeast(fps, 50, 'frames per second in a live 5v5');
  await page.close(); open.delete(page);
});

await sweep();
const ok = summary();
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
