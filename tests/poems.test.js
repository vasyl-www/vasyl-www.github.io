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
  await p.route('https://no.wikisource.org/**', r => {
    const u = r.request().url();
    if (/list=search/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ query: { search: [{ title: 'Terje Vigen' }, { title: 'Terje Vigen/Kapittel 1' }] } }) });
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ parse: { text: '<div class="header">Meny</div><div class="poem"><p>Der laa en liden Dreng<br />ved Havets Bred<br />og saa paa Skyerne</p></div><table><tr><td>noter</td></tr></table><script>window.__x=1</script>' } }) });
  });
  await p.goto(base + '#poems'); await p.waitForSelector('#pgrid .story');
  assert.strictEqual(await p.evaluate(() => ORD.POEMS_CAT.length), 20, '20 віршів'); assert.strictEqual(await p.evaluate(() => ORD.EXPRESSIONS.length), 20, '20 виразів');
  assert.strictEqual((await p.$$('#pgrid .story')).length, 20); await p.click('[data-lv=A1]'); assert.ok(await p.isVisible('.lvempty'), 'порожній рівень A1 пояснено'); await p.click('[data-lv=all]');
  await p.setViewportSize({ width: 360, height: 800 }); await p.click('[data-pv=list]'); assert.ok(await p.evaluate(() => [...document.querySelectorAll('#pgrid .story')].every(e => e.getBoundingClientRect().right <= innerWidth + 1) && document.documentElement.scrollWidth <= innerWidth + 1), 'список влазить в екран'); assert.ok(await p.evaluate(() => document.querySelector('#pgrid .story b').getBoundingClientRect().width > 120), 'назва в списку не стискається'); assert.ok(await p.evaluate(() => document.querySelector('#pgrid').classList.contains('ls')), 'режим списку');
  await p.click('[data-pv=small]'); assert.ok(await p.evaluate(() => document.querySelector('#pgrid').classList.contains('sm')), 'малі іконки');
  assert.strictEqual(await p.evaluate(() => ORD.state.settings.poemsView), 'small');
  await p.click('[data-pv=big]'); await p.setViewportSize({ width: 420, height: 900 });
  await p.click('#pgrid .story >> nth=1'); await p.waitForSelector('.pfail'); assert.ok((await p.textContent('.pfail')).includes('тексту ще немає'), 'панель без тексту показана');
  await p.click('[data-ws]'); await p.waitForSelector('[data-t]'); await p.click('[data-t] >> nth=0'); await p.waitForFunction(() => document.querySelector('.ptx').value.includes('Havets'));
  const got = await p.inputValue('.ptx'); assert.ok(!/Meny|noter|__x/.test(got) && got.split('\n').length === 3, 'витяг тексту з Wikisource очищено: ' + got);
  await p.fill('.ptx', 'Dagen er fin\nog solen skinner\nover fjellet nå'); await p.click('[data-ok]'); await p.waitForSelector('.rtext'); assert.ok((await p.textContent('.rtext')).includes('solen'), 'вставлений текст відкрито');
  assert.ok(await p.evaluate(() => !!ORD.state.poems.texts.pm2 && ORD.state.poems.texts.pm2.own), 'вставлений текст збережено');
  await p.click('#pgrid .story >> nth=0'); await p.waitForSelector('.rtext');
  assert.ok((await p.textContent('.rtext')).includes('elsker'), 'вшита строфа');
  await p.evaluate(() => ORD.keys.set('anthropic', 'sk-test-00000000', { persist: false }));
  await p.click('#rdone'); await p.waitForTimeout(800);
  assert.ok(await p.evaluate(() => !!ORD.state.poems.read.pm1), 'вірш позначено вивченим');
  await p.click('[data-pt=poems]').catch(() => {}); await p.waitForSelector('#pgrid .story');
  await p.click('#pgrid .story >> nth=2'); await p.waitForSelector('[data-ai]'); await p.click('[data-ai]'); await p.waitForSelector('.rtext'); assert.ok((await p.textContent('.rtext')).includes('solen'), 'текст від ШІ');
  assert.ok((await p.textContent('.rtitle')).includes('звір з першоджерелом'), 'позначка неперевіреного тексту');
  // режим «Вчити»: ступінь 0 → пропуски → перевірка
  await p.click('#pgrid .story >> nth=0'); await p.waitForSelector('.studybtn'); await p.click('.studybtn'); await p.waitForSelector('#stnx');
  while (await p.$('#stnx')) await p.click('#stnx'); await p.waitForSelector('input.cz');
  assert.ok((await p.$$('input.cz')).length >= 2, 'є пропуски');
  const ans = await p.$$eval('input.cz', els => els.map(e => e.getAttribute('data-a')));
  const ins = await p.$$('input.cz'); for (let i = 0; i < ins.length; i++) await ins[i].fill(ans[i]);
  await p.click('#stck'); assert.ok((await p.textContent('#stmsg')).includes('Чисто'), 'повна відповідь = чисто');
  await p.click('#stck'); await p.waitForSelector('input.cz:not([disabled])'); // наступна частина
  const w1 = await p.$$eval('input.cz', els => els.length); await p.click('#stck'); // порожні відповіді
  assert.ok((await p.textContent('#stmsg')).includes('Правильно: 0 з ' + w1), 'порожнє = помилки');
  assert.ok(await p.evaluate(() => /ступінь/i.test(document.querySelector('.study').textContent)), 'ступені видно');
  // пройти решту ступенів швидко через стан: завершення
  await p.evaluate(() => { const pr = ORD.state.poems.prog = ORD.state.poems.prog || {}; pr.pm1 = { step: 0, due: Date.now() - 1000, last: 1, acc: 90, title: 'x' }; ORD.save(); ORD.renderPoems(document.querySelector('#view') || document.body.querySelector('main') || document.body); });
  await p.click('[data-pt=poems]').catch(() => {}); await p.waitForSelector('#pgrid .story');
  assert.ok((await p.textContent('#view, main, body')).includes('Повторити сьогодні'), 'банер повторень');
  await p.click('[data-pt=exprs]'); await p.waitForSelector('#xgrid .story'); assert.strictEqual((await p.$$('#xgrid .story')).length, 30, '20 ідіом + 10 фраз A1');
  await p.click('[data-lv=A1]'); assert.strictEqual(await p.evaluate(() => [...document.querySelectorAll('#xgrid .story')].filter(e => e.style.display !== 'none').length), 10, 'фільтр A1');
  await p.click('[data-lv=B1]'); assert.ok(await p.evaluate(() => [...document.querySelectorAll('#xgrid .story')].filter(e => e.style.display !== 'none').every(e => e.getAttribute('data-lvl') === 'B1')), 'фільтр B1');
  assert.strictEqual(await p.evaluate(() => ORD.state.settings.poemsLvl), 'B1');
  await p.click('[data-lv=all]');
  await p.click('#xgrid .story >> nth=3'); await p.waitForSelector('.rtext'); await p.click('#rdone'); await p.waitForTimeout(800);
  assert.ok(await p.evaluate(() => Object.keys(ORD.state.userWords).concat(Object.keys(ORD.state.cards)).some(k => /^u:ex:/.test(k))), 'вираз потрапив у словник');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 421, 'без горизонтального скролу');
  await b.close(); srv.close(); if (errs.length) { console.error(errs); process.exit(1); } console.log('poems.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
