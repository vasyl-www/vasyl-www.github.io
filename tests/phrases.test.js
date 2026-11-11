const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#home'); await p.waitForSelector('.phcard .phrow');
  assert.ok(await p.$$eval('.phcard .phrow', e => e.length) >= 3, 'є фрази на головній');
  // ранок: дата й погода
  const m = await p.evaluate(() => { const RealD = Date; const f = new RealD(2026, 10, 11, 7, 30); const r = ORD.phrases.now.call(null); return null; });
  await p.clock.setFixedTime(new Date(2026, 10, 11, 7, 30)); await p.reload(); await p.waitForSelector('.phcard .phwx');
  assert.ok(/onsdag 11\. november/.test(await p.textContent('.phcard')), 'дата норвезькою');
  await p.click('.phcard [data-pw="snow"]'); await p.waitForSelector('.phcard .phrow');
  assert.ok(/Det snør i dag/.test(await p.textContent('.phcard')), 'погода: сніг');
  // додавання фрази у словник
  const before = await p.evaluate(() => Object.keys(ORD.state.cards).length); await p.click('.phcard [data-pa="0"]');
  assert.strictEqual(await p.evaluate(() => Object.keys(ORD.state.cards).length), before + 1);
  // побутова тема вдень
  await p.clock.setFixedTime(new Date(2026, 10, 11, 14, 0)); await p.reload(); await p.waitForSelector('.phcard .phrow');
  assert.ok(!(await p.$('.phcard .phwx')), 'вдень без вибору погоди');
  // бот
  await p.evaluate(() => ORD.openAsk()); await p.waitForSelector('.aipop .phrow');
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('phrases.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
