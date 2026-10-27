/* Акаунт: вхід через Google, хмарне збереження прогресу (без ключів ШІ). Показується в Профілі. */
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
    if (!c) { box.innerHTML += '<div class="panel dim small">Вхід через Google і хмарна синхронізація не налаштовані в цій збірці (порожній js/firebase-config.js). Прогрес зберігається в цьому браузері; є ручне копіювання в Налаштуваннях.</div>'; return; }
    var u = c.user();
    if (!u) { box.innerHTML += '<div class="panel"><p class="dim small">Увійди, щоб бачити контент спільноти, публікувати свій і зберігати прогрес у хмарі. Ключі ШІ при цьому нікуди не передаються.</p><button class="btn" id="gin">Увійти через Google</button></div>'; box.querySelector('#gin').onclick = function () { c.signIn().catch(function (e) { O.toast('Вхід не вдався: ' + (e && e.message || e), 3500); }); }; return; }
    box.innerHTML += '<div class="panel"><div class="row">' + (u.photo ? '<img class="ava" referrerpolicy="no-referrer" src="' + O.esc(u.photo) + '" alt="">' : '') + '<div><b>' + O.esc(u.name || 'Користувач') + '</b><div class="dim small">' + O.esc(u.email) + '</div></div></div>' +
      '<div class="row"><button class="btn ghost" id="cup">⬆ Зберегти прогрес у хмару</button><button class="btn ghost" id="cdn">⬇ Завантажити з хмари</button><button class="btn ghost" id="gout">Вийти</button></div><div class="dim small" id="cmsg"></div>' +
      '<p class="dim small">У хмару йдуть картки, слова, історія повторень, прочитані історії й налаштування (без ключів ШІ, форуму й кешу). «Завантажити» замінює локальний прогрес даними з хмари.</p></div>';
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
