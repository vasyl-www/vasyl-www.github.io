/* Інтерфейс: теми, звук натискань, спливаюче вікно ШІ з полем питання, нагадування (локальні сповіщення). */
(function () {
  var O = window.ORD, S = function () { return O.state.settings; };
  /* ---------- Теми ---------- */
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
  O.applyTheme = function () {
    var m = S().theme || 'dark', t = m === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : m;
    document.documentElement.setAttribute('data-theme', t);
    var tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.setAttribute('content', t === 'light' ? '#f4f6fb' : '#10141f');
    var b = document.getElementById('themeBtn'); if (b) b.firstChild.textContent = t === 'light' ? '🌙' : '☀️';
  };
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (O.state && S().theme === 'auto') O.applyTheme(); });
  O.navExtras = function (nav) {
    var sp = O.el('span', 'sp'); nav.appendChild(sp);
    var b = O.el('button', '', '<span>☀️</span><small>Тема</small>'); b.id = 'themeBtn'; b.title = 'Світла / темна тема';
    b.onclick = function () { var cur = document.documentElement.getAttribute('data-theme'); S().theme = cur === 'light' ? 'dark' : 'light'; O.save(); O.applyTheme(); };
    nav.appendChild(b); O.applyTheme();
  };

  /* ---------- Звук натискань ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('button,.chip,.tile,.opt,.story,.rw,.gcell,.fw,[role=button],summary');
    if (t && !t.closest('[data-nosound]') && !t.disabled) O.sfx('tap');
  }, true);

  /* ---------- ШІ-віконце ---------- */
  var pop = null, fab = null, hist = [], busy = false, TIPS = null;
  function dayKey() { return new Date().toISOString().slice(0, 10); }
  function greeting() {
    var ws = O.words || [], due = O.srs ? O.srs.counts(O.state.cards, Date.now()).due : 0, w = ws.length ? ws[Math.floor(Math.random() * ws.length)] : null;
    var a = 'Hei! 👋 ';
    if (due > 0) a += 'У тебе ' + due + ' карток до повторення. ';
    if (w) a += 'Слово зараз: «' + (w.art ? w.art + ' ' : '') + w.no + '» — ' + w.uk + '. ';
    return a + 'Є питання про норвезьку? Напиши нижче: спитай про слово, граматику чи як щось сказати.';
  }
  function bub(who, html) { var l = pop.querySelector('.aipop-log'), b = O.el('div', 'bub ' + who, html); l.appendChild(b); l.scrollTop = l.scrollHeight; return b; }
  var SYS = 'Ти дружній репетитор норвезької (bokmål) для українця-зварювальника, який живе в Норвегії, рівень A1-A2. Відповідай українською, коротко (до 6 речень), норвезькі приклади з перекладом. Якщо питання не про мову чи життя в Норвегії, коротко відповідай і м’яко повертай до навчання. Без Markdown-заголовків.';
  function ask(q) {
    if (busy || !q.trim()) return; busy = true; hist.push({ role: 'user', content: q.slice(0, 1000) }); hist = hist.slice(-8);
    bub('me', O.esc(q)); var w = bub('bot', '…');
    O.aiG(SYS, hist, 600).then(function (r) {
      hist.push({ role: 'assistant', content: r.text }); w.innerHTML = O.esc(r.text).replace(/\n/g, '<br>') + '<div class="dim small">✦ ' + O.esc(O.genLabel(r.gen)) + '</div>';
    }).catch(function (e) {
      hist.pop(); w.innerHTML = O.esc(O.aiError(e)) + '<div class="dim small">Додай ключ у Профіль → Налаштування → «Ключі ШІ». Безкоштовні варіанти: Gemini, DeepSeek, OpenRouter.</div>';
    }).then(function () { busy = false; });
  }
  function open(msg) {
    if (pop) { pop.hidden = false; badge(false); return; }
    pop = O.el('div', 'aipop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Запитай ШІ');
    pop.innerHTML = '<div class="aipop-h"><b>🤖 Запитай ШІ</b><button class="icon" data-x aria-label="Закрити">✕</button></div><div class="aipop-log"></div><form><input id="aiq" autocomplete="off" maxlength="400" placeholder="Твоє питання…"><button class="btn" type="submit">➤</button></form>';
    document.body.appendChild(pop); bub('bot', O.esc(msg || greeting()));
    pop.querySelector('[data-x]').onclick = function () { pop.hidden = true; };
    pop.querySelector('form').onsubmit = function (e) { e.preventDefault(); var i = pop.querySelector('#aiq'), v = i.value; i.value = ''; ask(v); };
    badge(false);
  }
  function badge(on) { if (!fab) return; var b = fab.querySelector('.aibadge'); if (on && !b) fab.appendChild(O.el('i', 'aibadge')); if (!on && b) b.remove(); }
  O.openAsk = function (q) { open(); if (q) ask(q); };
  function mount() {
    if (fab || S().aiPopup === false) return;
    fab = O.el('button', 'aifab', '🤖'); fab.setAttribute('aria-label', 'Запитай ШІ'); fab.onclick = function () { if (pop && !pop.hidden) pop.hidden = true; else open(); };
    document.body.appendChild(fab);
    /* Раз на день ШІ сам пише першим: вікно спливає через кілька секунд після відкриття */
    if (O.state.aiPopDay !== dayKey()) setTimeout(function () { if (!fab || (pop && !pop.hidden)) return; O.state.aiPopDay = dayKey(); O.save(); open(); }, 12000);
  }
  O.setAiPopup = function (on) { S().aiPopup = on; O.save(); if (!on && fab) { fab.remove(); fab = null; if (pop) { pop.remove(); pop = null; } } else if (on) mount(); };

  /* ---------- Нагадування ---------- */
  /* Це локальні сповіщення без сервера: показуються, коли сайт відкритий або (Chrome на Android, встановлений PWA) коли браузер сам будить сторінку. Справжній push потребує окремого сервера. */
  function supported() { return 'Notification' in window; }
  function hm() { var t = (S().remindAt || '19:00').split(':'); return [+t[0] || 19, +t[1] || 0]; }
  function body() { var d = O.srs ? O.srs.counts(O.state.cards, Date.now()).due : 0; return d > 0 ? 'До повторення: ' + d + ' карток. Пара хвилин на норвезьку?' : 'Час для короткої сесії норвезької: прочитай історію або зіграй у міні-гру.'; }
  function notify(title, text) {
    if (!supported() || Notification.permission !== 'granted') return false;
    var o = { body: text, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'ord-remind' };
    if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(title, o); }).catch(function () { try { new Notification(title, o); } catch (e) { /* ignore */ } });
    else { try { new Notification(title, o); } catch (e) { /* ignore */ } }
    return true;
  }
  O.testNotify = function () { return notify('Ord 2', body()); };
  function syncMeta() {   // сервіс-воркер не бачить localStorage, тож лишаємо йому підсумок у Cache Storage
    if (!window.caches) return;
    var d = O.srs ? O.srs.counts(O.state.cards, Date.now()).due : 0, h = hm();
    caches.open('ord-meta').then(function (c) { return c.put('meta', new Response(JSON.stringify({ on: !!S().remind, h: h[0], m: h[1], due: d, last: O.state.remindDay || '' }))); }).catch(function () { /* ignore */ });
  }
  function tick() {
    if (!S().remind) return; var h = hm(), n = new Date();
    if (O.state.remindDay !== dayKey() && (n.getHours() > h[0] || (n.getHours() === h[0] && n.getMinutes() >= h[1]))) { if (notify('Ord 2', body())) { O.state.remindDay = dayKey(); O.save(); } }
    syncMeta();
  }
  O.setRemind = function (on, cb) {
    if (!on) { S().remind = false; O.save(); syncMeta(); return cb && cb('off'); }
    if (!supported()) return cb && cb('unsupported');
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { S().remind = false; O.save(); return cb && cb('denied'); }
      S().remind = true; O.save(); syncMeta();
      if (navigator.serviceWorker) navigator.serviceWorker.ready.then(function (r) { if (r.periodicSync) r.periodicSync.register('ord-remind', { minInterval: 6 * 3600 * 1000 }).catch(function () { /* не підтримується */ }); }).catch(function () { /* ignore */ });
      cb && cb('ok');
    });
  };

  /* ---------- Налаштування: вигляд, ШІ-віконце, нагадування ---------- */
  var rs = O.renderSettings;
  O.renderSettings = function (root) {
    rs(root); var s = S(), d = O.el('div');
    d.innerHTML = '<h3>Вигляд і сповіщення</h3><div class="form">' +
      '<label>Тема <select id="uth"><option value="dark">Темна</option><option value="light">Світла</option><option value="auto">Як у системі</option></select></label>' +
      '<label><input type="checkbox" id="uai"' + (s.aiPopup !== false ? ' checked' : '') + '> Віконце «Запитай ШІ» (кнопка 🤖 і щоденне привітання)</label>' +
      '<label><input type="checkbox" id="urm"' + (s.remind ? ' checked' : '') + '> Нагадування про повторення, о <input type="time" id="urt" value="' + O.esc(s.remindAt || '19:00') + '" style="width:auto"></label>' +
      '<div class="row"><button class="btn ghost" id="utn">🔔 Тестове сповіщення</button></div><div class="dim small" id="umsg"></div>' +
      '<p class="dim small">Це локальні сповіщення: вони приходять, коли сайт відкритий, а в Chrome на Android із встановленим застосунком іноді й у фоні. Гарантованих push-повідомлень без власного сервера не буває; звук натискань вмикається вище («Звукові ефекти»).</p></div>';
    root.appendChild(d); var m = d.querySelector('#umsg');
    d.querySelector('#uth').value = s.theme || 'dark'; d.querySelector('#uth').onchange = function (e) { s.theme = e.target.value; O.save(); O.applyTheme(); };
    d.querySelector('#uai').onchange = function (e) { O.setAiPopup(e.target.checked); };
    d.querySelector('#urt').onchange = function (e) { s.remindAt = e.target.value || '19:00'; O.save(); syncMeta(); };
    d.querySelector('#urm').onchange = function (e) { var c = e.target; O.setRemind(c.checked, function (r) { if (r === 'denied' || r === 'unsupported') { c.checked = false; m.textContent = r === 'denied' ? 'Сповіщення заблоковані в налаштуваннях браузера для цього сайту.' : 'Цей браузер не підтримує сповіщень.'; } else m.textContent = r === 'ok' ? '✓ Увімкнено' : 'Вимкнено'; }); };
    d.querySelector('#utn').onclick = function () { if (!supported()) { m.textContent = 'Цей браузер не підтримує сповіщень.'; return; } if (Notification.permission !== 'granted') { m.textContent = 'Спершу ввімкни нагадування (дозвіл).'; return; } O.testNotify(); };
  };

  var iv = setInterval(function () { if (O.state) tick(); }, 60000);
  var wait = setInterval(function () { if (O.state && document.getElementById('main')) { clearInterval(wait); mount(); O.applyTheme(); tick(); } }, 300);
})();
