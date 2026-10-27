/* Читалка (тап на слово, 🌐, кнопки), теми, звук натискань, ШІ-віконце, ігри, нагадування. */
const assert = require('assert'), path = require('path'), { chromium } = require('playwright'), { create } = require('../tools/serve.js');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, hasTouch: true, isMobile: true }); const errs = [];
  await ctx.route(/api\.deepseek\.com/, r => { const body = JSON.parse(r.request().postData() || '{}'), sys = (body.messages && body.messages[0] && body.messages[0].content) || '';
    if (/куратор стрічки/.test(sys)) { const N = +(/N=(\d+)/.exec(JSON.stringify(body.messages)) || [0, 10])[1], arr = []; for (let i = 0; i < N; i++) arr.push(i % 5 === 0 ? { t: 'fact', title: 'Fakta ' + i + '<img src=x onerror="window.__xss=7">', no: 'Tromsø ligger nord.', uk: 'Тромсе на півночі.' } : i % 5 === 3 && i < 4 ? { t: 'svg', title: 'Tegning', no: 'Et hus', uk: 'Дім', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>window.__xss=8</script><rect width="10" height="10"/></svg>' } : { t: 'photo', title: 'Bilde ' + i, uk: 'Фото', query: 'Tromsø' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ pins: arr }) } }] }) }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content: 'Sveise = зварювати.' } }] }) }); });
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8Dwn4GBgYGJAQoAHhgCAh6X4CYAAAAASUVORK5CYII=', 'base64');
  await ctx.route(/commons\.wikimedia\.org\/w\/api\.php/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ query: { pages: {
    1: { index: 1, title: 'File:Tromsø bro.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/a/Tromso.jpg', thumburl: 'https://upload.wikimedia.org/t/Tromso.jpg', mime: 'image/jpeg', size: 1000, extmetadata: { Artist: { value: '<a href="x">Ola</a> <script>window.__x=1</script>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, ObjectName: { value: '<img src=x onerror="window.__xss=9">Tromsøbrua' } } }] },
    2: { index: 2, title: 'File:Evil.jpg', imageinfo: [{ url: 'https://evil.example/e.jpg', thumburl: 'https://evil.example/e.jpg', mime: 'image/jpeg', size: 10, extmetadata: {} }] } } } }) }));
  await ctx.route(/api\.openverse\.org\/v1\/images/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ results: [{ title: 'Nordlys', thumbnail: 'https://api.openverse.org/v1/images/abc/thumb/', creator: 'Kari', license: 'by', license_version: '4.0', foreign_landing_url: 'https://example.org/n', width: 400, height: 300 }, { title: 'Bad', thumbnail: 'https://evil.example/t.jpg' }] }) }));
  await ctx.route(/upload\.wikimedia\.org|api\.openverse\.org\/v1\/images\/abc/, r => r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 4).join(' ')));
  await p.addInitScript(() => { window.__tones = 0; const A = window.AudioContext; window.AudioContext = function () { const c = new A(); const o = c.createOscillator.bind(c); c.createOscillator = () => { window.__tones++; return o(); }; return c; }; });
  await p.goto(base + '#read'); await p.waitForSelector('#lgrid .story');
  // --- читалка на телефоні: тап по історії прокручує до тексту, тап по слову, 🌐, кнопки не під меню
  await p.tap('#lgrid .story'); await p.waitForSelector('.rtext .rw');
  await p.tap('.rtext .rw >> nth=1'); await p.waitForSelector('.popover'); assert.ok(await p.isVisible('.popover [data-add]') || await p.isVisible('.popover .tag'), 'попап слова з кнопкою');
  const popBottom = await p.$eval('.popover', e => e.getBoundingClientRect().bottom), navTop = await p.$eval('#nav', e => e.getBoundingClientRect().top); assert.ok(popBottom <= navTop + 1, 'попап не під нижнім меню');
  await p.tap('.popover [data-x]'); await p.waitForFunction(() => !document.querySelector('.popover'));
  const sb = await p.$eval('.sbtn', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }); assert.ok(sb[0] >= 32 && sb[1] >= 32, 'значок 🌐 достатньо великий для пальця');
  await p.tap('.sbtn >> nth=0'); assert.strictEqual(await p.$eval('.str', e => e.hidden), false, '🌐 показує переклад речення');
  for (const id of ['#rdone', '#rtr', '#radd', '#rspeak']) { const ok = await p.$eval(id, e => { e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e.contains(t); }); assert.ok(ok, id + ' не перекритий'); }
  // --- теми
  const th = () => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const t0 = await th(); await p.tap('#themeBtn'); assert.notStrictEqual(await th(), t0, 'кнопка теми перемикає');
  assert.strictEqual(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), (await th()) === 'light' ? 'rgb(244, 246, 251)' : 'rgb(16, 20, 31)', 'фон відповідає темі');
  await p.evaluate(() => { ORD.state.settings.theme = 'auto'; ORD.applyTheme(); }); assert.ok(['light', 'dark'].includes(await th()), 'авто-тема');
  // --- звук натискань
  await p.evaluate(() => { ORD.state.settings.sfx = true; window.__tones = 0; }); await p.tap('#nav button >> nth=1'); assert.ok(await p.evaluate(() => window.__tones) > 0, 'натискання грає звук');
  await p.evaluate(() => { ORD.state.settings.sfx = false; window.__tones = 0; }); await p.tap('#nav button >> nth=0'); assert.strictEqual(await p.evaluate(() => window.__tones), 0, 'без звуку, коли вимкнено');
  // --- ШІ-віконце з полем
  await p.tap('.aifab'); await p.waitForSelector('.aipop #aiq'); assert.ok((await p.textContent('.aipop-log')).includes('Hei'), 'привітання від ШІ');
  await p.evaluate(() => { ORD.state.settings.aiPref = 'deepseek'; ORD.keys.set('deepseek', 'TESTKEY12345', { persist: false, free: true }); });
  await p.reload(); await p.waitForSelector('.aifab'); await p.tap('.aifab'); await p.fill('#aiq', 'Що таке sveise?'); await p.press('#aiq', 'Enter');
  await p.waitForFunction(() => document.querySelector('.aipop-log').textContent.includes('зварювати') || document.querySelector('.aipop-log').textContent.includes('ключ') || document.querySelector('.aipop-log').textContent.includes('Додай'), null, { timeout: 8000 });
  assert.ok((await p.textContent('.aipop-log')).includes('Що таке sveise?'), 'питання користувача в логу');
  await p.tap('.aipop [data-x]'); assert.strictEqual(await p.isVisible('.aipop'), false, 'віконце закривається');
  // --- ігри
  await p.evaluate(() => ORD.go('games')); await p.waitForSelector('.gm .tile'); assert.strictEqual((await p.$$('.gm .tile')).length, 4, '4 гри');
  await p.tap('.gm .tile >> nth=0'); await p.waitForSelector('#op .opt'); const q = await p.textContent('#q'); const right = await p.evaluate(q => { const w = ORD.words.find(x => ((x.art ? x.art + ' ' : '') + x.no) === q); return w && w.uk; }, q);
  const opts = await p.$$eval('#op .opt', e => e.map(x => x.textContent)); assert.ok(opts.includes(right), 'серед варіантів є правильний'); const i = opts.indexOf(right); await p.tap('#op .opt >> nth=' + i); assert.strictEqual(await p.textContent('#sc'), '10', 'очки за правильну');
  await p.evaluate(() => ORD.go('games')); await p.tap('.gm .tile >> nth=3'); await p.waitForSelector('#mg .gcell'); assert.strictEqual((await p.$$('#mg .gcell')).length, 16, 'меморі 16 карток');
  await p.evaluate(() => ORD.go('games')); await p.tap('.gm .tile >> nth=2'); await p.waitForSelector('.ordle'); const len = await p.$$eval('.ordle .r:first-child .c', e => e.length); assert.ok(len >= 4 && len <= 6);
  const ans = await p.evaluate(() => { const d = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); const c = ORD.words.filter(w => /^[a-zæøå]{4,6}$/i.test(w.no)).sort((a, b) => a.id < b.id ? -1 : 1); return c[(d * 7919) % c.length].no.toLowerCase(); });
  for (const ch of ans) await p.tap('[data-k="' + ch + '"]'); await p.tap('[data-k="⏎"]'); await p.waitForSelector('.ordle .c.g'); assert.ok((await p.textContent('.panel.center')).includes('Вгадано'), 'Ordle: правильне слово');
  await p.evaluate(() => ORD.go('games')); await p.tap('.gm .tile >> nth=1'); await p.waitForSelector('.fw2'); await p.waitForTimeout(600); const tg = await p.textContent('#tg');
  const hit = await p.evaluate(tg => { const w = ORD.words.find(x => ((x.art ? x.art + ' ' : '') + x.no) === tg); return [...document.querySelectorAll('.fw2')].findIndex(e => e.textContent === w.uk); }, tg); assert.ok(hit >= 0, 'падаюче слово з перекладом є'); await p.evaluate(i => document.querySelectorAll('.fw2')[i].click(), hit); assert.strictEqual(await p.textContent('#sc'), '10', 'падаючі слова: очки');
  // --- нагадування: без дозволу вимикаються, з дозволом показують сповіщення
  await p.evaluate(() => ORD.go('profile')); await p.evaluate(() => { const r = document.getElementById('main'); ORD.renderSettings(r); }); await p.waitForSelector('#urm');
  await p.evaluate(() => { window.__n = []; Object.defineProperty(Notification, 'permission', { get: () => 'granted', configurable: true }); Notification.requestPermission = async () => 'granted'; if (navigator.serviceWorker) { const o = navigator.serviceWorker.ready; Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve({ showNotification: (t, o) => { window.__n.push([t, o.body]); return Promise.resolve(); } }), configurable: true }); } });
  await p.evaluate(() => { document.querySelector('#urm').click(); }); await p.waitForFunction(() => ORD.state.settings.remind === true); await p.tap('#utn'); await p.waitForFunction(() => window.__n.length > 0); assert.ok((await p.evaluate(() => window.__n[0][1])).length > 5, 'тестове сповіщення');
  // --- піни: своє (файл, нотатка, посилання), пошук у відкритих джерелах, XSS, чужі хости
  assert.strictEqual(await p.$eval('#nav button', e => e.getAttribute('data-v')), 'translate', 'перекладач перший у меню');
  await p.evaluate(() => ORD.go('pins')); await p.waitForSelector('#pf', { state: 'attached' });
  await p.setInputFiles('#pf', { name: 'bilde.png', mimeType: 'image/png', buffer: PNG }); await p.waitForSelector('.pin img');
  await p.setInputFiles('#pf', { name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>') }); await p.waitForTimeout(300); assert.strictEqual((await p.$$('.pin')).length, 1, 'SVG відхилено');
  await p.tap('#pn'); await p.fill('#nb', 'Jeg sveiser rør'); await p.tap('#ns'); await p.waitForFunction(() => document.querySelectorAll('.pin').length === 2);
  await p.tap('#pl'); await p.fill('#lu', 'javascript:alert(1)'); await p.tap('#ls'); assert.strictEqual((await p.$$('.pin')).length, 2, 'javascript:-посилання відхилено');
  await p.fill('#lu', 'https://yr.no'); await p.tap('#ls'); await p.waitForFunction(() => document.querySelectorAll('.pin').length === 3);
  await p.evaluate(() => { window.__xss = 0; }); await p.tap('[data-m=find]'); await p.fill('#pqi', 'Tromsø'); await p.press('#pqi', 'Enter'); await p.waitForFunction(() => document.querySelectorAll('.pin').length >= 2, null, { timeout: 8000 });
  const ts = await p.$$eval('.pin .ptit', e => e.map(x => x.textContent)); assert.ok(ts.some(t => t.includes('Tromsøbrua')) && ts.includes('Nordlys'), 'результати з обох джерел'); assert.ok(!ts.includes('Evil') && !ts.includes('Bad'), 'чужі хости відкинуто');
  assert.strictEqual(await p.evaluate(() => window.__xss), 0, 'XSS із назви не виконався');
  await p.tap('.pin >> nth=0'); await p.waitForSelector('.pinlb'); assert.ok((await p.textContent('.pinlb')).includes('CC BY'), 'ліцензія видна'); await p.tap('[data-save]'); await p.waitForFunction(() => document.querySelector('[data-save]').disabled); await p.tap('.pclose');
  await p.tap('[data-m=mine]'); await p.waitForFunction(() => document.querySelectorAll('.pin').length === 4, null, { timeout: 5000 });
  await p.tap('.pin >> nth=0'); await p.tap('[data-del]'); await p.tap('[data-del]'); await p.waitForFunction(() => document.querySelectorAll('.pin').length === 3);
  // --- стрічка ШІ: 10–30 пінів на день, підписи моделі, фото з відкритих джерел, free/paid
  await p.evaluate(() => { ORD.state.settings.aiPref = 'deepseek'; ORD.state.pinsAi = { day: '', n: 0, per: 12 }; ORD.keys.set('deepseek', 'TESTKEY12345', { persist: false, free: true }); });
  await p.reload(); await p.waitForSelector('.aifab'); await p.evaluate(() => { ORD.keys.set('deepseek', 'TESTKEY12345', { persist: false, free: true }); ORD.state.settings.aiPref = 'deepseek'; ORD.state.pinsAi = { day: '', n: 0, per: 12 }; ORD.save(); ORD.pinsMode = 'ai'; ORD.go('pins'); });
  await p.waitForFunction(() => document.querySelectorAll('.pin').length >= 12, null, { timeout: 15000 }).catch(async e => { console.log(await p.evaluate(async () => JSON.stringify({ msg: document.getElementById('pmsg') && document.getElementById('pmsg').textContent, st: ORD.state.pinsAi, all: (await ORD.pins.all()).map(x => x.kind + ':' + (x.gen && (x.gen.provider || x.gen.builtin))), av: ORD.keys.available && ORD.keys.available() }))); throw e; });
  const n = await p.$$eval('.pin', e => e.length); assert.ok(n >= 12 && n <= 30, 'пінів за день у межах 10–30: ' + n);
  const kinds = await p.evaluate(async () => (await ORD.pins.all()).filter(x => x.from === 'ai').map(x => x.kind)); assert.ok(kinds.includes('note') && kinds.includes('image') && kinds.includes('svg'), 'є тексти, фото й SVG: ' + kinds.join());
  assert.ok(await p.evaluate(async () => (await ORD.pins.all()).filter(x => x.from === 'ai').every(x => x.gen && (x.gen.provider === 'deepseek' || x.gen.builtin))), 'кожен пін підписаний');
  assert.ok(!(await p.evaluate(() => window.__xss)), 'XSS із SVG/назв не спрацював');
  assert.strictEqual(await p.evaluate(() => ORD.state.pinsAi.n <= 30), true);
  await p.tap('#pt .chip >> nth=2'); await p.waitForTimeout(200); assert.ok((await p.$$('.pin')).length >= 1, 'вкладка безкоштовних ШІ містить піни DeepSeek'); await p.tap('#pt .chip >> nth=1'); await p.waitForTimeout(200); assert.strictEqual((await p.$$('.pin')).length, 0, 'платні ШІ: порожньо');
  assert.deepStrictEqual(errs, [], 'без помилок JS');
  await b.close(); srv.close(); console.log('ui.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
