/* Екрани «Слова» (бібліотека) і «Налаштування». */
(function () {
  var O = window.ORD;
  var STATE_UK = { new: 'нове', learn: 'навчання', young: 'молоде', mature: 'зріле' };
  O.renderWords = function (root) {
    var f = { q: '', deck: 'all', st: 'all' };
    root.innerHTML = '<h2>Слова</h2><div class="row"><input id="wq" placeholder="Пошук (норвезькою чи українською)"><select id="wd"><option value="all">Усі колоди</option><option value="core">Основа (142)</option><option value="life">Життя</option><option value="work">Робота й побут</option><option value="mine">Мої</option></select><select id="ws"><option value="all">Усі стани</option><option value="none">Не в картках</option><option value="new">Нові</option><option value="learn">Навчання</option><option value="young">Молоді</option><option value="mature">Зрілі</option></select></div><div class="dim small" id="wc"></div><div id="wl"></div>';
    function draw() {
      var q = f.q.toLowerCase(), now = Date.now(), list = O.words.filter(function (w) {
        if (f.deck !== 'all' && w.deck !== f.deck) return false;
        var c = O.card(w.id), st = c ? O.srs.maturity(c) : 'none'; if (f.st !== 'all' && st !== f.st) return false;
        return !q || w.no.toLowerCase().indexOf(q) >= 0 || w.uk.toLowerCase().indexOf(q) >= 0;
      });
      root.querySelector('#wc').textContent = 'Показано ' + Math.min(list.length, 150) + ' із ' + list.length;
      root.querySelector('#wl').innerHTML = list.slice(0, 150).map(function (w) {
        var c = O.card(w.id), st = c ? O.srs.maturity(c) : 'none', due = c && O.srs.isDue(c, now);
        return '<div class="mrow" data-id="' + O.esc(w.id) + '"><span><b>' + O.esc(O.label(w)) + '</b> — ' + O.esc(w.uk) + ' <small class="dim">' + O.esc(O.catName(w.cat)) + '</small></span><span class="tag ' + (due ? 'warn' : '') + '">' + (st === 'none' ? '—' : STATE_UK[st] + (c.susp ? ', відкладено' : '') + (due ? ', до повтор.' : '')) + '</span><button class="icon" data-say>🔊</button>' + (c ? '<button class="btn ghost" data-susp>' + (c.susp ? 'Повернути' : 'Відкласти') + '</button>' : '<button class="btn ghost" data-add>+ вчити</button>') + '</div>';
      }).join('');
    }
    root.querySelector('#wq').oninput = function (e) { f.q = e.target.value; draw(); }; root.querySelector('#wd').onchange = function (e) { f.deck = e.target.value; draw(); }; root.querySelector('#ws').onchange = function (e) { f.st = e.target.value; draw(); };
    root.querySelector('#wl').onclick = function (e) {
      var row = e.target.closest('.mrow'); if (!row) return; var w = O.wordById[row.getAttribute('data-id')];
      if (e.target.hasAttribute('data-say')) O.speak(w.no); else if (e.target.hasAttribute('data-add')) { O.addWord(w); draw(); } else if (e.target.hasAttribute('data-susp')) { var c = O.card(w.id); c.susp = !c.susp; O.save(); draw(); }
    };
    draw();
  };
  O.renderSettings = function (root) {
    var s = O.state.settings, vs = O.norwegianVoices();
    root.innerHTML = '<h2>Налаштування</h2><div class="form">' +
      '<label>Нових слів на день <input type="number" id="sn" min="0" max="60" value="' + s.newPerDay + '"></label>' +
      '<label>Довжина сесії, хв (≈3 вправи за хвилину) <input type="number" id="sl" min="3" max="90" value="' + s.sessionLen + '"></label>' +
      '<label>Голос <select id="sv"><option value="">авто</option>' + vs.map(function (v) { return '<option' + (v.name === s.voice ? ' selected' : '') + ' value="' + O.esc(v.name) + '">' + O.esc(v.name + ' (' + v.lang + ')') + '</option>'; }).join('') + '</select></label>' +
      (vs.length ? '' : '<p class="warn small">Норвезького голосу в системі не знайдено. На Mac: Системні налаштування → Спеціальні можливості → Промовляти вміст → Системний голос → Керувати голосами → Norsk (Nora, Henrik), потім перезапусти браузер.</p>') +
      '<label>Швидкість мови <input type="range" id="sr" min="0.5" max="1.2" step="0.05" value="' + s.rate + '"> <span id="srv">' + s.rate + '</span></label>' +
      '<label><input type="checkbox" id="sa"' + (s.autoSpeak ? ' checked' : '') + '> Озвучувати автоматично</label><label><input type="checkbox" id="sf"' + (s.sfx ? ' checked' : '') + '> Звукові ефекти</label>' +
      '<div class="row"><button class="btn ghost" id="stest">🔊 Тест голосу</button></div></div>' +
      '<h3>Дані</h3><p class="dim small">Прогрес зберігається в цьому браузері (localStorage). Нижче можна зберегти копію у файл і відновити її. Ключі ШІ у файл не потрапляють. Імпорт додає відсутнє й не стирає наявне.</p><div class="row"><button class="btn ghost" id="sx">Експорт JSON</button><label class="btn ghost">Імпорт JSON<input type="file" id="si" accept="application/json" hidden></label></div>' +
      '<p class="dim small">Картки: ' + Object.keys(O.state.cards).length + ', повторень у журналі: ' + O.state.log.length + ', слів із тексту: ' + Object.keys(O.state.userWords).length + '. Дані зберігаються в цьому браузері.</p>';
    function bind(id, fn) { root.querySelector(id).onchange = function (e) { fn(e.target); O.save(); }; }
    bind('#sn', function (t) { s.newPerDay = Math.max(0, +t.value || 0); }); bind('#sl', function (t) { s.sessionLen = Math.max(3, +t.value || 20); }); bind('#sv', function (t) { s.voice = t.value; });
    bind('#sa', function (t) { s.autoSpeak = t.checked; }); bind('#sf', function (t) { s.sfx = t.checked; });
    root.querySelector('#sr').oninput = function (e) { s.rate = +e.target.value; root.querySelector('#srv').textContent = s.rate; O.save(); };
    root.querySelector('#stest').onclick = function () { O.speak('Hei, jeg heter Vasyl, og jeg lærer norsk.'); };
    root.querySelector('#sx').onclick = function () { var a = O.el('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(O.state, null, 1)], { type: 'application/json' })); a.download = 'ord-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); };
    root.querySelector('#si').onchange = function (e) {
      var fl = e.target.files[0]; if (!fl) return; var r = new FileReader(); r.onload = function () {
        try { var o = JSON.parse(r.result), n = 0; Object.keys(o.cards || {}).forEach(function (k) { if (!O.state.cards[k]) { O.state.cards[k] = o.cards[k]; n++; } });
          Object.keys(o.userWords || {}).forEach(function (k) { if (!O.state.userWords[k]) O.state.userWords[k] = o.userWords[k]; });
          var have = {}; O.state.log.forEach(function (x) { have[x.t + ':' + x.id] = 1; }); (o.log || []).forEach(function (x) { if (!have[x.t + ':' + x.id]) O.state.log.push(x); }); O.state.log.sort(function (a, b) { return a.t - b.t; });
          Object.keys(o.known || {}).forEach(function (k) { O.state.known[k] = 1; }); O.registerWords(); O.save(); O.toast('Додано карток: ' + n); O.renderSettings(root); } catch (x) { O.toast('Невірний JSON'); }
      }; r.readAsText(fl);
    };
  };
})();
