/* Вірші та вирази: каталог із 20 відомих віршів (авторів, чиї твори вже у суспільному надбанні) і топ-20 норвезьких виразів.
   Працює як читалка: тап по слову, переклад рядків, озвучка, «Вивчено» додає слова (і вираз) у словник. Можна додати свій текст або згенерувати ШІ. */
(function () {
  var O = window.ORD;
  /* Каталог: лише автори, чиї твори в суспільному надбанні (померли понад 70 років тому). Текст завантажується на вимогу, бо повні тексти не вшито. */
  var CAT = [
    { id: 'pm1', title: 'Ja, vi elsker dette landet', author: 'Bjørnstjerne Bjørnson', year: '1859', theme: 'house', note: 'національний гімн' },
    { id: 'pm2', title: 'Terje Vigen', author: 'Henrik Ibsen', year: '1862', theme: 'snow', note: 'оповідна поема' },
    { id: 'pm3', title: 'Til ungdommen', author: 'Nordahl Grieg', year: '1936', theme: 'cross', note: 'у суспільному надбанні з 2014' },
    { id: 'pm4', title: 'Jeg ser', author: 'Sigbjørn Obstfelder', year: '1893', theme: 'doc', note: '' },
    { id: 'pm5', title: 'Til Foraaret', author: 'Henrik Wergeland', year: '', theme: 'cup', note: '' },
    { id: 'pm6', title: 'Til min Gyldenlak', author: 'Henrik Wergeland', year: '', theme: 'cup', note: '' },
    { id: 'pm7', title: 'Den engelske Lods', author: 'Henrik Wergeland', year: '', theme: 'snow', note: '' },
    { id: 'pm8', title: 'Norges Dæmring', author: 'Johan Sebastian Welhaven', year: '1834', theme: 'house', note: 'цикл сонетів' },
    { id: 'pm9', title: 'Digtets Aand', author: 'Johan Sebastian Welhaven', year: '', theme: 'doc', note: '' },
    { id: 'pm10', title: 'Gamle Norig', author: 'Aasmund Olavsson Vinje', year: '', theme: 'house', note: 'нюнорськ' },
    { id: 'pm11', title: 'Ved Rundarne', author: 'Aasmund Olavsson Vinje', year: '', theme: 'snow', note: 'нюнорськ' },
    { id: 'pm12', title: 'Haugtussa', author: 'Arne Garborg', year: '1895', theme: 'snow', note: 'нюнорськ, цикл' },
    { id: 'pm13', title: 'Arnljot Gelline', author: 'Bjørnstjerne Bjørnson', year: '', theme: 'weld', note: '' },
    { id: 'pm14', title: 'Olav Trygvason', author: 'Bjørnstjerne Bjørnson', year: '', theme: 'weld', note: '' },
    { id: 'pm15', title: 'Med en Vandlilje', author: 'Henrik Ibsen', year: '', theme: 'cup', note: '' },
    { id: 'pm16', title: 'I Billedgalleriet', author: 'Henrik Ibsen', year: '', theme: 'doc', note: '' },
    { id: 'pm17', title: 'Kringsatt av fiender', author: 'Nordahl Grieg', year: '', theme: 'cross', note: '' },
    { id: 'pm18', title: 'Revolusjonens røst', author: 'Rudolf Nilsen', year: '', theme: 'weld', note: '' },
    { id: 'pm19', title: 'Metope', author: 'Olaf Bull', year: '', theme: 'doc', note: '' },
    { id: 'pm20', title: 'Vår', author: 'Olav Aukrust', year: '', theme: 'snow', note: '' }
  ];
  /* Вшитий текст (лише те, у чому я впевнений): перша строфа гімну, переклад підрядковий */
  var BUNDLED = { pm1: [['Ja, vi elsker dette landet', 'Так, ми любимо цю країну'], ['som det stiger frem,', 'як вона здіймається,'], ['furet, værbitt, over vannet,', 'порізана, обвітрена, над водою,'], ['med de tusen hjem.', 'з тисячею домівок.'], ['Elsker, elsker det og tenker', 'Любимо, любимо її й думаємо'], ['på vår far og mor', 'про наших батька й матір'], ['og den saganatt som senker', 'і про ніч із сагами, що спускає'], ['drømme på vår jord.', 'мрії на нашу землю.']] };
  var EXPR = [
    ['å ha is i magen', 'зберігати спокій', 'мати лід у шлунку', 'Du må ha is i magen før eksamen.', 'Перед іспитом треба зберігати спокій.'],
    ['å slå to fluer i én smekk', 'вбити двох зайців одним пострілом', 'вдарити двох мух одним ударом', 'Jeg handler og leverer pakken i samme tur.', 'Я роблю покупки й віддаю посилку за один раз.'],
    ['å gå som katten rundt grøten', 'ходити навколо та навколо, не переходячи до суті', 'ходити як кіт навколо каші', 'Ikke gå som katten rundt grøten, si hva du mener.', 'Не ходи навколо та навколо, скажи, що думаєш.'],
    ['å ta det med ro', 'не поспішати, заспокоїтися', 'взяти це зі спокоєм', 'Ta det med ro, vi har god tid.', 'Не поспішай, у нас багато часу.'],
    ['å få kalde føtter', 'злякатися, передумати в останній момент', 'отримати холодні ноги', 'Han fikk kalde føtter før bryllupet.', 'Він злякався перед весіллям.'],
    ['å legge kortene på bordet', 'відкрити карти, сказати все чесно', 'покласти карти на стіл', 'La oss legge kortene på bordet.', 'Давай відкриємо карти.'],
    ['å ha noe på hjertet', 'мати щось на душі, хотіти щось сказати', 'мати щось на серці', 'Jeg har noe på hjertet.', 'У мене є що сказати.'],
    ['å gå på trynet', 'зазнати невдачі, «гепнутися»', 'піти на морду', 'Planen gikk på trynet.', 'План провалився.'],
    ['å være ute og sykle', 'нести нісенітницю, помилятися', 'бути на велосипеді', 'Nå er du helt ute og sykler.', 'Ти зараз зовсім помиляєшся.'],
    ['å ha en skrue løs', 'бути трохи не в собі', 'мати вільний гвинт', 'Han har visst en skrue løs.', 'Здається, у нього клепки не вистачає.'],
    ['å kaste inn håndkleet', 'здатися, відмовитися від спроб', 'кинути рушник', 'Etter tre forsøk kastet hun inn håndkleet.', 'Після трьох спроб вона здалася.'],
    ['å skjære alle over én kam', 'ставитися до всіх однаково', 'різати всіх одним гребінцем', 'Man skal ikke skjære alle over én kam.', 'Не можна всіх мірити однією міркою.'],
    ['å holde tungen rett i munnen', 'бути дуже уважним', 'тримати язик прямо в роті', 'Du må holde tungen rett i munnen når du sveiser.', 'Під час зварювання треба бути дуже уважним.'],
    ['å stå med lua i hånden', 'стояти з простягнутою рукою, просити', 'стояти з шапкою в руці', 'Nå står jeg med lua i hånden og ber om hjelp.', 'Тепер я стою й прошу допомоги.'],
    ['å vite hvor skoen trykker', 'знати, де болить', 'знати, де взуття тисне', 'Jeg vet hvor skoen trykker.', 'Я знаю, де болить.'],
    ['å gjøre en brøler', 'зробити грубу помилку', 'зробити рев', 'Jeg gjorde en brøler på jobben i dag.', 'Сьогодні я зробив грубу помилку на роботі.'],
    ['å være tett i pappen', 'тупити, не міркувати', 'бути щільним у картоні', 'Beklager, jeg er litt tett i pappen i dag.', 'Вибач, сьогодні я трохи туплю.'],
    ['å gå i hundre', 'мчати на повній швидкості', 'іти на сто', 'Han gikk i hundre hele dagen.', 'Він увесь день мчав без перепочинку.'],
    ['å se lyst på livet', 'бачити життя в світлих барвах', 'дивитися світло на життя', 'Hun ser lyst på livet.', 'Вона бачить життя оптимістично.'],
    ['å gjøre en bjørnetjeneste', 'зробити ведмежу послугу', 'зробити ведмежу службу', 'Han gjorde meg en bjørnetjeneste.', 'Він зробив мені ведмежу послугу.']
  ];
  function hash(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function s(x, n) { return typeof x === 'string' ? x.replace(/<[^>]*>/g, '').trim().slice(0, n || 200) : ''; }
  function P() { var p = O.state.poems = O.state.poems || {}; p.texts = p.texts || {}; p.read = p.read || {}; p.mine = p.mine || []; return p; }
  function X() { var x = O.state.exprs = O.state.exprs || {}; x.read = x.read || {}; x.mine = x.mine || []; return x; }
  function src(e) { return 'https://no.wikisource.org/w/index.php?search=' + encodeURIComponent(e.title + ' ' + e.author); }
  function poemItem(e, rec) {
    var pairs = rec.s; return { id: e.id, title: e.title, sub: e.author + (e.year ? ', ' + e.year : '') + (rec.unverified ? ' · текст відновлено ШІ, звір з першоджерелом' : ''), lvl: 'A2', theme: e.theme, poem: true, s: pairs, no: pairs.map(function (x) { return x[0]; }).join('\n'), uk: pairs.map(function (x) { return x[1]; }).join('\n'), gen: rec.gen };
  }
  function exprItem(r, id, gen) {
    var s2 = [[r[0], r[1]], [r[3], r[4]]]; return { id: id, title: r[0], sub: 'Дослівно: ' + r[2], lvl: 'A2', theme: 'doc', s: s2, no: s2.map(function (x) { return x[0]; }).join(' '), uk: s2.map(function (x) { return x[1]; }).join(' '), expr: r, gen: gen };
  }
  var SYSP = 'You supply public-domain Norwegian poems for a Ukrainian learner. The user gives a title and author. ONLY if the author died before 1956 (public domain) and you know the real text, return strict JSON {"s":[["line in the original Norwegian/Danish-Norwegian spelling as published","literal line translation to Ukrainian"]],"reliable":true|false}. At most 16 lines, the opening of the poem, lines in order, one line per item. Set reliable=false when you are not sure of the exact wording. If the work is not public domain or unknown, return {"error":"short reason in Ukrainian"}. No commentary.';
  function cleanPairs(j) {
    if (j && j.error) throw new Error(s(j.error, 160));
    var a = (Array.isArray(j && j.s) ? j.s : []).slice(0, 16).map(function (x) { return Array.isArray(x) ? [s(x[0], 200), s(x[1], 240)] : null; }).filter(function (x) { return x && x[0]; });
    if (a.length < 3) throw new Error('ШІ не знайшов текст, встав його вручну в «Свій вірш»');
    return { s: a, unverified: !(j && j.reliable === true) };
  }
  function tabs(root, cur) {
    return '<div class="chips"><button class="chip' + (cur === 'poems' ? ' on' : '') + '" data-pt="poems">📜 Вірші (20)</button><button class="chip' + (cur === 'exprs' ? ' on' : '') + '" data-pt="exprs">💬 Вирази (топ-20)</button></div>';
  }

  /* ---- Вірші ---- */
  function poemsView(box, switcher) {
    var st = P();
    function items() { return CAT.map(function (e) { var rec = BUNDLED[e.id] ? { s: BUNDLED[e.id] } : st.texts[e.id]; return { e: e, rec: rec }; }); }
    function listFn(listBox, onOpen) {
      var h = '<div class="lib" id="pgrid"></div>'; listBox.innerHTML = h; var grid = listBox.querySelector('#pgrid');
      items().forEach(function (x) {
        var e = x.e, rec = x.rec, done = st.read[e.id];
        var card = O.el('button', 'story', '<div class="cv">' + O.cover({ id: e.id, title: e.title, theme: e.theme }) + (done ? '<span class="dn">✓</span>' : '') + (rec ? '' : '<span class="lv">текст ↓</span>') + '</div><b>' + O.esc(e.title) + '</b><small class="dim">' + O.esc(e.author + (e.year ? ', ' + e.year : '')) + '</small>' + (e.note ? '<small class="dim">' + O.esc(e.note) + '</small>' : ''));
        card.onclick = function () {
          if (rec) return onOpen(poemItem(e, rec));
          card.disabled = true; card.querySelector('b').textContent = 'Завантажую…';
          O.aiJsonG(SYSP, [{ role: 'user', content: e.title + ' — ' + e.author }], 2200).then(function (g) {
            var c = cleanPairs(g.json); st.texts[e.id] = { s: c.s, unverified: c.unverified, gen: O.cleanGen(g.gen) || g.gen }; O.save(); listFn(listBox, onOpen); onOpen(poemItem(e, st.texts[e.id]));
          }).catch(function (er) { card.disabled = false; card.querySelector('b').textContent = e.title; O.toast((er && er.message && !er.code) ? er.message : (O.aiError ? O.aiError(er) : 'Не вдалося'), 4000); });
        };
        grid.appendChild(card);
      });
      st.mine.forEach(function (m) {
        var card = O.el('button', 'story', '<div class="cv">' + O.cover({ id: m.id, title: m.title, theme: 'doc' }) + (st.read[m.id] ? '<span class="dn">✓</span>' : '') + '<span class="lv">мій</span></div><b>' + O.esc(m.title) + '</b><small class="dim">свій вірш</small>');
        card.onclick = function () { onOpen(m); }; grid.appendChild(card);
      });
    }
    O.renderReader(box, {
      title: '', intro: switcher + '<p class="dim small">Тексти поетів, чиї твори вже у суспільному надбанні. Повні тексти не вшиті: тап по вірші завантажує початок (до 16 рядків) через ШІ, позначка «звір з першоджерелом» нагадує перевірити за <a href="https://no.wikisource.org" target="_blank" rel="noopener noreferrer">Wikisource</a>. Або встав свій вірш. Слова з вивчених віршів потрапляють у словник.</p>',
      list: listFn, ownTitle: 'Свій вірш', ownHint: 'Встав вірш норвезькою, по рядку', goLabel: 'Додати й читати', ownExtra: '<input id="ptitle" maxlength="80" placeholder="Назва (і автор), необов’язково">',
      saveOwn: function (text, h) {
        var lines = text.split(/\n+/).map(function (x) { return s(x, 200); }).filter(Boolean).slice(0, 40), title = s(h.root.querySelector('#ptitle').value, 80) || lines[0].slice(0, 50);
        var it = { id: 'pw' + Date.now().toString(36), title: title, sub: 'свій вірш', lvl: 'A2', theme: 'doc', poem: true, s: lines.map(function (l) { return [l, '']; }), no: lines.join('\n'), uk: '' };
        st.mine = [it].concat(st.mine).slice(0, 30); O.save(); h.renderList(); h.open(it);
        O.aiJsonG('Переклади кожен рядок норвезького вірша українською підрядково. Лише JSON {"t":["переклад рядка 1","..."]} у тому ж порядку й кількості.', [{ role: 'user', content: JSON.stringify(lines) }], 3000).then(function (g) {
          var t = Array.isArray(g.json && g.json.t) ? g.json.t : []; if (t.length !== lines.length) return; it.s = lines.map(function (l, i) { return [l, s(t[i], 240)]; }); it.uk = it.s.map(function (x) { return x[1]; }).join('\n'); it.gen = O.cleanGen(g.gen) || g.gen; O.save(); h.open(it);
        }).catch(function () { /* без перекладу: працює й так */ });
      },
      ai: { label: 'ШІ: знайти вірш за назвою', run: function (h) {
        var t = s(h.root.querySelector('#ptitle').value, 120); if (!t) return O.toast('Впиши назву й автора у полі «Назва» вище', 3000);
        h.button.disabled = true; h.button.textContent = 'Шукаю…';
        O.aiJsonG(SYSP, [{ role: 'user', content: t }], 2200).then(function (g) {
          var c = cleanPairs(g.json), it = { id: 'pw' + Date.now().toString(36), title: t.split(/\s[—-]\s/)[0].slice(0, 80), sub: 'знайдено ШІ' + (c.unverified ? ', звір з першоджерелом' : ''), lvl: 'A2', theme: 'doc', poem: true, s: c.s, no: c.s.map(function (x) { return x[0]; }).join('\n'), uk: c.s.map(function (x) { return x[1]; }).join('\n'), gen: O.cleanGen(g.gen) || g.gen };
          st.mine = [it].concat(st.mine).slice(0, 30); O.save(); h.renderList(); h.open(it);
        }).catch(function (er) { O.toast((er && er.message && !er.code) ? er.message : (O.aiError ? O.aiError(er) : 'Не вдалося'), 4000); }).then(function () { h.button.disabled = false; h.button.textContent = 'ШІ: знайти вірш за назвою'; });
      } },
      onDone: function (cur, h) {
        st.read[cur.id] = { t: Date.now() }; O.state.xp += 15; O.save(); O.sfx('done');
        h.addAll(function (n) { O.toast('Вірш вивчено' + (n ? ', нових слів у словнику: ' + n : '')); h.renderList(); }, true, 30);
      }
    });
    bindTabs(box, switcher);
  }

  /* ---- Вирази ---- */
  function exprView(box, switcher) {
    var st = X();
    function all() { return EXPR.map(function (r, i) { return { r: r, id: 'ex' + i }; }).concat(st.mine.map(function (m) { return { r: m.r, id: m.id, gen: m.gen, mine: true }; })); }
    function listFn(listBox, onOpen) {
      listBox.innerHTML = '<div class="lib" id="xgrid"></div>'; var grid = listBox.querySelector('#xgrid');
      all().forEach(function (x) {
        var done = st.read[x.id];
        var card = O.el('button', 'story', '<div class="cv">' + O.cover({ id: x.id, title: x.r[0], theme: x.mine ? 'cup' : 'doc' }) + (done ? '<span class="dn">✓</span>' : '') + (x.mine ? '<span class="lv">' + (x.gen ? 'ШІ' : 'мій') + '</span>' : '') + '</div><b>' + O.esc(x.r[0]) + '</b><small class="dim">' + O.esc(x.r[1]) + '</small>');
        card.onclick = function () { onOpen(exprItem(x.r, x.id, x.gen)); }; grid.appendChild(card);
      });
    }
    function saveExpr(r, gen) { var it = { id: 'xw' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), r: r, gen: gen || null }; st.mine = [it].concat(st.mine).slice(0, 80); O.save(); return it; }
    O.renderReader(box, {
      title: '', intro: switcher + '<p class="dim small">Топ-20 вживаних виразів із прикладами (прості речення написані моделлю, носієм не перевірені). Додай свій вираз або попроси ШІ згенерувати нові. «Вивчено» додає вираз і його слова в словник.</p>',
      list: listFn, ownTitle: 'Свій вираз або ШІ', goLabel: 'Додати свій вираз', ownHint: 'вираз = переклад (по одному в рядку), напр.: å ta det med ro = не поспішати',
      ownExtra: '<input id="xtopic" maxlength="40" placeholder="Тема для ШІ (необов’язково): робота, погода, їжа…">',
      saveOwn: function (text, h) {
        var rows = text.split(/\n+/).map(function (l) { var p = l.split(/\s*=\s*/); return { no: s(p[0], 80), uk: s(p.slice(1).join(' = '), 120) }; }).filter(function (x) { return x.no; }).slice(0, 10), last = null;
        rows.forEach(function (x) { last = saveExpr([x.no, x.uk || '(переклад не вказано)', '', '', ''], null); });
        if (!last) return; h.renderList(); h.open(exprItem(last.r, last.id, null));
        var need = rows.some(function (x) { return !x.uk; }); if (!need) return;
        O.aiJsonG('Ти репетитор норвезької. Для кожного виразу дай переклад, дослівний переклад і короткий приклад. Лише JSON {"items":[{"no":"","uk":"","lit":"","ex":"","exUk":""}]} у тому ж порядку й кількості.', [{ role: 'user', content: JSON.stringify(rows.map(function (x) { return x.no; })) }], 2200).then(function (g) {
          var it = Array.isArray(g.json && g.json.items) ? g.json.items : []; st.mine.slice(0, rows.length).reverse().forEach(function (m, i) { var j = it[i]; if (j && !rows[i].uk) { m.r = [m.r[0], s(j.uk, 120) || m.r[1], s(j.lit, 120), s(j.ex, 160), s(j.exUk, 200)]; m.gen = O.cleanGen(g.gen) || g.gen; } }); O.save(); h.renderList();
        }).catch(function () { /* залишається без автоперекладу */ });
      },
      ai: { label: 'ШІ: нові вирази', run: function (h) {
        var topic = s(h.root.querySelector('#xtopic').value, 40); h.button.disabled = true; h.button.textContent = 'Генерую…';
        var have = all().map(function (x) { return x.r[0]; }).slice(0, 60).join('; ');
        O.aiJsonG('Ти репетитор норвезької (bokmål) для дорослого українця, рівень A2-B1. Дай 6 уживаних виразів/ідіом за темою (' + (topic || 'повсякденне життя й робота') + '), яких немає в списку. Лише JSON {"items":[{"no":"вираз з å","uk":"значення українською","lit":"дослівно українською","ex":"коротке просте речення норвезькою","exUk":"переклад"}]}. Не вигадуй: лише справжні, вживані вирази.', [{ role: 'user', content: 'Вже є: ' + have }], 2500).then(function (g) {
          var it = (Array.isArray(g.json && g.json.items) ? g.json.items : []).map(function (j) { return [s(j && j.no, 80), s(j && j.uk, 120), s(j && j.lit, 120), s(j && j.ex, 160), s(j && j.exUk, 200)]; }).filter(function (r) { return r[0] && r[1]; }).slice(0, 8);
          if (!it.length) throw new Error('ШІ дав порожню відповідь'); var gen = O.cleanGen(g.gen) || g.gen, last = null; it.forEach(function (r) { last = saveExpr(r, gen); });
          h.renderList(); h.open(exprItem(last.r, last.id, gen)); O.toast('Нових виразів: ' + it.length);
        }).catch(function (er) { O.toast((er && er.message && !er.code) ? er.message : (O.aiError ? O.aiError(er) : 'Не вдалося'), 4000); }).then(function () { h.button.disabled = false; h.button.textContent = 'ШІ: нові вирази'; });
      } },
      onDone: function (cur, h) {
        var r = cur.expr; st.read[cur.id] = { t: Date.now() }; O.state.xp += 10;
        if (r) { O.addWord({ id: 'u:ex:' + hash(r[0].toLowerCase()), deck: 'mine', cat: 'Mine', no: r[0], uk: r[1], ex: r[3] || '', exUk: r[4] || '', fact: r[2] ? 'Дослівно: ' + r[2] : '' }); }
        O.save(); O.sfx('done'); h.addAll(function (n) { O.toast('Вираз вивчено, у словнику' + (n ? ' + ' + n + ' слів' : '')); h.renderList(); }, true, 20);
      }
    });
    bindTabs(box, switcher);
  }
  function bindTabs(box, sw) { O.$$('[data-pt]', box).forEach(function (b) { b.onclick = function () { O.state.settings.poemsTab = b.getAttribute('data-pt'); O.save(); O.renderPoems(box.parentNode); }; }); }

  O.renderPoems = function (root) {
    var cur = O.state.settings.poemsTab === 'exprs' ? 'exprs' : 'poems';
    root.innerHTML = '<h2>Вірші та вирази</h2><div id="pbox"></div>'; var box = root.querySelector('#pbox'), sw = tabs(root, cur);
    (cur === 'poems' ? poemsView : exprView)(box, sw);
  };
  O.POEMS_CAT = CAT; O.EXPRESSIONS = EXPR;
})();
