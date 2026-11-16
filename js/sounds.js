/* «Звуки»: довжина голосного, читання сполучень, особливі літери, тони (чесно про межі синтезатора).
   Усі приклади й пояснення власні; правила стандартної вимови букмолу. Діалекти відрізняються. */
(function () {
  var O = window.ORD;
  /* [слово, l|s, чому] */
  var LEN = [
    ['tak', 'l', 'після a один приголосний (k)'], ['takk', 's', 'після a два k'], ['mat', 'l', 'один t'], ['matt', 's', 'подвійне tt'], ['fin', 'l', 'один n'], ['finn', 's', 'подвійне nn'],
    ['pen', 'l', 'один n'], ['penn', 's', 'подвійне nn'], ['hel', 'l', 'один l'], ['hell', 's', 'подвійне ll'], ['bil', 'l', 'один l'], ['bok', 'l', 'один k'], ['sol', 'l', 'один l'], ['mor', 'l', 'один r'],
    ['stor', 'l', 'один r'], ['dag', 'l', 'один g'], ['tur', 'l', 'один r'], ['lys', 'l', 'один s'], ['snø', 'l', 'жодного приголосного після голосного'], ['brød', 'l', 'один d'], ['kjøpe', 'l', 'після ø один p'],
    ['lage', 'l', 'після a один g'], ['sove', 'l', 'після o один v'], ['lese', 'l', 'після e один s'], ['hus', 'l', 'один s'],
    ['ikke', 's', 'подвійне kk'], ['kopp', 's', 'подвійне pp'], ['full', 's', 'подвійне ll'], ['vann', 's', 'подвійне nn'], ['mann', 's', 'подвійне nn'], ['natt', 's', 'подвійне tt'], ['hatt', 's', 'подвійне tt'],
    ['hund', 's', 'група nd: два приголосних'], ['lett', 's', 'подвійне tt'], ['kaffe', 's', 'подвійне ff'], ['sykkel', 's', 'подвійне kk'], ['gutt', 's', 'подвійне tt'], ['mellom', 's', 'подвійне ll'], ['komme', 's', 'подвійне mm'],
    ['tykk', 's', 'подвійне kk'], ['ball', 's', 'подвійне ll'], ['brann', 's', 'подвійне nn'], ['fått', 's', 'подвійне tt']
  ];
  /* [слово, відповідь, чому]; відповіді: sh, ch, j, sk */
  var RD = [
    ['kjøre', 'ch', 'kj → м’яке «хь» [ç]'], ['kjole', 'ch', 'kj → [ç]'], ['kino', 'ch', 'k перед i → [ç]'], ['kirke', 'ch', 'k перед i → [ç]'], ['tjue', 'ch', 'tj → [ç]'], ['kyss', 'ch', 'k перед y → [ç]'],
    ['sjø', 'sh', 'sj → «ш» [ʃ]'], ['skjorte', 'sh', 'skj → «ш»'], ['ski', 'sh', 'sk перед i → «ш»'], ['sjokolade', 'sh', 'sj → «ш»'], ['skinn', 'sh', 'sk перед i → «ш»'], ['skje', 'sh', 'skj → «ш»'],
    ['hjem', 'j', 'hj → «й», h мовчить'], ['hjelp', 'j', 'hj → «й»'], ['gjerne', 'j', 'gj → «й»'], ['gjøre', 'j', 'gj → «й»'], ['hjul', 'j', 'hj → «й»'], ['gjest', 'j', 'gj → «й»'],
    ['skole', 'sk', 'sk перед o → «ск»'], ['skap', 'sk', 'sk перед a → «ск»'], ['skrive', 'sk', 'sk перед r → «ск»'], ['skatt', 'sk', 'sk перед a → «ск»']
  ];
  var OPT = { sh: '«ш»', ch: 'м’яке «хь»', j: '«й»', sk: '«ск»' };
  var NEWPAIRS = [['hat', 'ненависть', 'hatt', 'капелюх'], ['pil', 'стріла', 'pill', 'пігулка'], ['vil', 'хоче', 'vill', 'дикий'], ['lat', 'лінивий', 'latt', 'дозволено (la)']];
  NEWPAIRS.forEach(function (p) { if (O.pairs && !O.pairs.some(function (x) { return x.a === p[0]; })) O.pairs.push({ a: p[0], aUk: p[1], b: p[2], bUk: p[3] }); });
  function say(w) { return '<button class="btn ghost sm" data-say="' + O.esc(w) + '" aria-label="Озвучити ' + O.esc(w) + '">🔊 ' + O.esc(w) + '</button>'; }
  function wire(el) { O.$$('[data-say]', el).forEach(function (b) { b.onclick = function () { O.speak(b.getAttribute('data-say')); }; }); }
  function quiz(box, title, items, opts, ev) {
    var qs = O.shuffle(items).slice(0, 10), i = 0, good = 0;
    function next() {
      if (i >= qs.length) {
        box.innerHTML = '<h3>' + title + '</h3><div class="stage center"><div class="big">' + good + ' / ' + qs.length + '</div><p class="dim">Стабільні 9–10 — і правило засвоєне.</p><div class="row"><button class="btn" id="qa">Ще раз</button></div></div>';
        box.querySelector('#qa').onclick = function () { quiz(box, title, items, opts, ev); }; O.sfx('done'); return;
      }
      var q = qs[i];
      box.innerHTML = '<h3>' + title + ' <small class="dim">' + (i + 1) + ' / ' + qs.length + '</small></h3><div class="stage center"><div class="no big">' + O.esc(q[0]) + '</div></div><div class="opts" id="qo"></div><div id="qf"></div>';
      var done = false;
      Object.keys(opts).forEach(function (k) {
        var b = O.el('button', 'opt', O.esc(opts[k])); b.setAttribute('data-k', k);
        b.onclick = function () {
          if (done) return; done = true; var ok = k === q[1]; if (ok) good++; if (O.practiceLog) O.practiceLog(ev, ok ? 1 : 0); if (O.tele) O.tele.ev(ev); O.sfx(ok ? 'ok' : 'bad'); b.classList.add(ok ? 'right' : 'wrong');
          if (!ok) { var r = box.querySelector('[data-k="' + q[1] + '"]'); if (r) r.classList.add('right'); }
          box.querySelector('#qf').innerHTML = '<div class="feedback ' + (ok ? 'good' : 'bad') + '"><b class="no">' + O.esc(q[0]) + '</b>: ' + O.esc(q[2]) + '<div class="row">' + say(q[0]) + '<button class="btn" id="qn">' + (i + 1 < qs.length ? 'Далі' : 'Підсумок') + '</button></div></div>';
          wire(box); box.querySelector('#qn').onclick = function () { i++; next(); }; box.querySelector('#qn').focus();
        };
        box.querySelector('#qo').appendChild(b);
      });
    }
    next();
  }
  O.renderSounds = function (root) {
    root.innerHTML = '<h2>Звуки</h2><p class="dim small">Норвезька пишеться не так, як вимовляється, але за правилами. Тут правила, які дають найбільше: довжина голосного й читання сполучень. Власні приклади; вимова — стандартна (букмол), у діалектах буває інакше.</p>' +
      '<div class="panel"><h3>1. Голосний довгий чи короткий</h3>' +
      '<p>Дивись, що стоїть <b>після</b> голосного. <b>Один приголосний</b> (або жодного) → голосний <b>довгий</b>. <b>Два й більше</b> приголосних → <b>короткий</b>. Різниця змінює слово.</p>' +
      '<div class="chips">' + say('tak') + say('takk') + say('mat') + say('matt') + say('fin') + say('finn') + '</div>' +
      '<p class="dim small">tak [та:к] «дах» · takk [так] «дякую» · mat «їжа» · matt «втомлений» · fin «гарний» · finn «знайди». Винятки є: службові слова han, at, og короткі попри один приголосний; у запозичень свої правила.</p>' +
      '<div class="row"><button class="btn" id="sl">Довгий чи короткий? (10)</button><button class="btn ghost" id="sp">👂 Слухати пари</button></div></div>' +
      '<div class="panel"><h3>2. Сполучення, які читаються інакше</h3><table class="vtab"><tbody>' +
      '<tr><td><b>kj, tj</b>; k перед i, y, j</td><td>м’яке «хь» [ç]</td><td class="no">kjøre, tjue, kino, kirke</td></tr>' +
      '<tr><td><b>sj, skj</b>; sk перед i, y</td><td>«ш» [ʃ]</td><td class="no">sjø, skjorte, ski</td></tr>' +
      '<tr><td><b>hj, gj</b></td><td>«й»; h і g мовчать</td><td class="no">hjem, hjelp, gjerne</td></tr>' +
      '<tr><td>sk перед a, o, u, å, r</td><td>«ск»</td><td class="no">skole, skap, skrive</td></tr>' +
      '<tr><td><b>ng</b>, nk</td><td>[ŋ] як в «банк»; g не окремо</td><td class="no">lang, tenke</td></tr>' +
      '<tr><td><b>rs</b></td><td>«ш»</td><td class="no">norsk, første</td></tr>' +
      '</tbody></table><p class="dim small">У частині діалектів і в молодої вимови kj та sj зливаються в «ш». Для розуміння це не заважає, для письма правило те саме.</p>' +
      '<div class="row"><button class="btn" id="sr">Як звучить початок? (10)</button></div></div>' +
      '<div class="panel"><h3>3. Особливі літери</h3><ul class="plain">' +
      '<li><b>o</b> довге звучить як «у»: <span class="no">bok, sol, stor, god</span>; коротке — як «о»: <span class="no">kopp, komme</span>.</li>' +
      '<li><b>å</b> = довге «о»: <span class="no">går, båt</span>. <b>ø</b> ≈ німецьке ö: <span class="no">snø, brød</span>. <b>æ</b> — відкрите «е»: <span class="no">være, nær</span>.</li>' +
      '<li><b>y</b> ≈ німецьке ü, «ю» без «й»: <span class="no">by, ny</span>. <b>u</b> — округлене «у» з язиком уперед: <span class="no">hus, du</span>.</li>' +
      '<li><b>d</b> часто мовчить в кінці: <span class="no">god, land, kald</span>. Закінчення <b>-ig</b> → «і»: <span class="no">riktig, veldig</span>. У <span class="no">det</span> «т» не чути.</li></ul>' +
      '<div class="chips">' + ['bok', 'går', 'snø', 'by', 'hus', 'land', 'riktig', 'norsk'].map(say).join('') + '</div></div>' +
      '<div class="panel"><h3>4. Тони й наголос</h3><p>У норвезькій два тональні контури слова (тон 1 і тон 2). Вони розрізняють лише окремі пари, наприклад <span class="no">bønder</span> (фермери) і <span class="no">bønner</span> (боби). Системний голос тони передає ненадійно, тому тут їх не тренуємо: це краще ловити на слух із живого мовлення. Наголос здебільшого на першому складі.</p></div>' +
      '<div id="sbox" class="panel" hidden></div>';
    wire(root);
    var box = root.querySelector('#sbox');
    function open(fn) { box.hidden = false; fn(); box.scrollIntoView({ behavior: 'smooth' }); }
    root.querySelector('#sl').onclick = function () { open(function () { quiz(box, 'Довгий чи короткий?', LEN, { l: 'Довгий', s: 'Короткий' }, 'sndlen'); }); };
    root.querySelector('#sr').onclick = function () { open(function () { quiz(box, 'Як звучить початок?', RD, OPT, 'sndrd'); }); };
    root.querySelector('#sp').onclick = function () { open(function () { O.practicePairs(box); }); };
  };
  O.sounds = { LEN: LEN, RD: RD };
})();
