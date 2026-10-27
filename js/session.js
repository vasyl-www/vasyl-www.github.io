/* Сесія вправ: черга з SRS, різні типи вправ залежно від зрілості картки, автоматична оцінка за відповіддю і часом. */
(function () {
  var O = window.ORD, S = null;
  var KIND_UK = { intro: 'Нове слово', recog: 'Переклад', recogRev: 'Знайди слово', listen: 'Аудіо', type: 'Напиши', cloze: 'Пропуск', dictation: 'Диктант', speak: 'Вимова', flip: 'Картка' };

  function clozeOf(w) {
    var ex = w.ex, forms = [w.no].concat((O.base.FORMS[w.no] || [])), esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    for (var i = 0; i < forms.length; i++) {
      var m = new RegExp('(^|[^A-Za-zÆØÅæøå])(' + esc(forms[i]) + ')(?![A-Za-zÆØÅæøå])', 'i').exec(ex);
      if (m) return { text: ex.slice(0, m.index + m[1].length) + '_____' + ex.slice(m.index + m[1].length + m[2].length), ans: m[2] };
    }
    return null;
  }
  function distractors(w, key, n) {
    var pool = O.words.filter(function (x) { return x.id !== w.id && x[key] !== w[key] && x.cat === w.cat; });
    if (pool.length < n) pool = pool.concat(O.words.filter(function (x) { return x.id !== w.id && x[key] !== w[key] && x.deck === w.deck; }));
    if (pool.length < n) pool = O.words.filter(function (x) { return x.id !== w.id; });
    var seen = {}, out = []; O.shuffle(pool).forEach(function (x) { if (out.length < n && !seen[x[key]]) { seen[x[key]] = 1; out.push(x); } });
    return out;
  }
  function chooseKind(c, w) {
    var m = O.srs.maturity(c), hasCloze = !!clozeOf(w), long = !w.multi && w.no.length >= 3, r = Math.random();
    if (m === 'new') return 'intro';
    if (m === 'learn') return r < 0.4 ? 'recog' : (r < 0.7 && O.hasVoice() ? 'listen' : 'recogRev');
    if (m === 'young') return r < 0.25 ? 'type' : (r < 0.5 && hasCloze ? 'cloze' : (r < 0.7 && O.hasVoice() ? 'listen' : (r < 0.85 ? 'recogRev' : 'flip')));
    var pool = ['type', 'flip']; if (hasCloze) pool.push('cloze'); if (O.hasVoice()) pool.push('dictation'); if (O.canListen() && long) pool.push('speak');
    return pool[Math.floor(Math.random() * pool.length)];
  }

  O.startSession = function (root, opts) {
    opts = opts || {}; var st = O.state.settings, now = Date.now();
    var newLeft = opts.newOnly === false ? 0 : Math.max(0, st.newPerDay - O.todayNew());
    var q = O.srs.queue(O.state.cards, now, newLeft);
    // нові слова беремо з колоди, якої ще немає в картках, а не лише з уже доданих
    var have = O.state.cards, deckFilter = opts.deck || O.state.settings.deck || 'all';
    var fresh = q.fresh.map(function (c) { return c.id; });
    if (fresh.length < newLeft) {
      var extra = O.words.filter(function (w) { return !have[w.id] && (deckFilter === 'all' || w.deck === deckFilter); }).slice(0, newLeft - fresh.length).map(function (w) { return w.id; });
      extra.forEach(function (id) { O.ensureCard(id); }); fresh = fresh.concat(extra);
    }
    var due = q.due.map(function (c) { return c.id; });
    if (opts.weak) due = Object.keys(have).filter(function (k) { return have[k].lapses >= 2 || have[k].leech; });
    var cap = Math.max(6, st.sessionLen * 3), queue = [];
    var f = fresh.slice(), d = due.slice();
    while ((f.length || d.length) && queue.length < cap) { if (d.length) queue.push(d.shift()); if (d.length && queue.length < cap) queue.push(d.shift()); if (f.length && queue.length < cap) queue.push(f.shift()); }
    S = { root: root, queue: queue, total: queue.length, i: 0, ok: 0, bad: 0, newSeen: 0, t0: Date.now(), tq: 0, requeued: {} };
    if (!queue.length) { root.innerHTML = '<div class="panel center"><h2>Усе повторено 🎉</h2><p class="dim">Нічого не прострочено, і денний ліміт нових слів вичерпано. Повернись пізніше або додай слова з читалки.</p></div>'; return; }
    next();
  };

  function progress() { var p = S.total ? Math.round(S.i / S.total * 100) : 0; return '<div class="bar"><i style="width:' + p + '%"></i></div><div class="dim small">' + S.i + '/' + S.total + '</div>'; }
  function next() {
    if (S.i >= S.queue.length) return finish();
    var id = S.queue[S.i], w = O.wordById[id], c = O.card(id); if (!w || !c) { S.i++; return next(); }
    var kind = chooseKind(c, w); S.tq = Date.now(); S.hint = false;
    var head = '<div class="sess-head">' + progress() + '<span class="tag">' + KIND_UK[kind] + '</span>' + (c.leech ? '<span class="tag warn">піявка</span>' : '') + '</div>';
    var box = O.el('div', 'stage'); S.root.innerHTML = head; S.root.appendChild(box);
    var R = RENDER[kind]; R(box, w, c, kind);
    if (O.state.settings.autoSpeak && (kind === 'intro' || kind === 'recog')) setTimeout(function () { O.speak(w.no); }, 250);
  }

  function answer(w, c, kind, correct, o) {
    o = o || {}; S.keys = null; var ms = Date.now() - S.tq, g = o.grade || O.srs.gradeFrom(correct, ms, { hint: S.hint || o.hint, typed: o.typed });
    var wasNew = c.st === 'new'; if (wasNew) S.newSeen++;
    var nc = O.grade(w.id, g, ms, kind); correct ? S.ok++ : S.bad++;
    O.sfx(correct ? 'ok' : 'bad');
    if (g === 1 && (S.requeued[w.id] || 0) < 3) { S.requeued[w.id] = (S.requeued[w.id] || 0) + 1; S.queue.splice(Math.min(S.queue.length, S.i + 4), 0, w.id); S.total++; }
    else if (nc.st === 'learn' && (S.requeued[w.id] || 0) < 3) { S.requeued[w.id] = (S.requeued[w.id] || 0) + 1; S.queue.splice(Math.min(S.queue.length, S.i + 6), 0, w.id); S.total++; }
    var fb = O.el('div', 'feedback ' + (correct ? 'good' : 'bad'));
    fb.innerHTML = '<div class="fb-h">' + (correct ? (g === 2 ? '✓ Правильно, але повільно' : '✓ Правильно') : '✗ Неправильно') + (o.note ? ' · ' + O.esc(o.note) : '') + '</div>' +
      '<div class="fb-w"><b>' + O.esc(O.label(w)) + '</b> — ' + O.esc(w.uk) + ' <button class="icon" data-say title="Озвучити">🔊</button></div>' +
      '<div class="fb-ex no">' + O.esc(w.ex) + '</div><div class="dim">' + O.esc(w.exUk) + '</div>' + (w.fact ? '<div class="fact">💡 ' + O.esc(w.fact) + '</div>' : '') +
      '<div class="dim small">Наступне повторення: ' + (nc.st === 'learn' ? 'через кілька хвилин' : 'через ' + nc.ivl + ' дн.') + '</div><button class="btn" data-next>Далі ⏎</button>';
    S.root.querySelector('.stage').appendChild(fb);
    fb.querySelector('[data-say]').onclick = function () { O.speak(w.ex); };
    var go = fb.querySelector('[data-next]'); go.focus(); go.onclick = function () { S.i++; next(); };
    if (O.state.settings.autoSpeak && !o.silent) O.speak(w.no);
  }

  function mcq(box, w, c, kind, promptHtml, options, isCorrect, speakPrompt) {
    box.innerHTML = '<div class="prompt">' + promptHtml + '</div><div class="opts"></div><div class="row"><button class="btn ghost" data-dunno>Не знаю</button></div>';
    var done = false, opts = box.querySelector('.opts');
    options.forEach(function (o, i) { var b = O.el('button', 'opt', '<kbd>' + (i + 1) + '</kbd> ' + O.esc(o.t)); b.onclick = function () { fin(o, b); }; opts.appendChild(b); });
    function fin(o, b) {
      if (done) return; done = true; var ok = o ? isCorrect(o) : false;
      O.$$('.opt', box).forEach(function (x, i) { x.disabled = true; if (isCorrect(options[i])) x.classList.add('right'); }); if (b && !ok) b.classList.add('wrong');
      answer(w, c, kind, ok, { silent: kind === 'listen' && false });
    }
    box.querySelector('[data-dunno]').onclick = function () { fin(null); };
    S.keys = function (e) { var n = parseInt(e.key, 10); if (n >= 1 && n <= options.length) opts.children[n - 1].click(); };
    if (speakPrompt) { var sp = box.querySelector('[data-say]'); if (sp) sp.onclick = function () { O.speak(w.no); }; }
  }

  function typed(box, w, c, kind, promptHtml, target, extra) {
    box.innerHTML = '<div class="prompt">' + promptHtml + '</div><form class="row"><input autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Норвезькою…"><button class="btn">Перевірити</button></form><div class="row"><button class="btn ghost" data-hint>Підказка</button><button class="btn ghost" data-dunno>Не знаю</button></div><div class="hintline dim"></div>';
    var inp = box.querySelector('input'); inp.focus(); var hint = 0;
    box.querySelector('[data-hint]').onclick = function () { S.hint = true; hint++; box.querySelector('.hintline').textContent = target.slice(0, hint) + '…'; inp.focus(); };
    box.querySelector('[data-dunno]').onclick = function () { lock(); answer(w, c, kind, false); };
    function lock() { O.$$('input,button', box).forEach(function (x) { x.disabled = true; }); }
    box.querySelector('form').onsubmit = function (e) {
      e.preventDefault(); var v = inp.value; if (!v.trim()) return; lock(); var a = O.norm(v), t = O.norm(target);
      if (a === t) return answer(w, c, kind, true, { typed: true });
      if (O.fold(a) === O.fold(t)) return answer(w, c, kind, true, { grade: 2, note: 'не забувай æ, ø, å: ' + target });
      if (t.length >= 6 && O.lev(a, t) <= 1) return answer(w, c, kind, true, { grade: 2, note: 'майже, описка: ' + target });
      answer(w, c, kind, false, { note: 'твоя відповідь: «' + v.trim() + '»' });
    };
    S.keys = null;
  }

  var RENDER = {
    intro: function (box, w, c) {
      var pic = O.PIC(w);
      box.innerHTML = '<div class="intro">' + (pic ? '<div class="pic">' + pic + '</div>' : '') + '<div class="big no">' + O.esc(O.label(w)) + ' <button class="icon" data-say>🔊</button> <button class="icon" data-slow title="Повільно">🐢</button></div><div class="tr">' + O.esc(w.uk) + '</div><div class="ex no">' + O.esc(w.ex) + '</div><div class="dim">' + O.esc(w.exUk) + '</div>' + (w.fact ? '<div class="fact">💡 ' + O.esc(w.fact) + '</div>' : '') + '<button class="btn" data-ok>Запам’ятав, перевір мене</button></div>';
      box.querySelector('[data-say]').onclick = function () { O.speak(w.no); }; box.querySelector('[data-slow]').onclick = function () { O.speak(w.no, { slow: true }); };
      box.querySelector('[data-ok]').onclick = function () {
        var ds = distractors(w, 'uk', 3), opts = O.shuffle([{ t: w.uk, w: w }].concat(ds.map(function (d) { return { t: d.uk, w: d }; })));
        S.tq = Date.now(); mcq(box, w, c, 'recog', '<span class="no big">' + O.esc(O.label(w)) + '</span>', opts, function (o) { return o.w === w; });
      };
    },
    recog: function (box, w, c, kind) {
      var ds = distractors(w, 'uk', 3), opts = O.shuffle([{ t: w.uk, w: w }].concat(ds.map(function (d) { return { t: d.uk, w: d }; })));
      mcq(box, w, c, kind, '<span class="no big">' + O.esc(O.label(w)) + '</span> <button class="icon" data-say>🔊</button>', opts, function (o) { return o.w === w; }, true);
    },
    recogRev: function (box, w, c, kind) {
      var ds = distractors(w, 'no', 3), opts = O.shuffle([{ t: O.label(w), w: w }].concat(ds.map(function (d) { return { t: O.label(d), w: d }; })));
      mcq(box, w, c, kind, '<span class="big">' + O.esc(w.uk) + '</span>', opts, function (o) { return o.w === w; });
    },
    listen: function (box, w, c, kind) {
      var ds = distractors(w, 'no', 3).sort(function (a, b) { return O.lev(O.fold(a.no), O.fold(w.no)) - O.lev(O.fold(b.no), O.fold(w.no)); }), opts = O.shuffle([{ t: O.label(w), w: w }].concat(ds.map(function (d) { return { t: O.label(d), w: d }; })));
      mcq(box, w, c, kind, '<button class="btn big" data-say>🔊 Послухай і вибери слово</button> <button class="icon" data-slow>🐢</button>', opts, function (o) { return o.w === w; }, true);
      box.querySelector('[data-slow]').onclick = function () { O.speak(w.no, { slow: true }); }; setTimeout(function () { O.speak(w.no); }, 200);
    },
    type: function (box, w, c, kind) { typed(box, w, c, kind, '<span class="big">' + O.esc(w.uk) + '</span><div class="dim">Напиши норвезькою' + (w.art ? ' (з артиклем «' + w.art + '»? достатньо слова)' : '') + '</div>', w.no); },
    cloze: function (box, w, c, kind) {
      var z = clozeOf(w); if (!z) return RENDER.type(box, w, c, 'type');
      typed(box, w, c, kind, '<div class="no big">' + O.esc(z.text) + '</div><div class="dim">' + O.esc(w.exUk) + '</div>', z.ans);
    },
    dictation: function (box, w, c, kind) {
      box.innerHTML = '<div class="prompt"><button class="btn big" data-say>🔊 Послухай речення</button> <button class="btn ghost" data-slow>🐢 Повільно</button></div><form class="row"><input autocomplete="off" spellcheck="false" placeholder="Напиши, що почув…"><button class="btn">Перевірити</button></form><div class="row"><button class="btn ghost" data-dunno>Не знаю</button></div>';
      var say = function (s) { O.speak(w.ex, { slow: s }); }; box.querySelector('[data-say]').onclick = function () { S.hint = false; say(false); }; box.querySelector('[data-slow]').onclick = function () { S.hint = true; say(true); }; setTimeout(function () { say(false); }, 200);
      var inp = box.querySelector('input'); inp.focus();
      box.querySelector('[data-dunno]').onclick = function () { answer(w, c, kind, false, { silent: true }); };
      box.querySelector('form').onsubmit = function (e) {
        e.preventDefault(); var sc = O.sim(inp.value, w.ex); O.$$('input,button', box).forEach(function (x) { x.disabled = true; });
        answer(w, c, kind, sc >= 0.9, { typed: true, grade: sc >= 0.9 ? (sc >= 0.98 && !S.hint ? 3 : 2) : 1, note: Math.round(sc * 100) + '% збігу: ' + w.ex, silent: true });
      };
    },
    speak: function (box, w, c, kind) {
      box.innerHTML = '<div class="prompt"><div class="big no">' + O.esc(w.no) + '</div><div class="dim">' + O.esc(w.uk) + '</div></div><div class="row"><button class="btn ghost" data-say>🔊 Еталон</button><button class="btn" data-mic>🎤 Скажи</button><button class="btn ghost" data-rec>⏺ Запиши й порівняй</button></div><div class="msg dim"></div><div class="row"><button class="btn ghost" data-dunno>Пропустити</button></div>';
      var msg = box.querySelector('.msg'); box.querySelector('[data-say]').onclick = function () { O.speak(w.no); };
      box.querySelector('[data-mic]').onclick = function () {
        msg.textContent = 'Слухаю…';
        O.listen(function (alts) { var sc = O.pronScore(alts, w.no); msg.textContent = 'Розпізнано: «' + alts[0] + '» · ' + Math.round(sc * 100) + '%'; answer(w, c, kind, sc >= 0.8, { grade: sc >= 0.8 ? 3 : 1, note: 'розпізнано «' + alts[0] + '» (' + Math.round(sc * 100) + '%)', silent: true }); },
          function (e) { msg.textContent = 'Розпізнавання недоступне (' + e + '). Скористайся записом.'; });
      };
      box.querySelector('[data-rec]').onclick = function () {
        msg.textContent = 'Запис 3 с…'; O.record(3000).then(function (url) { msg.innerHTML = 'Порівняй: <button class="btn ghost" data-a>🔊 Еталон</button> <button class="btn ghost" data-b>▶ Ти</button> Оціни:'; var a = new Audio(url);
          msg.querySelector('[data-a]').onclick = function () { O.speak(w.no); }; msg.querySelector('[data-b]').onclick = function () { a.play(); };
          [[1, 'Знову'], [2, 'Важко'], [3, 'Добре']].forEach(function (g) { var b = O.el('button', 'btn', g[1]); b.onclick = function () { answer(w, c, kind, g[0] > 1, { grade: g[0], silent: true }); }; msg.appendChild(b); }); }).catch(function () { msg.textContent = 'Мікрофон недоступний. Дозволь доступ у браузері.'; });
      };
      box.querySelector('[data-dunno]').onclick = function () { answer(w, c, kind, false, { silent: true }); };
    },
    flip: function (box, w, c, kind) {
      box.innerHTML = '<div class="prompt"><span class="big">' + O.esc(w.uk) + '</span></div><button class="btn" data-show>Показати відповідь</button>';
      box.querySelector('[data-show]').onclick = function () {
        var ms = Date.now() - S.tq; box.innerHTML = '<div class="prompt"><span class="big">' + O.esc(w.uk) + '</span></div><div class="big no">' + O.esc(O.label(w)) + ' <button class="icon" data-say>🔊</button></div><div class="dim">' + O.esc(w.ex) + '</div><div class="row grades"></div>';
        box.querySelector('[data-say]').onclick = function () { O.speak(w.no); }; O.speak(w.no);
        [[1, 'Знову'], [2, 'Важко'], [3, 'Добре'], [4, 'Легко']].forEach(function (g) { var b = O.el('button', 'btn g' + g[0], '<kbd>' + g[0] + '</kbd> ' + g[1]); b.onclick = function () { S.tq = Date.now() - ms; var nc = O.card(w.id); answer(w, c, kind, g[0] > 1, { grade: g[0], silent: true }); }; box.querySelector('.grades').appendChild(b); });
        S.keys = function (e) { var n = parseInt(e.key, 10); if (n >= 1 && n <= 4) box.querySelectorAll('.grades .btn')[n - 1].click(); };
      };
    }
  };

  function finish() {
    var secs = Math.round((Date.now() - S.t0) / 1000), n = S.ok + S.bad, acc = n ? Math.round(S.ok / n * 100) : 0, f = O.srs.forecast(O.state.cards, Date.now(), 3);
    O.sfx('done'); O.stopSpeak();
    S.root.innerHTML = '<div class="panel center"><h2>Сесію завершено</h2><div class="kpis"><div><b>' + n + '</b><span>відповідей</span></div><div><b>' + acc + '%</b><span>правильно</span></div><div><b>' + S.newSeen + '</b><span>нових слів</span></div><div><b>' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0') + '</b><span>час</span></div></div><p class="dim">Завтра до повторення: ' + f[1] + ' карток.</p><div class="row center"><button class="btn" data-again>Ще сесія</button><button class="btn ghost" data-home>На головну</button></div></div>';
    S.root.querySelector('[data-again]').onclick = function () { O.startSession(S.root, {}); }; S.root.querySelector('[data-home]').onclick = function () { O.go('home'); };
    O.flush();
  }
  document.addEventListener('keydown', function (e) { if (S && S.keys && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) S.keys(e); });
  O.currentWord = function () { return S ? O.wordById[S.queue[S.i]] : null; };
  O.sessionActive = function () { return !!(S && S.root && S.root.isConnected && S.i < S.queue.length); };
})();
