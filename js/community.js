/* Спільнота: контент, який згенерували ШІ інших користувачів (Firestore) та вбудований набір. Дві вкладки: платні ШІ й безкоштовні ШІ. Кожен запис підписано моделлю.
   Усе, що приходить від інших, вважається недовіреним: текст екранується, SVG чиститься, посилання на відео будуються лише як пошук. */
(function () {
  var O = window.ORD, KINDS = ['all', 'fact', 'joke', 'meme', 'image', 'video', 'story'], KUK = { all: 'Усе', fact: '💡 Факти', joke: '😂 Жарти', meme: '🖼 Меми', image: '🎨 Зображення', video: '🎬 Відео', story: '📖 Історії' };
  O.cloud = function () { var c = window.ORD_CLOUD; return c && c.enabled ? c : null; };
  function clip(x, n) { return typeof x === 'string' ? x.trim().slice(0, n) : ''; }
  /* Документ із хмари -> безпечний об'єкт */
  O.cleanPost = function (d) {
    if (!d || KINDS.indexOf(d.kind) < 1) return null;
    var tier = d.tier === 'free' ? 'free' : 'paid', g = O.cleanGen({ provider: d.provider, model: d.model, tier: tier, builtin: d.gen && d.gen.builtin });
    if (!g) return null;
    var p = { id: String(d.id || '').slice(0, 60), uid: String(d.uid || '').slice(0, 60), kind: d.kind, title: clip(d.title, 120), no: clip(d.no, 1500), uk: clip(d.uk, 1500), explain: clip(d.explain, 500), top: clip(d.top, 80), bottom: clip(d.bottom, 80), q: clip(d.q, 120), svg: O.forumUI.cleanSvg(d.svg), lvl: d.lvl === 'A1' ? 'A1' : 'A2', gen: g };
    if (d.kind === 'story') {
      var arr = d.s; if (typeof d.sj === 'string') { try { arr = JSON.parse(d.sj); } catch (e) { arr = null; } }
      if (!Array.isArray(arr)) return null; p.s = arr.slice(0, 14).map(function (x) { return Array.isArray(x) ? [clip(x[0], 200), clip(x[1], 240)] : null; }).filter(function (x) { return x && x[0] && x[1]; });
      if (p.s.length < 3) return null; p.no = p.s.map(function (x) { return x[0]; }).join(' '); p.uk = p.s.map(function (x) { return x[1]; }).join(' ');
    } else if (!p.no && !p.svg) return null;
    return p;
  };
  /* Публікація власного згенерованого контенту (лише з підписом моделі й лише якщо увімкнено в налаштуваннях) */
  O.shareContent = function (kind, post) {
    var c = O.cloud(); if (!c || !c.user() || O.state.settings.share === false || !post || !post.gen || post.gen.builtin) return;
    var d = { kind: kind, provider: post.gen.provider, model: post.gen.model, tier: post.gen.tier, v: 1 };
    ['title', 'no', 'uk', 'explain', 'top', 'bottom', 'q'].forEach(function (k) { if (post[k]) d[k] = String(post[k]); });
    if (post.svg) d.svg = post.svg; if (kind === 'story') { d.sj = JSON.stringify(post.s); d.lvl = post.lvl || 'A2'; delete d.no; delete d.uk; }
    c.publish(d).then(function () { O.toast('Опубліковано в спільноті'); }, function () { /* без помилки для користувача: контент і так збережено локально */ });
  };
  function addStory(p) {
    var st = O.state; st.myStories = st.myStories || [];
    var s = { id: 'c' + O.forumUI.uid(), title: p.title, lvl: p.lvl, theme: 'doc', s: p.s, no: p.no, uk: p.uk, gen: p.gen, mine: true, from: 'community' };
    st.myStories.unshift(s); st.myStories = st.myStories.slice(0, 60); O.save(); return s;
  }
  function card(p, own, onReport, onDelete) {
    var K = O.forumUI.KIND[p.kind] || O.forumUI.KIND.fact, el = O.el('div', 'panel citem');
    if (p.kind === 'story') {
      el.innerHTML = '<div class="pop-h"><b>' + O.esc(p.title) + '</b><span class="tag">' + O.esc(p.lvl) + '</span></div><div class="no small">' + O.esc(p.s.slice(0, 2).map(function (x) { return x[0]; }).join(' ')) + '…</div><div class="row small"><span class="gen ' + (p.gen.tier === 'free' ? 'free' : '') + '">✦ ' + O.esc(O.genLabel(p.gen)) + '</span><span class="dim">' + p.s.length + ' речень</span></div><div class="row"><button class="btn" data-a="read">📖 Читати</button></div>';
    } else {
      el.innerHTML = O.forumUI.postHtml(Object.assign({}, p, { who: K[2], t: p.t || Date.now() }), null) + '<div class="row"><button class="btn ghost" data-a="add">➕ До мого форуму</button></div>';
      O.forumUI.bindPosts(el, { posts: [Object.assign({}, p, { who: K[2] })] });
    }
    var row = el.querySelector('.row:last-child');
    if (p.id && p.id.indexOf('seed-') !== 0) { var rb = O.el('button', 'btn ghost', own ? 'Видалити мій' : 'Поскаржитись'); rb.onclick = function () { (own ? onDelete : onReport)(p, rb); }; row.appendChild(rb); }
    var a = el.querySelector('[data-a=add]'); if (a) a.onclick = function () { O.forumAdd(p.kind, { title: p.title, no: p.no, uk: p.uk, explain: p.explain, top: p.top, bottom: p.bottom, svg: p.svg, q: p.q, gen: p.gen }); O.toast('Додано у форум'); a.disabled = true; };
    var r = el.querySelector('[data-a=read]'); if (r) r.onclick = function () { var s = addStory(p); O.pendingStory = s.id; O.go('read'); };
    return el;
  }
  O.renderCommunity = function (root) {
    var tier = O.state.settings.commTier || 'paid', kind = 'all', c = O.cloud(), seq = 0;
    root.innerHTML = '<h2>Спільнота</h2><p class="dim small">Контент, який згенерували ШІ інших користувачів, і вбудований набір. Це працює без твого ключа. Кожен запис підписано моделлю. Це не перевірений носіями матеріал: помилки трапляються.</p><div id="cacc"></div>' +
      '<div class="tabs"><button class="chip" data-t="paid">Платні ШІ</button><button class="chip" data-t="free">Безкоштовні ШІ</button></div><div class="dim small" id="ctn"></div><div class="chips" id="ck"></div><div id="cl"></div>';
    var acc = root.querySelector('#cacc');
    if (!c) acc.innerHTML = '<div class="banner">Хмарна спільнота не налаштована в цій збірці, тому показано лише вбудований набір. Налаштування: README → «Firebase».</div>';
    else if (!c.user()) { acc.innerHTML = '<div class="row"><button class="btn" id="cin">Увійти через Google, щоб бачити контент інших</button></div>'; acc.querySelector('#cin').onclick = function () { c.signIn().then(function () { O.renderCommunity(root); }).catch(function (e) { O.toast('Вхід не вдався: ' + (e && e.message || e), 3500); }); }; }
    O.$$('[data-t]', root).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === tier); b.onclick = function () { O.state.settings.commTier = b.getAttribute('data-t'); O.save(); O.renderCommunity(root); }; });
    root.querySelector('#ctn').textContent = tier === 'free' ? 'Згенеровано через безкоштовні рівні API. Якість і точність можуть бути нижчими.' : 'Згенеровано через платні ключі користувачів і вбудований набір.';
    var ck = root.querySelector('#ck'); KINDS.forEach(function (k) { var b = O.el('button', 'chip' + (k === kind ? ' on' : ''), KUK[k]); b.onclick = function () { kind = k; O.$$('#ck .chip', root).forEach(function (x) { x.classList.toggle('on', x === b); }); load(); }; ck.appendChild(b); });
    var list = root.querySelector('#cl');
    function show(items, note) {
      list.innerHTML = note ? '<p class="dim small">' + O.esc(note) + '</p>' : '';
      if (!items.length) list.innerHTML += '<div class="panel dim">У цій вкладці поки немає записів' + (kind !== 'all' ? ' цього типу' : '') + '. Згенеровані тобою факти, жарти, меми й історії з’являться тут, якщо ввімкнено «Ділитися» й ти увійшов.</div>';
      var me = c && c.user() && c.user().uid;
      items.forEach(function (p) {
        list.appendChild(card(p, !!(me && p.uid === me), function (x, b) { c.report(x.id).then(function () { b.textContent = 'Дякуємо, перевіримо'; b.disabled = true; }, function () { O.toast('Не вдалося надіслати скаргу'); }); },
          function (x, b) { if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', 1); b.textContent = 'Точно видалити?'; return; } c.remove(x.id).then(function () { b.closest('.citem').remove(); }, function () { O.toast('Не вдалося видалити'); }); }));
      });
    }
    function load() {
      var my = ++seq, base = tier === 'paid' ? O.seed.map(function (d) { return O.cleanPost(Object.assign({}, d, { provider: d.gen.provider, model: d.gen.model, tier: d.gen.tier })); }).filter(Boolean) : [];
      base = base.filter(function (p) { return kind === 'all' || p.kind === kind; });
      if (!c || !c.user()) return show(base);
      show(base, 'Завантажую записи спільноти…');
      c.list({ tier: tier, kind: kind === 'all' ? '' : kind, max: 40 }).then(function (docs) { if (my !== seq) return; show(base.concat(docs.map(O.cleanPost).filter(Boolean)), ''); })
        .catch(function (e) { if (my !== seq) return; show(base, 'Не вдалося завантажити записи спільноти (' + (e && (e.code || e.message) || 'помилка') + '). Показано лише вбудований набір.'); });
    }
    load();
  };
})();
