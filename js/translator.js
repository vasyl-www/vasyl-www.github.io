/* Перекладач через ШІ: усі значення слова, частина мови, усі форми, ідіоми, історія, додавання в словник. */
(function () {
  var O = window.ORD, MAX = 300;
  var SYS = 'Ти двомовний словник і перекладач норвезька (bokmål) <-> українська для дорослого учня. Відповідай лише JSON без пояснень. Усі пояснення, значення й назви частин мови пиши українською. Не вигадуй: якщо не певен форми чи ідіоми, не додавай їх.';
  function hist() { return (O.state.tr = O.state.tr || []); }
  function key(q) { return O.norm(q); }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function str(x, n) { return typeof x === 'string' ? x.trim().slice(0, n || 300) : ''; }
  function cleanEntry(j) {
    return { lemma: str(j.lemma, 60), art: ['en', 'ei', 'et'].indexOf(j.art) >= 0 ? j.art : '', pos: str(j.pos, 60),
      meanings: arr(j.meanings).slice(0, 10).map(function (m) { return { uk: str(m && m.uk, 120), note: str(m && m.note, 160), ex: str(m && m.ex, 200), exUk: str(m && m.exUk, 200) }; }).filter(function (m) { return m.uk; }),
      forms: arr(j.forms).slice(0, 14).map(function (f) { return { label: str(f && f.label, 40), form: str(f && f.form, 60) }; }).filter(function (f) { return f.form; }),
      idioms: arr(j.idioms).slice(0, 8).map(function (i) { return { no: str(i && i.no, 120), uk: str(i && i.uk, 160) }; }).filter(function (i) { return i.no && i.uk; }) };
  }
  function cleanRes(j) {
    var r = { src: j.src === 'uk' ? 'uk' : 'no', translation: str(j.translation, 1500), literal: str(j.literal, 300), note: str(j.note, 300),
      idioms: cleanEntry({ idioms: j.idioms }).idioms, words: arr(j.words).slice(0, 12).map(function (w) { return str(w, 40); }).filter(Boolean) };
    if (j.entry && typeof j.entry === 'object') r.entry = cleanEntry(j.entry);
    return r;
  }
  var ENTRY = '{"lemma":"початкова форма","art":"en/ei/et або порожньо","pos":"частина мови (напр. іменник чол. роду, сильне дієслово, прикметник)","meanings":[{"uk":"значення","note":"нюанс, сфера, регістр або порожньо","ex":"приклад норвезькою","exUk":"переклад"}],"forms":[{"label":"назва форми","form":"форма"}],"idioms":[{"no":"усталений вислів або ідіома з цим словом","uk":"значення"}]}';
  O.trTranslate = function (q) {
    return O.aiJsonG(SYS + ' Визнач мову запиту (no або uk) і переклади на іншу. Якщо запит — одне слово або короткий вислів, у "entry" дай повну словникову статтю ВСІХ значень (від частих до рідкісних) слова норвезькою (для запиту українською — статтю головного норвезького відповідника), частину мови та ВСІ форми (іменник: однина/множина невизначена/визначена; дієслово: інфінітив, теперішній, минулий, перфект, наказовий; прикметник: чол/жін, середній, множина, ступені). Якщо запит або його частина — ідіома чи усталений вислів, дай у "idioms" і поясни справжнє значення, у "literal" — буквальний переклад. "words" — норвезькі слова з запиту (або з перекладу) у початковій формі, варті вивчення.\n' +
      'Формат: {"src":"no|uk","translation":"переклад","literal":"буквальний переклад ідіоми або порожньо","note":"коротке зауваження або порожньо","idioms":[{"no":"","uk":""}],"words":["слово"],"entry":' + ENTRY + ' або null}',
      [{ role: 'user', content: q }], 1800).then(function (g) { var r = cleanRes(g.json); r.gen = O.cleanGen(g.gen); return r; });
  };
  O.trEntry = function (word, ctx) {
    return O.aiJson(SYS + ' Дай повну словникову статтю норвезького слова: ВСІ значення (від частих до рідкісних), частину мови, ВСІ форми, ідіоми й усталені вислови з цим словом. Якщо передано форму слова, повертай статтю початкової форми.\nФормат: ' + ENTRY,
      [{ role: 'user', content: 'Слово: ' + word + (ctx ? '\nКонтекст: ' + ctx : '') }], 1500).then(cleanEntry);
  };
  /* Запис результату в історію + автоматичний пін. Спільна точка для вкладки «Переклад» і швидкого перекладу (🌐 будь-де). */
  O.trRecord = function (q, r) {
    var item = { t: Date.now(), q: q, res: r, entries: {} }; O.state.tr = [item].concat(hist()).slice(0, MAX); O.save();
    try { O.pins && O.pins.addTr && O.pins.addTr(q, r); } catch (e) { /* пін необов'язковий */ }
    return item;
  };
  /* Слово зі статті -> картка SM-2 */
  O.trAdd = function (e, from) {
    var lem = e.lemma.toLowerCase(), id = 'u:' + lem, ex = e.meanings.filter(function (m) { return m.ex; })[0] || {};
    var forms = e.forms.map(function (f) { return f.label + ': ' + f.form; }).join('; ');
    var w = O.wordById[id] || O.localLookup(lem) || { id: id, deck: 'mine', cat: 'Mine', art: e.art, no: e.lemma, uk: e.meanings.slice(0, 3).map(function (m) { return m.uk; }).join('; '), ex: ex.ex || '', exUk: ex.exUk || '', pos: e.pos, forms: forms, fact: (e.pos ? e.pos + '. ' : '') + (forms ? 'Форми: ' + forms + '. ' : '') + 'З перекладача.', multi: false };
    var isNew = O.addWord(w); if (isNew) { O.state.xp += 5; O.state.cache[lem] = { id: w.id, lemma: w.no, uk: w.uk, art: w.art, ex: w.ex, exUk: w.exUk }; O.save(); } return isNew;
  };
  O.renderTranslator = function (root) {
    root.innerHTML = '<h2>Перекладач</h2><p class="dim small">Слово, фраза чи ідіома, норвезькою або українською. Мову визначає ШІ. Для слова показую всі значення, частину мови, форми й ідіоми.</p>' +
      '<textarea id="tq" rows="3" placeholder="Напр.: å gå på trynet, bruk, hva slags, чекати, ставити запитання"></textarea><div class="row"><button class="btn" id="tgo">Перекласти</button><button class="btn ghost" id="tclr">Очистити</button><span class="dim small" id="tst"></span></div>' +
      '<div id="tres"></div><h3>Історія</h3><div class="row"><input id="thq" placeholder="Пошук в історії"><button class="btn ghost" id="thc">Стерти історію</button></div><div id="thl"></div>';
    var q = root.querySelector('#tq'), res = root.querySelector('#tres'), stat = root.querySelector('#tst'), cur = null;
    function entryHtml(e, id) {
      var inDeck = e.lemma && O.card('u:' + e.lemma.toLowerCase()) || (e.lemma && O.localLookup(e.lemma) && O.card(O.localLookup(e.lemma).id));
      return '<div class="panel entry" id="' + id + '"><div class="pop-h"><b class="no">' + O.esc((e.art ? e.art + ' ' : '') + e.lemma) + '</b><button class="icon" data-say="' + O.esc(e.lemma) + '">🔊</button></div>' + (e.pos ? '<span class="tag">' + O.esc(e.pos) + '</span>' : '') +
        '<h4>Значення</h4><ol class="mean">' + e.meanings.map(function (m) { return '<li><b>' + O.esc(m.uk) + '</b>' + (m.note ? ' <span class="dim small">(' + O.esc(m.note) + ')</span>' : '') + (m.ex ? '<div class="no small">' + O.esc(m.ex) + '</div><div class="dim small">' + O.esc(m.exUk) + '</div>' : '') + '</li>'; }).join('') + '</ol>' +
        (e.forms.length ? '<h4>Форми</h4><table class="tbl">' + e.forms.map(function (f) { return '<tr><td class="dim">' + O.esc(f.label) + '</td><td class="no">' + O.esc(f.form) + '</td></tr>'; }).join('') + '</table>' : '') +
        (e.idioms.length ? '<h4>Ідіоми й вислови</h4>' + e.idioms.map(function (i) { return '<div class="mrow"><span class="no">' + O.esc(i.no) + '</span><span class="dim">' + O.esc(i.uk) + '</span><button class="icon" data-say="' + O.esc(i.no) + '">🔊</button></div>'; }).join('') : '') +
        '<div class="row">' + (inDeck ? '<span class="tag">у словнику</span>' : '<button class="btn" data-add>+ У словник</button>') + '</div></div>';
    }
    function bindEntry(box, e) {
      O.$$('[data-say]', box).forEach(function (b) { b.onclick = function () { O.speak(b.getAttribute('data-say')); }; });
      var a = box.querySelector('[data-add]'); if (a) a.onclick = function () { if (O.trAdd(e)) { O.toast('Додано: ' + e.lemma); O.sfx('ok'); } a.outerHTML = '<span class="tag">у словнику</span>'; };
    }
    /* Додавання в словник і реакції */
    var EMO = ['👍', '❤️', '😂', '🔥', '😮', '🤔'];
    function hash(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
    function noSide(item) { return item.res.src === 'uk' ? item.res.translation : item.q; }
    function ukSide(item) { return item.res.src === 'uk' ? item.q : item.res.translation; }
    function addPhrase(item) {
      var no = noSide(item).trim(), uk = ukSide(item).trim(); if (!no || !uk) return false;
      var w = { id: 'u:ph:' + hash(no.toLowerCase()), deck: 'mine', cat: 'Mine', no: no.slice(0, 160), uk: uk.slice(0, 160), ex: '', exUk: '', fact: item.res.note ? String(item.res.note).slice(0, 200) : '' };
      var isNew = O.addWord(w); if (isNew) { O.state.xp += 3; O.save(); } return isNew;
    }
    function addAll(item, st) {
      var words = (item.res.words && item.res.words.length ? item.res.words : noSide(item).split(/[^A-Za-zÆØÅæøå'’-]+/)).filter(function (x) { return x && x.length > 1; });
      var seen = {}, list = words.filter(function (x) { var k = x.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 20), added = 0, skipped = 0, i = 0;
      function step() {
        if (i >= list.length) { st.textContent = 'Додано слів: ' + added + (skipped ? ' · без ШІ не вдалося: ' + skipped : ''); if (added) O.sfx('ok'); return; }
        var wd = list[i++], loc = O.localLookup(wd); st.textContent = 'Додаю ' + i + '/' + list.length + '…';
        if (loc) { if (O.addWord(loc)) added++; return step(); }
        var c = item.entries && item.entries[wd.toLowerCase()];
        (c ? Promise.resolve(c) : O.trEntry(wd, noSide(item))).then(function (e) { if (!e.lemma || !e.meanings.length) throw 0; if (O.trAdd(e)) added++; }).catch(function () { skipped++; }).then(step);
      }
      step();
    }
    function bindExtras(item) {
      var b1 = res.querySelector('[data-addph]'), b2 = res.querySelector('[data-addall]'), st = res.querySelector('#addst');
      if (b1) b1.onclick = function () { if (addPhrase(item)) { O.toast('Фразу додано в картки'); O.sfx('ok'); b1.disabled = true; b1.textContent = '✓ У картках'; } else { st.textContent = 'Вже в картках'; } };
      if (b2) b2.onclick = function () { b2.disabled = true; addAll(item, st); };
      var rx = res.querySelector('#reacts'), gb = res.querySelector('#gifbox'); if (!rx) return; item.react = item.react || {};
      function drawR() {
        rx.innerHTML = ''; EMO.forEach(function (e) { var n = item.react[e] || 0, b = O.el('button', 'chip' + (n ? ' on' : ''), e + (n ? ' ' + n : '')); b.onclick = function () { if (item.react[e]) delete item.react[e]; else item.react[e] = 1; O.save(); O.sfx && O.sfx('ok'); drawR(); }; rx.appendChild(b); });
        var g = O.el('button', 'chip', 'GIF'); g.onclick = function () { pickGif(); }; rx.appendChild(g);
        gb.innerHTML = ''; if (item.gif && O.pins.okUrl(item.gif.src)) { var w = O.el('div', 'tgif'); w.innerHTML = '<img alt="GIF" src="' + O.esc(O.pins.okUrl(item.gif.src)) + '" style="max-width:100%;border-radius:10px"><div class="dim small">' + O.esc((item.gif.by ? item.gif.by + ' · ' : '') + (item.gif.license || '')) + ' <button class="icon" data-gdel title="Прибрати">✕</button></div>'; w.querySelector('[data-gdel]').onclick = function () { delete item.gif; O.save(); drawR(); }; gb.appendChild(w); }
      }
      function pickGif() {
        gb.innerHTML = '<form class="row"><input class="gq" maxlength="40" placeholder="Знайти GIF: smile, wow, thanks…" value="thanks"><button class="btn" type="submit">🔎</button></form><div class="gpick"></div><div class="dim small gm"></div>';
        var grid = gb.querySelector('.gpick'), gm = gb.querySelector('.gm');
        gb.querySelector('form').onsubmit = function (e) {
          e.preventDefault(); gm.textContent = 'Шукаю…'; grid.innerHTML = '';
          O.pins.search(gb.querySelector('.gq').value.trim().slice(0, 40), 'gif').then(function (r) {
            gm.textContent = r.items.length ? '' : (r.failed ? 'Джерела недоступні' : 'Нічого не знайдено');
            r.items.slice(0, 12).forEach(function (x) { var u = O.pins.okUrl(x.src); if (!u) return; var im = O.el('img'); im.loading = 'lazy'; im.alt = x.title || 'GIF'; im.src = u; im.style.cssText = 'width:100%;border-radius:8px;cursor:pointer'; im.onclick = function () { item.gif = { src: x.src, by: x.by, license: x.license, page: x.page, title: x.title }; O.save(); drawR(); }; grid.appendChild(im); });
          });
        };
        gb.querySelector('form').onsubmit({ preventDefault: function () {} });
      }
      drawR();
    }
    function showEntry(slot, word, ctx) {
      slot.innerHTML = '<div class="dim">Шукаю «' + O.esc(word) + '»…</div>';
      O.trEntry(word, ctx).then(function (e) { if (!e.lemma || !e.meanings.length) throw new Error('порожня відповідь'); slot.innerHTML = entryHtml(e, 'e1'); bindEntry(slot, e); if (cur) { cur.entries = cur.entries || {}; cur.entries[word.toLowerCase()] = e; O.save(); } })
        .catch(function (er) { slot.innerHTML = '<div class="banner">' + O.esc(O.aiError(er)) + '</div>'; });
    }
    function render(item) {
      cur = item; var r = item.res, h = '<div class="panel"><div class="dim small">' + (r.src === 'uk' ? 'укр → норв' : 'норв → укр') + '</div><div class="big">' + O.esc(r.translation) + '</div>' +
        (r.literal ? '<div class="dim">Буквально: ' + O.esc(r.literal) + '</div>' : '') + (r.note ? '<div class="fact">' + O.esc(r.note) + '</div>' : '') +
        '<div class="row"><button class="btn ghost" data-say-t="' + (r.src === 'uk' ? 'tr' : 'q') + '">🔊 ' + (r.src === 'uk' ? 'Норвезькою' : 'Прослухати') + '</button></div></div>';
      h += '<div class="panel"><div class="row"><button class="btn" data-addph>＋ Фразу в картки</button><button class="btn ghost" data-addall>＋ Усі слова в словник</button><span class="dim small" id="addst"></span></div>' +
        '<div class="reacts" id="reacts"></div><div id="gifbox"></div></div>';
      if (r.idioms.length) h += '<div class="panel"><h4 style="margin-top:0">Ідіоми й вислови</h4>' + r.idioms.map(function (i) { return '<div class="mrow"><span class="no">' + O.esc(i.no) + '</span><span class="dim">' + O.esc(i.uk) + '</span></div>'; }).join('') + '</div>';
      if (r.entry && r.entry.lemma && r.entry.meanings.length) h += entryHtml(r.entry, 'e0');
      var ws = r.words.filter(function (w) { return !r.entry || w.toLowerCase() !== r.entry.lemma.toLowerCase(); });
      if (ws.length) h += '<div class="panel"><h4 style="margin-top:0">Слова (натисни: частина мови, усі форми, значення)</h4><div class="chips">' + ws.map(function (w) { return '<button class="chip" data-w="' + O.esc(w) + '">' + O.esc(w) + '</button>'; }).join('') + '</div><div id="eslot"></div></div>';
      res.innerHTML = h;
      O.$$('[data-say-t]', res).forEach(function (b) { b.onclick = function () { O.speak(b.getAttribute('data-say-t') === 'tr' ? r.translation : item.q); }; });
      if (r.entry && res.querySelector('#e0')) bindEntry(res.querySelector('#e0'), r.entry);
      bindExtras(item);
      if (r.entry && res.querySelector('#e0')) { /* залишено для сумісності */ }
      O.$$('[data-w]', res).forEach(function (b) { b.onclick = function () { var w = b.getAttribute('data-w'), slot = res.querySelector('#eslot'), c = item.entries && item.entries[w.toLowerCase()]; if (c) { slot.innerHTML = entryHtml(c, 'e1'); bindEntry(slot, c); } else showEntry(slot, w, r.src === 'no' ? item.q : r.translation); }; });
    }
    function drawHist() {
      var f = root.querySelector('#thq').value.toLowerCase(), box = root.querySelector('#thl'), items = hist().filter(function (x) { return !f || x.q.toLowerCase().indexOf(f) >= 0 || x.res.translation.toLowerCase().indexOf(f) >= 0; });
      box.innerHTML = items.length ? '' : '<p class="dim small">Поки порожньо. Кожен переклад зберігається тут і відкривається без нового запиту до ШІ.</p>';
      items.forEach(function (x) {
        var row = O.el('div', 'mrow', '<span><b>' + O.esc(x.q) + '</b> <span class="dim">→ ' + O.esc(x.res.translation.slice(0, 80)) + '</span></span><small class="dim">' + new Date(x.t).toLocaleDateString('uk-UA') + '</small><button class="icon" data-del title="Видалити">✕</button>');
        row.querySelector('span').style.cursor = 'pointer'; row.querySelector('span').onclick = function () { q.value = x.q; render(x); window.scrollTo(0, 0); };
        row.querySelector('[data-del]').onclick = function () { O.state.tr = hist().filter(function (y) { return y !== x; }); O.save(); drawHist(); };
        box.appendChild(row);
      });
    }
    function go() {
      var v = q.value.trim(); if (!v) return; if (v.length > 500) return O.toast('Максимум 500 символів');
      var old = hist().filter(function (x) { return key(x.q) === key(v); })[0]; if (old) { old.t = Date.now(); O.save(); render(old); drawHist(); return; }
      stat.textContent = 'Перекладаю…'; res.innerHTML = '';
      O.trTranslate(v).then(function (r) {
        if (!r.translation) throw new Error('порожня відповідь'); var item = O.trRecord(v, r); stat.textContent = ''; render(item); drawHist();
      }).catch(function (er) { stat.textContent = ''; res.innerHTML = '<div class="banner">' + O.esc(O.aiError(er)) + '</div>'; });
    }
    root.querySelector('#tgo').onclick = go; q.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };
    root.querySelector('#tclr').onclick = function () { q.value = ''; res.innerHTML = ''; q.focus(); };
    root.querySelector('#thq').oninput = drawHist;
    root.querySelector('#thc').onclick = function () { if (!hist().length) return; var b = this; if (b.getAttribute('data-sure')) { O.state.tr = []; O.save(); drawHist(); b.textContent = 'Стерти історію'; b.removeAttribute('data-sure'); } else { b.setAttribute('data-sure', 1); b.textContent = 'Точно стерти?'; setTimeout(function () { b.textContent = 'Стерти історію'; b.removeAttribute('data-sure'); }, 3000); } };
    drawHist(); if (O.pendingTr) { q.value = O.pendingTr; O.pendingTr = null; go(); }
  };
})();
