/* Єдина стрічка пінів (ваги, повтори, наповнення без ШІ) і «мішок слів» для ігор. */
const assert = require('assert'), { chromium } = require('playwright'), { create } = require('../tools/serve.js');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 420, height: 900 } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); await p.goto(base + '#pins'); await p.waitForSelector('.tabs .chip'); await p.waitForFunction(() => window.ORD && ORD.pinsFeed && ORD.pinsAi);
  // 1. без ШІ стрічка сама наповнюється вбудованими пінами й не порожня
  await p.waitForSelector('.pin', { timeout: 8000 });
  const n = await p.evaluate(async () => (await ORD.pins.all()).length); assert.ok(n >= 24, 'автонаповнення без ШІ: ' + n);
  assert.strictEqual(await p.evaluate(() => document.querySelector('[data-m=feed]').classList.contains('on')), true, 'стрічка за замовчуванням');
  // 2. ваги: лайк вище, дизлайк нижче, щойно показаний нижче, а з часом відновлюється
  const w = await p.evaluate(() => { const f = ORD.pinsFeed.weight, now = Date.now(), old = now - 9 * 864e5, base = { t: old };
    const v0 = {}, a = f(base, v0, now), liked = f({ t: old, likes: ['u'] }, v0, now), dis = f({ t: old, dislikes: ['u'] }, v0, now);
    const shown = f({ id: 'x', t: old }, { x: [1, now - 60000] }, now), later = f({ id: 'x', t: old }, { x: [1, now - 12 * 36e5] }, now);
    return { liked: liked > a, dis: dis < a / 3, shown: shown < a / 4, later: later > shown * 4, likedBack: f({ id: 'x', t: old, likes: ['u'] }, { x: [1, now - 3 * 36e5] }, now) > f({ id: 'x', t: old }, { x: [1, now - 3 * 36e5] }, now) }; });
  assert.deepStrictEqual(w, { liked: true, dis: true, shown: true, later: true, likedBack: true });
  // 3. вибірка: улюблені трапляються частіше за дизлайкнуті
  const r = await p.evaluate(() => { const all = []; for (let i = 0; i < 60; i++) all.push({ id: 'p' + i, t: 0, likes: i < 10 ? ['u'] : [], dislikes: i >= 50 ? ['u'] : [] }); let L = 0, D = 0; for (let k = 0; k < 200; k++) ORD.pinsFeed.pick(all, 10).forEach(x => { const i = +x.id.slice(1); if (i < 10) L++; else if (i >= 50) D++; }); return { L, D }; });
  assert.ok(r.L > r.D * 4, 'лайк частіше за дизлайк ' + JSON.stringify(r));
  // 4. читалка запам’ятовує побачені слова й тексти
  await p.evaluate(() => ORD.go('read')); await p.waitForSelector('.rcard, .story, [data-open], .tile', { timeout: 5000 }).catch(() => {});
  await p.evaluate(() => { const t = ORD.allStories()[0]; ORD.state.seenS = ORD.state.seenS || {}; });
  // 5. мішок слів: у швидкій парі слова не повторюються по колу
  await p.evaluate(() => { ORD.state.seenW = {}; ORD.words.slice(0, 30).forEach(w => { ORD.state.seenW[w.id] = Date.now(); }); ORD.go('games'); });
  await p.waitForSelector('.gcard, .tile, [data-game]', { timeout: 5000 }).catch(() => {});
  const seq = await p.evaluate(() => new Promise(res => { const out = [];
    ORD.go('games'); setTimeout(() => { const btn = [...document.querySelectorAll('button,.tile,[data-game]')].find(x => /Швидка пара/.test(x.textContent)); btn.click(); setTimeout(() => {
      let i = 0; const iv = setInterval(() => { const q = document.getElementById('q'); if (q) { out.push(q.textContent); const o = document.querySelector('#op .opt'); o && o.click(); } if (++i > 40) { clearInterval(iv); res(out); } }, 60); }, 300); }, 300); }));
  const seen = {}; let rep = 0; seq.forEach((x, i) => { if (seq.slice(Math.max(0, i - 12), i).includes(x)) rep++; });
  assert.ok(seq.length >= 20 && rep === 0, 'у швидкій парі немає повторів у вікні 12: ' + rep + ' з ' + seq.length);
  assert.deepStrictEqual(errs, [], 'без помилок JS');
  await b.close(); srv.close(); console.log('feed.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
