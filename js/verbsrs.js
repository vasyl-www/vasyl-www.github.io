/* Дієслова з інтервальним повторенням: окремі картки state.vcards (за інфінітивом), окремий журнал state.vlog.
   Не змішується зі словниковими картками й статистикою утримання слів. Нове дієслово спершу показується з формами, потім перевірка. */
(function () {
  var O = window.ORD, S = null;
  function V() { return O.state.vcards = O.state.vcards || {}; }
  function dk() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function seenToday() { var x = O.state.vnew; return x && x.d === dk() ? x.n : 0; }
  function limit() { return O.state.settings.vbNew || 5; }
  function cls() { return O.state.settings.vbCls || 'si'; }
  function byInf(inf) { return (O.verbs || []).filter(function (v) { return v.inf === inf; })[0]; }
  function fresh() { var c = V(); return O.verbtr.pool(cls()).filter(function (v) { return !c[v.inf]; }); }
  function dueList(now) { var c = V(); return Object.keys(c).filter(function (k) { return byInf(k) && O.srs.isDue(c[k], now); }); }
  function counts(now) { now = now || Date.now(); return { due: dueList(now).length, fresh: Math.min(Math.max(0, limit() - seenToday()), fresh().length), total: Object.keys(V()).length }; }
  function build(now) {
    var c = V(), due = dueList(now).sort(function (a, b) { return (c[a].st === 'learn' ? 0 : 1) - (c[b].st === 'learn' ? 0 : 1) || c[a].due - c[b].due; });
    return due.concat(fresh().slice(0, Math.max(0, limit() - seenToday())).map(function (v) { return v.inf; }));
  }
  function forms(v) { return '<div class="no big">' + O.esc(v.inf) + ' – ' + O.esc(v.pres) + ' – ' + O.esc(v.past) + ' – har ' + O.esc(v.perf) + '</div>'; }
  function start(box) {
    var q = build(Date.now());
    if (!q.length) { box.innerHTML = '<div class="stage center"><h3>Усе повторено 🎉</h3><p class="dim">Нових на сьогодні немає або ліміт вичерпано. Ліміт можна змінити вище.</p></div>'; return; }
    S = { box: box, q: q, i: 0, ok: 0, bad: 0, req: {}, shown: {}, total: q.length };
    step();
  }
  function step() {
    var box = S.box;
    if (S.i >= S.q.length) {
      var c = counts();
      box.innerHTML = '<h3>Дієслова</h3><div class="stage center"><div class="big">' + S.ok + ' / ' + (S.ok + S.bad) + '</div><p class="dim">Далі: до повторення ' + c.due + ', нових на сьогодні ' + c.fresh + '.</p></div><div class="row"><button class="btn" id="vsa">Ще раунд</button></div>';
      box.querySelector('#vsa').onclick = function () { start(box); }; O.sfx('done'); return;
    }
    var inf = S.q[S.i], v = byInf(inf), card = V()[inf] || O.srs.newCard(inf, Date.now());
    if (card.st === 'new' && !S.shown[inf]) {
      box.innerHTML = '<h3>Нове дієслово <small class="dim">' + (S.i + 1) + ' / ' + S.q.length + '</small></h3><div class="stage center">' + forms(v) + '<div class="dim">' + O.esc(v.ua) + '</div></div><div class="row"><button class="btn ghost" id="vsy">🔊</button><button class="btn" id="vsg">Запам’ятав, перевір мене</button></div>';
      box.querySelector('#vsy').onclick = function () { O.speak(v.inf + '. ' + v.past + '. ' + v.perf); }; box.querySelector('#vsg').onclick = function () { S.shown[inf] = 1; step(); }; return;
    }
    ask(v, card);
  }
  function ask(v, card) {
    var box = S.box, t0 = Date.now(), hint = false, alt = { stå: ['stod'], lage: ['lagte'], hete: ['hette'] }[v.inf] || [];
    box.innerHTML = '<h3>Дієслова <small class="dim">' + (S.i + 1) + ' / ' + S.q.length + '</small></h3><div class="stage center"><div class="no big">å ' + O.esc(v.inf) + '</div><div class="dim">' + O.esc(v.ua) + ' · зараз: <span class="no">' + O.esc(v.pres) + '</span></div></div>' +
      '<form class="vin"><label>Минулий <input id="vp" autocomplete="off" autocapitalize="off" spellcheck="false"></label><label>Перфект <input id="vf" autocomplete="off" autocapitalize="off" spellcheck="false"></label><div class="hintline dim"></div>' +
      '<div class="row"><button class="btn" type="submit">Перевірити</button><button class="btn ghost" type="button" id="vh">Підказка</button><button class="btn ghost" type="button" id="vd">Не знаю</button></div></form><div id="vr"></div>';
    var p = box.querySelector('#vp'), pf = box.querySelector('#vf'); p.focus();
    p.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); pf.focus(); } };
    box.querySelector('#vh').onclick = function () { hint = true; box.querySelector('.hintline').textContent = 'минулий: ' + v.past.slice(0, 2) + '… · перфект: ' + v.perf.slice(0, 2) + '…'; };
    function fin(rp, rf) {
      O.$$('input,button', box).forEach(function (x) { x.disabled = true; });
      var ok = rp > 0 && rf > 0, ms = Date.now() - t0, g = !ok ? 1 : (rp === 1 || rf === 1 ? 2 : O.srs.gradeFrom(true, ms, { typed: true, hint: hint, slow: 25000, fast: 9000 })), now = Date.now(), isNew = card.st === 'new';
      V()[v.inf] = O.srs.review(card, g, now);
      if (isNew) O.state.vnew = { d: dk(), n: seenToday() + 1 };
      var lg = O.state.vlog = O.state.vlog || []; lg.push({ t: now, id: v.inf, g: g, ms: ms }); if (lg.length > 600) O.state.vlog = lg.slice(-600);
      var s = (O.state.verbtr = O.state.verbtr || {})[v.inf] = O.state.verbtr[v.inf] || { n: 0, bad: 0 }; s.n++; if (!ok) s.bad++;
      if (O.practiceLog) O.practiceLog('verbs', ok ? 1 : 0); if (O.tele) O.tele.ev('vsrs'); O.sfx(ok ? 'ok' : 'bad'); O.save();
      if (ok) S.ok++; else { S.bad++; if ((S.req[v.inf] = (S.req[v.inf] || 0) + 1) <= 2) S.q.splice(Math.min(S.q.length, S.i + 4), 0, v.inf); }
      var m = function (r) { return r === 2 ? '✓' : r === 1 ? '≈ æ/ø/å' : '✗'; }, nx = V()[v.inf];
      box.querySelector('#vr').innerHTML = '<div class="feedback ' + (ok ? 'good' : 'bad') + '">' + forms(v) + '<div class="dim small">минулий ' + m(rp) + ' · перфект ' + m(rf) + ' · наступне повторення: ' + (nx.due - now < 3600000 ? 'через ' + Math.max(1, Math.round((nx.due - now) / 60000)) + ' хв' : 'через ' + Math.max(1, Math.round((nx.due - now) / 86400000)) + ' д') + '</div><div class="row"><button class="btn ghost" id="vs">🔊</button><button class="btn" id="vn">Далі</button></div></div>';
      box.querySelector('#vs').onclick = function () { O.speak(v.inf + '. ' + v.past + '. ' + v.perf); };
      var nb = box.querySelector('#vn'); nb.disabled = false; nb.focus(); nb.onclick = function () { S.i++; step(); };
    }
    box.querySelector('form').onsubmit = function (e) { e.preventDefault(); if (!p.value.trim() && !pf.value.trim()) return; fin(O.verbtr.judge(p.value, v.past, alt, true), O.verbtr.judge(pf.value, v.perf, [], true)); };
    box.querySelector('#vd').onclick = function () { fin(0, 0); };
  }
  function panel(root) {
    var c = counts(), L = limit();
    root.innerHTML = '<div class="panel"><h3>🔁 Повторення дієслів</h3><div class="kpis"><div><b>' + c.due + '</b><span>до повторення</span></div><div><b>' + c.fresh + '</b><span>нових сьогодні</span></div><div><b>' + c.total + '</b><span>у вивченні</span></div></div>' +
      '<label>Нових на день <select id="vnw">' + [3, 5, 8, 12].map(function (n) { return '<option' + (n === L ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      '<div class="row"><button class="btn big" id="vsgo">▶ Почати</button></div><div id="vsbox" hidden></div></div>';
    root.querySelector('#vnw').onchange = function (e) { O.state.settings.vbNew = +e.target.value; O.save(); panel(root); };
    root.querySelector('#vsgo').onclick = function () { var b = root.querySelector('#vsbox'); b.hidden = false; start(b); b.scrollIntoView({ behavior: 'smooth' }); };
  }
  O.vsrs = { counts: counts, start: start, panel: panel, build: build };
})();
