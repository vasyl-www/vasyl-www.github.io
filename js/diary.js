/* Щоденник: розповідь про день змішаною норвезькою й українською. Правила (O.rules, форми дієслів) + ШІ дають переклад, виправлення,
   розмовні варіанти й синоніми; виправлені речення йдуть у повторення, помилки у вкладку «Помилки».
   Скрита статистика (частка української, помилки за типами) лежить у state.diary як лічильники без тексту й іде лише у звіт. */
(function () {
  var O = window.ORD;
  var TOPICS = { past: ['I går', 'минуле'], present: ['I dag', 'теперішній'], future: ['I morgen', 'майбутнє'], free: ['Вільно', ''] };
  var HINT = { past: 'I går jobbet jeg … Etterpå kjøpte jeg … (пиши норвезькою, а що не знаєш — українською)', present: 'Nå sitter jeg … I dag jobber jeg …', future: 'I morgen skal jeg … Jeg kommer til å …', free: 'Що ти робив, робиш або будеш робити?' };
  var STY = { spoken: 'розмовне', formal: 'офіційне', synonym: 'синонім', north: 'північна розмовна' };
  var AUX = { er: 1, har: 1, vil: 1, kan: 1, skal: 1, må: 1, får: 1, bør: 1, vet: 1, gjør: 1, blir: 1, kommer: 1 };
  var HAVE = { har: 1, hadde: 1, er: 1, var: 1, blir: 1, ble: 1, vært: 1, blitt: 1 };
  var idx = null;
  function forms() {
    if (idx) return idx; idx = { pres: {}, past: {}, perf: {}, inf: {} };
    (O.verbs || []).forEach(function (v) { idx.pres[v.pres] = idx.pres[v.pres] || v; idx.past[v.past] = idx.past[v.past] || v; idx.perf[v.perf] = idx.perf[v.perf] || v; idx.inf[v.inf] = v; }); return idx;
  }
  function wordsOf(t) { return String(t || '').match(/[\p{L}'’-]+/gu) || []; }
  function isUa(w) { return /[Ѐ-ӿ]/.test(w); }
  function sentences(t) { return String(t || '').split(/(?<=[.!?])\s+|\n+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 12); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function dkey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function cut(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }

  /* Час дієслів за таблицею форм. Явний маркер минулого + теперішній час = помилка; без маркера лише м'яка підказка (стан у теперішньому буває правильним). */
  function tenseFlags(sent, topic) {
    var F = forms(), ws = wordsOf(sent).filter(function (w) { return !isUa(w); }).map(function (w) { return w.toLowerCase(); }), low = sent.toLowerCase(), out = [], hints = 0;
    var cue = /\b(i går|i fjor|i morges|i forrige|forrige \w+|for \w+ (dager|uker|måneder|år|timer) siden)\b/.test(low), now = /\b(nå|i dag|hver dag|alltid|vanligvis|ofte)\b/.test(low), fut = /\b(i morgen|neste \w+|snart)\b/.test(low);
    ws.forEach(function (t, i) {
      var prev = ws[i - 1] || '', v;
      if (t === 'går' && prev === 'i') return;   // «i går» — це «вчора», а не форма gå
      if ((v = F.pres[t]) && !F.past[t] && !F.inf[t] && !AUX[t] && !(prev === 'å') && !/^(kan|skal|vil|må|bør)$/.test(prev)) {
        if (cue && !fut) out.push({ type: 'verbform', wrong: t, right: v.past, why: 'Явний маркер минулого, тож дієслово в минулому: ' + v.past + ' (або perfektum: har ' + v.perf + ').' });
        else if (topic === 'past' && !now && !fut) hints++;
      }
      if (fut && (v = F.past[t]) && !F.pres[t] && !F.inf[t] && !HAVE[t]) out.push({ type: 'verbform', wrong: t, right: v.pres, why: 'Для майбутнього: теперішній час (i morgen ' + v.pres + ') або skal + ' + v.inf + '.' });
      if ((v = F.perf[t]) && v.perf !== v.past && !F.pres[t] && !F.inf[t] && !HAVE[prev] && !ws.some(function (x) { return HAVE[x]; })) out.push({ type: 'verbform', wrong: t, right: 'har ' + t, why: 'Perfektum потребує допоміжного дієслова: har ' + v.perf + '.' });
    });
    return { flags: out, hints: hints };
  }
  function ruleCheck(sent, topic) {
    var res = [], seen = {}, tf = tenseFlags(sent, topic);
    (O.rules ? O.rules.check(sent) : []).concat(tf.flags).forEach(function (x) { var k = (x.wrong + '|' + x.right).toLowerCase(); if (!seen[k]) { seen[k] = 1; res.push({ type: x.type, wrong: x.wrong, right: x.right, why: x.why || '', src: 'rule' }); } });
    return { errors: res, hints: tf.hints };
  }

  var SYS = 'You help an adult Ukrainian learner (level A1-B1) of Norwegian bokmål who lives in Lyngen, Troms (northern Norway). He writes a short diary entry that mixes Norwegian and Ukrainian words or whole sentences. Topic tense: TOPIC. ' +
    'For every sentence, in order, return: "orig" (as written), "fixed" (one correct bokmål sentence with his meaning; translate every Ukrainian part; plain A2 vocabulary), "uk" (Ukrainian translation of fixed), "natural" (how it is usually said in everyday spoken Norwegian; may equal fixed), ' +
    '"alts" (0-3 real alternatives or synonyms: {"no":"...","style":"spoken|formal|synonym|north","note":"short Ukrainian note"}; use "north" only for well-known northern Norwegian spoken features such as æ for jeg, itj for ikke, ka for hva, kor for hvor, dokker for dere, and never invent forms specific to Lyngen), ' +
    '"errors" (real mistakes in the Norwegian parts only, never the translated Ukrainian parts: {"wrong":"fragment","right":"correct fragment","why":"short Ukrainian explanation","type":"order|article|gender|plural|verbform|adjagree|prep|neg|pron|spelling|wordchoice|other"}), "words" (0-3 useful words from fixed: {"no":"base form, nouns with en/ei/et","uk":"Ukrainian"}). ' +
    'Reply with strict JSON only: {"sentences":[...],"comment":"one short encouraging remark in Ukrainian"}. Do not invent errors; ignore punctuation and capitals; at most 4 errors per sentence.';
  function cleanAI(j, n, src) {
    var arr = Array.isArray(j && j.sentences) ? j.sentences : [], TY = O.err ? O.err.TYPES : {};
    var out = src.map(function (orig, i) {
      var x = arr[i] || {};
      return {
        orig: orig, fixed: cut(x.fixed, 300), uk: cut(x.uk, 300), natural: cut(x.natural, 300),
        alts: (Array.isArray(x.alts) ? x.alts : []).slice(0, 3).map(function (a) { return { no: cut(a && a.no, 200), style: STY[a && a.style] ? a.style : 'synonym', note: cut(a && a.note, 160) }; }).filter(function (a) { return a.no; }),
        errors: (Array.isArray(x.errors) ? x.errors : []).slice(0, 4).map(function (e) { return { wrong: cut(e && e.wrong, 160), right: cut(e && e.right, 160), why: cut(e && e.why, 240), type: TY[e && e.type] ? e.type : 'other', src: 'ai' }; }).filter(function (e) { return e.wrong && e.right && e.wrong.toLowerCase() !== e.right.toLowerCase(); }),
        words: (Array.isArray(x.words) ? x.words : []).slice(0, 3).map(function (w) { return { no: cut(w && w.no, 60), uk: cut(w && w.uk, 80) }; }).filter(function (w) { return w.no && w.uk; })
      };
    });
    return { sentences: out, comment: cut(j && j.comment, 200) };
  }

  /* Скрита статистика */
  function record(topic, text, rows, aiOk) {
    var ws = wordsOf(text), ua = ws.filter(isUa).length, by = {}, r = 0, a = 0, h = 0;
    rows.forEach(function (row) { h += row.hints || 0; row.errors.forEach(function (e) { by[e.type || 'other'] = (by[e.type || 'other'] || 0) + 1; if (e.src === 'rule') r++; else a++; }); });
    var d = O.state.diary = O.state.diary || []; d.push({ id: 'd' + Date.now().toString(36), t: Date.now(), topic: topic, words: ws.length, ua: ua, sent: rows.length, err: by, r: r, a: a, h: h, ai: aiOk ? 1 : 0 });
    if (d.length > 400) O.state.diary = d.slice(-400); O.save();
  }
  function weekKey(t) { var d = new Date(t), k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function stats() {
    var d = O.state.diary || []; if (!d.length) return null;
    var W = {}, T = { words: 0, ua: 0, err: 0 }, byT = {}, ai = 0, hints = 0;
    d.forEach(function (e) {
      var k = weekKey(e.t), w = W[k] = W[k] || { week: k, entries: 0, words: 0, ua: 0, err: 0, rule: 0, ai: 0, byType: {} };
      w.entries++; w.words += e.words; w.ua += e.ua; w.rule += e.r; w.ai += e.a; w.err += e.r + e.a; Object.keys(e.err || {}).forEach(function (t) { w.byType[t] = (w.byType[t] || 0) + e.err[t]; byT[t] = (byT[t] || 0) + e.err[t]; });
      T.words += e.words; T.ua += e.ua; T.err += e.r + e.a; if (e.ai) ai++; hints += e.h || 0;
    });
    var weeks = Object.keys(W).sort().map(function (k) { var w = W[k]; return { week: w.week, entries: w.entries, words: w.words, uaShare: w.words ? +(w.ua / w.words).toFixed(3) : null, errorsPer100Words: w.words ? +(w.err / w.words * 100).toFixed(1) : null, ruleErrors: w.rule, aiErrors: w.ai, byType: w.byType }; });
    function share(a) { var w = 0, u = 0; a.forEach(function (e) { w += e.words; u += e.ua; }); return w ? +(u / w).toFixed(3) : null; }
    var cmp = d.length >= 6 ? { firstThree: share(d.slice(0, 3)), lastThree: share(d.slice(-3)) } : null;
    return {
      entries: d.length, words: T.words, uaShare: T.words ? +(T.ua / T.words).toFixed(3) : null, errorsPer100Words: T.words ? +(T.err / T.words * 100).toFixed(1) : null, byType: byT, tenseHints: hints, entriesCheckedByAI: ai, weeks: weeks, uaShareFirstVsLast: cmp,
      note: 'Частка української рахується за кирилицею в словах, тобто це частка слів, які учень не зміг написати норвезькою. Помилки: правила (надійніші) й ШІ (не перевірені); обсяг малий, тренд слабкий. Складність тексту не контролюється: запис про складну тему дає більше української, не гірше знання.'
    };
  }
  function line() { var s = stats(); if (!s || s.entries < 2) return ''; var c = s.uaShareFirstVsLast; return 'Щоденник: ' + s.entries + ' записів, ' + s.words + ' слів, українська ' + Math.round(s.uaShare * 100) + '%' + (c && c.firstThree != null ? ' (перші 3: ' + Math.round(c.firstThree * 100) + '% → останні 3: ' + Math.round(c.lastThree * 100) + '%)' : '') + '.'; }

  /* Картки речень */
  function SC() { return O.state.scards = O.state.scards || {}; }
  function saveSent(no, uk, alts) { var id = 's_' + hash(no), c = SC(); if (c[id]) return false; c[id] = { id: id, no: no, uk: uk, alts: (alts || []).slice(0, 3), card: O.srs.newCard(id, Date.now()), t: Date.now() }; O.save(); return true; }
  function dueSent(now) { var c = SC(); return Object.keys(c).filter(function (k) { return c[k].card.st === 'new' || O.srs.isDue(c[k].card, now); }); }
  function judgeS(guess, rec) { var best = 0; [rec.no].concat(rec.alts || []).forEach(function (t) { best = Math.max(best, O.sim(guess, t)); }); return best >= 0.97 ? 2 : best >= 0.85 ? 1 : 0; }
  function review(box) {
    var q = dueSent(Date.now()), i = 0, ok = 0;
    if (!q.length) { box.innerHTML = '<div class="stage center"><h3>Усе повторено 🎉</h3><p class="dim">Збережених речень: ' + Object.keys(SC()).length + '.</p></div>'; return; }
    function step() {
      if (i >= q.length) { box.innerHTML = '<div class="stage center"><div class="big">' + ok + ' / ' + q.length + '</div></div>'; O.sfx('done'); return; }
      var r = SC()[q[i]], t0 = Date.now();
      box.innerHTML = '<h3>Речення <small class="dim">' + (i + 1) + ' / ' + q.length + '</small></h3><div class="stage center"><div class="big">' + O.esc(r.uk) + '</div><div class="dim">Напиши норвезькою</div></div><form class="vin"><input id="rvi" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="row"><button class="btn" type="submit">Перевірити</button><button class="btn ghost" type="button" id="rvd">Не знаю</button></div></form><div id="rvr"></div>';
      var inp = box.querySelector('#rvi'); inp.focus();
      function fin(j) {
        inp.disabled = true; var good = j > 0, g = !good ? 1 : j === 1 ? 2 : O.srs.gradeFrom(true, Date.now() - t0, { typed: true }); r.card = O.srs.review(r.card, g, Date.now()); if (good) ok++; O.sfx(good ? 'ok' : 'bad'); O.save();
        box.querySelector('#rvr').innerHTML = '<div class="feedback ' + (good ? 'good' : 'bad') + '"><div class="no big">' + O.esc(r.no) + '</div>' + (j === 1 ? '<div class="dim small">майже: дрібна різниця</div>' : '') + ((r.alts || []).length ? '<div class="dim small">Також: ' + r.alts.map(O.esc).join(' · ') + '</div>' : '') + '<div class="row"><button class="btn ghost" id="rvs">🔊</button><button class="btn" id="rvn">Далі</button></div></div>';
        box.querySelector('#rvs').onclick = function () { O.speak(r.no); }; var n = box.querySelector('#rvn'); n.focus(); n.onclick = function () { i++; step(); };
      }
      box.querySelector('form').onsubmit = function (e) { e.preventDefault(); if (inp.value.trim()) fin(judgeS(inp.value, r)); }; box.querySelector('#rvd').onclick = function () { fin(0); };
    }
    step();
  }

  function wordSave(w) {
    var art = '', no = w.no, m = /^(en|ei|et) (.+)$/.exec(w.no); if (m) { art = m[1]; no = m[2]; }
    return O.addWord({ id: 'dy_' + hash(w.no), deck: 'mine', cat: 'Mine', art: art, no: no, uk: w.uk, ex: '', exUk: '' });
  }
  function markUa(s) { return O.esc(s).replace(/([Ѐ-ӿ][Ѐ-ӿ'’-]*)/g, '<span class="dua">$1</span>'); }
  function renderRows(box, rows, comment, aiNote) {
    var TY = O.err ? O.err.TYPES : {};
    box.innerHTML = (aiNote ? '<div class="warn small">' + O.esc(aiNote) + '</div>' : '') + rows.map(function (r, n) {
      var best = r.fixed || r.orig;
      return '<div class="dsent panel" data-n="' + n + '"><div class="dim small">Ти написав</div><div>' + markUa(r.orig) + '</div>' +
        (r.fixed ? '<div class="dfix"><span class="no">' + O.esc(r.fixed) + '</span> <button class="icon" data-sy="' + n + '">🔊</button><button class="icon" data-sl="' + n + '" title="Повільно">🐢</button></div>' + (r.uk ? '<div class="dim small">' + O.esc(r.uk) + '</div>' : '') : '') +
        (r.natural && r.natural.toLowerCase() !== best.toLowerCase() ? '<div class="small">У розмові частіше: <b class="no">' + O.esc(r.natural) + '</b> <button class="icon" data-sn="' + n + '">🔊</button></div>' : '') +
        (r.alts.length ? '<div class="dalts">' + r.alts.map(function (a, k) { return '<div class="small"><span class="chip sm">' + O.esc(STY[a.style]) + '</span> <b class="no">' + O.esc(a.no) + '</b> <button class="icon" data-sa="' + n + ':' + k + '">🔊</button>' + (a.note ? ' <span class="dim">' + O.esc(a.note) + '</span>' : '') + '</div>'; }).join('') + '</div>' : '') +
        r.errors.map(function (e) { return '<div class="corr"><div>✗ <s>' + O.esc(e.wrong) + '</s> → <b>' + O.esc(e.right) + '</b></div><div class="dim small">' + O.esc(TY[e.type] || '') + (e.why ? ' · ' + O.esc(e.why) : '') + (e.src === 'ai' ? ' · ШІ, не перевірено' : '') + '</div></div>'; }).join('') +
        (r.words.length ? '<div class="row">' + r.words.map(function (w, k) { return '<button class="btn ghost sm" data-aw="' + n + ':' + k + '">＋ ' + O.esc(w.no) + ' — ' + O.esc(w.uk) + '</button>'; }).join('') + '</div>' : '') +
        (r.fixed ? '<div class="row"><button class="btn ghost sm" data-sv="' + n + '">' + (SC()['s_' + hash(r.fixed)] ? '✓ У повторенні' : '💾 У мої речення') + '</button></div>' : '') + '</div>';
    }).join('') + (comment ? '<div class="dim small">' + O.esc(comment) + '</div>' : '');
    O.$$('[data-sy]', box).forEach(function (b) { b.onclick = function () { O.speak(rows[+b.getAttribute('data-sy')].fixed); }; });
    O.$$('[data-sl]', box).forEach(function (b) { b.onclick = function () { O.speak(rows[+b.getAttribute('data-sl')].fixed, { slow: true }); }; });
    O.$$('[data-sn]', box).forEach(function (b) { b.onclick = function () { O.speak(rows[+b.getAttribute('data-sn')].natural); }; });
    O.$$('[data-sa]', box).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-sa').split(':'); O.speak(rows[+p[0]].alts[+p[1]].no); }; });
    O.$$('[data-aw]', box).forEach(function (b) { b.onclick = function () { var p = b.getAttribute('data-aw').split(':'); wordSave(rows[+p[0]].words[+p[1]]); b.textContent = '✓ ' + b.textContent.slice(2); b.disabled = true; }; });
    O.$$('[data-sv]', box).forEach(function (b) { b.onclick = function () { var r = rows[+b.getAttribute('data-sv')]; saveSent(r.fixed, r.uk || r.orig, [r.natural].concat(r.alts.filter(function (a) { return a.style !== 'north'; }).map(function (a) { return a.no; })).filter(function (x) { return x && x.toLowerCase() !== r.fixed.toLowerCase(); })); b.textContent = '✓ У повторенні'; b.disabled = true; }; });
  }

  O.renderDiary = function (root) {
    var topic = O.state.settings.dyTopic || 'past';
    root.innerHTML = '<h2>✍️ Щоденник</h2><p class="dim small">Розкажи, що ти робив, робиш чи будеш робити. Пиши норвезькою, а що не знаєш — українською, можна навіть усередині речення. Система переведе, виправить і покаже, як це кажуть у розмові.</p>' +
      '<div class="chips" id="dgt">' + Object.keys(TOPICS).map(function (k) { return '<button class="chip' + (k === topic ? ' on' : '') + '" data-t="' + k + '">' + TOPICS[k][0] + (TOPICS[k][1] ? ' · ' + TOPICS[k][1] : '') + '</button>'; }).join('') + '</div>' +
      '<textarea id="dtx" rows="6" maxlength="1200" placeholder="' + O.esc(HINT[topic]) + '"></textarea>' +
      '<div class="row"><button class="btn big" id="dgo">Перевірити</button>' + (O.canListen && O.canListen() ? '<button class="btn ghost" id="dmic" title="Надиктувати норвезькою">🎤</button>' : '') + '<button class="btn ghost" id="drv">🔁 Повторити речення (' + dueSent(Date.now()).length + ')</button></div><div class="dim small" id="dst"></div><div id="dres"></div><div id="drvb" class="panel" hidden></div>' +
      '<details class="small dim"><summary>Про діалект</summary><p>Пишемо й перевіряємо за букмолом. У Тромсі й навколо розмовна мова відрізняється: наприклад æ замість jeg, itj замість ikke, ka = hva, kor = hvor, dokker = dere. Такі форми показуються лише як «північна розмовна» примітка до варіантів. Форм саме Лінгена я не вигадую: питай у людей навколо.</p><p>Текст щоденника надсилається ШІ-провайдеру, якого ти підключив, і в застосунку не зберігається. Лишаються лічильники (скільки слів, скільки українських, які помилки) для звіту, а за бажанням окремі речення, які ти зберіг сам.</p></details>';
    var tx = root.querySelector('#dtx'), st = root.querySelector('#dst'), res = root.querySelector('#dres');
    O.$$('[data-t]', root).forEach(function (b) { b.onclick = function () { topic = b.getAttribute('data-t'); O.state.settings.dyTopic = topic; O.save(); O.$$('[data-t]', root).forEach(function (x) { x.classList.toggle('on', x === b); }); tx.placeholder = HINT[topic]; }; });
    var mic = root.querySelector('#dmic'); if (mic) mic.onclick = function () { st.textContent = 'Слухаю норвезьку…'; O.listen(function (alts) { tx.value = (tx.value ? tx.value + ' ' : '') + alts[0]; st.textContent = ''; }, function () { st.textContent = 'Не вдалося розпізнати'; }); };
    root.querySelector('#drv').onclick = function () { var b = root.querySelector('#drvb'); b.hidden = false; review(b); b.scrollIntoView({ behavior: 'smooth' }); };
    root.querySelector('#dgo').onclick = function () {
      var text = tx.value.trim().slice(0, 1200); if (!text) return;
      var src = sentences(text), local = src.map(function (s) { return ruleCheck(s, topic); }); st.textContent = 'Перевіряю…'; res.innerHTML = '';
      O.aiJsonG(SYS.replace('TOPIC', TOPICS[topic][1] || 'free'), [{ role: 'user', content: src.join('\n') }], 2500).then(function (g) {
        return { j: cleanAI(g.json, src.length, src), ai: true };
      }, function (e) { return { j: { sentences: src.map(function (s) { return { orig: s, fixed: '', uk: '', natural: '', alts: [], errors: [], words: [] }; }), comment: '' }, ai: false, err: e }; }).then(function (r) {
        var rows = r.j.sentences.map(function (row, i) {
          var seen = {}, errs = local[i].errors.concat(row.errors).filter(function (e) { var k = (e.wrong + '|' + e.right).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
          row.errors = errs; row.hints = local[i].hints; return row;
        });
        st.textContent = ''; renderRows(res, rows, r.j.comment, r.ai ? '' : 'ШІ недоступний' + (r.err && O.aiError ? ' (' + O.aiError(r.err) + ')' : '') + ': показані лише перевірки за правилами, переклад українських частин потребує ШІ.');
        rows.forEach(function (row) { row.errors.forEach(function (e) { if (O.err) O.err.add({ src: 'diary', wrong: e.wrong, right: e.right, why: e.why, type: e.type }); }); });
        if (O.err && O.err.written) O.err.written(text); if (O.mind && O.mind.used) O.mind.used(text, rows.reduce(function (a, row) { return a.concat(row.errors.map(function (e) { return e.wrong; })); }, []));
        record(topic, text, rows, r.ai); if (O.tele) O.tele.ev('diary'); tx.value = '';
      });
    };
  };
  O.diary = { stats: stats, line: line, ruleCheck: ruleCheck, tenseFlags: tenseFlags, saveSent: saveSent, dueSent: dueSent, judgeS: judgeS, cleanAI: cleanAI, record: record, today: function () { var d = O.state.diary || []; return d.length && dkey(d[d.length - 1].t) === dkey(); } };
})();
