/* ШІ-провайдери (Claude, GPT, Gemini, DeepSeek, OpenRouter): сховище ключів під паролем, виклики з браузера, вибір провайдера.
   Ключі НІКОЛИ не потрапляють у O.state, у хмарну синхронізацію, у експорт чи спільний контент. Зберігаються лише:
   - зашифровано паролем (AES-GCM, ключ з пароля через PBKDF2) у localStorage, або
   - у sessionStorage до закриття вкладки. Відкритого тексту на диску немає. */
(function () {
  var O = window.ORD, LSV = 'ord.vault.v1', LSC = 'ord.provcfg.v1', SS = 'ord.sessionkeys.v1', ITER = 310000;
  var PROV = {
    anthropic: { name: 'Claude (Anthropic)', kind: 'anthropic', url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-5-5', free: false, where: 'console.anthropic.com → API Keys' },
    openai: { name: 'GPT (OpenAI)', kind: 'openai', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5-mini', free: false, where: 'platform.openai.com → API keys', tokens: 'max_completion_tokens' },
    gemini: { name: 'Gemini (Google)', kind: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/', model: 'gemini-2.5-flash', free: true, where: 'aistudio.google.com/apikey (є безкоштовний рівень з лімітами)' },
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
  function seal() {            // шифрує усі ключі з mem, які мають прапор persist
    var out = {}; Object.keys(mem).forEach(function (p) { if (mem[p] && mem[p].persist) out[p] = mem[p].key; });
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, vkey, enc.encode(JSON.stringify(out))).then(function (ct) {
      vault = { v: 1, iter: ITER, salt: vault.salt, iv: b64(iv), ct: b64(ct) }; lsSet(LSV, JSON.stringify(vault));
    });
  }
  function saveSession() { try { var o = {}; Object.keys(mem).forEach(function (p) { if (mem[p] && !mem[p].persist) o[p] = mem[p]; }); sessionStorage.setItem(SS, JSON.stringify(o)); } catch (e) { /* ignore */ } }

  var K = O.keys = {
    hasVault: function () { return !!vault; },
    unlocked: function () { return !vault || !!vkey; },
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
    unlock: function (pass) {
      if (!vault) return Promise.resolve();
      return derive(pass, unb64(vault.salt)).then(function (k) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv) }, k, unb64(vault.ct)).then(function (pt) {
          var o = JSON.parse(dec.decode(pt)); vkey = k; Object.keys(o).forEach(function (p) { if (PROV[p]) mem[p] = { key: o[p], persist: true }; });
        });
      }).catch(function () { throw new Error('Невірний пароль'); });
    },
    lock: function () { vkey = null; Object.keys(mem).forEach(function (p) { if (mem[p] && mem[p].persist) delete mem[p]; }); },
    /* persist=true: у сховищі під паролем (треба розблоковане сховище); false: лише до закриття вкладки */
    set: function (p, key, o) {
      o = o || {}; key = String(key || '').trim(); if (!PROV[p] || key.length < 8) return Promise.reject(new Error('Ключ закороткий'));
      if (/\s/.test(key)) return Promise.reject(new Error('У ключі не має бути пробілів'));
      var c = cfg(); c[p] = { model: String(o.model || PROV[p].model).trim().slice(0, 80), free: !!o.free, has: true, persist: !!o.persist }; saveCfg(c);
      mem[p] = { key: key, persist: !!o.persist };
      if (o.persist) { if (!vkey) return Promise.reject(new Error('Спершу створи пароль або розблокуй сховище')); return seal().then(saveSession); }
      saveSession(); return vault && vkey ? seal() : Promise.resolve();
    },
    setMeta: function (p, o) { var c = cfg(); c[p] = Object.assign({}, c[p] || {}, { model: String(o.model || PROV[p].model).trim().slice(0, 80), free: !!o.free }); saveCfg(c); },
    remove: function (p) { delete mem[p]; var c = cfg(); delete c[p]; saveCfg(c); saveSession(); return vault && vkey ? seal() : Promise.resolve(); },
    wipe: function () { mem = {}; vkey = null; vault = null; try { localStorage.removeItem(LSV); localStorage.removeItem(LSC); sessionStorage.removeItem(SS); } catch (e) { /* ignore */ } }
  };

  /* ---- Виклики ---- */
  function fail(code, detail) { var e = new Error(code); e.code = code; e.detail = detail; return e; }
  function httpErr(status) { return fail(status === 401 || status === 403 ? 'auth' : status === 429 ? 'rate' : status === 400 || status === 404 ? 'bad' : 'upstream', status); }
  function post(url, headers, body) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(function () { ctl && ctl.abort(); }, 70000);
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined, referrerPolicy: 'no-referrer', credentials: 'omit' })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw httpErr(r.status); return r.json(); }, function () { clearTimeout(t); throw fail('network'); });
  }
  var A = {
    anthropic: function (p, key, model, system, msgs, max) {
      return post(p.url, { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, { model: model, max_tokens: max, system: system, messages: msgs })
        .then(function (j) { return (j.content || []).map(function (c) { return c.text || ''; }).join(''); });
    },
    openai: function (p, key, model, system, msgs, max) {
      var b = { model: model, messages: [{ role: 'system', content: system }].concat(msgs) }; b[p.tokens || 'max_tokens'] = p.tokens ? max * 3 : max;
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
    var msgs = messages.map(function (m) { return { role: m.role, content: String(m.content) }; }), last = null, i = 0;
    function next() {
      if (i >= ids.length) return Promise.reject(last || fail('upstream'));
      var id = ids[i++], c = K.cfg(id), p = PROV[id];
      return A[p.kind](p, mem[id].key, c.model, system, msgs, max || 1000).then(function (text) {
        if (!text) throw fail('empty'); return { text: text, gen: { provider: id, model: c.model, tier: c.free ? 'free' : 'paid' } };
      }).catch(function (e) { last = e; if (e && e.code) { e.provider = id; } return next(); });
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
  O.aiStatus = function () { var ids = chain(); return Promise.resolve({ ok: true, ai: ids.length > 0, providers: ids }); };
  O.aiError = function (e) {
    var c = e && e.code, who = e && e.provider ? ' (' + PROV[e.provider].name + ')' : '';
    if (c === 'no_key') return 'Немає ключа ШІ. Додай його в Профіль → Налаштування → Ключі ШІ. Без ключа працюють історії, картки, практика й вкладка «Спільнота».';
    if (c === 'locked') return 'Ключі заблоковані. Введи пароль у смузі зверху або в Налаштуваннях.';
    if (c === 'auth') return 'Ключ не прийнято' + who + '. Перевір його й права в кабінеті провайдера.';
    if (c === 'rate') return 'Ліміт запитів вичерпано' + who + '. Спробуй пізніше або додай інший ключ.';
    if (c === 'bad') return 'Провайдер відхилив запит' + who + ' (код ' + (e.detail || '?') + '). Найчастіше назва моделі застаріла: змін її в Налаштуваннях.';
    if (c === 'network') return 'Немає зв’язку з провайдером' + who + ' (мережа або CORS).';
    if (c === 'empty') return 'ШІ повернув порожню чи нерозбірливу відповідь. Спробуй ще раз.';
    return 'ШІ недоступний' + who + (e && e.detail ? ' (код ' + e.detail + ')' : '') + '.';
  };
  /* Підпис: хто згенерував */
  O.genLabel = function (g) { if (!g || !g.provider) return ''; var n = PROV[g.provider] ? PROV[g.provider].name.replace(/ \(.*\)/, '') : g.provider; return n + ' · ' + (g.model || '?') + (g.tier === 'free' ? ' · безкоштовний' : '') + (g.builtin ? ' · вбудовано' : ''); };
  O.cleanGen = function (g) { if (!g || !PROV[g.provider]) return null; return { provider: g.provider, model: String(g.model || '').slice(0, 80), tier: g.tier === 'free' ? 'free' : 'paid', builtin: !!g.builtin }; };
  O.testKey = function (p) {   // дешевий запит для перевірки ключа
    var id = p, c = K.cfg(id), pr = PROV[id]; if (!K.has(id)) return Promise.reject(fail('no_key'));
    return A[pr.kind](pr, mem[id].key, c.model, 'Відповідай одним словом.', [{ role: 'user', content: 'Скажи: ok' }], 20).then(function (t) { if (!t) throw fail('empty'); return true; }).catch(function (e) { e.provider = id; throw e; });
  };
})();
