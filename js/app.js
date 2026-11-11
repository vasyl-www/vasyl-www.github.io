/* Навігація, головна, запуск. */
(function () {
  var O = window.ORD, view = 'home', main;
  var TABS = [['translate', '🌐', 'Переклад'], ['home', '🏠', 'Сьогодні'], ['read', '📖', 'Читати'], ['learn', '🧠', 'Вчити'], ['practice', '🎧', 'Практика'], ['profile', '👤', 'Я']],
    LEGACY = [['forum', '💬', 'Форум'], ['community', '🌍', 'Спільнота'], ['pins', '📌', 'Піни']],
    PARENT = { tutor: 'practice', err: 'practice', games: 'practice', poems: 'read', sem: 'learn', activate: 'learn', words: 'profile', stats: 'profile', settings: 'profile' };
  /* Хаб: кілька модулів під одним табом, перемикання чіпами */
  function hub(m, group, items, cur) {
    m.innerHTML = '<div class="chips hubbar">' + items.map(function (x) { return '<button class="chip" data-hb="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="hubbody"></div>';
    var body = m.querySelector('.hubbody');
    function show(id) { O.$$('[data-hb]', m).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-hb') === id); }); body.innerHTML = ''; var it = items.filter(function (x) { return x[0] === id; })[0]; it[2](body); }
    O.$$('[data-hb]', m).forEach(function (b) { b.onclick = function () { show(b.getAttribute('data-hb')); }; }); show(cur);
  }
  var HUBS = {
    read: function (m, cur) { hub(m, 'read', [['st', '📖 Історії', function (b) { O.renderReader(b); }], ['po', '📜 Вірші та вирази', function (b) { O.renderPoems(b); }]], cur || 'st'); },
    practice: function (m, cur) { hub(m, 'practice', [['ex', '🎧 Вправи', function (b) { O.renderPractice(b); }], ['err', '🪞 Помилки', function (b) { O.renderErrors(b); }], ['gm', '🎮 Ігри', function (b) { O.renderGames(b); }]], cur || 'ex'); }
  };
  O.go = function (v) {
    if (v === 'learn' && O.sessionActive && O.sessionActive() && view === 'learn') { return; }
    view = v; O.stopSpeak(); document.querySelectorAll('.popover').forEach(function (p) { p.remove(); });
    O.$$('#nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === (PARENT[v] || v)); }); main.scrollTop = 0; main.innerHTML = '';
    var r = { home: home, learn: function (m) { learn(m); }, sem: O.renderSemantic, read: function (m) { HUBS.read(m, 'st'); }, poems: function (m) { HUBS.read(m, 'po'); }, practice: function (m) { HUBS.practice(m, 'ex'); }, err: function (m) { HUBS.practice(m, 'err'); }, games: function (m) { HUBS.practice(m, 'gm'); }, activate: function (m) { m.innerHTML = '<h2>Активація</h2><div id="sess"></div>'; O.mind.startActivation(m.querySelector('#sess')); }, pins: O.renderPins, translate: O.renderTranslator, forum: O.renderForum, community: O.renderCommunity, profile: O.renderProfile, tutor: O.renderTutor, words: O.renderWords, stats: O.renderStats, settings: O.renderSettings }[v]; r(main);
  };
  function nav() { var n = O.$('#nav'); n.innerHTML = ''; TABS.concat(O.state.settings.legacyTabs ? LEGACY : []).forEach(function (t) { var b = O.el('button', '', '<span>' + t[1] + '</span><small>' + t[2] + '</small>'); b.setAttribute('data-v', t[0]); b.onclick = function () { O.go(t[0]); }; n.appendChild(b); }); O.navExtras && O.navExtras(n); }
  O.rebuildNav = function () { nav(); };
  function learn(m) {
    var c = O.srs.counts(O.state.cards, Date.now()), left = Math.max(0, O.state.settings.newPerDay - O.todayNew());
    var deck = O.state.settings.deck || 'all';
    m.innerHTML = '<h2>Вчити</h2><div class="panel"><div class="kpis"><div><b>' + c.due + '</b><span>до повторення</span></div><div><b>' + left + '</b><span>нових сьогодні</span></div><div><b>' + c.leech + '</b><span>піявок</span></div></div>' +
      '<label>Нові слова з колоди <select id="ld"><option value="all">Усі</option><option value="core">Основа (142 слова)</option><option value="work">Зварювання, робота, побут</option><option value="life">Життя</option></select></label>' +
      '<div class="row"><button class="btn big" id="lgo">▶ Почати сесію (' + O.state.settings.sessionLen + ' хв)</button><button class="btn ghost" id="lweak">Слабкі місця</button></div><div class="row"><button class="btn ghost" id="lact">✍ Активація (з пам’яті)</button><button class="btn ghost" id="lsem">🧩 Об’єкти: глибше</button></div></div><div id="sess"></div>';
    m.querySelector('#ld').value = deck; m.querySelector('#ld').onchange = function (e) { O.state.settings.deck = e.target.value; O.save(); };
    m.querySelector('#lgo').onclick = function () { m.querySelector('.panel').hidden = true; O.startSession(m.querySelector('#sess'), {}); };
    m.querySelector('#lact').onclick = function () { m.querySelector('.panel').hidden = true; O.mind.startActivation(m.querySelector('#sess')); }; m.querySelector('#lsem').onclick = function () { O.go('sem'); };
    m.querySelector('#lweak').onclick = function () { m.querySelector('.panel').hidden = true; O.startSession(m.querySelector('#sess'), { weak: true }); };
  }
  function home(m) {
    var now = Date.now(), c = O.srs.counts(O.state.cards, now), r = O.srs.retention(O.state.log, now, 30), tip = O.base.TIPS[new Date().getDate() % O.base.TIPS.length], h = new Date().getHours();
    var hi = h < 5 ? 'God natt' : h < 10 ? 'God morgen' : h < 17 ? 'God dag' : 'God kveld', nx = O.mind.next(), top = nx[0], rest = nx.slice(1, 4);
    m.innerHTML = '<h1 class="no">' + hi + ', Vasyl</h1>' +
      '<div class="panel"><div class="dim small">Найкраща наступна дія</div><button class="btn big" id="hgo">' + top.icon + ' ' + O.esc(top.title) + '</button><div class="dim small" style="margin-top:6px">Чому: ' + O.esc(top.why) + '.</div>' +
      (rest.length ? '<div class="hrest">' + rest.map(function (x) { return '<button class="mrow" data-g="' + x.go + '"><span>' + x.icon + ' <b>' + O.esc(x.title) + '</b><div class="dim small">' + O.esc(x.why) + '</div></span></button>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="panel" id="hmind"></div>' +
      '<div class="panel"><div class="kpis"><div><b>' + c.due + '</b><span>до повторення</span></div><div><b>' + c.total + '</b><span>карток</span></div><div><b>' + (r.rate == null ? '—' : Math.round(r.rate * 100) + '%') + '</b><span>утримання 30 д</span></div><div><b>' + O.srs.streak(O.state.log, now) + '</b><span>днів поспіль</span></div></div></div>' +
      '<div class="panel tip"><b>💡 ' + O.esc(tip.title) + '.</b> ' + O.esc(tip.text) + '</div><div id="banner" class="banner" hidden></div>';
    O.mind.panel(m.querySelector('#hmind')); if (O.phrases) { var hp = O.el('div'); m.querySelector('#hgo').parentNode.parentNode.insertBefore(hp, m.querySelector('#hgo').parentNode.nextSibling); O.phrases.card(hp); } if (O.synapse) { var hs = O.el('div'); m.querySelector('#hmind').parentNode.insertBefore(hs, m.querySelector('#hmind').nextSibling); O.synapse.panel(hs); }
    m.querySelector('#hgo').onclick = function () { O.go(top.go); }; O.$$('[data-g]', m).forEach(function (b) { b.onclick = function () { O.go(b.getAttribute('data-g')); }; });
    if (!O.serverOk) { var bn = m.querySelector('#banner'); bn.hidden = false; bn.textContent = 'Сервер збереження недоступний: дані лишаються лише в цьому браузері. Запусти node server.js.'; }
  }
  O.load().then(function () { main = O.$('#main'); nav(); O.go(({ '#home': 'home', '#activate': 'activate', '#read': 'read', '#pins': 'pins', '#games': 'games', '#sem': 'sem', '#poems': 'poems', '#err': 'err', '#forum': 'forum', '#community': 'community', '#learn': 'learn', '#practice': 'practice', '#profile': 'profile' })[location.hash] || 'translate'); O.mountLockBar && O.mountLockBar(); O.applyTheme && O.applyTheme(); O.applyLang && O.applyLang(); });
})();
