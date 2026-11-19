/* Озвучення голосом Gemini (за бажанням, із твого ключа). Обгортає O.speak: кеш у Cache Storage (повторне слово безкоштовне),
   денний ліміт запитів, при будь-якій помилці мовчки повертається до системного голосу. Ціну запиту не знаю: ліміт рахується в запитах, а не в доларах. */
(function () {
  var O = window.ORD, base = O.speak, baseStop = O.stopSpeak, cur = null, seq = 0, mdl = null, CACHE = 'ord-tts', VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Leda', 'Aoede'];
  O.gttsLast = null;
  function st() { return O.state && O.state.settings || {}; }
  function dkey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function used() { try { var x = JSON.parse(localStorage.getItem('ord_gtts_n') || '{}'); return x.d === dkey() ? x.n : 0; } catch (e) { return 0; } }
  function bump() { try { localStorage.setItem('ord_gtts_n', JSON.stringify({ d: dkey(), n: used() + 1 })); } catch (e) { /* ignore */ } }
  function cap() { return st().gCap || 150; }
  function on() { return !!(st().gTts && O.gem && O.gem.has()); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function wav(pcm, rate) {
    var n = pcm.length, b = new ArrayBuffer(44 + n), v = new DataView(b), w = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n, true);
    new Uint8Array(b, 44).set(pcm); return new Blob([b], { type: 'audio/wav' });
  }
  function unb64(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  /* Модель озвучення: найновіша flash-tts зі списку ключа (не lite), інакше типова */
  function model() {
    if (st().gModel) return Promise.resolve(st().gModel); if (mdl) return Promise.resolve(mdl);
    return O.gem.models().then(function (ns) {
      var t = ns.filter(function (n) { return /^gemini-.*tts/.test(n) && !/preview-tts$/.test(n); });
      function ver(n) { var m = /gemini-(\d+)(?:\.(\d+))?/.exec(n); return m ? +m[1] * 100 + (+m[2] || 0) : 0; }
      t.sort(function (a, b) { return (/lite/.test(a) ? 1 : 0) - (/lite/.test(b) ? 1 : 0) || ver(b) - ver(a); });
      return (mdl = t[0] || 'gemini-3.8-flash-tts');
    }, function () { return (mdl = 'gemini-3.8-flash-tts'); });
  }
  function fetchWav(text, slow) {
    var voice = st().gVoice || 'Kore', key = 'https://tts.local/' + hash([voice, slow ? 's' : 'n', text].join('|'));
    var cs = window.caches ? caches.open(CACHE) : Promise.resolve(null);
    return cs.then(function (c) {
      return (c ? c.match(key) : Promise.resolve(null)).then(function (hit) {
        if (hit) return hit.blob();
        if (used() >= cap()) throw Object.assign(new Error('cap'), { code: 'cap' });
        return model().then(function (m) {
          var pre = slow ? 'Say slowly and clearly in Norwegian Bokmål: ' : 'Say clearly in Norwegian Bokmål: ';
          bump();
          return O.gem.gen(m, { contents: [{ parts: [{ text: pre + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } });
        }).then(function (j) {
          var part = (((j.candidates || [])[0] || {}).content || {}).parts; part = (part || []).filter(function (x) { return x.inlineData; })[0];
          if (!part) throw Object.assign(new Error('empty'), { code: 'empty' });
          var mime = part.inlineData.mimeType || '', raw = unb64(part.inlineData.data), rate = +((/rate=(\d+)/.exec(mime) || [])[1]) || 24000;
          var blob = /^audio\/(wav|x-wav|mpeg|mp3|ogg)/.test(mime) ? new Blob([raw], { type: mime }) : wav(raw, rate);
          if (c) { c.put(key, new Response(blob)).then(function () { return c.keys(); }).then(function (ks) { if (ks.length > 250) ks.slice(0, ks.length - 250).forEach(function (k) { c.delete(k); }); }).catch(function () { /* ignore */ }); }
          return blob;
        });
      });
    });
  }
  O.speak = function (text, opt) {
    opt = opt || {}; if (!text || !on()) return base(text, opt);
    try { baseStop(); } catch (e) { /* ignore */ } if (cur) { try { cur.pause(); } catch (e2) { /* ignore */ } cur = null; }
    var id = ++seq; cur = null;
    fetchWav(String(text), !!opt.slow).then(function (blob) {
      if (id !== seq) return; var a = new Audio(URL.createObjectURL(blob)); cur = a; a.playbackRate = opt.slow ? 1 : Math.min(1.3, Math.max(0.7, st().rate || 1)); if (opt.onend) a.onended = opt.onend;
      O.gttsLast = { ok: true, t: Date.now() }; return a.play();
    }).catch(function (e) {
      if (id !== seq) return;
      O.gttsLast = { ok: false, code: e && e.code, status: e && e.detail, msg: e && (e.msg || e.message), t: Date.now() };
      if (e && e.code === 'cap' && !O._gcap) { O._gcap = 1; O.toast('Денний ліміт озвучення Gemini вичерпано, далі системний голос', 3500); }
      if (e && (e.code === 'auth' || e.code === 'model') && !O._gbad) { O._gbad = 1; O.toast('Голос Gemini недоступний (' + (e.detail || e.code) + '), використовую системний', 3500); }
      cur = null; base(text, opt);
    });
    return true;
  };
  O.stopSpeak = function () { seq++; if (cur instanceof Audio) { try { cur.pause(); } catch (e) { /* ignore */ } } cur = null; baseStop(); };
  O.gtts = { VOICES: VOICES, used: used, cap: cap, on: on, fetchWav: fetchWav, test: function () { return fetchWav('Hei! Dette er en test av stemmen.', false).then(function () { return { ok: true }; }, function (e) { return { ok: false, code: e && e.code, status: e && e.detail, msg: e && (e.msg || e.message) }; }); } };
})();
