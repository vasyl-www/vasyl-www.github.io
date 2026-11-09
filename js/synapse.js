/* Стимул → реакція: кожна дія в додатку лишає слід у ядрі (O.mind.ev), ядро відповідає короткою реакцією-підказкою.
   Тут же граф «зв'язків» на Сьогодні. Це прозора евристика на лічильниках, не нейромережа. */
(function () {
  var O = window.ORD = window.ORD || {};
  var box = null, timer = null, shown = 0;

  function chip(html, act) {
    if (!box) { box = O.el('div', 'syn'); document.body.appendChild(box); }
    var c = O.el('div', 'synchip', html); box.appendChild(c); shown++;
    while (box.children.length > 2) box.removeChild(box.firstChild);
    if (act) { c.classList.add('act'); c.onclick = function () { try { act(); } catch (e) { /* ok */ } c.remove(); }; }
    setTimeout(function () { c.classList.add('out'); setTimeout(function () { if (c.parentNode) c.remove(); }, 400); }, act ? 6000 : 3000);
  }
  function nm(rec) { return O.esc(String((rec.info && (rec.info.word || (O.wordById[rec.info.id] || {}).no)) || '')); }

  function react(rec) {
    var i = rec.info, t = rec.type, r = rec.r;
    if (t === 'lookup' && r) {
      var inDeck = r.key.indexOf('id:') === 0 && O.card(r.key.slice(3)), links = 0;
      Object.keys(O.mind.LK()).forEach(function (k) { if (k.split('|').indexOf(r.key) >= 0) links++; });
      if (!inDeck && r.n >= 2) chip('🔗 «' + nm(rec) + '» — ' + r.n + '-й раз. Додати у словник?', function () { var w = O.localLookup(i.word); if (w) { O.addWord(w); O.toast('Додано: ' + w.no, 1200); } else O.go('translate'); });
      else chip('🧠 «' + nm(rec) + '» залишило слід' + (links ? ' · зв\'язків: ' + links : '') + (inDeck ? ' · уже у словнику' : ''));
    } else if (t === 'translate') {
      var n = (i.tokens || []).length; if (n) chip('🧠 ' + n + ' ' + (n === 1 ? 'слово' : 'слів') + ' лишили слід — навіть без додавання');
    } else if (t === 'add') {
      var w = O.wordById[i.id], k = w && O.ex ? O.ex.enrichLocal(i.id) : 0;
      chip('✨ Нове слово' + (w ? ' «' + O.esc(w.no) + '»' : '') + (k > 1 ? ' · прикладів: ' + k : ''), null);
      if (w && O.ex && k < 3 && O.state.settings.exAI) O.ex.enrichAI([i.id], function (m) { if (m) chip('📝 ШІ додав ' + m + ' прикл. до «' + O.esc(w.no) + '» (неперевірені)'); });
    } else if (t === 'answer' && i.ok === false) {
      var nb = 0; Object.keys(O.mind.LK()).forEach(function (k2) { if (k2.indexOf('id:' + i.id) >= 0) nb++; });
      if (nb) chip('⚡ Помилка активує ' + nb + ' пов\'язаних слів — вони підуть у активацію');
    }
  }
  window.addEventListener('ord:mind', function (e) { react(e.detail); });
  window.addEventListener('ord:reward', function (e) { var d = e.detail; if (d.rankUp) { chip('⬆ Новий ранг: «' + O.esc(d.rankUp) + '»'); O.sfx && O.sfx('done'); } else if (d.questDone) { chip('🎯 Ціль дня виконана'); O.sfx && O.sfx('done'); } });

  /* ---- Граф ---- */
  function graph(host) {
    var T = O.mind.TR(), L = O.mind.LK(), now = Date.now();
    var keys = Object.keys(T).sort(function (a, b) { return T[b].n - T[a].n || T[b].t - T[a].t; }).slice(0, 14);
    if (keys.length < 2) { host.innerHTML = '<div class="dim small">Граф з’явиться, коли ти перекладатимеш і читатимеш: кожне слово лишає слід, навіть якщо ти його не додав.</div>'; return; }
    var W = 320, H = 240, cx = W / 2, cy = H / 2, R = 92, pos = {};
    keys.forEach(function (k, i) { var a = i / keys.length * Math.PI * 2 - Math.PI / 2; pos[k] = [cx + Math.cos(a) * R * (i % 2 ? 0.8 : 1), cy + Math.sin(a) * R * (i % 2 ? 0.8 : 1)]; });
    function label(k) { if (k.indexOf('id:') === 0) { var w = O.wordById[k.slice(3)]; return w ? w.no : k; } return k.slice(2); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Граф слідів і зв’язків між словами">';
    Object.keys(L).forEach(function (k) { var p = k.split('|'); if (!pos[p[0]] || !pos[p[1]]) return; s += '<line x1="' + pos[p[0]][0] + '" y1="' + pos[p[0]][1] + '" x2="' + pos[p[1]][0] + '" y2="' + pos[p[1]][1] + '" class="ln" style="stroke-width:' + Math.min(4, 0.6 + L[k].n * 0.6) + 'px"/>'; });
    keys.forEach(function (k) {
      var inD = k.indexOf('id:') === 0 && O.card(k.slice(3)), fresh = now - T[k].t < 864e5, r = 4 + Math.min(7, T[k].n);
      s += '<g class="nd' + (inD ? ' in' : '') + (fresh ? ' fresh' : '') + '"><circle cx="' + pos[k][0] + '" cy="' + pos[k][1] + '" r="' + r + '"/><text x="' + pos[k][0] + '" y="' + (pos[k][1] - r - 3) + '" text-anchor="middle">' + O.esc(label(k)) + '</text></g>';
    });
    host.innerHTML = s + '</svg><div class="dim small">● заповнене — у словнику · порожнє — лише слід (не додавав) · лінія — зустрічались разом. Показано до 14 найчастіших.</div>';
  }
  function panel(el) {
    var h = O.el('div'); el.appendChild(h);
    h.innerHTML = '<div class="panel"><b>🕸 Зв’язки</b><div class="syng"></div><div class="synf"></div></div>';
    graph(h.querySelector('.syng'));
    var f = O.mind.feed.slice(0, 5); h.querySelector('.synf').innerHTML = f.length ? '<div class="dim small">Останні реакції:</div>' + f.map(function (r) { return '<div class="small">' + ({ lookup: '👁', translate: '🌐', add: '✨', answer: '🎯', game: '🎮' }[r.type] || '•') + ' ' + O.esc(String((r.info && (r.info.word || (O.wordById[r.info.id] || {}).no)) || r.type)) + '</div>'; }).join('') : '';
    if (O.rewards) { var rb = O.el('div'); el.insertBefore(rb, h); O.rewards.panel(rb); }
  }
  O.synapse = { chip: chip, graph: graph, panel: panel };
})();
