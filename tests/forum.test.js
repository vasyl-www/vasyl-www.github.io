/* Форум: нове обговорення, відповіді персонажів, публікації ШІ (погода, мем, відео), очищення SVG, тап по слову. Anthropic і open-meteo підміняються. */
const { chromium } = require('playwright'); const assert = require('assert');
const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.route('https://geocoding-api.open-meteo.com/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [{ name: 'Tromsø', latitude: 69.65, longitude: 18.95 }] }) }));
  await p.route('https://api.open-meteo.com/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: -3.4, apparent_temperature: -8, wind_speed_10m: 5, weather_code: 73 }, daily: { temperature_2m_max: [-1], temperature_2m_min: [-6], sunrise: ['2026-10-27T08:10'], sunset: ['2026-10-27T15:40'] } }) }));
  await p.route('https://api.anthropic.com/**', r => {
    const body = JSON.parse(r.request().postData()), sys = body.system || '', txt = body.messages[0].content; let out;
    if (/Створи публікацію \(meme\)/.test(txt)) out = { title: 'Tacofredag-beredskap', top: 'FREDAG', bottom: 'TACO', svg: '<svg viewBox="0 0 320 200"><script>window.__x=1</script><rect width="320" height="200" fill="#357" onclick="window.__y=1"/><image href="https://evil/x.png"/></svg>', no: 'Alle venter på taco.', uk: 'Усі чекають тако.', explain: 'Tacofredag — традиція.' };
    else if (/Створи публікацію \(video\)/.test(txt)) out = { title: 'Norsk uttale', no: 'Se denne.', uk: 'Подивись.', q: 'norsk uttale for nybegynnere' };
    else if (/Ти Kari/.test(sys)) out = { no: 'Det er kaldt. Ta på lue!', uk: 'Холодно. Одягни шапку!' };
    else if (/^Слово:/.test(txt)) out = { lemma: 'hvordan', art: '', pos: 'прислівник', meanings: [{ uk: 'як', note: '', ex: '', exUk: '' }], forms: [], idioms: [] };
    else out = { replies: [{ who: 'per', no: 'Hei! Bruk hjelm.', uk: 'Привіт! Носи каску.' }, { who: 'kari', no: 'Lykke til!', uk: 'Успіхів!' }], fix: 'Пиши «arbeider», а не «arbeide».' };
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ content: [{ text: JSON.stringify(out) }] }) });
  });
  await p.goto(base + '#read'); await p.waitForSelector('#lgrid');
  await p.evaluate(() => { ORD.keys.set('anthropic', 'sk-test-00000000', { persist: false }); ORD.go('forum'); }); await p.waitForSelector('#fnew');
  await p.click('#fnew'); await p.fill('#ct', 'Перший день'); await p.fill('#cm', 'Hei, jeg er arbeide i dag.'); await p.click('#cgo');
  await p.waitForSelector('.fpost:not(.me)'); assert.strictEqual((await p.$$('.fpost:not(.me)')).length, 2, 'відповіді двох персонажів');
  assert.ok((await p.textContent('#fp')).includes('arbeider'), 'виправлення помилок');
  await p.fill('#fm', 'Hvordan har du det?'); await p.press('#fm', 'Enter'); await p.waitForFunction(() => document.querySelectorAll('.fpost').length >= 5);
  await p.click('.fpost:not(.me) .fw >> nth=0'); await p.waitForSelector('.popover'); await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelectorAll('.popover').forEach(x => x.remove()));
  await p.click('.fpost:not(.me) [data-tg] >> nth=0'); assert.ok(await p.isVisible('.fpost:not(.me) .ftr >> nth=0'), 'переклад посту');
  await p.click('#fb'); await p.click('[data-k=weather]'); await p.waitForSelector('.wcard'); assert.ok((await p.textContent('.wcard')).includes('Tromsø') && (await p.textContent('.wcard')).includes('сніг'), 'картка погоди');
  await p.click('#fb'); await p.click('[data-k=meme]'); await p.waitForSelector('.mimg img');
  const svg = await p.evaluate(() => decodeURIComponent(document.querySelector('.mimg img').src.split(',').slice(1).join(',')));
  assert.ok(!/script|onclick|<image|evil/.test(svg) && /<rect/.test(svg), 'SVG очищено: ' + svg);
  assert.ok((await p.textContent('.mimg')).includes('FREDAG'), 'підписи мему');
  await p.click('#fb'); await p.click('[data-k=video]'); await p.waitForSelector('a[href*="youtube.com/results"]');
  assert.ok((await p.getAttribute('a[href*="youtube.com/results"]', 'href')).includes('norsk%20uttale'), 'посилання на пошук');
  await p.click('#fb'); assert.strictEqual((await p.$$('#ftl .thr-i')).length, 4, 'список обговорень');
  assert.ok(await p.evaluate(() => ORD.state.forum.threads.length === 4 && !window.__x && !window.__y), 'стан збережено, скрипти не виконались');
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 421, 'без горизонтального скролу');
  await b.close(); srv.close(); if (errs.length) { console.error(errs); process.exit(1); } console.log('forum.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
