/* Ядро Ord: простір імен, утиліти, стан (файл через сервер + дзеркало localStorage), реєстр слів і карток. */
(function () {
  var O = window.ORD = window.ORD || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  O.$ = $; O.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  O.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  O.el = function (t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  O.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  O.fold = function (s) { return String(s).toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a'); };
  O.norm = function (s) { return String(s).toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?,;:«»"]/g, ''); };
  O.lev = function (a, b) {
    var m = [], i, j; for (i = 0; i <= a.length; i++) m[i] = [i]; for (j = 1; j <= b.length; j++) m[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  };
  O.sim = function (a, b) { a = O.norm(a); b = O.norm(b); if (!a && !b) return 1; return 1 - O.lev(a, b) / Math.max(a.length, b.length, 1); };
  O.toast = function (msg, ms) { var t = O.el('div', 'toast', O.esc(msg)); document.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, ms || 1800); setTimeout(function () { t.remove(); }, (ms || 1800) + 400); };

  /* ---- Слова ---- */
  O.words = []; O.wordById = {};
  O.catName = function (c) { var b = O.base.CAT_UK[c] || O.workCats[c]; return b || c; };
  O.registerWords = function () {
    var user = Object.keys(O.state.userWords || {}).map(function (k) { return O.state.userWords[k]; });
    O.words = [].concat(O.base.WORDS, O.workWords, user); O.wordById = {};
    O.words.forEach(function (w) { O.wordById[w.id] = w; });
  };
  O.label = function (w) { return (w.art ? w.art + ' ' : '') + w.no; };
  O.PIC = function (w) { return O.base.PIC[w.id] || ''; };

  /* ---- Стан ---- */
  var LS = 'ord.state.v2', saveTimer = null, serverOk = false, saving = false;
  function fresh() {
    return { v: 2, rev: 0, created: Date.now(), cards: {}, log: [], userWords: {}, known: {}, cache: {}, tutor: { sessions: [] }, xp: 0,
      settings: { newPerDay: 12, sessionLen: 20, voice: '', rate: 0.95, autoSpeak: true, theme: 'dark', sfx: true, aiPref: 'auto', share: true } };
  }
  function merge(base, s) { Object.keys(s || {}).forEach(function (k) { if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && s[k] && typeof s[k] === 'object') merge(base[k], s[k]); else base[k] = s[k]; }); return base; }
  O.load = function () {
    var ls = null; try { ls = JSON.parse(localStorage.getItem(LS)); } catch (e) { /* ignore */ }
    return (window.ORD_WEB ? Promise.reject(new Error('web')) : fetch('/api/state')).then(function (r) { if (!r.ok) throw new Error('state ' + r.status); serverOk = true; return r.json(); }).catch(function () { return null; }).then(function (srv) {
      if (srv && srv.rev == null) srv = null;
      var pick = srv && (!ls || srv.rev >= ls.rev) ? srv : (ls || srv);
      O.state = merge(fresh(), pick || {});
      O.serverOk = serverOk; O.registerWords();
      return O.state;
    });
  };
  O.save = function () {
    O.state.rev++;
    try { localStorage.setItem(LS, JSON.stringify(O.state)); } catch (e) { /* квота */ }
    clearTimeout(saveTimer); saveTimer = setTimeout(O.flush, 700);
  };
  O.flush = function () {
    if (!serverOk || saving) return Promise.resolve();
    saving = true; var rev = O.state.rev;
    return fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(O.state) })
      .then(function (r) { saving = false; if (r.status === 409) { O.stale = true; var b = O.$('#banner'); if (b) { b.hidden = false; b.textContent = 'Дані змінено в іншій вкладці. Перезавантаж сторінку, щоб не втратити прогрес.'; } } else if (O.state.rev !== rev) O.save(); })
      .catch(function () { saving = false; });
  };
  window.addEventListener('pagehide', function () { if (serverOk && navigator.sendBeacon) { try { navigator.sendBeacon('/api/state', new Blob([JSON.stringify(O.state)], { type: 'application/json' })); } catch (e) { /* ignore */ } } });

  /* ---- Картки ---- */
  O.card = function (id) { return O.state.cards[id]; };
  O.ensureCard = function (id) { if (!O.state.cards[id]) O.state.cards[id] = O.srs.newCard(id, Date.now()); return O.state.cards[id]; };
  O.addWord = function (w) {
    if (!O.wordById[w.id]) { O.state.userWords[w.id] = w; O.registerWords(); }
    var had = !!O.state.cards[w.id]; O.ensureCard(w.id); O.save(); return !had;
  };
  O.grade = function (id, g, ms, kind) {
    var c = O.ensureCard(id), prev = c; var n = O.srs.review(c, g, Date.now());
    O.state.log.push({ t: Date.now(), id: id, g: g, ms: Math.min(ms || 0, 120000), st: prev.st === 'learn' && prev.lapses > 0 ? 'relearn' : prev.st, ivl: prev.ivl, k: kind || '' });
    O.state.cards[id] = n; O.state.xp += g === 1 ? 1 : 3; O.save(); return n;
  };
  O.todayNew = function () { var d = new Date(); d.setHours(0, 0, 0, 0); var t = d.getTime(), seen = {}; O.state.log.forEach(function (e) { if (e.t >= t && e.st === 'new') seen[e.id] = 1; }); return Object.keys(seen).length; };
})();
