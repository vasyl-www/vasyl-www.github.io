/* Вірші та вирази: каталог із 20 відомих віршів (авторів, чиї твори вже у суспільному надбанні) і топ-20 норвезьких виразів.
   Працює як читалка: тап по слову, переклад рядків, озвучка, «Вивчено» додає слова (і вираз) у словник. Можна додати свій текст або згенерувати ШІ. */
(function () {
  var O = window.ORD;
  /* Каталог: лише автори, чиї твори в суспільному надбанні (померли понад 70 років тому). Текст завантажується на вимогу, бо повні тексти не вшито. */
  var CAT = [
    { id: 'pm1', title: 'Ja, vi elsker dette landet', author: 'Bjørnstjerne Bjørnson', year: '1859', theme: 'house', lvl: 'B1', note: 'національний гімн' },
    { id: 'pm2', title: 'Terje Vigen', author: 'Henrik Ibsen', year: '1862', theme: 'snow', lvl: 'B1', note: 'оповідна поема' },
    { id: 'pm3', title: 'Til ungdommen', author: 'Nordahl Grieg', year: '1936', theme: 'cross', lvl: 'B1', note: 'у суспільному надбанні з 2014' },
    { id: 'pm4', title: 'Jeg ser', author: 'Sigbjørn Obstfelder', year: '1893', theme: 'doc', lvl: 'B1', note: '' },
    { id: 'pm5', title: 'Til Foraaret', author: 'Henrik Wergeland', year: '', theme: 'cup', lvl: 'B1', note: '' },
    { id: 'pm6', title: 'Til min Gyldenlak', author: 'Henrik Wergeland', year: '', theme: 'cup', lvl: 'B1', note: '' },
    { id: 'pm7', title: 'Den engelske Lods', author: 'Henrik Wergeland', year: '', theme: 'snow', lvl: 'B1', note: '' },
    { id: 'pm8', title: 'Norges Dæmring', author: 'Johan Sebastian Welhaven', year: '1834', theme: 'house', lvl: 'B1', note: 'цикл сонетів' },
    { id: 'pm9', title: 'Digtets Aand', author: 'Johan Sebastian Welhaven', year: '', theme: 'doc', lvl: 'B1', note: '' },
    { id: 'pm10', title: 'Gamle Norig', author: 'Aasmund Olavsson Vinje', year: '', theme: 'house', lvl: 'B1', note: 'нюнорськ' },
    { id: 'pm11', title: 'Ved Rundarne', author: 'Aasmund Olavsson Vinje', year: '', theme: 'snow', lvl: 'B1', note: 'нюнорськ' },
    { id: 'pm12', title: 'Haugtussa', author: 'Arne Garborg', year: '1895', theme: 'snow', lvl: 'B1', note: 'нюнорськ, цикл' },
    { id: 'pm13', title: 'Arnljot Gelline', author: 'Bjørnstjerne Bjørnson', year: '', theme: 'weld', lvl: 'B1', note: '' },
    { id: 'pm14', title: 'Olav Trygvason', author: 'Bjørnstjerne Bjørnson', year: '', theme: 'weld', lvl: 'B1', note: '' },
    { id: 'pm15', title: 'Med en Vandlilje', author: 'Henrik Ibsen', year: '', theme: 'cup', lvl: 'B1', note: '' },
    { id: 'pm16', title: 'I Billedgalleriet', author: 'Henrik Ibsen', year: '', theme: 'doc', lvl: 'B1', note: '' },
    { id: 'pm17', title: 'Kringsatt av fiender', author: 'Nordahl Grieg', year: '', theme: 'cross', lvl: 'B1', note: '' },
    { id: 'pm18', title: 'Revolusjonens røst', author: 'Rudolf Nilsen', year: '', theme: 'weld', lvl: 'B1', note: '' },
    { id: 'pm19', title: 'Metope', author: 'Olaf Bull', year: '', theme: 'doc', lvl: 'B1', note: '' },
    { id: 'pm20', title: 'Vår', author: 'Olav Aukrust', year: '', theme: 'snow', lvl: 'B1', note: '' }
  ];
  /* Вшитий текст (лише те, у чому я впевнений): перша строфа гімну, переклад підрядковий */
  var BUNDLED = { pm1: [['Ja, vi elsker dette landet', 'Так, ми любимо цю країну'], ['som det stiger frem,', 'як вона здіймається,'], ['furet, værbitt, over vannet,', 'порізана, обвітрена, над водою,'], ['med de tusen hjem.', 'з тисячею домівок.'], ['Elsker, elsker det og tenker', 'Любимо, любимо її й думаємо'], ['på vår far og mor', 'про наших батька й матір'], ['og den saganatt som senker', 'і про ніч із сагами, що спускає'], ['drømme på vår jord.', 'мрії на нашу землю.']] };
  var EXPR = [
    ['å ha is i magen', 'зберігати спокій', 'мати лід у шлунку', 'Du må ha is i magen før eksamen.', 'Перед іспитом треба зберігати спокій.', 'B1'],
    ['å slå to fluer i én smekk', 'вбити двох зайців одним пострілом', 'вдарити двох мух одним ударом', 'Jeg handler og leverer pakken i samme tur.', 'Я роблю покупки й віддаю посилку за один раз.', 'A2'],
    ['å gå som katten rundt grøten', 'ходити навколо та навколо, не переходячи до суті', 'ходити як кіт навколо каші', 'Ikke gå som katten rundt grøten, si hva du mener.', 'Не ходи навколо та навколо, скажи, що думаєш.', 'B1'],
    ['å ta det med ro', 'не поспішати, заспокоїтися', 'взяти це зі спокоєм', 'Ta det med ro, vi har god tid.', 'Не поспішай, у нас багато часу.', 'A2'],
    ['å få kalde føtter', 'злякатися, передумати в останній момент', 'отримати холодні ноги', 'Han fikk kalde føtter før bryllupet.', 'Він злякався перед весіллям.', 'B1'],
    ['å legge kortene på bordet', 'відкрити карти, сказати все чесно', 'покласти карти на стіл', 'La oss legge kortene på bordet.', 'Давай відкриємо карти.', 'B1'],
    ['å ha noe på hjertet', 'мати щось на душі, хотіти щось сказати', 'мати щось на серці', 'Jeg har noe på hjertet.', 'У мене є що сказати.', 'A2'],
    ['å gå på trynet', 'зазнати невдачі, «гепнутися»', 'піти на морду', 'Planen gikk på trynet.', 'План провалився.', 'B1'],
    ['å være ute og sykle', 'нести нісенітницю, помилятися', 'бути на велосипеді', 'Nå er du helt ute og sykler.', 'Ти зараз зовсім помиляєшся.', 'B1'],
    ['å ha en skrue løs', 'бути трохи не в собі', 'мати вільний гвинт', 'Han har visst en skrue løs.', 'Здається, у нього клепки не вистачає.', 'B1'],
    ['å kaste inn håndkleet', 'здатися, відмовитися від спроб', 'кинути рушник', 'Etter tre forsøk kastet hun inn håndkleet.', 'Після трьох спроб вона здалася.', 'A2'],
    ['å skjære alle over én kam', 'ставитися до всіх однаково', 'різати всіх одним гребінцем', 'Man skal ikke skjære alle over én kam.', 'Не можна всіх мірити однією міркою.', 'B1'],
    ['å holde tungen rett i munnen', 'бути дуже уважним', 'тримати язик прямо в роті', 'Du må holde tungen rett i munnen når du sveiser.', 'Під час зварювання треба бути дуже уважним.', 'B1'],
    ['å stå med lua i hånden', 'стояти з простягнутою рукою, просити', 'стояти з шапкою в руці', 'Nå står jeg med lua i hånden og ber om hjelp.', 'Тепер я стою й прошу допомоги.', 'B1'],
    ['å vite hvor skoen trykker', 'знати, де болить', 'знати, де взуття тисне', 'Jeg vet hvor skoen trykker.', 'Я знаю, де болить.', 'B1'],
    ['å gjøre en brøler', 'зробити грубу помилку', 'зробити рев', 'Jeg gjorde en brøler på jobben i dag.', 'Сьогодні я зробив грубу помилку на роботі.', 'B1'],
    ['å være tett i pappen', 'тупити, не міркувати', 'бути щільним у картоні', 'Beklager, jeg er litt tett i pappen i dag.', 'Вибач, сьогодні я трохи туплю.', 'B1'],
    ['å gå i hundre', 'мчати на повній швидкості', 'іти на сто', 'Han gikk i hundre hele dagen.', 'Він увесь день мчав без перепочинку.', 'A2'],
    ['å se lyst på livet', 'бачити життя в світлих барвах', 'дивитися світло на життя', 'Hun ser lyst på livet.', 'Вона бачить життя оптимістично.', 'A2'],
    ['å gjøre en bjørnetjeneste', 'зробити ведмежу послугу', 'зробити ведмежу службу', 'Han gjorde meg en bjørnetjeneste.', 'Він зробив мені ведмежу послугу.', 'B1']
  ];

  /* Повсякденні фрази рівня A1: усталені форми, які я знаю впевнено; рівні в додатку орієнтовні (моя оцінка, не офіційний CEFR) */
  var BASIC = [
    ['Hvordan går det?', 'Як справи?', 'як ходить це', 'Hei! Hvordan går det med deg?', 'Привіт! Як у тебе справи?', 'A1'],
    ['Det går bra', 'Усе добре', 'це йде добре', 'Det går bra, takk.', 'Усе добре, дякую.', 'A1'],
    ['Ha det bra!', 'Бувай!', 'май це добре', 'Ha det bra, vi ses i morgen!', 'Бувай, до завтра!', 'A1'],
    ['Vi ses!', 'Побачимось!', 'ми бачимося', 'Vi ses på mandag.', 'Побачимось у понеділок.', 'A1'],
    ['Vær så god', 'Будь ласка (коли подаєш)', 'будь так добрий', 'Vær så god, her er kaffen.', 'Будь ласка, ось кава.', 'A1'],
    ['Selv takk', 'Будь ласка (у відповідь на дякую)', 'самі дякую', 'Takk for hjelpen! Selv takk.', 'Дякую за допомогу! Будь ласка.', 'A1'],
    ['Ingen årsak', 'Нема за що', 'жодної причини', 'Takk! Ingen årsak.', 'Дякую! Нема за що.', 'A1'],
    ['Unnskyld meg', 'Перепрошую', 'вибач мені', 'Unnskyld meg, hvor er toalettet?', 'Перепрошую, де туалет?', 'A1'],
    ['Jeg forstår ikke', 'Я не розумію', 'я розумію не', 'Jeg forstår ikke, kan du si det igjen?', 'Я не розумію, можеш повторити?', 'A1'],
    ['Kan du snakke saktere?', 'Можете говорити повільніше?', 'можеш ти говорити повільніше', 'Kan du snakke saktere, takk?', 'Можете говорити повільніше, будь ласка?', 'A1']
  ];
  /* Автооцінка рівня для власних текстів: довжина слів і рядків. Це груба евристика, не CEFR. */
  function autoLvl(lines) {
    var w = lines.join(' ').split(/\s+/).filter(Boolean); if (!w.length) return 'A2';
    var awl = w.join('').replace(/[^\p{L}]/gu, '').length / w.length, wpl = w.length / Math.max(1, lines.length);
    return (awl <= 4.3 && wpl <= 5) ? 'A1' : (awl <= 5.2 && wpl <= 7) ? 'A2' : 'B1';
  }
  function lvlBar(grid, listBox) {
    var cur = O.state.settings.poemsLvl || 'all', cards = O.$$('.story', grid), bar = O.el('div', 'chips', '');
    ['all', 'A1', 'A2', 'B1'].forEach(function (v) {
      var n = cards.filter(function (c) { return v === 'all' || c.getAttribute('data-lvl') === v; }).length;
      var b = O.el('button', 'chip', (v === 'all' ? 'Усі' : v) + ' · ' + n); b.setAttribute('data-lv', v); bar.appendChild(b);
      b.onclick = function () { O.state.settings.poemsLvl = v; O.save(); apply(v); };
    });
    function apply(v) { cards.forEach(function (c) { c.style.display = (v === 'all' || c.getAttribute('data-lvl') === v) ? '' : 'none'; }); O.$$('[data-lv]', bar).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-lv') === v); }); var em = grid.querySelector('.lvempty'); if (em) em.remove(); if (v !== 'all' && !cards.some(function (c) { return c.getAttribute('data-lvl') === v; })) grid.appendChild(O.el('div', 'dim small lvempty', 'На рівні ' + v + ' поки немає. Додай свій текст, рівень визначиться автоматично (орієнтовно).')); }
    listBox.insertBefore(bar, grid); apply(cur);
  }
  function hash(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function s(x, n) { return typeof x === 'string' ? x.replace(/<[^>]*>/g, '').trim().slice(0, n || 200) : ''; }
  function P() { var p = O.state.poems = O.state.poems || {}; p.texts = p.texts || {}; p.read = p.read || {}; p.mine = p.mine || []; return p; }
  function X() { var x = O.state.exprs = O.state.exprs || {}; x.read = x.read || {}; x.mine = x.mine || []; return x; }
  function src(e) { return 'https://no.wikisource.org/w/index.php?search=' + encodeURIComponent(e.title + ' ' + e.author); }
  function poemItem(e, rec) {
    var pairs = rec.s; return { id: e.id, title: e.title, sub: e.author + (e.year ? ', ' + e.year : '') + (rec.unverified ? ' · текст відновлено ШІ, звір з першоджерелом' : ''), lvl: e.lvl || 'B1', theme: e.theme, poem: true, s: pairs, no: pairs.map(function (x) { return x[0]; }).join('\n'), uk: pairs.map(function (x) { return x[1]; }).join('\n'), gen: rec.gen };
  }
  function exprItem(r, id, gen) {
    var s2 = [[r[0], r[1]], [r[3], r[4]]]; return { id: id, title: r[0], sub: 'Дослівно: ' + r[2], lvl: r[5] || 'A2', theme: 'doc', s: s2, no: s2.map(function (x) { return x[0]; }).join(' '), uk: s2.map(function (x) { return x[1]; }).join(' '), expr: r, gen: gen };
  }
  var SYSP = 'You supply public-domain Norwegian poems for a Ukrainian learner. The user gives a title and author. ONLY if the author died before 1956 (public domain) and you know the real text, return strict JSON {"s":[["line in the original Norwegian/Danish-Norwegian spelling as published","literal line translation to Ukrainian"]],"reliable":true|false}. At most 16 lines, the opening of the poem, lines in order, one line per item. Set reliable=false when you are not sure of the exact wording. If the work is not public domain or unknown, return {"error":"short reason in Ukrainian"}. No commentary.';
  function cleanPairs(j) {
    if (j && j.error) throw new Error(s(j.error, 160));
    var a = (Array.isArray(j && j.s) ? j.s : []).slice(0, 16).map(function (x) { return Array.isArray(x) ? [s(x[0], 200), s(x[1], 240)] : null; }).filter(function (x) { return x && x[0]; });
    if (a.length < 3) throw new Error('ШІ не знайшов текст, встав його вручну в «Свій вірш»');
    return { s: a, unverified: !(j && j.reliable === true) };
  }

  /* ---- Режим «Вчити»: ступені пропусків (як у Memorize By Heart / Poems By Heart), вилучення з пам'яті та розклад повторень ---- */
  /* Інтервали (дні) — мій вибір під принцип Cepeda 2006 «оптимальний інтервал росте разом із терміном утримання», а не емпіричні значення. */
  var IVL = [1, 3, 7, 16, 35, 80], DAY = 864e5, CHUNK = 4;
  var STAGES = [
    { n: 'Слухай і промов', d: 'Прослухай кожен рядок і промов його вголос або про себе (беззвучне промовляння теж працює)' },
    { n: 'Пропуски 30 %', d: 'Впиши пропущені слова' },
    { n: 'Пропуски 60 %', d: 'Більше пропусків' },
    { n: 'Перші літери', d: 'Видно лише першу літеру кожного слова' },
    { n: 'З пам’яті', d: 'Впиши рядок повністю, без підказок' }
  ];
  function prog() { var p = P(); p.prog = p.prog || {}; return p.prog; }
  function dueList() { var now = Date.now(), pr = prog(); return Object.keys(pr).filter(function (k) { return pr[k].due && pr[k].due <= now; }).sort(function (a, b) { return pr[a].due - pr[b].due; }); }
  function blankPick(seed, ratio, words) {
    var out = words.map(function (w, i) { return w.replace(/[^\p{L}]/gu, '').length > 2 && (hashN(seed + ':' + i) % 100) < ratio; });
    if (!out.some(Boolean) && words.length > 1) { var bi = 0; words.forEach(function (w, i) { if (w.length > words[bi].length) bi = i; }); out[bi] = true; }
    return out;
  }
  function hashN(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0); }
  function same(a, b) { return O.fold(O.norm(a)) === O.fold(O.norm(b)); }
  function study(host, item, h, start) {
    var lines = item.s.map(function (x) { return x[0]; }), trs = item.s.map(function (x) { return x[1]; }), chunks = [];
    for (var i = 0; i < lines.length; i += CHUNK) chunks.push(lines.slice(i, i + CHUNK).map(function (l, k) { return { l: l, tr: trs[i + k], i: i + k }; }));
    var stage = start || 0, ci = 0, miss = {}, tot = 0, okN = 0;
    function head() { return '<div class="dim small">Ступінь ' + (stage + 1) + '/5 · ' + STAGES[stage].n + (chunks.length > 1 ? ' · частина ' + (ci + 1) + '/' + chunks.length : '') + '</div><p class="small">' + STAGES[stage].d + '</p>'; }
    function draw() {
      var ch = chunks[ci], html = head();
      if (stage === 0) {
        html += ch.map(function (r) { return '<div class="stl"><button class="btn ghost" data-sp="' + r.i + '">🔊</button> <b class="no">' + O.esc(r.l) + '</b>' + (r.tr ? '<div class="dim small">' + O.esc(r.tr) + '</div>' : '') + '</div>'; }).join('') + '<div class="row"><button class="btn" id="stnx">Промовив(ла) → далі</button><button class="btn ghost" id="stx">Закрити</button></div>';
        host.innerHTML = html; O.$$('[data-sp]', host).forEach(function (b) { b.onclick = function () { O.speak(lines[+b.getAttribute('data-sp')]); }; });
        host.querySelector('#stnx').onclick = next; host.querySelector('#stx').onclick = function () { host.innerHTML = ''; }; return;
      }
      html += ch.map(function (r) {
        if (stage === 4) return '<div class="stl"><input class="cz line" data-a="' + O.esc(r.l) + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="рядок ' + (r.i + 1) + '…">' + (r.tr ? '<div class="dim small">' + O.esc(r.tr) + '</div>' : '') + '</div>';
        var ws = r.l.split(/\s+/), bl = stage === 3 ? ws.map(function (w) { return w.replace(/[^\p{L}]/gu, '').length > 0; }) : blankPick(item.id + ':' + r.i + ':' + stage, stage === 1 ? 30 : 60, ws);
        return '<div class="stl">' + ws.map(function (w, wi) { if (!bl[wi]) return O.esc(w); var core = w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''), at = w.indexOf(core), pre = w.slice(0, at), post = w.slice(at + core.length); return O.esc(pre) + '<input class="cz" data-a="' + O.esc(core) + '" size="' + Math.max(2, core.length) + '" placeholder="' + (stage === 3 ? O.esc(core.charAt(0)) : '') + '" autocomplete="off" autocapitalize="off" spellcheck="false">' + O.esc(post); }).join(' ') + (r.tr ? '<div class="dim small">' + O.esc(r.tr) + '</div>' : '') + '</div>';
      }).join('') + '<div class="row"><button class="btn" id="stck">Перевірити</button><button class="btn ghost" id="stx">Закрити</button></div><div id="stmsg" class="small"></div>';
      host.innerHTML = html; var first = host.querySelector('.cz'); if (first) first.focus();
      host.querySelector('#stx').onclick = function () { host.innerHTML = ''; };
      host.querySelector('#stck').onclick = check;
    }
    function check() {
      var inputs = O.$$('.cz', host), ok = 0, bad = [];
      inputs.forEach(function (inp) {
        var a = inp.getAttribute('data-a'), good = inp.classList.contains('line') ? O.sim(inp.value, a) >= 0.9 : same(inp.value, a);
        inp.classList.toggle('ok', good); inp.classList.toggle('bad', !good); inp.disabled = true;
        if (good) ok++; else { bad.push(a); inp.value = a; a.split(/\s+/).forEach(function (w) { var c = w.replace(/[^\p{L}]/gu, '').toLowerCase(); if (c.length > 2) miss[c] = 1; }); }
      });
      tot += inputs.length; okN += ok; var acc = inputs.length ? ok / inputs.length : 1, msg = host.querySelector('#stmsg'), btn = host.querySelector('#stck');
      msg.textContent = 'Правильно: ' + ok + ' з ' + inputs.length + (bad.length ? '. Помилки виправлено в полях, спробуй ще раз.' : '. Чисто!');
      btn.textContent = acc >= 0.8 ? 'Далі →' : 'Ще раз'; btn.onclick = function () { if (acc >= 0.8) next(); else { tot -= inputs.length; okN -= ok; draw(); } };
      O.sfx && O.sfx(acc >= 0.8 ? 'ok' : 'no');
    }
    function next() {
      if (ci + 1 < chunks.length) { ci++; return draw(); }
      if (stage < 4) { stage++; ci = 0; return draw(); }
      finish();
    }
    function finish() {
      var acc = tot ? okN / tot : 1, pr = prog(), r = pr[item.id] || { step: 0 };
      r.step = acc >= 0.8 ? Math.min(IVL.length - 1, (r.step || 0) + (start === 4 ? 1 : 0)) : Math.max(0, (r.step || 0) - 1);
      if (!pr[item.id] || start !== 4) r.step = Math.max(r.step, 0);
      r.due = Date.now() + IVL[r.step] * DAY; r.last = Date.now(); r.acc = Math.round(acc * 100); r.title = item.title; pr[item.id] = r;
      O.state.xp += 20; var st = P(); if (item.expr) X().read[item.id] = { t: Date.now() }; else st.read[item.id] = { t: Date.now() };
      var added = 0; Object.keys(miss).forEach(function (w) { var lw = O.localLookup(w); if (lw && O.addWord(lw)) added++; });
      O.save(); O.sfx && O.sfx('done');
      host.innerHTML = '<p><b>Готово.</b> Точність на останньому ступені: ' + r.acc + ' %. Наступне повторення через ' + IVL[r.step] + ' дн. (з пам’яті, без перечитування).' + (added ? ' Слів зі «слабких» у словнику: ' + added + '.' : '') + '</p><button class="btn ghost" id="stx">Закрити</button>';
      host.querySelector('#stx').onclick = function () { host.innerHTML = ''; };
      h.addAll(function (n) { if (n) O.toast('Нових слів у словнику: ' + n); h.renderList(); }, true, 30);
    }
    draw();
  }
  function hook(t, h) {
    var root = h.root, bar = root.querySelector('.rbar'); if (!bar) return;
    O.$$('.studybtn,.study', root).forEach(function (x) { x.remove(); });
    var b = O.el('button', 'btn studybtn', '🧠 Вчити напам’ять'), panel = O.el('div', 'study card', ''); b.setAttribute('type', 'button');
    var pr = prog()[t.id], due = pr && pr.due && pr.due <= Date.now();
    bar.appendChild(b); bar.parentNode.appendChild(panel);
    b.onclick = function () { study(panel, t, h, due ? 4 : 0); try { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* ok */ } };
    if (pr) { var st = O.el('div', 'dim small', 'Вивчено ' + pr.acc + ' %' + (due ? ' · час повторити: почнеш одразу з пам’яті' : ' · наступне повторення ' + new Date(pr.due).toLocaleDateString('uk-UA'))); bar.parentNode.insertBefore(st, panel); st.className = 'study dim small'; }
  }
  function dueBanner(listBox, onOpen, find) {
    var d = dueList().filter(function (k) { return find(k); }); if (!d.length) return;
    var ban = O.el('div', 'card', '<b>Повторити сьогодні: ' + d.length + '</b><div class="row" style="flex-wrap:wrap;gap:6px"></div>'), row = ban.querySelector('.row');
    d.slice(0, 8).forEach(function (k) { var it = find(k), bt = O.el('button', 'chip', O.esc(it.title)); bt.onclick = function () { onOpen(it); }; row.appendChild(bt); });
    listBox.insertBefore(ban, listBox.firstChild);
  }
  var EVID = '<details class="small"><summary>Чому саме так (джерела)</summary><ul>' +
    '<li><b>Вилучення з пам’яті краще за перечитування на довгий термін:</b> <a href="https://www.gwern.net/docs/spaced-repetition/2006-roediger.pdf" target="_blank" rel="noopener noreferrer">Roediger &amp; Karpicke, 2006</a>. Через 1 тиждень 61 % (три тести) проти 40 % (чотири перечитування); через 5 хвилин навпаки, перечитування дало більше. Це були уривки прози й студенти, не вірші й не іноземна мова.</li>' +
    '<li><b>Інтервали між повтореннями:</b> <a href="https://pubmed.ncbi.nlm.nih.gov/16719566/" target="_blank" rel="noopener noreferrer">Cepeda et al., 2006</a>, 839 оцінок із 317 експериментів: найкращий інтервал росте разом із терміном, на який треба пам’ятати. Конкретні дні в додатку (1, 3, 7, 16, 35, 80) мій вибір, а не виміряні цифри.</li>' +
    '<li><b>Промовляння:</b> <a href="https://uwaterloo.ca/memory-attention-cognition-lab/sites/default/files/uploads/files/jep10.pdf" target="_blank" rel="noopener noreferrer">MacLeod et al., 2010</a>: слова, сказані вголос (чи беззвучно промовлені), згадуються краще, на ~10–20 % за впізнаванням. Дослідження про списки слів, не про вірші.</li>' +
    '<li><b>Огляд технік навчання:</b> <a href="https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html" target="_blank" rel="noopener noreferrer">Dunlosky et al., 2013</a>: практичне тестування й розподілене повторення — висока корисність; перечитування та підкреслення — низька.</li>' +
    '<li><b>Застосунки:</b> <a href="https://apps.apple.com/us/app/memorize-by-heart-learn-texts/id1436935583" target="_blank" rel="noopener noreferrer">Memorize By Heart</a> (приховування слів, перші літери, впорядкування, введення з пам’яті, інтервальні повтори, поділ на частини) і <a href="https://www.inklestudios.com/poemsbyheart/" target="_blank" rel="noopener noreferrer">Poems By Heart</a> (п’ять ступенів прибирання слів). Контрольованих доказів їхньої ефективності на цих сторінках немає, тож береться лише механіка, що збігається з перевіреними принципами вище.</li>' +
    '</ul><p>Не перевірено: що саме для віршів іноземною мовою ці ефекти мають той самий розмір; що рима й розмір допомагають (так стверджує Poems By Heart, доказів я не знайшов).</p></details>';
  function viewBar(grid, listBox) {
    var cur = O.state.settings.poemsView || 'big', M = [['big', '▦ Великі'], ['small', '▪ Малі'], ['list', '☰ Список']];
    function apply(v) { grid.className = 'lib' + (v === 'small' ? ' sm' : v === 'list' ? ' ls' : ''); O.$$('[data-pv]', bar).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pv') === v); }); }
    var bar = O.el('div', 'chips', M.map(function (m) { return '<button class="chip" data-pv="' + m[0] + '">' + m[1] + '</button>'; }).join(''));
    listBox.insertBefore(bar, grid); apply(cur);
    O.$$('[data-pv]', bar).forEach(function (b) { b.onclick = function () { O.state.settings.poemsView = b.getAttribute('data-pv'); O.save(); apply(b.getAttribute('data-pv')); }; });
  }
  /* Wikisource (першоджерело): пошук і витяг тексту прямо з пристрою користувача, анонімний GET із origin=* */
  var WS = 'https://no.wikisource.org/w/api.php';
  function wsSearch(q) {
    return fetch(WS + '?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&srlimit=8&format=json&origin=*', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('Wikisource: ' + r.status); return r.json(); }).then(function (j) {
      return ((j.query && j.query.search) || []).map(function (x) { return x.title; });
    });
  }
  function wsText(title) {
    return fetch(WS + '?action=parse&page=' + encodeURIComponent(title) + '&prop=text&redirects=1&format=json&formatversion=2&origin=*', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('Wikisource: ' + r.status); return r.json(); }).then(function (j) {
      var html = j && j.parse && j.parse.text; if (!html) throw new Error('Сторінку не знайдено');
      html = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|dd|li|h\d)>/gi, '\n');
      var doc = new DOMParser().parseFromString(html, 'text/html');
      O.$$('script,style,table,sup,.mw-editsection,.noprint,.ws-noexport,.reference,.navbox', doc).forEach(function (n) { n.remove(); });
      var poem = O.$$('.poem', doc), txt = (poem.length ? poem.map(function (n) { return n.textContent; }).join('\n\n') : doc.body.textContent);
      return txt.split(/\n/).map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(function (l, i, a) { return l || (a[i - 1]); }).join('\n').trim();
    });
  }
  function transLines(lines, done) {
    O.aiJsonG('Переклади кожен рядок норвезького вірша українською підрядково. Лише JSON {"t":["переклад рядка 1","..."]} у тому ж порядку й кількості.', [{ role: 'user', content: JSON.stringify(lines) }], 3000).then(function (g) {
      var t = Array.isArray(g.json && g.json.t) ? g.json.t : []; if (t.length !== lines.length) return; done(lines.map(function (l, i) { return [l, s(t[i], 240)]; }), O.cleanGen(g.gen) || g.gen);
    }).catch(function () { /* працює й без перекладу */ });
  }
  /* Текст у додатку не вшито: даємо вставити його з першоджерела; спроба ШІ лишається, але чесно позначена як неперевірена */
  function textPanel(listBox, e, onOpen, err, st, redraw) {
    var old = listBox.querySelector('.pfail'); if (old) old.remove();
    var b = O.el('div', 'card pfail', '<b>«' + O.esc(e.title) + '» (' + O.esc(e.author) + '): тексту ще немає</b>' + (err ? '<p class="small">ШІ: ' + O.esc(err) + '</p>' : '') +
      '<p class="small">Повного тексту я не вшив, бо не мав змоги звірити його з першоджерелом. Відкрий <a href="' + O.esc(src(e)) + '" target="_blank" rel="noopener noreferrer">пошук на Wikisource</a>, або натисни кнопку нижче: додаток спробує знайти вірш там сам.</p>' +
      '<div class="row"><button class="btn" data-ws>🔎 Знайти на Wikisource</button></div><div class="wsres small"></div>' +
      '<textarea rows="8" class="ptx" placeholder="Текст вірша (з Wikisource або встав сам). Прибери зайве: заголовки, примітки." style="width:100%"></textarea><div class="row"><button class="btn" data-ok>Додати текст</button><button class="btn ghost" data-ai>Спробувати ШІ (неперевірено)</button><button class="btn ghost" data-x>✕</button></div>');
    var res = b.querySelector('.wsres'), ta = b.querySelector('.ptx');
    function pick(t) { res.innerHTML = 'Завантажую «' + O.esc(t) + '»…'; wsText(t).then(function (txt) { if (!txt) throw new Error('порожньо'); ta.value = txt; res.innerHTML = 'Джерело: <a href="https://no.wikisource.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_')) + '" target="_blank" rel="noopener noreferrer">no.wikisource.org / ' + O.esc(t) + '</a>. Перевір і прибери зайве, тоді «Додати текст».'; }).catch(function (er) { res.textContent = 'Не вдалося: ' + (er && er.message || er); }); }
    b.querySelector('[data-ws]').onclick = function () {
      res.textContent = 'Шукаю…';
      wsSearch(e.title + ' ' + e.author.split(' ').pop()).then(function (a) { return a.length ? a : wsSearch(e.title); }).then(function (a) {
        if (!a.length) { res.textContent = 'На Wikisource нічого не знайдено за цією назвою. Спробуй пошук вручну за посиланням вище.'; return; }
        res.innerHTML = a.map(function (t) { return '<button class="chip" data-t="' + O.esc(t) + '">' + O.esc(t) + '</button>'; }).join(' ');
        O.$$('[data-t]', res).forEach(function (c) { c.onclick = function () { pick(c.getAttribute('data-t')); }; });
      }).catch(function (er) { res.textContent = 'Wikisource недоступний з цього пристрою: ' + (er && er.message || er) + '. Встав текст вручну.'; });
    };
    listBox.insertBefore(b, listBox.firstChild);
    b.querySelector('[data-x]').onclick = function () { b.remove(); };
    b.querySelector('[data-ok]').onclick = function () {
      var lines = b.querySelector('.ptx').value.split(/\n+/).map(function (x) { return s(x, 200); }).filter(Boolean).slice(0, 40); if (lines.length < 2) return O.toast('Встав хоча б 2 рядки', 2500);
      st.texts[e.id] = { s: lines.map(function (l) { return [l, '']; }), own: true }; O.save(); redraw(); onOpen(poemItem(e, st.texts[e.id]));
      transLines(lines, function (pairs, gen) { st.texts[e.id].s = pairs; st.texts[e.id].gen = gen; O.save(); onOpen(poemItem(e, st.texts[e.id])); });
    };
    b.querySelector('[data-ai]').onclick = function (ev) {
      var btn = ev.target; btn.disabled = true; btn.textContent = 'Шукаю…';
      O.aiJsonG(SYSP, [{ role: 'user', content: e.title + ' — ' + e.author }], 2200).then(function (g) {
        var c = cleanPairs(g.json); st.texts[e.id] = { s: c.s, unverified: true, gen: O.cleanGen(g.gen) || g.gen }; O.save(); redraw(); onOpen(poemItem(e, st.texts[e.id]));
      }).catch(function (er) { textPanel(listBox, e, onOpen, (er && er.message && !er.code) ? er.message : (O.aiError ? O.aiError(er) : 'Не вдалося'), st, redraw); });
    };
    try { b.scrollIntoView({ block: 'nearest' }); } catch (x) { /* ok */ }
  }
  function tabs(root, cur) {
    return '<div class="chips"><button class="chip' + (cur === 'poems' ? ' on' : '') + '" data-pt="poems">📜 Вірші (20)</button><button class="chip' + (cur === 'exprs' ? ' on' : '') + '" data-pt="exprs">💬 Вирази (топ-20)</button></div>';
  }

  /* ---- Вірші ---- */
  function poemsView(box, switcher) {
    var st = P();
    function items() { return CAT.map(function (e) { var rec = BUNDLED[e.id] ? { s: BUNDLED[e.id] } : st.texts[e.id]; return { e: e, rec: rec }; }); }
    function listFn(listBox, onOpen) {
      listBox.innerHTML = '<div class="lib" id="pgrid"></div>'; var grid = listBox.querySelector('#pgrid'); viewBar(grid, listBox);
      dueBanner(listBox, onOpen, function (k) { var e = CAT.filter(function (c) { return c.id === k; })[0]; if (e) { var rec = BUNDLED[e.id] ? { s: BUNDLED[e.id] } : st.texts[e.id]; return rec ? poemItem(e, rec) : null; } var m = st.mine.filter(function (x) { return x.id === k; })[0]; return m || null; });
      items().forEach(function (x) {
        var e = x.e, rec = x.rec, done = st.read[e.id];
        var card = O.el('button', 'story', '<div class="cv">' + O.cover({ id: e.id, title: e.title, theme: e.theme }) + (done ? '<span class="dn">✓</span>' : '') + (rec ? '' : '<span class="lv">потрібен текст</span>') + '</div><b>' + O.esc(e.title) + '</b><small class="dim">' + O.esc(e.author + (e.year ? ', ' + e.year : '')) + '</small>' + (e.note ? '<small class="dim">' + O.esc(e.note) + '</small>' : ''));
        card.setAttribute('data-lvl', e.lvl || 'B1'); card.querySelector('small').textContent += ' · ' + (e.lvl || 'B1');
        card.onclick = function () { if (rec) return onOpen(poemItem(e, rec)); textPanel(listBox, e, onOpen, '', st, function () { listFn(listBox, onOpen); }); };
        grid.appendChild(card);
      });
      st.mine.forEach(function (m) {
        var card = O.el('button', 'story', '<div class="cv">' + O.cover({ id: m.id, title: m.title, theme: 'doc' }) + (st.read[m.id] ? '<span class="dn">✓</span>' : '') + '<span class="lv">мій</span></div><b>' + O.esc(m.title) + '</b><small class="dim">свій вірш</small>');
        card.setAttribute('data-lvl', m.lvl || 'B1'); card.querySelector('small').textContent += ' · ' + (m.lvl || 'B1');
        card.onclick = function () { onOpen(m); }; grid.appendChild(card);
      });
      lvlBar(grid, listBox);
    }
    O.renderReader(box, {
      title: '', intro: switcher + '<p class="dim small">Тексти поетів, чиї твори вже у суспільному надбанні. Вшито лише першу строфу гімну. Для інших віршів тап відкриває форму: встав текст із <a href="https://no.wikisource.org" target="_blank" rel="noopener noreferrer">Wikisource</a> (надійно) або спробуй ШІ (текст може бути неточним, його позначено). Слова з вивчених віршів потрапляють у словник.</p>' + EVID,
      onOpen: hook, list: listFn, ownTitle: 'Свій вірш', ownHint: 'Встав вірш норвезькою, по рядку', goLabel: 'Додати й читати', ownExtra: '<input id="ptitle" maxlength="80" placeholder="Назва (і автор), необов’язково">',
      saveOwn: function (text, h) {
        var lines = text.split(/\n+/).map(function (x) { return s(x, 200); }).filter(Boolean).slice(0, 40), title = s(h.root.querySelector('#ptitle').value, 80) || lines[0].slice(0, 50);
        var it = { id: 'pw' + Date.now().toString(36), title: title, sub: 'свій вірш', lvl: autoLvl(lines), theme: 'doc', poem: true, s: lines.map(function (l) { return [l, '']; }), no: lines.join('\n'), uk: '' };
        st.mine = [it].concat(st.mine).slice(0, 30); O.save(); h.renderList(); h.open(it);
        transLines(lines, function (pairs, gen) { it.s = pairs; it.uk = pairs.map(function (x) { return x[1]; }).join('\n'); it.gen = gen; O.save(); h.open(it); });
      },
      ai: { label: 'ШІ: знайти вірш за назвою', run: function (h) {
        var t = s(h.root.querySelector('#ptitle').value, 120); if (!t) return O.toast('Впиши назву й автора у полі «Назва» вище', 3000);
        h.button.disabled = true; h.button.textContent = 'Шукаю…';
        O.aiJsonG(SYSP, [{ role: 'user', content: t }], 2200).then(function (g) {
          var c = cleanPairs(g.json), it = { id: 'pw' + Date.now().toString(36), title: t.split(/\s[—-]\s/)[0].slice(0, 80), sub: 'знайдено ШІ' + (c.unverified ? ', звір з першоджерелом' : ''), lvl: autoLvl(c.s.map(function (x) { return x[0]; })), theme: 'doc', poem: true, s: c.s, no: c.s.map(function (x) { return x[0]; }).join('\n'), uk: c.s.map(function (x) { return x[1]; }).join('\n'), gen: O.cleanGen(g.gen) || g.gen };
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
    function all() { return EXPR.concat(BASIC).map(function (r, i) { return { r: r, id: 'ex' + i }; }).concat(st.mine.map(function (m) { return { r: m.r, id: m.id, gen: m.gen, mine: true }; })); }
    function listFn(listBox, onOpen) {
      listBox.innerHTML = '<div class="lib" id="xgrid"></div>'; var grid = listBox.querySelector('#xgrid'); viewBar(grid, listBox);
      dueBanner(listBox, onOpen, function (k) { var x = all().filter(function (y) { return y.id === k; })[0]; return x ? exprItem(x.r, x.id, x.gen) : null; });
      all().forEach(function (x) {
        var done = st.read[x.id];
        var card = O.el('button', 'story', '<div class="cv">' + O.cover({ id: x.id, title: x.r[0], theme: x.mine ? 'cup' : 'doc' }) + (done ? '<span class="dn">✓</span>' : '') + (x.mine ? '<span class="lv">' + (x.gen ? 'ШІ' : 'мій') + '</span>' : '') + '</div><b>' + O.esc(x.r[0]) + '</b><small class="dim">' + O.esc(x.r[1]) + '</small>');
        var xl = x.r[5] || autoLvl([x.r[0], x.r[3] || '']); card.setAttribute('data-lvl', xl); card.querySelector('small').textContent += ' · ' + xl;
        card.onclick = function () { onOpen(exprItem(x.r, x.id, x.gen)); }; grid.appendChild(card);
      });
      lvlBar(grid, listBox);
    }
    function saveExpr(r, gen) { var it = { id: 'xw' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), r: r, gen: gen || null }; st.mine = [it].concat(st.mine).slice(0, 80); O.save(); return it; }
    O.renderReader(box, {
      title: '', intro: switcher + '<p class="dim small">Топ-20 вживаних виразів із прикладами (прості речення написані моделлю, носієм не перевірені). Додай свій вираз або попроси ШІ згенерувати нові. «Вивчено» додає вираз і його слова в словник.</p>' + EVID,
      onOpen: hook, list: listFn, ownTitle: 'Свій вираз або ШІ', goLabel: 'Додати свій вираз', ownHint: 'вираз = переклад (по одному в рядку), напр.: å ta det med ro = не поспішати',
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
