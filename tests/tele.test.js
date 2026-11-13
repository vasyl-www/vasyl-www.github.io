const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.waitForSelector('#nav button'); await p.addStyleTag({ content: '.aipop{display:none!important}' });
  // дії: натискання, пауза для тікера
  await p.click('#nav button[data-v="read"]'); await p.mouse.click(5, 5); await p.waitForTimeout(2600);
  const d = await p.evaluate(() => { const t = ORD.tele.today(); return { vis: t.vis, act: t.act, taps: t.taps, dead: t.dead, zones: Object.keys(t.zones).length, views: t.views }; });
  assert.ok(d.vis >= 1, 'візит'); assert.ok(d.act >= 2, 'активні секунди: ' + d.act); assert.ok(d.taps['v'] >= 1, 'тап по навігації без тексту: ' + JSON.stringify(d.taps)); assert.ok(d.zones >= 1);
  assert.ok(d.views.read >= 1, 'час по розділу: ' + JSON.stringify(d.views));
  // відповіді: журнал + підказки/затримка
  await p.evaluate(() => { const ids = ORD.words.slice(0, 6).map(w => w.id); ids.forEach((id, i) => { ORD.ensureCard(id); [3, 3, 1, 2].forEach((g, k) => ORD.state.log.push({ t: Date.now() - (14 - k * 7) * 864e5 + i, id, g, ms: 1200 + k * 500, st: 'review', ivl: 7, k: i % 2 ? 'type' : 'recog' })); }); ORD.tele.answer({ typedQ: true, hint: true, fk: 900 }); ORD.tele.answer({ typedQ: true, hint: false, fk: 1100 }); });
  const r = await p.evaluate(() => ORD.tele.report({ days: 60, words: true }));
  assert.strictEqual(r.schema, 'ord2-usage-report/1'); assert.ok(r.limits.length >= 4 && r.glossary.recall7);
  assert.ok(r.learning.answers.n >= 24 && r.learning.byKind.length >= 2, 'розбивка за видами'); assert.ok(r.learning.recall7.n >= 1, 'recall7: ' + JSON.stringify(r.learning.recall7));
  assert.strictEqual(r.learning.typed.hintsPer100, 50); assert.strictEqual(r.learning.typed.firstKeyMs, 1000);
  assert.ok(r.usage.totals.activeMin >= 0 && Array.isArray(r.usage.hourOfDayMin) && r.usage.hourOfDayMin.length === 24);
  // жодного вільного тексту: у звіті немає слів, окрім явно ввімкнених
  const j = JSON.stringify(r), w0 = await p.evaluate(() => ORD.words[0].no); assert.ok(!r.hardestWords || Array.isArray(r.hardestWords));
  const r2 = await p.evaluate(() => ORD.tele.report({ days: 60 })); assert.ok(!('hardestWords' in r2), 'слова лише за згодою');
  // тап по відповідях не пише тексту
  const keys = await p.evaluate(() => Object.keys(ORD.tele.today().taps)); assert.ok(keys.every(k => k.length <= 25));
  // промпт + синхронізація (по пристроях) + панель
  assert.ok((await p.evaluate(() => ORD.tele.text({ prompt: true }))).startsWith('Ти аналітик'));
  await p.evaluate(() => ORD.go('profile')); await p.waitForSelector('#tCopyP'); assert.ok(/візитів/.test(await p.textContent('#tMsg') + await p.textContent('body')));
  await p.click('#tOn'); assert.strictEqual(await p.evaluate(() => ORD.state.settings.tele), false);
  const before = await p.evaluate(() => ORD.tele.today().act); await p.waitForTimeout(2200); assert.strictEqual(await p.evaluate(() => ORD.tele.today().act), before, 'вимкнено: нічого не рахується');
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('tele.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
