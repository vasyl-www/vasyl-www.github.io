/* ШІ-репетитор: рольові діалоги норвезькою з виправленням помилок. Помилки й нові слова зберігаються для повторення. */
(function () {
  var O = window.ORD, conv = null;
  function sys(sc) {
    var known = Object.keys(O.state.cards).slice(-40).map(function (k) { return O.wordById[k] && O.wordById[k].no; }).filter(Boolean).join(', ');
    return 'Ти норвезький співрозмовник і репетитор (bokmål). Учень: український зварювальник, живе в Норвегії, рівень A1-A2. Сценарій: ' + sc.title + '. Твоя роль: ' + sc.role + '. Мета учня: ' + sc.goal + '\n' +
      'Правила: говори простою норвезькою, 1-3 короткі речення, не переходь на англійську. Рухай розмову: став одне запитання. Слова, які учень уже вчить (можеш вживати): ' + (known || 'мало') + '.\n' +
      'Кожну відповідь повертай ЛИШЕ як JSON: {"reply":"твоя репліка норвезькою","corrections":[{"wrong":"фрагмент учня з помилкою","right":"правильно","why":"коротке пояснення українською"}],"newWords":[{"no":"слово з твоєї репліки, яке учень може не знати","uk":"переклад"}],"hint":"підказка українською, що учневі відповісти"}. ' +
      'corrections порожній, якщо помилок немає (не вигадуй помилок; не виправляй пунктуацію й великі літери). newWords максимум 3.';
  }
  function bubble(log, who, html) { var b = O.el('div', 'bub ' + who, html); log.appendChild(b); log.scrollTop = log.scrollHeight; return b; }
  function start(root, sc) {
    conv = { sc: sc, msgs: [], mistakes: [], words: [], t0: Date.now(), turns: 0 };
    root.innerHTML = '<div class="tutor-h"><b>' + O.esc(sc.title) + '</b> <button class="btn ghost" id="tend">Завершити</button></div><div class="tlog"></div><div class="row"><button class="btn ghost" id="thint">💡 Підказка</button></div><form class="row"><input autocomplete="off" placeholder="Skriv på norsk…" id="tin"><button class="icon" type="button" id="tmic" title="Говорити">🎤</button><button class="btn">➤</button></form>';
    var log = root.querySelector('.tlog'); bubble(log, 'bot no', O.esc(sc.start)); O.speak(sc.start);
    conv.msgs.push({ role: 'assistant', content: JSON.stringify({ reply: sc.start, corrections: [], newWords: [], hint: '' }) });
    var inp = root.querySelector('#tin'); inp.focus();
    root.querySelector('#thint').onclick = function () { O.toast(conv.hint || 'Спершу дочекайся репліки або просто відповідай простими словами', 4500); };
    root.querySelector('#tmic').onclick = function () { O.listen(function (alts) { inp.value = alts[0]; inp.focus(); }, function (e) { O.toast('Мікрофон: ' + e); }); };
    root.querySelector('#tend').onclick = function () { end(root); };
    root.querySelector('form').onsubmit = function (e) {
      e.preventDefault(); var t = inp.value.trim(); if (!t) return; inp.value = ''; conv.turns++;
      var mine = bubble(log, 'me no', O.esc(t)); conv.msgs.push({ role: 'user', content: t });
      var wait = bubble(log, 'bot dim', '…');
      O.aiJson(sys(sc), conv.msgs, 700).then(function (j) {
        wait.remove(); var reply = String(j.reply || '').trim(); conv.hint = String(j.hint || '');
        conv.msgs.push({ role: 'assistant', content: JSON.stringify({ reply: reply, corrections: [], newWords: [], hint: conv.hint }) });
        var cs = (Array.isArray(j.corrections) ? j.corrections : []).filter(function (c) { return c && c.wrong && c.right; }).slice(0, 4);
        if (cs.length) { mine.innerHTML += '<div class="corr">' + cs.map(function (c) { conv.mistakes.push({ wrong: String(c.wrong), right: String(c.right), why: String(c.why || ''), t: Date.now() }); return '<div>✗ <s>' + O.esc(c.wrong) + '</s> → <b>' + O.esc(c.right) + '</b><br><span class="dim small">' + O.esc(c.why || '') + '</span></div>'; }).join('') + '</div>'; }
        else mine.innerHTML += '<div class="corr ok">✓ без помилок</div>';
        var nw = (Array.isArray(j.newWords) ? j.newWords : []).filter(function (w) { return w && w.no && w.uk; }).slice(0, 3);
        var b = bubble(log, 'bot no', O.esc(reply) + ' <button class="icon" data-say>🔊</button>' + (nw.length ? '<div class="nw">' + nw.map(function (w, i) { return '<button class="chip" data-i="' + i + '">+ ' + O.esc(w.no) + ' — ' + O.esc(w.uk) + '</button>'; }).join('') + '</div>' : ''));
        b.querySelector('[data-say]').onclick = function () { O.speak(reply); }; if (O.state.settings.autoSpeak) O.speak(reply);
        O.$$('.nw .chip', b).forEach(function (ch) { ch.onclick = function () { var w = nw[+ch.getAttribute('data-i')], lem = String(w.no).toLowerCase(); var added = O.addWord({ id: 'u:' + lem, deck: 'mine', cat: 'Mine', art: '', no: lem, uk: String(w.uk), ex: reply, exUk: '', fact: 'З діалогу: ' + sc.title, multi: lem.indexOf(' ') > 0 }); conv.words.push(lem); ch.disabled = true; O.toast(added ? 'Додано в словник' : 'Вже є'); }; });
      }).catch(function (er) { wait.innerHTML = O.esc(O.aiError(er)); });
    };
  }
  function end(root) {
    var c = conv; if (!c || !c.turns) { O.renderTutor(root); return; }
    O.state.tutor.sessions.push({ id: c.sc.id, t: c.t0, turns: c.turns, mistakes: c.mistakes, words: c.words }); O.state.xp += c.turns * 2; O.save();
    root.innerHTML = '<div class="panel"><h2>Підсумок діалогу</h2><p>Реплік: ' + c.turns + ', помилок: ' + c.mistakes.length + ', слів додано: ' + c.words.length + '.</p>' + (c.mistakes.length ? '<h3>Над чим попрацювати</h3>' + c.mistakes.map(function (m) { return '<div class="mrow"><span>✗ <s>' + O.esc(m.wrong) + '</s> → <b>' + O.esc(m.right) + '</b><br><span class="dim small">' + O.esc(m.why) + '</span></span></div>'; }).join('') : '<p>Чисто!</p>') + '<button class="btn" id="tback">Ще діалог</button></div>';
    root.querySelector('#tback').onclick = function () { O.renderTutor(root); }; conv = null;
  }
  O.renderTutor = function (root) {
    root.innerHTML = '<h2>ШІ-репетитор</h2><p class="dim small">Рольові розмови про твою реальну роботу й побут. Репетитор відповідає норвезькою, виправляє твої помилки й пропонує нові слова. Помилки ШІ теж бувають: сумнівне перевір.</p><div class="menu"></div><div id="tstat" class="dim small"></div><h3>Типові помилки з минулих розмов</h3><div id="tmist"></div>';
    var menu = root.querySelector('.menu'); O.scenarios.forEach(function (sc) { var b = O.el('button', 'btn ghost', O.esc(sc.title)); b.onclick = function () { start(root, sc); }; menu.appendChild(b); });
    O.aiStatus().then(function (s) { root.querySelector('#tstat').textContent = s.ai ? 'ШІ підключено (' + s.model + ').' : 'Ключ Anthropic не задано: додай ANTHROPIC_API_KEY у ord/.env і перезапусти сервер.'; });
    var all = []; O.state.tutor.sessions.forEach(function (s) { (s.mistakes || []).forEach(function (m) { all.push(m); }); }); all = all.slice(-10).reverse();
    root.querySelector('#tmist').innerHTML = all.length ? all.map(function (m) { return '<div class="mrow"><span>✗ <s>' + O.esc(m.wrong) + '</s> → <b>' + O.esc(m.right) + '</b> <span class="dim small">' + O.esc(m.why) + '</span></span></div>'; }).join('') : '<p class="dim">Поки порожньо.</p>';
  };
})();
