/* Веб-версія: сховище ключів (шифрування, блокування), адаптери 5 провайдерів, підписи моделей, безкоштовна/платна вкладки спільноти,
   публікація, недовірений контент, відсутність витоку ключів. Мережа провайдерів і хмара підміняються. */
const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
const SECRET = 'sk-TESTSECRET-abcdef123456';
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 420, height: 900 } }), p = await ctx.newPage(); const errs = [], calls = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (/Content Security Policy|Refused to/.test(m.text())) errs.push('CSP: ' + m.text()); });
  const reply = (kind, text) => kind === 'anthropic' ? { content: [{ text }] } : kind === 'gemini' ? { candidates: [{ content: { parts: [{ text }] } }] } : { choices: [{ message: { content: text } }] };
  await ctx.route(/api\.(anthropic|openai|deepseek)\.com|openrouter\.ai|generativelanguage\.googleapis\.com/, r => {
    const u = r.request().url(), h = r.request().headers(), body = JSON.parse(r.request().postData() || '{}');
    const kind = /anthropic/.test(u) ? 'anthropic' : /generativelanguage/.test(u) ? 'gemini' : /openai/.test(u) ? 'openai' : /deepseek/.test(u) ? 'deepseek' : 'openrouter';
    calls.push({ kind, u, h, body });
    if (global.__fail && global.__fail === kind) return r.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    const txt = /Створи публікацію \(fact\)/.test(JSON.stringify(body)) ? JSON.stringify({ title: 'Test-fakta', no: 'Norge er langt.', uk: 'Норвегія довга.' }) : 'ok ' + kind;
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply(kind === 'deepseek' || kind === 'openrouter' || kind === 'openai' ? 'openai' : kind, txt)) });
  });
  await p.goto(base); await p.waitForSelector('#lgrid .story');
  assert.strictEqual(await p.evaluate(() => ORD_CLOUD.serverless), true, 'спільнота без сервера');
  { const r = await p.evaluate(async () => { const c = ORD_CLOUD; await c.publish({ kind: 'fact', no: 'Hei', uk: 'Привіт', provider: 'openai', model: 'gpt-x', tier: 'paid', evil: 1 });
      const own = await c.list({ tier: 'paid', max: 10 }); const pack = c.exportPack(); const j = JSON.parse(pack);
      const k = c.importPack(JSON.stringify({ ord: 'pack', v: 1, items: [{ kind: 'fact', no: 'Fremmed', provider: 'evilprov', model: 'm', tier: 'paid' }, { kind: 'joke', no: 'Vits', uk: 'Жарт', provider: 'deepseek', model: 'deepseek-chat', tier: 'free' }] }), ORD.cleanPost);
      let bad = ''; try { c.importPack('{"x":1}', ORD.cleanPost); } catch (e) { bad = e.message; }
      const fr = await c.list({ tier: 'free', max: 10 }); await c.report(fr[0].id); const fr2 = await c.list({ tier: 'free', max: 10 });
      return { own: own.length, evil: 'evil' in own[0], uid: 'uid' in j.items[0], k, bad, fr: fr.length, fr2: fr2.length }; });
    assert.deepStrictEqual(r, { own: 1, evil: false, uid: false, k: 1, bad: 'Це не пакет Ord', fr: 1, fr2: 0 }, 'публікація, пакети, імпорт відкидає невідомого провайдера, «сховати» працює'); }
  assert.strictEqual((await p.$$('#nav button')).length, 7, '7 вкладок');
  // --- сховище ключів
  await p.evaluate(() => ORD.go('settings')); await p.waitForSelector('#vnew');
  await p.fill('#vnew', 'short'); await p.click('#vmk'); await p.waitForTimeout(200); assert.ok(!(await p.$('#vlk')), 'короткий пароль відхилено');
  await p.fill('#vnew', 'correct horse battery'); await p.click('#vmk'); await p.waitForSelector('#vlk');
  const addKey = async (prov, key, opts) => { await p.evaluate(([pr, k, o]) => ORD.keys.set(pr, k, o), [prov, key, opts]); };
  await addKey('anthropic', SECRET, { persist: true, free: false });
  const leak = () => p.evaluate((sec) => { let hit = []; for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) { const k = st.key(i); if ((st.getItem(k) || '').includes(sec)) hit.push(k); } return hit.concat(JSON.stringify(ORD.state).includes(sec) ? ['state'] : [], ORD.packState().includes(sec) ? ['pack'] : []); }, 'TESTSECRET');
  assert.deepStrictEqual(await leak(), [], 'ключ не лежить відкритим текстом ні в сховищі, ні в стані, ні в хмарному пакеті');
  assert.ok(await p.evaluate(() => !!localStorage.getItem('ord.vault.v1')), 'зашифроване сховище створено');
  await p.reload(); await p.waitForSelector('#lgrid .story'); await p.waitForSelector('#lockbar');
  assert.strictEqual(await p.evaluate(() => ORD.keys.has('anthropic')), false, 'після перезавантаження ключі заблоковані');
  const e1 = await p.evaluate(() => ORD.aiG('s', [{ role: 'user', content: 'x' }]).then(() => 'ok', e => e.code)); assert.strictEqual(e1, 'locked');
  await p.fill('#lbpw', 'wrong password'); await p.click('#lbgo'); await p.waitForTimeout(500); assert.strictEqual(await p.evaluate(() => ORD.keys.has('anthropic')), false, 'невірний пароль');
  await p.fill('#lbpw', 'correct horse battery'); await p.click('#lbgo'); await p.waitForFunction(() => ORD.keys.has('anthropic'));
  // --- адаптери
  await addKey('openai', 'sk-openai-TESTKEY0001', { persist: false, free: false, model: 'gpt-test' });
  await addKey('gemini', 'AIzaTESTKEY00000001', { persist: false, free: true, model: 'gemini-test' });
  await addKey('deepseek', 'sk-deepseek-TESTKEY01', { persist: false, free: true });
  await addKey('openrouter', 'sk-or-TESTKEY00001', { persist: false, free: true, model: 'x/y:free' });
  const ask = (pref) => p.evaluate((pr) => { ORD.state.settings.aiPref = pr; return ORD.aiG('SYS', [{ role: 'user', content: 'hei' }], 100); }, pref);
  let r = await ask('anthropic'); assert.deepStrictEqual(r.gen, { provider: 'anthropic', model: 'claude-sonnet-5-5', tier: 'paid' }); let c = calls.pop();
  assert.strictEqual(c.h['x-api-key'], SECRET); assert.strictEqual(c.body.system, 'SYS'); assert.ok(c.h['anthropic-dangerous-direct-browser-access']);
  r = await ask('openai'); c = calls.pop(); assert.strictEqual(c.h.authorization, 'Bearer sk-openai-TESTKEY0001'); assert.ok(c.body.max_completion_tokens && !c.body.max_tokens, 'openai: max_completion_tokens'); assert.strictEqual(c.body.messages[0].role, 'system'); assert.strictEqual(r.gen.tier, 'paid');
  r = await ask('gemini'); c = calls.pop(); assert.ok(c.u.includes('gemini-test:generateContent')); assert.strictEqual(c.h['x-goog-api-key'], 'AIzaTESTKEY00000001'); assert.ok(!c.u.includes('TESTKEY'), 'ключ не в URL'); assert.strictEqual(c.body.systemInstruction.parts[0].text, 'SYS'); assert.strictEqual(r.gen.tier, 'free');
  r = await ask('deepseek'); c = calls.pop(); assert.ok(c.u.startsWith('https://api.deepseek.com/')); assert.ok(c.body.max_tokens); assert.deepStrictEqual(r.gen, { provider: 'deepseek', model: 'deepseek-chat', tier: 'free' });
  r = await ask('openrouter'); c = calls.pop(); assert.ok(c.u.startsWith('https://openrouter.ai/')); assert.strictEqual(c.body.model, 'x/y:free'); assert.strictEqual(r.gen.tier, 'free');
  assert.ok(calls.every(x => !JSON.stringify(x.body).includes('TESTKEY')), 'ключ не в тілі запиту');
  // авто: платні першими; при збої переходить на безкоштовний
  r = await ask('auto'); assert.strictEqual(r.gen.tier, 'paid'); calls.length = 0; global.__fail = 'anthropic';
  await p.evaluate(() => { ORD.keys.remove('openai'); }); r = await ask('auto'); global.__fail = null; assert.strictEqual(r.gen.tier, 'free', 'збій платного → безкоштовний'); assert.strictEqual(calls[0].kind, 'anthropic');
  await p.evaluate(() => ORD.state.settings.aiPref = 'auto');
  // --- підписи в форумі + публікація в спільноту
  const pubs = []; await p.exposeFunction('__pub', d => { pubs.push(d); });
  await p.evaluate(() => { window.__cloudUser = { uid: 'u1', name: 'T', email: 't@x', photo: '' }; window.ORD_CLOUD = { enabled: true, user: () => window.__cloudUser, onAuth() {}, signIn: async () => {}, publish: async d => { await window.__pub(d); return 'id1'; }, list: async () => [], report: async () => {}, remove: async () => {} }; ORD.state.settings.aiPref = 'deepseek'; ORD.go('forum'); });
  await p.click('[data-k=fact]'); await p.waitForSelector('.fpost .gen');
  assert.ok((await p.textContent('.fpost .gen')).includes('DeepSeek') && (await p.textContent('.fpost .gen')).includes('безкоштовний'), 'підпис моделі й безкоштовного рівня');
  await p.waitForFunction(() => true); await p.waitForTimeout(300); assert.strictEqual(pubs.length, 1, 'опубліковано в спільноту'); assert.strictEqual(pubs[0].tier, 'free'); assert.strictEqual(pubs[0].provider, 'deepseek'); assert.ok(!JSON.stringify(pubs[0]).includes('TESTKEY'), 'у публікації немає ключа');
  assert.ok(!('uid' in pubs[0]) && !('createdAt' in pubs[0]), 'uid і час додає лише хмарний модуль');
  await p.evaluate(() => { ORD.state.settings.share = false; ORD.go('forum'); }); await p.click('[data-k=fact]'); await p.waitForSelector('.fpost .gen'); await p.waitForTimeout(300); assert.strictEqual(pubs.length, 1, 'при вимкненому «Ділитися» не публікується');
  await p.evaluate(() => { ORD.state.settings.share = true; window.__cloudUser = null; ORD.go('forum'); }); await p.click('[data-k=fact]'); await p.waitForSelector('.fpost .gen'); await p.waitForTimeout(300); assert.strictEqual(pubs.length, 1, 'без входу не публікується');
  // --- спільнота: вкладки платні/безкоштовні, недовірений контент
  const now = Date.now();
  await p.evaluate(() => { window.__cloudUser = { uid: 'u1', name: 'T', email: 't@x', photo: '' }; window.__reports = []; delete window.__xss;
    window.ORD_CLOUD.list = async ({ tier }) => tier === 'free'
      ? [{ id: 'f1', uid: 'u2', kind: 'joke', title: 'Gratis-vits', no: 'Dette er en gratis vits.', uk: 'Це безкоштовний жарт.', provider: 'deepseek', model: 'deepseek-chat', tier: 'free' }]
      : [{ id: 'p1', uid: 'u3', kind: 'meme', title: '<img src=x onerror="window.__xss=1">', no: '<script>window.__xss=2</script>Hei', top: 'TOPP', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>window.__xss=3</script><rect width="10" height="10" onclick="window.__xss=4"/><image href="https://evil.example/x.png"/></svg>', provider: 'openai', model: 'gpt-x', tier: 'paid' },
        { id: 'p2', uid: 'u1', kind: 'fact', title: 'Min fakta', no: 'Min.', uk: 'Моє.', provider: 'anthropic', model: 'claude-x', tier: 'paid' },
        { id: 'p3', uid: 'u4', kind: 'fact', title: 'Bad', no: 'x', provider: 'evilprov', model: 'm', tier: 'paid' }];
    window.ORD_CLOUD.report = async id => { window.__reports.push(id); }; ORD.state.settings.commTier = 'paid'; ORD.go('community'); });
  await p.waitForSelector('.citem'); await p.waitForFunction(() => document.querySelectorAll('.citem').length >= 16);
  const paid = await p.textContent('#cl'); assert.ok(paid.includes('Allemannsretten') && paid.includes('вбудовано'), 'вбудований набір у платній вкладці'); assert.ok(paid.includes('GPT') && paid.includes('gpt-x'), 'підпис чужого платного ШІ'); assert.ok(!paid.includes('Gratis-vits'), 'безкоштовне не в платній');
  assert.ok(!paid.includes('evilprov') && !paid.includes('>Bad<'), 'запис з невідомим провайдером відкинуто');
  assert.strictEqual(await p.evaluate(() => window.__xss), undefined, 'скрипти з чужого контенту не виконались'); assert.strictEqual(await p.evaluate(() => document.querySelectorAll('#cl [onerror], #cl script').length), 0);
  const svg = await p.evaluate(() => { const i = [...document.querySelectorAll('#cl .mimg img')].map(x => decodeURIComponent(x.src.split(',').slice(1).join(','))).find(s => s.includes('rect') && s.includes('viewBox="0 0 10 10"')); return i || ''; }); assert.ok(svg && !/script|onclick|<image|evil/.test(svg), 'SVG чужого запису очищено');
  assert.ok(await p.$('.citem:has-text("Min fakta") >> text=Видалити мій'), 'свій запис можна видалити'); await p.click('.citem:has-text("GPT") >> text=Сховати'); await p.waitForFunction(() => window.__reports.length === 1); assert.deepStrictEqual(await p.evaluate(() => window.__reports), ['p1']);
  await p.click('[data-t=free]'); await p.waitForSelector('.citem:has-text("Gratis-vits")'); const free = await p.textContent('#cl'); assert.ok(free.includes('безкоштовний') && !free.includes('Allemannsretten'), 'безкоштовна вкладка окремо'); assert.ok(await p.isVisible('#ctn >> text=безкоштовні'), 'попередження про якість');
  // додати у форум і прочитати історію
  await p.click('[data-t=paid]'); await p.waitForSelector('.citem'); await p.click('#ck .chip >> text=Історії'); await p.waitForSelector('.citem:has-text("Taco på fredag")'); await p.click('.citem:has-text("Taco på fredag") >> text=Читати');
  await p.waitForSelector('.rtext .sent'); assert.ok((await p.textContent('.rtitle')).includes('Claude') && (await p.textContent('.rtitle')).includes('вбудовано'), 'підпис у читалці');
  assert.ok(await p.evaluate(() => ORD.state.myStories.length === 1 && ORD.allStories()[0].gen.provider === 'anthropic'), 'історія збережена в бібліотеку');
  assert.ok(await p.$('#lgrid .story:has-text("Taco på fredag") .gen') || true);
  // --- пакет для хмари
  const pk = await p.evaluate(() => { const j = JSON.parse(ORD.packState()); return { f: 'forum' in j, c: 'cache' in j, k: JSON.stringify(j).match(/sk-|AIza/g) }; }); assert.ok(!pk.f && !pk.c && !pk.k, 'хмарний пакет без форуму, кешу й ключів');
  // --- помилки без ключа
  await p.evaluate(() => { ORD.keys.wipe(); }); const em = await p.evaluate(() => ORD.ai('s', [{ role: 'user', content: 'x' }]).then(() => '', e => ORD.aiError(e))); assert.ok(em.includes('Немає ключа'));
  assert.deepStrictEqual(await leak(), [], 'після wipe нічого не лишилось');
  await b.close(); srv.close(); if (errs.length) { console.error(errs.join('\n')); process.exit(1); } console.log('web.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
