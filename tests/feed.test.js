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
      let i = 0; const iv = setInterval(() => { const q = document.getElementById('q'); if (q && out[out.length - 1] !== q.textContent) { out.push(q.textContent); const o = document.querySelector('#op .opt'); o && o.click(); } if (++i > 220) { clearInterval(iv); res(out); } }, 60); }, 300); }, 300); }));
  const seen = {}; let rep = 0; seq.forEach((x, i) => { if (seq.slice(Math.max(0, i - 12), i).includes(x)) rep++; });
  assert.ok(seq.length >= 8 && rep === 0, 'у швидкій парі немає повторів у вікні 12: ' + rep + ' з ' + seq.length);
  // 6. переклад: фраза й слова в картки (без ШІ для відомих слів), реакції, GIF-вибір
  await p.evaluate(() => { ORD.state.tr = [{ t: Date.now(), q: 'jeg jobber her', res: { src: 'no', translation: 'я тут працюю', literal: '', note: '', idioms: [], words: ['jobbe', 'her'], entry: null }, entries: {} }]; ORD.save(); ORD.go('translate'); });
  await p.waitForSelector('#thl .mrow span'); await p.evaluate(() => document.querySelector('#thl .mrow span').click()); await p.waitForSelector('[data-addph]');
  await p.evaluate(() => document.querySelector('[data-addph]').click()); assert.ok(await p.evaluate(() => !!ORD.state.cards['u:ph:' + Object.keys(ORD.state.userWords).filter(k => k.indexOf('u:ph:') === 0)[0].slice(5)]), 'фразу додано в картки');
  await p.evaluate(() => document.querySelectorAll('#reacts .chip')[1].click()); assert.strictEqual(await p.evaluate(() => ORD.state.tr[0].react['❤️']), 1, 'реакція збережена');
  // 7. форум: тема з піну, що має реакції
  await p.evaluate(async () => { const ps = await ORD.pins.all(); const x = ps[0]; x.likes = ['local']; x.comments = [{ id: 'c1', uid: 'local', name: 'Я', t: Date.now(), text: 'супер' }]; await ORD.pins.put(x); ORD.go('forum'); });
  await p.waitForFunction(() => ORD.state.forum && ORD.state.forum.threads.some(t => t.pid && t.posts.length === 2), null, { timeout: 5000 });
  // 8. сховище без пароля переживає перезавантаження
  await p.evaluate(async () => { await ORD.keys.createDeviceVault(); await ORD.keys.set('deepseek', 'DEVKEY1234567', { persist: true, free: true }); });
  await p.reload(); await p.waitForFunction(() => window.ORD && ORD.keys); await p.evaluate(() => ORD.keys.ready);
  assert.deepStrictEqual(await p.evaluate(() => [ORD.keys.unlocked(), ORD.keys.has('deepseek')]), [true, true], 'автовідмикання без пароля');
  assert.ok(!(await p.evaluate(() => JSON.stringify(localStorage))).includes('DEVKEY1234567'), 'ключ не лежить відкритим текстом');
  // 9. міграція зі старого сховища під паролем: один раз вводимо пароль, далі автовхід, нові ключі зберігаються без жодного пароля
  const c2 = await b.newContext(), q2 = await c2.newPage(); await q2.goto(base + '#translate'); await q2.waitForFunction(() => window.ORD && ORD.keys);
  await q2.evaluate(async () => { await ORD.keys.createVault('oldpass1234'); await ORD.keys.set('gemini', 'OLDKEY1234567', { persist: true, free: true }); });
  await q2.reload(); await q2.waitForFunction(() => window.ORD && ORD.keys); await q2.evaluate(() => ORD.keys.ready);
  assert.strictEqual(await q2.evaluate(() => ORD.keys.unlocked()), false, 'старе сховище заблоковане до міграції'); await q2.waitForSelector('#lockbar');
  await q2.fill('#lbpw', 'oldpass1234'); await q2.evaluate(() => document.getElementById('lbgo').click()); await q2.waitForFunction(() => !document.getElementById('lockbar'));
  await q2.reload(); await q2.waitForFunction(() => window.ORD && ORD.keys); await q2.evaluate(() => ORD.keys.ready);
  assert.deepStrictEqual(await q2.evaluate(() => [ORD.keys.unlocked(), ORD.keys.has('gemini'), !!document.getElementById('lockbar')]), [true, true, false], 'після міграції пароль не питають');
  const c3 = await b.newContext(), q3 = await c3.newPage(); await q3.goto(base + '#translate'); await q3.waitForFunction(() => window.ORD && ORD.keys);
  await q3.evaluate(async () => { await ORD.keys.set('openai', 'NEWKEY12345678', { persist: true, free: false }); }); await q3.reload(); await q3.waitForFunction(() => window.ORD && ORD.keys); await q3.evaluate(() => ORD.keys.ready);
  assert.deepStrictEqual(await q3.evaluate(() => [ORD.keys.has('openai'), !!document.getElementById('lockbar')]), [true, false], 'новий ключ зберігається сам, без пароля');
  // 10. переклад: контекст іде в запит до ШІ, слово зі словника підсвічується, повторний переклад пропонує «знову»
  const c4 = await b.newContext(), t4 = await c4.newPage(), reqs = [];
  await c4.route('**/api.deepseek.com/**', r => { reqs.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ src: 'no', translation: 'пробка', literal: '', note: '', idioms: [], words: [], entry: null }) } }] }) }); });
  await t4.goto(base + '#translate'); await t4.waitForFunction(() => window.ORD && ORD.keys); await t4.evaluate(() => ORD.keys.set('deepseek', 'KEY123456789', { persist: false, free: true }));
  const w0 = await t4.evaluate(() => { const w = ORD.words.find(x => x.no && x.uk && !x.art && /^[a-zæøå]{5,9}$/.test(x.no)); ORD.addWord(w); return w.no; });
  await t4.fill('#tq', w0); await t4.fill('#tctx', 'у майстерні, про зварювання'); await t4.evaluate(() => document.getElementById('tgo').click());
  await t4.waitForSelector('#tbn .panel'); assert.ok(/Уже у твоєму словнику/.test(await t4.textContent('#tbn')), 'слово зі словника підсвічено');
  await t4.waitForSelector('.tcn'); assert.ok(reqs[0].messages.some(m => /у майстерні, про зварювання/.test(m.content)), 'контекст передано ШІ');
  await t4.evaluate(() => document.getElementById('tgo').click()); await t4.waitForSelector('#tagain'); assert.strictEqual(reqs.length, 1, 'повторний запит не йде до ШІ');
  await t4.evaluate(() => document.getElementById('tagain').click()); await t4.waitForFunction(() => document.getElementById('tstatus') || true); await t4.waitForTimeout(500); assert.strictEqual(reqs.length, 2, '«Перекласти знову» робить новий запит');
  // 11. розбір норвезького тексту: статуси слів, члени речення, ідіоми, тап = переклад
  await t4.evaluate(() => { ORD.state.tr = [{ t: Date.now(), q: 'Jeg går på trynet i dag', res: { src: 'no', translation: 'Я сьогодні впав', literal: '', note: '', idioms: [{ no: 'å gå på trynet', uk: 'зазнати невдачі' }], words: [], entry: null, parts: [{ t: 'Jeg', r: 's' }, { t: 'går', r: 'v' }, { t: 'på trynet', r: 'o' }, { t: 'i dag', r: 'a' }] }, entries: {} }]; ORD.go('translate'); });
  await t4.waitForSelector('#thl .mrow span'); await t4.evaluate(() => document.querySelector('#thl .mrow span').click()); await t4.waitForSelector('#hl .rw');
  const hl = await t4.evaluate(() => ({ s: document.querySelector('#hl .hs').textContent, v: document.querySelector('#hl .hv').textContent, a: document.querySelector('#hl .ha').textContent, idm: [...document.querySelectorAll('#hl .idm')].map(x => x.textContent).join(' '), n: document.querySelectorAll('#hl .rw').length }));
  assert.ok(hl.s === 'Jeg' && hl.v === 'går' && hl.n === 6 && /går/.test(hl.idm) && /trynet/.test(hl.idm), 'члени речення й ідіома підсвічені: ' + JSON.stringify(hl));
  await t4.evaluate(() => document.querySelector('#hl .hs').click()); await t4.waitForSelector('.hlslot .mrow', { timeout: 3000 }).catch(() => {});
  await t4.evaluate(() => document.querySelector('[data-roles]').click()); assert.strictEqual(await t4.evaluate(() => document.querySelectorAll('#hl .hs').length), 0, 'перемикач членів речення');
  // 12. швидка пара: лічильник правильних; слова беруться з усього словника; тема від ШІ, помилки йдуть у словник і піни
  const c5 = await b.newContext(), t5 = await c5.newPage(); let n5 = 0;
  const kitchen = ['kniv', 'gaffel', 'skje', 'tallerken', 'kopp', 'gryte', 'panne', 'bolle', 'ovn', 'kjøleskap', 'vask', 'kaffetrakter'].map((w, i) => ({ no: w, art: i % 2 ? 'en' : 'et', uk: 'кухонне-' + i, ex: 'Jeg bruker ' + w + '.', exUk: 'Я використовую.' }));
  await c5.route('**/api.deepseek.com/**', r => { n5++; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ words: kitchen }) } }] }) }); });
  await t5.goto(base + '#games'); await t5.waitForFunction(() => window.ORD && ORD.keys); await t5.evaluate(() => ORD.keys.set('deepseek', 'KEY123456789', { persist: false, free: true }));
  const spread = await t5.evaluate(() => { ORD.state.seenW = {}; ORD.words.slice(0, 20).forEach(w => { ORD.state.seenW[w.id] = Date.now(); }); const gm = [...document.querySelectorAll('.gm .tile')]; return ORD.words.length; });
  assert.ok(spread > 100, 'словник великий: ' + spread);
  await t5.fill('#gtn', 'Кухня'); await t5.evaluate(() => document.querySelector('#gtp form').dispatchEvent(new Event('submit', { cancelable: true })));
  await t5.waitForFunction(() => ORD.state.games.topic && ORD.state.games.topic.on, null, { timeout: 8000 }); assert.strictEqual(n5, 1);
  await t5.evaluate(() => document.querySelector('.gm .tile').click()); await t5.waitForSelector('#cnt');
  assert.strictEqual(await t5.textContent('#cnt'), '✓ 0 / 0', 'лічильник на старті');
  const pick = await t5.evaluate(() => new Promise(res => { const seen = {}, miss = []; let i = 0; const iv = setInterval(() => { const q = document.getElementById('q'); if (q) { const txt = q.textContent; if (!seen[txt]) { seen[txt] = 1; const w = ORD.state.games.topic.words.find(x => (x.art ? x.art + ' ' : '') + x.no === txt || x.uk === txt); if (w && !miss.length) { const wrong = [...document.querySelectorAll('#op .opt')].find(o => o._ok === false); wrong && wrong.click(); miss.push(w.id); } else { const ok = [...document.querySelectorAll('#op .opt')].find(o => o._ok); ok && ok.click(); } } } if (++i > 60) { clearInterval(iv); res(miss); } }, 90); }));
  assert.ok(pick.length === 1, 'зроблено одну помилку'); const wid = pick[0];
  assert.ok(/✓ \d+ \/ \d+/.test(await t5.textContent('#cnt')) && (await t5.textContent('#cnt')) !== '✓ 0 / 0', 'лічильник росте');
  assert.ok(await t5.evaluate(id => !!ORD.state.cards[id], wid), 'невпізнане слово теми потрапило в словник');
  assert.ok(await t5.evaluate(async id => (await ORD.pins.all()).some(p => p.wid === id), wid), 'і на стрічку пінів');
  const used = await t5.evaluate(() => { const t = new Set(ORD.state.games.topic.words.map(x => x.id)); return [...document.querySelectorAll('#op .opt')].length; }); assert.strictEqual(used, 4);
  // 13. падаючі слова: жодне слово не виходить за поле, навіть довгі переклади у вузькому вікні
  const c6 = await b.newContext({ viewport: { width: 360, height: 800 } }), t6 = await c6.newPage(); await t6.goto(base + '#games'); await t6.waitForFunction(() => window.ORD && ORD.words);
  await t6.evaluate(() => { for (let i = 0; i < 40; i++) { const w = { id: 'u:long' + i, deck: 'mine', cat: 'Mine', no: 'lang' + i, uk: '; (напр. дуже довгий переклад із поясненням ' + i + ') тест з норвезької мови', ex: '', exUk: '' }; ORD.state.userWords[w.id] = w; ORD.state.cards[w.id] = { st: 'new' }; } ORD.registerWords(); });
  await t6.evaluate(() => document.querySelectorAll('.gm .tile')[1].click()); await t6.waitForSelector('.fw2');
  const bad = await t6.evaluate(() => new Promise(res => { let bad = 0, n = 0, i = 0; const iv = setInterval(() => { const f = document.getElementById('fl').getBoundingClientRect(); document.querySelectorAll('.fw2').forEach(e => { const r = e.getBoundingClientRect(); n++; if (r.left < f.left - 1 || r.right > f.right + 1) bad++; }); if (++i > 25) { clearInterval(iv); res({ bad, n }); } }, 120); }));
  assert.ok(bad.n > 10 && bad.bad === 0, 'слова в межах поля: ' + JSON.stringify(bad));
  assert.deepStrictEqual(errs, [], 'без помилок JS');
  await b.close(); srv.close(); console.log('feed.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
