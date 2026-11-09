/* «Мозок» додатка: одна модель знання слова, яку живлять усі модулі (картки, друковані вправи, власні речення),
   і одна рекомендація «що робити далі». Це не нейромережа, а прозора евристика на лічильниках:
   кожен модуль пише докази, мозок рахує стан слова й вирішує, на що витратити час.
   Означення «активне слово» моє операційне, а не валідований тест: слово має ≥2 успішні відтворення (друк із пам'яті,
   пропуск у реченні, диктант або правильне вживання у твоєму тексті) у різні дні, і останнє відтворення було вдалим. */
(function () {
  var O = window.ORD, DAY = 864e5, PROD = { type: 1, cloze: 1, dictation: 1 }, REC = { recog: 1, recogRev: 1, listen: 1, flip: 1, intro: 1, speak: 1 };
  function EV() { return (O.state.mindEv = O.state.mindEv || {}); }
  function dk(t) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  var cache = null;
  function model() {
    var log = O.state.log || [], key = log.length + ':' + (log.length ? log[log.length - 1].t : 0) + ':' + Object.keys(O.state.cards).length + ':' + Object.keys(EV()).length;
    if (cache && cache.key === key) return cache.m;
    var by = {}, now = Date.now(), since = now - 90 * DAY, ev = EV();
    log.forEach(function (e) {
      if (e.t < since) return; var b = by[e.id] = by[e.id] || { pd: {}, pLast: null, rOk: 0, n: 0 }; b.n++;
      var ok = e.g >= 2;
      if (PROD[e.k]) { if (ok) b.pd[dk(e.t)] = e.t; if (!b.pLast || e.t >= b.pLast.t) b.pLast = { t: e.t, ok: ok }; } else if (ok) b.rOk++;
    });
    var m = { active: [], passive: [], met: [], by: by };
    Object.keys(O.state.cards).forEach(function (id) {
      var b = by[id] || { pd: {}, pLast: null, rOk: 0, n: 0 }, days = Object.assign({}, b.pd), lastOk = b.pLast ? b.pLast.ok : null, u = (ev[id] && ev[id].u) || [];
      u.forEach(function (t) { if (t >= since) { days[dk(t)] = t; } });
      var usedLast = u.length ? Math.max.apply(null, u) : 0, lastT = Math.max(b.pLast ? b.pLast.t : 0, usedLast);
      var okLast = (b.pLast && b.pLast.t >= usedLast) ? b.pLast.ok : (usedLast ? true : lastOk);
      var nd = Object.keys(days).length, c = O.state.cards[id];
      if (nd >= 2 && okLast) m.active.push({ id: id, t: lastT });
      else if (b.rOk + Object.keys(b.pd).length >= 2 || (c && c.st === 'review')) m.passive.push({ id: id });
      else m.met.push({ id: id });
    });
    cache = { key: key, m: m }; return m;
  }
  /* Черга активації: слова, які ти знаєш лише впізнаванням, першими ті, що нещодавно потрапили в словник */
  function activation() {
    var m = model(), now = Date.now(), ev = EV(), active = {}; m.active.forEach(function (x) { active[x.id] = 1; });
    var list = [];
    Object.keys(O.state.cards).forEach(function (id) {
      if (active[id] || !O.wordById[id]) return; var c = O.state.cards[id], met = (ev[id] && ev[id].met) || 0;
      if (c.st === 'new' && now - met < 3 * 3600e3) return;                // нове слово: дати поспати 3 години, потім вилучення з пам'яті
      var b = m.by[id] || { pd: {}, n: 0 }, recent = met && now - met < 7 * DAY, score = (recent ? 3 : 0) + (Object.keys(b.pd).length ? 0 : 1) + (c.leech ? -1 : 0) + Math.random() * 0.5;
      list.push({ id: id, score: score });
    });
    list.sort(function (a, b) { return b.score - a.score; }); return list.map(function (x) { return x.id; });
  }
  function snap() {
    var m = model(), s = O.state.mindSnap = O.state.mindSnap || {}, k = dk(Date.now());
    s[k] = { a: m.active.length, p: m.passive.length, m: m.met.length, t: Date.now() };
    var ks = Object.keys(s).sort(function (a, b) { return s[a].t - s[b].t; }); while (ks.length > 120) delete s[ks.shift()];
    return s;
  }
  function delta(days) {
    var s = snap(), now = Date.now(), base = null, cur = s[dk(now)];
    Object.keys(s).forEach(function (k) { var x = s[k]; if (x.t <= now - days * DAY && (!base || x.t > base.t)) base = x; });
    return base ? cur.a - base.a : null;
  }
  O.mind = {
    model: model, activation: activation, snap: snap, delta: delta,
    met: function (id) { var e = EV(); if (!e[id]) e[id] = { met: Date.now() }; else if (!e[id].met) e[id].met = Date.now(); },
    /* Правильне вживання у власному тексті (перевірка речень, репетитор): слова без помилок рахуються як відтворення */
    used: function (text, wrongs) {
      var bad = (wrongs || []).map(function (x) { return String(x || '').toLowerCase(); }).filter(Boolean), seen = {}, ev = EV(), now = Date.now(), n = 0;
      (String(text || '').match(/[A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+/g) || []).forEach(function (tok) {
        var l = tok.toLowerCase(); if (l.length < 3 || bad.some(function (b) { return b.indexOf(l) >= 0; })) return;
        var w = O.localLookup(l); if (!w || seen[w.id] || !O.state.cards[w.id]) return; seen[w.id] = 1;
        var e = ev[w.id] = ev[w.id] || {}; e.u = e.u || []; if (e.u.length && dk(e.u[e.u.length - 1]) === dk(now)) return; e.u.push(now); if (e.u.length > 12) e.u.shift(); n++;
      });
      if (n) { cache = null; O.save(); } return n;
    },
    startActivation: function (root) { var ids = activation().slice(0, 10); if (!ids.length) { root.innerHTML = '<div class="panel center"><h2>Усі слова вже активні або ще «відлежуються» 🎉</h2><p class="dim">Додавай слова з перекладача й читалки, вони повернуться тут через кілька годин.</p></div>'; return; } O.startSession(root, { ids: ids, force: 'type' }); },
    /* Що робити далі: ранжування за терміновістю; кожна дія пояснена */
    next: function () {
      var c = O.srs.counts(O.state.cards, Date.now()), act = activation().length, errs = (O.errlab && O.errlab.dueCount) ? O.errlab.dueCount() : 0, out = [], today = dk(Date.now());
      var wrote = (O.state.errW || []).some(function (x) { return dk(x.t) === today; });
      if (c.due > 0) out.push({ id: 'learn', w: 1 + Math.min(c.due, 40) / 40, icon: '🧠', title: 'Повторення: ' + c.due + ' карток', why: 'прострочені повторення забуваються найшвидше', go: 'learn' });
      if (act >= 3) out.push({ id: 'activate', w: 0.9 + Math.min(act, 12) / 40, icon: '✍', title: 'Вправа з пам’яті: ' + Math.min(act, 10) + ' слів', why: 'слова, які ти лише впізнаєш, переходять в активний словник тільки через друк із пам’яті', go: 'activate' });
      if (errs > 0) out.push({ id: 'errors', w: 0.6 + Math.min(errs, 10) / 40, icon: '🎯', title: 'Тренажер помилок: ' + errs, why: 'твої власні помилки, закриваються після 3 правильних відповідей', go: 'err' });
      if (!wrote) out.push({ id: 'write', w: 0.5, icon: '🌐', title: 'Скажи щось своїми словами', why: 'сьогодні ти ще нічого не писав норвезькою: переклад і перевірка речень дають вживання', go: 'translate' });
      out.push({ id: 'read', w: 0.2, icon: '📖', title: 'Почитай', why: 'нові слова приходять із текстів', go: 'read' });
      return out.sort(function (a, b) { return b.w - a.w; });
    },
    /* Панель «Активний словник» */
    panel: function (box) {
      var m = model(), s = snap(), tot = m.active.length + m.passive.length + m.met.length, d7 = delta(7), d30 = delta(30), act = activation().length;
      var rec = m.active.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 8).map(function (x) { var w = O.wordById[x.id]; return w ? O.esc((w.art ? w.art + ' ' : '') + w.no) : ''; }).filter(Boolean);
      box.innerHTML = '<h3 style="margin-top:0">🧠 Активний словник</h3><div class="kpis"><div><b>' + m.active.length + '</b><span>активні</span></div><div><b>' + m.passive.length + '</b><span>впізнаю</span></div><div><b>' + m.met.length + '</b><span>нові</span></div></div>' +
        O.meter({ known: tot ? m.active.length / tot : 0, learning: tot ? m.passive.length / tot : 0 }) +
        '<div class="dim small">За 7 днів: ' + (d7 == null ? 'немає даних' : (d7 >= 0 ? '+' : '') + d7) + ' · за 30 днів: ' + (d30 == null ? 'немає даних' : (d30 >= 0 ? '+' : '') + d30) + ' активних слів.</div>' +
        (rec.length ? '<div class="small" style="margin-top:6px">Остання активація: <span class="no">' + rec.join(', ') + '</span></div>' : '') +
        (act ? '<div class="row"><button class="btn" id="mact">✍ Активувати (' + Math.min(act, 10) + ')</button></div>' : '') +
        '<details class="small"><summary>Як це рахується</summary><p>Активне слово: ≥2 успішні відтворення з пам’яті (друк UA→NO, пропуск у реченні, диктант або правильне вживання у твоєму тексті) у різні дні, і останнє було вдалим. «Впізнаю»: слово є в картках і вдало повторене, але відтворення ще немає. Це моє операційне означення, а не стандартизований тест: за шкалою розміру словника його порівнювати не можна.</p></details>';
      var b = box.querySelector('#mact'); if (b) b.onclick = function () { O.go('activate'); };
    }
  };
})();
