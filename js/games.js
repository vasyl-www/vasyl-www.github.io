/* Міні-ігри на слова: швидка пара (комбо й таймер), падаючі слова, Ordle дня, меморі. Помилки збираються, їх можна додати в словник. */
(function () {
  var O = window.ORD;
  function G() { var s = O.state; s.games = s.games || { best: {}, miss: {}, ordle: null }; s.games.best = s.games.best || {}; s.games.miss = s.games.miss || {}; return s.games; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pool() {
    return (O.words || []).filter(function (w) { return w.no && w.uk && w.no.length < 18 && w.uk.length < 30; });
  }
  /* «Мішок слів»: слова зі словника (картки), з прочитаних текстів і ті, де були помилки, мають більшу вагу.
     Слово не повторюється, поки не пройдено весь мішок; однакові переклади не трапляються поруч. */
  function bag() {
    var all = pool(), st = O.state, sw = st.seenW || {}, ms = G().miss, now = Date.now();
    var fam = [], oth = [];
    all.forEach(function (w) { (st.cards[w.id] || sw[w.id] || ms[w.id] ? fam : oth).push(w); });
    var src = fam.length >= 14 ? fam : fam.concat(shuffle(oth).slice(0, 14 - fam.length + 10));
    function wt(w) { var x = 1; if (st.cards[w.id]) x += 2; if (sw[w.id]) x += 1.5 * Math.exp(-(now - sw[w.id]) / (14 * 864e5)); if (ms[w.id]) x += Math.min(3, ms[w.id]); return x; }
    var q = [], last = [];
    function refill() {
      var seenUk = {}, a = src.map(function (w) { return { w: w, k: -Math.log(Math.random() || 1e-9) / wt(w) }; }).sort(function (x, y) { return x.k - y.k; }).map(function (x) { return x.w; });
      var tail = last.slice(-8); q = a.filter(function (w) { return tail.indexOf(w.id) < 0; }).concat(a.filter(function (w) { return tail.indexOf(w.id) >= 0; }));
    }
    return {
      next: function () { if (!q.length) refill(); var w = q.shift(); last.push(w.id); if (last.length > 30) last.shift(); return w; },
      take: function (n) { var out = [], uk = {}, tries = 0; while (out.length < n && tries++ < 400) { var w = this.next(); if (uk[w.uk]) continue; uk[w.uk] = 1; out.push(w); } return out; }
    };
  }
  function label(w) { return (w.art ? w.art + ' ' : '') + w.no; }
  function miss(w) { G().miss[w.id] = (G().miss[w.id] || 0) + 1; }
  function reward(root, name, score, unit, extraXp) {
    var g = G(), best = g.best[name] || 0, rec = name === 'mem' ? (!best || score < best) : score > best;
    if (rec) { g.best[name] = score; }
    O.state.xp += Math.max(1, Math.min(30, extraXp)); O.save(); O.sfx(rec ? 'done' : 'ok'); return rec;
  }
  function missBox(box) {
    if (!box) return;
    var ids = Object.keys(G().miss).filter(function (id) { return O.wordById[id] && !O.card(id); }).slice(0, 12);
    if (!ids.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="panel"><b>Слова, на яких помилився</b><div class="small">' + ids.map(function (id) { return O.esc(label(O.wordById[id]) + ' — ' + O.wordById[id].uk); }).join('<br>') + '</div><div class="row"><button class="btn" id="gadd">+ Додати в словник (' + ids.length + ')</button></div></div>';
    box.querySelector('#gadd').onclick = function () { var n = 0; ids.forEach(function (id) { if (O.addWord(O.wordById[id])) n++; delete G().miss[id]; }); O.save(); O.toast('Додано слів: ' + n); missBox(box); };
  }
  function shell(root, title, name, startFn, hint) {
    var best = G().best[name];
    root.innerHTML = '<div class="gtop"><button class="btn ghost" id="gback">← Ігри</button><span class="dim small">Рекорд: ' + (best == null ? '—' : best) + '</span></div><h2>' + title + '</h2><div id="gbody"></div><div id="gmiss"></div>';
    root.querySelector('#gback').onclick = function () { O.renderGames(root); };
    var body = root.querySelector('#gbody'); startFn(body, root); missBox(root.querySelector('#gmiss'));
  }
  function end(root, body, name, title, score, unit, again, xp) {
    var rec = reward(root, name, score, unit, xp);
    body.innerHTML = '<div class="panel center"><div class="gscore">' + score + ' ' + unit + '</div><p>' + (rec ? '🏆 Новий рекорд!' : 'Рекорд: ' + G().best[name]) + ' · +' + Math.max(1, Math.min(30, xp)) + ' XP</p><div class="row" style="justify-content:center"><button class="btn big" id="gagain">▶ Ще раз</button></div></div>';
    body.querySelector('#gagain').onclick = again; missBox(root.querySelector('#gmiss'));
  }

  /* 1. Швидка пара: 60 секунд, комбо множить очки, помилка забирає 3 секунди */
  function speed(body, root) {
    function run() {
      var P = pool(), B = bag(), score = 0, combo = 0, t = 60, left = true, cur = null;
      body.innerHTML = '<div class="gtop"><div class="gscore" id="sc">0</div><div class="combo" id="cb"></div><div id="tm" class="gscore">60</div></div><div class="bar" style="margin:8px 0"><i id="tb" style="width:100%"></i></div><div class="panel center"><div class="big no" id="q"></div></div><div class="opts" id="op"></div>';
      var q = body.querySelector('#q'), op = body.querySelector('#op');
      function next() {
        var w = B.next(), ds = shuffle(P.filter(function (x) { return x.uk !== w.uk; })).slice(0, 3), all = shuffle(ds.concat([w])); cur = w;
        q.textContent = label(w); op.innerHTML = '';
        all.forEach(function (x) { var b = O.el('button', 'opt', O.esc(x.uk)); b.onclick = function () { pick(b, x); }; op.appendChild(b); });
      }
      function pick(b, x) {
        if (!left) return; if (x === cur) { combo++; score += 10 * Math.min(5, 1 + Math.floor(combo / 3)); O.sfx('ok'); } else { combo = 0; t = Math.max(0, t - 3); miss(cur); O.sfx('bad'); }
        body.querySelector('#sc').textContent = score; body.querySelector('#cb').textContent = combo >= 3 ? 'x' + Math.min(5, 1 + Math.floor(combo / 3)) + ' 🔥' : ''; next();
      }
      next(); var last = Date.now();
      var iv = setInterval(function () {
        if (!body.isConnected) return clearInterval(iv);
        var n = Date.now(); t -= (n - last) / 1000; last = n; var tl = Math.max(0, Math.ceil(t));
        body.querySelector('#tm').textContent = tl; body.querySelector('#tb').style.width = Math.max(0, t / 60 * 100) + '%';
        if (t <= 0) { left = false; clearInterval(iv); end(root, body, 'speed', 'Швидка пара', score, 'очок', run, score / 20); }
      }, 100);
    }
    run();
  }

  /* 2. Падаючі слова: знайди український переклад названого слова, поки він не впав */
  function fall(body, root) {
    function run() {
      var P = pool(), B = bag(), score = 0, lives = 3, speedv = 38, items = [], target = null, over = false, spawnAt = 0, started = Date.now();
      body.innerHTML = '<div class="gtop"><div class="gscore" id="sc">0</div><div id="lv" class="gscore">❤❤❤</div></div><div class="panel center" style="margin:8px 0"><span class="dim small">Торкнись перекладу слова:</span> <b class="big no" id="tg"></b></div><div class="gfall" id="fl"><div class="gl"></div></div>';
      var fl = body.querySelector('#fl');
      function newTarget() { var cand = items.filter(function (i) { return !i.dead; }); target = cand.length ? cand[rnd(cand.length)].w : null; if (!target) { spawn(); newTarget(); return; } body.querySelector('#tg').textContent = label(target); }
      function spawn() {
        var w = B.next(), el = O.el('div', 'fw2', O.esc(w.uk)), it = { w: w, el: el, y: -30, x: 12 + Math.random() * 76, dead: false };
        el.style.left = it.x + '%'; fl.appendChild(el); el.onclick = function () { hit(it); }; items.push(it);
      }
      function lose(w) { lives--; if (w) miss(w); body.querySelector('#lv').textContent = lives > 0 ? new Array(lives + 1).join('❤') : '💔'; O.sfx('bad'); if (lives <= 0) { over = true; end(root, body, 'fall', 'Падаючі слова', score, 'очок', run, score / 15); } }
      function hit(it) {
        if (over || it.dead) return; if (it.w === target) { it.dead = true; it.el.remove(); score += 10; O.sfx('ok'); speedv += 1.2; body.querySelector('#sc').textContent = score; newTarget(); }
        else { lose(it.w === target ? null : target); it.el.classList.add('bad'); }
      }
      spawn(); spawn(); newTarget(); var last = performance.now();
      function frame(now) {
        if (over || !body.isConnected) return; var dt = Math.min(0.05, (now - last) / 1000); last = now; var H = fl.clientHeight;
        spawnAt += dt; if (spawnAt > Math.max(1.1, 2.6 - score / 120) && items.filter(function (i) { return !i.dead; }).length < 5) { spawnAt = 0; spawn(); }
        items.forEach(function (it) {
          if (it.dead) return; it.y += speedv * dt; it.el.style.top = it.y + 'px';
          if (it.y > H - 26) { it.dead = true; it.el.remove(); if (it.w === target) { lose(it.w); if (!over) newTarget(); } }
        });
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    run();
  }

  /* 3. Ordle дня: угадай слово за 6 спроб (довжина 4–6 букв), підказка: переклад */
  var ROWS = [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'å'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ø', 'æ'], ['⏎', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '⌫']];
  function dayNum() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
  function ordleWord(d) {
    var c = (O.words || []).filter(function (w) { return /^[a-zæøå]{4,6}$/i.test(w.no); }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    return c[(d * 7919) % c.length];
  }
  function score5(guess, ans) {
    var r = [], used = {}, i; for (i = 0; i < ans.length; i++) r[i] = 'x';
    for (i = 0; i < ans.length; i++) if (guess[i] === ans[i]) { r[i] = 'g'; used[i] = 1; }
    for (i = 0; i < ans.length; i++) if (r[i] !== 'g') for (var j = 0; j < ans.length; j++) if (!used[j] && guess[i] === ans[j]) { r[i] = 'y'; used[j] = 1; break; }
    return r;
  }
  function ordle(body, root) {
    var d = dayNum(), w = ordleWord(d), ans = w.no.toLowerCase(), g = G(); if (!g.ordle || g.ordle.day !== d) g.ordle = { day: d, rows: [], done: false };
    var st = g.ordle, cur = '';
    function draw() {
      var h = '<p class="dim small center">Слово дня: ' + ans.length + ' літер. Підказка: «' + O.esc(w.uk) + '». 6 спроб, нове слово щодня.</p><div class="ordle">';
      for (var r = 0; r < 6; r++) {
        var guess = st.rows[r] || (r === st.rows.length && !st.done ? cur : ''), sc = st.rows[r] ? score5(st.rows[r], ans) : null; h += '<div class="r">';
        for (var i = 0; i < ans.length; i++) h += '<div class="c ' + (sc ? sc[i] : '') + '">' + O.esc(guess[i] || '') + '</div>'; h += '</div>';
      }
      h += '</div>';
      if (st.done) h += '<div class="panel center"><b>' + (st.rows[st.rows.length - 1] === ans ? '🎉 Вгадано за ' + st.rows.length + '!' : 'Слово: ' + O.esc(label(w))) + '</b><div>' + O.esc(label(w)) + ' — ' + O.esc(w.uk) + '</div><div class="row" style="justify-content:center"><button class="btn ghost" id="osay">🔊</button>' + (O.card(w.id) ? '' : '<button class="btn" id="oadd">+ У словник</button>') + '</div></div>';
      else {
        var best = {}; st.rows.forEach(function (rw) { var s = score5(rw, ans); for (var i = 0; i < rw.length; i++) { var c = rw[i], v = s[i]; if (!best[c] || (best[c] === 'x') || (best[c] === 'y' && v === 'g')) best[c] = v; } });
        h += '<div class="kb">' + ROWS.map(function (row) { return '<div class="kr">' + row.map(function (k) { return '<button data-k="' + k + '" class="' + (best[k] || '') + '">' + k + '</button>'; }).join('') + '</div>'; }).join('') + '</div>';
      }
      body.innerHTML = h;
      O.$$('[data-k]', body).forEach(function (b) { b.onclick = function () { key(b.getAttribute('data-k')); }; });
      var s = body.querySelector('#osay'); if (s) s.onclick = function () { O.speak(w.no); }; var a = body.querySelector('#oadd'); if (a) a.onclick = function () { O.addWord(w); O.save(); a.remove(); O.toast('Додано'); };
    }
    function key(k) {
      if (st.done) return;
      if (k === '⌫') cur = cur.slice(0, -1); else if (k === '⏎') {
        if (cur.length !== ans.length) { O.toast('Потрібно ' + ans.length + ' літер'); return; }
        st.rows.push(cur); var win = cur === ans; cur = '';
        if (win || st.rows.length >= 6) { st.done = true; if (win) { O.state.xp += 20; O.sfx('done'); } else { miss(w); O.sfx('bad'); } }
        else O.sfx('ok'); O.save();
      } else if (cur.length < ans.length) cur += k;
      draw();
    }
    root._ok = function (e) { if (!body.isConnected) return document.removeEventListener('keydown', root._ok); if (e.ctrlKey || e.metaKey || e.altKey) return; var k = e.key === 'Enter' ? '⏎' : e.key === 'Backspace' ? '⌫' : e.key.length === 1 ? e.key.toLowerCase() : ''; if (k && /^(⏎|⌫|[a-zæøå])$/.test(k)) key(k); };
    document.addEventListener('keydown', root._ok); draw();
  }

  /* 4. Меморі: 8 пар норвезьке слово ↔ переклад */
  function mem(body, root) {
    function run() {
      var P = bag().take(8), cells = [];
      P.forEach(function (w) { cells.push({ w: w, t: label(w), side: 'no' }); cells.push({ w: w, t: w.uk, side: 'uk' }); }); cells = shuffle(cells);
      var moves = 0, open = [], found = 0, lock = false;
      body.innerHTML = '<div class="gtop"><div class="gscore" id="mv">0 ходів</div><span class="dim small">Знайди пари: слово ↔ переклад</span></div><div class="mem" id="mg"></div>';
      var g = body.querySelector('#mg');
      cells.forEach(function (c) {
        var b = O.el('button', 'gcell', '?'); c.el = b; b.onclick = function () {
          if (lock || b.classList.contains('done') || open.indexOf(c) >= 0) return; b.textContent = c.t; b.classList.add('sel'); open.push(c);
          if (open.length === 2) {
            moves++; body.querySelector('#mv').textContent = moves + ' ходів'; var a = open[0], z = open[1]; lock = true;
            if (a.w === z.w && a.side !== z.side) { setTimeout(function () { a.el.className = 'gcell done ok'; z.el.className = 'gcell done ok'; open = []; lock = false; found++; O.sfx('ok'); if (found === 8) end(root, body, 'mem', 'Меморі', moves, 'ходів', run, 20 - moves); }, 350); }
            else { miss(a.w); miss(z.w); setTimeout(function () { a.el.className = 'gcell'; z.el.className = 'gcell'; a.el.textContent = '?'; z.el.textContent = '?'; open = []; lock = false; }, 800); }
          }
        }; g.appendChild(b);
      });
    }
    run();
  }

  var GAMES = [['speed', '⚡', 'Швидка пара', '60 секунд, комбо множить очки', speed, 'speed'], ['fall', '☄️', 'Падаючі слова', 'Лови переклад, поки не впав', fall, 'fall'], ['ordle', '🔤', 'Ordle дня', 'Одне слово на день, 6 спроб', ordle, 'ordle'], ['mem', '🃏', 'Меморі', '8 пар слово ↔ переклад', mem, 'mem']];
  O.renderGames = function (root) {
    var g = G(); root.innerHTML = '<h2>Ігри</h2><p class="dim small">Слова беруться з твоїх карток (або з основного списку, якщо їх мало). Помилки збираються, їх можна додати у словник. Очки дають XP.</p><div class="gm"></div><div id="gmiss"></div>';
    var box = root.querySelector('.gm');
    GAMES.forEach(function (x) {
      var b = O.el('button', 'tile', x[1] + '<b>' + x[2] + '</b><span>' + x[3] + '</span><span>' + (x[0] === 'ordle' ? (g.ordle && g.ordle.day === dayNum() && g.ordle.done ? 'сьогодні зіграно ✓' : 'чекає на тебе') : (g.best[x[0]] != null ? 'рекорд: ' + g.best[x[0]] : 'ще не грав')) + '</span>');
      b.onclick = function () { shell(root, x[1] + ' ' + x[2], x[5], x[4]); }; box.appendChild(b);
    });
    missBox(root.querySelector('#gmiss'));
  };
})();
