/* Вкладка «Помилки»: збирає твої помилки (картки, ігри, діалог із репетитором, перевірка речень),
   рахує статистику за частинами мови, типами помилок і членами речення та порівнює з типовими помилками тих, хто вивчає норвезьку. */
(function () {
  var O = window.ORD, MAXN = 500;
  var TYPES = { order: 'Порядок слів (V2)', article: 'Артикль', gender: 'Рід іменника', plural: 'Множина', verbform: 'Форма й час дієслова', adjagree: 'Узгодження прикметника', prep: 'Прийменники', neg: 'Заперечення', pron: 'Займенники', spelling: 'Правопис, звуки', wordchoice: 'Вибір слова', other: 'Інше' };
  var MEMBERS = { subj: 'Підмет', pred: 'Присудок', obj: 'Додаток', adv: 'Обставина', attr: 'Означення', other: 'Інше' };
  var POS = { noun: 'Іменники', verb: 'Дієслова', adj: 'Прикметники', adv: 'Прислівники', prep: 'Прийменники', pron: 'Займенники', konj: 'Сполучники', other: 'Інше' };
  var SYSCHK = 'You check a Norwegian (bokmål) sentence or short text written by a Ukrainian-speaking learner (A1-B1). Reply with strict JSON only: {"ok":true|false,"corrected":"the corrected text","errors":[{"wrong":"fragment with the mistake","right":"correct fragment","why":"short explanation in Ukrainian","type":"order|article|gender|plural|verbform|adjagree|prep|neg|pron|spelling|wordchoice|other","member":"subj|pred|obj|adv|attr|other"}],"comment":"one short encouraging remark in Ukrainian"}. Do not invent errors; ignore punctuation and capital letters; at most 6 errors; keep the learner\'s meaning.';
  var SYSAN = 'Ти аналітик помилок для дорослого українського учня норвезької (bokmål). Тобі дають статистику його помилок. Відповідай ЛИШЕ JSON: {"summary":"2-3 речення українською: що видно зі статистики, чесно й без лестощів, з урахуванням малого обсягу даних","patterns":[{"title":"коротка назва закономірності","detail":"1-2 речення: чому так буває й що робити"}],"drills":["3-4 конкретні короткі вправи на тиждень"]}. Не вигадуй цифр, яких немає в даних; якщо даних мало, скажи про це. ВАЖЛИВО: slovaPoChastynakMovy це забуті картки (лексика), а НЕ граматика; про граматику суди лише з typyPomylokURechenniakh. Якщо n менше 20, назви висновок гіпотезою. Не роби висновків про причини (напр. «калька»), поки для типу менше 5 записів.';
  /* Типові помилки: джерела — огляди й дослідження (див. посилання); позначка «узагальнення» означає мій висновок, а не дані корпусу. */
  var REF = [
    { t: 'order', title: 'Дієслово на другому місці (V2)', ex: ['I dag jeg jobbet', 'I dag jobbet jeg'], note: 'Після обставини на початку речення підмет іде ПІСЛЯ дієслова. В українській порядок слів вільний, тому легко помилитися.', src: 0 },
    { t: 'order', title: 'Місце додатка й обставини', ex: ['Jeg liker å spise om sommeren is', 'Jeg liker å spise is om sommeren'], note: 'Додаток зазвичай стоїть перед обставиною часу.', src: 1 },
    { t: 'article', title: 'Пропущений артикль', ex: ['Jeg ser bil utenfor huset', 'Jeg ser en bil utenfor huset'], note: 'В українській артиклів немає, тому їх пропускають (узагальнення).', src: 1 },
    { t: 'gender', title: 'Рід іменника (en / ei / et)', ex: ['en dag, ei dør, et tre', 'правила майже немає: вчи з артиклем'], note: 'Рід не завжди збігається з українським.', src: 0 },
    { t: 'verbform', title: 'Минулий час і present perfect', ex: ['Jeg har spiste middag i går', 'Jeg spiste middag i går'], note: 'Для конкретного моменту в минулому: простий минулий.', src: 1 },
    { t: 'verbform', title: 'Неправильні дієслова', ex: ['De gårer til skolen', 'De går til skolen'], note: 'Не додавай -er до дієслів, які вже мають форму теперішнього часу без закінчення.', src: 1 },
    { t: 'adjagree', title: 'Узгодження прикметника', ex: ['En stor biler', 'En stor bil'], note: 'Прикметник узгоджується з родом, числом і означеністю іменника.', src: 1 },
    { t: 'prep', title: 'i / på: місце й країни', ex: ['Jeg bor på Oslo', 'Jeg bor i Oslo'], note: 'i для міст і країн. Вибір i/på окремо досліджували на корпусі ASK (польські учні): причина часто в перенесенні з рідної мови.', src: 2 },
    { t: 'prep', title: 'Тривалість часу: i, а не for', ex: ['Jeg har bodd i Norge for to år', 'Jeg har bodd i Norge i to år'], note: 'Англійське for → норвезьке i при проміжку часу.', src: 0 },
    { t: 'neg', title: 'Подвійне заперечення', ex: ['Jeg har ikke aldri vært der', 'Jeg har aldri vært der'], note: 'В українській подвійне заперечення норма, у норвезькій ні (узагальнення).', src: 1 },
    { t: 'wordchoice', title: 'skal чи vil', ex: ['skal: плани, які контролюєш', 'vil: те, що не залежить від тебе'], note: 'Обидва можуть перекладатися «буду».', src: 0 },
    { t: 'wordchoice', title: 'Схожі слова', ex: ['плутанина близьких за значенням слів'], note: 'З ростом словника частішає.', src: 0 },
    { t: 'spelling', title: 'Голосні u, o, æ, ø, å', ex: ['æ, ø, å'], note: 'Перекладені з проблемами вимови, часто збігаються з помилками правопису.', src: 0 }
  ];
  var SRC = [['The Local Norway: поширені помилки', 'https://www.thelocal.no/20230522/the-most-common-mistakes-you-are-likely-to-make-when-learning-norwegian'], ['NLS Norwegian: помилки на іспитах', 'https://nlsnorwegian.no/?p=17154'], ['ASK-корпус: i та på у польських учнів (Studia)', 'https://pressto.amu.edu.pl/index.php/fsp/article/view/3623']];

  function s(x, n) { return typeof x === 'string' ? x.replace(/<[^>]*>/g, '').trim().slice(0, n || 200) : ''; }
  function lst() { return (O.state.err = O.state.err || []); }
  function uid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function posOf(w) { if (!w) return 'other'; var c = w.cat || ''; if (/^Verb/.test(c)) return 'verb'; if (c === 'Pron') return 'pron'; if (c === 'Adv') return 'adv'; if (c === 'Prep') return 'prep'; if (c === 'Konj') return 'konj'; if (w.art) return 'noun'; return 'other'; }
  O.errPos = posOf;
  O.err = {
    TYPES: TYPES,
    add: function (e) {
      var r = { id: uid(), t: Date.now(), src: e.src || 'check', wrong: s(e.wrong, 200), right: s(e.right, 200), why: s(e.why, 300), type: TYPES[e.type] ? e.type : '', member: MEMBERS[e.member] ? e.member : '' };
      if (!r.wrong && !r.right) return null; O.state.err = [r].concat(lst()).slice(0, MAXN); O.save(); return r;
    },
    all: lst,
    REF: REF,
    written: function (t) { var n = String(t || '').split(/\s+/).filter(Boolean).length; if (!n) return; var a = O.state.errW = O.state.errW || []; a.push({ t: Date.now(), n: Math.min(n, 400) }); if (a.length > 400) a.splice(0, a.length - 400); O.save(); }
  };

  /* Статистика: картки (оцінка 1 = помилка), ігри, журнал помилок */
  function stats() {
    var since = Date.now() - 60 * 864e5, byPos = {}, byType = {}, byMember = {}, words = {}, weeks = {}, rev = {}, total = 0, i, gameByPos = {}, gameMiss = 0;
    Object.keys(POS).forEach(function (k) { byPos[k] = { err: 0, rev: 0 }; });
    (O.state.log || []).forEach(function (e) {
      if (e.t < since) return; var w = O.wordById[e.id], p = posOf(w); byPos[p].rev++; if (e.g === 1) { byPos[p].err++; total++; words[e.id] = (words[e.id] || 0) + 1; var wk = Math.floor((e.t - since) / (7 * 864e5)); weeks[wk] = (weeks[wk] || 0) + 1; }
    });
    var cardErr = total, gm = (O.state.games && O.state.games.miss) || {}; Object.keys(gm).forEach(function (id) { var p = posOf(O.wordById[id]); gameByPos[p] = (gameByPos[p] || 0) + gm[id]; words[id] = (words[id] || 0) + gm[id]; gameMiss += gm[id]; });
    var written = (O.state.errW || []).filter(function (x) { return x.t >= since; }).reduce(function (a, x) { return a + x.n; }, 0);
    var ers = lst().filter(function (e) { return e.t >= since; });
    ers.forEach(function (e) { if (e.type) byType[e.type] = (byType[e.type] || 0) + 1; if (e.member) byMember[e.member] = (byMember[e.member] || 0) + 1; var wk = Math.floor((e.t - since) / (7 * 864e5)); weeks[wk] = (weeks[wk] || 0) + 1; });
    return { byPos: byPos, byType: byType, byMember: byMember, words: words, weeks: weeks, sentenceErrors: ers.length, wordErrors: cardErr + gameMiss, cardErr: cardErr, gameMiss: gameMiss, gameByPos: gameByPos, written: written, since: since };
  }
  function bars(rows, total, empty) {
    rows = rows.filter(function (r) { return r.n > 0; }).sort(function (a, b) { return b.n - a.n; }); var mx = rows.length ? rows[0].n : 1;
    return rows.length ? rows.map(function (r) { return '<div class="ebar"><span class="el">' + O.esc(r.l) + '</span><span class="eb"><i style="width:' + Math.max(4, Math.round(r.n / mx * 100)) + '%"></i></span><span class="en">' + r.n + (total ? ' · ' + Math.round(r.n / total * 100) + '%' : '') + (r.x ? ' <span class="dim small">' + O.esc(r.x) + '</span>' : '') + '</span></div>'; }).join('') : '<p class="dim small">' + (empty || 'Поки даних немає.') + '</p>';
  }

  function clean(j) {
    var es = (Array.isArray(j && j.errors) ? j.errors : []).slice(0, 6).map(function (x) { return { wrong: s(x && x.wrong, 160), right: s(x && x.right, 160), why: s(x && x.why, 240), type: TYPES[x && x.type] ? x.type : 'other', member: MEMBERS[x && x.member] ? x.member : 'other' }; }).filter(function (x) { return x.wrong && x.right && x.wrong !== x.right; });
    return { ok: !es.length, corrected: s(j && j.corrected, 500), errors: es, comment: s(j && j.comment, 200) };
  }

  O.renderErrors = function (root) {
    var st = stats(), ers = lst();
    var posRows = Object.keys(POS).map(function (k) { var b = st.byPos[k]; return { l: POS[k], n: b.err, x: b.rev ? O.errlab.fmt(b.err, b.rev) : '' }; });
    var typeRows = Object.keys(TYPES).map(function (k) { return { l: TYPES[k], n: st.byType[k] || 0 }; }), memRows = Object.keys(MEMBERS).map(function (k) { return { l: MEMBERS[k], n: st.byMember[k] || 0 }; });
    var topW = Object.keys(st.words).sort(function (a, b) { return st.words[b] - st.words[a]; }).slice(0, 8).map(function (id) { var w = O.wordById[id]; return w ? { w: w, n: st.words[id] } : null; }).filter(Boolean);
    var wkMax = Math.max.apply(null, [1].concat(Object.keys(st.weeks).map(function (k) { return st.weeks[k]; })));
    var wkHtml = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (k) { var n = st.weeks[k] || 0; return '<span class="wkc" title="' + n + '"><i style="height:' + Math.round(n / wkMax * 44 + (n ? 4 : 1)) + 'px"></i></span>'; }).join('');
    var allT = st.wordErrors + st.sentenceErrors;
    var typical = REF.map(function (r, i) { var mine = st.byType[r.t] || 0; return '<div class="panel eref"><div class="row"><b>' + O.esc(r.title) + '</b>' + (mine ? '<span class="tag warn">у тебе: ' + mine + '</span>' : '') + '</div><div class="no small"><s>' + O.esc(r.ex[0]) + '</s>' + (r.ex[1] ? ' → <b>' + O.esc(r.ex[1]) + '</b>' : '') + '</div><div class="dim small">' + O.esc(r.note) + ' <a href="' + SRC[r.src][1] + '" target="_blank" rel="noopener noreferrer">[' + (r.src + 1) + ']</a></div></div>'; }).join('');
    root.innerHTML = '<h2>Помилки</h2><p class="dim small">Погляд на себе збоку: що саме, де й як часто в тебе не виходить. Дані за 60 днів із карток, ігор, діалогів із репетитором і перевірки речень нижче.</p>' +
      '<div class="panel"><div class="row"><b>Зараз</b></div><div class="estats"><div><b>' + st.cardErr + '</b><span>забутих на картках</span></div><div><b>' + st.gameMiss + '</b><span>промахів в іграх</span></div><div><b>' + st.sentenceErrors + '</b><span>помилок у реченнях</span></div><div><b>' + topW.length + '</b><span>слів-«проблем»</span></div></div><div class="dim small">Помилок за тиждень (від давніших до останніх)</div><div class="wk">' + wkHtml + '</div></div>' +
      '<div class="panel" id="elab"></div>' +
      '<div class="panel"><h4 style="margin-top:0">✍ Перевір своє речення</h4><div class="dim small">Напиши по-норвезьки, ШІ знайде помилки, пояснить і запише їх сюди з типом і членом речення.</div><textarea id="ck" rows="3" maxlength="500" placeholder="Напр.: I dag jeg jobbet på verkstedet"></textarea><div class="row"><button class="btn ghost" id="ckrl">⚡ Миттєво (без ШІ)</button> <button class="btn" id="ckgo">Перевірити</button><span class="dim small" id="ckm"></span></div><div id="ckr"></div></div>' +
      '<div class="panel"><h4 style="margin-top:0">Забуті слова за частинами мови</h4><div class="dim small">Це лексика, а не граматика: частка карток цієї частини мови, на яких ти обрав «Знову» за 60 днів. У дужках інтервал довіри 95%; при n<20 висновків робити не варто.</div>' + bars(posRows, st.cardErr, 'Поки помилок на картках немає.') + (st.gameMiss ? '<div class="dim small" style="margin-top:8px">Промахи в іграх (кількість спроб невідома, тому без відсотків): ' + Object.keys(st.gameByPos).sort(function (a, b) { return st.gameByPos[b] - st.gameByPos[a]; }).map(function (k) { return O.esc(POS[k]) + ' ' + st.gameByPos[k]; }).join(', ') + '</div>' : '') + '</div>' +
      '<div class="panel"><h4 style="margin-top:0">Граматика: типи помилок у реченнях</h4><div class="dim small">' + (st.written >= 50 ? 'Це ' + st.sentenceErrors + ' помилок на ' + st.written + ' написаних слів: близько ' + (st.sentenceErrors / st.written * 100).toFixed(1) + ' на 100 слів (за 60 днів).' : 'Написано поки ' + st.written + ' слів: для частки на 100 слів потрібно хоча б 50. Перевіряй речення й розмовляй із репетитором.') + '</div>' + bars(typeRows, st.sentenceErrors, 'Перевір кілька речень або поговори з репетитором, і тут з’явиться розподіл.') + '</div>' +
      '<div class="panel"><h4 style="margin-top:0">Члени речення</h4>' + bars(memRows, st.sentenceErrors, 'З’явиться після перевірки речень.') + '</div>' +
      '<div class="panel"><h4 style="margin-top:0">Слова, на яких помиляєшся найчастіше</h4>' + (topW.length ? topW.map(function (x) { return '<div class="mrow"><span><b class="no">' + O.esc((x.w.art ? x.w.art + ' ' : '') + x.w.no) + '</b> <span class="dim">' + O.esc(x.w.uk) + '</span></span><span class="tag">×' + x.n + '</span></div>'; }).join('') : '<p class="dim small">Поки немає.</p>') + '</div>' +
      '<div class="panel"><h4 style="margin-top:0">🪞 Погляд збоку (аналіз ШІ)</h4><div class="dim small">ШІ дивиться на твою статистику й називає закономірності та вправи. Чим більше даних, тим точніше.</div><div class="row"><button class="btn ghost" id="anbtn">Проаналізувати</button><span class="dim small" id="anm"></span></div><div id="anr">' + (O.state.errAn ? anHtml(O.state.errAn) : '') + '</div></div>' +
      '<h3>Типові помилки тих, хто вивчає норвезьку</h3><p class="dim small">Зібрано з відкритих джерел: ' + SRC.map(function (x, i) { return '<a href="' + x[1] + '" target="_blank" rel="noopener noreferrer">[' + (i + 1) + '] ' + O.esc(x[0]) + '</a>'; }).join('; ') + '. Позначка «узагальнення» — мій висновок, а не дані корпусу.</p>' + typical +
      '<h3>Журнал помилок</h3><div id="elog"></div>';
    function anHtml(a) { return '<div class="fact">' + O.esc(a.summary || '') + '</div>' + (a.patterns || []).map(function (p) { return '<div class="mrow"><span><b>' + O.esc(p.title) + '</b><div class="dim small">' + O.esc(p.detail) + '</div></span></div>'; }).join('') + ((a.drills || []).length ? '<div class="small"><b>Вправи на тиждень</b><ul>' + a.drills.map(function (d) { return '<li>' + O.esc(d) + '</li>'; }).join('') + '</ul></div>' : '') + (a.gen ? '<div class="dim small"><span class="gen">✦ ' + O.esc(O.genLabel(a.gen)) + '</span></div>' : ''); }
    function drawLog() {
      var box = root.querySelector('#elog'); box.innerHTML = lst().length ? '' : '<p class="dim small">Порожньо. Помилки з діалогів і перевірки речень зберігаються тут.</p>';
      lst().slice(0, 40).forEach(function (e) {
        var d = O.el('div', 'panel'); d.innerHTML = '<div class="row"><span class="dim small">' + new Date(e.t).toLocaleDateString('uk-UA') + ' · ' + ({ tutor: 'репетитор', check: 'перевірка', rules: 'правила' }[e.src] || e.src) + '</span>' + (e.type ? '<span class="tag">' + O.esc(TYPES[e.type]) + '</span>' : '<button class="chip" data-cls>без типу: визначити</button>') + (e.member ? '<span class="tag">' + O.esc(MEMBERS[e.member]) + '</span>' : '') + '<button class="icon" data-del title="Видалити">✕</button></div><div class="no">✗ <s>' + O.esc(e.wrong) + '</s> → <b>' + O.esc(e.right) + '</b></div>' + (e.why ? '<div class="dim small">' + O.esc(e.why) + '</div>' : '') + '<div class="row"><button class="btn ghost" data-card>＋ У картки</button></div>';
        d.querySelector('[data-del]').onclick = function () { O.state.err = lst().filter(function (x) { return x !== e; }); O.save(); O.renderErrors(root); };
        d.querySelector('[data-card]').onclick = function (ev) { var w = { id: 'u:err:' + e.id, deck: 'mine', cat: 'Mine', no: e.right.slice(0, 160), uk: '✗ ' + e.wrong.slice(0, 120) + (e.why ? ' (' + e.why.slice(0, 100) + ')' : ''), ex: '', exUk: '' }; if (O.addWord(w)) { O.toast('Додано в картки'); } ev.target.disabled = true; };
        var cl = d.querySelector('[data-cls]'); if (cl) cl.onclick = function () { classify(); };
        box.appendChild(d);
      });
    }
    function classify() {   // ШІ розставляє тип і член речення для старих помилок без позначок
      var todo = lst().filter(function (e) { return !e.type; }).slice(0, 25); if (!todo.length) return;
      O.toast('Визначаю типи…');
      O.aiJsonG('Класифікуй помилки учня норвезької. Відповідай ЛИШЕ JSON {"r":[{"i":0,"type":"order|article|gender|plural|verbform|adjagree|prep|neg|pron|spelling|wordchoice|other","member":"subj|pred|obj|adv|attr|other"}]} у тому ж порядку.', [{ role: 'user', content: JSON.stringify(todo.map(function (e, i) { return { i: i, wrong: e.wrong, right: e.right, why: e.why }; })) }], 1500).then(function (g) {
        (g.json && g.json.r || []).forEach(function (x) { var e = todo[x && x.i]; if (e) { e.type = TYPES[x.type] ? x.type : 'other'; e.member = MEMBERS[x.member] ? x.member : 'other'; } }); O.save(); O.renderErrors(root);
      }).catch(function (er) { O.toast(O.aiError ? O.aiError(er) : 'Не вдалося', 2500); });
    }
    root.querySelector('#ckrl').onclick = function () {
      var t = s(root.querySelector('#ck').value, 500), out = root.querySelector('#ckr'); if (!t) return;
      O.err.written(t); var found = O.rules.check(t);
      if (!found.length) { out.innerHTML = '<div class="corr ok">Правила нічого не знайшли.</div><div class="dim small">Це не гарантія: перевіряльник знає лише вузькі типові шаблони (V2 після обставини, i/på/om, har+минулий, інфінітив після модального, неп. заперечення, et/en + прикметник). Для повної перевірки натисни «Перевірити» (ШІ).</div>'; return; }
      found.forEach(function (e) { O.err.add({ src: 'rules', wrong: e.wrong, right: e.right, why: e.why, type: e.type }); });
      out.innerHTML = found.map(function (e) { return '<div class="corr"><div>✗ <s>' + O.esc(e.wrong) + '</s> → <b>' + O.esc(e.right) + '</b></div><div class="dim small">' + O.esc(TYPES[e.type] || '') + ': ' + O.esc(e.why) + '</div></div>'; }).join('') + '<div class="dim small">Записано в журнал і додано в тренажер.</div>';
      var keep = out.innerHTML; setTimeout(function () { if (root.isConnected) { O.renderErrors(root); root.querySelector('#ckr').innerHTML = keep; } }, 50);
    };
    root.querySelector('#ckgo').onclick = function () {
      var t = s(root.querySelector('#ck').value, 500), m = root.querySelector('#ckm'), out = root.querySelector('#ckr'); if (!t) return; O.err.written(t); m.textContent = 'Перевіряю…'; out.innerHTML = '';
      O.aiJsonG(SYSCHK, [{ role: 'user', content: t }], 1500).then(function (g) {
        var r = clean(g.json); m.textContent = '';
        if (r.ok) { out.innerHTML = '<div class="corr ok">✓ Помилок не знайдено</div>' + (r.comment ? '<div class="dim small">' + O.esc(r.comment) + '</div>' : ''); return; }
        r.errors.forEach(function (e) { O.err.add({ src: 'check', wrong: e.wrong, right: e.right, why: e.why, type: e.type, member: e.member }); });
        out.innerHTML = '<div class="fact">Правильно: <b class="no">' + O.esc(r.corrected) + '</b></div>' + r.errors.map(function (e) { return '<div class="corr"><div>✗ <s>' + O.esc(e.wrong) + '</s> → <b>' + O.esc(e.right) + '</b></div><div class="dim small">' + O.esc(TYPES[e.type]) + ' · ' + O.esc(MEMBERS[e.member]) + (e.why ? ' · ' + O.esc(e.why) : '') + '</div></div>'; }).join('') + (r.comment ? '<div class="dim small">' + O.esc(r.comment) + '</div>' : '') + '<div class="dim small">Помилки записано в журнал.</div>';
        setTimeout(function () { if (root.isConnected) { var keep = out.innerHTML; O.renderErrors(root); root.querySelector('#ckr').innerHTML = keep; } }, 50);
      }).catch(function (er) { m.textContent = O.aiError ? O.aiError(er) : (er && er.message) || 'Не вдалося'; });
    };
    root.querySelector('#anbtn').onclick = function () {
      var m = root.querySelector('#anm'), data = { slovaPoChastynakMovy: Object.keys(POS).map(function (k) { return { chastyna: POS[k], zabutoNaKartkakh: st.byPos[k].err, vsohoPovtoren: st.byPos[k].rev, dovirchyiInterval: st.byPos[k].rev ? O.errlab.fmt(st.byPos[k].err, st.byPos[k].rev) : null }; }), typyPomylokURechenniakh: Object.keys(st.byType).map(function (k) { return { typ: TYPES[k], n: st.byType[k] }; }), chlenyRechennia: Object.keys(st.byMember).map(function (k) { return { chlen: MEMBERS[k], n: st.byMember[k] }; }), napysanoSlivZa60Dniv: st.written, promakhivVIhrakh: st.gameMiss, naiHirshiSlova: topW.map(function (x) { return x.w.no + ' ×' + x.n; }), ostanniPomylky: ers.slice(0, 15).map(function (e) { return e.wrong + ' → ' + e.right; }) };
      if (allT < 5) { m.textContent = 'Замало даних (потрібно хоча б 5 помилок): повчи слова чи перевір кілька речень.'; return; }
      m.textContent = 'Аналізую…';
      O.aiJsonG(SYSAN, [{ role: 'user', content: JSON.stringify(data) }], 1800).then(function (g) {
        var j = g.json || {}; O.state.errAn = { summary: s(j.summary, 600), patterns: (Array.isArray(j.patterns) ? j.patterns : []).slice(0, 5).map(function (p) { return { title: s(p && p.title, 80), detail: s(p && p.detail, 300) }; }), drills: (Array.isArray(j.drills) ? j.drills : []).slice(0, 5).map(function (d) { return s(d, 200); }), gen: O.cleanGen(g.gen) || g.gen, t: Date.now() };
        O.save(); m.textContent = ''; root.querySelector('#anr').innerHTML = anHtml(O.state.errAn);
      }).catch(function (er) { m.textContent = O.aiError ? O.aiError(er) : (er && er.message) || 'Не вдалося'; });
    };
    O.renderErrLab(root.querySelector('#elab'));
    drawLog();
  };
})();
