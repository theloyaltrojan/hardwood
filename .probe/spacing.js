async (page) => {
  await page.goto('http://localhost:8765/index.html');
  await page.waitForFunction("typeof Game !== 'undefined' && !document.getElementById('boot')", null, { timeout: 20000 });
  return await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    Career.wipe();
    Game.settings.quarterLen = 120;
    Render.buildArena(TEAMS[0], TEAMS[1]);
    const shotDef = [], offBallDef = [], passes = { n: 0 }, roles = {};
    let fga = 0, fgm = 0, tpa = 0, samples = 0;
    for (const seed of [11, 202, 3003, 40004, 555555]) {
      Game.start('5v5', 0, 1); Render.buildPlayers(Game.g.teams); Game.setSpectate(true); RNG.seed(seed);
      const ball = BallSys.ball, BS = BallSys.BS, P = PlayerSys.players;
      let was = ball.state;
      for (let i = 0; i < 120 * 180; i++) {
        Game.step(1 / 120);
        // how open are the four men without the ball, on average?
        if (i % 30 === 0 && Game.g.state === Game.S.PLAY && ball.holder >= 0) {
          const h = P[ball.holder];
          for (const p of P) {
            if (p.team !== h.team || p === h) continue;
            let nd = 99; for (const q of P) { if (q.team === p.team) continue; const d = U.dist(q.x, q.z, p.x, p.z); if (d < nd) nd = d; }
            offBallDef.push(nd); samples++;
            roles[p.ai.role || '?'] = (roles[p.ai.role || '?'] || 0) + 1;
          }
        }
        if (ball.state === BS.PASS && was !== BS.PASS) passes.n++;
        if (ball.state === BS.SHOT && was !== BS.SHOT && ball.shot.kind === 'jumper') {
          const s = ball.shot;
          let nd = 99; for (const q of P) { if (q.team === s.team) continue; const d = U.dist(q.x, q.z, s.x, s.z); if (d < nd) nd = d; }
          shotDef.push(nd);
        }
        was = ball.state;
      }
      for (const p of PlayerSys.players) { fga += p.stats.fga; fgm += p.stats.fgm; tpa += p.stats.tpa; }
    }
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const pct = (a, f) => (100 * a.filter(f).length / a.length).toFixed(0) + '%';
    return {
      shots: shotDef.length,
      shotsWithDefenderUnder1_5m: pct(shotDef, (d) => d < 1.5),
      shotsOpen2mPlus: pct(shotDef, (d) => d >= 2),
      avgDefenderAtShot: +avg(shotDef).toFixed(2),
      offBallAvgSpace: +avg(offBallDef).toFixed(2),
      offBallOpen2mPlus: pct(offBallDef, (d) => d >= 2),
      passesPerGame: +(passes.n / 5).toFixed(1),
      fgPct: +(100 * fgm / fga).toFixed(1), threeRate: +(100 * tpa / fga).toFixed(1),
      roles,
    };
  });
}
