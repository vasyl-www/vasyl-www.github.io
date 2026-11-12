/* Шар ШІ-API: повідомлення провайдера, запасні моделі, повтор при 5xx, пауза після ліміту, діагностика */
const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  const calls = []; let mode = 'ok';
  const ok = (text) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) });
  await p.route('https://generativelanguage.googleapis.com/**', (r) => {
    const m = /models\/([^:]+):/.exec(r.request().url())[1]; calls.push(m);
    if (mode === 'ok') return r.fulfill(ok('привіт'));
    if (mode === 'oldmodel') return m === 'gemini-old' ? r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: { message: 'models/gemini-old is not found' } }) }) : r.fulfill(ok('fallback ok'));
    if (mode === '503once') { if (calls.length === 1) return r.fulfill({ status: 503, body: 'busy' }); return r.fulfill(ok('after retry')); }
    if (mode === 'rate') return r.fulfill({ status: 429, headers: { 'retry-after': '30' }, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Quota exceeded' } }) });
  });
  await p.goto(base); await p.waitForFunction(() => window.ORD && ORD.keys);
  await p.evaluate(() => ORD.keys.set('gemini', 'GEMKEY123456789', { persist: false, model: 'gemini-old', free: true }));
  const ai = () => p.evaluate(() => ORD.aiG('s', [{ role: 'user', content: 'x' }], 50).then(r => ({ t: r.text, m: r.gen.model }), e => ({ err: ORD.aiError(e), code: e.code })));
  mode = 'oldmodel'; let r = await ai(); assert.strictEqual(r.t, 'fallback ok'); assert.notStrictEqual(r.m, 'gemini-old'); assert.deepStrictEqual(calls.slice(0, 2).map(x => x === 'gemini-old'), [true, false], 'спершу збережена модель, потім запасна');
  mode = '503once'; calls.length = 0; r = await ai(); assert.strictEqual(r.t, 'after retry'); assert.strictEqual(calls.length, 2, 'один повтор після 503');
  mode = 'rate'; r = await ai(); assert.strictEqual(r.code, 'rate'); assert.ok(/Quota exceeded/.test(r.err), 'видно повідомлення провайдера: ' + r.err);
  mode = 'ok'; const d = await p.evaluate(() => ORD.aiDiag()); assert.strictEqual(d.length, 1); assert.strictEqual(d[0].ok, true);
  await p.evaluate(() => ORD.go('profile')); assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('api.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
