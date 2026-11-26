const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], c = await b.newContext({ hasTouch: true, viewport: { width: 400, height: 800 } }), p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.waitForFunction(() => window.ORD && ORD.shake && document.querySelector('.aifab'));
  const vis = (sel) => p.$eval(sel, e => getComputedStyle(e).display !== 'none');
  const motion = (x, y, z) => p.evaluate(([x, y, z]) => window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x, y, z } })), [x, y, z]);
  // без датчика кнопки лишаються на екрані (комп'ютер, тест)
  await p.evaluate(() => window.dispatchEvent(new DeviceMotionEvent('devicemotion', {})));
  assert.ok(await vis('.aifab:not(.qtfab)') && await vis('.qtfab'), 'без даних датчика кнопки видно');
  // датчик ожив: кнопки ховаються
  await motion(0, 0, 9.81); assert.ok(await p.evaluate(() => document.body.classList.contains('shake-on'))); assert.ok(!(await vis('.aifab:not(.qtfab)')) && !(await vis('.qtfab')), 'кнопки сховано');
  // ходьба/легкі рухи не спрацьовують
  for (let i = 0; i < 12; i++) { await motion(2 * (i % 2 ? 1 : -1), 1, 9.8 + (i % 2 ? 2 : -2)); await p.waitForTimeout(100); }
  assert.strictEqual(await p.$$eval('.shk', e => e.length), 0, 'не реагує на ходьбу');
  // струс: 4+ різких піків за <0,8 с
  for (let i = 0; i < 7; i++) { await motion(i % 2 ? 24 : -24, 3, 9.8); await p.waitForTimeout(110); }
  await p.waitForSelector('.shk.tr'); assert.strictEqual(await p.$$eval('.shk', e => e.length), 2, 'випали два значки');
  await p.waitForTimeout(1600); const ys = await p.$$eval('.shk', els => els.map(e => e.getBoundingClientRect().top)); assert.ok(ys.every(y => y > 100 && y < 800), 'значки лягли на екран ' + ys);
  // дотик: відкриває ШІ й значок зникає
  await p.evaluate(() => ORD.shake.state.icons.forEach(o => { if (o.kind === 'ai') o.el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }));
  await p.waitForSelector('.aipop:not([hidden])'); await p.waitForFunction(() => document.querySelectorAll('.shk').length === 1);
  // недоторканий розчиняється
  await p.evaluate(() => { ORD.shake.clear(); ORD.shake.state.life = [300, 400]; ORD.shake.drop(); });
  await p.waitForSelector('.shk.out'); await p.waitForFunction(() => document.querySelectorAll('.shk').length === 0, null, { timeout: 4000 });
  // режим «кнопки завжди»
  await p.evaluate(() => { ORD.state.settings.shake = 'off'; ORD.shake.apply(); }); assert.ok(await vis('.aifab:not(.qtfab)'), 'у режимі off кнопки видно');
  // налаштування
  await p.evaluate(() => { ORD.go('settings'); }); await p.waitForSelector('#shm'); assert.ok(/Датчик працює/.test(await p.textContent('#shst')));
  await p.selectOption('#shm', 'auto'); assert.ok(!(await vis('.aifab:not(.qtfab)'))); await p.selectOption('#shs', '3'); assert.strictEqual(await p.evaluate(() => ORD.state.settings.shakeSens), 3);
  await p.click('#shgo'); await p.waitForSelector('.shk');
  assert.deepStrictEqual(errs, []); await b.close(); srv.close(); console.log('shake OK');
})().catch(e => { console.error(e); process.exit(1); });
