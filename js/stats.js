/* Статистика пригадування: утримання, зрілість карток, прогноз, активність, піявки. Графіки — inline SVG. */
(function () {
  var O = window.ORD, DAY = 864e5;
  function pct(x) { return x == null ? '—' : Math.round(x * 100) + '%'; }
  function bars(vals, labels, w, h, color, fmt) {
    var max = Math.max.apply(null, vals.concat([1])), bw = w / vals.length, s = '<svg viewBox="0 0 ' + w + ' ' + (h + 22) + '" class="chart" role="img">';
    vals.forEach(function (v, i) { var bh = Math.round(v / max * h); s += '<rect x="' + (i * bw + 2) + '" y="' + (h - bh) + '" width="' + Math.max(2, bw - 4) + '" height="' + bh + '" rx="3" fill="' + color + '"><title>' + O.esc(labels[i]) + ': ' + (fmt ? fmt(v) : v) + '</title></rect>'; if (vals.length <= 16 || i % 2 === 0) s += '<text x="' + (i * bw + bw / 2) + '" y="' + (h + 14) + '" font-size="10" text-anchor="middle" fill="currentColor" opacity=".6">' + O.esc(labels[i]) + '</text>'; });
    return s + '</svg>';
  }
  function heat(per, days) {
    var keys = Object.keys(per).sort(), max = Math.max.apply(null, keys.map(function (k) { return per[k].n; }).concat([1])), s = '<div class="heat">';
    keys.forEach(function (k) { var n = per[k].n, a = n ? 0.2 + 0.8 * n / max : 0.06; s += '<i title="' + k + ': ' + n + '" style="opacity:' + a.toFixed(2) + (n ? '' : ';background:currentColor') + '"></i>'; });
    return s + '</div>';
  }
  O.renderStats = function (root) {
    var st = O.state, now = Date.now(), c = O.srs.counts(st.cards, now), r30 = O.srs.retention(st.log, now, 30), rm = O.srs.retention(st.log, now, 90, true), r7 = O.srs.retention(st.log, now, 7);
    var per = O.srs.perDay(st.log, now, 84), per14 = O.srs.perDay(st.log, now, 14), keys14 = Object.keys(per14).sort(), fc = O.srs.forecast(st.cards, now, 14);
    var totalMs = st.log.reduce(function (a, e) { return a + (e.ms || 0); }, 0), avgMs = st.log.length ? totalMs / st.log.length : 0;
    var byKind = {}; st.log.forEach(function (e) { var k = e.k || '?'; byKind[k] = byKind[k] || { n: 0, ok: 0 }; byKind[k].n++; if (e.g > 1) byKind[k].ok++; });
    var leeches = Object.keys(st.cards).map(function (k) { return st.cards[k]; }).filter(function (x) { return x.leech || x.lapses >= O.srs.LEECH; }).sort(function (a, b) { return b.lapses - a.lapses; }).slice(0, 12);
    var total = c.total || 1, seg = [['new', 'Нові', '#8892b0'], ['learn', 'Навчання', '#ffb347'], ['young', 'Молоді', '#5ef2c2'], ['mature', 'Зрілі', '#7c5cff']];
    var stack = '<div class="stack">' + seg.map(function (s) { return '<span style="width:' + (c[s[0]] / total * 100) + '%;background:' + s[2] + '" title="' + s[1] + ': ' + c[s[0]] + '"></span>'; }).join('') + '</div><div class="legend">' + seg.map(function (s) { return '<span><i style="background:' + s[2] + '"></i>' + s[1] + ' ' + c[s[0]] + '</span>'; }).join('') + '</div>';
    var names = { intro: 'нове слово', recog: 'переклад', recogRev: 'знайди слово', listen: 'аудіо', type: 'напиши', cloze: 'пропуск', dictation: 'диктант', speak: 'вимова', flip: 'картка' };
    var kinds = Object.keys(byKind).filter(function (k) { return byKind[k].n >= 3; }).map(function (k) { return '<tr><td>' + O.esc(names[k] || k) + '</td><td>' + byKind[k].n + '</td><td>' + pct(byKind[k].ok / byKind[k].n) + '</td></tr>'; }).join('');
    root.innerHTML = '<h2>Статистика пригадування</h2>' +
      '<div class="kpis"><div><b>' + pct(r30.rate) + '</b><span>утримання, 30 днів (' + r30.n + ')</span></div><div><b>' + pct(rm.rate) + '</b><span>зрілі картки, 90 днів (' + rm.n + ')</span></div><div><b>' + pct(r7.rate) + '</b><span>7 днів (' + r7.n + ')</span></div><div><b>' + O.srs.streak(st.log, now) + '</b><span>днів поспіль</span></div></div>' +
      '<p class="dim small">Утримання — частка правильних відповідей на картках, які вже були у стадії повторення. Ціль для SM-2 — близько 85-90%. Якщо менше 80%, зменш денний ліміт нових слів. Дані до ~30 відповідей статистично слабкі.</p>' +
      '<h3>Колода: ' + c.total + ' карток, до повторення ' + c.due + '</h3>' + stack +
      '<h3>Прогноз повторень, 14 днів</h3>' + bars(fc, fc.map(function (_, i) { return i === 0 ? 'сьог' : '+' + i; }), 320, 70, '#7c5cff') +
      '<h3>Відповіді за 14 днів</h3>' + bars(keys14.map(function (k) { return per14[k].n; }), keys14.map(function (k) { return k.slice(8); }), 320, 70, '#5ef2c2') +
      '<h3>Активність, 12 тижнів</h3>' + heat(per, 84) +
      '<h3>Час на відповідь</h3><p>Середній: ' + (avgMs / 1000).toFixed(1) + ' с, усього ' + Math.round(totalMs / 60000) + ' хв за ' + st.log.length + ' відповідей.</p>' +
      (kinds ? '<h3>За типами вправ</h3><table class="tbl"><tr><th>Тип</th><th>Разів</th><th>Правильно</th></tr>' + kinds + '</table>' : '') +
      '<h3>Піявки (слова, що не лізуть у голову)</h3>' + (leeches.length ? '<div class="leeches">' + leeches.map(function (x) { var w = O.wordById[x.id]; return w ? '<div class="mrow"><span><b>' + O.esc(O.label(w)) + '</b> — ' + O.esc(w.uk) + ' <small class="dim">збоїв: ' + x.lapses + '</small></span><button class="btn ghost" data-susp="' + O.esc(x.id) + '">Відкласти</button></div>' : ''; }).join('') + '</div><p class="dim small">Для піявок придумай асоціацію або речення сам. Відкладена картка не з’являється в повтореннях.</p>' : '<p class="dim">Поки немає.</p>');
    O.$$('[data-susp]', root).forEach(function (b) { b.onclick = function () { O.state.cards[b.getAttribute('data-susp')].susp = true; O.save(); b.closest('.mrow').remove(); }; });
  };
})();
