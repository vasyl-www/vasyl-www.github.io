/* Вірші та вирази: каталог, вшитий текст, ШІ-текст, вивчено → слова у словнику, вирази, свій вираз */
const { chromium } = require('playwright'); const assert = require('assert');
const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.route('https://api.anthropic.com/**', r => {
    const body = JSON.parse(r.request().postData()), sys = body.system || '', txt = body.messages[0].content; let out;
    if (/public-domain Norwegian poems/.test(sys)) out = { s: [['Dagen er fin', 'День гарний'], ['og solen skinner', 'і сонце світить'], ['over fjellet nå', 'над горою зараз']], reliable: false };
    else if (/6 уживаних виразів/.test(sys)) out = { items: [{ no: 'å ta seg sammen', uk: 'взяти себе в руки', lit: 'взяти себе разом', ex: 'Ta deg sammen!', exUk: 'Візьми себе в руки!' }] };
    else out = { lemma: 'x', art: '', pos: 'іменник', meanings: [{ uk: 'слово', note: '', ex: '', exUk: '' }], forms: {} };
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify(out) }] }) });
  });
  await p.goto(base + '#poems'); await p.waitForSelector('#pgrid .story');
  assert.strictEqual(await p.evaluate(() => ORD.POEMS_CAT.length), 20, '20 віршів'); assert.strictEqual(await p.evaluate(() => ORD.EXPRESSIONS.length), 20, '20 виразів');
  assert.strictEqual((await p.$$('#pgrid .story')).length, 20);
  await p.click('#pgrid .story >> nth=0'); await p.waitForSelector('.rtext');
  assert.ok((await p.textContent('.rtext')).includes('elsker'), 'вшита строфа');
  await p.evaluate(() => ORD.keys.set('anthropic', 'sk-test-00000000', { persist: false }));
  await p.click('#rdone'); await p.waitForTimeout(800);
  assert.ok(await p.evaluate(() => !!ORD.state.poems.read.pm1), 'вірш позначено вивченим');
  await p.click('[data-pt=poems]').catch(() => {}); await p.waitForSelector('#pgrid .story');
  await p.click('#pgrid .story >> nth=1'); await p.waitForSelector('.rtext'); assert.ok((await p.textContent('.rtext')).includes('solen'), 'текст від ШІ');
  assert.ok((await p.textContent('.rtitle')).includes('звір з першоджерелом'), 'позначка неперевіреного тексту');
  await p.click('[data-pt=exprs]'); await p.waitForSelector('#xgrid .story'); assert.strictEqual((await p.$$('#xgrid .story')).length, 20);
  await p.click('#xgrid .story >> nth=3'); await p.waitForSelector('.rtext'); await p.click('#rdone'); await p.waitForTimeout(800);
  assert.ok(await p.evaluate(() => Object.keys(ORD.state.userWords).concat(Object.keys(ORD.state.cards)).some(k => /^u:ex:/.test(k))), 'вираз потрапив у словник');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 421, 'без горизонтального скролу');
  await b.close(); srv.close(); if (errs.length) { console.error(errs); process.exit(1); } console.log('poems.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
