/* Практика: диктант, шедоїнг (повтор за диктором), мінімальні пари, розмова з репетитором. Результати йдуть у профіль. */
(function () {
  var O = window.ORD;
  function log(kind, v) { var p = O.state.practice = O.state.practice || {}; (p[kind] = p[kind] || []).push({ t: Date.now(), v: v }); p[kind] = p[kind].slice(-300); O.state.xp += 2; O.save(); }
  function sentences() { var a = []; O.allStories().forEach(function (t) { t.s.forEach(function (p) { a.push({ no: p[0], uk: p[1], from: t.title }); }); }); return a; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function words(s) { return O.norm(s).split(' ').filter(Boolean); }
  /* Порівняння по словах через LCS: що збіглося, чого бракує */
  function diff(target, said) {
    var a = words(target), b = words(said), m = [], i, j;
    for (i = 0; i <= a.length; i++) { m[i] = []; for (j = 0; j <= b.length; j++) m[i][j] = 0; }
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = a[i - 1] === b[j - 1] ? m[i - 1][j - 1] + 1 : Math.max(m[i - 1][j], m[i][j - 1]);
    var ok = {}; i = a.length; j = b.length;
    while (i > 0 && j > 0) { if (a[i - 1] === b[j - 1]) { ok[i - 1] = 1; i--; j--; } else if (m[i - 1][j] >= m[i][j - 1]) i--; else j--; }
    return { html: a.map(function (w, k) { return '<span class="' + (ok[k] ? 'dok' : 'dbad') + '">' + O.esc(w) + '</span>'; }).join(' '), score: a.length ? m[a.length][b.length] / a.length : 0 };
  }
  var noVoice = '<div class="banner">Норвезький голос не знайдено. Додай його: Системні налаштування → Універсальний доступ → Мовлення → Системний голос → Керувати голосами → Norwegian.</div>';

  function dictation(box) {
    var s = pick(sentences());
    box.innerHTML = '<h3>Диктант</h3><p class="dim small">Послухай речення й напиши його. Пунктуація й регістр не враховуються.</p>' + (O.hasVoice() ? '' : noVoice) +
      '<div class="row"><button class="btn" id="pl">🔊 Слухати</button><button class="btn ghost" id="ps">🐢 Повільно</button></div><input id="da" autocomplete="off" placeholder="Напиши, що почув">' +
      '<div class="row"><button class="btn" id="dc">Перевірити</button><button class="btn ghost" id="dn">Інше речення</button></div><div id="dr"></div>';
    box.querySelector('#pl').onclick = function () { O.speak(s.no); };
    box.querySelector('#ps').onclick = function () { O.speak(s.no, { slow: true }); };
    box.querySelector('#dn').onclick = function () { dictation(box); };
    function check() {
      var v = box.querySelector('#da').value; if (!v.trim()) return; var d = diff(s.no, v);
      box.querySelector('#dr').innerHTML = '<div class="feedback ' + (d.score > 0.9 ? 'good' : 'bad') + '"><b>' + Math.round(d.score * 100) + '%</b> слів збіглося<div class="no">' + d.html + '</div><div class="dim small">' + O.esc(s.uk) + '</div><div class="dim small">З історії: ' + O.esc(s.from) + '</div></div>';
      O.sfx(d.score > 0.9 ? 'ok' : 'bad'); log('dict', Math.round(d.score * 100));
    }
    box.querySelector('#dc').onclick = check; box.querySelector('#da').onkeydown = function (e) { if (e.key === 'Enter') check(); };
    setTimeout(function () { O.speak(s.no); }, 250);
  }

  function shadow(box) {
    var s = pick(sentences().filter(function (x) { return x.no.length < 70; }));
    box.innerHTML = '<h3>Шедоїнг</h3><p class="dim small">Слухай і повторюй одразу за диктором. Потім запиши себе й порівняй на слух. Оцінка «Скажи» — це збіг розпізнаного тексту, не фонетика.</p>' + (O.hasVoice() ? '' : noVoice) +
      '<div class="stage"><div class="no big">' + O.esc(s.no) + '</div><div class="dim">' + O.esc(s.uk) + '</div></div>' +
      '<div class="row"><button class="btn" id="sl">🔊 Диктор</button><button class="btn ghost" id="ss">🐢 Повільно</button><button class="btn ghost" id="sr">⏺ Записати себе (5 с)</button><button class="btn ghost" id="sv">🎙 Скажи (оцінка)</button><button class="btn ghost" id="sn">Інше</button></div><div id="so"></div>';
    var out = box.querySelector('#so');
    box.querySelector('#sl').onclick = function () { O.speak(s.no); };
    box.querySelector('#ss').onclick = function () { O.speak(s.no, { slow: true }); };
    box.querySelector('#sn').onclick = function () { shadow(box); };
    box.querySelector('#sr').onclick = function () {
      out.innerHTML = '<div class="dim">Запис… говори.</div>';
      O.record(5000).then(function (url) { out.innerHTML = '<div class="row"><audio controls src="' + url + '"></audio><button class="btn ghost" id="sc">🔊 Диктор ще раз</button></div>'; out.querySelector('#sc').onclick = function () { O.speak(s.no); }; log('shadow', 0); })
        .catch(function () { out.innerHTML = '<div class="banner">Немає доступу до мікрофона. Дозволь його для localhost у налаштуваннях браузера.</div>'; });
    };
    box.querySelector('#sv').onclick = function () {
      if (!O.canListen()) { out.innerHTML = '<div class="banner">Розпізнавання мовлення доступне в Chrome і Safari.</div>'; return; }
      out.innerHTML = '<div class="dim">Слухаю…</div>';
      O.listen(function (alts) { var sc = O.pronScore(alts, s.no), d = diff(s.no, alts[0]); out.innerHTML = '<div class="feedback ' + (sc > 0.85 ? 'good' : 'bad') + '"><b>' + Math.round(sc * 100) + '%</b> схожість<div class="no">' + d.html + '</div><div class="dim small">Почуто: ' + O.esc(alts[0]) + '</div></div>'; O.sfx(sc > 0.85 ? 'ok' : 'bad'); log('shadow', Math.round(sc * 100)); },
        function (er) { out.innerHTML = '<div class="banner">Не вдалося розпізнати (' + O.esc(er) + '). Потрібні мікрофон та інтернет.</div>'; });
    };
  }

  function pairs(box) {
    var left = 10, good = 0;
    function round() {
      if (!left) { box.innerHTML = '<h3>Мінімальні пари</h3><div class="stage center"><div class="big">' + good + ' / 10</div><p class="dim">Повтори, поки не буде стабільно 9-10.</p><button class="btn" id="pa">Ще раз</button></div>'; box.querySelector('#pa').onclick = function () { pairs(box); }; O.sfx('done'); return; }
      var p = pick(O.pairs), side = Math.random() < 0.5 ? 'a' : 'b', say = p[side], opts = O.shuffle([p.a, p.b]);
      box.innerHTML = '<h3>Мінімальні пари <small class="dim">залишилось ' + left + '</small></h3><p class="dim small">Яке слово ти чуєш? Якість залежить від голосу macOS; акцентні пари (bønder / bønner) голос може не розрізняти.</p>' + (O.hasVoice() ? '' : noVoice) +
        '<div class="row"><button class="btn" id="p1">🔊 Слухати</button></div><div class="opts" id="po"></div><div id="pf"></div>';
      var o = box.querySelector('#po'), done = false;
      opts.forEach(function (w) { var uk = w === p.a ? p.aUk : p.bUk, b = O.el('button', 'opt', O.esc(w) + ' <small class="dim">' + O.esc(uk) + '</small>'); b.onclick = function () {
        if (done) return; done = true; var ok = w === say; if (ok) good++; left--; log('pairs', ok ? 1 : 0); O.sfx(ok ? 'ok' : 'bad'); b.classList.add(ok ? 'right' : 'wrong');
        box.querySelector('#pf').innerHTML = '<div class="feedback ' + (ok ? 'good' : 'bad') + '">Було: <b>' + O.esc(say) + '</b> (' + O.esc(say === p.a ? p.aUk : p.bUk) + ')<div class="row"><button class="btn ghost" id="pa">🔊 ' + O.esc(p.a) + '</button><button class="btn ghost" id="pb">🔊 ' + O.esc(p.b) + '</button><button class="btn" id="pn">Далі</button></div></div>';
        box.querySelector('#pa').onclick = function () { O.speak(p.a); }; box.querySelector('#pb').onclick = function () { O.speak(p.b); }; box.querySelector('#pn').onclick = round; }; o.appendChild(b); });
      box.querySelector('#p1').onclick = function () { O.speak(say); }; setTimeout(function () { O.speak(say); }, 250);
    }
    round();
  }

  O.renderPractice = function (root) {
    var pr = O.state.practice || {}, n = ['dict', 'shadow', 'pairs'].map(function (k) { return (pr[k] || []).length; });
    root.innerHTML = '<h2>Практика</h2><div class="grid">' +
      '<button class="tile" data-m="dict">✍️<b>Диктант</b><span>слухаєш речення з історій і пишеш · ' + n[0] + '</span></button>' +
      '<button class="tile" data-m="shadow">🗣<b>Шедоїнг</b><span>повторюєш за диктором, запис і оцінка · ' + n[1] + '</span></button>' +
      '<button class="tile" data-m="pairs">👂<b>Мінімальні пари</b><span>tak / takk, ny / ni: різниця на слух · ' + n[2] + '</span></button>' +
      '<button class="tile" data-m="tutor">💬<b>Репетитор</b><span>співбесіда, NAV, оренда, лікар, колега</span></button></div><div id="pbox" class="panel" hidden></div>';
    var box = root.querySelector('#pbox'), f = { dict: dictation, shadow: shadow, pairs: pairs };
    O.$$('[data-m]', root).forEach(function (b) { b.onclick = function () { var m = b.getAttribute('data-m'); if (m === 'tutor') return O.go('tutor'); box.hidden = false; f[m](box); box.scrollIntoView({ behavior: 'smooth' }); }; });
  };
  O.practiceDiff = diff;
})();
