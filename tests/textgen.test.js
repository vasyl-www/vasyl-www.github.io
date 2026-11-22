const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  let calls = 0, bad = false;
  await p.route('https://generativelanguage.googleapis.com/**', (r) => {
    const u = r.request().url(); if (/\/models\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"models":[]}' });
    calls++; const body = JSON.stringify(JSON.parse(r.request().postData())); const txt = JSON.parse('"' + /"text":"((?:[^"\\]|\\.)*)"/.exec(body.replace(/^.*"contents"/, '"contents"'))[1] + '"');
    const known = (/KNOWN: ([^\n]*)/.exec(txt) || [, ''])[1].split(', ').filter(Boolean), nw = ((/NEW: ([^\n]*)/.exec(txt) || [, ''])[1]).split('; ').map(x => x.replace(/^(en|ei|et) /, '').replace(/ \(.*$/, '')).filter(Boolean);
    const s = []; for (let i = 0; i < 8; i++) { const ws = known.slice(i * 3, i * 3 + 3).concat(i < nw.length ? [nw[i]] : []); s.push([ws.join(' ') + '.', 'Речення ' + i]); }
    if (bad && calls === 1) s[0][0] = 'zzxqv wwkrt plmnb ghjkl yyttr.';
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Test', s, extra: [] }) }] } }] }) });
  });
  await p.goto(base); await p.waitForFunction(() => window.ORD && ORD.textgen); await p.addStyleTag({ content: '.aipop{display:none!important}' });
  await p.evaluate(() => { ORD.keys.set('gemini', 'GEMKEY123456789', { persist: false, model: 'gemini-3.8-flash', free: true }); ORD.words.filter(w => !w.multi).slice(0, 40).forEach(w => ORD.addWord(w)); });
  // покриття: службові + відомі + цільові + невідомі
  const cv = await p.evaluate(() => { const ws = ORD.words.filter(w => !w.multi); const k = ORD.state.cards[Object.keys(ORD.state.cards)[0]] ? ORD.wordById[Object.keys(ORD.state.cards)[0]].no : 'x'; const unk = ORD.words.filter(w => !ORD.state.cards[w.id] && !w.multi && w.no.length > 5)[0]; return { a: ORD.textgen.coverage('Jeg ' + k + ' og zzxqv.', []), b: ORD.textgen.coverage('Jeg ' + unk.no + '.', [unk.id]), c: ORD.textgen.coverage('Jeg ' + unk.no + '.', []) }; });
  assert.ok(cv.a.unknownShare > 0.2 && cv.a.knownShare > 0.5, 'невідоме слово лишається невідомим'); assert.ok(cv.b.targetShare > 0.3 && cv.b.unknownShare === 0, 'цільове слово не невідоме'); assert.ok(cv.c.unknownShare > 0.3);
  // перегляд слова без картки теж «відоме»
  const seen = await p.evaluate(() => { const w = ORD.words.filter(w => !ORD.state.cards[w.id] && !w.multi && w.no.length > 5)[3]; (ORD.state.seenW = ORD.state.seenW || {})[w.id] = Date.now(); return ORD.textgen.coverage('Jeg ' + w.no + '.', []).unknownShare; }); assert.strictEqual(seen, 0, 'бачене слово = відоме');
  // генерація через Читалку
  await p.evaluate(() => ORD.go('read')); await p.waitForSelector('#tgo'); const cardsBefore = await p.evaluate(() => Object.keys(ORD.state.cards).length);
  await p.click('#tgo'); await p.waitForSelector('.rtext .rw'); assert.strictEqual(calls, 1);
  const st = await p.evaluate(() => ORD.state.myStories[0]); assert.ok(st.tg && st.s.length === 8 && st.tg.cov.unknown <= 0.03, 'покриття перевірене кодом');
  assert.ok(await p.evaluate(() => Object.keys(ORD.state.cards).length) > cardsBefore, 'нові слова в картках');
  assert.ok(/створено ШІ/.test(await p.textContent('.cov')));
  // ергономіка: колонка і розмір
  const w1 = await p.$eval('.rtext', e => e.getBoundingClientRect().width); assert.ok(w1 <= 420);
  const fs0 = await p.$eval('.rtext', e => parseFloat(getComputedStyle(e).fontSize)); await p.click('#rfp'); assert.strictEqual(await p.$eval('.rtext', e => parseFloat(getComputedStyle(e).fontSize)), fs0 + 2);
  const hs = await p.$$eval('#rdone,#rfp,[data-rate]', els => els.map(e => e.getBoundingClientRect().height)); assert.ok(hs.every(h => h >= 44), 'цілі ≥44px ' + hs);
  // підглядання та оцінка
  await p.click('.rtext .rw >> nth=0'); await p.waitForSelector('.popover'); await p.click('.popover [data-x]');
  await p.click('[data-rate="easy"]'); await p.click('#rdone');
  const rd = await p.evaluate(() => ORD.state.read[ORD.state.myStories[0].id]); assert.ok(rd.n > 10 && rd.lk >= 1 && rd.rate === 'easy' && rd.ms >= 0);
  const rep = await p.evaluate(() => ORD.tele.report({}).reading); assert.ok(rep && rep.textsRead === 1 && rep.selfRating.easy === 1 && rep.generatedTexts === 1 && rep.lookupsPer100Words > 0);
  // збій покриття: друга спроба
  bad = true; calls = 0; await p.evaluate(() => ORD.go('learn')); await p.evaluate(() => ORD.go('read')); await p.waitForSelector('#tgo'); await p.click('#tgo'); await p.waitForFunction(() => ORD.state.myStories.length === 2);
  assert.strictEqual(calls, 2, 'повторна спроба при >3% невідомих');
  // денний ліміт
  await p.evaluate(() => { ORD.state.settings.tgCap = 2; ORD.save(); }); await p.evaluate(() => ORD.go('learn')); await p.evaluate(() => ORD.go('read')); await p.waitForSelector('#tgo'); await p.click('#tgo');
  await p.waitForFunction(() => /ліміт/.test(document.querySelector('#tgm').textContent));
  assert.deepStrictEqual(errs, []); await b.close(); srv.close(); console.log('textgen OK');
})().catch(e => { console.error(e); process.exit(1); });
