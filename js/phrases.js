/* Фрази за часом доби: зранку — день, дата, погода; протягом дня — побут (передпокій, кухня, сім'я, тіло, речі).
   Речення написані мною (bokmål), носієм не перевірені. Погоду обираєш сам: застосунок її не знає. */
(function () {
  var O = window.ORD = window.ORD || {};
  var DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'], DAYS_UK = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота'];
  var MON = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'], MON_UK = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  var WX = {
    sun: ['☀️', 'Det er sol i dag.', 'Сьогодні сонячно.'], cloud: ['☁️', 'Det er skyet i dag.', 'Сьогодні хмарно.'], snow: ['❄️', 'Det snør i dag.', 'Сьогодні сніг.'],
    rain: ['🌧', 'Det regner i dag.', 'Сьогодні дощ.'], wind: ['💨', 'Det blåser mye i dag.', 'Сьогодні сильний вітер.'], fog: ['🌫', 'Det er tåke i dag.', 'Сьогодні туман.'], cold: ['🥶', 'Det er kaldt ute.', 'На вулиці холодно.']
  };
  var TOPICS = {
    hall: ['🚪 Передпокій', [['Dette er gangen.', 'Це передпокій.'], ['Jeg henger jakka på knaggen.', 'Я вішаю куртку на гачок.'], ['Skoene står på skohylla.', 'Взуття стоїть на полиці для взуття.'], ['Hvor er nøklene mine?', 'Де мої ключі?'], ['Jeg tar på meg lua og hanskene.', 'Я вдягаю шапку й рукавиці.'], ['Døra er låst.', 'Двері замкнені.'], ['Paraplyen står ved døra.', 'Парасолька стоїть біля дверей.']]],
    kitchen: ['🍳 Кухня', [['Dette er kjøkkenet.', 'Це кухня.'], ['Jeg koker kaffe.', 'Я варю каву.'], ['Kjøleskapet er nesten tomt.', 'Холодильник майже порожній.'], ['Hvor er kniven?', 'Де ніж?'], ['Jeg vasker opp tallerkenene.', 'Я мию тарілки.'], ['Komfyren er varm.', 'Плита гаряча.'], ['Skjeen ligger i skuffen.', 'Ложка лежить у шухляді.']]],
    family: ['👪 Сімʼя', [['Dette er familien min.', 'Це моя сімʼя.'], ['Dette er moren min.', 'Це моя мама.'], ['Dette er faren min.', 'Це мій тато.'], ['Jeg har en bror og en søster.', 'У мене є брат і сестра.'], ['Hvordan har familien din det?', 'Як справи в твоєї сімʼї?'], ['Barna er på skolen.', 'Діти в школі.'], ['Besteforeldrene mine bor i Ukraina.', 'Мої бабуся й дідусь живуть в Україні.']]],
    body: ['🖐 Тіло', [['Jeg har vondt i hodet.', 'У мене болить голова.'], ['Hånden min gjør vondt.', 'Моя рука болить.'], ['Jeg har vondt i ryggen.', 'У мене болить спина.'], ['Øynene mine er trøtte.', 'Мої очі втомлені.'], ['Vask hendene dine.', 'Помий руки.'], ['Jeg bruker hørselvern og vernebriller.', 'Я користуюся навушниками-захистом і захисними окулярами.'], ['Strekk armene og bena.', 'Розімни руки й ноги.']]],
    things: ['🛋 Речі вдома', [['Bordet står ved vinduet.', 'Стіл стоїть біля вікна.'], ['Lampen er på.', 'Лампа ввімкнена.'], ['Slå av lyset.', 'Вимкни світло.'], ['Hvor er fjernkontrollen?', 'Де пульт?'], ['Håndkleet henger på kroken.', 'Рушник висить на гачку.'], ['Mobilen min lader.', 'Мій телефон заряджається.'], ['Kan du skru på varmen?', 'Можеш увімкнути опалення?']]],
    night: ['🌙 Вечір', [['God kveld!', 'Добрий вечір!'], ['Jeg skal lage middag.', 'Я збираюся готувати вечерю.'], ['Jeg pusser tennene.', 'Я чищу зуби.'], ['Jeg skal legge meg nå.', 'Я зараз піду спати.'], ['God natt og sov godt!', 'На добраніч і солодких снів!']]]
  };
  var ORDER = ['hall', 'kitchen', 'family', 'body', 'things'];
  function dayNo(d) { return Math.floor(d.getTime() / 864e5); }
  function wx() { var s = O.state.settings, d = new Date().toDateString(); return s.wx && s.wx.d === d ? s.wx.k : null; }
  function morning(d) {
    var k = wx(), a = [['God morgen!', 'Доброго ранку!'], ['I dag er det ' + DAYS[d.getDay()] + ' ' + d.getDate() + '. ' + MON[d.getMonth()] + '.', 'Сьогодні ' + DAYS_UK[d.getDay()] + ', ' + d.getDate() + ' ' + MON_UK[d.getMonth()] + '.'], ['Hvordan er været i dag?', 'Яка сьогодні погода?']];
    if (k && WX[k]) a.push([WX[k][1], WX[k][2]]);
    return a;
  }
  function now(shift) {
    var d = new Date(), h = d.getHours(), r;
    if (h >= 5 && h < 10) r = { id: 'morning', title: '☀️ Ранок', items: morning(d), wx: true };
    else if (h >= 21 || h < 5) r = { id: 'night', title: TOPICS.night[0], items: TOPICS.night[1].slice(0, 4) };
    else { var key = ORDER[(Math.floor(h / 2) + dayNo(d) + (shift || 0)) % ORDER.length], t = TOPICS[key]; r = { id: key, title: t[0], items: t[1].slice((dayNo(d) + (shift || 0)) % 3, (dayNo(d) + (shift || 0)) % 3 + 4) }; }
    return r;
  }
  function wid(no) { var h = 0; for (var i = 0; i < no.length; i++) h = (h * 31 + no.charCodeAt(i)) >>> 0; return 'ph_' + h.toString(36); }
  function save(p) { var w = { id: wid(p[0]), deck: 'mine', cat: 'Mine', art: '', no: p[0].replace(/[.!?]+$/, ''), uk: p[1].replace(/[.!?]+$/, ''), ex: p[0], exUk: p[1], multi: true }; return O.addWord(w) ? 'Додано у словник' : 'Уже є у словнику'; }
  function html(r) {
    var s = '<div class="phr"><b>' + O.esc(r.title) + '</b>' + r.items.map(function (p, i) { return '<div class="phrow"><button class="icon" data-ps="' + i + '" aria-label="Озвучити">🔊</button><span><span class="no">' + O.esc(p[0]) + '</span><br><span class="dim small">' + O.esc(p[1]) + '</span></span><button class="icon" data-pa="' + i + '" title="У словник" aria-label="У словник">＋</button></div>'; }).join('');
    if (r.wx) s += '<div class="phwx dim small">Яка погода? ' + Object.keys(WX).map(function (k) { return '<button class="icon' + (wx() === k ? ' on' : '') + '" data-pw="' + k + '" aria-label="' + O.esc(WX[k][2]) + '">' + WX[k][0] + '</button>'; }).join('') + '</div>';
    return s + '</div>';
  }
  function bind(el, r, redo) {
    O.$$('[data-ps]', el).forEach(function (b) { b.onclick = function () { O.speak(r.items[+b.getAttribute('data-ps')][0]); }; });
    O.$$('[data-pa]', el).forEach(function (b) { b.onclick = function () { O.toast(save(r.items[+b.getAttribute('data-pa')]), 1200); b.disabled = true; }; });
    O.$$('[data-pw]', el).forEach(function (b) { b.onclick = function () { O.state.settings.wx = { d: new Date().toDateString(), k: b.getAttribute('data-pw') }; O.save(); redo(); }; });
  }
  /* картка на «Сьогодні» */
  function card(host) {
    var shift = 0;
    (function draw() {
      var r = now(shift); host.innerHTML = '<div class="panel phcard">' + html(r) + '<div class="row"><button class="btn ghost" data-more>Ще фрази</button></div></div>';
      bind(host, r, draw); host.querySelector('[data-more]').onclick = function () { shift++; draw(); };
    })();
  }
  /* у вікні бота */
  function bot(log, scroll) {
    var b = null;
    function draw() { var r = now(), n = O.el('div', 'bub bot', html(r)); if (b) log.replaceChild(n, b); else log.appendChild(n); b = n; bind(n, r, draw); if (scroll) log.scrollTop = log.scrollHeight; }
    draw();
  }
  O.phrases = { now: now, card: card, bot: bot, TOPICS: TOPICS };
})();
