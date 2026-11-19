/* Шар ШІ-API: повідомлення провайдера, запасні моделі, повтор при 5xx, пауза після ліміту, діагностика */
const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  const calls = []; let mode = 'ok', lists = 0;
  const ok = (text) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) });
  await p.route('https://generativelanguage.googleapis.com/**', (r) => {
    if (/\/models\?/.test(r.request().url())) { lists++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.8-flash-image', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.8-pro', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding-9', supportedGenerationMethods: ['embedContent'] }, { name: 'models/gemini-3.8-flash-live', supportedGenerationMethods: ['bidiGenerateContent'] }] }) }); }
    const m = /models\/([^:]+):/.exec(r.request().url())[1]; calls.push(m);
    if (mode === 'alldead') return m === 'gemini-3.8-flash' ? r.fulfill(ok('знайдено сам')) : r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { message: 'This model models/' + m + ' is no longer available. Please update your code to use a newer model.' } }) });
    if (mode === 'ok') return r.fulfill(ok('привіт'));
    if (mode === 'oldmodel') return m === 'gemini-old' ? r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { message: 'models/gemini-old is not found' } }) }) : r.fulfill(ok('fallback ok'));
    if (mode === '503once') { if (calls.length === 1) return r.fulfill({ status: 503, body: 'busy' }); return r.fulfill(ok('after retry')); }
    if (mode === 'rate') return r.fulfill({ status: 429, headers: { 'retry-after': '30' }, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Quota exceeded' } }) });
  });
  await p.goto(base); await p.waitForFunction(() => window.ORD && ORD.keys);
  // усі відомі моделі мертві → модель береться зі списку ключа, обирається найкраща текстова flash, запам'ятовується
  await p.evaluate(() => ORD.keys.set('gemini', 'GEMKEY123456789', { persist: false, model: 'gemini-2.5-flash', free: true }));
  mode = 'alldead'; const dd = await p.evaluate(() => ORD.testKey('gemini').then(() => ({ ok: true, m: ORD.keys.cfg('gemini').model }), e => ({ ok: false, e: e.code + e.msg })));
  assert.ok(dd.ok && dd.m === 'gemini-3.8-flash' && lists === 1, JSON.stringify(dd) + ' lists=' + lists); assert.ok(calls.includes('gemini-3.8-flash') && !calls.includes('gemini-3.8-flash-image'), calls.join());
  calls.length = 0; const again = await p.evaluate(() => ORD.aiG('s', [{ role: 'user', content: 'x' }], 50).then(r => r.gen.model)); assert.strictEqual(again, 'gemini-3.8-flash'); assert.strictEqual(calls[0], 'gemini-3.8-flash', 'вдруге одразу робоча модель'); assert.strictEqual(lists, 1);
  await p.reload(); await p.waitForFunction(() => window.ORD && ORD.keys); calls.length = 0;
  await p.evaluate(() => ORD.keys.set('gemini', 'GEMKEY123456789', { persist: false, model: 'gemini-old', free: true }));
  const ai = () => p.evaluate(() => ORD.aiG('s', [{ role: 'user', content: 'x' }], 50).then(r => ({ t: r.text, m: r.gen.model }), e => ({ err: ORD.aiError(e), code: e.code })));
  mode = 'oldmodel'; let r = await ai(); assert.strictEqual(r.t, 'fallback ok'); assert.notStrictEqual(r.m, 'gemini-old'); assert.deepStrictEqual(calls.slice(0, 2).map(x => x === 'gemini-old'), [true, false], 'спершу збережена модель, потім запасна');
  mode = '503once'; calls.length = 0; r = await ai(); assert.strictEqual(r.t, 'after retry'); assert.strictEqual(calls.length, 2, 'один повтор після 503');
  mode = 'rate'; r = await ai(); assert.strictEqual(r.code, 'rate'); assert.ok(/Quota exceeded/.test(r.err), 'видно повідомлення провайдера: ' + r.err);
  mode = 'ok'; const d = await p.evaluate(() => ORD.aiDiag()); assert.strictEqual(d.length, 1); assert.strictEqual(d[0].ok, true);
  await p.evaluate(() => ORD.go('profile')); assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('api.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
