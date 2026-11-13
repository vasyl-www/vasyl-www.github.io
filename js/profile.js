/* Профіль: поріг читання за рівнями, прогрес практики, потім повна статистика пригадування. */
(function () {
  var O = window.ORD;
  function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  /* ---- Вимірювання: панель, звіт для аналізу ---- */
  function telePanel(box) {
    var s = O.state.settings, r = O.tele.report({ days: 30 }), u = r.usage, L = r.learning;
    box.innerHTML = '<div class="panel"><h3 style="margin-top:0">📊 Вимірювання</h3><div class="kpis"><div><b>' + u.totals.visits + '</b><span>візитів (30 дн.)</span></div><div><b>' + u.totals.activeMin + '</b><span>хв активності</span></div><div><b>' + u.totals.daysActive + '</b><span>днів із заняттями</span></div><div><b>' + (u.sessionsMin.median == null ? '—' : u.sessionsMin.median) + '</b><span>медіана візиту, хв</span></div></div>' +
      '<div class="small dim">Відповідей: ' + L.answers.n + (L.answers.accuracy != null ? ', точність ' + Math.round(L.answers.accuracy * 100) + '% (' + Math.round(L.answers.ci95[0] * 100) + '–' + Math.round(L.answers.ci95[1] * 100) + '%)' : '') + (L.answers.medMs ? ', медіана ' + (L.answers.medMs / 1000).toFixed(1) + ' с' : '') + (L.recall7.n ? '. Пригадування через ~7 дн.: ' + Math.round(L.recall7.rate * 100) + '% (n=' + L.recall7.n + ')' : '. Пригадування через ~7 дн.: ще замало даних') + '.</div>' +
      '<label class="small dim" style="display:block;margin:8px 0"><input type="checkbox" id="tOn"> Вести вимірювання (лише лічильники, тексту й слів немає; зберігається на пристрої й синхронізується з твоїм приватним репозиторієм)</label>' +
      '<label class="small dim" style="display:block;margin:8px 0"><input type="checkbox" id="tW"> У звіт додати 20 найскладніших слів (за помилками)</label>' +
      '<div class="row"><button class="btn" id="tCopyP">Копіювати звіт з промптом для LLM</button><button class="btn ghost" id="tCopy">Копіювати лише JSON</button><button class="btn ghost" id="tDl">Завантажити .json</button><button class="btn ghost" id="tClr">Стерти вимірювання</button></div><div class="small dim" id="tMsg"></div>' +
      '<details><summary class="small dim">Що саме потрапляє у звіт</summary><div class="small dim">Візити й час (за днями, годинами, розділами), натискання за елементами й секторами екрана, точність і час відповіді за видами вправ, пригадування через ~7 днів, розмір словника й активний словник, підказки й затримка до першої літери. Обмеження даних записані в самому звіті. Перед надсиланням у корпоративну модель перевір політику своєї організації: звіт особистий.</div></details></div>';
    var on = box.querySelector('#tOn'), w = box.querySelector('#tW'), msg = box.querySelector('#tMsg'); on.checked = s.tele !== false; w.checked = !!s.teleWords;
    on.onchange = function () { s.tele = on.checked; O.save(); }; w.onchange = function () { s.teleWords = w.checked; O.save(); };
    function get(prompt) { return O.tele.text({ days: 60, words: !!s.teleWords, prompt: prompt }); }
    function copy(prompt) { var t = get(prompt); var done = function () { msg.textContent = 'Скопійовано: ' + Math.round(t.length / 1024 * 10) / 10 + ' КБ.'; }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { msg.textContent = 'Не вдалося скопіювати: скористайся «Завантажити .json».'; }); else msg.textContent = 'Копіювання недоступне: скористайся «Завантажити .json».'; }
    box.querySelector('#tCopyP').onclick = function () { copy(true); }; box.querySelector('#tCopy').onclick = function () { copy(false); };
    box.querySelector('#tDl').onclick = function () { var b = new Blob([get(false)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ord2-report-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); };
    box.querySelector('#tClr').onclick = function () { if (!box._arm) { box._arm = 1; msg.textContent = 'Натисни ще раз, щоб стерти всі вимірювання.'; setTimeout(function () { box._arm = 0; }, 3000); return; } O.tele.clear(); telePanel(box); };
  }
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
    root.innerHTML = '<h2>Я</h2><div class="panel" id="pmind"></div><div class="panel"><h3 style="margin-top:0">Поріг читання</h3><p class="dim small">Частка слів у текстах, які ти вже знаєш (картка в стадії повторення з інтервалом від 3 днів, або позначка «Знаю»). Близько 95% — межа, за якою текст читається без постійних зупинок. Це орієнтир зі студій читання, не гарантія.</p>' +
      lv.map(function (x) { return '<div class="lvrow"><b>' + x.l + '</b>' + O.meter({ known: x.k, learning: x.lr }) + '<span>' + Math.round(x.k * 100) + '%</span><small class="dim">готово ' + x.ready + '/' + x.n + ', прочитано ' + x.done + '</small></div>'; }).join('') + '</div>' +
      '<div class="kpis"><div><b>' + c.total + '</b><span>слів у вивченні</span></div><div><b>' + c.mature + '</b><span>зрілих (21+ дн.)</span></div><div><b>' + Object.keys(read).length + '</b><span>історій прочитано</span></div><div><b>' + O.srs.streak(st.log, now) + '</b><span>днів поспіль</span></div></div>' +
      '<div class="panel"><h3 style="margin-top:0">Практика (останні спроби)</h3><div class="kpis"><div><b>' + fmt(dict) + '</b><span>диктант</span></div><div><b>' + fmt(sh) + '</b><span>шедоїнг</span></div><div><b>' + fmt(pp == null ? null : pp * 100) + '</b><span>мінімальні пари</span></div></div></div>' +
      '<div class="row"><button class="btn ghost" data-g="words">🗂 Слова</button><button class="btn ghost" data-g="settings">⚙️ Налаштування</button></div><div id="pacc"></div><div id="pstats"></div>';
    O.mind.panel(root.querySelector('#pmind'));
    O.$$('[data-g]', root).forEach(function (b) { b.onclick = function () { O.go(b.getAttribute('data-g')); }; });
    var lg = O.el('label', 'small dim', '<input type="checkbox" id="plg"> Показувати старі вкладки (Форум, Спільнота, Піни)'); lg.style.display = 'block'; lg.style.margin = '14px 0'; root.appendChild(lg);
    var cb = lg.querySelector('input'); cb.checked = !!O.state.settings.legacyTabs; cb.onchange = function () { O.state.settings.legacyTabs = cb.checked; O.save(); O.rebuildNav(); };
    var ex = O.el('label', 'small dim', '<input type="checkbox" id="pex"> Просити ШІ додавати 2 приклади до нових слів (витрачає запити до твого ключа; приклади позначаються як неперевірені)'); ex.style.display = 'block'; ex.style.margin = '0 0 14px'; root.appendChild(ex);
    var ce = ex.querySelector('input'); ce.checked = !!O.state.settings.exAI; ce.onchange = function () { O.state.settings.exAI = ce.checked; O.save(); };
    var tp = O.el('div'); root.appendChild(tp); telePanel(tp);
    O.renderAccount(root.querySelector('#pacc'));
    O.renderStats(root.querySelector('#pstats'));
  };
})();
