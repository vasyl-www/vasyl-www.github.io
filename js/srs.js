/* Планувальник повторень (SM-2 з кроками навчання) і запити до журналу. Чисті функції, працює і в браузері, і в Node (тести). */
(function (root) {
  var DAY = 864e5, MIN = 6e4;
  var STEPS = [1 * MIN, 10 * MIN];          // кроки навчання нової/забутої картки
  var GRAD_IVL = 1, EASY_IVL = 4;           // перший інтервал після навчання, дні
  var MATURE = 21;                           // днів інтервалу, з яких картка вважається «зрілою»
  var LEECH = 4;                             // збоїв, після яких картка — «піявка»

  function newCard(id, now) { return { id: id, st: 'new', ease: 2.5, ivl: 0, due: now, reps: 0, lapses: 0, step: 0, added: now, last: 0, susp: false }; }

  /* g: 1 знову, 2 важко, 3 добре, 4 легко. Повертає нову картку (оригінал не змінюється). */
  function review(card, g, now, rng) {
    var c = JSON.parse(JSON.stringify(card)); rng = rng || Math.random;
    c.reps++; c.last = now;
    if (c.st === 'new' || c.st === 'learn') {
      if (g === 1) { c.st = 'learn'; c.step = 0; c.due = now + STEPS[0]; }
      else if (g === 2) { c.st = 'learn'; c.due = now + STEPS[Math.min(c.step, STEPS.length - 1)]; }
      else if (g === 3) {
        if (c.step + 1 < STEPS.length) { c.st = 'learn'; c.step++; c.due = now + STEPS[c.step]; }
        else { c.st = 'review'; c.step = 0; c.ivl = GRAD_IVL; c.due = now + c.ivl * DAY; }
      } else { c.st = 'review'; c.step = 0; c.ivl = EASY_IVL; c.due = now + c.ivl * DAY; }
      return c;
    }
    // review
    if (g === 1) {
      c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.st = 'learn'; c.step = 0; c.ivl = Math.max(1, Math.round(c.ivl * 0.4)); c.due = now + STEPS[0];
      if (c.lapses >= LEECH) c.leech = true;
    } else {
      var next;
      if (g === 2) { c.ease = Math.max(1.3, c.ease - 0.15); next = Math.max(c.ivl + 1, Math.round(c.ivl * 1.2)); }
      else if (g === 3) next = Math.max(c.ivl + 1, Math.round(c.ivl * c.ease));
      else { c.ease = c.ease + 0.15; next = Math.max(c.ivl + 2, Math.round(c.ivl * c.ease * 1.3)); }
      if (next >= 7) next = Math.max(c.ivl + 1, Math.round(next * (0.95 + rng() * 0.1)));
      c.ivl = next; c.due = now + next * DAY;
    }
    return c;
  }

  function maturity(c) { if (c.st === 'new') return 'new'; if (c.st === 'learn') return 'learn'; return c.ivl >= MATURE ? 'mature' : 'young'; }

  function isDue(c, now) { return !c.susp && c.st !== 'new' && c.due <= now; }

  function counts(cards, now) {
    var o = { new: 0, learn: 0, young: 0, mature: 0, due: 0, leech: 0, total: 0 };
    Object.keys(cards).forEach(function (k) { var c = cards[k]; o.total++; o[maturity(c)]++; if (isDue(c, now)) o.due++; if (c.leech || c.lapses >= LEECH) o.leech++; });
    return o;
  }

  /* Частка правильних відповідей (g>1) серед повторень «зрілих/молодих» карток за останні days днів. */
  function retention(log, now, days, onlyMature) {
    var from = now - days * DAY, n = 0, ok = 0;
    log.forEach(function (e) {
      if (e.t < from || e.st !== 'review') return;
      if (onlyMature && !(e.ivl >= MATURE)) return;
      n++; if (e.g > 1) ok++;
    });
    return { n: n, rate: n ? ok / n : null };
  }

  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function perDay(log, now, days) {
    var out = {}; for (var i = 0; i < days; i++) out[dayKey(now - i * DAY)] = { n: 0, ok: 0, ms: 0 };
    log.forEach(function (e) { var k = dayKey(e.t); if (out[k]) { out[k].n++; if (e.g > 1) out[k].ok++; out[k].ms += e.ms || 0; } });
    return out;
  }

  function forecast(cards, now, days) {
    var out = []; for (var i = 0; i < days; i++) out.push(0);
    var d0 = new Date(now); d0.setHours(0, 0, 0, 0); var sod = d0.getTime();   // календарні дні, а не 24-годинні відрізки
    Object.keys(cards).forEach(function (k) {
      var c = cards[k]; if (c.susp || c.st === 'new') return;
      var d = Math.floor((c.due - sod) / DAY); if (d < 0) d = 0; if (d < days) out[d]++;
    });
    return out;
  }

  function streak(log, now) {
    var set = {}; log.forEach(function (e) { set[dayKey(e.t)] = 1; });
    var s = 0, t = now; if (!set[dayKey(t)]) t -= DAY;
    while (set[dayKey(t)]) { s++; t -= DAY; }
    return s;
  }

  /* Черга повторень: спочатку навчання (стали «знову»), потім прострочені за давністю; нові додаються окремо ліміт newLeft. */
  function queue(cards, now, newLeft, order) {
    var all = Object.keys(cards).map(function (k) { return cards[k]; }).filter(function (c) { return !c.susp; });
    var due = all.filter(function (c) { return c.st !== 'new' && c.due <= now; }).sort(function (a, b) { return (a.st === 'learn' ? 0 : 1) - (b.st === 'learn' ? 0 : 1) || a.due - b.due; });
    var fresh = all.filter(function (c) { return c.st === 'new'; });
    if (order) fresh.sort(function (a, b) { return order[a.id] - order[b.id]; });
    return { due: due, fresh: fresh.slice(0, Math.max(0, newLeft)) };
  }

  /* Оцінка за відповіддю вправи: правильно й швидко = легко (лише для введення), правильно = добре, з підказкою/повільно = важко, помилка = знову. */
  function gradeFrom(correct, ms, o) {
    o = o || {};
    if (!correct) return 1;
    if (o.hint || ms > (o.slow || 12000)) return 2;
    if (o.typed && ms < (o.fast || 4000)) return 4;
    return 3;
  }

  var api = { DAY: DAY, STEPS: STEPS, MATURE: MATURE, LEECH: LEECH, newCard: newCard, review: review, maturity: maturity, isDue: isDue, counts: counts, retention: retention, perDay: perDay, forecast: forecast, streak: streak, queue: queue, gradeFrom: gradeFrom, dayKey: dayKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else (root.ORD = root.ORD || {}).srs = api;
})(typeof window !== 'undefined' ? window : globalThis);
