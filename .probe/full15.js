async (page) => {
  await page.goto('http://localhost:8765/index.html');
  await page.waitForFunction("typeof Game !== 'undefined' && !document.getElementById('boot')", null, { timeout: 20000 });
  return await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    Career.wipe();
    Game.settings.quarterLen = 120;
    Render.buildArena(TEAMS[0], TEAMS[1]);
    const tot = { fga: 0, fgm: 0, tpa: 0, tpm: 0, ast: 0, to: 0, pts: 0 };
    const shotDef = [];
    for (const seed of [11,202,3003,40004,555555,7,91,1234,60606,808,42,99999,31337,2718,161803]) {
      Game.start('5v5', 0, 1); Render.buildPlayers(Game.g.teams); Game.setSpectate(true); RNG.seed(seed);
      const ball = BallSys.ball, BS = BallSys.BS, P = PlayerSys.players;
      let was = ball.state;
      for (let i = 0; i < 120 * 180; i++) {
        Game.step(1 / 120);
        if (ball.state === BS.SHOT && was !== BS.SHOT && ball.shot.kind === 'jumper') {
          const s = ball.shot;
          let nd = 99; for (const q of P) { if (q.team === s.team) continue; const d = U.dist(q.x, q.z, s.x, s.z); if (d < nd) nd = d; }
          shotDef.push(nd);
        }
        was = ball.state;
      }
      for (const p of P) { tot.fga += p.stats.fga; tot.fgm += p.stats.fgm; tot.tpa += p.stats.tpa; tot.tpm += p.stats.tpm; tot.ast += p.stats.ast; tot.to += p.stats.to; tot.pts += p.stats.pts; }
    }
    const pctOf = (f) => (100 * shotDef.filter(f).length / shotDef.length).toFixed(0) + '%';
    return {
      fga: tot.fga, fgPct: +(100 * tot.fgm / tot.fga).toFixed(1),
      threeRate: +(100 * tot.tpa / tot.fga).toFixed(1),
      tpPct: tot.tpa ? +(100 * tot.tpm / tot.tpa).toFixed(1) : 0,
      assists: tot.ast, turnovers: tot.to, ptsPerRun: +(tot.pts / 15).toFixed(1),
      jumpers: shotDef.length, tightUnder1_5m: pctOf((d) => d < 1.5), open2mPlus: pctOf((d) => d >= 2),
    };
  });
}
