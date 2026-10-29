/* Синхронізація між пристроями через ТВІЙ приватний репозиторій GitHub (без чужого сервера й без Firebase).
   «Акаунт» = репозиторій + токен з правом лише на цей репозиторій. Дані зливаються (merge), а не перезаписуються: картки, журнал, слова, історії,
   переклади, форум, ігри, текстові піни (з коментарями й реакціями). Ключі ШІ не синхронізуються взагалі.
   Токен зберігається так само, як ключі ШІ: зашифровано паролем сховища або лише до закриття вкладки.
   Файл у репозиторії стиснутий (gzip) і містить прогрес навчання, тому репозиторій має бути ПРИВАТНИЙ: публічний відхиляється. */
(function () {
  var O = window.ORD, CFG = 'ord.sync.v1', DEL = 'ord.sync.del', API = 'https://api.github.com', PATH = 'ord-sync.json', applying = false, busy = false, timer = null, listeners = [];
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  var C = lsGet(CFG, {}); if (!C.dev) { C.dev = Math.random().toString(36).slice(2, 10); lsSet(CFG, C); }
  var S = { state: C.repo ? 'idle' : 'off', msg: '' };
  function tok() { return O.keys && O.keys.getSecret ? O.keys.getSecret('github') : ''; }
  function emit(st, msg) { S = { state: st, msg: msg || '' }; listeners = listeners.filter(function (f) { try { return f() !== 'gone'; } catch (e) { return true; } }); }
  function b64(buf) { var s = '', a = new Uint8Array(buf), i, CH = 0x8000; for (i = 0; i < a.length; i += CH) s += String.fromCharCode.apply(null, a.subarray(i, i + CH)); return btoa(s); }
  function unb64(s) { var b = atob(s.replace(/\s/g, '')), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function gz(str) {
    if (!window.CompressionStream) return Promise.resolve(str);
    var cs = new CompressionStream('gzip'), w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close();
    return new Response(cs.readable).arrayBuffer().then(function (b) { return 'GZ1:' + b64(b); });
  }
  function ungz(t) {
    if (t.indexOf('GZ1:') !== 0) return Promise.resolve(t);
    if (!window.DecompressionStream) return Promise.reject(new Error('Браузер не вміє розпакувати gzip'));
    var ds = new DecompressionStream('gzip'), w = ds.writable.getWriter(); w.write(unb64(t.slice(4))); w.close(); return new Response(ds.readable).text();
  }

  /* ---------- Злиття (чиста функція, без доступу до DOM) ---------- */
  function byKey(arr, kf, pick) { var m = {}; (arr || []).forEach(function (x) { var k = kf(x); m[k] = m[k] ? pick(m[k], x) : x; }); return Object.keys(m).map(function (k) { return m[k]; }); }
  function newer(a, b, f) { return (b[f] || 0) > (a[f] || 0) ? b : a; }
  function union(a, b) { return Object.assign({}, b || {}, a || {}); }
  function mergeStates(a, b) {
    a = a || {}; b = b || {}; var o = {};
    o.cards = {}; var ids = Object.keys(Object.assign({}, a.cards, b.cards));
    ids.forEach(function (id) { var x = (a.cards || {})[id], y = (b.cards || {})[id]; o.cards[id] = !x ? y : !y ? x : ((y.last || 0) > (x.last || 0) || ((y.last || 0) === (x.last || 0) && (y.reps || 0) > (x.reps || 0)) ? y : x); });
    o.log = byKey((a.log || []).concat(b.log || []), function (x) { return x.t + ':' + x.id; }, function (p) { return p; }).sort(function (x, y) { return x.t - y.t; }).slice(-3000);
    o.known = union(a.known, b.known); o.seenW = union(a.seenW, b.seenW); o.seenS = union(a.seenS, b.seenS); o.userWords = union(a.userWords, b.userWords); o.cache = union(a.cache, b.cache);
    o.xp = Math.max(a.xp || 0, b.xp || 0);
    o.read = {}; Object.keys(Object.assign({}, a.read, b.read)).forEach(function (k) { var x = (a.read || {})[k], y = (b.read || {})[k]; o.read[k] = !x ? y : !y ? x : newer(x, y, 't'); });
    o.myStories = byKey((a.myStories || []).concat(b.myStories || []), function (x) { return x.id; }, function (p) { return p; }).sort(function (x, y) { return x.id < y.id ? 1 : x.id > y.id ? -1 : 0; }).slice(0, 60);
    o.tr = byKey((a.tr || []).concat(b.tr || []), function (x) { return String(x.q || '').toLowerCase().trim(); }, function (p, q) { return newer(p, q, 't'); }).sort(function (x, y) { return y.t - x.t; }).slice(0, 300);
    o.practice = {}; Object.keys(Object.assign({}, a.practice, b.practice)).forEach(function (k) { o.practice[k] = byKey(((a.practice || {})[k] || []).concat((b.practice || {})[k] || []), function (x) { return x.t; }, function (p) { return p; }).sort(function (x, y) { return x.t - y.t; }).slice(-300); });
    var ta = (a.tutor && a.tutor.sessions) || [], tb = (b.tutor && b.tutor.sessions) || [];
    o.tutor = Object.assign({}, a.tutor || {}, { sessions: byKey(ta.concat(tb), function (x) { return x.t || JSON.stringify(x).slice(0, 80); }, function (p) { return p; }).sort(function (x, y) { return (y.t || 0) - (x.t || 0); }).slice(0, 100) });
    var ga = a.games || {}, gb = b.games || {}, best = {}; Object.keys(Object.assign({}, ga.best, gb.best)).forEach(function (k) { var x = (ga.best || {})[k], y = (gb.best || {})[k]; best[k] = x == null ? y : y == null ? x : (k === 'mem' ? Math.min(x, y) : Math.max(x, y)); });
    var miss = {}; Object.keys(Object.assign({}, ga.miss, gb.miss)).forEach(function (k) { miss[k] = Math.max((ga.miss || {})[k] || 0, (gb.miss || {})[k] || 0); });
    o.games = { best: best, miss: miss, ordle: (gb.ordle && (!ga.ordle || (gb.ordle.day || 0) > (ga.ordle.day || 0) || ((gb.ordle.day === ga.ordle.day) && (gb.ordle.rows || []).length > (ga.ordle.rows || []).length))) ? gb.ordle : ga.ordle || null };
    var pa = a.pinsAi || {}, pb = b.pinsAi || {}; o.pinsAi = pa.day === pb.day ? Object.assign({}, pa, { n: Math.max(pa.n || 0, pb.n || 0) }) : ((pb.day || '') > (pa.day || '') ? Object.assign({}, pb, { per: pa.per || pb.per }) : pa);
    var fa = (a.forum && a.forum.threads) || [], fb = (b.forum && b.forum.threads) || [], th = {};
    fa.concat(fb).forEach(function (t) { var e = th[t.id]; if (!e) th[t.id] = JSON.parse(JSON.stringify(t)); else { e.posts = byKey((e.posts || []).concat(t.posts || []), function (x) { return x.id; }, function (p) { return p; }).sort(function (x, y) { return x.t - y.t; }); } });
    o.forum = { threads: Object.keys(th).map(function (k) { return th[k]; }).sort(function (x, y) { return (y.created || 0) - (x.created || 0); }).slice(0, 60) };
    return o;
  }
  function byId(x, y) { return x.id < y.id ? -1 : x.id > y.id ? 1 : 0; }
  function mergePin(a, b) {
    var w = (b.mt || b.t || 0) > (a.mt || a.t || 0) ? b : a, o = Object.assign({}, w);
    var cm = byKey((a.comments || []).concat(b.comments || []), function (x) { return x.id; }, function (p) { return p; }).sort(function (x, y) { return x.t - y.t; }); if (cm.length) o.comments = cm.slice(0, 100);
    return o;
  }
  function mergePins(la, ra, del) {
    var m = {}; la.concat(ra).forEach(function (p) { m[p.id] = m[p.id] ? mergePin(m[p.id], p) : p; });
    return Object.keys(m).map(function (k) { return m[k]; }).filter(function (p) { return !(del[p.id] && del[p.id] >= (p.mt || p.t || 0)); });
  }
  O.sync = { mergeStates: mergeStates, mergePins: mergePins };

  function canon(x) { if (Array.isArray(x)) return '[' + x.map(canon).join(',') + ']'; if (x && typeof x === 'object') return '{' + Object.keys(x).sort().filter(function (k) { return x[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + canon(x[k]); }).join(',') + '}'; return JSON.stringify(x === undefined ? null : x); }
  O.sync.canon = canon;
  /* ---------- Знімок, застосування ---------- */
  function dels() { return lsGet(DEL, {}); }
  function snapshot() {
    return O.pins.all().then(function (pins) {
      var s = JSON.parse(JSON.stringify(O.state)); ['settings', 'rev', 'created', 'aiPopDay', 'remindDay', 'v'].forEach(function (k) { delete s[k]; });
      return { v: 1, dev: C.dev, t: Date.now(), state: s, pins: pins.filter(function (p) { return !p.blob; }), deleted: dels() };
    });
  }
  function apply(merged, pins, del) {
    applying = true;
    var keep = O.state.settings; Object.keys(merged).forEach(function (k) { O.state[k] = merged[k]; }); O.state.settings = keep;
    O.registerWords && O.registerWords(); O.save(); lsSet(DEL, del);
    return O.pins.all().then(function (local) {
      var lm = {}, jobs = []; local.forEach(function (p) { lm[p.id] = p; });
      pins.forEach(function (p) { var l = lm[p.id]; if (!l || (!l.blob && canon(l) !== canon(p))) jobs.push(rawPut(p)); });
      local.forEach(function (l) { if (!l.blob && !pins.some(function (p) { return p.id === l.id; })) jobs.push(rawDel(l.id)); });
      return Promise.all(jobs);
    }).then(function () { applying = false; }, function (e) { applying = false; throw e; });
  }
  var rawPut = null, rawDel = null;

  /* ---------- GitHub ---------- */
  function gh(method, path, body, accept) {
    var h = { authorization: 'Bearer ' + tok(), accept: accept || 'application/vnd.github+json' }; if (body) h['content-type'] = 'application/json';
    return fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, referrerPolicy: 'no-referrer', credentials: 'omit', cache: 'no-store' });
  }
  function err(r) { var e = new Error(r.status === 401 ? 'Токен недійсний або прострочений' : r.status === 403 ? 'Токен без права Contents: Read and write, або ліміт запитів' : r.status === 404 ? 'Репозиторій не знайдено (перевір назву й доступ токена)' : r.status === 409 || r.status === 422 ? 'conflict' : 'GitHub відповів ' + r.status); e.status = r.status; return e; }
  function download() {
    return gh('GET', '/repos/' + C.repo + '/contents/' + PATH).then(function (r) {
      if (r.status === 404) { return null; } if (!r.ok) throw err(r);
      return r.json().then(function (j) {
        if (j.content && j.encoding === 'base64') return { sha: j.sha, text: new TextDecoder().decode(unb64(j.content)) };
        return gh('GET', '/repos/' + C.repo + '/contents/' + PATH, null, 'application/vnd.github.raw+json').then(function (rr) { if (!rr.ok) throw err(rr); return rr.text(); }).then(function (t) { return { sha: j.sha, text: t }; });
      });
    });
  }
  function upload(text, sha) {
    var body = { message: 'sync ' + new Date().toISOString().slice(0, 16), content: b64(new TextEncoder().encode(text)) }; if (sha) body.sha = sha;
    return gh('PUT', '/repos/' + C.repo + '/contents/' + PATH, body).then(function (r) { if (!r.ok) throw err(r); return r.json(); });
  }

  /* ---------- Синхронізація ---------- */
  function run(reason, retry) {
    if (!C.repo) return Promise.resolve({ skipped: 'off' });
    if (!tok()) { emit('locked', 'Потрібен пароль сховища, щоб розблокувати токен синхронізації'); return Promise.resolve({ skipped: 'locked' }); }
    if (busy) return Promise.resolve({ skipped: 'busy' });
    busy = true; emit('busy', 'Синхронізую…'); 
    return download().then(function (rem) {
      return (rem ? ungz(rem.text).then(function (t) { return { sha: rem.sha, data: JSON.parse(t) }; }) : Promise.resolve({ sha: null, data: null })).then(function (r) {
        return snapshot().then(function (loc) {
          var d = r.data, ms = mergeStates(loc.state, d && d.state), del = Object.assign({}, d && d.deleted, loc.deleted); Object.keys(loc.deleted).forEach(function (k) { del[k] = Math.max(loc.deleted[k], (d && d.deleted && d.deleted[k]) || 0); });
          var pins = mergePins(loc.pins, (d && d.pins) || [], del).sort(byId), out = { v: 1, dev: C.dev, t: Date.now(), state: ms, pins: pins, deleted: del }, outJson = JSON.stringify(out);
          var same = d && canon({ state: d.state, pins: (d.pins || []).slice().sort(byId), deleted: d.deleted }) === canon({ state: ms, pins: pins, deleted: del });
          return apply(ms, pins, del).then(function () { return same ? null : gz(outJson).then(function (txt) { return upload(txt, r.sha); }); });
        });
      });
    }).then(function () { busy = false; C.last = Date.now(); lsSet(CFG, C); emit('ok', ''); return { ok: true }; }, function (e) {
      busy = false;
      if (e && e.message === 'conflict' && !retry) return run(reason, true);
      emit('err', (e && e.message) || 'Помилка синхронізації'); return { error: e };
    });
  }
  function schedule() { if (!C.repo || !tok()) return; clearTimeout(timer); timer = setTimeout(function () { run('auto'); }, 45000); }
  function dirty() { if (!applying) schedule(); }

  /* ---------- Підключення, інтерфейс ---------- */
  O.sync.run = run; O.sync.status = function () { return Object.assign({ repo: C.repo || '', last: C.last || 0, hasToken: !!tok(), remembered: !!C.remember }, S); }; O.sync.onChange = function (f) { listeners.push(f); };
  O.sync.connect = function (repo, token, remember, pass) {
    repo = String(repo || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''); token = String(token || '').trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return Promise.reject(new Error('Репозиторій у форматі власник/назва'));
    if (token.length < 20 || /\s/.test(token)) return Promise.reject(new Error('Токен виглядає неправильно'));
    var old = C.repo; C.repo = repo;
    var chain = Promise.resolve(); var K = O.keys;
    if (remember) {
      if (!K.hasVault()) chain = chain.then(function () { return K.createVault(pass); });
      else if (!K.unlocked()) chain = chain.then(function () { return K.unlock(pass); });
    }
    return chain.then(function () { return K.putSecret('github', token, !!remember); }).then(function () { return gh('GET', '/repos/' + repo); }).then(function (r) {
      if (!r.ok) throw err(r); return r.json();
    }).then(function (j) {
      if (j.private !== true) throw new Error('Репозиторій публічний. Дані навчання мають лежати в ПРИВАТНОМУ репозиторії.');
      C.remember = !!remember; lsSet(CFG, C); return run('connect');
    }).then(function (r) { if (r && r.error) throw r.error; return r; }).catch(function (e) { C.repo = old; lsSet(CFG, C); if (!old) K.dropSecret('github'); emit(old ? 'idle' : 'off', ''); throw e; });
  };
  O.sync.disconnect = function () { clearTimeout(timer); C = { dev: C.dev }; lsSet(CFG, C); O.keys && O.keys.dropSecret && O.keys.dropSecret('github'); emit('off', ''); };
  O.sync.render = function (box) {
    function draw() {
      var st = O.sync.status(), ok = !!st.repo;
      box.innerHTML = '<h3>Акаунт і синхронізація</h3><div class="panel">' +
        '<p class="dim small">Щоб на всіх пристроях був той самий контент, підключи свій <b>приватний</b> репозиторій GitHub. Це і є твій акаунт: на кожному пристрої вводиш той самий репозиторій і токен, дані зливаються (нічого не перезаписується). Ключі ШІ не синхронізуються.</p>' +
        (ok ? '<div class="row"><b>' + O.esc(st.repo) + '</b> <span class="tag ' + (st.state === 'ok' || st.state === 'idle' ? 'ok' : st.state === 'err' ? 'warn' : '') + '">' + O.esc({ ok: 'синхронізовано', idle: 'підключено', busy: 'синхронізація…', err: 'помилка', locked: 'заблоковано' }[st.state] || st.state) + '</span></div><div class="dim small">' + (st.last ? 'Остання синхронізація: ' + new Date(st.last).toLocaleString() : 'Ще не синхронізовано') + (st.msg ? ' · ' + O.esc(st.msg) : '') + '</div>' +
          '<div class="row"><button class="btn" id="ssy">⟳ Синхронізувати зараз</button><button class="btn ghost" id="sdc">Відключити</button></div>'
        : '<details><summary>Як налаштувати (5 хвилин, один раз)</summary><ol class="small"><li>github.com/new → створи <b>Private</b> репозиторій, наприклад <code>ord-data</code>.</li><li>GitHub → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate.</li><li>Repository access: <b>Only select repositories</b> → лише <code>ord-data</code>. Permissions → Repository → <b>Contents: Read and write</b>.</li><li>Встав репозиторій і токен нижче. На другому пристрої зроби те саме з тим же репозиторієм і токеном.</li></ol></details>' +
          '<input id="srp" placeholder="власник/назва, напр. vasyl-www/ord-data" autocomplete="off" autocapitalize="none"><input id="stk" type="password" placeholder="токен (github_pat_…)" autocomplete="off" spellcheck="false">' +
          '<label class="small"><input type="checkbox" id="srm"> Пам’ятати на цьому пристрої (зашифровано паролем сховища)</label><input id="spw" type="password" placeholder="пароль сховища (від 8 символів)" autocomplete="off" hidden>' +
          '<div class="row"><button class="btn" id="scn">Підключити й синхронізувати</button></div><div class="dim small" id="smsg"></div>') +
        (ok && st.state === 'locked' ? '<div class="dim small">Розблокуй сховище паролем у смузі зверху сторінки.</div>' : '') +
        '<p class="dim small">Синхронізуються: прогрес карток, журнал, слова, історії, переклади, форум, ігри, піни з текстом (разом з коментарями й реакціями). Власні фото й відео (файли) лишаються на пристрої, де їх додано.</p></div>';
      var $ = function (s) { return box.querySelector(s); };
      if (ok) { $('#ssy').onclick = function () { run('manual').then(draw); }; $('#sdc').onclick = function () { var b = $('#sdc'); if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', 1); b.textContent = 'Точно відключити?'; return; } O.sync.disconnect(); draw(); }; }
      else {
        $('#srm').onchange = function (e) { $('#spw').hidden = !e.target.checked; };
        $('#scn').onclick = function () { var m = $('#smsg'); m.textContent = 'Підключаю…'; O.sync.connect($('#srp').value, $('#stk').value, $('#srm').checked, $('#spw').value).then(function () { O.toast('Підключено й синхронізовано'); draw(); }).catch(function (e) { setTimeout(function () { var mm = box.querySelector('#smsg') || m; mm.textContent = (e && e.message) || 'Не вдалося'; }, 0); }); };
      }
    }
    draw(); O.sync.onChange(function () { if (!box.isConnected) return 'gone'; if (!box.querySelector('input:focus')) draw(); });
  };

  /* ---------- Прив'язка до змін, запуск ---------- */
  var wait = setInterval(function () {
    if (!(O.state && O.pins && O.pins.put && O.save)) return; clearInterval(wait);
    rawPut = O.pins.put; rawDel = O.pins.del;
    var os = O.save; O.save = function () { var r = os.apply(this, arguments); dirty(); return r; };
    O.pins.put = function (p) { dirty(); return rawPut.call(O.pins, p); };
    O.pins.del = function (id) { var d = dels(); d[id] = Date.now(); var ks = Object.keys(d); if (ks.length > 600) ks.sort(function (a, b) { return d[a] - d[b]; }).slice(0, ks.length - 600).forEach(function (k) { delete d[k]; }); lsSet(DEL, d); dirty(); return rawDel.call(O.pins, id); };
    var ku = O.keys.unlock; O.keys.unlock = function () { return ku.apply(O.keys, arguments).then(function (r) { if (C.repo) run('unlock'); return r; }); };
    if (C.repo) { if (tok()) run('start'); else emit('locked', ''); }
    document.addEventListener('visibilitychange', function () { if (!C.repo || !tok()) return; if (document.visibilityState === 'hidden') run('hide'); else if (Date.now() - (C.last || 0) > 60000) run('show'); });
  }, 200);
})();
