/* Тексти зі слів, які ти вже бачив: ~96% відомих + 4% нових (за замовчуванням). «Відоме» = картки, слова з читалки й перекладача, відмічені «знаю».
   Покриття ШІ не вгадуємо, а рахуємо самі: невідоме поза цільовими словами >3% → одна повторна спроба. Нові слова додаються в картки. */
(function () {
  var O = window.ORD;
  var FUNC = {};
  ('og i på er jeg du han hun vi de dere det den en et ei som med til av for ikke har var ble blir kan vil skal må får vet her der nå så men eller fra om å at hva hvor hvem når hvorfor hvordan ja nei takk hei da ut inn opp ned over under etter før mellom hos ved mot uten alle noe noen ingen mye lite mer mest veldig også bare bra god godt min mitt mi mine din ditt di dine hans hennes vår vårt våre deres sin sitt si sine denne dette disse der hvis fordi mens at selv hver hele ofte alltid aldri snart igjen ' +
    'null ett to tre fire fem seks sju syv åtte ni ti elleve tolv tjue hundre tusen første andre i dag i går i morgen').split(' ').forEach(function (w) { FUNC[w] = 1; });
  var TOPICS = {
    home: ['🏠 Побут', 'house', function (w) { return w.deck !== 'work' && /Hverdag|Mat|Praktisk|Andre/.test(w.cat); }],
    work: ['🔧 Робота', 'weld', function (w) { return w.deck === 'work' || w.cat === 'Arbeid'; }],
    shop: ['🛒 Магазин', 'cart', function (w) { return /Mat|Praktisk/.test(w.cat); }],
    weather: ['❄️ Погода', 'snow', function (w) { return w.cat === 'Natur'; }],
    doc: ['🏥 Лікар і NAV', 'cross', function (w) { return w.cat === 'Praktisk'; }],
    day: ['📅 Мій день', 'cup', function () { return true; }]
  };
  var TNAME = { home: 'everyday life at home (kitchen, family, hall, things)', work: 'work as a welder / at the workshop (safety, tools, tasks, colleagues)', shop: 'shopping and food', weather: 'weather, seasons and going outside in Troms', doc: 'visiting a doctor or the NAV / public office', day: 'an ordinary day: morning, work, evening' };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function dkey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function seenIds() {
    var s = {}, st = O.state;
    Object.keys(st.cards || {}).forEach(function (k) { s[k] = 1; }); Object.keys(st.seenW || {}).forEach(function (k) { s[k] = 1; });
    Object.keys(st.cache || {}).forEach(function (k) { var c = st.cache[k]; if (c && c.id) s[c.id] = 1; });
    Object.keys(st.mindEv || {}).forEach(function (k) { if (st.mindEv[k] && st.mindEv[k].met) s[k] = 1; });
    return s;
  }
  function tokens(text) { return String(text || '').split(/([^A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+)/).filter(function (p) { return /^[A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+$/.test(p); }); }
  /* Покриття: f службові, k відомі, t цільові нові, u невідомі. Власні назви (з великої не на початку речення) вважаємо відомими. */
  function coverage(text, targetIds) {
    var seen = seenIds(), sno = {}, T = {}, n = 0, c = { f: 0, k: 0, t: 0, u: 0 }, unk = {}; (targetIds || []).forEach(function (i) { T[i] = 1; });
    Object.keys(seen).forEach(function (id) { var w = O.wordById[id]; if (w) sno[w.no.toLowerCase()] = 1; });
    String(text || '').split(/(?<=[.!?])\s+|\n+/).forEach(function (sent) {
      tokens(sent).forEach(function (tok, i) {
        var l = tok.toLowerCase(); if (l.length < 2 && !FUNC[l]) return; n++;
        if (FUNC[l] || O.state.known[l]) { c.f++; return; }
        var w = O.localLookup(tok);
        if (w && T[w.id]) { c.t++; return; }
        if ((w && seen[w.id]) || sno[l]) { c.k++; return; }
        if (i > 0 && /^[A-ZÆØÅ]/.test(tok)) { c.f++; return; }
        c.u++; unk[l] = 1;
      });
    });
    return { n: n, funcShare: n ? c.f / n : 0, knownShare: n ? (c.f + c.k) / n : 0, targetShare: n ? c.t / n : 0, unknownShare: n ? c.u / n : 0, unknown: Object.keys(unk) };
  }
  function knownList() {
    var st = O.state, ids = {}, out = [], weak = [], rest = [];
    Object.keys(st.cards || {}).forEach(function (id) { var c = st.cards[id], w = O.wordById[id]; if (!w || (w.multi)) return; ids[id] = 1; (c.lapses >= 2 || c.st === 'learn' ? weak : rest).push(w.no); });
    Object.keys(st.seenW || {}).forEach(function (id) { var w = O.wordById[id]; if (w && !ids[id] && !w.multi) { ids[id] = 1; rest.push(w.no); } });
    Object.keys(st.cache || {}).forEach(function (k) { var c = st.cache[k]; if (c && c.id && O.wordById[c.id] && !ids[c.id]) { ids[c.id] = 1; rest.push(O.wordById[c.id].no); } });
    out = weak.slice(0, 40).concat(O.shuffle(rest).slice(0, 260 - Math.min(40, weak.length))); return { list: out, count: weak.length + rest.length };
  }
  function pickTargets(topic, k) {
    var seen = seenIds(), f = TOPICS[topic][2];
    var pool = O.words.filter(function (w) { return !seen[w.id] && !w.multi && f(w); });
    if (pool.length < k) pool = pool.concat(O.words.filter(function (w) { return !seen[w.id] && !w.multi && pool.indexOf(w) < 0; }));
    return O.shuffle(pool.slice(0, 40)).slice(0, k);
  }
  function used() { var x = O.state.tg && O.state.tg.day; return x && x.d === dkey() ? x.n : 0; }
  function cap() { return O.state.settings.tgCap || 6; }
  function ask(topic, len, targets, extraN, known, fix) {
    var sys = 'You write short reading texts in Norwegian bokmål for an adult Ukrainian learner (A1-A2) who lives in Lyngen, Troms. Topic: ' + TNAME[topic] + '. Length: about ' + len + ' words in 6-12 simple sentences, simple present or past tense, natural everyday style. ' +
      'Use ONLY words from KNOWN (any inflection) plus very common function words, numbers and proper names. Introduce exactly the NEW words (each 2-3 times, understandable from context) and no other unfamiliar words. ' +
      'Reply with strict JSON only: {"title":"short Norwegian title","s":[["Norwegian sentence","Ukrainian translation"]],"extra":[{"no":"base form, nouns with en/ei/et","uk":"Ukrainian"}]}. "extra" lists the new words you added beyond NEW, and must contain exactly EXTRA_COUNT items.';
    var user = 'KNOWN: ' + known.list.join(', ') + '\nNEW: ' + targets.map(function (w) { return (w.art ? w.art + ' ' : '') + w.no + ' (' + w.uk + ')'; }).join('; ') + '\nEXTRA_COUNT: ' + extraN + (fix ? '\nFIX: these words are not in KNOWN, rewrite using only KNOWN words instead: ' + fix.join(', ') : '');
    return O.aiJsonG(sys, [{ role: 'user', content: user }], 2500);
  }
  function parse(j) {
    var pairs = (Array.isArray(j && j.s) ? j.s : []).slice(0, 16).map(function (x) { return Array.isArray(x) ? [String(x[0] || '').trim().slice(0, 220), String(x[1] || '').trim().slice(0, 260)] : null; }).filter(function (x) { return x && x[0] && x[1]; });
    return { title: String((j && j.title) || 'Текст зі слів, які я знаю').slice(0, 100), pairs: pairs, extra: (Array.isArray(j && j.extra) ? j.extra : []).slice(0, 6).map(function (e) { return { no: String(e && e.no || '').trim().slice(0, 200), uk: String(e && e.uk || '').trim().slice(0, 80) }; }).filter(function (e) { return e.no && e.uk; }) };
  }
  function make(opt) {
    opt = opt || {}; var topic = TOPICS[opt.topic] ? opt.topic : 'day', len = opt.len || 90, pct = opt.pct || 0.04;
    if (used() >= cap()) return Promise.reject(Object.assign(new Error('cap'), { code: 'cap' }));
    var K = Math.max(2, Math.round(len * pct)), targets = pickTargets(topic, K), extraN = K - targets.length, known = knownList();
    var tids = targets.map(function (w) { return w.id; }), best = null;
    function attempt(fix) {
      return ask(topic, len, targets, extraN, known, fix).then(function (g) {
        var p = parse(g.json); if (p.pairs.length < 4) throw Object.assign(new Error('empty'), { code: 'empty' });
        var text = p.pairs.map(function (x) { return x[0]; }).join(' '), extraTok = p.extra.map(function (e) { return e.no.replace(/^(en|ei|et) /, '').toLowerCase(); });
        var cv = coverage(text, tids); var mark = tokens(text).filter(function (t) { return extraTok.indexOf(t.toLowerCase()) >= 0; }).length; cv.targetShare += cv.n ? mark / cv.n : 0; cv.unknownShare = Math.max(0, cv.unknownShare - (cv.n ? mark / cv.n : 0));
        var r = { p: p, g: g, cv: cv, text: text }; if (!best || cv.unknownShare < best.cv.unknownShare) best = r; return r;
      });
    }
    return attempt(null).then(function (r) { if (r.cv.unknownShare > 0.03) return attempt(r.cv.unknown.slice(0, 12)).catch(function () { return r; }); return r; }).then(function (r) {
      r = best || r; var added = [], p = r.p;
      targets.forEach(function (w) { if (O.addWord(w)) added.push(w.no); (O.state.seenW = O.state.seenW || {})[w.id] = Date.now(); });
      var extraIds = p.extra.map(function (e) {
        var m = /^(en|ei|et) (.+)$/.exec(e.no), lem = m ? m[2] : e.no, loc = O.localLookup(lem), w = loc || { id: 'tg_' + hash(e.no), deck: 'mine', cat: 'Mine', art: m ? m[1] : '', no: lem, uk: e.uk, ex: '', exUk: '' };
        if (O.addWord(w)) added.push(w.no); (O.state.seenW = O.state.seenW || {})[w.id] = Date.now(); return w.id;
      });
      var st = { id: 'g' + Date.now().toString(36), title: p.title, lvl: known.count < 200 ? 'A1' : 'A2', theme: TOPICS[topic][1], s: p.pairs, no: p.pairs.map(function (x) { return x[0]; }).join(' '), uk: p.pairs.map(function (x) { return x[1]; }).join(' '), gen: O.cleanGen ? O.cleanGen(r.g.gen) : null, mine: true,
        tg: { topic: topic, ids: tids.concat(extraIds), cov: { n: r.cv.n, target: +r.cv.targetShare.toFixed(3), unknown: +r.cv.unknownShare.toFixed(3) } } };
      O.state.myStories = [st].concat(O.state.myStories || []).slice(0, 200); O.state.settings.libLvl = 'all';
      var tg = O.state.tg = O.state.tg || {}; tg.t = Date.now(); tg.known = known.count; tg.n = (tg.n || 0) + 1; tg.day = { d: dkey(), n: used() + 1 }; O.save(); if (O.tele) O.tele.ev('textgen');
      return { story: st, added: added, cv: r.cv };
    });
  }
  function panel(box, open, refresh) {
    var s = O.state.settings, kn = knownList(), topic = TOPICS[s.tgTopic] ? s.tgTopic : 'day', len = s.tgLen || 90, pct = s.tgPct || 4;
    box.innerHTML = '<div class="panel tgp"><h3>✨ Текст зі слів, які я знаю</h3><div class="chips" id="tgt">' + Object.keys(TOPICS).map(function (k) { return '<button class="chip' + (k === topic ? ' on' : '') + '" data-k="' + k + '">' + TOPICS[k][0] + '</button>'; }).join('') + '</div>' +
      '<div class="row"><label class="small">Слів <select id="tgl">' + [60, 90, 120].map(function (n) { return '<option' + (n === len ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><label class="small">Нових, % <select id="tgn">' + [2, 4, 6, 8].map(function (n) { return '<option' + (n === pct ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="dim small">Відомих і баченихслів у твоєму словнику: <b>' + kn.count + '</b>. Нових слів у тексті ≈ ' + pct + '%: за дослідженнями розуміння краще, коли невідомих слів 2–5%. Нові слова додаються в картки.</div>' +
      '<div class="row"><button class="btn big" id="tgo">✨ Створити текст</button></div><div class="dim small" id="tgm"></div></div>';
    O.$$('[data-k]', box).forEach(function (b) { b.onclick = function () { s.tgTopic = b.getAttribute('data-k'); O.save(); O.$$('[data-k]', box).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    box.querySelector('#tgl').onchange = function (e) { s.tgLen = +e.target.value; O.save(); }; box.querySelector('#tgn').onchange = function (e) { s.tgPct = +e.target.value; O.save(); };
    box.querySelector('#tgo').onclick = function () {
      var b = box.querySelector('#tgo'), m = box.querySelector('#tgm'); b.disabled = true; m.textContent = 'Пишу текст і перевіряю покриття…';
      make({ topic: s.tgTopic || 'day', len: s.tgLen || 90, pct: (s.tgPct || 4) / 100 }).then(function (r) {
        b.disabled = false; m.textContent = ''; O.toast('Додано слів у картки: ' + r.added.length, 3000); if (refresh) refresh(); open(r.story);
      }, function (e) { b.disabled = false; m.textContent = e && e.code === 'cap' ? 'Денний ліміт текстів (' + cap() + ') вичерпано.' : e && e.code === 'empty' ? 'ШІ повернув порожню відповідь, спробуй ще раз.' : O.aiError(e); });
    };
  }
  /* Звіт: що й як читаєш (лише лічильники) */
  function stats() {
    var r = O.state.read || {}, ids = Object.keys(r).filter(function (k) { return r[k] && r[k].n; }); if (!ids.length) return null;
    var lk = 0, n = 0, rate = { easy: 0, ok: 0, hard: 0 }, cov = 0, ms = 0; ids.forEach(function (k) { var e = r[k]; lk += e.lk || 0; n += e.n; cov += e.cov || 0; ms += e.ms || 0; if (e.rate) rate[e.rate]++; });
    return { textsRead: ids.length, wordsRead: n, lookupsPer100Words: n ? +(lk / n * 100).toFixed(1) : null, avgCoverageKnown: +(cov / ids.length).toFixed(3), avgReadMinutes: +(ms / ids.length / 60000).toFixed(1), selfRating: rate, generatedTexts: (O.state.tg && O.state.tg.n) || 0,
      note: 'Лічильники читання: підглядання на 100 слів і самооцінка (легко/нормально/важко) — єдині показники ефекту; час не поправлений на паузи; обсяг малий.' };
  }
  function suggest() { var t = O.state.tg || {}, kn = knownList().count; return kn >= 20 && (!t.t || kn - (t.known || 0) >= 5) && used() < cap(); }
  O.textgen = { make: make, coverage: coverage, panel: panel, knownList: knownList, stats: stats, suggest: suggest, TOPICS: TOPICS, seenIds: seenIds };
})();
