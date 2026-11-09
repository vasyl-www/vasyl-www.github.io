/* Помилки: правила, інтервал довіри, тренажер, розділення лексики й граматики */
const { chromium } = require('playwright'); const assert = require('assert');
const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#read'); await p.waitForSelector('#lgrid');
  const bad = ['I dag jeg jobbet.', 'Jeg bor på Oslo.', 'Jeg har ikke aldri vært der.', 'Jeg kan går.', 'Kan du går hjem?', 'Et stor hus.', 'En stort bil.', 'Jeg har spiste middag.', 'Jeg har bodd i Norge for to år.', 'Jeg må å være hjemme.', 'Jeg har spist middag i går.', 'Om dag jobber jeg.', 'Jeg liker å bor her.', 'På mandag jeg går.'];
  const good = ['Da jeg kom hjem, spiste jeg.', 'For to år siden bodde jeg i Polen.', 'Jeg har spist.', 'I dag jobbet jeg.', 'Jeg vil ha kaffe.', 'Jeg bor i Tromsø.', 'Et stort hus.', 'En stor bil.', 'Jeg kan gå hjem.', 'Nå som jeg er her, går det bra.', 'Jeg har bodd i Norge i to år.', 'Jeg betaler for tre dager.', 'I dag er jeg trøtt.', 'Her bor jeg.', 'Jeg liker å bo her.'];
  const res = await p.evaluate(({ bad, good }) => ({ miss: bad.filter(t => !ORD.rules.check(t).length), fp: good.filter(t => ORD.rules.check(t).length), v2: ORD.rules.check('I dag jeg jobbet.')[0].right, w: ORD.errlab.wilson(5, 10) }), { bad, good });
  assert.deepStrictEqual(res.miss, [], 'правила бачать усі погані: ' + res.miss); assert.deepStrictEqual(res.fp, [], 'без хибних спрацювань: ' + res.fp);
  assert.strictEqual(res.v2, 'I dag jobbet jeg'); assert.ok(Math.abs(res.w[0] - 0.237) < 0.01 && Math.abs(res.w[1] - 0.763) < 0.01, 'інтервал Вілсона');
  await p.evaluate(() => ORD.go('err')); await p.waitForSelector('#ckrl');
  const txt = await p.textContent('#view, main, body'); assert.ok(txt.includes('Забуті слова за частинами мови') && txt.includes('Граматика: типи помилок') && txt.includes('Тренажер помилок'), 'розділи на місці');
  await p.fill('#ck', 'I dag jeg jobbet. Jeg kan går.'); await p.click('#ckrl'); await p.waitForFunction(() => ORD.state.err && ORD.state.err.filter(e => e.src === 'rules').length >= 2);
  assert.ok(await p.evaluate(() => ORD.state.errW && ORD.state.errW.length >= 1 && ORD.state.errW[0].n === 7), 'слова пораховано');
  await p.waitForSelector('#ckr .corr'); assert.ok((await p.textContent('#ckr')).includes('jobbet jeg'), 'виправлення показано');
  await p.click('#labgo'); let guard = 0;
  while (!(await p.$('#labdn')) && guard++ < 80) {
    if (await p.$('.labo')) await p.click('.labo >> nth=0'); else if (await p.$('#labin')) { await p.fill('#labin', 'x'); await p.press('#labin', 'Enter'); } else if (await p.$('#labck')) await p.click('#labck');
    await p.waitForSelector('#labnx'); await p.click('#labnx');
  }
  assert.ok(await p.$('#labdn'), 'сесія завершилась'); assert.ok(await p.evaluate(() => ORD.state.errLab.log.length >= 5 && ORD.state.errLab.sessions === 1), 'журнал вправ збережено');
  await p.click('#labdn'); assert.ok((await p.textContent('#labtr')).includes('n='), 'динаміка з інтервалом довіри');
  const st = await p.evaluate(() => { const it = { k: 'tst', type: 'order' }, out = []; ORD.errlab._rec(it, true); out.push(JSON.stringify(ORD.state.errLab.items.tst)); const d1 = ORD.state.errLab.items.tst.due - Date.now(); ORD.errlab._rec(it, true); const d2 = ORD.state.errLab.items.tst.due - Date.now(); ORD.errlab._rec(it, true); const r = ORD.state.errLab.items.tst.retired; ORD.errlab._rec({ k: 'tst2', type: 'order' }, true); ORD.errlab._rec({ k: 'tst2', type: 'order' }, false); return { d1, d2, r, s2: ORD.state.errLab.items.tst2.streak }; });
  assert.ok(st.d1 > 0.9 * 864e5 && st.d1 <= 864e5 && st.d2 > 2.9 * 864e5 && st.d2 <= 3 * 864e5 && st.r === true && st.s2 === 0, 'інтервали 1, 3 дні, закриття на 3-й раз, помилка скидає серію: ' + JSON.stringify(st));
  // закриття після 3 правильних підряд
  const ret = await p.evaluate(() => { const k = Object.keys(ORD.state.errLab.items)[0]; const it = ORD.state.errLab.items[k]; return it ? it.streak : -1; }); assert.ok(ret >= 0);
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 421, 'без горизонтального скролу');
  await b.close(); srv.close(); if (errs.length) { console.error(errs); process.exit(1); } console.log('errors.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
