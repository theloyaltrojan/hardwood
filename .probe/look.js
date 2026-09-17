async (page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('http://localhost:8765/index.html');
  await page.waitForFunction("typeof Game !== 'undefined' && !document.getElementById('boot')", null, { timeout: 20000 });
  await page.evaluate(() => { Career.wipe(); Game.settings.shadows = true; Game.saveSettings(); });
  await page.evaluate(() => { Main.startGame('5v5', 0, 1); });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '.playwright-mcp/look-wide.png' });
  // a close look at the players
  await page.evaluate(() => {
    const p = PlayerSys.players[0], c = CameraSys.cam;
    window.__hold = true;
    const step = () => { if (!window.__hold) return; c.position.set(p.x + 3.2, 2.0, p.z + 3.4); c.lookAt(p.x, 1.1, p.z); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '.playwright-mcp/look-close.png' });
  const info = await page.evaluate(() => ({
    shadows: Game.settings.shadows,
    rendererShadows: Render.renderer.shadowMap.enabled,
    drawCalls: Render.renderer.info.render.calls,
    triangles: Render.renderer.info.render.triangles,
    lights: (() => { let n = 0; Render.scene.traverse((o) => { if (o.isLight) n++; }); return n; })(),
  }));
  return info;
}
