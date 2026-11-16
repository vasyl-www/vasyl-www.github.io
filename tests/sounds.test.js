const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#practice'); await p.waitForSelector('[data-hb="vb"]');
  await p.addStyleTag({ content: '.aipop{display:none!important}' });
  // дані: унікальні інфінітиви, три форми в кожному, клас g
  const d = await p.evaluate(() => { const v = ORD.verbs, u = new Set(v.map(x => x.inf)); return { n: v.length, uniq: u.size, bad: v.filter(x => !x.inf || !x.pres || !x.past || !x.perf || !x.ua || !/^[siw]$/.test(x.g)).length, strong: v.filter(x => x.g !== 'w').length }; });
  assert.ok(d.n >= 120 && d.uniq === d.n && d.bad === 0 && d.strong >= 50, JSON.stringify(d));
  // судження: har-префікс, альтернатива, æøå-толерантність
  const j = await p.evaluate(() => [ORD.verbtr.judge('har gått', 'gått', [], true), ORD.verbtr.judge('stod', 'sto', ['stod'], true), ORD.verbtr.judge('gatt', 'gått', [], true), ORD.verbtr.judge('gikk', 'gått', [], true), ORD.verbtr.judge('fant', 'fant', [], true), ORD.verbtr.judge('provde', 'prøvde', [], true)]);
  assert.deepStrictEqual(j, [2, 2, 1, 0, 2, 1], 'judge ' + j);
  // тренажер: усі правильно
  await p.click('[data-hb="vb"]'); await p.waitForSelector('#vgo'); await p.click('#vgo');
  for (let i = 0; i < 10; i++) {
    await p.waitForSelector('#vp'); const inf = (await p.textContent('.stage .no')).replace(/^å /, '');
    const v = await p.evaluate(x => ORD.verbs.find(y => y.inf === x), inf);
    await p.fill('#vp', v.past); await p.fill('#vf', 'har ' + v.perf); await p.click('button[type=submit]'); await p.waitForSelector('#vn'); assert.ok(await p.$('.feedback.good'), 'правильно: ' + inf); await p.click('#vn');
  }
  assert.ok(/10 \/ 10/.test(await p.textContent('#vbox')), 'підсумок 10/10');
  const st = await p.evaluate(() => ({ n: Object.keys(ORD.state.verbtr).length, pr: (ORD.state.practice.verbs || []).length }));
  assert.ok(st.n === 10 && st.pr === 10, JSON.stringify(st));
  // неправильна відповідь → помилка записана
  await p.click('#va'); await p.waitForSelector('#vp'); const inf2 = (await p.textContent('.stage .no')).replace(/^å /, ''); await p.fill('#vp', 'xxx'); await p.fill('#vf', 'yyy'); await p.click('button[type=submit]'); await p.waitForSelector('.feedback.bad');
  assert.strictEqual(await p.evaluate(x => ORD.state.verbtr[x].bad, inf2), 1);
  // таблиця й пошук
  await p.click('[data-hb="vb"]'); await p.waitForSelector('#vtb'); await p.click('#vtb'); await p.fill('#vq', 'gikk'); assert.strictEqual(await p.$$eval('.vtab tbody tr', e => e.length), 1);
  // Звуки
  await p.click('[data-hb="sn"]'); await p.waitForSelector('#sl'); await p.click('#sl');
  for (let i = 0; i < 10; i++) {
    await p.waitForSelector('#qo .opt'); const w = await p.textContent('#sbox .stage .no'); const ans = await p.evaluate(x => ORD.sounds.LEN.find(y => y[0] === x)[1], w);
    await p.click('#qo [data-k="' + ans + '"]'); await p.waitForSelector('#qn'); assert.ok(await p.$('.feedback.good'), 'довжина ' + w); await p.click('#qn');
  }
  assert.ok(/10 \/ 10/.test(await p.textContent('#sbox')), 'довжина 10/10');
  await p.click('#qa'); await p.waitForSelector('#qo .opt'); assert.strictEqual(await p.$$eval('#qo .opt', e => e.length), 2);
  // читання: 4 варіанти, помилка підсвічує правильну
  await p.click('[data-hb="sn"]'); await p.waitForSelector('#sr'); await p.click('#sr'); await p.waitForSelector('#qo .opt'); assert.strictEqual(await p.$$eval('#qo .opt', e => e.length), 4);
  const w2 = await p.textContent('#sbox .stage .no'), r2 = await p.evaluate(x => ORD.sounds.RD.find(y => y[0] === x)[1], w2), wrong = ['sh', 'ch', 'j', 'sk'].find(k => k !== r2);
  await p.click('#qo [data-k="' + wrong + '"]'); await p.waitForSelector('.feedback.bad'); assert.ok(await p.$('#qo .opt.right[data-k="' + r2 + '"]'));
  // дані квізів: однозначні (немає дублікатів слів) і відповіді з дозволеного набору
  const q = await p.evaluate(() => ({ l: ORD.sounds.LEN.every(x => 'ls'.includes(x[1])), r: ORD.sounds.RD.every(x => ['sh', 'ch', 'j', 'sk'].includes(x[1])), dup: new Set(ORD.sounds.LEN.map(x => x[0])).size === ORD.sounds.LEN.length && new Set(ORD.sounds.RD.map(x => x[0])).size === ORD.sounds.RD.length, pairs: ORD.pairs.length }));
  assert.ok(q.l && q.r && q.dup && q.pairs >= 14, JSON.stringify(q));
  // Слухати пари з розділу
  await p.click('#sp'); await p.waitForSelector('#p1');
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('sounds.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
