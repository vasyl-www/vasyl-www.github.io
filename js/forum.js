/* Форум: обговорення, у яких відповідають ШІ-персонажі. ШІ також сам публікує погоду, факти, жарти, меми, зображення й відео-посилання. */
(function () {
  var O = window.ORD, MAXT = 60, MAXP = 80, busy = false;
  var P = {
    per: { n: 'Per', role: 'майстер-зварювальник із Тромсе, 52 роки, жартівник, любить риболовлю', c: '#e08a3c' },
    kari: { n: 'Kari', role: 'тепла сусідка, організовує dugnad, питає про життя й погоду', c: '#5ec2a0' },
    magnus: { n: 'Meme-Magnus', role: 'мемний 24-річний, знає норвезькі інтернет-жарти, Tacofredag, утепиль, ціни', c: '#8a6cff' },
    lise: { n: 'Lise', role: 'чемна працівниця HR/NAV, пояснює правила, документи, права', c: '#4aa3df' },
    prof: { n: 'Professor Fakta', role: 'лектор, розповідає перевірені цікаві факти про Норвегію', c: '#d9648a' },
    ola: { n: 'Ola', role: 'молодий колега-практикант, ставить прості запитання новачку', c: '#c2b64a' }
  };
  var KIND = { weather: ['🌤', 'Погода', 'kari'], fact: ['💡', 'Факт', 'prof'], joke: ['😂', 'Жарт', 'per'], meme: ['🖼', 'Мем', 'magnus'], image: ['🎨', 'Зображення', 'kari'], video: ['🎬', 'Відео', 'ola'] };
  var WMO = { 0: ['ясно', 'klarvær'], 1: ['переважно ясно', 'for det meste klart'], 2: ['мінлива хмарність', 'delvis skyet'], 3: ['хмарно', 'overskyet'], 45: ['туман', 'tåke'], 48: ['паморозний туман', 'tåke'], 51: ['легка мряка', 'lett yr'], 53: ['мряка', 'yr'], 55: ['сильна мряка', 'tett yr'], 61: ['невеликий дощ', 'lett regn'], 63: ['дощ', 'regn'], 65: ['сильний дощ', 'kraftig regn'], 71: ['невеликий сніг', 'lett snø'], 73: ['сніг', 'snø'], 75: ['сильний сніг', 'kraftig snø'], 80: ['зливи', 'regnbyger'], 81: ['зливи', 'regnbyger'], 82: ['сильні зливи', 'kraftige regnbyger'], 85: ['снігові заряди', 'snøbyger'], 95: ['гроза', 'tordenvær'] };
  var SYS = 'Ти ведеш форум для дорослого українця, який вчить норвезьку (bokmål) і працює зварювальником у Тромсе. Пиши норвезькою рівня A2: короткі прості речення, без нюнорську. Кожен текст супроводжуй українським перекладом. Лише безпечний, дружній зміст без політики, образ і вульгарності. Відповідай лише JSON.';
  function st() { var f = O.state.forum = O.state.forum || { threads: [] }; return f; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function s(x, n) { return typeof x === 'string' ? x.trim().slice(0, n || 600) : ''; }
  /* SVG від ШІ показуємо лише через <img data:>, там скрипти не виконуються; додатково чистимо */
  function cleanSvg(x) {
    x = String(x || ''); var a = x.indexOf('<svg'), b = x.lastIndexOf('</svg>'); if (a < 0 || b < 0) return ''; x = x.slice(a, b + 6);
    x = x.replace(/<(script|foreignObject|image|iframe|use)[\s\S]*?(<\/\1>|\/>)/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/(xlink:)?href\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '');
    if (x.length > 7000) return ''; if (!/xmlns=/.test(x)) x = x.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'); return x;
  }
  function svgUrl(x) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x); }
  function wordsHtml(t) {
    return String(t).split(/([^A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+)/).map(function (p) { return /^[A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]{2,}$/.test(p) ? '<span class="fw" data-w="' + O.esc(p) + '">' + O.esc(p) + '</span>' : O.esc(p).replace(/\n/g, '<br>'); }).join('');
  }
  function ytUrl(q) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); }
  function ctxText(t) { return t.posts.slice(-10).map(function (p) { return (p.who === 'me' ? 'Vasyl' : P[p.who] ? P[p.who].n : p.who) + ': ' + (p.no || p.uk || ''); }).join('\n'); }

  /* ---- Тап по слову ---- */
  function wordPop(word, ctx) {
    var old = O.$('.popover'); if (old) old.remove(); var pop = O.el('div', 'popover'), tok = word.toLowerCase(); document.body.appendChild(pop);
    function show(e, local) {
      var inDeck = local ? O.card(local.id) : O.card('u:' + e.lemma.toLowerCase());
      pop.innerHTML = '<div class="pop-h"><b>' + O.esc((e.art ? e.art + ' ' : '') + e.lemma) + '</b><button class="icon" data-say>🔊</button></div>' + (e.pos ? '<span class="tag">' + O.esc(e.pos) + '</span>' : '') + '<div class="pop-tr">' + O.esc(e.uk) + '</div>' +
        '<div class="row">' + (inDeck ? '<span class="tag">у словнику</span>' : '<button class="btn" data-add>+ У словник</button>') + '<button class="btn ghost" data-tr>🌐 Детально</button><button class="btn ghost" data-x>✕</button></div>';
      pop.querySelector('[data-say]').onclick = function () { O.speak(e.lemma); }; pop.querySelector('[data-x]').onclick = function () { pop.remove(); };
      pop.querySelector('[data-tr]').onclick = function () { O.pendingTr = e.lemma; pop.remove(); O.go('translate'); };
      var a = pop.querySelector('[data-add]'); if (a) a.onclick = function () { if (local) O.addWord(local); else O.trAdd(e.full); O.toast('Додано: ' + e.lemma); pop.remove(); };
    }
    var loc = O.localLookup(word); if (loc) return show({ lemma: loc.no, art: loc.art, uk: loc.uk, pos: '' }, loc);
    pop.innerHTML = '<div class="dim">Шукаю «' + O.esc(word) + '»…</div>';
    O.trEntry(word, ctx).then(function (e) { if (!e.lemma || !e.meanings.length) throw new Error('порожньо'); show({ lemma: e.lemma, art: e.art, pos: e.pos, uk: e.meanings.slice(0, 3).map(function (m) { return m.uk; }).join('; '), full: e }); })
      .catch(function (er) { pop.innerHTML = '<div class="dim">' + O.esc(O.aiError(er)) + '</div><button class="btn ghost" data-x>✕</button>'; pop.querySelector('[data-x]').onclick = function () { pop.remove(); }; });
  }

  /* ---- Вигляд посту ---- */
  function postHtml(p, t) {
    var who = p.who === 'me' ? { n: 'Ти', c: '#7c5cff' } : (P[p.who] || { n: p.who, c: '#888' }), h = '<div class="fpost ' + (p.who === 'me' ? 'me' : '') + '"><div class="av" style="background:' + who.c + '">' + O.esc(who.n.charAt(0)) + '</div><div class="fbody"><div class="fwho"><b>' + O.esc(who.n) + '</b>' + (p.kind && p.kind !== 'text' ? ' <span class="tag">' + (KIND[p.kind] ? KIND[p.kind][0] + ' ' + KIND[p.kind][1] : p.kind) + '</span>' : '') + (p.gen ? ' <span class="gen ' + (p.gen.tier === 'free' ? 'free' : '') + '" title="Хто згенерував">✦ ' + O.esc(O.genLabel(p.gen)) + '</span>' : '') + ' <small class="dim">' + new Date(p.t).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</small></div>';
    if (p.kind === 'weather' && p.w) h += '<div class="wcard"><div class="wt">' + Math.round(p.w.t) + '°</div><div><b>' + O.esc(p.w.city) + '</b><div class="dim small">' + O.esc(p.w.uk) + ' · відчувається ' + Math.round(p.w.feels) + '° · вітер ' + Math.round(p.w.wind) + ' м/с</div><div class="dim small">день ' + Math.round(p.w.min) + '…' + Math.round(p.w.max) + '° · схід ' + O.esc(p.w.rise) + ' · захід ' + O.esc(p.w.set) + '</div></div></div>';
    if (p.svg && cleanSvg(p.svg)) h += '<div class="mimg"><img src="' + svgUrl(cleanSvg(p.svg)) + '" alt="' + O.esc(p.title || 'ілюстрація') + '">' + (p.top ? '<span class="mt t">' + O.esc(p.top) + '</span>' : '') + (p.bottom ? '<span class="mt b">' + O.esc(p.bottom) + '</span>' : '') + '</div>';
    if (p.title) h += '<div class="ftitle">' + O.esc(p.title) + '</div>';
    h += '<div class="no ftxt">' + wordsHtml(p.no || '') + '</div>';
    if (p.uk) h += '<div class="ftr dim" hidden>' + O.esc(p.uk) + '</div>';
    if (p.explain) h += '<div class="fact">' + O.esc(p.explain) + '</div>';
    if (p.fix) h += '<div class="corr">✏️ ' + O.esc(p.fix) + '</div>';
    if (p.q) h += '<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="' + O.esc(ytUrl(p.q)) + '">▶ Шукати на YouTube: ' + O.esc(p.q) + '</a><div class="dim small">Це пошук, а не конкретне відео: ШІ не може перевірити, що саме знайдеться.</div>';
    (p.links || []).forEach(function (u) { h += '<div><a target="_blank" rel="noopener noreferrer" href="' + O.esc(u) + '">' + O.esc(u.length > 60 ? u.slice(0, 57) + '…' : u) + '</a></div>'; });
    return h + '<div class="row small"><button class="icon" data-say title="Прослухати">🔊</button>' + (p.uk ? '<button class="icon" data-tg title="Переклад">🌐</button>' : '') + '</div></div></div>';
  }
  function bindPosts(box, t) {
    O.$$('.fpost', box).forEach(function (el, i) { var p = t.posts[i]; if (!p) return;
      var sy = el.querySelector('[data-say]'); if (sy) sy.onclick = function () { O.speak(p.no || p.title); };
      var tg = el.querySelector('[data-tg]'); if (tg) tg.onclick = function () { var x = el.querySelector('.ftr'); x.hidden = !x.hidden; };
    });
    box.onclick = function (e) { var w = e.target.getAttribute && e.target.getAttribute('data-w'); if (w) wordPop(w, ctxText(t)); };
  }

  /* ---- Дані від ШІ ---- */
  function aiReplies(t, msg, who) {
    var names = who.map(function (k) { return k + ' = ' + P[k].n + ' (' + P[k].role + ')'; }).join('\n');
    return O.aiJsonG(SYS + '\nУчасники, які можуть відповісти:\n' + names + '\nНапиши 1-' + Math.min(3, who.length) + ' коротких відповідей (1-3 речення) від різних персонажів, у їхньому характері, по суті повідомлення. Якщо користувач писав норвезькою з помилками, у "fix" коротко українською поясни найважливіші (або порожньо).\nФормат: {"replies":[{"who":"ключ","no":"","uk":""}],"fix":""}',
      [{ role: 'user', content: 'Тема: ' + t.title + '\nПопередні повідомлення:\n' + ctxText(t) + '\n\nНове повідомлення від Vasyl: ' + msg }], 1200).then(function (g) {
      var j = g.json; return { gen: g.gen, fix: s(j.fix, 400), replies: (Array.isArray(j.replies) ? j.replies : []).slice(0, 3).map(function (r) { return { who: P[r && r.who] ? r.who : who[0], no: s(r && r.no), uk: s(r && r.uk) }; }).filter(function (r) { return r.no; }) };
    });
  }
  function weather() {
    var city = O.state.settings.city || 'Tromsø';
    return fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=no&name=' + encodeURIComponent(city)).then(function (r) { return r.json(); }).then(function (g) {
      var l = g.results && g.results[0]; if (!l) throw new Error('місто не знайдено');
      return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + l.latitude + '&longitude=' + l.longitude + '&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&wind_speed_unit=ms&timezone=auto').then(function (r) { return r.json(); }).then(function (w) {
        var code = WMO[w.current.weather_code] || ['змінна погода', 'skiftende vær'], d = w.daily, hm = function (x) { return String(x || '').slice(11, 16) || '—'; };
        return { city: l.name, t: w.current.temperature_2m, feels: w.current.apparent_temperature, wind: w.current.wind_speed_10m, uk: code[0], no: code[1], min: d.temperature_2m_min[0], max: d.temperature_2m_max[0], rise: hm(d.sunrise[0]), set: hm(d.sunset[0]) };
      });
    });
  }
  function feedPost(kind, recent) {
    var avoid = 'Уникай тем: ' + (recent.join('; ') || 'немає') + '. ';
    var T = {
      fact: avoid + 'Один справжній, перевірюваний цікавий факт про Норвегію (природа, мова, побут, праця). Не вигадуй цифр. {"title":"","no":"2-3 речення","uk":"переклад"}',
      joke: avoid + 'Короткий чистий жарт норвезькою (гра слів або побутовий), потім у "explain" українською поясни, чому смішно й які слова важливі. {"title":"","no":"","uk":"","explain":""}',
      meme: avoid + 'Відтвори в тексті мем у норвезькому дусі (Tacofredag, ціни, погода, dugnad, утепиль, брунст). Ти НЕ копіюєш конкретну картинку, а робиш власну версію формату. "svg": дуже проста ілюстрація (viewBox 0 0 320 200, прості фігури, без тексту, до 1800 символів), "top" і "bottom" — короткі підписи норвезькою. "explain" — українською, у чому жарт. {"title":"","top":"","bottom":"","svg":"<svg ...>","no":"підпис одним реченням","uk":"","explain":""}',
      image: avoid + 'Намалюй простою SVG-ілюстрацією (viewBox 0 0 320 200, плоскі фігури, до 2500 символів, без тексту) сцену з норвезького життя й підпиши 1-2 реченнями. {"title":"","svg":"<svg ...>","no":"","uk":""}',
      video: avoid + 'Запропонуй тему відео для вивчення норвезької або про життя в Норвегії. Не вигадуй URL: дай лише пошуковий запит для YouTube норвезькою. {"title":"","no":"чому варто подивитись, 1-2 речення","uk":"","q":"пошуковий запит"}'
    };
    return O.aiJsonG(SYS + ' ' + T[kind], [{ role: 'user', content: 'Створи публікацію (' + kind + ').' }], 1800);
  }

  /* ---- Екрани ---- */
  function save() { var f = st(); f.threads = f.threads.slice(0, MAXT); O.save(); }
  O.renderForum = function (root) {
    var f = st(), cur = null;
    function list() {
      root.innerHTML = '<h2>Форум</h2><p class="dim small">Став запитання чи починай обговорення, а персонажі відповідають. ШІ сам публікує погоду, факти, жарти, меми й теми для відео. Тап по слову: переклад і додавання в словник.</p>' +
        '<div class="row"><button class="btn" id="fnew">+ Нове обговорення</button></div><div class="chips" id="fk">' + Object.keys(KIND).map(function (k) { return '<button class="chip" data-k="' + k + '">' + KIND[k][0] + ' ' + KIND[k][1] + '</button>'; }).join('') + '</div><div class="row small dim">Місто для погоди: <input id="fcity" style="max-width:180px" value="' + O.esc(O.state.settings.city || 'Tromsø') + '"></div><div id="fst" class="dim small"></div><div id="ftl"></div>';
      var box = root.querySelector('#ftl'); if (!f.threads.length) box.innerHTML = '<div class="panel dim">Поки немає обговорень. Натисни «+ Нове обговорення» або один зі значків вище.</div>';
      f.threads.forEach(function (t) { var last = t.posts[t.posts.length - 1], b = O.el('button', 'story thr-i', '<b>' + O.esc(t.title) + '</b><small class="dim">' + t.posts.length + ' повідомлень · ' + (last && last.who !== 'me' && P[last.who] ? O.esc(P[last.who].n) + ': ' : '') + O.esc(((last && (last.no || last.title)) || '').slice(0, 70)) + '</small>'); b.onclick = function () { open(t); }; box.appendChild(b); });
      root.querySelector('#fnew').onclick = compose;
      root.querySelector('#fcity').onchange = function (e) { O.state.settings.city = e.target.value.trim() || 'Tromsø'; O.save(); };
      O.$$('[data-k]', root).forEach(function (b) { b.onclick = function () { feed(b.getAttribute('data-k'), root.querySelector('#fst')); }; });
    }
    function feed(kind, status) {
      if (busy) return; busy = true; var K = KIND[kind]; status.textContent = K[1] + ': готую…';
      var recent = f.threads.filter(function (t) { return t.kind === kind; }).slice(0, 6).map(function (t) { return t.title; });
      var pr = kind === 'weather' ? weather().then(function (w) { return O.aiJsonG(SYS + ' Ти ' + P.kari.n + '. Прокоментуй погоду в 1-2 реченнях і порадь, що вдягнути для роботи на вулиці. Не змінюй цифр. {"no":"","uk":""}', [{ role: 'user', content: JSON.stringify(w) }], 500).catch(function () { return { gen: null, json: { no: 'I dag er det ' + Math.round(w.t) + ' grader i ' + w.city + ': ' + w.no + '.', uk: 'Сьогодні ' + Math.round(w.t) + ' градусів у ' + w.city + ': ' + w.uk + '.' } }; }).then(function (g) { var c = g.json; return { json: { title: 'Været i ' + w.city, no: s(c.no), uk: s(c.uk), w: w }, gen: g.gen }; }); }) : feedPost(kind, recent);
      pr.then(function (g) {
        var j = g.json, no = s(j.no) || (j.top ? j.top + ' ' + (j.bottom || '') : ''); if (!no && !j.svg) throw new Error('ШІ повернув порожню відповідь');
        var post = { id: uid(), t: Date.now(), who: K[2], kind: kind, title: s(j.title, 120), no: no, uk: s(j.uk), explain: s(j.explain, 500), top: s(j.top, 80), bottom: s(j.bottom, 80), svg: cleanSvg(j.svg), q: s(j.q, 120), w: j.w, gen: O.cleanGen(g.gen) };
        if ((kind === 'meme' || kind === 'image') && !post.svg) throw new Error('ШІ не зміг намалювати ілюстрацію, спробуй ще раз');
        var t = { id: uid(), title: post.title || K[1], kind: kind, created: Date.now(), posts: [post] }; f.threads.unshift(t); save(); status.textContent = ''; busy = false; if (kind !== 'weather' && O.shareContent) O.shareContent(kind, post); open(t);
      }).catch(function (er) { busy = false; status.innerHTML = '<span class="warn">' + O.esc(kind === 'weather' && !(er && er.code) ? 'Погода недоступна: ' + (er.message || er) + '. Потрібен інтернет і доступ до open-meteo.com (в артефакті мережу заблоковано, у файлі ord2.html працює).' : O.aiError(er)) + '</span>'; });
    }
    function compose() {
      root.innerHTML = '<h2>Нове обговорення</h2><input id="ct" placeholder="Тема (напр.: Що брати на співбесіду?)"><textarea id="cm" rows="4" placeholder="Твоє перше повідомлення, норвезькою або українською"></textarea><div class="row">' +
        Object.keys(P).map(function (k) { return '<label class="chip"><input type="checkbox" value="' + k + '"' + (k === 'per' || k === 'kari' ? ' checked' : '') + '> ' + P[k].n + '</label>'; }).join('') + '</div><div class="row"><button class="btn" id="cgo">Створити</button><button class="btn ghost" id="cx">Назад</button><span class="dim small" id="cs"></span></div>';
      root.querySelector('#cx').onclick = list;
      root.querySelector('#cgo').onclick = function () {
        var title = root.querySelector('#ct').value.trim(), msg = root.querySelector('#cm').value.trim(), who = O.$$('input:checked', root).map(function (c) { return c.value; });
        if (!title || !msg) return O.toast('Потрібні тема й повідомлення'); if (!who.length) return O.toast('Обери хоча б одного персонажа');
        var t = { id: uid(), title: title.slice(0, 120), kind: 'text', created: Date.now(), who: who, posts: [{ id: uid(), t: Date.now(), who: 'me', kind: 'text', no: msg.slice(0, 800), links: msg.match(/https?:\/\/[^\s]+/g) || [] }] };
        f.threads.unshift(t); save(); open(t, true);
      };
    }
    function open(t, ask) {
      cur = t; root.innerHTML = '<div class="row"><button class="btn ghost" id="fb">← Усі обговорення</button><button class="btn ghost" id="fd">Видалити</button></div><h2>' + O.esc(t.title) + '</h2><div id="fp"></div><div id="fs" class="dim small"></div>' +
        '<div class="row"><textarea id="fm" rows="2" placeholder="Напиши відповідь (Enter — надіслати)"></textarea><button class="btn" id="fsend">Надіслати</button></div><div class="row small dim">Хто відповідає: ' + Object.keys(P).map(function (k) { return '<label class="chip"><input type="checkbox" data-p="' + k + '"' + (!t.who || t.who.indexOf(k) >= 0 || (t.kind !== 'text' && P[k] && KIND[t.kind] && KIND[t.kind][2] === k) ? ' checked' : '') + '> ' + P[k].n + '</label>'; }).join('') + '</div>';
      var fp = root.querySelector('#fp'), stt = root.querySelector('#fs');
      function draw() { fp.innerHTML = t.posts.map(function (p) { return postHtml(p, t); }).join(''); bindPosts(fp, t); }
      draw();
      root.querySelector('#fb').onclick = list;
      root.querySelector('#fd').onclick = function () { var b = this; if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', 1); b.textContent = 'Точно видалити?'; return; } f.threads = f.threads.filter(function (x) { return x !== t; }); save(); list(); };
      function reply(msg) {
        var who = O.$$('[data-p]:checked', root).map(function (c) { return c.getAttribute('data-p'); }); if (!who.length) who = [t.who && t.who[0] || 'per'];
        stt.textContent = 'Персонажі пишуть…'; busy = true;
        aiReplies(t, msg, who).then(function (r) {
          r.replies.forEach(function (x, i) { t.posts.push({ id: uid(), t: Date.now() + i, who: x.who, kind: 'text', no: x.no, uk: x.uk, gen: O.cleanGen(r.gen) }); });
          if (r.fix) t.posts[t.posts.length - 1].fix = r.fix; t.posts = t.posts.slice(-MAXP); save(); stt.textContent = ''; busy = false; draw();
        }).catch(function (er) { busy = false; stt.innerHTML = '<span class="warn">' + O.esc(O.aiError(er)) + '</span>'; });
      }
      function send() {
        var ta = root.querySelector('#fm'), v = ta.value.trim(); if (!v || busy) return; ta.value = '';
        t.posts.push({ id: uid(), t: Date.now(), who: 'me', kind: 'text', no: v.slice(0, 800), links: v.match(/https?:\/\/[^\s]+/g) || [] }); save(); draw(); reply(v);
      }
      root.querySelector('#fsend').onclick = send; root.querySelector('#fm').onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
      if (ask) reply(t.posts[0].no);
    }
    list();
  };
  O.forumUI = { postHtml: postHtml, bindPosts: bindPosts, KIND: KIND, P: P, cleanSvg: cleanSvg, uid: uid };
  /* Додає публікацію (наприклад зі спільноти) у власний форум як нове обговорення */
  O.forumAdd = function (kind, post) {
    var K = KIND[kind] || KIND.fact, f = st(), p = Object.assign({ id: uid(), t: Date.now(), who: K[2], kind: kind }, post, { svg: cleanSvg(post.svg) });
    var t = { id: uid(), title: p.title || K[1], kind: kind, created: Date.now(), posts: [p] }; f.threads.unshift(t); save(); return t;
  };
})();
