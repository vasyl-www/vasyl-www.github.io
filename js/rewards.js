/* Друга система обліку: медалі й ресурси. Окремо від SRS: SRS рахує пам'ять, тут — зусилля й швидкість.
   Золото = правильно й швидко, срібло = правильно, але повільно/з підказкою, мідь = частково (≥50%), залізо = <50%.
   Будь-який результат дає ресурси. Значення очок і рангів — мій вибір, не науковий факт. */
(function () {
  var O = window.ORD = window.ORD || {};
  var MED = {
    gold: { ic: '🥇', uk: 'Золото', pts: 5 },
    silver: { ic: '🥈', uk: 'Срібло', pts: 3 },
    copper: { ic: '🥉', uk: 'Мідь', pts: 2 },
    iron: { ic: '⚙️', uk: 'Залізо', pts: 1 }
  };
  var RANKS = [[0, 'Новачок'], [40, 'Учень'], [150, 'Підмайстер'], [400, 'Майстер'], [900, 'Знавець'], [2000, 'Ветеран'], [4500, 'Легенда']];
  var QUEST = 30, FREE_CAP = 40, combo = 0, bestCombo = 0;

  function dev() { var s = O.state; if (!s.devId) { s.devId = 'd' + Math.random().toString(36).slice(2, 8); } return s.devId; }
  function R() { var s = O.state; s.res = s.res || {}; var d = dev(); return (s.res[d] = s.res[d] || { g: 0, s: 0, c: 0, i: 0, p: 0, day: {}, free: {} }); }
  function dk() { return O.srs && O.srs.dayKey ? O.srs.dayKey(Date.now()) : new Date().toISOString().slice(0, 10); }

  /* quality → медаль. partial — схожість відповіді 0..1 (для введення/диктанту) */
  function medal(q) {
    if (q.correct) return (q.g >= 3 && !q.hint) ? 'gold' : 'silver';
    return (q.partial || 0) >= 0.5 ? 'copper' : 'iron';
  }
  function total() {
    var r = O.state.res || {}, t = { g: 0, s: 0, c: 0, i: 0, p: 0 };
    Object.keys(r).forEach(function (d) { ['g', 's', 'c', 'i', 'p'].forEach(function (k) { t[k] += r[d][k] || 0; }); });
    return t;
  }
  function today() { var r = O.state.res || {}, d = dk(), n = 0; Object.keys(r).forEach(function (x) { n += (r[x].day && r[x].day[d]) || 0; }); return n; }
  function rank(p) { var cur = RANKS[0], nx = null; for (var i = 0; i < RANKS.length; i++) { if (p >= RANKS[i][0]) { cur = RANKS[i]; nx = RANKS[i + 1] || null; } } return { name: cur[1], from: cur[0], next: nx ? nx[0] : null, nextName: nx ? nx[1] : null }; }
  function add(key, pts) {
    var r = R(), before = total().p, d = dk(); r[key]++; r.p += pts; r.day[d] = (r.day[d] || 0) + pts;
    var ks = Object.keys(r.day); if (ks.length > 60) ks.sort().slice(0, ks.length - 60).forEach(function (k) { delete r.day[k]; });
    var after = total().p, a = rank(before), b = rank(after);
    O.save(); return { rankUp: a.name !== b.name ? b.name : null, before: before, after: after };
  }
  /* картка → медаль */
  function award(q) {
    var m = medal(q), M = MED[m], key = { gold: 'g', silver: 's', copper: 'c', iron: 'i' }[m];
    if (m === 'gold' || m === 'silver') { combo++; if (combo > bestCombo) bestCombo = combo; } else combo = 0;
    var bonus = (m === 'gold' && combo >= 5 && combo % 5 === 0) ? 2 : 0, qBefore = today();
    var r = add(key, M.pts + bonus), qDone = qBefore < QUEST && today() >= QUEST;
    var res = { medal: m, ic: M.ic, uk: M.uk, pts: M.pts + bonus, bonus: bonus, combo: combo, rankUp: r.rankUp, questDone: qDone };
    try { window.dispatchEvent(new CustomEvent('ord:reward', { detail: res })); } catch (e) { /* ok */ }
    return res;
  }
  /* дія поза картками (переклад, пошук слова, гра): завжди залізо, але з добовою стелею проти накрутки */
  function free(src) {
    var r = R(), d = dk(); r.free = r.free || {}; if (r.free.d !== d) r.free = { d: d, n: 0 };
    if (r.free.n >= FREE_CAP) return null; r.free.n++; var x = add('i', 1); return { medal: 'iron', ic: MED.iron.ic, pts: 1, src: src, rankUp: x.rankUp };
  }
  function sessionLine(res) {
    return '<div class="medal ' + res.medal + '"><span class="mi">' + res.ic + '</span> ' + res.uk + ' <b>+' + res.pts + '</b>' + (res.combo >= 3 ? ' · серія ×' + res.combo : '') + (res.questDone ? ' · 🎯 ціль дня виконана' : '') + (res.rankUp ? ' · ⬆ ранг «' + O.esc(res.rankUp) + '»' : '') + '</div>';
  }
  function panel(box) {
    var t = total(), rk = rank(t.p), td = today(), pct = Math.min(100, Math.round(td / QUEST * 100)), rp = rk.next ? Math.round((t.p - rk.from) / (rk.next - rk.from) * 100) : 100;
    box.innerHTML = '<div class="panel rw"><b>🏅 Ресурси</b> <span class="dim small">ранг «' + O.esc(rk.name) + '»' + (rk.next ? ' · до «' + O.esc(rk.nextName) + '»: ' + (rk.next - t.p) : '') + '</span>' +
      '<div class="rwbar"><i style="width:' + rp + '%"></i></div>' +
      '<div class="medals">' + ['gold', 'silver', 'copper', 'iron'].map(function (m) { var k = { gold: 'g', silver: 's', copper: 'c', iron: 'i' }[m]; return '<span class="mdl ' + m + '">' + MED[m].ic + ' <b>' + t[k] + '</b></span>'; }).join('') + '<span class="mdl">Σ <b>' + t.p + '</b></span></div>' +
      '<div class="dim small">🎯 Ціль дня: ' + td + ' / ' + QUEST + '</div><div class="rwbar q"><i style="width:' + pct + '%"></i></div>' +
      '<div class="dim small">Золото: правильно й швидко · срібло: правильно, але повільно чи з підказкою · мідь: частково (від 50%) · залізо: менше 50%. Будь-яка спроба дає ресурси. Очки й ранги — моя умовність; вони не вимірюють знання, SRS окремо.</div></div>';
  }
  O.rewards = { MED: MED, medal: medal, award: award, free: free, total: total, today: today, rank: rank, panel: panel, line: sessionLine, combo: function () { return combo; }, QUEST: QUEST };
})();
