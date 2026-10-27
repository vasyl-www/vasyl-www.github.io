/* Бібліотека історій: SVG-обкладинки, рівні, прогрес і поріг читання (частка відомих слів). */
(function () {
  var O = window.ORD, TH = 0.95;
  O.THRESHOLD = TH;
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  var ICON = {
    weld: '<circle cx="80" cy="62" r="5" fill="#ffd166"/><path d="M80 40v10M80 74v10M58 62h10M92 62h10M64 46l7 7M96 78l-7-7M96 46l-7 7M64 78l7-7" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/><rect x="40" y="90" width="80" height="8" rx="3" fill="#cbd5e1"/>',
    cup: '<path d="M52 56h52v28a16 16 0 0 1-16 16H68a16 16 0 0 1-16-16z" fill="#f1f5f9"/><path d="M104 62h8a8 8 0 0 1 0 22h-8" stroke="#f1f5f9" stroke-width="5" fill="none"/><path d="M66 46c-4-6 4-8 0-14M82 46c-4-6 4-8 0-14" stroke="#f1f5f9" stroke-width="3" fill="none" stroke-linecap="round"/>',
    cart: '<path d="M38 44h16l10 40h46l8-30H58" stroke="#f1f5f9" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/><circle cx="72" cy="98" r="6" fill="#f1f5f9"/><circle cx="106" cy="98" r="6" fill="#f1f5f9"/>',
    snow: '<g stroke="#f8fafc" stroke-width="3" stroke-linecap="round"><path d="M80 36v52M58 48l44 28M58 76l44-28"/></g><circle cx="80" cy="62" r="4" fill="#f8fafc"/>',
    doc: '<rect x="54" y="34" width="52" height="68" rx="6" fill="#f1f5f9"/><path d="M64 52h32M64 64h32M64 76h20" stroke="#475569" stroke-width="4" stroke-linecap="round"/>',
    house: '<path d="M44 68L80 38l36 30" stroke="#f1f5f9" stroke-width="6" fill="none" stroke-linejoin="round" stroke-linecap="round"/><rect x="54" y="68" width="52" height="34" fill="#f1f5f9"/><rect x="74" y="80" width="12" height="22" fill="#475569"/>',
    cross: '<rect x="70" y="36" width="20" height="64" rx="4" fill="#f8fafc"/><rect x="48" y="58" width="64" height="20" rx="4" fill="#f8fafc"/>'
  };
  /* Обкладинка: нічне небо, гори, смуга півничного сяйва й піктограма теми. Колір залежить від id. */
  O.cover = function (t) {
    var h = hash(t.id) % 360;
    return '<svg viewBox="0 0 160 120" class="cover" role="img" aria-label="' + O.esc(t.title) + '"><defs><linearGradient id="g' + t.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(' + h + ',45%,16%)"/><stop offset="1" stop-color="hsl(' + ((h + 40) % 360) + ',50%,32%)"/></linearGradient></defs>' +
      '<rect width="160" height="120" fill="url(#g' + t.id + ')"/><path d="M0 40q40-24 80-6t80-8v20q-40 18-80 0T0 62z" fill="hsl(' + ((h + 130) % 360) + ',70%,60%)" opacity=".18"/>' +
      '<path d="M0 120V96l30-22 24 18 34-36 30 30 20-14 22 20v28z" fill="rgba(0,0,0,.28)"/>' + (ICON[t.theme] || '') + '</svg>';
  };
  O.coverage = function (text) {
    var n = 0, k = 0, l = 0, unk = {};
    text.split(/([^A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+)/).forEach(function (p) {
      if (!/^[A-Za-zÆØÅæøåÉéÈèÜüÖö'’-]+$/.test(p) || p.length < 2) return;
      var s = O.tokStatus(p); n++; if (s === 'k') k++; else if (s === 'l') l++; else unk[p.toLowerCase()] = 1;
    });
    return { n: n, known: n ? k / n : 0, learning: n ? l / n : 0, unk: Object.keys(unk).length };
  };
  function meter(c) {
    var k = Math.round(c.known * 100), l = Math.round(c.learning * 100);
    return '<div class="thr" title="Відомо ' + k + '%, вчу ' + l + '%. Для вільного читання потрібно близько 95%."><i class="k" style="width:' + k + '%"></i><i class="l" style="width:' + l + '%"></i><u style="left:' + TH * 100 + '%"></u></div>';
  }
  O.meter = meter;
  O.allStories = function () { return (O.state && O.state.myStories || []).concat(O.stories); };
  O.renderLibrary = function (box, onOpen) {
    var st = O.state; st.read = st.read || {}; var lvl = st.settings.libLvl || 'all';
    box.innerHTML = '<div class="chips" id="llv"></div><div class="lib" id="lgrid"></div>';
    var chips = box.querySelector('#llv');
    ['all', 'A1', 'A2'].forEach(function (v) { var b = O.el('button', 'chip' + (v === lvl ? ' on' : ''), v === 'all' ? 'Усі' : v); b.onclick = function () { st.settings.libLvl = v; O.save(); O.renderLibrary(box, onOpen); }; chips.appendChild(b); });
    var grid = box.querySelector('#lgrid');
    O.allStories().filter(function (t) { return lvl === 'all' || t.lvl === lvl; }).forEach(function (t) {
      var c = O.coverage(t.no), done = st.read[t.id], ready = c.known >= TH;
      var card = O.el('button', 'story', '<div class="cv">' + O.cover(t) + '<span class="lv">' + t.lvl + (t.gen ? ' · ШІ' : '') + '</span>' + (done ? '<span class="dn">✓</span>' : '') + '</div><b>' + O.esc(t.title) + '</b>' + meter(c) +
        (t.gen ? '<small class="gen ' + (t.gen.tier === 'free' ? 'free' : '') + '">✦ ' + O.esc(O.genLabel(t.gen)) + '</small>' : '') + '<small class="dim">' + Math.round(c.known * 100) + '% відомо · ' + c.unk + ' нових слів' + (ready ? ' · готово' : '') + '</small>');
      card.onclick = function () { onOpen(t); }; grid.appendChild(card);
    });
  };
})();
