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
    var no = O.lang && O.lang() === 'no', ws = O.words || [], due = O.srs ? O.srs.counts(O.state.cards, Date.now()).due : 0, w = ws.length ? ws[Math.floor(Math.random() * ws.length)] : null;
    var a = 'Hei! 👋 ';
    if (due > 0) a += no ? 'Du har ' + due + ' kort til repetisjon. ' : 'У тебе ' + due + ' карток до повторення. ';
    if (w) a += (no ? 'Ordet nå: «' : 'Слово зараз: «') + (w.art ? w.art + ' ' : '') + w.no + '»' + (no ? '. ' : ' — ' + w.uk + '. ');
    return a + (no ? 'Har du spørsmål om norsk? Skriv nedenfor: spør om et ord, grammatikk eller hvordan du sier noe.' : 'Є питання про норвезьку? Напиши нижче: спитай про слово, граматику чи як щось сказати.');
  }
  function hint() { try { var n = O.mind.next()[0]; return 'Далі за ядром: ' + n.icon + ' ' + n.title + '.'; } catch (e) { return greeting(); } }
  function bub(who, html) { var l = pop.querySelector('.aipop-log'), b = O.el('div', 'bub ' + who, html); l.appendChild(b); l.scrollTop = l.scrollHeight; return b; }
  var SYS_NO = 'Du er en vennlig norsklærer (bokmål) for en ukrainsk sveiser som bor i Norge, nivå A1-A2. Svar på enkel norsk, kort (maks 6 setninger), med ukrainsk oversettelse i parentes for nye ord. Hvis spørsmålet ikke handler om språk eller livet i Norge, svar kort og led samtalen tilbake til læring. Ingen Markdown-overskrifter.';
  var SYS = 'Ти дружній репетитор норвезької (bokmål) для українця-зварювальника, який живе в Норвегії, рівень A1-A2. Відповідай українською, коротко (до 6 речень), норвезькі приклади з перекладом. Якщо питання не про мову чи життя в Норвегії, коротко відповідай і м’яко повертай до навчання. Без Markdown-заголовків.';
  /* ---- Історія розмов: зберігається в стані (синхронізується між пристроями), до 200 повідомлень ---- */
  function CH() { var c = O.state.chat = O.state.chat || []; return c; }
  var RX = ['👍', '❤️', '😂', '🤔', '😕', '⭐'], replyTo = null;
  function remember(role, text, re) { var c = CH(), t = Date.now(), m = { id: t + role[0] + Math.random().toString(36).slice(2, 5), t: t, role: role, text: String(text).slice(0, 1500) }; if (re) m.re = re; c.push(m); if (c.length > 200) c.splice(0, c.length - 200); O.save(); return m; }
  function byId(id) { var c = CH(); for (var i = c.length - 1; i >= 0; i--) if ((c[i].id || String(c[i].t) + c[i].role[0]) === id) return c[i]; return null; }
  function short(t, n) { t = String(t).replace(/\s+/g, ' '); return t.length > (n || 70) ? t.slice(0, n || 70) + '…' : t; }
  /* ---- Синхронізація зі словником і ядром: ШІ знає, що ти вчиш і де слабкі місця ---- */
  function userCtx() {
    try {
      var m = O.mind.model(), nm = function (x) { var w = O.wordById[x.id]; return w ? w.no : null; };
      var weak = Object.keys(O.state.cards).filter(function (id) { var c = O.state.cards[id]; return c.leech || (c.lapses || 0) >= 2; }).slice(0, 6).map(function (id) { return (O.wordById[id] || {}).no; }).filter(Boolean);
      var act = m.active.slice(0, 6).map(nm).filter(Boolean), tr = O.mind.TR(), seen = Object.keys(tr).filter(function (k) { return k.indexOf('w:') === 0; }).sort(function (x, y) { return tr[y].n - tr[x].n; }).slice(0, 5).map(function (k) { return k.slice(2); });
      var rx = CH().filter(function (m) { return m.role === 'bot' && m.rx && m.rx.length; }).slice(-4).map(function (m) { return m.rx.join('') + ' на «' + short(m.text, 50) + '»'; });
      return (rx.length ? ' Реакції учня на твої відповіді: ' + rx.join('; ') + ' (🤔😕 = було складно, пояснюй простіше; 👍❤️ = зрозуміло).' : '') + ' Контекст учня (з його словника, не вигадка): слабкі слова: ' + (weak.join(', ') || '—') + '; активні: ' + (act.join(', ') || '—') + '; шукав, але не додав: ' + (seen.join(', ') || '—') + '. Якщо доречно, використай ці слова у прикладах.';
    } catch (e) { return ''; }
  }
  function tokens(text) { return (String(text).match(/[A-Za-zÆØÅæøå]{3,}/g) || []).slice(0, 60); }
  function offers(q, a) {
    var seen = {}, out = [];
    tokens(a + ' ' + q).forEach(function (t) { var w = O.localLookup(t); if (w && !seen[w.id]) { seen[w.id] = 1; if (!O.card(w.id)) out.push(w); } });
    return out.slice(0, 4);
  }
  function offerRow(el, ws) {
    if (!ws.length) return; var row = O.el('div', 'row aioffer');
    ws.forEach(function (w) { var b = O.el('button', 'btn ghost small', '＋ ' + O.esc(w.no)); b.title = w.uk; b.onclick = function () { O.addWord(w); b.disabled = true; b.textContent = '✓ ' + w.no; }; row.appendChild(b); });
    el.appendChild(row);
  }
  /* ---- Повідомлення як у месенджері: відповідь, поділитися, реакції ---- */
  function share(m) {
    var txt = m.text + '\n— Ord (вивчення норвезької)';
    if (navigator.share) { navigator.share({ text: txt }).catch(function () { /* скасовано */ }); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { O.toast('Скопійовано', 1200); }, function () { O.toast('Не вдалося скопіювати', 1500); });
    else O.toast('Поділитися тут не вдається', 1500);
  }
  function setReply(m) {
    replyTo = m ? (m.id || String(m.t) + m.role[0]) : null; var bar = pop.querySelector('.rbar');
    if (!m) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false; bar.innerHTML = '<span>↩ ' + O.esc(short(m.text, 60)) + '</span><button class="icon" data-rx aria-label="Скасувати відповідь">✕</button>'; bar.querySelector('[data-rx]').onclick = function () { setReply(null); }; pop.querySelector('#aiq').focus();
  }
  /* реакція → ядро: 👍❤️😂 = сподобалось/зрозуміло (сліди слів), 🤔😕 = складно (слова з словника йдуть в активацію), ⭐ = запам'ятати слова */
  function wordsOf(m) { var seen = {}, out = []; tokens(m.text).forEach(function (t) { var w = O.localLookup(t); if (w && !seen[w.id]) { seen[w.id] = 1; out.push(w); } }); return out.slice(0, 6); }
  function reactCore(m, e, el) {
    if (!O.mind) return; var ws = wordsOf(m);
    if (e === '⭐') { var n = 0; ws.forEach(function (w) { if (!O.card(w.id)) { O.addWord(w); n++; } }); O.toast(n ? 'У словник: ' + n : 'Нових слів немає', 1400); }
    else if (e === '🤔' || e === '😕') {
      ws.forEach(function (w) { if (O.card(w.id)) O.mind.ev('answer', { id: w.id, ok: false }); else O.mind.ev('lookup', { word: w.no, ctx: [] }); });
      if (m.role === 'bot' && el && !el.querySelector('.simp')) { var b = O.el('button', 'btn ghost small simp', 'Поясни простіше'); b.onclick = function () { b.remove(); setReply(m); ask('Поясни простіше, коротшими реченнями.'); }; el.appendChild(b); }
    } else ws.forEach(function (w) { if (O.card(w.id)) O.mind.ev('answer', { id: w.id, ok: true }); else O.mind.ev('lookup', { word: w.no, ctx: [] }); });
    if (O.rewards) O.rewards.free('react');
  }
  function paintRx(m, el) {
    var box = el.querySelector('.rxs'); box.innerHTML = '';
    (m.rx || []).forEach(function (e) { var c = O.el('button', 'rxc', e); c.onclick = function () { toggleRx(m, e, el); }; box.appendChild(c); });
  }
  function toggleRx(m, e, el) {
    m.rx = m.rx || []; var i = m.rx.indexOf(e); if (i >= 0) m.rx.splice(i, 1); else { m.rx.push(e); reactCore(m, e, el); } O.save(); paintRx(m, el);
  }
  function render(m) {
    if (!m.id) m.id = String(m.t) + m.role[0];
    var q = m.re && byId(m.re), b = O.el('div', 'bub ' + (m.role === 'bot' ? 'bot' : 'me') + ' msg'); b.setAttribute('data-id', m.id);
    b.innerHTML = (q ? '<div class="quote">↩ ' + O.esc(short(q.text, 80)) + '</div>' : '') + '<div class="mt">' + O.esc(m.text).replace(/\n/g, '<br>') + '</div>' + (m.gen ? '<div class="dim small">✦ ' + O.esc(m.gen) + '</div>' : '') +
      '<div class="bact"><button class="icon" data-rp aria-label="Відповісти" title="Відповісти">↩</button><button class="icon" data-sh aria-label="Поділитися" title="Поділитися">⎘</button><button class="icon" data-em aria-label="Реакція" title="Реакція">😊</button></div><div class="rxpick" hidden>' + RX.map(function (e) { return '<button class="icon" data-e="' + e + '">' + e + '</button>'; }).join('') + '</div><div class="rxs"></div>';
    b.querySelector('[data-rp]').onclick = function () { setReply(m); };
    b.querySelector('[data-sh]').onclick = function () { share(m); };
    var pk = b.querySelector('.rxpick'); b.querySelector('[data-em]').onclick = function () { pk.hidden = !pk.hidden; };
    O.$$('[data-e]', b).forEach(function (x) { x.onclick = function () { pk.hidden = true; toggleRx(m, x.getAttribute('data-e'), b); }; });
    paintRx(m, b); if (q) b.querySelector('.quote').onclick = function () { var t = pop.querySelector('[data-id="' + q.id + '"]'); if (t) { t.scrollIntoView({ block: 'center' }); t.classList.add('flash'); setTimeout(function () { t.classList.remove('flash'); }, 900); } };
    if (m.role === 'bot') offerRow(b, offers('', m.text));
    return b;
  }
  function put(m) { var l = pop.querySelector('.aipop-log'), el = render(m); l.appendChild(el); l.scrollTop = l.scrollHeight; return el; }
  function ask(q) {
    if (busy || !q.trim()) return; busy = true; var re = replyTo, quoted = re && byId(re); setReply(null);
    var m1 = remember('user', q, re), content = (quoted ? '[Учень відповідає на це повідомлення (' + (quoted.role === 'bot' ? 'твоє' : 'його') + '): «' + short(quoted.text, 300) + '»]\n' : '') + q.slice(0, 1000);
    hist.push({ role: 'user', content: content }); hist = hist.slice(-8); put(m1); var w = bub('bot', '…');
    if (O.mind) { O.mind.ev('translate', { tokens: tokens(q) }); if (O.rewards) O.rewards.free('ask'); }
    O.aiG((O.lang && O.lang() === 'no' ? SYS_NO : SYS) + userCtx(), hist, 600).then(function (r) {
      hist.push({ role: 'assistant', content: r.text }); var m2 = remember('bot', r.text, m1.id); m2.gen = O.genLabel(r.gen); O.save();
      w.remove(); put(m2); if (O.mind) O.mind.ev('text', { tokens: tokens(r.text).filter(function (t) { return O.localLookup(t); }).slice(0, 12) });
    }).catch(function (e) {
      hist.pop(); var c = CH(); c.splice(c.indexOf(m1), 1); O.save(); pop.querySelector('[data-id="' + m1.id + '"]').remove(); w.innerHTML = O.esc(O.aiError(e)) + '<div class="dim small">Додай ключ у Профіль → Налаштування → «Ключі ШІ». Безкоштовні варіанти: Gemini, DeepSeek, OpenRouter.</div>';
    }).then(function () { busy = false; });
  }
  function restore() {
    var c = CH().slice(-30), last = 0; hist = CH().slice(-8).map(function (m) { return { role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }; });
    c.forEach(function (m) { var d = new Date(m.t).toLocaleDateString('uk-UA'); if (d !== last) { bub('sep dim small', O.esc(d)); last = d; } put(m); });
  }
  function open(msg) {
    if (pop) { pop.hidden = false; badge(false); return; }
    pop = O.el('div', 'aipop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Запитай ШІ');
    pop.innerHTML = '<div class="aipop-h"><b>🤖 Запитай ШІ</b><button class="icon" data-clr title="Очистити історію" aria-label="Очистити історію">🗑</button><button class="icon" data-x aria-label="Закрити">✕</button></div><div class="aipop-log"></div><div class="rbar" hidden></div><form><input id="aiq" autocomplete="off" maxlength="400" placeholder="Твоє питання…"><button class="btn" type="submit">➤</button></form>';
    document.body.appendChild(pop); if (!msg && CH().length) { restore(); bub('bot', O.esc(hint())); } else bub('bot', O.esc(msg || greeting())); if (!msg && O.phrases) O.phrases.bot(pop.querySelector('.aipop-log'), true);
    pop.querySelector('[data-x]').onclick = function () { pop.hidden = true; };
    var clr = pop.querySelector('[data-clr]'), armT = null;
    clr.onclick = function () {
      if (!clr.classList.contains('arm')) { clr.classList.add('arm'); clr.textContent = 'Стерти?'; armT = setTimeout(function () { clr.classList.remove('arm'); clr.textContent = '🗑'; }, 3000); return; }
      clearTimeout(armT); clr.classList.remove('arm'); clr.textContent = '🗑'; O.state.chat = []; hist = []; O.save(); pop.querySelector('.aipop-log').innerHTML = ''; bub('bot', 'Історію очищено.');
    };
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
  function body() { var d = O.srs ? O.srs.counts(O.state.cards, Date.now()).due : 0, no = O.lang && O.lang() === 'no'; return d > 0 ? (no ? 'Til repetisjon: ' + d + ' kort. Et par minutter norsk?' : 'До повторення: ' + d + ' карток. Пара хвилин на норвезьку?') : (no ? 'Tid for en kort norskøkt: les en historie eller spill et minispill.' : 'Час для короткої сесії норвезької: прочитай історію або зіграй у міні-гру.'); }
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
    caches.open('ord-meta').then(function (c) { return c.put('meta', new Response(JSON.stringify({ on: !!S().remind, h: h[0], m: h[1], due: d, no: O.lang && O.lang() === 'no', last: O.state.remindDay || '' }))); }).catch(function () { /* ignore */ });
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
