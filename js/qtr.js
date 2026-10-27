/* Швидкий переклад будь-де: кнопка 🌐 і спливаюча кнопка при виділенні тексту. Результат іде в історію й автоматично стає піном. */
(function () {
  var O = window.ORD, fab = null, pop = null, selBtn = null, busy = false;
  function on() { return O.state && O.state.settings.qtr !== false; }
  function norm(q) { return O.norm ? O.norm(q) : q.toLowerCase().trim(); }
  function show(r, q) {
    var out = pop.querySelector('.qt-out'), noText = r.src === 'uk' ? r.translation : q;
    out.innerHTML = '<div class="dim small">' + (r.src === 'uk' ? 'укр → норв' : 'норв → укр') + '</div><div class="big">' + O.esc(r.translation) + '</div>' + (r.literal ? '<div class="dim">Буквально: ' + O.esc(r.literal) + '</div>' : '') +
      (r.note ? '<div class="fact">' + O.esc(r.note) + '</div>' : '') + (r.idioms.length ? '<div class="small">' + r.idioms.slice(0, 3).map(function (i) { return '<div class="mrow"><span class="no">' + O.esc(i.no) + '</span><span class="dim">' + O.esc(i.uk) + '</span></div>'; }).join('') + '</div>' : '') +
      (r.gen ? '<div class="dim small"><span class="gen ' + (r.gen.tier === 'free' ? 'free' : '') + '">✦ ' + O.esc(O.genLabel(r.gen)) + '</span></div>' : '') +
      '<div class="row"><button class="btn ghost" data-s>🔊</button>' + (r.entry && r.entry.lemma ? '<button class="btn ghost" data-a>+ У словник</button>' : '') + '<button class="btn ghost" data-o>Детально</button></div><div class="dim small">📌 Збережено в Піни</div>';
    out.querySelector('[data-s]').onclick = function () { O.speak(noText); };
    var a = out.querySelector('[data-a]'); if (a) a.onclick = function () { if (O.trAdd(r.entry)) O.toast('Додано: ' + r.entry.lemma); a.remove(); };
    out.querySelector('[data-o]').onclick = function () { O.pendingTr = q; pop.hidden = true; O.go('translate'); };
  }
  function run(q) {
    q = String(q || '').trim(); if (!q || busy) return; if (q.length > 500) return O.toast('Максимум 500 символів');
    var out = pop.querySelector('.qt-out'), old = (O.state.tr || []).filter(function (x) { return norm(x.q) === norm(q); })[0];
    if (old) { old.t = Date.now(); O.save(); try { O.pins.addTr(q, old.res); } catch (e) { /* ignore */ } return show(old.res, q); }
    busy = true; out.innerHTML = '<div class="dim">Перекладаю…</div>';
    O.trTranslate(q).then(function (r) { if (!r.translation) throw new Error('порожня відповідь'); O.trRecord(q, r); show(r, q); })
      .catch(function (e) { out.innerHTML = '<div class="banner">' + O.esc(O.aiError(e)) + '</div>'; }).then(function () { busy = false; });
  }
  function open(text) {
    if (!pop) {
      pop = O.el('div', 'aipop qtpop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Швидкий переклад');
      pop.innerHTML = '<div class="aipop-h"><b>🌐 Переклад</b><button class="icon" data-x aria-label="Закрити">✕</button></div><div class="aipop-log"><textarea id="qtq" rows="2" maxlength="500" placeholder="Слово чи фраза, норвезькою або українською"></textarea><div class="row"><button class="btn" id="qtg">Перекласти</button></div><div class="qt-out"></div></div>';
      document.body.appendChild(pop);
      pop.querySelector('[data-x]').onclick = function () { pop.hidden = true; };
      pop.querySelector('#qtg').onclick = function () { run(pop.querySelector('#qtq').value); };
      pop.querySelector('#qtq').onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(e.target.value); } };
    }
    pop.hidden = false; var q = pop.querySelector('#qtq'); if (text) { q.value = text; run(text); } else q.focus();
  }
  O.quickTranslate = open;
  function hideSel() { if (selBtn) { selBtn.remove(); selBtn = null; } }
  function onSel() {
    if (!on()) return hideSel(); var s = window.getSelection && window.getSelection(), t = s ? String(s.toString()).trim() : '';
    if (!t || t.length < 2 || t.length > 200 || !s.rangeCount) return hideSel();
    var n = s.anchorNode && (s.anchorNode.nodeType === 3 ? s.anchorNode.parentNode : s.anchorNode); if (!n || n.closest('input,textarea,.qtpop,.aipop,.toast,#nav')) return hideSel();
    var r = s.getRangeAt(0).getBoundingClientRect(); hideSel();
    selBtn = O.el('button', 'btn selbtn', '🌐 Перекласти'); selBtn.setAttribute('data-nosound', ''); selBtn.style.top = Math.min(window.innerHeight - 60, Math.max(8, r.bottom + 8)) + 'px'; selBtn.style.left = Math.max(8, Math.min(window.innerWidth - 150, r.left)) + 'px';
    selBtn.onmousedown = function (e) { e.preventDefault(); }; selBtn.onclick = function () { var x = t; hideSel(); try { s.removeAllRanges(); } catch (e) { /* ignore */ } open(x); };
    document.body.appendChild(selBtn);
  }
  var tm = null; document.addEventListener('selectionchange', function () { clearTimeout(tm); tm = setTimeout(onSel, 350); });
  function mount() {
    if (fab || !on()) return;
    fab = O.el('button', 'aifab qtfab', '🌐'); fab.setAttribute('aria-label', 'Швидкий переклад'); fab.onclick = function () { if (pop && !pop.hidden) pop.hidden = true; else open(); };
    document.body.appendChild(fab);
  }
  O.setQtr = function (v) { O.state.settings.qtr = v; O.save(); if (!v) { if (fab) { fab.remove(); fab = null; } if (pop) pop.hidden = true; hideSel(); } else mount(); };
  var rs = O.renderSettings; O.renderSettings = function (root) {
    rs(root); var d = O.el('div', 'form', '<label><input type="checkbox" id="uqt"' + (on() ? ' checked' : '') + '> Швидкий переклад будь-де (кнопка 🌐 і виділення тексту)</label>'); root.appendChild(d);
    d.querySelector('#uqt').onchange = function (e) { O.setQtr(e.target.checked); };
  };
  var wait = setInterval(function () { if (O.state && document.getElementById('main')) { clearInterval(wait); mount(); } }, 300);
})();
