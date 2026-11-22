const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  let mode = 'ok', prompts = [];
  const AI = { sentences: [
    { orig: 'I går jobbet jeg og kjøpte хліб.', fixed: 'I går jobbet jeg og kjøpte brød.', uk: 'Вчора я працював і купив хліб.', natural: 'I går var jeg på jobb og kjøpte brød.', alts: [{ no: 'I går jobba æ og kjøpte brød.', style: 'north', note: 'північна розмовна' }, { no: 'I går arbeidet jeg og handlet brød.', style: 'formal', note: '' }], errors: [], words: [{ no: 'et brød', uk: 'хліб' }] },
    { orig: 'Nå er jeg вдома.', fixed: 'Nå er jeg hjemme.', uk: 'Зараз я вдома.', natural: 'Nå er jeg hjemme.', alts: [], errors: [{ wrong: 'er jeg hjem', right: 'er jeg hjemme', why: 'hjemme = де, hjem = куди', type: 'wordchoice' }], words: [] }], comment: 'Гарний початок!' };
  await p.route('https://generativelanguage.googleapis.com/**', (r) => {
    const u = r.request().url(); if (/\/models\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"models":[]}' });
    prompts.push(JSON.parse(r.request().postData()));
    if (mode === 'fail') return r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":{"message":"boom"}}' });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(AI) }] } }] }) });
  });
  await p.goto(base); await p.waitForFunction(() => window.ORD && ORD.diary); await p.addStyleTag({ content: '.aipop{display:none!important}' });
  // правила часу, порядку, perfektum
  const rc = await p.evaluate(() => { const d = ORD.diary; return { a: d.ruleCheck('I går kjøper jeg brød.', 'past').errors.map(e => e.wrong + '>' + e.right), b: d.ruleCheck('Jeg har kjøpt brød.', 'past').errors.length, c: d.ruleCheck('Jeg kjøpt brød.', 'past').errors.map(e => e.right), d: d.ruleCheck('I morgen kjøpte jeg brød.', 'future').errors.map(e => e.right), e: d.ruleCheck('Jeg spiser brød.', 'past'), f: d.ruleCheck('I går jeg går hjem.', 'past').errors.length, g: d.ruleCheck('Jeg har en bil.', 'past').errors.length }; });
  assert.deepStrictEqual(rc.a, ['kjøper>kjøpte']); assert.strictEqual(rc.b, 0); assert.deepStrictEqual(rc.c, ['har kjøpt']); assert.deepStrictEqual(rc.d, ['kjøper']); assert.ok(rc.e.errors.length === 0 && rc.e.hints === 1, JSON.stringify(rc.e)); assert.ok(rc.f >= 1, 'порядок слів'); assert.strictEqual(rc.g, 0);
  await p.evaluate(() => ORD.keys.set('gemini', 'GEMKEY123456789', { persist: false, model: 'gemini-3.8-flash', free: true }));
  await p.evaluate(() => ORD.go('diary')); await p.waitForSelector('#dgo');
  await p.fill('#dtx', 'I går jobbet jeg og kjøpte хліб. Nå er jeg вдома.'); await p.click('#dgo'); await p.waitForSelector('.dsent');
  assert.strictEqual(await p.$$eval('.dsent', e => e.length), 2); assert.strictEqual(await p.$$eval('.dua', e => e.length), 2, 'українські слова підсвічені');
  const sys = prompts[0].systemInstruction ? JSON.stringify(prompts[0].systemInstruction) : JSON.stringify(prompts[0]); assert.ok(/Lyngen/.test(sys) && /never invent forms specific to Lyngen/.test(sys), 'діалектна інструкція');
  assert.ok(/північна розмовна/.test(await p.textContent('.dalts')) && /kjøpte brød/.test(await p.textContent('.dfix')));
  assert.ok(/hjemme/.test(await p.textContent('.corr')) && /ШІ, не перевірено/.test(await p.textContent('.corr')));
  // слово, речення, помилки
  await p.click('[data-aw="0:0"]'); assert.ok(await p.evaluate(() => Object.keys(ORD.state.userWords).some(k => k.startsWith('dy_'))), 'слово додано');
  await p.click('[data-sv="0"]'); assert.strictEqual(await p.evaluate(() => Object.keys(ORD.state.scards).length), 1);
  assert.strictEqual(await p.evaluate(() => ORD.state.scards[Object.keys(ORD.state.scards)[0]].alts.some(a => /æ/.test(a))), false, 'північні форми не йдуть у відповіді');
  assert.ok(await p.evaluate(() => ORD.err.all().some(e => e.src === 'diary' && e.right === 'er jeg hjemme')), 'помилка в «Помилки»');
  // скрита статистика: лічильники без тексту
  const d = await p.evaluate(() => ORD.state.diary); assert.strictEqual(d.length, 1); assert.strictEqual(d[0].ua, 2); assert.strictEqual(d[0].words, 11); assert.ok(d[0].ai === 1 && d[0].a === 1 && !JSON.stringify(d).includes('brød'), JSON.stringify(d));
  // збій ШІ: працюють правила, запис без ai
  mode = 'fail'; await p.fill('#dtx', 'I går kjøper jeg brød.'); await p.click('#dgo'); await p.waitForFunction(() => document.querySelector('#dres .warn')); assert.ok(/ШІ недоступний/.test(await p.textContent('#dres .warn')) && /kjøpte/.test(await p.textContent('#dres .corr')));
  assert.strictEqual(await p.evaluate(() => ORD.state.diary.length), 2); assert.strictEqual(await p.evaluate(() => ORD.state.diary[1].ai), 0);
  // звіт
  const w = await p.evaluate(() => ORD.tele.report({}).writing); assert.ok(w && w.entries === 2 && w.weeks.length === 1 && w.byType.verbform >= 1 && w.entriesCheckedByAI === 1 && /кирилиц/.test(w.note), JSON.stringify(w));
  // повторення речень
  await p.evaluate(() => { const c = ORD.state.scards; Object.values(c).forEach(r => { r.card.due = Date.now() - 1000; }); ORD.save(); ORD.go('learn'); ORD.go('diary'); }); await p.waitForSelector('#drv'); assert.ok(/\(1\)/.test(await p.textContent('#drv')));
  await p.click('#drv'); await p.waitForSelector('#rvi'); assert.ok(/Вчора я працював/.test(await p.textContent('#drvb')));
  await p.fill('#rvi', 'I går jobbet jeg og kjøpte brød.'); await p.click('#drvb button[type=submit]'); await p.waitForSelector('#rvr .feedback.good');
  assert.strictEqual(await p.evaluate(() => ORD.diary.judgeS('i går jobbet jeg og kjopte brod', { no: 'I går jobbet jeg og kjøpte brød.', alts: [] })), 1);
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('diary.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
