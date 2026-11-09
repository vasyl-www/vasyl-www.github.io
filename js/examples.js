/* Більше прикладів для кожного слова: (1) локально — речення з історій і прикладів інших слів, де це слово трапляється;
   (2) пакетом через ШІ — позначені як неперевірені. Приклади чергуються в пропусках, диктантах і підказках. */
(function () {
  var O = window.ORD = window.ORD || {};
  var MAX = 6;
  function X() { return (O.state.exs = O.state.exs || {}); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function has(sent, w) {
    var forms = [w.no].concat((O.base && O.base.FORMS && O.base.FORMS[w.no]) || []);
    return forms.some(function (f) { return new RegExp('(^|[^A-Za-zÆØÅæøå])' + esc(f) + '(?![A-Za-zÆØÅæøå])', 'i').test(sent); });
  }
  function corpus() {
    var out = [];
    (O.stories || []).forEach(function (st) { (st.s || []).forEach(function (p) { out.push({ no: p[0], uk: p[1], src: 'story' }); }); });
    ((O.state.poems && O.state.poems.texts) || []);   // вірші не чіпаємо: довгі рядки без перекладу
    (O.words || []).forEach(function (w) { if (w.ex && w.exUk) out.push({ no: w.ex, uk: w.exUk, src: 'word' }); });
    return out;
  }
  var CORP = null;
  function local(w, n) {
    if (!CORP) CORP = corpus(); var seen = {}, r = [];
    CORP.forEach(function (e) { if (r.length >= n || e.no === w.ex || seen[e.no] || e.no.length > 90) return; if (has(e.no, w)) { seen[e.no] = 1; r.push(e); } });
    return r;
  }
  function all(w) {
    var base = w.ex ? [{ no: w.ex, uk: w.exUk || '', src: 'base' }] : [], mine = X()[w.id] || [];
    return base.concat(mine);
  }
  function pick(w) { var a = all(w); return a.length ? a[Math.floor(Math.random() * a.length)] : { no: w.ex || '', uk: w.exUk || '', src: 'base' }; }
  function store(w, list) {
    var cur = X()[w.id] = X()[w.id] || [], have = {}; cur.forEach(function (e) { have[e.no] = 1; });
    list.forEach(function (e) { if (cur.length < MAX && !have[e.no] && e.no && e.uk) { cur.push(e); have[e.no] = 1; } });
    return cur.length;
  }
  /* одразу, без мережі */
  function enrichLocal(id) { var w = O.wordById[id]; if (!w) return 0; var cur = (X()[w.id] || []).length; if (cur >= 3) return cur; store(w, local(w, 3)); O.save(); return (X()[w.id] || []).length; }
  /* пакетом: кілька слів одним запитом; лише слова з ≤2 прикладами */
  var busy = false;
  function enrichAI(ids, cb) {
    if (busy) return cb && cb(0); var ws = ids.map(function (i) { return O.wordById[i]; }).filter(function (w) { return w && all(w).length < 3; }).slice(0, 8);
    if (!ws.length || !O.aiStatus) return cb && cb(0); busy = true;
    O.aiStatus().then(function (st) {
      if (!st.ai) { busy = false; return cb && cb(0); }
      var sys = 'Ти допомагаєш українцю вчити норвезьку (bokmål, рівень A1-A2, робота й побут). Для кожного слова дай 2 коротких природних речення (до 10 слів) з ним і переклад українською. Відповідай ЛИШЕ JSON-масивом: [{"no":"слово","s":[["речення","переклад"],["речення","переклад"]]}].';
      return O.aiJson(sys, [{ role: 'user', content: JSON.stringify(ws.map(function (w) { return w.no; })) }], 1400).then(function (arr) {
        var n = 0; (Array.isArray(arr) ? arr : []).forEach(function (it) {
          var w = ws.filter(function (x) { return x.no === it.no; })[0]; if (!w || !Array.isArray(it.s)) return;
          n += it.s.filter(function (p) { return Array.isArray(p) && typeof p[0] === 'string' && has(p[0], w); }).length;
          store(w, it.s.filter(function (p) { return Array.isArray(p) && typeof p[0] === 'string' && typeof p[1] === 'string' && has(p[0], w); }).map(function (p) { return { no: p[0].trim(), uk: p[1].trim(), src: 'ai' }; }));
        });
        O.save(); busy = false; cb && cb(n);
      });
    }).catch(function () { busy = false; cb && cb(0); });
  }
  O.ex = { all: all, pick: pick, local: local, enrichLocal: enrichLocal, enrichAI: enrichAI, has: has };
})();
