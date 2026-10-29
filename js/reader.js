/* Читалка в стилі Lingo7: текст, підсвітка невідомих слів, тап = переклад, слова з тексту -> у словник (картки SM-2). */
(function () {
  var O = window.ORD, idx = null, cur = null;
  var ENDS = ['ene', 'ane', 'ene', 'er', 'en', 'et', 'ar', 'te', 'de', 'a', 'e', 's', 't', 'r'];
  function build() {
    idx = {}; O.words.forEach(function (w) { idx[w.no.toLowerCase()] = w; });
    Object.keys(O.base.FORMS).forEach(function (inf) { var w = idx[inf]; if (w) O.base.FORMS[inf].forEach(function (f) { if (!idx[f]) idx[f] = w; }); });
    (O.verbs || []).forEach(function (v) { var w = idx[v.inf]; if (w) [v.pres, v.past, v.perf].forEach(function (f) { if (!idx[f]) idx[f] = w; }); });
  }
  O.localLookup = function (tok) {
    if (!idx) build(); tok = tok.toLowerCase(); if (idx[tok]) return idx[tok];
    for (var i = 0; i < ENDS.length; i++) if (tok.length > ENDS[i].length + 2 && tok.slice(-ENDS[i].length) === ENDS[i] && idx[tok.slice(0, -ENDS[i].length)]) return idx[tok.slice(0, -ENDS[i].length)];
    var c = O.state.cache[tok]; if (c && c.id && O.wordById[c.id]) return O.wordById[c.id];
    return null;
  };
  function tokens(text) { return text.split(/([^A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+)/); }
  function status(tok) {
    var l = tok.toLowerCase(); if (O.state.known[l]) return 'k';
    var w = O.localLookup(tok), c = w && O.card(w.id);
    if (c) return c.st === 'review' && c.ivl >= 3 ? 'k' : 'l';
    var cc = O.state.cache[l]; if (cc && cc.id && O.card(cc.id)) return 'l';
    return 'u';
  }
  O.tokStatus = status;
  var WRE = /^[A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+$/;
  function paint(root) {
    var box = root.querySelector('.rtext'), html = '', n = 0, known = 0, unk = {}, sw = O.state.seenW = O.state.seenW || {}, nowT = Date.now();
    function words(t) {
      var o = '';
      tokens(t).forEach(function (p) {
        if (WRE.test(p) && p.length > 1) { var s = status(p); n++; var lw = O.localLookup(p); if (lw) sw[lw.id] = nowT; if (s === 'k') known++; else if (s === 'u') unk[p.toLowerCase()] = 1; o += '<span class="rw ' + s + '" data-w="' + O.esc(p) + '">' + O.esc(p) + '</span>'; }
        else o += O.esc(p).replace(/\n/g, '<br>');
      });
      return o;
    }
    if (cur.s) cur.s.forEach(function (p, i) { html += '<span class="sent">' + words(p[0]) + ' <button class="sbtn" data-s="' + i + '" title="Переклад речення">🌐</button><span class="str" hidden>' + O.esc(p[1]) + '</span></span> '; });
    else html = words(cur.no);
    (function () { var ks = Object.keys(sw); if (ks.length > 600) ks.sort(function (a, b) { return sw[a] - sw[b]; }).slice(0, ks.length - 600).forEach(function (k) { delete sw[k]; }); })(); box.innerHTML = html; cur.unk = Object.keys(unk); cur.cov = n ? known / n : 0;
    root.querySelector('.cov').innerHTML = n ? O.meter({ known: known / n, learning: 0 }) + 'Ти знаєш ' + Math.round(known / n * 100) + '% слів, невідомих унікальних: ' + cur.unk.length : '';
  }
  function popup(root, word, anchor) {
    var old = O.$('.popover'); if (old) old.remove();
    var pop = O.el('div', 'popover'), local = O.localLookup(word), tok = word.toLowerCase();
    function show(info) {
      var inDeck = info.id && O.card(info.id);
      pop.innerHTML = '<div class="pop-h"><b>' + O.esc((info.art ? info.art + ' ' : '') + (info.lemma || info.no)) + '</b><button class="icon" data-say>🔊</button></div><div class="pop-tr">' + O.esc(info.uk) + '</div>' + (info.ex ? '<div class="no">' + O.esc(info.ex) + '</div><div class="dim">' + O.esc(info.exUk || '') + '</div>' : '') +
        '<div class="row">' + (inDeck ? '<span class="tag">у словнику</span>' : '<button class="btn" data-add>+ У словник</button>') + '<button class="btn ghost" data-tr title="Усі значення, форми, ідіоми">🌐 Детально</button><button class="btn ghost" data-known>Знаю</button><button class="btn ghost" data-x>✕</button></div>';
      pop.querySelector('[data-say]').onclick = function () { O.speak(info.lemma || info.no); };
      pop.querySelector('[data-x]').onclick = function () { pop.remove(); };
      pop.querySelector('[data-tr]').onclick = function () { O.pendingTr = word; pop.remove(); O.go('translate'); };
      pop.querySelector('[data-known]').onclick = function () { O.state.known[tok] = 1; O.save(); pop.remove(); paint(root); };
      var add = pop.querySelector('[data-add]'); if (add) add.onclick = function () {
        var w = info.id && O.wordById[info.id] ? O.wordById[info.id] : { id: 'u:' + (info.lemma || info.no).toLowerCase(), deck: 'mine', cat: 'Mine', art: info.art || '', no: info.lemma || info.no, uk: info.uk, ex: info.ex || '', exUk: info.exUk || '', fact: 'З тексту: ' + cur.title, multi: false };
        O.state.cache[tok] = { id: w.id, lemma: w.no, uk: w.uk, art: w.art, ex: w.ex, exUk: w.exUk };
        if (O.addWord(w)) { O.toast('Додано: ' + w.no); O.state.xp += 5; } pop.remove(); paint(root);
      };
    }
    document.body.appendChild(pop);
    if (local) return show({ id: local.id, no: local.no, art: local.art, uk: local.uk, ex: local.ex, exUk: local.exUk });
    var cached = O.state.cache[tok]; if (cached && cached.uk) return show(cached);
    pop.innerHTML = '<div class="dim">Перекладаю «' + O.esc(word) + '»…</div>';
    var ctx = (cur.no.match(new RegExp('[^.!?\\n]*\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b[^.!?\\n]*')) || [''])[0].trim();
    O.aiJson('Ти словник норвезької (bokmål) для українського учня. Відповідай лише JSON: {"lemma":"початкова форма","art":"en/ei/et або порожньо","uk":"переклад українською в контексті","ex":"коротке норвезьке речення з цим словом","exUk":"переклад речення"}.',
      [{ role: 'user', content: 'Слово: ' + word + '\nКонтекст: ' + ctx }], 400).then(function (j) {
      var info = { lemma: String(j.lemma || word), art: ['en', 'ei', 'et'].indexOf(j.art) >= 0 ? j.art : '', uk: String(j.uk || ''), ex: String(j.ex || ''), exUk: String(j.exUk || '') };
      var again = O.localLookup(info.lemma); if (again) info.id = again.id;
      O.state.cache[tok] = info; O.save(); show(info);
    }).catch(function (e) { pop.innerHTML = '<div class="dim">' + O.esc(O.aiError(e)) + '</div><button class="btn ghost" data-x>✕</button>'; pop.querySelector('[data-x]').onclick = function () { pop.remove(); }; });
  }
  function open(root, t) {
    cur = t; if (t.id) { var sS = O.state.seenS = O.state.seenS || {}; sS[t.id] = Date.now(); O.save(); } root.querySelector('.rbody').hidden = false; root.querySelector('.rtitle').innerHTML = O.esc(t.title) + (t.gen ? ' <span class="gen ' + (t.gen.tier === 'free' ? 'free' : '') + '">✦ ' + O.esc(O.genLabel(t.gen)) + '</span>' : '');
    root.querySelector('.rtr').textContent = t.uk || ''; root.querySelector('.rtr').hidden = true; paint(root);
    try { root.querySelector('.rbody').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* без прокрутки */ }
  }
  O.renderReader = function (root) {
    root.innerHTML = '<h2>Читалка</h2><p class="dim small">Тапни на слово: переклад і кнопка «+ У словник». Підсвітка: <span class="rw u">невідоме</span> <span class="rw l">вчу</span> <span class="rw k">знаю</span>. Слова з тексту потрапляють у ті самі повторення SM-2.</p>' +
      '<div id="rlist"></div><details><summary>Свій текст</summary><textarea id="rown" rows="5" placeholder="Встав норвезький текст: лист, оголошення, інструкцію…"></textarea><div class="row"><button class="btn" id="rgo">Читати</button><button class="btn ghost" id="rai">ШІ: нова історія зі слів, що я вчу</button></div></details>' +
      '<div class="rbody" hidden><h3 class="rtitle"></h3><div class="cov dim small"></div><div class="rtext no"></div><div class="row rbar"><button class="btn" id="rdone">✓ Прочитано</button><button class="btn ghost" id="rspeak">🔊 Прочитати вголос</button><button class="btn ghost" id="rtr">Показати переклад</button><button class="btn" id="radd">+ Усі невідомі (до 15)</button></div><div class="rtr dim" hidden></div></div>';
    var list = root.querySelector('#rlist');
    O.renderLibrary(list, function (t) { open(root, t); });
    root.querySelector('#rtext');
    root.querySelector('.rtext').onclick = function (e) { var sb = e.target.getAttribute && e.target.getAttribute('data-s'); if (sb != null) { var tr = e.target.parentNode.querySelector('.str'); tr.hidden = !tr.hidden; return; } var w = e.target.getAttribute && e.target.getAttribute('data-w'); if (w) popup(root, w, e.target); };
    root.querySelector('#rgo').onclick = function () { var v = root.querySelector('#rown').value.trim(); if (v) open(root, { id: 'own', title: 'Свій текст', no: v }); };
    root.querySelector('#rdone').onclick = function () { var r = O.state.read = O.state.read || {}; if (cur.id && cur.id !== 'own') { r[cur.id] = { t: Date.now(), cov: cur.cov || 0 }; O.state.xp += 10; O.save(); O.sfx('done'); O.toast('Історію прочитано'); O.renderLibrary(root.querySelector('#rlist'), function (t) { open(root, t); }); } };
    root.querySelector('#rspeak').onclick = function () { O.speak(cur.no); };
    root.querySelector('#rtr').onclick = function (e) {
      var box = root.querySelector('.rtr'); box.hidden = !box.hidden; if (box.hidden || cur.uk) { if (cur.uk) box.textContent = cur.uk; return; }
      box.textContent = 'Перекладаю…'; O.ai('Переклади норвезький текст українською. Лише переклад.', [{ role: 'user', content: cur.no }], 1500).then(function (t) { cur.uk = t; box.textContent = t; }).catch(function (er) { box.textContent = O.aiError(er); });
    };
    root.querySelector('#radd').onclick = function () {
      var added = 0, todo = cur.unk.slice(0, 15), p = Promise.resolve(); if (!todo.length) return O.toast('Невідомих слів немає');
      todo.forEach(function (tok) { p = p.then(function () { var w = O.localLookup(tok); if (w) { if (O.addWord(w)) added++; return; } return O.aiJson('Ти словник норвезької. Лише JSON: {"lemma":"","art":"","uk":"","ex":"","exUk":""}.', [{ role: 'user', content: 'Слово: ' + tok }], 300).then(function (j) { var lem = String(j.lemma || tok).toLowerCase(); var nw = { id: 'u:' + lem, deck: 'mine', cat: 'Mine', art: ['en', 'ei', 'et'].indexOf(j.art) >= 0 ? j.art : '', no: lem, uk: String(j.uk || ''), ex: String(j.ex || ''), exUk: String(j.exUk || ''), fact: 'З тексту: ' + cur.title, multi: false }; if (nw.uk && O.addWord(nw)) { added++; O.state.cache[tok] = { id: nw.id, lemma: nw.no, uk: nw.uk, art: nw.art, ex: nw.ex, exUk: nw.exUk }; } }).catch(function () { }); }); });
      p.then(function () { O.save(); O.toast('Додано слів: ' + added); paint(root); });
    };
    root.querySelector('#rai').onclick = function () {
      var mine = Object.keys(O.state.cards).slice(-25).map(function (k) { return O.wordById[k] && O.wordById[k].no; }).filter(Boolean);
      var b = root.querySelector('#rai'); b.disabled = true; b.textContent = 'Генерую…';
      O.aiJsonG('Ти пишеш короткі історії норвезькою (bokmål, рівень A1-A2) для українця-зварювальника, який живе в Тромсе. Лише JSON: {"title":"","lvl":"A1 або A2","s":[["речення норвезькою","переклад українською"]]}. 6-8 речень, прості й природні. Використай якомога більше слів зі списку, решта прості. Без політики й вульгарності.',
        [{ role: 'user', content: 'Слова: ' + (mine.join(', ') || 'sveise, verksted, jobb') }], 1500).then(function (g) {
        var j = g.json, pairs = (Array.isArray(j.s) ? j.s : []).slice(0, 12).map(function (x) { return Array.isArray(x) ? [String(x[0] || '').trim().slice(0, 200), String(x[1] || '').trim().slice(0, 240)] : null; }).filter(function (x) { return x && x[0] && x[1]; });
        if (pairs.length < 3) throw new Error('empty');
        var st = { id: 'g' + Date.now().toString(36), title: String(j.title || 'Історія від ШІ').slice(0, 120), lvl: j.lvl === 'A1' ? 'A1' : 'A2', theme: 'doc', s: pairs, no: pairs.map(function (x) { return x[0]; }).join(' '), uk: pairs.map(function (x) { return x[1]; }).join(' '), gen: O.cleanGen(g.gen), mine: true };
        O.state.myStories = [st].concat(O.state.myStories || []).slice(0, 60); O.save(); if (O.shareContent) O.shareContent('story', st);
        b.disabled = false; b.textContent = 'ШІ: нова історія зі слів, що я вчу'; O.renderLibrary(root.querySelector('#rlist'), function (t) { open(root, t); }); open(root, st);
      }).catch(function (e) { b.disabled = false; b.textContent = 'ШІ: нова історія зі слів, що я вчу'; O.toast(O.aiError(e), 4000); });
    };
    if (O.pendingStory) { var pt = O.allStories().filter(function (x) { return x.id === O.pendingStory; })[0]; O.pendingStory = null; if (pt) open(root, pt); }
  };
})();
