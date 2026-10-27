/* Профіль: поріг читання за рівнями, прогрес практики, потім повна статистика пригадування. */
(function () {
  var O = window.ORD;
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  O.renderProfile = function (root) {
    var st = O.state, read = st.read || {}, now = Date.now(), c = O.srs.counts(st.cards, now);
    var lv = ['A1', 'A2'].map(function (l) {
      var ts = O.allStories().filter(function (t) { return t.lvl === l; }), cv = ts.map(function (t) { return O.coverage(t.no); });
      var k = avg(cv.map(function (x) { return x.known; })) || 0, lr = avg(cv.map(function (x) { return x.learning; })) || 0;
      return { l: l, k: k, lr: lr, ready: cv.filter(function (x) { return x.known >= O.THRESHOLD; }).length, n: ts.length, done: ts.filter(function (t) { return read[t.id]; }).length };
    });
    var pr = st.practice || {}, last = function (k, m) { return (pr[k] || []).slice(-m).map(function (e) { return e.v; }); };
    var dict = avg(last('dict', 10)), sh = avg(last('shadow', 10).filter(function (v) { return v > 0; })), pp = avg(last('pairs', 30));
    var fmt = function (v) { return v == null ? '—' : Math.round(v) + '%'; };
    root.innerHTML = '<h2>Профіль</h2><div class="panel"><h3 style="margin-top:0">Поріг читання</h3><p class="dim small">Частка слів у текстах, які ти вже знаєш (картка в стадії повторення з інтервалом від 3 днів, або позначка «Знаю»). Близько 95% — межа, за якою текст читається без постійних зупинок. Це орієнтир зі студій читання, не гарантія.</p>' +
      lv.map(function (x) { return '<div class="lvrow"><b>' + x.l + '</b>' + O.meter({ known: x.k, learning: x.lr }) + '<span>' + Math.round(x.k * 100) + '%</span><small class="dim">готово ' + x.ready + '/' + x.n + ', прочитано ' + x.done + '</small></div>'; }).join('') + '</div>' +
      '<div class="kpis"><div><b>' + c.total + '</b><span>слів у вивченні</span></div><div><b>' + c.mature + '</b><span>зрілих (21+ дн.)</span></div><div><b>' + Object.keys(read).length + '</b><span>історій прочитано</span></div><div><b>' + O.srs.streak(st.log, now) + '</b><span>днів поспіль</span></div></div>' +
      '<div class="panel"><h3 style="margin-top:0">Практика (останні спроби)</h3><div class="kpis"><div><b>' + fmt(dict) + '</b><span>диктант</span></div><div><b>' + fmt(sh) + '</b><span>шедоїнг</span></div><div><b>' + fmt(pp == null ? null : pp * 100) + '</b><span>мінімальні пари</span></div></div></div>' +
      '<div class="row"><button class="btn ghost" data-g="words">🗂 Слова</button><button class="btn ghost" data-g="settings">⚙️ Налаштування</button></div><div id="pacc"></div><div id="pstats"></div>';
    O.$$('[data-g]', root).forEach(function (b) { b.onclick = function () { O.go(b.getAttribute('data-g')); }; });
    O.renderAccount(root.querySelector('#pacc'));
    O.renderStats(root.querySelector('#pstats'));
  };
})();
