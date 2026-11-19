const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  const gens = []; let mode = 'ok';
  const pcm = Buffer.alloc(4800).toString('base64');
  await p.route('https://generativelanguage.googleapis.com/**', (r) => {
    const u = r.request().url();
    if (/\/models\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: ['gemini-3.8-flash', 'gemini-3.5-flash-lite-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) }) });
    gens.push({ m: /models\/([^:]+):/.exec(u)[1], b: JSON.parse(r.request().postData()) });
    if (mode === 'auth') return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { message: 'API key not valid' } }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm } }] } }] }) });
  });
  await p.goto(base); await p.waitForFunction(() => window.ORD && ORD.keys && ORD.gtts);
  await p.evaluate(() => { ORD.keys.set('gemini', 'GEMKEY123456789', { persist: false, model: 'gemini-3.8-flash', free: true }); localStorage.removeItem('ord_gtts_n'); window.__sys = 0; speechSynthesis.speak = function () { window.__sys++; }; });
  // вимкнено → системний голос, запитів немає
  await p.evaluate(() => ORD.speak('hei')); assert.strictEqual(gens.length, 0);
  await p.evaluate(() => { ORD.state.settings.gTts = true; ORD.state.settings.gCap = 3; });
  await p.evaluate(() => ORD.speak('bil')); await p.waitForTimeout(600);
  assert.strictEqual(gens.length, 1); assert.strictEqual(gens[0].m, 'gemini-3.8-flash-tts', 'модель tts зі списку, не lite'); assert.deepStrictEqual(gens[0].b.generationConfig.responseModalities, ['AUDIO']); assert.ok(/Norwegian/.test(gens[0].b.contents[0].parts[0].text) && /bil$/.test(gens[0].b.contents[0].parts[0].text));
  // кеш: те саме слово — без нового запиту
  await p.evaluate(() => ORD.speak('bil')); await p.waitForTimeout(400); assert.strictEqual(gens.length, 1, 'кеш');
  // повільний режим — окремий запис
  await p.evaluate(() => ORD.speak('bil', { slow: true })); await p.waitForTimeout(400); assert.strictEqual(gens.length, 2);
  // ліміт 3: третій запит ок, четвертий → системний голос
  await p.evaluate(() => ORD.speak('hus')); await p.waitForTimeout(400); assert.strictEqual(gens.length, 3);
  const sys0 = await p.evaluate(() => window.__sys); await p.evaluate(() => ORD.speak('tak')); await p.waitForTimeout(400);
  assert.strictEqual(gens.length, 3, 'ліміт'); assert.ok((await p.evaluate(() => window.__sys)) > sys0, 'після ліміту системний голос');
  // помилка ключа → системний голос
  await p.evaluate(() => { localStorage.removeItem('ord_gtts_n'); }); mode = 'auth'; const s1 = await p.evaluate(() => window.__sys); await p.evaluate(() => ORD.speak('ny')); await p.waitForTimeout(500);
  assert.ok((await p.evaluate(() => window.__sys)) > s1, 'помилка → системний'); assert.strictEqual(await p.evaluate(() => ORD.gttsLast.code), 'auth');
  // налаштування й тест
  mode = 'ok'; await p.evaluate(() => ORD.go('settings')); await p.waitForSelector('#sgt'); await p.click('#sgt'); await p.waitForFunction(() => /Працює|Не вийшло/.test(document.querySelector('#sgo').textContent)); assert.ok(/Працює/.test(await p.textContent('#sgo')), await p.textContent('#sgo'));
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('gtts.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
