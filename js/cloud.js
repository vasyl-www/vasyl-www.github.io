/* Спільнота без сервера. Усе працює на статичному сайті:
   1) community/feed.json у репозиторії: добірка від адміна (редагується комітом), її бачать усі;
   2) пакети: файл .json, яким користувачі обмінюються (експорт «моїх» матеріалів / імпорт чужих);
   3) локальний профіль (нік) без паролів. Дані лишаються в цьому браузері.
   Ключі ШІ сюди не потрапляють. Інтерфейс window.ORD_CLOUD той самий, що й був, тож решта коду не змінилась. */
(function () {
  var KEY = 'ord.comm.v1', OUT_MAX = 100, IN_MAX = 300, listeners = [];
  var D = { profile: null, outbox: [], inbox: [], hidden: [] };
  try { var r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && typeof r === 'object') D = Object.assign(D, r); } catch (e) { /* порожньо */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* сховище недоступне */ } }
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  if (!D.profile || !D.profile.uid) { D.profile = { uid: 'p' + rid(), name: '' }; save(); }
  function me() { return { uid: D.profile.uid, name: D.profile.name || 'Я' }; }
  var feedCache = null;
  function feed() {
    if (feedCache) return Promise.resolve(feedCache);
    return fetch('community/feed.json', { cache: 'no-store', credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : { items: [] }; })
      .then(function (j) { feedCache = (j && Array.isArray(j.items) ? j.items : []).slice(0, 500).map(function (x) { return Object.assign({}, x, { id: 'feed-' + String(x.id || x.title || rid()).slice(0, 40), uid: 'feed' }); }); return feedCache; })
      .catch(function () { return []; });
  }
  window.ORD_CLOUD = {
    enabled: true, serverless: true,
    user: me,
    onAuth: function (f) { listeners.push(f); f(me()); },
    setName: function (n) { D.profile.name = String(n || '').trim().slice(0, 30); save(); listeners.forEach(function (f) { f(me()); }); },
    async publish(d) {
      var o = { id: 'l' + rid(), uid: D.profile.uid, t: Date.now() };
      ['kind', 'title', 'no', 'uk', 'explain', 'top', 'bottom', 'svg', 'q', 'sj', 'lvl', 'provider', 'model', 'tier', 'v'].forEach(function (k) { if (d[k] !== undefined && d[k] !== '') o[k] = d[k]; });
      D.outbox.unshift(o); D.outbox = D.outbox.slice(0, OUT_MAX); save(); return o.id;
    },
    async list(q) {
      var f = await feed(), all = D.outbox.concat(D.inbox, f);
      return all.filter(function (x) { return x.tier === q.tier && (!q.kind || x.kind === q.kind) && D.hidden.indexOf(x.id) < 0; }).slice(0, q.max || 60);
    },
    /* «Скарга» ховає запис локально: сервера, що збирає скарги, немає */
    async report(id) { if (D.hidden.indexOf(id) < 0) D.hidden.push(id); D.hidden = D.hidden.slice(-500); save(); },
    async remove(id) { D.outbox = D.outbox.filter(function (x) { return x.id !== id; }); D.inbox = D.inbox.filter(function (x) { return x.id !== id; }); save(); },
    /* Пакет для обміну: лише мої матеріали (з підписом моделі), без імені й без ключів */
    exportPack: function () { return JSON.stringify({ ord: 'pack', v: 1, items: D.outbox.map(function (x) { var c = Object.assign({}, x); delete c.uid; delete c.id; return c; }) }); },
    importPack: function (str, clean) {
      var j = JSON.parse(str); if (!j || j.ord !== 'pack' || !Array.isArray(j.items)) throw new Error('Це не пакет Ord');
      var add = 0; j.items.slice(0, 200).forEach(function (x) {
        var o = Object.assign({}, x, { id: 'i' + rid(), uid: 'imp' }); if (!clean(o)) return;
        D.inbox.unshift(o); add++;
      });
      D.inbox = D.inbox.slice(0, IN_MAX); save(); return add;
    },
    counts: function () { return { out: D.outbox.length, inn: D.inbox.length, hidden: D.hidden.length }; }
  };
})();
