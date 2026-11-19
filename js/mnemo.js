/* Асоціації для важких слів (метод ключового слова): ШІ підбирає українське слово, схоже на звучання, і яскраву сцену;
   Gemini за бажанням малює її. Текст у state.mnemo (синхронізується), картинка лежить лише на цьому пристрої (Cache Storage). */
(function () {
  var O = window.ORD, CACHE = 'ord-mnemo', imgModel = null;
  function st() { return O.state.settings; }
  function M() { return O.state.mnemo = O.state.mnemo || {}; }
  function dkey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function used() { try { var x = JSON.parse(localStorage.getItem('ord_mn_n') || '{}'); return x.d === dkey() ? x.n : 0; } catch (e) { return 0; } }
  function bump() { try { localStorage.setItem('ord_mn_n', JSON.stringify({ d: dkey(), n: used() + 1 })); } catch (e) { /* ignore */ } }
  function cap() { return st().mnCap || 10; }
  function hard(c) { return !!c && (c.leech || (c.lapses || 0) >= 2); }
  function key(id) { return 'https://mnemo.local/' + encodeURIComponent(id); }
  function getImg(id) { return window.caches ? caches.open(CACHE).then(function (c) { return c.match(key(id)); }).then(function (r) { return r ? r.blob() : null; }, function () { return null; }) : Promise.resolve(null); }
  function putImg(id, blob) { return window.caches ? caches.open(CACHE).then(function (c) { return c.put(key(id), new Response(blob)); }).catch(function () { /* ignore */ }) : Promise.resolve(); }
  function pickModel() {
    if (imgModel) return Promise.resolve(imgModel);
    return O.gem.models().then(function (ns) {
      function ver(n) { var m = /gemini-(\d+)(?:\.(\d+))?/.exec(n); return m ? +m[1] * 100 + (+m[2] || 0) : 0; }
      var t = ns.filter(function (n) { return /^gemini-.*image/.test(n) && !/(pro|lite)/.test(n) && !/^gemini-2\.5/.test(n); }).sort(function (a, b) { return ver(b) - ver(a); });
      return (imgModel = t[0] || 'gemini-3.1-flash-image');
    }, function () { return (imgModel = 'gemini-3.1-flash-image'); });
  }
  function shrink(blob) {
    return (window.createImageBitmap ? createImageBitmap(blob) : Promise.reject()).then(function (bm) {
      var k = Math.min(1, 512 / Math.max(bm.width, bm.height)), cv = document.createElement('canvas'); cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k); cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
      return new Promise(function (res) { cv.toBlob(function (b) { res(b || blob); }, 'image/jpeg', 0.82); });
    }).catch(function () { return blob; });
  }
  function b64(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function draw(w, scene) {
    if (used() >= cap()) return Promise.reject(Object.assign(new Error('cap'), { code: 'cap' }));
    return pickModel().then(function (m) {
      bump();
      return O.gem.gen(m, { contents: [{ parts: [{ text: 'A simple, clear, memorable illustration with one central scene, flat friendly style, absolutely no text, letters, numbers or captions: ' + scene }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } });
    }).then(function (j) {
      var parts = (((j.candidates || [])[0] || {}).content || {}).parts || [], p = parts.filter(function (x) { return x.inlineData && /^image\//.test(x.inlineData.mimeType || ''); })[0];
      if (!p) throw Object.assign(new Error('empty'), { code: 'empty' });
      return shrink(new Blob([b64(p.inlineData.data)], { type: p.inlineData.mimeType }));
    }).then(function (blob) { return putImg(w.id, blob).then(function () { return blob; }); });
  }
  function think(w) {
    var sys = 'Ти допомагаєш українцю запам’ятати норвезьке слово методом ключового слова. Відповідай ЛИШЕ JSON: {"kw":"українське слово чи коротка фраза, що звучить схоже на норвезьке слово","line":"одне речення українською: яскрава сцена, де kw взаємодіє зі значенням слова","scene":"опис цієї сцени для ілюстрації англійською, 1-2 речення, конкретні предмети, без тексту й літер"}. Схожість має бути на слух, не за написанням. Сцена смішна або незвична, бо такі запам’ятовуються краще.';
    return O.aiJson(sys, [{ role: 'user', content: 'Норвезьке слово: ' + O.label(w) + '. Значення: ' + w.uk + '.' + (w.ex ? ' Приклад: ' + w.ex : '') }], 500).then(function (j) {
      if (!j || !j.kw || !j.line) throw Object.assign(new Error('empty'), { code: 'empty' });
      return { kw: String(j.kw).slice(0, 60), line: String(j.line).slice(0, 300), scene: String(j.scene || j.line).slice(0, 400), t: Date.now() };
    });
  }
  function panel(box, w, auto) {
    var m = M()[w.id], canPic = !!(O.gem && O.gem.has()) && st().mnPic !== false;
    function err(e) { return e && e.code === 'cap' ? 'Денний ліміт зображень вичерпано (' + cap() + ').' : (e && e.status === 402) || (e && e.detail === 402) ? 'Google: немає передоплачених кредитів (402). Поповни баланс в AI Studio.' : O.aiError ? O.aiError(e) : 'Не вийшло'; }
    box.className = 'mnemo'; box.innerHTML = '';
    if (!m) {
      box.innerHTML = '<button class="btn ghost" data-mk>🧠 Придумати асоціацію</button><div class="dim small" data-st></div>';
      box.querySelector('[data-mk]').onclick = function () {
        var s = box.querySelector('[data-st]'); s.textContent = 'Думаю…'; box.querySelector('[data-mk]').disabled = true;
        think(w).then(function (r) { M()[w.id] = r; O.save(); if (O.tele) O.tele.ev('mnemo'); panel(box, w, canPic); }, function (e) { s.textContent = err(e); box.querySelector('[data-mk]').disabled = false; });
      }; return;
    }
    box.innerHTML = '<div class="mn-h">🧠 Асоціація</div><div class="mn-kw">Звучить як: <b>' + O.esc(m.kw) + '</b></div><div class="mn-line">' + O.esc(m.line) + '</div><div class="mn-pic"></div><div class="row"><button class="btn ghost sm" data-re>↻ Інша</button>' + (canPic ? '<button class="btn ghost sm" data-pic>🖼 Намалювати</button>' : '') + '</div><div class="dim small" data-st>Придумано ШІ: перевір, чи справді схоже на слух. Якщо ні, натисни «Інша».</div>';
    var pic = box.querySelector('.mn-pic'), s2 = box.querySelector('[data-st]');
    function show(gen) {
      getImg(w.id).then(function (b) {
        if (b) { pic.innerHTML = '<img alt="' + O.esc(m.kw) + '" src="' + URL.createObjectURL(b) + '">'; return; }
        if (!gen) return; s2.textContent = 'Малюю…'; draw(w, m.scene).then(function (bb) { pic.innerHTML = '<img alt="' + O.esc(m.kw) + '" src="' + URL.createObjectURL(bb) + '">'; s2.textContent = 'Зображення створене ШІ.'; if (O.tele) O.tele.ev('mnemo_img'); }, function (e) { s2.textContent = err(e); });
      });
    }
    show(!!auto);
    box.querySelector('[data-re]').onclick = function () { delete M()[w.id]; if (window.caches) caches.open(CACHE).then(function (c) { c.delete(key(w.id)); }); O.save(); panel(box, w); box.querySelector('[data-mk]').click(); };
    var pb = box.querySelector('[data-pic]'); if (pb) pb.onclick = function () { if (window.caches) caches.open(CACHE).then(function (c) { c.delete(key(w.id)); }).then(function () { show(true); }); else show(true); };
  }
  O.mnemo = { hard: hard, panel: panel, think: think, draw: draw, used: used, cap: cap, has: function (id) { return !!M()[id]; } };
})();
