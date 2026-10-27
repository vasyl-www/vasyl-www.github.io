/* Навігація, головна, запуск. */
(function () {
  var O = window.ORD, view = 'home', main;
  var TABS = [['translate', '🌐', 'Переклад'], ['read', '📖', 'Читати'], ['forum', '💬', 'Форум'], ['community', '🌍', 'Спільнота'], ['learn', '🧠', 'Вчити'], ['practice', '🎧', 'Практика'], ['games', '🎮', 'Ігри'], ['pins', '📌', 'Піни'], ['profile', '👤', 'Профіль']], PARENT = { tutor: 'practice', words: 'profile', stats: 'profile', settings: 'profile', home: 'read' };
  O.go = function (v) {
    if (v === 'learn' && O.sessionActive && O.sessionActive() && view === 'learn') { return; }
    view = v; O.stopSpeak(); document.querySelectorAll('.popover').forEach(function (p) { p.remove(); });
    O.$$('#nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === (PARENT[v] || v)); }); main.scrollTop = 0; main.innerHTML = '';
    var r = { home: home, learn: function (m) { learn(m); }, read: O.renderReader, practice: O.renderPractice, games: O.renderGames, pins: O.renderPins, translate: O.renderTranslator, forum: O.renderForum, community: O.renderCommunity, profile: O.renderProfile, tutor: O.renderTutor, words: O.renderWords, stats: O.renderStats, settings: O.renderSettings }[v]; r(main);
  };
  function nav() { var n = O.$('#nav'); TABS.forEach(function (t) { var b = O.el('button', '', '<span>' + t[1] + '</span><small>' + t[2] + '</small>'); b.setAttribute('data-v', t[0]); b.onclick = function () { O.go(t[0]); }; n.appendChild(b); }); O.navExtras && O.navExtras(n); }
  function learn(m) {
    var c = O.srs.counts(O.state.cards, Date.now()), left = Math.max(0, O.state.settings.newPerDay - O.todayNew());
    var deck = O.state.settings.deck || 'all';
    m.innerHTML = '<h2>Вчити</h2><div class="panel"><div class="kpis"><div><b>' + c.due + '</b><span>до повторення</span></div><div><b>' + left + '</b><span>нових сьогодні</span></div><div><b>' + c.leech + '</b><span>піявок</span></div></div>' +
      '<label>Нові слова з колоди <select id="ld"><option value="all">Усі</option><option value="core">Основа (142 слова)</option><option value="work">Зварювання, робота, побут</option><option value="life">Життя</option></select></label>' +
      '<div class="row"><button class="btn big" id="lgo">▶ Почати сесію (' + O.state.settings.sessionLen + ' хв)</button><button class="btn ghost" id="lweak">Слабкі місця</button></div></div><div id="sess"></div>';
    m.querySelector('#ld').value = deck; m.querySelector('#ld').onchange = function (e) { O.state.settings.deck = e.target.value; O.save(); };
    m.querySelector('#lgo').onclick = function () { m.querySelector('.panel').hidden = true; O.startSession(m.querySelector('#sess'), {}); };
    m.querySelector('#lweak').onclick = function () { m.querySelector('.panel').hidden = true; O.startSession(m.querySelector('#sess'), { weak: true }); };
  }
  function home(m) {
    var now = Date.now(), c = O.srs.counts(O.state.cards, now), r = O.srs.retention(O.state.log, now, 30), tip = O.base.TIPS[new Date().getDate() % O.base.TIPS.length], h = new Date().getHours();
    var hi = h < 5 ? 'God natt' : h < 10 ? 'God morgen' : h < 17 ? 'God dag' : 'God kveld';
    m.innerHTML = '<h1 class="no">' + hi + ', Vasyl</h1><div class="panel"><div class="kpis"><div><b>' + c.due + '</b><span>до повторення</span></div><div><b>' + c.total + '</b><span>карток</span></div><div><b>' + (r.rate == null ? '—' : Math.round(r.rate * 100) + '%') + '</b><span>утримання 30 д</span></div><div><b>' + O.srs.streak(O.state.log, now) + '</b><span>днів поспіль</span></div></div><button class="btn big" id="hgo">▶ Вчити</button></div>' +
      '<div class="grid"><button class="tile" data-g="read">📖<b>Читалка</b><span>тексти про роботу й побут, слова в словник</span></button><button class="tile" data-g="tutor">💬<b>Репетитор</b><span>співбесіда, NAV, оренда, колеги</span></button><button class="tile" data-g="stats">📊<b>Статистика</b><span>утримання, прогноз, піявки</span></button><button class="tile" data-g="words">🗂<b>Слова</b><span>' + O.words.length + ' слів, пошук і фільтри</span></button></div>' +
      '<div class="panel tip"><b>💡 ' + O.esc(tip.title) + '.</b> ' + O.esc(tip.text) + '</div><div id="banner" class="banner" hidden></div>';
    m.querySelector('#hgo').onclick = function () { O.go('learn'); }; O.$$('[data-g]', m).forEach(function (b) { b.onclick = function () { O.go(b.getAttribute('data-g')); }; });
    if (!O.serverOk) { var bn = m.querySelector('#banner'); bn.hidden = false; bn.textContent = 'Сервер збереження недоступний: дані лишаються лише в цьому браузері. Запусти node server.js.'; }
  }
  O.load().then(function () { main = O.$('#main'); nav(); O.go(({ '#read': 'read', '#pins': 'pins', '#games': 'games', '#forum': 'forum', '#community': 'community', '#learn': 'learn', '#practice': 'practice', '#profile': 'profile' })[location.hash] || 'translate'); O.mountLockBar && O.mountLockBar(); O.applyTheme && O.applyTheme(); O.applyLang && O.applyLang(); });
})();
