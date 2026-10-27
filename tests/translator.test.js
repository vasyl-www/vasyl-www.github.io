/* Перекладач: усі значення, частина мови, форми, ідіоми, історія без повторного запиту, додавання в словник. Ключ і Anthropic підміняються. */
const { chromium } = require('playwright'); const assert = require('assert');
const { create } = require('../tools/serve');
const ENTRY = { lemma: 'bruk', art: 'et', pos: 'іменник середнього роду', meanings: [{ uk: 'використання', note: '', ex: 'Bruk av hjelm er påbudt.', exUk: 'Використання каски обов’язкове.' }, { uk: 'господарство, ферма', note: 'застар.', ex: '', exUk: '' }],
  forms: [{ label: 'неозн. однина', form: 'et bruk' }, { label: 'озн. однина', form: 'bruket' }, { label: 'неозн. множина', form: 'bruk' }, { label: 'озн. множина', form: 'bruka' }], idioms: [{ no: 'ta i bruk', uk: 'почати використовувати' }] };
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); let calls = 0;
  p.on('pageerror', e => errs.push(e.message));
  await p.route('https://api.anthropic.com/**', r => {
    calls++; const body = JSON.parse(r.request().postData()), txt = body.messages[0].content, sys = body.system || '';
    let out;
    if (/^Слово:/.test(txt)) out = { ...ENTRY, lemma: /verb/.test(txt) ? 'bruke' : ENTRY.lemma };
    else if (/gå på trynet/.test(txt)) out = { src: 'no', translation: 'облажатися', literal: 'іде на ніс', note: 'розмовне', idioms: [{ no: 'å gå på trynet', uk: 'зазнати невдачі' }], words: ['gå', 'tryne'], entry: null };
    else out = { src: 'no', translation: 'використання; господарство', literal: '', note: '', idioms: [{ no: 'ta i bruk', uk: 'почати використовувати' }], words: ['bruke'], entry: ENTRY };
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify(out) }] }) });
  });
  await p.goto(base); await p.waitForSelector('#lgrid');
  await p.evaluate(() => { ORD.keys.set('anthropic', 'sk-test-00000000', { persist: false }); ORD.go('translate'); }); await p.waitForSelector('#tq');
  await p.fill('#tq', 'bruk'); await p.click('#tgo'); await p.waitForSelector('#e0 .mean li');
  assert.strictEqual((await p.$$('#e0 .mean li')).length, 2, 'усі значення');
  assert.ok((await p.textContent('#e0')).includes('іменник середнього роду'), 'частина мови');
  assert.strictEqual((await p.$$('#e0 .tbl tr')).length, 4, 'усі форми');
  assert.ok((await p.textContent('#e0')).includes('ta i bruk'), 'ідіоми зі словом');
  await p.click('#e0 [data-add]'); assert.ok(await p.evaluate(() => !!ORD.state.cards['u:bruk']), 'слово в словнику'); assert.ok(await p.evaluate(() => ORD.wordById['u:bruk'].forms.includes('bruket')), 'форми збережені в картці');
  await p.fill('#tq', 'å gå på trynet'); await p.click('#tgo'); await p.waitForSelector('.panel .dim >> text=Буквально');
  assert.ok((await p.textContent('#tres')).includes('зазнати невдачі'), 'ідіома у фразі');
  await p.click('#tres [data-w=gå]'); await p.waitForSelector('#eslot .entry');
  assert.strictEqual((await p.$$('#thl .mrow')).length, 2, 'історія');
  const before = calls; await p.click('#thl .mrow >> nth=1 >> span'); await p.waitForSelector('#e0');
  assert.strictEqual(calls, before, 'повторне відкриття з історії без запиту до ШІ');
  await p.fill('#thq', 'tryne'); assert.strictEqual((await p.$$('#thl .mrow')).length, 1, 'пошук в історії');
  await p.fill('#thq', ''); await p.click('#thl [data-del] >> nth=0'); assert.strictEqual((await p.$$('#thl .mrow')).length, 1, 'видалення');
  assert.ok(await p.evaluate(() => ORD.state.tr.length === 1), 'історію збережено в стані');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 421, 'без горизонтального скролу');
  await p.evaluate(() => { ORD.go('read'); }); await p.click('#lgrid .story >> nth=0'); await p.waitForSelector('.rtext .rw'); await p.click('.rtext .rw[data-w=verkstedet]'); await p.click('.popover [data-tr]'); await p.waitForSelector('#tres .panel');
  assert.ok(await p.inputValue('#tq') === 'verkstedet', 'перехід з читалки в перекладач');
  await b.close(); srv.close(); if (errs.length) { console.error(errs); process.exit(1); } console.log('translator.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
