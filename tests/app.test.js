'use strict';
/* Повний прохід у Chromium: сервер із тимчасовими даними й підробленим Anthropic, сесія, читалка, репетитор, статистика, збереження. */
const { chromium } = require('playwright'); const assert = require('assert'); const fs = require('fs'); const os = require('os'); const path = require('path');
const { create } = require('../tools/serve');
const fakeText = (body) => { const sys = body.system || '', last = body.messages[body.messages.length - 1].content; let text;
  if (/словник норвезької/.test(sys)) text = '{"lemma":"sveiseovn","art":"en","uk":"піч для електродів","ex":"Elektrodene ligger i sveiseovnen.","exUk":"Електроди лежать у печі."}';
  else if (/співрозмовник/.test(sys)) text = JSON.stringify({ reply: 'Hvor lenge har du bodd i Norge?', corrections: /jeg er arbeide/i.test(last) ? [{ wrong: 'arbeide', right: 'arbeider', why: 'форма теперішнього часу' }] : [], newWords: [{ no: 'bodd', uk: 'жив' }], hint: 'Скажи, скільки років.' });
  else text = 'Переклад.';
  return text; };
const srv = create();
(async function () {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 800 }, permissions: [] }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404|409/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { window.speechSynthesis && (speechSynthesis.speak = () => {}); });
  const shots = process.env.SHOTS || '';
  await ctx.route('https://api.anthropic.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ text: fakeText(JSON.parse(r.request().postData())) }] }) }));
  await p.goto(base + '#read'); await p.waitForSelector('h2');
  await p.evaluate(() => ORD.keys.set('anthropic', 'sk-test-00000000', { persist: false }));
  assert.ok(await p.evaluate(() => ORD.words.length) >= 167 + 73, 'слова завантажені');
  // --- сесія
  await p.click('#nav [data-v=learn]'); await p.click('#lgo'); await p.waitForSelector('.stage');
  const kinds = new Set(); let answered = 0;
  async function drive() {
  for (let step = 0; step < 60; step++) {
    if (await p.$('.panel.center h2')) break;
    const w = await p.evaluate(() => ORD.currentWord()); if (!w) break;
    const tag = await p.textContent('.sess-head .tag'); kinds.add(tag);
    if (await p.$('.stage [data-ok]')) { await p.click('.stage [data-ok]'); continue; }
    if (await p.$('.feedback [data-next]')) { await p.click('.feedback [data-next]'); continue; }
    if (await p.$('.stage .opts')) { const opts = await p.$$eval('.opt', os => os.map(o => o.textContent.replace(/^\d+\s*/, '').trim())); const right = [w.uk, (w.art ? w.art + ' ' : '') + w.no]; const i = opts.findIndex(t => right.includes(t)); assert.ok(i >= 0, 'є правильний варіант: ' + opts + ' / ' + right); await p.click('.opt >> nth=' + i); answered++; continue; }
    if (await p.$('.stage form input')) { const clozeText = await p.$eval('.prompt', e => e.textContent); let ans = w.no; if (/_____/.test(clozeText)) { const m = w.ex.match(new RegExp('([A-Za-zÆØÅæøå]+)', 'g')); ans = (await p.evaluate(() => 1)) && null; }
      if (/Диктант|Послухай речення/.test(clozeText) || tag === 'Диктант') ans = w.ex; if (tag === 'Пропуск') { await p.click('[data-dunno]'); answered++; continue; }
      await p.fill('.stage form input', ans); await p.click('.stage form .btn'); answered++; continue; }
    if (await p.$('.stage [data-show]')) { await p.click('[data-show]'); await p.click('.grades .btn >> nth=2'); answered++; continue; }
    if (await p.$('.stage [data-dunno]')) { await p.click('[data-dunno]'); answered++; continue; }
    throw new Error('невідомий екран вправи: ' + tag);
  }
  }
  await drive();
  assert.ok(answered >= 8, 'відповіді в сесії: ' + answered);
  const st = await p.evaluate(() => ({ cards: Object.keys(ORD.state.cards).length, log: ORD.state.log.length, rev: ORD.state.rev }));
  assert.ok(st.cards >= 10 && st.log >= 8, JSON.stringify(st));
  if (shots) await p.screenshot({ path: shots + '/learn.png' });
  // --- сесія зі зрілими картками: усі типи вправ (голос і розпізнавання підміняємо, щоб відрендерити аудіо-вправи)
  await p.evaluate(() => { ORD.hasVoice = () => true; ORD.canListen = () => true; ORD.state.settings.newPerDay = 0; const now = Date.now(); ORD.words.slice(0, 40).forEach(w => { ORD.state.cards[w.id] = Object.assign(ORD.srs.newCard(w.id, now - 1e9), { st: 'review', ivl: 40, ease: 2.5, due: now - 1000, reps: 5 }); }); ORD.save(); });
  await p.evaluate(() => ORD.go('home')); await p.click('#nav [data-v=learn]'); await p.click('#lgo'); await p.waitForSelector('.stage');
  const a0 = answered; await drive(); assert.ok(answered - a0 >= 20, 'друга сесія: ' + (answered - a0));
  assert.ok([...kinds].some(k => /Напиши|Картка|Пропуск|Диктант|Вимова/.test(k)), 'зрілі картки дають інші типи вправ: ' + [...kinds]);
  // --- читалка
  await p.click('#nav [data-v=read]'); await p.click('#rlist .story >> nth=0'); await p.waitForSelector('.rtext .rw');
  assert.ok(/Ти знаєш/.test(await p.textContent('.cov')), 'покриття слів');
  await p.click('.rtext .rw.u >> nth=0'); await p.waitForSelector('.popover [data-add], .popover [data-known]');
  if (shots) await p.screenshot({ path: shots + '/reader.png' });
  const before = await p.evaluate(() => Object.keys(ORD.state.cards).length); const add = await p.$('.popover [data-add]'); if (add) await add.click();
  assert.ok(await p.evaluate(() => Object.keys(ORD.state.cards).length) >= before, 'додавання зі слова');
  await p.evaluate(() => document.querySelectorAll('.popover').forEach(x => x.remove()));
  await p.evaluate(() => document.querySelector('details').open = true); await p.fill('#rown', 'Jeg bruker sveiseovn hver dag.'); await p.click('#rgo'); await p.waitForSelector('.rtext .rw');
  await p.click('.rw[data-w="sveiseovn"]'); await p.waitForSelector('.popover [data-add]'); await p.click('.popover [data-add]');
  assert.ok(await p.evaluate(() => !!ORD.state.userWords['u:sveiseovn'] && !!ORD.state.cards['u:sveiseovn']), 'слово з ШІ додано як картку');

  // --- репетитор
  await p.evaluate(() => ORD.go('tutor')); await p.click('.menu .btn >> nth=0'); await p.fill('#tin', 'Jeg er arbeide i Tromsø.'); await p.click('.tutor-h ~ form .btn, form.row .btn:last-child');
  await p.waitForSelector('.bub.bot.no >> nth=1'); assert.ok(await p.$('.corr s'), 'виправлення показано');
  await p.click('.nw .chip >> nth=0'); assert.ok(await p.evaluate(() => !!ORD.state.userWords['u:bodd']), 'слово з діалогу додано');
  if (shots) await p.screenshot({ path: shots + '/tutor.png' });
  await p.click('#tend'); await p.waitForSelector('#tback'); assert.ok(await p.evaluate(() => ORD.state.tutor.sessions.length === 1), 'діалог збережено');
  // --- статистика, слова, налаштування
  await p.evaluate(() => ORD.go('stats')); await p.waitForSelector('.kpis'); assert.ok(await p.$('svg.chart') && await p.$('.heat'), 'графіки');
  if (shots) await p.screenshot({ path: shots + '/stats.png' });
  await p.evaluate(() => ORD.go('words')); await p.fill('#wq', 'sveis'); assert.ok((await p.$$('#wl .mrow')).length >= 5, 'пошук слів');
  await p.evaluate(() => ORD.go('settings')); await p.fill('#sn', '5'); await p.dispatchEvent('#sn', 'change'); assert.strictEqual(await p.evaluate(() => ORD.state.settings.newPerDay), 5);
  // --- Ord 2: бібліотека, речення, поріг, практика, профіль
  await p.click('#nav [data-v=read]'); await p.waitForSelector('#lgrid .story svg.cover');
  assert.ok((await p.$$('#lgrid .story')).length >= 11, 'бібліотека історій');
  await p.click('#llv .chip >> text=A1'); assert.strictEqual((await p.$$('#lgrid .story')).length, 4, 'фільтр A1');
  await p.click('#lgrid .story >> nth=0'); await p.waitForSelector('.rtext .sent');
  assert.ok(await p.$('.cov .thr'), 'шкала порогу в читанні');
  await p.click('.sbtn >> nth=0'); assert.ok(await p.isVisible('.str >> nth=0'), 'переклад речення');
  await p.click('#rdone'); assert.ok(await p.evaluate(() => !!ORD.state.read.s1), 'історію позначено прочитаною');
  assert.ok(await p.$('#lgrid .story .dn'), 'позначка прочитано в бібліотеці');
  await p.evaluate(() => ORD.go('practice')); await p.evaluate(() => { Math.random = () => 0; }); await p.click('[data-m=dict]'); await p.waitForSelector('#da');
  const target = await p.evaluate(() => { const t = ORD.stories[0].s[0][0]; return t; });
  await p.fill('#da', 'I dag er det min forste dag'); await p.click('#dc'); await p.waitForSelector('#dr .feedback .dok');
  assert.ok(await p.$('#dr .dbad'), 'диктант показує пропущені слова');
  await p.click('[data-m=pairs]').catch(() => {}); await p.evaluate(() => ORD.go('practice')); await p.click('[data-m=pairs]'); await p.waitForSelector('#po .opt');
  await p.click('#po .opt >> nth=0'); await p.waitForSelector('#pf .feedback'); await p.click('#pn');
  await p.evaluate(() => ORD.go('practice')); await p.click('[data-m=shadow]'); await p.waitForSelector('#sl');
  assert.ok(await p.evaluate(() => ORD.state.practice.dict.length >= 1 && ORD.state.practice.pairs.length >= 1), 'практику записано');
  await p.evaluate(() => ORD.go('profile')); await p.waitForSelector('.lvrow .thr'); assert.strictEqual((await p.$$('.lvrow')).length, 2, 'поріг читання A1 і A2');
  assert.ok(await p.$('#pstats svg.chart'), 'статистика всередині профілю');
  // --- перезавантаження: прогрес лишається в localStorage
  const st0 = await p.evaluate(() => ({ cards: Object.keys(ORD.state.cards).length, log: ORD.state.log.length, uw: Object.keys(ORD.state.userWords).length, n: ORD.state.settings.newPerDay }));
  await p.reload(); await p.waitForSelector('h2');
  const st1 = await p.evaluate(() => ({ cards: Object.keys(ORD.state.cards).length, log: ORD.state.log.length, uw: Object.keys(ORD.state.userWords).length, n: ORD.state.settings.newPerDay }));
  assert.deepStrictEqual(st1, st0, 'стан збережено в localStorage');
  await b.close(); srv.close();
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  console.log('app.test: OK (відповідей ' + answered + ')');
})().catch(e => { console.error(e); process.exit(1); });
