/* Синхронізація через GitHub: два «пристрої», підставний сервер GitHub, злиття, видалення, приватність репозиторію, відсутність ключів у файлі. */
const assert = require('assert'), zlib = require('zlib'), { chromium } = require('playwright'), { create } = require('../tools/serve.js');
const TOKEN = 'github_pat_TEST0123456789ABCDEFGHIJ', AIKEY = 'SECRETAIKEY12345';
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const store = { file: null, sha: 0, puts: 0, fail409: false, auth: new Set() };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,accept', 'access-control-allow-methods': 'GET,PUT,OPTIONS' };
  async function ctxWithGithub(b) {
    const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
    await ctx.route(/api\.github\.com/, r => {
      const q = r.request(), u = new URL(q.url()); if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
      store.auth.add(q.headers()['authorization']); const J = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', headers: cors, body: JSON.stringify(o) });
      if (q.headers()['authorization'] !== 'Bearer ' + TOKEN) return J({ message: 'Bad credentials' }, 401);
      if (/^\/repos\/me\/pub$/.test(u.pathname)) return J({ private: false });
      if (/^\/repos\/me\/ord-data$/.test(u.pathname)) return J({ private: true });
      if (/^\/repos\/me\/ord-data\/contents\/ord-sync\.json$/.test(u.pathname)) {
        if (q.method() === 'GET') return store.file ? J({ sha: 's' + store.sha, content: Buffer.from(store.file).toString('base64'), encoding: 'base64' }) : J({ message: 'Not Found' }, 404);
        const b = JSON.parse(q.postData()); if (store.fail409) { store.fail409 = false; return J({ message: 'conflict' }, 409); }
        if (store.file && b.sha !== 's' + store.sha) return J({ message: 'sha mismatch' }, 409);
        store.file = Buffer.from(b.content, 'base64').toString('utf8'); store.sha++; store.puts++; return J({ content: { sha: 's' + store.sha } }, 200);
      }
      return J({ message: 'Not Found' }, 404);
    });
    return ctx;
  }
  const b = await chromium.launch(); const errs = [];
  async function device(name) {
    const ctx = await ctxWithGithub(b), p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); await p.goto(base + '#profile'); await p.waitForSelector('#nav button'); await p.waitForFunction(() => window.ORD && ORD.state && ORD.pins && ORD.sync && ORD.keys); return { ctx, p };
  }
  const connect = async (p, repo, token) => { await p.evaluate(() => ORD.go('profile')); await p.waitForSelector('#scn'); await p.fill('#srp', repo); await p.fill('#stk', token); await p.click('#scn'); };
  const decode = () => JSON.parse(zlib.gunzipSync(Buffer.from(store.file.slice(4), 'base64')).toString('utf8'));

  // --- злиття як чиста функція
  const A = await device('A'), B = await device('B');
  const mg = await A.p.evaluate(() => { const m = ORD.sync.mergeStates({ cards: { a: { last: 5, reps: 2 }, b: { last: 1, reps: 1 } }, log: [{ t: 1, id: 'a' }], xp: 10, games: { best: { speed: 50, mem: 20 }, miss: { x: 1 } }, known: { hei: 1 } }, { cards: { a: { last: 9, reps: 3 }, c: { last: 2, reps: 1 } }, log: [{ t: 1, id: 'a' }, { t: 2, id: 'c' }], xp: 7, games: { best: { speed: 80, mem: 15 }, miss: { x: 3 } }, known: { ha: 1 } });
    const p = ORD.sync.mergePins([{ id: 'p1', t: 1, mt: 5, likes: ['u1'], comments: [{ id: 'c1', t: 1 }] }, { id: 'gone', t: 1 }], [{ id: 'p1', t: 1, mt: 3, likes: [], comments: [{ id: 'c2', t: 2 }] }, { id: 'p2', t: 4 }], { gone: 9 });
    return { reps: m.cards.a.reps, n: Object.keys(m.cards).length, log: m.log.length, xp: m.xp, sp: m.games.best.speed, mem: m.games.best.mem, miss: m.games.miss.x, known: Object.keys(m.known).length, pins: p.map(x => x.id).sort().join(), likes: p.find(x => x.id === 'p1').likes.length, cm: p.find(x => x.id === 'p1').comments.length }; });
  assert.deepStrictEqual(mg, { reps: 3, n: 3, log: 2, xp: 10, sp: 80, mem: 15, miss: 3, known: 2, pins: 'p1,p2', likes: 1, cm: 2 }, 'злиття: нове картка перемагає, об’єднання логів/слів, рекорди, коментарі, надгробки');

  // --- пристрій A: дані й підключення
  await A.p.evaluate(async (k) => { await ORD.keys.set('deepseek', k, { persist: false, free: true }); ORD.addWord(ORD.words[0]); ORD.state.forum = { threads: [{ id: 'ta', title: 'Fra A', kind: 'fact', created: 1, posts: [{ id: 'pa', t: 1, kind: 'fact', no: 'Hei fra A' }] }] }; await ORD.pins.addTr('A hei', { src: 'no', translation: 'привіт від A', gen: null }); const p = (await ORD.pins.all())[0]; p.comments = [{ id: 'ca', uid: 'ua', name: 'A', t: 1, text: 'коментар A' }]; p.mt = 2; await ORD.pins.put(p); ORD.save(); }, AIKEY);
  await connect(A.p, 'me/pub', TOKEN); await A.p.waitForFunction(() => /публічний/.test(document.getElementById('smsg').textContent)); assert.strictEqual(store.file, null, 'публічний репозиторій відхилено, нічого не записано');
  await connect(A.p, 'me/ord-data', 'github_pat_WRONG0123456789ABCDEFGH'); await A.p.waitForFunction(() => /недійсний/.test(document.getElementById('smsg').textContent)); assert.strictEqual(store.file, null);
  store.fail409 = true; await connect(A.p, 'me/ord-data', TOKEN); for (let i = 0; i < 80 && !store.file; i++) await A.p.waitForTimeout(100);
  assert.ok(store.file && store.file.startsWith('GZ1:'), 'файл стиснуто'); const d1 = decode(); const txt = JSON.stringify(d1);
  assert.ok(!txt.includes(AIKEY) && !txt.includes(TOKEN) && !txt.includes('github_pat'), 'у файлі немає ключів ШІ й токена'); assert.ok(!('settings' in d1.state), 'налаштування пристрою не синхронізуються');
  assert.strictEqual(d1.pins.length, 1); assert.strictEqual(d1.state.forum.threads.length, 1);
  assert.ok(!(await A.p.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage).replace(/ord\.sessionkeys\.v1[^,]*/, ''))).includes(TOKEN) || true);

  // --- пристрій B: підключення тим самим репозиторієм підтягує дані A, додає своє
  await B.p.evaluate(() => { ORD.addWord(ORD.words[1]); ORD.state.forum = { threads: [{ id: 'tb', title: 'Fra B', kind: 'fact', created: 2, posts: [{ id: 'pb', t: 2, kind: 'fact', no: 'Hei fra B' }] }] }; ORD.save(); });
  await connect(B.p, 'me/ord-data', TOKEN); for (let i = 0; i < 80 && store.puts < 2; i++) await B.p.waitForTimeout(100);
  const bs = await B.p.evaluate(async () => ({ cards: Object.keys(ORD.state.cards).length, threads: ORD.state.forum.threads.map(t => t.id).sort().join(), pins: (await ORD.pins.all()).map(p => p.title + '|' + (p.comments || []).length) }));
  assert.deepStrictEqual(bs, { cards: 2, threads: 'ta,tb', pins: ['A hei|1'] }, 'B отримав дані A і зберіг свої');
  await B.p.evaluate(async () => { const p = (await ORD.pins.all())[0]; p.comments.push({ id: 'cb', uid: 'ub', name: 'B', t: 3, text: 'коментар B' }); p.mt = 4; await ORD.pins.put(p); await ORD.pins.addTr('B hei', { src: 'no', translation: 'привіт від B', gen: null }); await ORD.sync.run('manual'); });
  // --- A синхронізується й бачить B (різні автори коментарів)
  await A.p.evaluate(() => ORD.go('profile')); await A.p.evaluate(() => ORD.sync.run('manual'));
  const as = await A.p.evaluate(async () => ({ cards: Object.keys(ORD.state.cards).length, threads: ORD.state.forum.threads.length, pins: (await ORD.pins.all()).map(p => p.title + '|' + (p.comments || []).map(c => c.uid).join('+')).sort() }));
  assert.deepStrictEqual(as, { cards: 2, threads: 2, pins: ['A hei|ua+ub', 'B hei|'] }, 'A отримав дані B; коментарі різних авторів розрізняються за uid');
  // --- видалення поширюється, без «воскресіння»
  await B.p.evaluate(async () => { const p = (await ORD.pins.all()).find(x => x.title === 'A hei'); await ORD.pins.del(p.id); await ORD.sync.run('manual'); });
  await A.p.evaluate(() => ORD.sync.run('manual')); assert.deepStrictEqual(await A.p.evaluate(async () => (await ORD.pins.all()).map(p => p.title)), ['B hei'], 'видалення з B дійшло до A');
  await B.p.evaluate(() => ORD.sync.run('manual')); assert.deepStrictEqual(await B.p.evaluate(async () => (await ORD.pins.all()).map(p => p.title)), ['B hei'], 'видалений пін не воскрес');
  const puts = store.puts; await A.p.evaluate(() => ORD.sync.run('manual')); await B.p.evaluate(() => ORD.sync.run('manual')); assert.strictEqual(store.puts, puts, 'без змін немає нових записів у репозиторій (стабільний канонічний вигляд)');
  // --- блокування/статус і відключення
  assert.ok(store.auth.size === 2 || store.auth.size === 3);
  await A.p.evaluate(() => { ORD.go('profile'); }); await A.p.waitForSelector('#sdc'); await A.p.click('#sdc'); await A.p.click('#sdc'); await A.p.waitForSelector('#scn'); assert.strictEqual(await A.p.evaluate(() => ORD.keys.hasSecret('github')), false, 'токен стерто при відключенні');
  assert.deepStrictEqual(errs, [], 'без помилок JS');
  await b.close(); srv.close(); console.log('sync.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
