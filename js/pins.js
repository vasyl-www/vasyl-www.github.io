/* Піни: колекція в стилі Pinterest. Свій контент (фото, GIF, відео з пристрою, нотатки, посилання) зберігається лише в цьому браузері (IndexedDB).
   Пошук у відкритих джерелах без ключів: Wikimedia Commons (фото, GIF, відео) і Openverse (фото, GIF). Відповіді сторонніх API недовірені:
   текст екранується, адреси медіа приймаються лише з дозволених хостів. */
(function () {
  var O = window.ORD, DB = null, MAXN = 300, MAXVID = 40e6, MAXGIF = 12e6;
  var HOSTS = ['upload.wikimedia.org', 'api.openverse.org'];
  var CHIPS = ['Tromsø', 'nordlys', 'sveising', 'verktøy', 'mat', 'fjord', 'vinter', 'elg'];
  function okUrl(u) { try { var x = new URL(u); return x.protocol === 'https:' && HOSTS.indexOf(x.hostname) >= 0 ? x.href : ''; } catch (e) { return ''; } }
  function okLink(u) { try { var x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } }
  function clip(s, n) { return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, n); }
  function id() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- IndexedDB ---------- */
  function open() {
    if (DB) return DB;
    DB = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('IndexedDB недоступна'));
      var r = indexedDB.open('ord-pins', 1); r.onupgradeneeded = function () { r.result.createObjectStore('pins', { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
    return DB;
  }
  function tx(mode, fn) { return open().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction('pins', mode), s = t.objectStore('pins'), q = fn(s); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error || new Error('abort')); }; }); }); }
  O.pins = {
    all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { return (a || []).sort(function (x, y) { return y.t - x.t; }); }); },
    put: function (p) { return tx('readwrite', function (s) { return s.put(p); }); },
    del: function (k) { return tx('readwrite', function (s) { return s.delete(k); }); },
    okUrl: okUrl, okLink: okLink
  };

  /* ---------- Відкриті джерела ---------- */
  function commons(q, type) {
    var ext = type === 'gif' ? ' filemime:image/gif' : type === 'video' ? ' filetype:video' : ' filetype:bitmap -filemime:image/gif';
    var u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=24&gsrsearch=' + encodeURIComponent(q + ext) +
      '&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=480&iiextmetadatafilter=Artist|LicenseShortName|ObjectName|ImageDescription';
    return fetch(u, { referrerPolicy: 'no-referrer', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('Commons ' + r.status); return r.json(); }).then(function (j) {
      var pg = j && j.query && j.query.pages ? Object.keys(j.query.pages).map(function (k) { return j.query.pages[k]; }) : [], out = [];
      pg.sort(function (a, b) { return (a.index || 0) - (b.index || 0); }).forEach(function (p) {
        var ii = p.imageinfo && p.imageinfo[0]; if (!ii) return; var m = ii.extmetadata || {}, mime = String(ii.mime || ''), thumb = okUrl(ii.thumburl || ii.url), full = okUrl(ii.url); if (!full) return;
        var kind = /^video\//.test(mime) || mime === 'application/ogg' ? 'video' : mime === 'image/gif' ? 'gif' : /^image\/(jpeg|png|webp)/.test(mime) ? 'image' : ''; if (!kind) return;
        if (kind === 'gif' && ii.size > MAXGIF) full = thumb;   // тяжкі GIF показуємо мініатюрою
        out.push({ kind: kind, src: kind === 'video' ? full : (kind === 'gif' ? full : thumb || full), poster: kind === 'video' ? thumb : '', title: clip((m.ObjectName && m.ObjectName.value) || String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, ''), 120),
          by: clip(m.Artist && m.Artist.value, 80), license: clip(m.LicenseShortName && m.LicenseShortName.value, 40), page: okLink('https://commons.wikimedia.org/wiki/' + encodeURIComponent(String(p.title || '').replace(/ /g, '_'))), source: 'Wikimedia Commons', w: ii.thumbwidth || ii.width || 0, h: ii.thumbheight || ii.height || 0 });
      }); return out;
    });
  }
  function openverse(q, type) {
    var u = 'https://api.openverse.org/v1/images/?page_size=24&q=' + encodeURIComponent(q) + (type === 'gif' ? '&extension=gif' : '');
    return fetch(u, { referrerPolicy: 'no-referrer', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('Openverse ' + r.status); return r.json(); }).then(function (j) {
      var out = []; ((j && j.results) || []).forEach(function (x) {
        var t = okUrl(x.thumbnail); if (!t) return; out.push({ kind: type === 'gif' ? 'gif' : 'image', src: t, title: clip(x.title, 120), by: clip(x.creator, 80), license: clip(String(x.license || '').toUpperCase() + (x.license_version ? ' ' + x.license_version : ''), 40), page: okLink(x.foreign_landing_url), source: 'Openverse', w: x.width || 0, h: x.height || 0 });
      }); return out;
    });
  }
  O.pins.search = function (q, type) {
    var jobs = type === 'video' ? [commons(q, 'video')] : [commons(q, type), openverse(q, type)], bad = 0;
    return Promise.all(jobs.map(function (p) { return p.catch(function () { bad++; return []; }); })).then(function (r) { var o = []; for (var i = 0; i < 24; i++) r.forEach(function (a) { if (a[i]) o.push(a[i]); }); return { items: o, failed: bad === jobs.length }; });
  };

  /* ---------- Власні файли ---------- */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(function (b) { b ? res({ blob: b, w: c.width, h: c.height }) : rej(new Error('encode')); }, 'image/jpeg', 0.86);
      }; im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Не вдалося прочитати зображення')); }; im.src = u;
    });
  }
  O.pins.addFile = function (file) {
    var t = file.type, kind = t === 'image/gif' ? 'gif' : /^image\/(jpeg|png|webp)$/.test(t) ? 'image' : /^video\/(mp4|webm)$/.test(t) ? 'video' : '';
    if (!kind) return Promise.reject(new Error('Підтримуються JPG, PNG, WebP, GIF, MP4, WebM'));
    if (kind === 'video' && file.size > MAXVID) return Promise.reject(new Error('Відео більше 40 МБ'));
    if (kind === 'gif' && file.size > MAXGIF) return Promise.reject(new Error('GIF більше 12 МБ'));
    var base = { id: id(), t: Date.now(), kind: kind, title: clip(file.name.replace(/\.[a-z0-9]+$/i, ''), 120), own: true };
    var job = kind === 'image' ? shrink(file).then(function (s) { return Object.assign(base, { blob: s.blob, w: s.w, h: s.h }); }) : Promise.resolve(Object.assign(base, { blob: file }));
    return job.then(function (p) { return O.pins.put(p).then(function () { return p; }); });
  };

  /* ---------- Інтерфейс ---------- */
  var urls = [];
  function mediaUrl(p) { if (p.blob) { var u = URL.createObjectURL(p.blob); urls.push(u); return u; } return okUrl(p.src); }
  function cleanup() { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; }
  function pinEl(p, onOpen) {
    var el = O.el('button', 'pin'), src = mediaUrl(p), badge = p.kind === 'gif' ? 'GIF' : p.kind === 'video' ? '▶' : p.kind === 'note' ? '✎' : p.kind === 'link' ? '🔗' : '';
    var h = '';
    if (p.kind === 'note') h = '<div class="pnote">' + O.esc(p.note || p.title) + '</div>';
    else if (p.kind === 'link') h = '<div class="pnote">🔗 ' + O.esc(p.title || p.url) + '<div class="dim small">' + O.esc(p.url ? new URL(p.url).hostname : '') + '</div></div>';
    else if (p.kind === 'video') h = '<video muted loop playsinline preload="metadata" ' + (okUrl(p.poster) ? 'poster="' + O.esc(okUrl(p.poster)) + '" ' : '') + 'src="' + O.esc(src) + '#t=0.1"></video>';
    else h = '<img loading="lazy" alt="' + O.esc(p.title) + '" src="' + O.esc(src) + '"' + (p.w && p.h ? ' width="' + p.w + '" height="' + p.h + '"' : '') + '>';
    el.innerHTML = h + (badge ? '<span class="pbadge">' + badge + '</span>' : '') + (p.title && p.kind !== 'note' && p.kind !== 'link' ? '<span class="ptit">' + O.esc(p.title) + '</span>' : '');
    el.onclick = function () { onOpen(p); }; return el;
  }
  function lightbox(p, saved, refresh) {
    var old = O.$('.pinlb'); if (old) old.remove();
    var src = mediaUrl(p), lb = O.el('div', 'pinlb'), m = '';
    if (p.kind === 'video') m = '<video controls playsinline loop autoplay muted src="' + O.esc(src) + '"></video>'; else if (p.kind === 'image' || p.kind === 'gif') m = '<img alt="' + O.esc(p.title) + '" src="' + O.esc(src) + '">';
    else if (p.kind === 'note') m = '<div class="pnote big">' + O.esc(p.note) + '</div>';
    else m = '<div class="pnote big">🔗 <a href="' + O.esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + O.esc(p.title || p.url) + '</a></div>';
    var attr = p.own ? '<span class="tag">моє</span>' : '<div class="dim small">' + (p.by ? O.esc(p.by) + ' · ' : '') + (p.license ? O.esc(p.license) + ' · ' : '') + O.esc(p.source || '') + (p.page ? ' · <a href="' + O.esc(p.page) + '" target="_blank" rel="noopener noreferrer">оригінал</a>' : '') + '</div>';
    lb.innerHTML = '<div class="pinbox"><button class="icon pclose" aria-label="Закрити">✕</button>' + m + '<h3 style="color:var(--text)">' + O.esc(p.title) + '</h3>' + attr +
      '<div class="row"><button class="btn ghost" data-ask>🤖 Запитай ШІ</button>' + (saved ? '<button class="btn ghost" data-del>Видалити</button>' : '<button class="btn" data-save>＋ До мого</button>') + '</div></div>';
    document.body.appendChild(lb);
    lb.onclick = function (e) { if (e.target === lb) lb.remove(); }; lb.querySelector('.pclose').onclick = function () { lb.remove(); };
    lb.querySelector('[data-ask]').onclick = function () { lb.remove(); O.openAsk && O.openAsk('Допоможи вивчити норвезькі слова за темою: «' + (p.title || p.note || 'зображення').slice(0, 100) + '». Дай 5 корисних слів із перекладом.'); };
    var d = lb.querySelector('[data-del]'); if (d) d.onclick = function () { if (!d.getAttribute('data-sure')) { d.setAttribute('data-sure', 1); d.textContent = 'Точно видалити?'; return; } O.pins.del(p.id).then(function () { lb.remove(); refresh(); }); };
    var sv = lb.querySelector('[data-save]'); if (sv) sv.onclick = function () {
      O.pins.all().then(function (a) { if (a.length >= MAXN) throw new Error('Забагато пінів (' + MAXN + ')'); var c = Object.assign({}, p, { id: id(), t: Date.now(), own: false }); delete c.blob; return O.pins.put(c); })
        .then(function () { O.toast('Збережено'); sv.disabled = true; sv.textContent = '✓ Збережено'; }).catch(function (e) { O.toast(e.message || 'Не вдалося зберегти', 3500); });
    };
  }
  O.renderPins = function (root) {
    cleanup(); var mode = 'mine', type = 'image', q = '', seq = 0;
    root.innerHTML = '<h2>Піни</h2><div class="tabs"><button class="chip" data-m="mine">📌 Мої</button><button class="chip" data-m="find">🔎 Знайти</button></div><div id="pbar"></div><div id="pgrid" class="pins"></div><div id="pmsg" class="dim small"></div>';
    var bar = root.querySelector('#pbar'), grid = root.querySelector('#pgrid'), msg = root.querySelector('#pmsg');
    function tabs() { O.$$('[data-m]', root).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === mode); b.onclick = function () { mode = b.getAttribute('data-m'); tabs(); draw(); }; }); }
    function fill(items, saved) { cleanup(); grid.innerHTML = ''; items.forEach(function (p) { grid.appendChild(pinEl(p, function (x) { lightbox(x, saved, draw); })); }); }
    function draw() {
      grid.innerHTML = ''; msg.textContent = '';
      if (mode === 'mine') {
        bar.innerHTML = '<div class="row"><label class="btn" style="cursor:pointer">＋ Фото / GIF / відео<input type="file" id="pf" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple hidden></label><button class="btn ghost" id="pn">✎ Нотатка</button><button class="btn ghost" id="pl">🔗 Посилання</button></div><div id="pform"></div>';
        bar.querySelector('#pf').onchange = function (e) {
          var fs = [].slice.call(e.target.files), n = 0; msg.textContent = 'Додаю…';
          fs.reduce(function (p, f) { return p.then(function () { return O.pins.addFile(f).then(function () { n++; }, function (er) { O.toast(f.name + ': ' + (er.message || er), 3500); }); }); }, Promise.resolve()).then(function () { e.target.value = ''; draw(); if (n) O.toast('Додано: ' + n); });
        };
        var f = bar.querySelector('#pform');
        bar.querySelector('#pn').onclick = function () { f.innerHTML = '<div class="panel"><input id="nt" maxlength="80" placeholder="Заголовок (необов’язково)"><textarea id="nb" rows="3" maxlength="600" placeholder="Нотатка: фраза, слово, цитата…"></textarea><button class="btn" id="ns">Зберегти</button></div>'; f.querySelector('#ns').onclick = function () { var b = clip(f.querySelector('#nb').value, 600); if (!b) return; O.pins.put({ id: id(), t: Date.now(), kind: 'note', title: clip(f.querySelector('#nt').value, 80) || b.slice(0, 40), note: b, own: true }).then(draw); }; };
        bar.querySelector('#pl').onclick = function () { f.innerHTML = '<div class="panel"><input id="lu" placeholder="https://…"><input id="lt" maxlength="80" placeholder="Назва"><button class="btn" id="ls">Зберегти</button></div>'; f.querySelector('#ls').onclick = function () { var u = okLink(f.querySelector('#lu').value.trim()); if (!u) { O.toast('Потрібна адреса http(s)://…'); return; } O.pins.put({ id: id(), t: Date.now(), kind: 'link', title: clip(f.querySelector('#lt').value, 80) || new URL(u).hostname, url: u, own: true }).then(draw); }; };
        O.pins.all().then(function (a) { if (!a.length) msg.textContent = 'Поки порожньо. Додай своє або знайди у відкритих джерелах («Знайти») і збережи.'; fill(a, true); }).catch(function (e) { msg.textContent = 'Сховище недоступне: ' + (e && e.message); });
      } else {
        bar.innerHTML = '<form class="row" id="pq"><input id="pqi" placeholder="Шукай: Tromsø, nordlys, sveising…" value="' + O.esc(q) + '" maxlength="80"><button class="btn" type="submit">🔎</button></form><div class="chips" id="pt"></div><div class="chips" id="pc"></div>' +
          '<p class="dim small">Джерела: Wikimedia Commons і Openverse (відкриті ліцензії). Автор і ліцензія показуються в картці.</p>';
        [['image', '🖼 Фото'], ['gif', 'GIF'], ['video', '🎬 Відео']].forEach(function (x) { var b = O.el('button', 'chip' + (type === x[0] ? ' on' : ''), x[1]); b.onclick = function () { type = x[0]; draw(); if (q) go(); }; bar.querySelector('#pt').appendChild(b); });
        CHIPS.forEach(function (c) { var b = O.el('button', 'chip', O.esc(c)); b.onclick = function () { q = c; bar.querySelector('#pqi').value = c; go(); }; bar.querySelector('#pc').appendChild(b); });
        bar.querySelector('#pq').onsubmit = function (e) { e.preventDefault(); q = clip(bar.querySelector('#pqi').value, 80); go(); };
        if (q) go();
      }
    }
    function go() {
      if (!q) return; var my = ++seq; msg.textContent = 'Шукаю…'; grid.innerHTML = '';
      O.pins.search(q, type).then(function (r) { if (my !== seq) return; msg.textContent = r.failed ? 'Джерела недоступні. Перевір інтернет і спробуй ще раз.' : r.items.length ? '' : 'Нічого не знайдено. Спробуй інше слово (англійською чи норвезькою).'; fill(r.items, false); });
    }
    tabs(); draw();
  };
  var w = O.go; /* звільняємо blob-адреси при виході з вкладки */
  O.go = function (v) { if (v !== 'pins') { cleanup(); var l = O.$('.pinlb'); if (l) l.remove(); } return w.apply(this, arguments); };
})();
