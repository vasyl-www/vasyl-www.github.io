/* Стрічка пінів від ШІ: 10-30 нових пінів на день. ШІ пише факти, фрази, жарти й підписи, малює прості SVG, а для фото й GIF
   вигадує пошуковий запит, і картинка береться з відкритих джерел (Wikimedia Commons / Openverse). Кожен пін підписаний моделлю.
   Без ключа ШІ стрічку наповнюють вбудовані пін-слова з твого словника. Генерація запускається лише коли відкриваєш стрічку. */
(function () {
  var O = window.ORD, MIN = 10, MAX = 30, KEEP_DAYS = 7, BATCH = 10, running = false;
  function day() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function st() { var s = O.state; s.pinsAi = s.pinsAi || { day: '', n: 0, per: 15 }; if (s.pinsAi.day !== day()) { s.pinsAi.day = day(); s.pinsAi.n = 0; } return s.pinsAi; }
  function clip(x, n) { return typeof x === 'string' ? x.replace(/<[^>]*>/g, '').trim().slice(0, n) : ''; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  var SYS = 'Ти куратор стрічки в стилі Pinterest для українця-зварювальника, який живе в Тромсе й вчить норвезьку (bokmål, A1-A2). Поверни ЛИШЕ JSON {"pins":[...]} з рівно N елементів різних типів:\n' +
    '{"t":"fact"|"phrase"|"joke","title":"короткий заголовок (до 50 символів)","no":"1-2 прості речення норвезькою","uk":"переклад українською"}\n' +
    '{"t":"photo"|"gif","title":"підпис норвезькою","uk":"переклад","query":"2-3 слова для пошуку фото (англійською або норвезькою), конкретний предмет чи місце"}\n' +
    '{"t":"svg","title":"підпис норвезькою","uk":"переклад","svg":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 200 200\\">проста плоска ілюстрація, до 900 символів, без скриптів і зовнішніх посилань</svg>"}\n' +
    'Пропорція: ~35% fact/phrase/joke, ~50% photo (1 з 10 може бути gif), не більше 1 svg на 10. Теми: Норвегія й Тромсе, зварювання й майстерня, інструменти, їжа, природа й погода, побут, робота, слова з вивчення. Норвезька проста й правильна; не вигадуй фактів.';
  function build(n, recent, mine) {
    return [{ role: 'user', content: 'N=' + n + '. Не повторюй ці заголовки: ' + (recent.join('; ') || 'немає') + '. Слова, які учень вчить: ' + (mine.join(', ') || 'sveise, verksted, jobb') + '.' }];
  }
  function fromAi(j, gen, d) {
    var t = String(j.t || ''), p = { id: O.pins.id(), t: Date.now(), from: 'ai', day: d, gen: gen, title: clip(j.title, 80), no: clip(j.no, 400), uk: clip(j.uk, 400) };
    if (['fact', 'phrase', 'joke'].indexOf(t) >= 0) { if (!p.no) return null; p.kind = 'note'; p.note = p.no; p.sub = t; if (!p.title) p.title = p.no.slice(0, 40); return p; }
    if (t === 'svg') { var s = O.forumUI && O.forumUI.cleanSvg ? O.forumUI.cleanSvg(String(j.svg || '').slice(0, 4000)) : ''; if (!s) return null; p.kind = 'svg'; p.svg = s; return p; }
    if (t === 'photo' || t === 'gif') { var q = clip(j.query, 60); if (!q) return null; p.kind = t === 'gif' ? 'gif' : 'image'; p.query = q; return p; }
    return null;
  }
  function resolve(p, taken) {   // фото й GIF: шукаємо реальну картинку; нічого не знайшли → пін стає текстовою карткою
    if (!p.query) return Promise.resolve(p);
    return O.pins.search(p.query, p.kind === 'gif' ? 'gif' : 'image').then(function (r) {
      var c = (r.items || []).filter(function (x) { return x.kind === p.kind && !taken[x.src]; }).slice(0, 6), x = c.length ? c[rnd(c.length)] : null;
      if (!x) { if (p.kind === 'gif') return resolve(Object.assign(p, { kind: 'image' }), taken); p.kind = 'note'; p.note = p.no || p.title; delete p.query; return p; }
      taken[x.src] = 1; p.src = x.src; p.by = x.by; p.license = x.license; p.page = x.page; p.source = x.source; p.w = x.w; p.h = x.h; if (!p.title) p.title = x.title; return p;
    }).catch(function () { p.kind = 'note'; p.note = p.no || p.title; delete p.query; return p; });
  }
  function local(n, d, existing) {
    var have = {}; existing.forEach(function (x) { if (x.wid) have[x.wid] = 1; });
    var ws = (O.words || []).filter(function (w) { return !have[w.id] && w.no && w.uk; }), out = [];
    while (out.length < n && ws.length) { var w = ws.splice(rnd(ws.length), 1)[0]; out.push({ id: O.pins.id(), t: Date.now() + out.length, from: 'ai', day: d, wid: w.id, gen: { builtin: true }, kind: 'note', sub: 'word', title: (w.art ? w.art + ' ' : '') + w.no, no: w.ex || w.no, note: w.ex || w.no, uk: w.uk + (w.exUk ? ' — ' + w.exUk : '') }); }
    return out;
  }
  O.pinsAi = {
    state: st, MIN: MIN, MAX: MAX,
    label: function (g) { return g && g.builtin ? 'вбудовано · без ШІ' : O.genLabel(g); },
    tierOf: function (p) { return p.gen && p.gen.builtin ? 'builtin' : (p.gen && p.gen.tier === 'free' ? 'free' : 'paid'); },
    /* Згенерувати n пінів (у межах добового ліміту 30). Повертає {added, ai, local, error} */
    generate: function (n, progress) {
      if (running) return Promise.resolve({ added: 0, busy: true });
      var s = st(); n = Math.max(0, Math.min(n, MAX - s.n)); if (!n) return Promise.resolve({ added: 0, cap: true });
      running = true; var d = day(), res = { added: 0, ai: 0, local: 0, error: '' };
      return O.pins.all().then(function (all) {
        var cut = Date.now() - KEEP_DAYS * 864e5, old = all.filter(function (x) { return x.from === 'ai' && x.t < cut; }), taken = {}, recent = [];
        all.forEach(function (x) { if (x.src) taken[x.src] = 1; if (x.from === 'ai' && recent.length < 40) recent.push(x.title); });
        var mine = Object.keys(O.state.cards).slice(-25).map(function (k) { return O.wordById[k] && O.wordById[k].no; }).filter(Boolean);
        return Promise.all(old.map(function (x) { return O.pins.del(x.id); })).then(function () {
          var left = n, errStop = false;
          function step() {
            if (left <= 0 || errStop) return Promise.resolve();
            var b = Math.min(BATCH, left);
            progress && progress('Генерую піни: ' + (n - left) + ' з ' + n + '…');
            return O.aiJsonG(SYS, build(b, recent, mine), 3000).then(function (g) {
              var raw = Array.isArray(g.json && g.json.pins) ? g.json.pins.slice(0, b + 2) : [], gen = O.cleanGen(g.gen) || g.gen;
              var ps = raw.map(function (j) { return fromAi(j, gen, d); }).filter(Boolean).slice(0, b);
              return Promise.all(ps.map(function (p) { return resolve(p, taken); })).then(function (done) {
                return Promise.all(done.map(function (p) { return O.pins.put(p).then(function () { recent.unshift(p.title); res.added++; res.ai++; s.n++; left--; }); }));
              }).then(function () { if (!ps.length) { errStop = true; res.error = 'ШІ повернув порожню відповідь'; } });
            }).catch(function (e) { errStop = true; res.error = O.aiError ? O.aiError(e) : String(e && e.message || e); }).then(step);
          }
          return step().then(function () {
            var need = Math.max(0, Math.min(left, MIN - Math.min(MIN, s.n)));   // ШІ недоступний: хоча б мінімум із вбудованого
            if (!need) return; var ls = local(need, d, all); return Promise.all(ls.map(function (p) { return O.pins.put(p); })).then(function () { res.local = ls.length; res.added += ls.length; s.n += ls.length; });
          });
        });
      }).then(function () { O.save(); running = false; return res; }, function (e) { running = false; res.error = res.error || String(e && e.message || e); return res; });
    },
    busy: function () { return running; }
  };
})();
