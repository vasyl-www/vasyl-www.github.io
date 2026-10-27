/* Акаунт: нік + пароль (Firebase), хмарне збереження прогресу (без ключів ШІ). Показується в Профілі. */
(function () {
  var O = window.ORD, LIMIT = 900000;
  /* Що йде в хмару: прогрес навчання. Ніколи не входять ключі (їх нема в стані), форум з картинками й кеш запитів. */
  O.packState = function () {
    var s = JSON.parse(JSON.stringify(O.state)); delete s.forum; delete s.cache; delete s.settings.apiKey;
    s.log = (s.log || []).slice(-1500); s.tr = (s.tr || []).slice(0, 100); s.myStories = (s.myStories || []).slice(0, 30);
    var j = JSON.stringify(s); if (j.length > LIMIT) { s.tr = []; s.log = s.log.slice(-500); j = JSON.stringify(s); }
    return j;
  };
  O.unpackState = function (str) {
    var r = JSON.parse(str); if (!r || typeof r !== 'object' || !r.cards || typeof r.cards !== 'object') throw new Error('Невірний формат даних');
    var keep = { forum: O.state.forum, cache: O.state.cache };
    if (r.settings) delete r.settings.apiKey;
    O.state = Object.assign(O.state, r, keep); O.state.rev = (O.state.rev || 0) + 1; O.registerWords(); O.save();
  };
  O.renderAccount = function (box) {
    var c = O.cloud(); box.innerHTML = '<h3>Акаунт</h3>';
    if (!c) { box.innerHTML += '<div class="panel dim small">Акаунти й хмарна синхронізація не налаштовані в цій збірці (порожній js/firebase-config.js). Прогрес зберігається в цьому браузері; є ручне копіювання в Налаштуваннях.</div>'; return; }
    var u = c.user();
    if (!u) {
      box.innerHTML += '<div class="panel"><p class="dim small">Створи акаунт, щоб бачити контент спільноти, публікувати свій і зберігати прогрес у хмарі. Пошта не потрібна. Ключі ШІ нікуди не передаються.</p>' +
        '<input id="anick" placeholder="нік (латиниця, цифри, _)" autocomplete="username" autocapitalize="none" maxlength="20"><input id="apass" type="password" placeholder="пароль (від 8 символів)" autocomplete="current-password">' +
        '<div class="row"><button class="btn" id="ain">Увійти</button><button class="btn ghost" id="aup">Створити акаунт</button></div><div class="dim small" id="amsg"></div>' +
        '<p class="dim small">Відновити пароль неможливо, бо пошти немає: збережи його в менеджері паролів.</p></div>';
      var go = function (up) {
        var am = box.querySelector('#amsg'); am.textContent = '…';
        c[up ? 'signUp' : 'signIn'](box.querySelector('#anick').value, box.querySelector('#apass').value).then(function () { O.toast(up ? 'Акаунт створено' : 'Вітаю!'); }).catch(function (e) {
          var code = e && e.code || '', t = { 'auth/email-already-in-use': 'Такий нік зайнятий', 'auth/invalid-credential': 'Невірний нік або пароль', 'auth/wrong-password': 'Невірний нік або пароль', 'auth/user-not-found': 'Невірний нік або пароль', 'auth/weak-password': 'Пароль надто простий (від 8 символів)', 'auth/operation-not-allowed': 'У Firebase не ввімкнено вхід Email/Password', 'auth/too-many-requests': 'Забагато спроб, зачекай трохи' };
          am.textContent = t[code] || (e && e.message) || code;
        });
      };
      box.querySelector('#ain').onclick = function () { go(false); }; box.querySelector('#aup').onclick = function () { go(true); }; return;
    }
    box.innerHTML += '<div class="panel"><div class="row"><div><b>' + O.esc(u.name || 'Користувач') + '</b>' + (c.isAdmin() ? ' <span class="dim small">· адмін</span>' : '') + '</div></div>' +
      '<div class="row"><button class="btn ghost" id="cup">⬆ Зберегти прогрес у хмару</button><button class="btn ghost" id="cdn">⬇ Завантажити з хмари</button><button class="btn ghost" id="gout">Вийти</button></div><div class="dim small" id="cmsg"></div>' +
      '<p class="dim small">У хмару йдуть картки, слова, історія повторень, прочитані історії й налаштування (без ключів ШІ, форуму й кешу). «Завантажити» замінює локальний прогрес даними з хмари.</p></div>' +
      (c.isAdmin() ? '<div class="panel"><b>Адмін</b><div class="row"><button class="btn ghost" id="adu">Користувачі</button><button class="btn ghost" id="adr">Скарги</button></div><div id="adout" class="small"></div><p class="dim small">Бачиш ніки й дати входу та скарги; можна видаляти чужий контент у Спільноті. Ключі ШІ користувачів недоступні нікому: вони лишаються в їхніх браузерах.</p></div>' : '');
    if (c.isAdmin()) {
      var ao = box.querySelector('#adout');
      box.querySelector('#adu').onclick = function () { c.adminUsers().then(function (l) { ao.innerHTML = '<b>' + l.length + ' акаунтів</b><br>' + l.map(function (x) { return O.esc(x.name) + ' · остання активність ' + (x.last ? new Date(x.last).toLocaleDateString('uk-UA') : '—'); }).join('<br>'); }).catch(function (e) { ao.textContent = 'Не вдалося: ' + (e && (e.code || e.message)); }); };
      box.querySelector('#adr').onclick = function () { c.adminReports().then(function (l) { ao.innerHTML = '<b>Скарг: ' + l.length + '</b><br>' + l.map(function (x) { return 'матеріал ' + O.esc(x.contentId); }).join('<br>'); }).catch(function (e) { ao.textContent = 'Не вдалося: ' + (e && (e.code || e.message)); }); };
    }
    var m = box.querySelector('#cmsg');
    box.querySelector('#gout').onclick = function () { c.signOut().then(function () { O.go('profile'); }); };
    box.querySelector('#cup').onclick = function () { var j = O.packState(); m.textContent = 'Зберігаю…'; c.pushState(j).then(function () { m.textContent = '✓ Збережено (' + Math.round(j.length / 1024) + ' КБ)'; }).catch(function (e) { m.textContent = 'Не вдалося: ' + (e && (e.code || e.message)); }); };
    box.querySelector('#cdn').onclick = function () {
      var b = this; if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', 1); b.textContent = 'Замінити локальний прогрес?'; return; }
      m.textContent = 'Завантажую…'; c.pullState().then(function (r) { if (!r) { m.textContent = 'У хмарі ще немає збереженого прогресу.'; return; } O.unpackState(r.data); m.textContent = '✓ Завантажено від ' + new Date(r.updated).toLocaleString('uk-UA'); O.toast('Прогрес завантажено'); }).catch(function (e) { m.textContent = 'Не вдалося: ' + (e && (e.code || e.message)); });
    };
  };
  if (window.ORD_CLOUD) window.ORD_CLOUD.onAuth(function () { var b = document.getElementById('pacc'); if (b) O.renderAccount(b); });
})();
