/* Звук: озвучення (Web Speech), короткі ефекти, розпізнавання мовлення, запис власного голосу для порівняння. */
(function () {
  var O = window.ORD, voice = null, ctx = null;
  function voices() { try { return window.speechSynthesis ? speechSynthesis.getVoices() || [] : []; } catch (e) { return []; } }
  O.norwegianVoices = function () { return voices().filter(function (v) { return /^(nb|no|nn)([-_]|$)/i.test(v.lang); }); };
  function pick() {
    var vs = O.norwegianVoices(), want = O.state && O.state.settings.voice;
    voice = vs.filter(function (v) { return v.name === want; })[0] || vs.filter(function (v) { return /nb/i.test(v.lang); })[0] || vs[0] || null;
  }
  if (window.speechSynthesis) { speechSynthesis.onvoiceschanged = pick; }
  O.hasVoice = function () { pick(); return !!voice; };
  /* slow: повільний режим (0.65x) для вухового розбору */
  O.speak = function (text, opt) {
    opt = opt || {};
    try {
      if (!window.speechSynthesis || !text) return false; pick(); speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text)); u.lang = (voice && voice.lang) || 'nb-NO'; if (voice) u.voice = voice;
      u.rate = opt.slow ? 0.65 : (O.state ? O.state.settings.rate : 1);
      if (opt.onend) u.onend = opt.onend;
      speechSynthesis.speak(u); return true;
    } catch (e) { return false; }
  };
  O.stopSpeak = function () { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } };

  /* Ефекти через WebAudio: без файлів, тихі */
  function tone(f, t, d, type, v) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); var o = ctx.createOscillator(), g = ctx.createGain(), n = ctx.currentTime + t;
      o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, n); g.gain.exponentialRampToValueAtTime(v || 0.12, n + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, n + d);
      o.connect(g); g.connect(ctx.destination); o.start(n); o.stop(n + d + 0.02);
    } catch (e) { /* без звуку */ }
  }
  O.sfx = function (k) {
    if (!O.state || !O.state.settings.sfx) return;
    if (k === 'ok') { tone(660, 0, 0.12); tone(880, 0.09, 0.16); }
    else if (k === 'bad') { tone(200, 0, 0.18, 'triangle', 0.1); }
    else if (k === 'done') { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.1, 0.2); }); }
    else tone(520, 0, 0.05, 'sine', 0.06);
  };

  /* Розпізнавання норвезької: працює в Chrome і Safari (потрібен інтернет). Це розпізнавання тексту, а не оцінка фонетики. */
  O.canListen = function () { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); };
  O.listen = function (cb, err) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { err && err('unsupported'); return null; }
    var r = new SR(); r.lang = 'nb-NO'; r.maxAlternatives = 5; r.interimResults = false;
    r.onresult = function (e) { var alts = []; for (var i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript); cb(alts); };
    r.onerror = function (e) { err && err(e.error || 'error'); };
    try { r.start(); } catch (e) { err && err('start'); } return r;
  };
  /* Найкраща схожість серед альтернатив розпізнавання з еталоном */
  O.pronScore = function (alts, target) { return alts.reduce(function (m, a) { return Math.max(m, O.sim(a, target)); }, 0); };

  /* Запис власного голосу (MediaRecorder), щоб порівняти на слух з еталоном */
  O.record = function (ms) {
    return new Promise(function (res, rej) {
      if (!navigator.mediaDevices || !window.MediaRecorder) return rej(new Error('unsupported'));
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
        var rec = new MediaRecorder(st), chunks = [];
        rec.ondataavailable = function (e) { chunks.push(e.data); };
        rec.onstop = function () { st.getTracks().forEach(function (t) { t.stop(); }); res(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))); };
        rec.start(); setTimeout(function () { if (rec.state !== 'inactive') rec.stop(); }, ms || 4000);
      }).catch(rej);
    });
  };
})();
