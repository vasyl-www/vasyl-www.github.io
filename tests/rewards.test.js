/* Синапси, медалі/ресурси, приклади */
const { chromium } = require('playwright'); const assert = require('assert');
const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.waitForSelector('#nav button');
  // медалі
  const m = await p.evaluate(() => { const M = ORD.rewards.medal; return [M({ correct: true, g: 3 }), M({ correct: true, g: 2 }), M({ correct: true, g: 3, hint: true }), M({ correct: false, partial: 0.6 }), M({ correct: false, partial: 0.3 }), M({ correct: false })]; });
  assert.deepStrictEqual(m, ['gold', 'silver', 'silver', 'copper', 'iron', 'iron']);
  // ресурси: будь-який результат дає очки, суми по пристроях
  const t = await p.evaluate(() => { ORD.state.res = {}; ORD.rewards.award({ correct: true, g: 3 }); ORD.rewards.award({ correct: false }); return ORD.rewards.total(); });
  assert.strictEqual(t.g, 1); assert.strictEqual(t.i, 1); assert.strictEqual(t.p, 6);
  // стеля безкоштовних дій
  const cap = await p.evaluate(() => { ORD.state.res = {}; let n = 0; for (let i = 0; i < 60; i++) if (ORD.rewards.free('x')) n++; return n; });
  assert.strictEqual(cap, 40, 'стеля 40 на день');
  // слід без додавання слова + зв'язок
  const s = await p.evaluate(() => { ORD.state.mindTr = {}; ORD.state.mindLk = {}; const w = ORD.words.find(x => !ORD.state.cards[x.id]); ORD.mind.ev('lookup', { word: w.no, ctx: ['arbeid', 'sjef'] }); ORD.mind.ev('lookup', { word: w.no, ctx: [] }); const k = ORD.mind.keyOf(w.no); return { n: ORD.state.mindTr[k].n, links: Object.keys(ORD.state.mindLk).length, inDeck: !!ORD.state.cards[w.id] }; });
  assert.strictEqual(s.n, 2); assert.ok(s.links >= 1, 'зв\'язок створено'); assert.strictEqual(s.inDeck, false);
  // реакція-чіп на повторний пошук
  await p.waitForSelector('.synchip'); 
  // додавання слова -> приклади
  const ex = await p.evaluate(() => { const w = ORD.words.find(x => !ORD.state.cards[x.id] && ORD.ex.local(x, 3).length); if (!w) return { skip: true }; ORD.addWord(w); return { n: ORD.ex.all(w).length, ok: ORD.ex.all(w).every(e => ORD.ex.has(e.no, w)) }; });
  if (!ex.skip) { assert.ok(ex.n >= 2, 'є додаткові приклади'); assert.ok(ex.ok, 'кожен приклад містить слово'); }
  // сесія: медаль у відгуку
  await p.evaluate(() => { const id = ORD.words[0].id; ORD.ensureCard(id); ORD.state.cards[id].st = 'review'; ORD.state.cards[id].due = Date.now() - 1000; ORD.state.cards[id].ivl = 5; ORD.go('learn'); ORD.startSession(document.querySelector('#sess'), { ids: [id], force: 'type' }); });
  await p.waitForSelector('.stage input'); await p.fill('.stage input', 'zzzzzzzz'); await p.click('.stage form button');
  await p.waitForSelector('.medal'); assert.ok(/Залізо|Мідь/.test(await p.textContent('.medal')), 'медаль у відгуку');
  // головна: граф і панель ресурсів
  await p.evaluate(() => ORD.go('home')); await p.waitForSelector('.syng svg, .syng .dim'); await p.waitForSelector('.rw');
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('rewards.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
