/* «Мозок»: активний словник, активація з пам'яті, що робити далі, хаби вкладок */
const { chromium } = require('playwright'); const assert = require('assert');
const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.waitForSelector('#nav button');
  assert.strictEqual(await p.$$eval('#nav button[data-v]', e => e.length), 6, '6 вкладок');
  const names = await p.$$eval('#nav button[data-v]', e => e.map(x => x.getAttribute('data-v'))); assert.deepStrictEqual(names, ['translate', 'home', 'read', 'learn', 'practice', 'profile']);
  // модель
  const r = await p.evaluate(() => {
    const ids = ORD.words.slice(0, 4).map(w => w.id), now = Date.now(), D = 864e5; ORD.state.log = [];
    ids.forEach(id => { ORD.ensureCard(id); const c = ORD.state.cards[id]; c.st = 'review'; c.ivl = 5; c.due = now - 1000; });
    const L = (id, k, g, ago) => ORD.state.log.push({ t: now - ago * D, id, g, ms: 1000, st: 'review', ivl: 5, k });
    L(ids[0], 'type', 3, 2); L(ids[0], 'type', 3, 1);                 // активне: 2 дні поспіль друк
    L(ids[1], 'recog', 3, 2); L(ids[1], 'recog', 3, 1); L(ids[1], 'type', 3, 1); // 1 день друку: лише впізнаю
    L(ids[2], 'type', 3, 2); L(ids[2], 'type', 1, 1);                  // остання спроба невдала
    ORD.state.cards[ids[3]].st = 'new'; ORD.state.cards[ids[3]].ivl = 0;
    const m = ORD.mind.model(); return { ids, a: m.active.map(x => x.id), p: m.passive.map(x => x.id), mt: m.met.map(x => x.id) };
  });
  assert.ok(r.a.includes(r.ids[0]) && !r.a.includes(r.ids[1]) && !r.a.includes(r.ids[2]), 'активне лише слово з 2 днями успішного друку: ' + JSON.stringify(r));
  assert.ok(r.mt.includes(r.ids[3]), 'нова картка = нове');
  // вживання у власному тексті додає день відтворення
  const u = await p.evaluate((ids) => { const w = ORD.wordById[ids[1]]; const n = ORD.mind.used('Jeg liker ' + w.no + ' veldig.', []); const m = ORD.mind.model(); return { n, active: m.active.some(x => x.id === ids[1]) }; }, r.ids);
  assert.ok(u.n >= 1 && u.active, 'правильне вживання у тексті робить слово активним: ' + JSON.stringify(u));
  const u2 = await p.evaluate((ids) => { const w = ORD.wordById[ids[2]]; ORD.mind.used('Jeg liker ' + w.no + ' veldig.', [w.no]); return ORD.mind.model().active.some(x => x.id === ids[2]); }, r.ids);
  assert.strictEqual(u2, false, 'слово з помилкою не рахується');
  // черга активації виключає активні, початок сесії друку
  const q = await p.evaluate((ids) => ORD.mind.activation(), r.ids); assert.ok(!q.includes(r.ids[0]) && !q.includes(r.ids[1]) && q.includes(r.ids[2]), 'черга активації');
  // головна
  await p.evaluate(() => ORD.go('home')); await p.waitForSelector('#hgo'); const ht = await p.textContent('#main'); assert.ok(ht.includes('Найкраща наступна дія') && ht.includes('Активний словник'), 'головна');
  await p.click('#hmind #mact'); await p.waitForSelector('.sess-head');
  await p.evaluate((id) => { ORD.go('learn'); const box = document.querySelector('#sess'); ORD.startSession(box, { ids: [id], force: 'type' }); }, r.ids[2]); await p.waitForSelector('.sess-head'); assert.ok((await p.textContent('.sess-head')).includes('Напиши'), 'сесія активації: друк із пам’яті');
  // хаби
  await p.evaluate(() => ORD.go('err')); await p.waitForSelector('.hubbar'); assert.strictEqual(await p.$$eval('.hubbar [data-hb]', e => e.length), 3); assert.ok((await p.textContent('#main')).includes('Тренажер помилок'));
  await p.click('[data-hb=gm]'); await p.waitForTimeout(200); assert.ok(await p.$('.hubbar .on'), 'ігри в хабі');
  await p.evaluate(() => ORD.go('poems')); await p.waitForSelector('#pgrid .story'); assert.ok((await p.$$('#pgrid .story')).length >= 20);
  await p.evaluate(() => ORD.go('read')); await p.waitForSelector('#lgrid, .lib');
  // старі вкладки за перемикачем
  await p.evaluate(() => ORD.go('profile')); await p.waitForSelector('#plg'); await p.check('#plg'); assert.strictEqual(await p.$$eval('#nav button[data-v]', e => e.length), 9, 'старі вкладки показані');
  await p.uncheck('#plg'); assert.strictEqual(await p.$$eval('#nav button[data-v]', e => e.length), 6);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 421, 'без горизонтального скролу');
  await b.close(); srv.close(); if (errs.length) { console.error(errs); process.exit(1); } console.log('mind.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
