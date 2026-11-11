const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  const seen = []; await p.route('**/*', r => r.continue());
  await p.goto(base); await p.waitForSelector('#nav button');
  const w = await p.evaluate(() => { const x = ORD.words.find(v => !ORD.state.cards[v.id] && /^[a-zæøå]{5,}$/.test(v.no) && ORD.localLookup(v.no) && ORD.localLookup(v.no).id === v.id); return { no: x.no, id: x.id }; });
  // мок ШІ: підміняємо ядро запиту
  await p.evaluate((w) => { window.__sys = []; ORD.aiG = (sys, msgs) => { window.__sys.push(sys); return Promise.resolve({ text: 'Ordet «' + w.no + '» betyr noe. Prøv det!', gen: { provider: 'x', model: 'm', tier: 'free' } }); }; ORD.openAsk(); }, w);
  await p.evaluate(() => { document.querySelector('.aipop').hidden = false; });
  await p.fill('#aiq', 'Що означає ' + w.no + '?'); await p.press('#aiq', 'Enter');
  await p.waitForSelector('.aioffer button');
  assert.ok(/слабкі слова/.test(await p.evaluate(() => window.__sys[0])), 'контекст словника/ядра у промпті');
  assert.strictEqual(await p.evaluate(() => ORD.state.chat.length), 2, 'історія збережена');
  await p.click('.aioffer button:has-text("' + w.no + '")'); assert.ok(await p.evaluate((id) => !!ORD.state.cards[id], w.id), 'слово додано з чату');
  assert.ok(await p.evaluate(() => Object.keys(ORD.state.mindTr).length) >= 1, 'слід у ядрі');
  // відновлення після перезавантаження
  const st = await p.evaluate(() => JSON.stringify(ORD.state.chat)); await p.reload(); await p.waitForSelector('#nav button');
  await p.evaluate(() => ORD.openAsk()); await p.waitForSelector('.aipop .bub.me');
  assert.ok(/Що означає/.test(await p.textContent('.aipop-log')), 'історія відновлена');
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('chat.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
