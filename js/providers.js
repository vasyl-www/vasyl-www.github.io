/* ШІ-провайдери (Claude, GPT, Gemini, DeepSeek, OpenRouter): сховище ключів під паролем, виклики з браузера, вибір провайдера.
   Ключі НІКОЛИ не потрапляють у O.state, у хмарну синхронізацію, у експорт чи спільний контент. Зберігаються лише:
   - зашифровано паролем (AES-GCM, ключ з пароля через PBKDF2) у localStorage, або
   - у sessionStorage до закриття вкладки. Відкритого тексту на диску немає. */
(function () {
  var O = window.ORD, LSV = 'ord.vault.v1', LSC = 'ord.provcfg.v1', SS = 'ord.sessionkeys.v1', ITER = 310000;
  var PROV = {
    anthropic: { name: 'Claude (Anthropic)', kind: 'anthropic', url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5-5', free: false, where: 'console.anthropic.com → API Keys' },
    openai: { name: 'GPT (OpenAI)', kind: 'openai', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5-mini', free: false, where: 'platform.openai.com → API keys', tokens: 'max_completion_tokens' },
    gemini: { name: 'Gemini (Google)', kind: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/', model: 'gemini-flash-latest', free: true, where: 'aistudio.google.com/apikey (є безкоштовний рівень з лімітами)' },
    deepseek: { name: 'DeepSeek', kind: 'openai', url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', free: true, where: 'platform.deepseek.com' },
    openrouter: { name: 'OpenRouter', kind: 'openai', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free', free: true, where: 'openrouter.ai/keys (є безкоштовні моделі з суфіксом :free)' }
  };
  O.PROV = PROV; O.PROV_IDS = Object.keys(PROV);
  var enc = new TextEncoder(), dec = new TextDecoder();
  function b64(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function ss(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  /* ---- Пам'ять сесії: розшифровані ключі живуть лише тут ---- */
  var LSD = 'ord.vault.dev.v1', dkey = null;   // dkey: непридатний до експорту ключ пристрою (IndexedDB) для входу без пароля
  var mem = {}, vault = null, vkey = null;           // vault: {salt,iv,ct}; vkey: CryptoKey після розблокування
  try { var sk = JSON.parse(ss(SS) || 'null'); if (sk && typeof sk === 'object') mem = sk; } catch (e) { mem = {}; }
  function cfg() { try { return JSON.parse(ls(LSC) || '{}') || {}; } catch (e) { return {}; } }
  function saveCfg(c) { lsSet(LSC, JSON.stringify(c)); }
  function readVault() { try { vault = JSON.parse(ls(LSV) || 'null'); } catch (e) { vault = null; } }
  readVault();
  function derive(pass, salt) {
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function devDb() { return new Promise(function (res, rej) { var r = indexedDB.open('ord-dev', 1); r.onupgradeneeded = function () { r.result.createObjectStore('k'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function devGet() { return devDb().then(function (db) { return new Promise(function (res) { var q = db.transaction('k').objectStore('k').get('dev'); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; }); }
  function devPut(k) { return devDb().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction('k', 'readwrite'); t.objectStore('k').put(k, 'dev'); t.oncomplete = res; t.onerror = function () { rej(t.error); }; }); }); }
  function devDrop() { dkey = null; try { localStorage.removeItem(LSD); } catch (e) { /* ignore */ } return devDb().then(function (db) { return new Promise(function (res) { var t = db.transaction('k', 'readwrite'); t.objectStore('k').delete('dev'); t.oncomplete = res; t.onerror = res; }); }).catch(function () {}); }
  function seal() {            // шифрує усі ключі з mem, які мають прапор persist: паролем (якщо відомий) і/або ключем пристрою
    var out = {}; Object.keys(mem).forEach(function (p) { if (mem[p] && mem[p].persist) out[p] = mem[p].key; });
    var data = enc.encode(JSON.stringify(out)), jobs = [];
    if (vkey) { var iv = crypto.getRandomValues(new Uint8Array(12)); jobs.push(crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, vkey, data).then(function (ct) { vault = { v: 1, iter: ITER, salt: vault.salt, iv: b64(iv), ct: b64(ct) }; lsSet(LSV, JSON.stringify(vault)); })); }
    if (dkey) { var iv2 = crypto.getRandomValues(new Uint8Array(12)); jobs.push(crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv2 }, dkey, data).then(function (ct) { lsSet(LSD, JSON.stringify({ iv: b64(iv2), ct: b64(ct) })); if (!vault) { vault = { v: 1, dev: true, salt: '', iv: '', ct: '' }; } if (vault.dev) lsSet(LSV, JSON.stringify(vault)); })); }
    return Promise.all(jobs);
  }
  function loadDev() {         // автовідмикання: ключ пристрою + його шифртекст
    var raw = ls(LSD); if (!vault || !raw) return Promise.resolve();
    return devGet().then(function (k) {
      if (!k) return; var o = JSON.parse(raw);
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, k, unb64(o.ct)).then(function (pt) {
        var d = JSON.parse(dec.decode(pt)); dkey = k; Object.keys(d).forEach(function (p) { if (PROV[p] || p.indexOf('x:') === 0) mem[p] = { key: d[p], persist: true }; });
      });
    }).catch(function () { /* без автовідмикання: просто спитаємо пароль */ });
  }
  function saveSession() { try { var o = {}; Object.keys(mem).forEach(function (p) { if (mem[p] && !mem[p].persist) o[p] = mem[p]; }); sessionStorage.setItem(SS, JSON.stringify(o)); } catch (e) { /* ignore */ } }

  var K = O.keys = {
    hasVault: function () { return !!vault; },
    unlocked: function () { return !vault || !!vkey || !!dkey; },
    device: function () { return !!dkey; },
    passwordless: function () { return !!(vault && vault.dev); },
    has: function (p) { return !!(mem[p] && mem[p].key); },
    stored: function (p) { return !!cfg()[p] && (cfg()[p].has === true); },
    cfg: function (p) { var c = cfg()[p] || {}; return { model: c.model || PROV[p].model, free: c.free == null ? PROV[p].free : !!c.free, has: !!c.has }; },
    available: function () { return O.PROV_IDS.filter(function (p) { return K.has(p); }); },
    /* Створює сховище (перший ключ із паролем) */
    createVault: function (pass) {
      if (String(pass).length < 8) return Promise.reject(new Error('Пароль має бути не коротший за 8 символів'));
      var salt = crypto.getRandomValues(new Uint8Array(16));
      return derive(pass, salt).then(function (k) { vkey = k; vault = { v: 1, iter: ITER, salt: b64(salt), iv: '', ct: '' }; return seal(); });
    },
    /* Сховище без пароля: ключі шифруються ключем цього пристрою (його не можна експортувати з браузера) */
    createDeviceVault: function () {
      if (vault) return Promise.resolve();
      return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (k) { return devPut(k).then(function () { dkey = k; vault = { v: 1, dev: true, salt: '', iv: '', ct: '' }; return seal(); }); });
    },
    /* Не питати пароль на цьому пристрої (потрібне розблоковане сховище) */
    deviceOn: function () {
      if (!vault || !(vkey || dkey)) return Promise.reject(new Error('Спершу розблокуй сховище'));
      if (dkey) return Promise.resolve();
      return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (k) { return devPut(k).then(function () { dkey = k; return seal(); }); });
    },
    deviceOff: function () { return devDrop(); },
    unlock: function (pass) {
      if (!vault) return Promise.resolve();
      if (vault.dev) return Promise.reject(new Error('Це сховище без пароля: воно відкривається автоматично на цьому пристрої'));
      return derive(pass, unb64(vault.salt)).then(function (k) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv) }, k, unb64(vault.ct)).then(function (pt) {
          var o = JSON.parse(dec.decode(pt)); vkey = k; Object.keys(o).forEach(function (p) { if (PROV[p] || p.indexOf('x:') === 0) mem[p] = { key: o[p], persist: true }; });
          return K.deviceOn();
        });
      }).catch(function () { throw new Error('Невірний пароль'); });
    },
    lock: function () { vkey = null; devDrop(); Object.keys(mem).forEach(function (p) { if (mem[p] && mem[p].persist) delete mem[p]; }); },
    /* persist=true: у сховищі під паролем (треба розблоковане сховище); false: лише до закриття вкладки */
    set: function (p, key, o) {
      o = o || {}; key = String(key || '').trim(); if (!PROV[p] || key.length < 8) return Promise.reject(new Error('Ключ закороткий'));
      if (o.persist && !vault) return K.createDeviceVault().then(function () { return K.set(p, key, o); });
      if (/\s/.test(key)) return Promise.reject(new Error('У ключі не має бути пробілів'));
      var c = cfg(); c[p] = { model: String(o.model || PROV[p].model).trim().slice(0, 80), free: !!o.free, has: true, persist: !!o.persist }; saveCfg(c);
      mem[p] = { key: key, persist: !!o.persist };
      if (o.persist) { if (!vkey && !dkey) return Promise.reject(new Error('Спершу створи сховище або розблокуй його')); return seal().then(saveSession); }
      saveSession(); return vault && (vkey || dkey) ? seal() : Promise.resolve();
    },
    /* Додаткові секрети (напр. токен синхронізації 'github'): ті самі правила, що й для ключів ШІ, але не беруть участі у виборі ШІ-провайдера */
    putSecret: function (n, v, persist) {
      if (persist && !vault) return K.createDeviceVault().then(function () { return K.putSecret(n, v, persist); });
      mem['x:' + n] = { key: String(v), persist: !!persist };
      if (persist) { if (!vkey && !dkey) { delete mem['x:' + n]; return Promise.reject(new Error('Спершу створи сховище або розблокуй його')); } return seal().then(saveSession); }
      saveSession(); return vault && (vkey || dkey) ? seal() : Promise.resolve();
    },
    getSecret: function (n) { return mem['x:' + n] ? mem['x:' + n].key : ''; },
    hasSecret: function (n) { return !!(mem['x:' + n] && mem['x:' + n].key); },
    dropSecret: function (n) { delete mem['x:' + n]; saveSession(); return vault && (vkey || dkey) ? seal() : Promise.resolve(); },
    setMeta: function (p, o) { var c = cfg(); c[p] = Object.assign({}, c[p] || {}, { model: String(o.model || PROV[p].model).trim().slice(0, 80), free: !!o.free }); saveCfg(c); },
    remove: function (p) { delete mem[p]; var c = cfg(); delete c[p]; saveCfg(c); saveSession(); return vault && (vkey || dkey) ? seal() : Promise.resolve(); },
    wipe: function () { mem = {}; vkey = null; vault = null; devDrop(); try { localStorage.removeItem(LSV); localStorage.removeItem(LSC); sessionStorage.removeItem(SS); } catch (e) { /* ignore */ } }
  };
  K.ready = loadDev().then(function () { if (O.mountLockBar) O.mountLockBar(); });

  /* ---- Виклики ---- */
  function fail(code, detail, msg) { var e = new Error(code); e.code = code; e.detail = detail; if (msg) e.msg = msg; return e; }
  function httpErr(status, msg, retryAfter) {
    var m = String(msg || ''), modelBad = (status === 400 || status === 404) && /model|not found|deprecat|unsupported|does not exist|no longer/i.test(m);
    var e = fail(status === 401 || status === 403 ? 'auth' : status === 429 ? 'rate' : modelBad ? 'model' : status === 400 || status === 404 ? 'bad' : 'upstream', status, m.slice(0, 200)); if (retryAfter) e.retryAfter = retryAfter; return e;
  }
  function readMsg(r) {
    return r.text().then(function (t) { try { var j = JSON.parse(t), x = j.error || j; return typeof x === 'string' ? x : (x.message || x.error || (j.message) || t.slice(0, 160)); } catch (e) { return t.slice(0, 160); } }, function () { return ''; });
  }
  function post(url, headers, body, tries) {
    tries = tries == null ? 1 : tries;
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(function () { ctl && ctl.abort(); }, 70000);
    function again(err) { if (tries > 0 && (err.code === 'network' || (err.code === 'upstream' && err.detail >= 500))) return new Promise(function (res) { setTimeout(res, 900); }).then(function () { return post(url, headers, body, tries - 1); }); throw err; }
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, referrerPolicy: 'no-referrer', credentials: 'omit' })
      .then(function (r) { clearTimeout(t); if (!r.ok) { var ra = parseInt(r.headers.get('retry-after'), 10) || 0; return readMsg(r).then(function (m) { throw httpErr(r.status, m, ra); }); } return r.json(); },
        function () { clearTimeout(t); throw fail('network'); }).catch(again);
  }
  /* Запасні моделі: якщо збережена модель застаріла, пробуємо наступну (збережене в налаштуваннях не змінюємо) */
  var FALLBACK = { anthropic: ['claude-sonnet-5-5', 'claude-haiku-5-5'], openai: ['gpt-5-mini', 'gpt-4.1-mini'], gemini: ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'], deepseek: ['deepseek-chat'], openrouter: [] };
  /* Gemini: Google знімає моделі з доступу (2.0 і 2.5 уже відповідають 404), тому актуальну модель беремо зі списку, який повертає сам ключ */
  var disc = {};   // провайдер → модель, що спрацювала або знайдена в списку
  var DEAD = /^gemini-(1\.|2\.0|2\.5-(flash|pro)$)/;
  function rankModels(names) {
    var ok = names.map(function (n) { return n.replace(/^models\//, ''); }).filter(function (n) { return /^gemini-/.test(n) && !/(image|tts|live|embed|audio|robotics|computer|vision|learnlm|aqa|-exp|thinking|customtools|deep-research|nano|banana)/i.test(n) && !DEAD.test(n); });
    function ver(n) { var m = /gemini-(\d+)(?:\.(\d+))?/.exec(n); return m ? +m[1] * 100 + (+m[2] || 0) : 0; }
    function score(n) { var lite = /lite/.test(n), flash = /flash/.test(n), pre = /preview/.test(n), latest = /latest/.test(n); return (flash ? 1000 : 0) - (lite ? 300 : 0) - (pre ? 150 : 0) + (latest ? 20 : 0) + ver(n); }
    return ok.sort(function (a, b) { return score(b) - score(a); });
  }
  function discover(id) {
    var p = PROV[id];
    return fetch(p.url.replace(/models\/$/, 'models') + '?pageSize=200', { headers: { 'x-goog-api-key': mem[id].key }, referrerPolicy: 'no-referrer', credentials: 'omit' }).then(function (r) {
      if (!r.ok) return readMsg(r).then(function (m) { throw httpErr(r.status, m); });
      return r.json();
    }, function () { throw fail('network'); }).then(function (j) {
      return rankModels((j.models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name; }));
    });
  }
  /* Одна спроба на провайдера: збережена модель → запасні → (Gemini) модель зі списку ключа. Успішну модель запам'ятовуємо й записуємо в налаштування. */
  function runProv(id, system, msgs, max) {
    var p = PROV[id], c = K.cfg(id), tried = {}, t0 = Date.now();
    var base = (disc[id] ? [disc[id]] : []).concat([c.model], FALLBACK[id] || []).filter(function (m, k, a) { return m && a.indexOf(m) === k; });
    if (id === 'gemini') base = base.filter(function (m) { return !DEAD.test(m); }).concat(base.filter(function (m) { return DEAD.test(m); }));
    function go(models, j, canDisc) {
      if (j >= models.length) return Promise.reject(fail('model', 404, 'жодна з відомих моделей не відповіла'));
      var model = models[j]; tried[model] = 1;
      return A[p.kind](p, mem[id].key, model, system, msgs, max).then(function (text) {
        if (!text) throw fail('empty');
        if (id === 'gemini') { disc[id] = model; if (model !== c.model) { try { K.setMeta(id, { model: model, free: c.free }); } catch (e) { /* ignore */ } } }
        O.aiLast = { provider: id, model: model, ms: Date.now() - t0, ok: true, t: Date.now() };
        return { text: text, model: model };
      }, function (e) {
        if (e && e.code === 'model') {
          if (j + 1 < models.length) return go(models, j + 1, canDisc);
          if (id === 'gemini' && canDisc) return discover(id).then(function (list) { list = list.filter(function (m) { return !tried[m]; }).slice(0, 4); return list.length ? go(list, 0, false) : Promise.reject(e); }, function () { throw e; });
        }
        throw e;
      });
    }
    return go(base, 0, true);
  }
  var cool = {};   // провайдер → до коли пропускати після ліміту
  O.aiLast = null;
  var A = {
    anthropic: function (p, key, model, system, msgs, max) {
      return post(p.url, { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, { model: model, max_tokens: max, system: system, messages: msgs })
        .then(function (j) { return (j.content || []).map(function (c) { return c.text || ''; }).join(''); });
    },
    openai: function (p, key, model, system, msgs, max) {
      var b = { model: model, messages: [{ role: 'system', content: system }].concat(msgs) }; b[p.tokens || 'max_tokens'] = p.tokens ? max * 3 : max; if (/openrouter/.test(p.url)) b.max_tokens = max + 1500; /* моделі з «міркуванням» (ERNIE, DeepSeek…) витрачають частину ліміту на думки, інакше content порожній */
      return post(p.url, { 'content-type': 'application/json', authorization: 'Bearer ' + key }, b).then(function (j) { var m = j.choices && j.choices[0] && j.choices[0].message; return (m && m.content) || ''; });
    },
    gemini: function (p, key, model, system, msgs, max) {
      var b = { systemInstruction: { parts: [{ text: system }] }, contents: msgs.map(function (m) { return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }; }), generationConfig: { maxOutputTokens: max * 3 } };
      return post(p.url + encodeURIComponent(model) + ':generateContent', { 'content-type': 'application/json', 'x-goog-api-key': key }, b)
        .then(function (j) { var c = j.candidates && j.candidates[0]; return ((c && c.content && c.content.parts) || []).map(function (x) { return x.text || ''; }).join(''); });
    }
  };
  function chain() {
    var pref = O.state && O.state.settings.aiPref || 'auto', ids = K.available();
    if (pref !== 'auto' && ids.indexOf(pref) >= 0) return [pref];
    return ids.sort(function (a, b) { return (K.cfg(a).free ? 1 : 0) - (K.cfg(b).free ? 1 : 0); });   // спершу платні, потім безкоштовні
  }
  /* Повертає {text, gen:{provider,model,tier}}. У режимі auto при збої йде до наступного ключа. */
  O.aiG = function (system, messages, max) {
    var ids = chain(); if (!ids.length) return Promise.reject(fail(K.hasVault() && !K.unlocked() ? 'locked' : 'no_key'));
    var now = Date.now(), live = ids.filter(function (p) { return !(cool[p] && cool[p] > now); }); if (live.length) ids = live;   // після ліміту провайдера на час пропускаємо, якщо є інші
    var msgs = messages.map(function (m) { return { role: m.role, content: String(m.content) }; }), last = null, i = 0;
    function next() {
      if (i >= ids.length) return Promise.reject(last || fail('upstream'));
      var id = ids[i++], c = K.cfg(id);
      return runProv(id, system, msgs, max || 1000).then(function (r) { return { text: r.text, gen: { provider: id, model: r.model, tier: c.free ? 'free' : 'paid' } }; }).catch(function (e) {
        last = e; if (e && e.code) { e.provider = id; }
        if (e && e.code === 'rate') cool[id] = Date.now() + (e.retryAfter ? Math.min(300, e.retryAfter) : 60) * 1000;
        O.aiLast = { provider: id, model: c.model, ok: false, code: e && e.code, status: e && e.detail, msg: e && e.msg, t: Date.now() };
        return next();
      });
    }
    return next();
  };
  O.ai = function (s, m, x) { return O.aiG(s, m, x).then(function (r) { return r.text; }); };
  function parseJson(t) {
    var a = t.indexOf('{'), b = t.lastIndexOf('}'), a2 = t.indexOf('['), b2 = t.lastIndexOf(']');
    if (a2 >= 0 && (a < 0 || a2 < a)) { a = a2; b = b2; } if (a < 0 || b <= a) throw fail('empty'); return JSON.parse(t.slice(a, b + 1));
  }
  O.aiJsonG = function (s, m, x) { return O.aiG(s, m, x).then(function (r) { return { json: parseJson(r.text), gen: r.gen }; }); };
  O.aiJson = function (s, m, x) { return O.aiJsonG(s, m, x).then(function (r) { return r.json; }); };
  /* Прямий доступ до Gemini для не-текстових задач (озвучення): той самий ключ, ті самі помилки */
  var gemNames = null;
  O.gem = {
    has: function () { return K.has('gemini'); },
    gen: function (model, body) { return post(PROV.gemini.url + encodeURIComponent(model) + ':generateContent', { 'content-type': 'application/json', 'x-goog-api-key': mem.gemini.key }, body); },
    models: function () {
      if (gemNames) return Promise.resolve(gemNames);
      return fetch(PROV.gemini.url.replace(/models\/$/, 'models') + '?pageSize=200', { headers: { 'x-goog-api-key': mem.gemini.key }, referrerPolicy: 'no-referrer', credentials: 'omit' })
        .then(function (r) { if (!r.ok) return readMsg(r).then(function (m) { throw httpErr(r.status, m); }); return r.json(); }, function () { throw fail('network'); })
        .then(function (j) { return (gemNames = (j.models || []).map(function (m) { return m.name.replace(/^models\//, ''); })); });
    }
  };
  O.aiStatus = function () { var ids = chain(); return Promise.resolve({ ok: true, ai: ids.length > 0, providers: ids }); };
  O.aiError = function (e) {
    var c = e && e.code, who = e && e.provider ? ' (' + PROV[e.provider].name + ')' : '';
    if (c === 'no_key') return 'Немає ключа ШІ. Додай його в Профіль → Налаштування → Ключі ШІ. Без ключа працюють історії, картки, практика й вкладка «Спільнота».';
    if (c === 'locked') return 'Ключі заблоковані. Введи пароль у смузі зверху або в Налаштуваннях.';
    if (c === 'auth') return 'Ключ не прийнято' + who + '. Перевір його й права в кабінеті провайдера.';
    if (c === 'rate') return 'Ліміт запитів вичерпано' + who + (e.msg ? ' («' + e.msg + '»)' : '') + '. Зачекай хвилину або додай інший ключ.';
    if (c === 'model') return 'Модель не знайдена' + who + ' (код ' + (e.detail || '?') + '): ' + (e.msg || '') + '. Змінила її в Налаштуваннях або залиш порожньою назву за замовчуванням.';
    if (c === 'bad') return 'Провайдер відхилив запит' + who + ' (код ' + (e.detail || '?') + '). Найчастіше назва моделі застаріла: змін її в Налаштуваннях.';
    if (c === 'network') return 'Немає зв’язку з провайдером' + who + ' (мережа або CORS).';
    if (c === 'empty') return 'ШІ повернув порожню чи нерозбірливу відповідь. Спробуй ще раз.';
    return 'ШІ недоступний' + who + (e && e.detail ? ' (код ' + e.detail + ')' : '') + (e && e.msg ? ': ' + e.msg : '') + '.';
  };
  /* Підпис: хто згенерував */
  O.genLabel = function (g) { if (!g || !g.provider) return ''; var n = PROV[g.provider] ? PROV[g.provider].name.replace(/ \(.*\)/, '') : g.provider; return n + ' · ' + (g.model || '?') + (g.tier === 'free' ? ' · безкоштовний' : '') + (g.builtin ? ' · вбудовано' : ''); };
  O.cleanGen = function (g) { if (!g || !PROV[g.provider]) return null; return { provider: g.provider, model: String(g.model || '').slice(0, 80), tier: g.tier === 'free' ? 'free' : 'paid', builtin: !!g.builtin }; };
  O.aiDiag = function () {   // перевірка всіх ключів по черзі: {id, ok, ms, code, status, msg, model}
    var out = [], ids = K.available(); return ids.reduce(function (pr, id) {
      return pr.then(function () { var t0 = Date.now(); return O.testKey(id).then(function () { out.push({ id: id, ok: true, ms: Date.now() - t0, model: K.cfg(id).model }); }, function (e) { out.push({ id: id, ok: false, ms: Date.now() - t0, code: e && e.code, status: e && e.detail, msg: e && e.msg, model: K.cfg(id).model }); }); });
    }, Promise.resolve()).then(function () { return out; });
  };
  O.testKey = function (p) {   // дешевий запит для перевірки ключа (з тими ж запасними моделями, що й у роботі)
    var id = p; if (!K.has(id)) return Promise.reject(fail('no_key'));
    return runProv(id, 'Відповідай одним словом.', [{ role: 'user', content: 'Скажи: ok' }], 20).then(function (r) { return true; }).catch(function (e) { e.provider = id; throw e; });
  };
})();
