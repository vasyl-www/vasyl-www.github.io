const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const calls = []; let mode = 'ok';
  await p.route('https://generativelanguage.googleapis.com/**', (r) => {
    const u = r.request().url();
    if (/\/models\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: ['gemini-3.8-flash', 'gemini-3-pro-image', 'gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image', 'gemini-2.5-flash-image'].map(n => ({ name: 'models/' + n, supportedGenerationMethods: ['generateContent'] })) }) });
    const m = /models\/([^:]+):/.exec(u)[1]; calls.push({ m, b: JSON.parse(r.request().postData()) });
    if (/image/.test(m)) return mode === '402' ? r.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Your prepayment credits are depleted.' } }) }) : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }, { inlineData: { mimeType: 'image/png', data: png } }] } }] }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"kw":"тук-тук","line":"Тукан стукає в тук-тук по даху.","scene":"A toucan knocking on a rooftop"}' }] } }] }) });
  });
  await p.goto(base); await p.waitForFunction(() => window.ORD && ORD.mnemo);
  await p.evaluate(() => ORD.keys.set('gemini', 'GEMKEY123456789', { persist: false, model: 'gemini-3.8-flash', free: true }));
  assert.ok(await p.evaluate(() => ORD.mnemo.hard({ lapses: 2 }) && ORD.mnemo.hard({ leech: true }) && !ORD.mnemo.hard({ lapses: 1 }) && !ORD.mnemo.hard(null)));
  const w = await p.evaluate(() => { const x = ORD.words[0]; return { id: x.id }; });
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'mt'; document.body.appendChild(d); ORD.mnemo.panel(d, ORD.words[0]); });
  await p.click('#mt [data-mk]'); await p.waitForSelector('#mt .mn-kw'); await p.waitForSelector('#mt .mn-pic img', { timeout: 8000 });
  assert.ok(/тук-тук/.test(await p.textContent('#mt .mn-kw')));
  const im = calls.find(c => /image/.test(c.m)); assert.strictEqual(im.m, 'gemini-3.1-flash-image', 'зображення: не pro, не lite, не 2.5'); assert.ok(/no text/.test(im.b.contents[0].parts[0].text));
  assert.ok((await p.evaluate(id => ORD.state.mnemo[id].kw, w.id)) === 'тук-тук');
  // повторне відкриття бере картинку з кешу без нового запиту
  const n0 = calls.length; await p.evaluate(() => ORD.mnemo.panel(document.querySelector('#mt'), ORD.words[0])); await p.waitForSelector('#mt .mn-pic img'); assert.strictEqual(calls.length, n0, 'кеш зображення');
  // 402 → зрозуміле повідомлення
  mode = '402'; await p.click('#mt [data-pic]'); await p.waitForFunction(() => /402/.test(document.querySelector('#mt [data-st]').textContent)); assert.ok(/кредит/.test(await p.textContent('#mt [data-st]')));
  // ліміт зображень
  await p.evaluate(() => { ORD.state.settings.mnCap = 1; }); mode = 'ok'; await p.click('#mt [data-pic]'); await p.waitForFunction(() => /ліміт/.test(document.querySelector('#mt [data-st]').textContent));
  // у сесії: важка картка показує кнопку асоціації у відповіді
  await p.evaluate(() => { ORD.state.settings.mnCap = 10; localStorage.removeItem('ord_mn_n'); delete ORD.state.mnemo[ORD.words[0].id]; });
  await p.addStyleTag({ content: '.aipop{display:none!important}' });
  await p.evaluate(() => { const id = ORD.words[1].id, c = ORD.card(id) || ORD.srs.newCard(id, Date.now()); ORD.state.cards[id] = Object.assign(c, { st: 'review', ivl: 5, due: Date.now() - 1000, lapses: 2, reps: 5 }); ORD.save(); ORD.go('learn'); });
  await p.waitForSelector('#lgo'); await p.evaluate(() => { const box = document.querySelector('#sess'); ORD.startSession(box, { ids: [ORD.words[1].id], force: 'type' }); });
  await p.waitForSelector('#sess form input'); await p.fill('#sess form input', 'zzzz'); await p.click('#sess form button.btn'); await p.waitForSelector('[data-mn] [data-mk]');
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('mnemo.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
