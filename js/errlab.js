/* Тренажер помилок: 5 хвилин на день на твоїх найчастіших шаблонах. Кожна помилка з журналу стає вправою,
   і лише після трьох правильних відповідей підряд на зростаючих інтервалах (1, 3, 7 днів) пункт «закривається».
   Інтервали мій вибір (принцип Cepeda 2006: оптимальний інтервал росте з терміном утримання), а не виміряні цифри. */
(function () {
  var O = window.ORD, DAY = 864e5, IVL = [1, 3, 7], SESSION = 10;
  /* Базові пари «хибно → правильно» (типові помилки з довідника й правил); поповнюються твоїм журналом */
  var SEED = [
    ['I dag jeg jobbet', 'I dag jobbet jeg', 'order'], ['Nå jeg bor i Tromsø', 'Nå bor jeg i Tromsø', 'order'], ['I morgen jeg skal sveise', 'I morgen skal jeg sveise', 'order'],
    ['Jeg ser bil utenfor huset', 'Jeg ser en bil utenfor huset', 'article'],
    ['Jeg har spiste middag i går', 'Jeg spiste middag i går', 'verbform'], ['De gårer til skolen', 'De går til skolen', 'verbform'], ['Jeg kan går hjem', 'Jeg kan gå hjem', 'verbform'], ['Jeg må er hjemme', 'Jeg må være hjemme', 'verbform'], ['Jeg liker å bor her', 'Jeg liker å bo her', 'verbform'],
    ['En stor biler', 'En stor bil', 'adjagree'], ['Et stor hus', 'Et stort hus', 'adjagree'], ['En stort bil', 'En stor bil', 'adjagree'],
    ['Jeg bor på Oslo', 'Jeg bor i Oslo', 'prep'], ['Om dag jobber jeg', 'I dag jobber jeg', 'prep'], ['Jeg har bodd i Norge for to år', 'Jeg har bodd i Norge i to år', 'prep'],
    ['Jeg har ikke aldri vært der', 'Jeg har aldri vært der', 'neg'], ['Jeg har ikke ingen penger', 'Jeg har ingen penger', 'neg']
  ];
  function hash(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function nrm(t) { return O.fold(O.norm(t)); }
  function LAB() { var l = O.state.errLab = O.state.errLab || {}; l.items = l.items || {}; l.log = l.log || []; l.sessions = l.sessions || 0; return l; }
  function wilson(k, n) { if (!n) return null; var z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]; }
  function fmt(k, n) { if (!n) return '—'; var w = wilson(k, n); return Math.round(k / n * 100) + '% (' + Math.round(w[0] * 100) + '–' + Math.round(w[1] * 100) + '%), n=' + n + (n < 20 ? ', замало даних' : ''); }
  O.errlab = { wilson: wilson, fmt: fmt };
  O.errlab.dueCount = function () { return queue().left; };
  O.errlab._rec = function (it, ok) { rec(it, ok, 't'); };
  function pairs() {
    var m = {}, since = Date.now() - 60 * DAY, cnt = {}, ER = (O.err && O.err.all()) || [];
    ER.forEach(function (e) { if (e.t >= since && e.type) cnt[e.type] = (cnt[e.type] || 0) + 1; });
    var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 3);
    SEED.forEach(function (x) { m[hash(nrm(x[0]))] = { k: hash(nrm(x[0])), wrong: x[0], right: x[1], type: x[2], src: 'seed' }; });
    ER.forEach(function (e) { if (e.wrong && e.right && nrm(e.wrong) !== nrm(e.right) && e.wrong.length >= 3 && e.right.length >= 3) m[hash(nrm(e.wrong))] = { k: hash(nrm(e.wrong)), wrong: e.wrong, right: e.right, type: e.type || 'other', why: e.why, src: 'mine' }; });
    return { list: Object.keys(m).map(function (k) { return m[k]; }), top: top };
  }
  function whyOf(it) { if (it.why) return it.why; var r = (O.err.REF || []).filter(function (x) { return x.t === it.type; })[0]; return r ? r.note : ''; }
  function queue() {
    var P = pairs(), L = LAB(), now = Date.now();
    var cand = P.list.filter(function (it) { var s = L.items[it.k]; return !(s && s.retired) && (!s || (s.due || 0) <= now); });
    cand.forEach(function (it) { var s = L.items[it.k]; it.score = (P.top.indexOf(it.type) >= 0 ? 2 : 0) + (it.src === 'mine' ? 1.5 : 0) + (s ? 1 : 0) + Math.random(); });
    cand.sort(function (a, b) { return b.score - a.score; });
    return { q: cand.slice(0, SESSION), left: cand.length, total: P.list.length, retired: P.list.filter(function (it) { return (L.items[it.k] || {}).retired; }).length, top: P.top };
  }
  function rec(it, ok, kind) {
    var L = LAB(), s = L.items[it.k] = L.items[it.k] || { streak: 0, seen: 0 };
    s.seen++; s.last = Date.now(); s.type = it.type;
    if (ok) { s.streak++; if (s.streak >= 3) { s.retired = true; s.due = 0; } else s.due = Date.now() + IVL[s.streak - 1] * DAY; } else { s.streak = 0; s.due = Date.now(); }
    L.log.push({ t: Date.now(), k: it.k, type: it.type || 'other', ok: ok ? 1 : 0, kd: kind }); if (L.log.length > 600) L.log.splice(0, L.log.length - 600);
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function kindOf(it, i) { var n = it.right.split(/\s+/).length; if (it.type === 'order' && n >= 4) return 'build'; return (n >= 3 && i % 2 === 0) ? 'fix' : 'choose'; }

  /* Динаміка: точність у тренажері за типами, перші 14 днів проти раніше */
  function trend() {
    var L = LAB(), now = Date.now(), by = {};
    L.log.forEach(function (e) { var b = by[e.type] = by[e.type] || { rk: 0, rn: 0, ok: 0, n: 0 }; b.n++; b.ok += e.ok; if (e.t >= now - 14 * DAY) { b.rn++; b.rk += e.ok; } });
    var T = (O.err && O.err.TYPES) || {}, rows = Object.keys(by).sort(function (a, b) { return by[b].n - by[a].n; }).map(function (k) { return '<div class="mrow"><span><b>' + O.esc(T[k] || k) + '</b><div class="dim small">останні 14 днів: ' + fmt(by[k].rk, by[k].rn) + '<br>за весь час: ' + fmt(by[k].ok, by[k].n) + '</div></span></div>'; });
    return rows.length ? rows.join('') : '<p class="dim small">З’явиться після першої сесії.</p>';
  }

  O.renderErrLab = function (box) {
    var Q = queue(), L = LAB();
    box.innerHTML = '<h4 style="margin-top:0">🎯 Тренажер помилок (5 хвилин)</h4><div class="dim small">У черзі сьогодні: ' + Q.q.length + ' з ' + Q.left + '. Закрито: ' + Q.retired + ' з ' + Q.total + ' (закривається після 3 правильних відповідей підряд на інтервалах 1, 3, 7 днів).' + (Q.top.length ? ' Найчастіші твої типи: ' + Q.top.map(function (k) { return O.esc(O.err.TYPES[k] || k); }).join(', ') + '.' : ' Поки журнал порожній, беру типові помилки; з часом пара «хибно → правильно» береться з твоїх.') + '</div>' +
      '<div class="row"><button class="btn" id="labgo"' + (Q.q.length ? '' : ' disabled') + '>' + (Q.q.length ? 'Почати' : 'На сьогодні все') + '</button></div><div id="labbody"></div>' +
      '<h4>Динаміка: чи допомагає</h4><div id="labtr">' + trend() + '</div>';
    var body = box.querySelector('#labbody'), go = box.querySelector('#labgo');
    go.onclick = function () { go.disabled = true; session(Q.q.slice(), body, function () { O.renderErrLab(box); }); };
  };

  function session(q, body, done) {
    var i = 0, okN = 0, tot = 0, redo = [];
    function next() {
      if (i >= q.length) { if (redo.length) { q.push.apply(q, redo.splice(0)); } }
      if (i >= q.length) return finish();
      var it = q[i], kind = kindOf(it, i), again = !!it._again; draw(it, kind, again);
    }
    function answer(it, kind, ok, again, shown) {
      if (!again) { tot++; if (ok) okN++; rec(it, ok, kind); if (!ok) redo.push(Object.assign({}, it, { _again: true })); }
      O.save(); var w = whyOf(it);
      body.insertAdjacentHTML('beforeend', '<div class="corr' + (ok ? ' ok' : '') + '">' + (ok ? '✓ Правильно' : '✗ Правильно: <b class="no">' + O.esc(it.right) + '</b>') + (w ? '<div class="dim small">' + O.esc(w) + '</div>' : '') + '</div><div class="row"><button class="btn" id="labnx">Далі →</button></div>');
      body.querySelector('#labnx').onclick = function () { i++; next(); }; O.sfx && O.sfx(ok ? 'ok' : 'no');
    }
    function draw(it, kind, again) {
      var head = '<div class="dim small">' + (i + 1) + ' / ' + q.length + (again ? ' · ще раз' : '') + '</div>';
      if (kind === 'choose') {
        var opts = shuffle([it.right, it.wrong]);
        body.innerHTML = head + '<p>Яка форма правильна?</p>' + opts.map(function (o, k) { return '<button class="btn ghost labo" data-o="' + k + '"><span class="no">' + O.esc(o) + '</span></button>'; }).join(' ');
        O.$$('.labo', body).forEach(function (b) { b.onclick = function () { var ok = opts[+b.getAttribute('data-o')] === it.right; O.$$('.labo', body).forEach(function (x) { x.disabled = true; }); b.classList.add(ok ? 'okb' : 'badb'); answer(it, kind, ok, again); }; });
      } else if (kind === 'fix') {
        body.innerHTML = head + '<p>Виправ речення:</p><p class="no"><s>' + O.esc(it.wrong) + '</s></p><input class="cz line" id="labin" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="row"><button class="btn" id="labck">Перевірити</button></div>';
        var inp = body.querySelector('#labin'); inp.focus();
        var chk = function () { var ok = O.sim(inp.value, it.right) >= 0.97 || nrm(inp.value) === nrm(it.right); inp.disabled = true; body.querySelector('#labck').remove(); inp.classList.add(ok ? 'ok' : 'bad'); answer(it, kind, ok, again); };
        body.querySelector('#labck').onclick = chk; inp.onkeydown = function (e) { if (e.key === 'Enter') chk(); };
      } else {
        var words = it.right.split(/\s+/), order = shuffle(words); if (order.join(' ') === words.join(' ')) order = words.slice().reverse();
        var picked = [];
        body.innerHTML = head + '<p>Склади речення з слів:</p><div class="no" id="labline" style="min-height:2em"></div><div id="labw"></div><div class="row"><button class="btn ghost" id="labrs">Скинути</button><button class="btn" id="labck">Перевірити</button></div>';
        var line = body.querySelector('#labline'), pool = body.querySelector('#labw');
        function paint() { line.textContent = picked.map(function (k) { return order[k]; }).join(' '); pool.innerHTML = order.map(function (w, k) { return picked.indexOf(k) >= 0 ? '' : '<button class="chip" data-k="' + k + '">' + O.esc(w) + '</button> '; }).join(''); O.$$('[data-k]', pool).forEach(function (b) { b.onclick = function () { picked.push(+b.getAttribute('data-k')); paint(); }; }); }
        paint(); body.querySelector('#labrs').onclick = function () { picked = []; paint(); };
        body.querySelector('#labck').onclick = function () { var ok = nrm(picked.map(function (k) { return order[k]; }).join(' ')) === nrm(it.right); body.querySelector('#labck').remove(); body.querySelector('#labrs').remove(); O.$$('[data-k]', pool).forEach(function (b) { b.disabled = true; }); answer(it, kind, ok, again); };
      }
    }
    function finish() {
      var L = LAB(); L.sessions++; O.state.xp += 10 + okN; O.save();
      body.innerHTML = '<p><b>Сесію завершено.</b> Правильно з першого разу: ' + okN + ' з ' + tot + '. Помилкові пункти повернуться завтра.</p><div class="row"><button class="btn" id="labdn">Готово</button></div>'; body.querySelector('#labdn').onclick = done;
    }
    next();
  }
})();
