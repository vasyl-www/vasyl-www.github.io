/* Екран «Ключі ШІ» (у Налаштуваннях) і смуга розблокування. Ключі вводяться лише тут і не показуються після збереження. */
(function () {
  var O = window.ORD, K = O.keys;
  function status(p) { return K.has(p) ? '<span class="tag ok">активний</span>' : K.stored(p) ? '<span class="tag warn">🔒 у старому сховищі</span>' : '<span class="tag">немає ключа</span>'; }
  O.renderKeys = function (box) {
    var s = O.state.settings, hasV = K.hasVault();
    var h = '<h3>Ключі ШІ</h3><div class="fact">Ключі зберігаються лише в цьому браузері на цьому пристрої, і ніколи не йдуть на сервер сайту, у хмарну синхронізацію чи в спільний контент. Запити до ШІ відправляються прямо з браузера провайдеру. Не вводь ключі на чужому пристрої. У кабінеті провайдера постав ліміт витрат.</div>';
    if (hasV && !K.unlocked()) h += '<div class="panel"><b>Старе сховище під паролем</b><div class="small dim">Введи старий пароль один раз: ключі перенесуться на цей пристрій, і більше пароль не питатиму. Або забудь старі ключі й введи їх знову нижче.</div><div class="row"><input type="password" id="vpw" autocomplete="current-password" placeholder="Старий пароль"><button class="btn" id="vun">Перенести</button><button class="btn ghost" id="vrs">Забути й почати заново</button></div></div>';
    h += '<div class="row"><label>Який ШІ використовувати <select id="kpref"><option value="auto">Авто: спершу платні, потім безкоштовні</option>' + O.PROV_IDS.map(function (p) { return '<option value="' + p + '"' + (s.aiPref === p ? ' selected' : '') + '>' + O.esc(O.PROV[p].name) + '</option>'; }).join('') + '</select></label></div>';
    h += '<div class="provs">' + O.PROV_IDS.map(function (p) {
      var c = K.cfg(p), P = O.PROV[p], canPersist = K.unlocked();
      return '<div class="panel prov" data-p="' + p + '"><div class="pop-h"><b>' + O.esc(P.name) + '</b>' + status(p) + '</div><div class="dim small">Де взяти ключ: ' + O.esc(P.where) + '</div>' +
        '<label>Ключ <input type="password" class="kk" autocomplete="off" spellcheck="false" placeholder="' + (K.has(p) || K.stored(p) ? 'змінити ключ (залиш порожнім, щоб не міняти)' : 'встав ключ') + '"></label>' +
        '<label>Модель <input class="km" value="' + O.esc(c.model) + '"></label><label><input type="checkbox" class="kf"' + (c.free ? ' checked' : '') + '> Безкоштовний рівень (згенероване піде у вкладку «Безкоштовні ШІ»)</label>' +
        '<label><input type="checkbox" class="kp"' + (canPersist ? ' checked' : ' disabled') + '> Пам’ятати на цьому пристрої (зашифровано)</label>' +
        '<div class="row"><button class="btn" data-a="save">Зберегти</button><button class="btn ghost" data-a="test">Перевірити</button><button class="btn ghost" data-a="del">Видалити</button><span class="dim small kmsg"></span></div></div>';
    }).join('') + '</div><div class="row"><label><input type="checkbox" id="kshare"' + (s.share !== false ? ' checked' : '') + '> Зберігати згенеровані факти, жарти, меми й історії у «Мої матеріали» для обміну пакетом (без твого імені, з підписом моделі)</label></div>' +
      '<div class="row"><button class="btn ghost" id="kdiag">🩺 Перевірити всі ключі</button></div><div id="kdout" class="small"></div><div class="row"><button class="btn ghost" id="kwipe">Стерти всі ключі з цього пристрою</button></div><p class="dim small">Назви моделей змінюються: якщо провайдер відповідає помилкою, онови модель за списком у його кабінеті.</p>';
    box.innerHTML = h;
    var dg = box.querySelector('#kdiag'); if (dg) dg.onclick = function () {
      var out = box.querySelector('#kdout'); out.textContent = 'Перевіряю…'; dg.disabled = true;
      O.aiDiag().then(function (r) { dg.disabled = false; out.innerHTML = r.length ? r.map(function (x) { return '<div>' + (x.ok ? '✅' : '❌') + ' <b>' + O.esc(O.PROV[x.id].name) + '</b> · ' + O.esc(x.model) + ' · ' + x.ms + ' мс' + (x.ok ? '' : ' — ' + O.esc(O.aiError({ code: x.code, detail: x.status, msg: x.msg, provider: x.id }))) + '</div>'; }).join('') : 'Немає жодного розблокованого ключа.'; });
    };
    function msg(p, t, bad) { var el = box.querySelector('[data-p=' + p + '] .kmsg'); if (el) { el.textContent = t; el.className = 'small kmsg ' + (bad ? 'warn' : 'dim'); } }
    function again() { O.renderKeys(box); O.mountLockBar && O.mountLockBar(); }
    var un = box.querySelector('#vun'); if (un) un.onclick = function () { K.unlock(box.querySelector('#vpw').value).then(function () { O.toast('Готово: пароль більше не потрібен'); again(); }).catch(function (e) { O.toast(e.message); }); };
    var rs = box.querySelector('#vrs'); if (rs) rs.onclick = function () { K.wipe(); O.toast('Старі ключі забуто'); again(); };
    var dv = box.querySelector('#vdev'); if (dv) dv.onclick = function () { K.createDeviceVault().then(function () { O.toast('Готово: пароль не потрібен'); again(); }).catch(function (e) { O.toast(e.message, 3000); }); };
    var dc = box.querySelector('#vdv'); if (dc) dc.onchange = function () { (dc.checked ? K.deviceOn() : K.deviceOff()).then(function () { O.toast(dc.checked ? 'Автовхід увімкнено' : 'Автовхід вимкнено'); again(); }).catch(function (e) { dc.checked = false; O.toast(e.message, 3000); }); };
    var mk = box.querySelector('#vmk'); if (mk) mk.onclick = function () { K.createVault(box.querySelector('#vnew').value).then(function () { O.toast('Сховище створено'); again(); }).catch(function (e) { O.toast(e.message, 3000); }); };
    var lk = box.querySelector('#vlk'); if (lk) lk.onclick = function () { K.lock(); again(); };
    box.querySelector('#kpref').onchange = function (e) { s.aiPref = e.target.value; O.save(); };
    box.querySelector('#kshare').onchange = function (e) { s.share = e.target.checked; O.save(); };
    box.querySelector('#kwipe').onclick = function () { var b = this; if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', 1); b.textContent = 'Точно стерти?'; return; } K.wipe(); again(); O.toast('Ключі стерто'); };
    O.$$('.prov', box).forEach(function (el) {
      var p = el.getAttribute('data-p');
      el.querySelector('[data-a=save]').onclick = function () {
        var key = el.querySelector('.kk').value.trim(), model = el.querySelector('.km').value.trim(), free = el.querySelector('.kf').checked, persist = el.querySelector('.kp').checked;
        if (!key) { if (K.has(p) || K.stored(p)) { K.setMeta(p, { model: model, free: free }); msg(p, 'Збережено (ключ без змін)'); return; } return msg(p, 'Встав ключ', true); }
        K.set(p, key, { model: model, free: free, persist: persist }).then(function () { el.querySelector('.kk').value = ''; O.toast('Ключ збережено'); again(); }).catch(function (e) { msg(p, e.message, true); });
      };
      el.querySelector('[data-a=test]').onclick = function () { K.setMeta(p, { model: el.querySelector('.km').value, free: el.querySelector('.kf').checked }); msg(p, 'Перевіряю…'); O.testKey(p).then(function () { msg(p, '✓ Працює'); }).catch(function (e) { msg(p, O.aiError(e), true); }); };
      el.querySelector('[data-a=del]').onclick = function () { K.remove(p).then(again); };
    });
  };
  var rs = O.renderSettings;
  O.renderSettings = function (root) { rs(root); var d = O.el('div'); root.appendChild(d); O.renderKeys(d); };
  /* Смуга розблокування над контентом, якщо сховище заблоковане */
  O.mountLockBar = function () {
    var old = document.getElementById('lockbar'); if (old) old.remove();
    if (!K.hasVault() || K.unlocked()) return;
    var b = O.el('div', 'lockbar', '🔒 Ключі ШІ зі старого сховища. Один раз введи старий пароль, і більше його не питатиму. <input type="password" id="lbpw" placeholder="Старий пароль" autocomplete="current-password"><button class="btn" id="lbgo">Перенести</button><button class="btn ghost" id="lbrs">Забути ключі</button>');
    b.id = 'lockbar'; document.body.appendChild(b);
    function go() { K.unlock(b.querySelector('#lbpw').value).then(function () { b.remove(); O.toast('Готово: пароль більше не потрібен'); }).catch(function (e) { O.toast(e.message); }); }
    b.querySelector('#lbrs').onclick = function () { K.wipe(); b.remove(); O.toast('Старі ключі забуто. Введи їх знову в Налаштуваннях'); };
    b.querySelector('#lbgo').onclick = go; b.querySelector('#lbpw').onkeydown = function (e) { if (e.key === 'Enter') go(); };
  };
})();
