/* Профіль без сервера: нік, файли прогресу й пакети спільноти (без ключів ШІ). Показується в Профілі. */
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
  function dl(name, text) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function pick(cb) { var f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json'; f.onchange = function () { var r = new FileReader(); r.onload = function () { cb(String(r.result)); }; if (f.files[0] && f.files[0].size < 3e6) r.readAsText(f.files[0]); }; f.click(); }
  O.renderAccount = function (box) {
    var c = O.cloud(); box.innerHTML = '<h3>Профіль і обмін</h3>';
    if (!c) { box.innerHTML += '<div class="panel dim small">Модуль спільноти не завантажився.</div>'; return; }
    var u = c.user(), n = c.counts();
    box.innerHTML += '<div class="panel"><p class="dim small">Сервера й паролів немає: профіль, прогрес і ключі живуть лише в цьому браузері. Між пристроями й людьми дані переносяться файлами.</p>' +
      '<div class="row"><input id="anick" placeholder="Твоє ім’я (лише тут)" maxlength="30" value="' + O.esc(u.name === 'Я' ? '' : u.name) + '"><button class="btn ghost" id="anam">Зберегти</button></div>' +
      '<h4>Прогрес між пристроями</h4><div class="row"><button class="btn ghost" id="cup">⬇ Зберегти прогрес у файл</button><button class="btn ghost" id="cdn">⬆ Завантажити з файлу</button></div>' +
      '<h4>Спільнота: обмін матеріалами</h4><div class="row"><button class="btn ghost" id="pex">⬇ Мої матеріали (' + n.out + ') у файл</button><button class="btn ghost" id="pim">⬆ Імпортувати чужий пакет (' + n.inn + ')</button></div><div class="dim small" id="cmsg"></div>' +
      '<p class="dim small">Прогрес: картки, слова, історія повторень, історії й налаштування (без ключів ШІ, форуму й кешу). Пакет: лише згенеровані тобою факти, жарти, меми й історії з підписом моделі, без ключів. Адмін додає спільні матеріали в <code>community/feed.json</code> у репозиторії.</p></div>';
    var m = box.querySelector('#cmsg');
    box.querySelector('#anam').onclick = function () { c.setName(box.querySelector('#anick').value); O.toast('Збережено'); };
    box.querySelector('#cup').onclick = function () { dl('ord-progress-' + new Date().toISOString().slice(0, 10) + '.json', O.packState()); m.textContent = '✓ Файл збережено'; };
    box.querySelector('#cdn').onclick = function () {
      var b = this; if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', 1); b.textContent = 'Замінити локальний прогрес?'; return; }
      pick(function (t) { try { O.unpackState(t); m.textContent = '✓ Прогрес завантажено'; O.toast('Прогрес завантажено'); } catch (e) { m.textContent = 'Не вдалося: ' + (e && e.message); } });
    };
    box.querySelector('#pex').onclick = function () { dl('ord-pack-' + new Date().toISOString().slice(0, 10) + '.json', c.exportPack()); m.textContent = '✓ Пакет збережено; його можна надіслати іншим'; };
    box.querySelector('#pim').onclick = function () { pick(function (t) { try { var k = c.importPack(t, O.cleanPost); m.textContent = '✓ Додано записів: ' + k + '. Дивись вкладку «Спільнота».'; } catch (e) { m.textContent = 'Не вдалося: ' + (e && e.message); } }); };
  };
  if (window.ORD_CLOUD) window.ORD_CLOUD.onAuth(function () { var b = document.getElementById('pacc'); if (b) O.renderAccount(b); });
})();
