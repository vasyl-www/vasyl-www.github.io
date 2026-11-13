/* Вимірювання використання: час у застосунку, візити, час по вкладках і годинах, натискання (елемент + грубий сектор екрана),
   підказки, затримка до першої літери, функції, що використовуються. Лише лічильники: жодного тексту, слів чи відповідей.
   Зберігається локально (state.tele[пристрій]) і синхронізується; нічого не відправляється, доки ти сам не скопіюєш звіт. */
(function () {
  var O = window.ORD, IDLE = 60000, GAP = 30 * 60000, KEEP = 120, last = 0, dirty = false, curSess = null, lastFlush = 0;
  function on() { return O.state && O.state.settings.tele !== false; }
  function dev() { var s = O.state; if (!s.devId) s.devId = 'd' + Math.random().toString(36).slice(2, 8); return s.devId; }
  function dkey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function root() { var s = O.state; s.tele = s.tele || {}; var d = dev(); return (s.tele[d] = s.tele[d] || { v: 1, days: {}, first: Date.now(), last: 0 }); }
  function blank() { return { vis: 0, act: 0, views: {}, hrs: new Array(24).fill(0), sess: [], hint: 0, tn: 0, fkn: 0, fks: 0, taps: {}, zones: {}, dead: 0, swipe: 0, dz: {}, feat: {} }; }
  function today() { var r = root(), k = dkey(), d = r.days[k]; if (!d) { d = r.days[k] = blank(); var ks = Object.keys(r.days).sort(); while (ks.length > KEEP) delete r.days[ks.shift()]; } return d; }
  function inc(o, k, n) { o[k] = (o[k] || 0) + (n || 1); }
  function newVisit() { var r = root(), d = today(); d.vis++; r.last = Date.now(); curSess = { i: d.sess.length }; d.sess.push(0); if (d.sess.length > 40) { d.sess.shift(); curSess.i--; } dirty = true; }

  /* ---- активність і тікер: рахуємо секунду, якщо вкладка видима й була дія за останні 60 с ---- */
  function act() { var n = Date.now(); if (on() && (!curSess || n - last > GAP)) { newVisit(); } last = n; }
  ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input'].forEach(function (ev) { window.addEventListener(ev, function () { if (O.state) act(); }, { capture: true, passive: true }); });
  setInterval(function () {
    if (!O.state || !on() || document.visibilityState !== 'visible' || !last || Date.now() - last > IDLE) return;
    var d = today(), h = new Date().getHours(), v = O.curView || 'home'; d.act++; d.hrs[h]++; inc(d.views, v); if (curSess && d.sess[curSess.i] != null) d.sess[curSess.i]++; dirty = true;
    if (Date.now() - lastFlush > 60000) flush();
  }, 1000);
  function flush() { if (dirty && O.state) { dirty = false; lastFlush = Date.now(); O.save(); } }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);

  /* ---- натискання: ідентифікатор елемента (id / data-атрибут / клас, ніколи не текст) + сектор екрана 3×5 ---- */
  var ATTRS = ['data-v', 'data-a', 'data-g', 'data-hb', 'data-e', 'data-h', 'data-q', 'data-say', 'data-next', 'data-ok', 'data-dunno', 'data-show', 'data-pa', 'data-pw', 'data-rp', 'data-sh', 'data-em', 'data-x', 'data-od'];
  function key(el) {
    if (el.id) return '#' + el.id.slice(0, 24);
    for (var i = 0; i < ATTRS.length; i++) { if (el.hasAttribute(ATTRS[i])) return ATTRS[i].slice(5); }
    var c = String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className || '').split(/\s+/)[0];
    return (c ? '.' + c.slice(0, 20) : el.tagName.toLowerCase());
  }
  var down = null;
  document.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: Date.now(), el: e.target && e.target.closest && e.target.closest('button,a,input,select,textarea,[role=button],.tile,.chip,.opt,.story,summary,label') }; }, true);
  document.addEventListener('pointercancel', function () { if (down && on() && O.state) { today().swipe++; dirty = true; } down = null; }, true);   // браузер забрав жест під прокрутку
  document.addEventListener('pointerup', function (e) {
    if (!down || !on() || !O.state) { down = null; return; } var dn = down, d = today(); down = null;
    if (Math.abs(e.clientX - dn.x) > 12 || Math.abs(e.clientY - dn.y) > 12 || Date.now() - dn.t > 700) { d.swipe++; dirty = true; return; }   // свайп/довге утримання: не натискання
    var c = Math.min(2, Math.floor(dn.x / Math.max(1, innerWidth) * 3)), r = Math.min(4, Math.floor(dn.y / Math.max(1, innerHeight) * 5)), z = 'r' + r + 'c' + c;
    if (dn.el) { var k = key(dn.el); if (Object.keys(d.taps).length < 80 || k in d.taps) inc(d.taps, k); else inc(d.taps, 'інше'); inc(d.zones, z); } else { d.dead++; inc(d.dz, z); }
    dirty = true;
  }, true);

  /* ---- події ядра й нагород: які функції реально використовуються ---- */
  window.addEventListener('ord:mind', function (e) { if (on()) { inc(today().feat, e.detail.type); dirty = true; } });
  window.addEventListener('ord:reward', function (e) { if (on()) { inc(today().feat, 'medal_' + e.detail.medal); dirty = true; } });

  /* ---- відповіді на картки: підказки й затримка до першої літери (решту — час, правильність — беремо з журналу state.log) ---- */
  function answer(o) { if (!on()) return; var d = today(); if (o.typedQ) d.tn++; if (o.hint) d.hint++; if (o.fk != null && o.fk >= 0) { d.fkn++; d.fks += Math.min(60000, o.fk); } dirty = true; }

  /* ---- звіт ---- */
  function med(a) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.floor(b.length / 2)]; }
  function pct(a, p) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }); return b[Math.min(b.length - 1, Math.floor(b.length * p))]; }
  function merged() { // сума по всіх пристроях
    var tele = O.state.tele || {}, days = {}; Object.keys(tele).forEach(function (dv) { var dd = tele[dv].days || {}; Object.keys(dd).forEach(function (k) { var x = dd[k], t = days[k] = days[k] || blank(); t.vis += x.vis || 0; t.act += x.act || 0; t.hint += x.hint || 0; t.tn += x.tn || 0; t.fkn += x.fkn || 0; t.fks += x.fks || 0; t.dead += x.dead || 0; t.swipe += x.swipe || 0; (x.hrs || []).forEach(function (v, i) { t.hrs[i] += v; }); ['views', 'taps', 'zones', 'dz', 'feat'].forEach(function (m) { Object.keys(x[m] || {}).forEach(function (q) { inc(t[m], q, x[m][q]); }); }); t.sess = t.sess.concat(x.sess || []); }); });
    return days;
  }
  function dayList(keys, byDay, days, since) {
    var all = {}; keys.forEach(function (k) { all[k] = 1; }); Object.keys(byDay).forEach(function (k) { all[k] = 1; });
    return Object.keys(all).sort().map(function (k) { var d = days[k], q = byDay[k], covered = k >= since; return { d: k, usageTracked: covered, visits: d && covered ? d.vis : null, activeMin: d && covered ? Math.round(d.act / 60) : null, sessionsMin: d && covered ? d.sess.map(function (s) { return +(s / 60).toFixed(1); }) : null, answers: q ? q.n : 0, correct: q ? q.ok : 0, medMs: q ? med(q.ms) : null }; });
  }
  function report(opt) {
    opt = opt || {}; var now = Date.now(), D = 864e5, from = now - (opt.days || 60) * D, days = merged(), keys = Object.keys(days).sort().filter(function (k) { return new Date(k + 'T12:00:00').getTime() >= from; });
    var track = Object.keys(O.state.tele || {}).map(function (dv) { return O.state.tele[dv].first || now; }), since = track.length ? dkey(Math.min.apply(null, track)) : dkey(now), log = (O.state.log || []).filter(function (e) { return e.t >= from; }), W = O.errlab && O.errlab.wilson;
    var sum = { vis: 0, act: 0, hint: 0, tn: 0, fkn: 0, fks: 0, dead: 0, swipe: 0 }, hrs = new Array(24).fill(0), views = {}, taps = {}, zones = {}, dz = {}, feat = {}, sess = [];
    keys.forEach(function (k) { var d = days[k]; ['vis', 'act', 'hint', 'tn', 'fkn', 'fks', 'dead', 'swipe'].forEach(function (f) { sum[f] += d[f]; }); d.hrs.forEach(function (v, i) { hrs[i] += v; }); ['views', 'taps', 'zones', 'dz', 'feat'].forEach(function (m, i) { var tgt = [views, taps, zones, dz, feat][i]; Object.keys(d[m]).forEach(function (q) { inc(tgt, q, d[m][q]); }); }); sess = sess.concat(d.sess); });
    var totalTaps = Object.keys(taps).reduce(function (a, k) { return a + taps[k]; }, 0), top = Object.keys(taps).sort(function (a, b) { return taps[b] - taps[a]; }).slice(0, 15).map(function (k) { return [k, taps[k]]; });
    // відповіді з журналу
    var byKind = {}, byDay = {}, ok = 0; log.forEach(function (e) { var k = e.k || '—', g = byKind[k] = byKind[k] || { n: 0, ok: 0, ms: [] }; g.n++; if (e.g >= 2) { g.ok++; ok++; } if (e.ms > 0) g.ms.push(e.ms); var dk = dkey(e.t), q = byDay[dk] = byDay[dk] || { n: 0, ok: 0, ms: [] }; q.n++; if (e.g >= 2) q.ok++; if (e.ms > 0) q.ms.push(e.ms); });
    var allMs = log.map(function (e) { return e.ms; }).filter(function (x) { return x > 0; });
    // пригадування через ~7 днів: серед повторень картки, де попереднє було 5–9 днів тому, частка успішних (g ≥ 2)
    var seq = {}, rk = 0, rn = 0; (O.state.log || []).forEach(function (e) { (seq[e.id] = seq[e.id] || []).push(e); }); Object.keys(seq).forEach(function (id) { var a = seq[id].sort(function (x, y) { return x.t - y.t; }); for (var i = 1; i < a.length; i++) { var gap = (a[i].t - a[i - 1].t) / D; if (a[i].t >= from && gap >= 5 && gap <= 9) { rn++; if (a[i].g >= 2) rk++; } } });
    var bk = [[1, 2], [2, 5], [5, 10], [10, 21], [21, 9999]].map(function (r) { return { lo: r[0], hi: r[1], n: 0, k: 0 }; }); Object.keys(seq).forEach(function (id) { var a = seq[id]; for (var i = 1; i < a.length; i++) { var gp = (a[i].t - a[i - 1].t) / D; if (a[i].t < from) continue; bk.forEach(function (b2) { if (gp >= b2.lo && gp < b2.hi) { b2.n++; if (a[i].g >= 2) b2.k++; } }); } });
    var c = O.srs.counts(O.state.cards, now), m = O.mind && O.mind.model(), snaps = O.state.mindSnap || {}, snapKeys = Object.keys(snaps).sort(function (x, y) { return snaps[x].t - snaps[y].t; }).slice(-30);
    var rep = {
      schema: 'ord2-usage-report/1', generated: new Date().toISOString(), period: { from: dkey(from), to: dkey(now), daysWithUsageData: keys.length, usageTrackingSince: since },
      limits: ['Блок usage (час, візити, натискання) почав вестися з ' + since + '; блок learning береться з журналу повторень і охоплює весь період. Різниця в кількості днів між ними не є помилкою чи розривом, а наслідком того, що облік usage увімкнено пізніше.', 'Дані одного користувача на одному-двох пристроях: це не вибірка, узагальнювати на інших не можна.', 'Кореляція не є причиною: зростання метрики після зміни в застосунку не доводить, що зміна допомогла.', 'Час рахується лише коли вкладка видима і була дія за останні 60 с.', 'Підказки в журналі не відрізняються від повільної правильної відповіді (обидві g=2); частка підказок надається окремо.', 'Малі n (менше ~20) дають широкі довірчі інтервали (Wilson 95%): не інтерпретуйте різницю в кілька відсотків.', 'У звіті немає слів, відповідей чи вільного тексту, лише лічильники.'],
      glossary: { visits: 'початок нової активності після паузи понад 30 хв', activeMin: 'хвилини активної роботи', sessionsMin: 'тривалість активності кожного візиту, хв', hourOfDayMin: 'активні хвилини за годинами доби (0–23, локальний час)', byViewMin: 'хвилини по розділах (home, learn, read, practice…)', taps: 'натискання по елементах (id/клас, без тексту)', zones: 'натискання по секторах екрана: r0–r4 згори вниз, c0–c2 зліва направо', deadTaps: 'короткі натискання (без руху понад 12 пікселів, до 0,7 с) по неінтерактивних місцях; свайпи й прокрутка рахуються окремо як swipes і не є помилковими натисканнями', answers: 'відповіді на картки з журналу повторень; correct = оцінка g ≥ 2', recallByGap: 'частка успішних повторень (g ≥ 2) залежно від днів із попереднього повторення цієї картки; найкраще для порівняння з кривою забування', recall7: 'серед повторень, де попереднє було 5–9 днів тому: частка успішних (g ≥ 2)', medMs: 'медіана часу відповіді, мс', firstKeyMs: 'середня затримка до першої літери при введенні, мс', hintsPer100: 'підказок на 100 відповідей з введенням (напиши, пропуск, диктант)' },
      usage: { totals: { visits: sum.vis, activeMin: Math.round(sum.act / 60), daysActive: keys.filter(function (k) { return days[k].act > 0; }).length, deadTapShare: totalTaps + sum.dead ? +(sum.dead / (totalTaps + sum.dead)).toFixed(3) : null, swipes: sum.swipe, trackingSince: since }, sessionsMin: { n: sess.length, median: sess.length ? +(med(sess) / 60).toFixed(1) : null, p90: sess.length ? +(pct(sess, 0.9) / 60).toFixed(1) : null }, hourOfDayMin: hrs.map(function (v) { return Math.round(v / 60); }), byViewMin: Object.keys(views).reduce(function (a, k) { a[k] = Math.round(views[k] / 60); return a; }, {}), topTaps: top, zones: zones, deadZones: dz, features: feat,
        daily: dayList(keys, byDay, days, since) },
      learning: { answers: { n: log.length, correct: ok, accuracy: log.length ? +(ok / log.length).toFixed(3) : null, ci95: log.length && W ? W(ok, log.length).map(function (x) { return +x.toFixed(3); }) : null, medMs: med(allMs), p90Ms: pct(allMs, 0.9) },
        byKind: Object.keys(byKind).map(function (k) { var g = byKind[k]; return { kind: k, n: g.n, accuracy: +(g.ok / g.n).toFixed(3), ci95: W ? W(g.ok, g.n).map(function (x) { return +x.toFixed(3); }) : null, medMs: med(g.ms), p90Ms: pct(g.ms, 0.9) }; }).sort(function (a, b) { return b.n - a.n; }),
        recallByGap: bk.map(function (b2) { return { gapDays: b2.hi > 999 ? b2.lo + '+' : b2.lo + '–' + b2.hi, n: b2.n, successes: b2.k, rate: b2.n ? +(b2.k / b2.n).toFixed(3) : null, ci95: b2.n && W ? W(b2.k, b2.n).map(function (x) { return +x.toFixed(3); }) : null }; }),
        recall7: { n: rn, successes: rk, rate: rn ? +(rk / rn).toFixed(3) : null, ci95: rn && W ? W(rk, rn).map(function (x) { return +x.toFixed(3); }) : null },
        typed: { firstKeyMs: sum.fkn ? Math.round(sum.fks / sum.fkn) : null, answers: sum.tn, withInput: sum.fkn, hintsPer100: sum.tn ? +(sum.hint / sum.tn * 100).toFixed(1) : null },
        deck: { total: c.total, mature: c.mature, young: c.young, learning: c.learn, new: c.new, due: c.due, leeches: c.leech },
        activeVocabulary: m ? { active: m.active.length, passive: m.passive.length, met: m.met.length } : null, vocabSeries: snapKeys.map(function (k) { return { d: dkey(snaps[k].t), active: snaps[k].a, passive: snaps[k].p, met: snaps[k].m }; }) }
    };
    if (opt.words) { var rank = Object.keys(O.state.cards).map(function (id) { var cd = O.state.cards[id], w = O.wordById[id]; return w ? { w: w.no, lapses: cd.lapses || 0, ivl: cd.ivl || 0 } : null; }).filter(function (x) { return x && x.lapses > 0; }).sort(function (a, b) { return b.lapses - a.lapses; }).slice(0, 20); rep.hardestWords = rank; rep.limits.push('Додано 20 слів із найбільшою кількістю помилок (за твоїм вибором).'); }
    return rep;
  }
  var PROMPT = 'Ти аналітик навчальних даних. Нижче звіт про використання застосунку для вивчення норвезької (один користувач). ' +
    'Завдання: 1) опиши, коли й як довго я займаюся, і чи є регулярність; 2) де найповільніші й найнеточніші відповіді (за видами вправ); 3) чи виконується мета: пригадування через ~7 днів, зростання активного словника; ' +
    '4) сформулюй до 5 гіпотез, що змінити в режимі занять, і для кожної вкажи, яку метрику з цього звіту покаже, що гіпотеза спрацювала, і який мінімальний обсяг даних потрібен. ' +
    'Суворі правила: спирайся лише на числа зі звіту; чітко відділяй спостереження від припущень; не роби причинних висновків із кореляцій; врахуй поле limits і довірчі інтервали; якщо даних мало, так і скажи.';
  function text(opt) { var j = JSON.stringify(report(opt), null, 1); return opt && opt.prompt ? PROMPT + '\n\n```json\n' + j + '\n```' : j; }
  function clear() { O.state.tele = {}; curSess = null; O.save(); }
  O.tele = { report: report, text: text, answer: answer, clear: clear, today: today, merged: merged, PROMPT: PROMPT, flush: flush, ev: function (n) { if (on()) { inc(today().feat, n); dirty = true; } } };
})();
