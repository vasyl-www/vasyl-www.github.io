/* Семантична картка предмета: предмет -> стани (пари антонімів) -> частини -> функції -> перенесення на інші предмети.
   Генерує ШІ за заданим методом, результат зберігається в state.sem, слова можна одним тапом додати в словник. */
(function () {
  var O = window.ORD, MAXN = 60;
  var SYS = 'You are a vocabulary engine for a Norwegian (bokmål) learner whose native language is Ukrainian.\n' +
    'The user sends ONE Norwegian noun naming a concrete object. Return a "semantic card" as strict JSON only, no extra text.\n\n' +
    'Method: object -> states (as opposite pairs) -> parts -> functions. The learner memorizes ~10 objects this way and transfers the pattern to new ones, so prefer common, reusable vocabulary over rare words.\n\n' +
    'Rules:\n- Vocabulary level: {LEVEL} (A1-B1). Keep example sentences short.\n' +
    '- "states": 6-10 antonym pairs that really apply to this object (e.g. varm/kald, ren/skitten, opptatt/ledig, lys/mørk, tom/full, luktende/stinkende). Adjectives must agree with the noun\'s gender/number in the example sentence.\n' +
    '- "parts": 5-10 physical components, with indefinite article (en/et/ei).\n' +
    '- "functions": 5-8 verbs: what the object does or what people do with it. Infinitive + short example.\n' +
    '- "transfer": 3 other objects where the same states apply, and 1-2 states that do NOT transfer.\n' +
    '- Give Ukrainian translation for every Norwegian item.\n' +
    '- If the input is not a concrete object, return {"error": "<short reason in Ukrainian>"}.\n\n' +
    'Schema:\n{\n  "word": "et rom", "uk": "кімната",\n  "states": [{"no_a":"varm","uk_a":"теплий","no_b":"kald","uk_b":"холодний","example":"Rommet er varmt."}],\n' +
    '  "parts": [{"no":"en vegg","uk":"стіна"}],\n  "functions": [{"no":"å sove","uk":"спати","example":"Jeg sover på rommet."}],\n' +
    '  "transfer": {"objects":[{"no":"et hus","uk":"будинок"}], "not_applicable":[{"no":"full","uk":"повний","why":"..."}]}\n}';
  function s(x, n) { return typeof x === 'string' ? x.replace(/<[^>]*>/g, '').trim().slice(0, n || 120) : ''; }
  function arr(x, n) { return Array.isArray(x) ? x.slice(0, n) : []; }
  function clean(j) {
    if (j && j.error) throw new Error(s(j.error, 200) || 'Це не конкретний предмет');
    var c = { word: s(j.word, 40), uk: s(j.uk, 60),
      states: arr(j.states, 10).map(function (x) { return { a: s(x && x.no_a, 40), ua: s(x && x.uk_a, 50), b: s(x && x.no_b, 40), ub: s(x && x.uk_b, 50), ex: s(x && x.example, 140) }; }).filter(function (x) { return x.a && x.b; }),
      parts: arr(j.parts, 10).map(function (x) { return { no: s(x && x.no, 50), uk: s(x && x.uk, 60) }; }).filter(function (x) { return x.no && x.uk; }),
      functions: arr(j.functions, 8).map(function (x) { return { no: s(x && x.no, 50), uk: s(x && x.uk, 60), ex: s(x && x.example, 140) }; }).filter(function (x) { return x.no && x.uk; }),
      objects: arr(j.transfer && j.transfer.objects, 4).map(function (x) { return { no: s(x && x.no, 50), uk: s(x && x.uk, 60) }; }).filter(function (x) { return x.no; }),
      na: arr(j.transfer && j.transfer.not_applicable, 3).map(function (x) { return { no: s(x && x.no, 40), uk: s(x && x.uk, 50), why: s(x && x.why, 200) }; }).filter(function (x) { return x.no; }) };
    if (!c.word || c.states.length < 2 || !c.parts.length) throw new Error('ШІ повернув неповну картку, спробуй ще раз');
    return c;
  }
  function list() { return (O.state.sem = O.state.sem || []); }
  function split(no) { var m = String(no).trim().match(/^(en|ei|et)\s+(.+)$/i); return m ? { art: m[1].toLowerCase(), no: m[2] } : { art: '', no: String(no).replace(/^å\s+/i, '').trim() }; }
  /* Слово -> словник (картка SM-2): наявне слово береться з бази, нове створюється як u:<лема> */
  function toDict(no, uk, ex, exUk) {
    var p = split(no), loc = O.localLookup && O.localLookup(p.no); if (!p.no) return false;
    var w = loc || { id: 'u:' + p.no.toLowerCase(), deck: 'mine', cat: 'Mine', art: p.art, no: p.no, uk: uk, ex: ex || '', exUk: exUk || '' };
    if (O.card(w.id)) return false; var isNew = O.addWord(w); if (isNew) O.state.xp += 2; return isNew;
  }
  function allItems(c) {
    var o = [[c.word, c.uk, '', '']]; c.parts.forEach(function (x) { o.push([x.no, x.uk, '', '']); }); c.functions.forEach(function (x) { o.push([x.no, x.uk, x.ex, '']); });
    c.states.forEach(function (x) { o.push([x.a, x.ua, '', '']); o.push([x.b, x.ub, '', '']); }); return o;
  }

  O.renderSemantic = function (root) {
    var level = 'A2', quiz = false, cur = null;
    root.innerHTML = '<h2>Об’єкти</h2><p class="dim small">Метод: предмет → стани (пари антонімів) → частини → функції → перенесення. Вивчи ~10 предметів так, і шаблон працюватиме на нових. Введи один норвезький іменник.</p>' +
      '<form class="row" id="sf"><input id="sw" maxlength="40" placeholder="Напр.: rom, kjøleskap, bil, hammer" autocomplete="off" autocapitalize="none"><select id="sl"><option>A1</option><option selected>A2</option><option>B1</option></select><button class="btn" type="submit">✦ Створити</button></form><div class="dim small" id="sm"></div><div id="sc"></div><h3>Мої предмети</h3><div id="sh"></div>';
    var inp = root.querySelector('#sw'), msg = root.querySelector('#sm'), card = root.querySelector('#sc'), sel = root.querySelector('#sl');
    function drawHist() {
      var box = root.querySelector('#sh'), a = list(); box.innerHTML = a.length ? '' : '<p class="dim small">Поки порожньо. Створені картки зберігаються тут.</p>';
      a.forEach(function (x) { var b = O.el('div', 'mrow', '<span style="cursor:pointer"><b class="no">' + O.esc(x.c.word) + '</b> <span class="dim">— ' + O.esc(x.c.uk) + ' · ' + O.esc(x.level) + '</span></span><button class="icon" data-del title="Видалити">✕</button>'); b.querySelector('span').onclick = function () { show(x); window.scrollTo(0, 0); }; b.querySelector('[data-del]').onclick = function () { O.state.sem = list().filter(function (y) { return y !== x; }); O.save(); drawHist(); }; box.appendChild(b); });
    }
    function say(b, t) { b.onclick = function (e) { e.stopPropagation(); O.speak(t.replace(/^å\s+/i, '')); }; }
    function nt(t, extra) { return '<span class="no sem-no' + (quiz ? ' blur' : '') + '">' + O.esc(t) + '</span>' + (extra || ''); }
    function show(x) {
      cur = x; var c = x.c;
      var h = '<div class="panel"><div class="pop-h"><b class="big no">' + O.esc(c.word) + '</b><button class="icon" data-say="' + O.esc(c.word) + '">🔊</button></div><div class="dim">' + O.esc(c.uk) + '</div>' +
        '<div class="row"><button class="btn" id="sall">＋ Усе в словник</button><button class="chip' + (quiz ? ' on' : '') + '" id="sq">🙈 Перевірити себе</button><span class="dim small" id="sst"></span></div>' +
        (x.gen ? '<div class="dim small"><span class="gen ' + (x.gen.tier === 'free' ? 'free' : '') + '">✦ ' + O.esc(O.genLabel(x.gen)) + '</span></div>' : '') + '</div>';
      h += '<div class="panel"><h4 style="margin-top:0">1. Стани (пари)</h4>' + c.states.map(function (p, i) {
        return '<div class="mrow sem-st"><span>' + nt(p.a) + ' <span class="dim">' + O.esc(p.ua) + '</span> ⇄ ' + nt(p.b) + ' <span class="dim">' + O.esc(p.ub) + '</span>' + (p.ex ? '<div class="no small">' + O.esc(p.ex) + '</div>' : '') + '</span><button class="icon" data-sx="' + i + '">🔊</button></div>'; }).join('') + '</div>';
      h += '<div class="panel"><h4 style="margin-top:0">2. Частини</h4>' + c.parts.map(function (p, i) { return '<div class="mrow"><span>' + nt(p.no) + ' <span class="dim">' + O.esc(p.uk) + '</span></span><button class="icon" data-sp="' + i + '">🔊</button><button class="icon" data-ap="' + i + '" title="У словник">＋</button></div>'; }).join('') + '</div>';
      h += '<div class="panel"><h4 style="margin-top:0">3. Функції</h4>' + c.functions.map(function (p, i) { return '<div class="mrow"><span>' + nt(p.no) + ' <span class="dim">' + O.esc(p.uk) + '</span>' + (p.ex ? '<div class="no small">' + O.esc(p.ex) + '</div>' : '') + '</span><button class="icon" data-sf="' + i + '">🔊</button><button class="icon" data-af="' + i + '" title="У словник">＋</button></div>'; }).join('') + '</div>';
      h += '<div class="panel"><h4 style="margin-top:0">4. Перенесення</h4><div class="dim small">Ті самі стани працюють і для:</div><div class="chips">' + c.objects.map(function (p, i) { return '<button class="chip" data-so="' + i + '">' + O.esc(p.no) + ' · ' + O.esc(p.uk) + '</button>'; }).join('') + '</div>' +
        (c.na.length ? '<div class="dim small" style="margin-top:8px">Не переносяться:</div>' + c.na.map(function (p) { return '<div class="fact"><b class="no">' + O.esc(p.no) + '</b> ' + O.esc(p.uk) + (p.why ? ': ' + O.esc(p.why) : '') + '</div>'; }).join('') : '') + '</div>';
      card.innerHTML = h;
      O.$$('[data-say]', card).forEach(function (b) { say(b, b.getAttribute('data-say')); });
      O.$$('[data-sx]', card).forEach(function (b) { var p = c.states[+b.getAttribute('data-sx')]; b.onclick = function () { O.speak(p.ex || (p.a + ', ' + p.b)); }; });
      O.$$('[data-sp]', card).forEach(function (b) { say(b, c.parts[+b.getAttribute('data-sp')].no.replace(/^(en|ei|et)\s+/i, '')); });
      O.$$('[data-sf]', card).forEach(function (b) { var p = c.functions[+b.getAttribute('data-sf')]; b.onclick = function () { O.speak(p.ex || p.no.replace(/^å\s+/i, '')); }; });
      O.$$('[data-ap]', card).forEach(function (b) { b.onclick = function () { var p = c.parts[+b.getAttribute('data-ap')]; O.toast(toDict(p.no, p.uk) ? 'Додано: ' + p.no : 'Вже в словнику'); O.save(); b.disabled = true; }; });
      O.$$('[data-af]', card).forEach(function (b) { b.onclick = function () { var p = c.functions[+b.getAttribute('data-af')]; O.toast(toDict(p.no, p.uk, p.ex) ? 'Додано: ' + p.no : 'Вже в словнику'); O.save(); b.disabled = true; }; });
      O.$$('[data-so]', card).forEach(function (b) { b.onclick = function () { inp.value = split(c.objects[+b.getAttribute('data-so')].no).no; make(); window.scrollTo(0, 0); }; });
      O.$$('.sem-no', card).forEach(function (e) { e.onclick = function () { e.classList.remove('blur'); }; });
      card.querySelector('#sq').onclick = function () { quiz = !quiz; show(x); };
      card.querySelector('#sall').onclick = function () { var n = 0; allItems(c).forEach(function (r) { if (toDict(r[0], r[1], r[2], r[3])) n++; }); O.save(); card.querySelector('#sst').textContent = n ? 'Додано слів: ' + n : 'Усе вже в словнику'; if (n) O.sfx('ok'); };
    }
    function make() {
      var w = s(inp.value, 40); if (!w) return; level = sel.value; msg.textContent = 'Створюю картку «' + w + '»…'; card.innerHTML = '';
      var old = list().filter(function (x) { return x.level === level && (x.c.word.toLowerCase() === w.toLowerCase() || split(x.c.word).no.toLowerCase() === w.toLowerCase()); })[0];
      if (old) { msg.textContent = 'Вже була створена, показую збережену.'; show(old); return; }
      O.aiJsonG(SYS.replace('{LEVEL}', level), [{ role: 'user', content: w }], 3500).then(function (g) {
        var c = clean(g.json), x = { id: 'sem' + Date.now().toString(36), t: Date.now(), level: level, c: c, gen: O.cleanGen(g.gen) || g.gen };
        O.state.sem = [x].concat(list()).slice(0, MAXN); O.save(); msg.textContent = ''; show(x); drawHist();
      }).catch(function (e) { msg.textContent = (e && e.code && O.aiError) ? O.aiError(e) : (e && e.message) || 'Не вдалося'; });
    }
    root.querySelector('#sf').onsubmit = function (e) { e.preventDefault(); make(); };
    drawHist(); if (O.semPending) { inp.value = O.semPending; O.semPending = null; make(); }
  };
})();
