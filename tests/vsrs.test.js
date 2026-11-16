const { chromium } = require('playwright'); const assert = require('assert'); const { create } = require('../tools/serve');
(async () => {
  const srv = create(); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch(), errs = [], p = await b.newPage({ viewport: { width: 420, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(base + '#learn'); await p.waitForSelector('#lverb'); await p.addStyleTag({ content: '.aipop{display:none!important}' });
  await p.click('#lverb'); await p.waitForSelector('#vsgo');
  assert.strictEqual(await p.evaluate(() => ORD.vsrs.counts().fresh), 5, 'ліміт нових 5');
  await p.click('#vsgo');
  // 5 нових; перша відповідь невдала → дієслово повертається в черзі без повторного показу форм
  let intros = 0, first = null, asked = 0;
  while (!(await p.$('#vsa'))) {
    await p.waitForSelector('#vsg, #vp, #vsa'); if (await p.$('#vsa')) break;
    if (await p.$('#vsg')) { const inf = (await p.textContent('.stage .no')).split(' – ')[0]; if (!first) first = inf; intros++; await p.click('#vsg'); await p.waitForSelector('#vp'); }
    const inf = (await p.textContent('.stage .no')).replace(/^å /, ''); const v = await p.evaluate(x => ORD.verbs.find(y => y.inf === x), inf);
    if (asked++ === 0) { await p.fill('#vp', 'xx'); await p.fill('#vf', 'yy'); } else { await p.fill('#vp', v.past); await p.fill('#vf', v.perf); }
    await p.click('button[type=submit]'); await p.waitForSelector('#vn'); await p.click('#vn');
  }
  assert.strictEqual(intros, 5); assert.strictEqual(asked, 6, 'п’ять нових + один повтор');
  const st = await p.evaluate(x => ({ c: ORD.state.vcards[x], n: Object.keys(ORD.state.vcards).length, vn: ORD.state.vnew, log: ORD.state.vlog.length }), first);
  assert.strictEqual(st.n, 5); assert.strictEqual(st.vn.n, 5); assert.ok(st.c.lapses === 0 && st.log === 6, JSON.stringify(st));
  assert.ok(/5 \/ 6/.test(await p.textContent('#vsbox')), await p.textContent('#vsbox'));
  // вдруге нових не додає (ліміт), а ліміт змінюється
  assert.strictEqual(await p.evaluate(() => ORD.vsrs.counts().fresh), 0);
  // прострочення з'являється в головній пропозиції
  await p.evaluate(() => { Object.values(ORD.state.vcards).forEach(c => { c.due = Date.now() - 1000; c.st = 'review'; c.ivl = 3; }); ORD.save(); });
  assert.strictEqual(await p.evaluate(() => ORD.vsrs.counts().due), 5);
  assert.ok(await p.evaluate(() => ORD.mind.next().some(x => x.id === 'vsrs')));
  // злиття між пристроями
  const m = await p.evaluate(() => { const a = { vcards: { x: { id: 'x', last: 1, reps: 1 } }, vnew: { d: '2026-11-15', n: 3 } }, b = { vcards: { x: { id: 'x', last: 5, reps: 2 }, y: { id: 'y', last: 1, reps: 1 } }, vnew: { d: '2026-11-16', n: 2 } }; return ORD.sync && ORD.sync.mergeStates ? ORD.sync.mergeStates(Object.assign(JSON.parse(JSON.stringify(ORD.state)), a), Object.assign(JSON.parse(JSON.stringify(ORD.state)), b)) : null; });
  if (m) assert.ok(m.vcards.x.last === 5 && m.vcards.y && m.vnew.d === '2026-11-16', 'merge');
  assert.ok(!errs.length, errs.join('|')); await b.close(); srv.close(); console.log('vsrs.test: OK');
})().catch(e => { console.error(e); process.exit(1); });
