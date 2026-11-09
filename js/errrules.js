/* Детермінований перевіряльник типових помилок україномовних учнів (bokmål). Без ШІ, миттєво, лише правила, у яких я впевнений.
   Кожне правило ловить вузький шаблон, тому багато помилок він НЕ побачить: «нічого не знайдено» не означає «помилок немає». */
(function () {
  var O = window.ORD;
  var PRON = { jeg: 1, du: 1, han: 1, hun: 1, vi: 1, de: 1, dere: 1 };
  var NOSWAP = { ikke: 1, aldri: 1, alltid: 1, ofte: 1, bare: 1, også: 1, vel: 1, jo: 1, nok: 1, og: 1, eller: 1, som: 1, selv: 1, da: 1, så: 1 };
  var ADV1 = ['nå', 'etterpå', 'først', 'her', 'der', 'ofte', 'alltid', 'snart'];
  var ADV2 = [['i', 'dag'], ['i', 'går'], ['i', 'morgen'], ['i', 'kveld'], ['i', 'natt'], ['i', 'fjor'], ['om', 'morgenen'], ['om', 'kvelden']];
  var DAYS = { mandag: 1, tirsdag: 1, onsdag: 1, torsdag: 1, fredag: 1, lørdag: 1, søndag: 1 };
  var PLACES = { oslo: 1, norge: 1, tromsø: 1, bergen: 1, trondheim: 1, stavanger: 1, ukraina: 1, polen: 1, kristiansand: 1 };
  var DURV = { bodd: 1, bodde: 1, bor: 1, jobbet: 1, jobber: 1, jobbe: 1, vært: 1, studert: 1, studerer: 1, ventet: 1, venter: 1 };
  var NUMS = { en: 1, ett: 1, to: 1, tre: 1, fire: 1, fem: 1, seks: 1, syv: 1, sju: 1, åtte: 1, ni: 1, ti: 1, tolv: 1 };
  var UNITS = { år: 1, måneder: 1, måned: 1, uker: 1, uke: 1, dager: 1, dag: 1, timer: 1, time: 1, minutter: 1 };
  var PRET2PART = { spiste: 'spist', gikk: 'gått', kom: 'kommet', tok: 'tatt', fikk: 'fått', ble: 'blitt', var: 'vært', ga: 'gitt', skrev: 'skrevet', leste: 'lest', drakk: 'drukket', satt: 'sittet', lå: 'ligget', sov: 'sovet', sa: 'sagt', så: 'sett', fant: 'funnet', løp: 'løpt', kjøpte: 'kjøpt' };
  var PART2PRET = { spist: 'spiste', gått: 'gikk', kommet: 'kom', tatt: 'tok', fått: 'fikk', vært: 'var', gitt: 'ga', skrevet: 'skrev', lest: 'leste', drukket: 'drakk', sett: 'så', sagt: 'sa', funnet: 'fant', kjøpt: 'kjøpte' };
  var PASTMARK = [['i', 'går'], ['i', 'fjor'], ['forrige', 'uke'], ['forrige', 'måned'], ['forrige', 'år'], ['for', 'to', 'dager', 'siden']];
  var NEUT = { stor: 'stort', ny: 'nytt', god: 'godt', gammel: 'gammelt', fin: 'fint', pen: 'pent', lang: 'langt', liten: 'lite' };
  var COMMON = { stort: 'stor', nytt: 'ny', godt: 'god', gammelt: 'gammel', fint: 'fin', pent: 'pen', langt: 'lang' };
  var MODALS = { kan: 1, skal: 1, vil: 1, må: 1, bør: 1, kunne: 1, skulle: 1, ville: 1, måtte: 1, burde: 1 };
  var FIN2INF = { går: 'gå', gjør: 'gjøre', har: 'ha', er: 'være', kommer: 'komme', ser: 'se', spiser: 'spise', snakker: 'snakke', jobber: 'jobbe', bor: 'bo', tar: 'ta', sier: 'si', vet: 'vite', bruker: 'bruke', lærer: 'lære', forstår: 'forstå', skriver: 'skrive', leser: 'lese', kjøper: 'kjøpe', betaler: 'betale', trenger: 'trenge', liker: 'like', ønsker: 'ønske' };
  var WHY = {
    order: 'Дієслово на другому місці: після обставини на початку речення підмет іде ПІСЛЯ дієслова.',
    prep: 'Прийменник: «i dag», «i Oslo», «i to år» (тривалість), а не дослівні «om/på/for».',
    verbform: 'Форма дієслова.',
    adjagree: 'Прикметник узгоджується з родом: et + -t (et stort hus), en/ei без -t (en stor bil).',
    neg: 'У норвезькій немає подвійного заперечення: одне заперечне слово.'
  };
  function eq(lc, i, arr) { for (var k = 0; k < arr.length; k++) if (lc[i + k] !== arr[k]) return false; return true; }
  function tokens(sent) { return (sent.match(/[\p{L}\p{N}'’-]+/gu) || []); }
  function sentenceIssues(sent) {
    var ws = tokens(sent), lc = ws.map(function (w) { return w.toLowerCase(); }), out = [], i, k;
    function add(type, from, to, rightWords, note) { out.push({ type: type, wrong: ws.slice(from, to).join(' '), right: rightWords.join(' '), why: note || WHY[type] }); }
    /* 1. V2 після обставини на початку */
    var klen = 0;
    if (ADV1.indexOf(lc[0]) >= 0) klen = 1;
    else { for (i = 0; i < ADV2.length; i++) if (eq(lc, 0, ADV2[i])) { klen = 2; break; } if (!klen && lc[0] === 'på' && DAYS[lc[1]]) klen = 2; }
    if (klen && PRON[lc[klen]] && lc[klen + 1] && !NOSWAP[lc[klen + 1]] && !PRON[lc[klen + 1]]) add('order', 0, klen + 2, ws.slice(0, klen).concat([ws[klen + 1], ws[klen]]));
    for (i = 0; i < lc.length; i++) {
      /* 2. Прийменники */
      if (lc[i] === 'om' && lc[i + 1] === 'dag') add('prep', i, i + 2, ['i', 'dag']);
      if (lc[i] === 'på' && PLACES[lc[i + 1]]) add('prep', i, i + 2, ['i', ws[i + 1]], 'Для міст і країн: i (i Oslo, i Norge), а не på.');
      if (lc[i] === 'for' && NUMS[lc[i + 1]] || (lc[i] === 'for' && /^\d+$/.test(lc[i + 1] || ''))) {
        if (UNITS[lc[i + 2]] && lc[i + 3] !== 'siden' && lc.slice(0, i).some(function (x) { return DURV[x]; })) add('prep', i, i + 3, ['i', ws[i + 1], ws[i + 2]], 'Тривалість: i to år, а не for to år (for … siden означає «тому»).');
      }
      /* 3. har + претерит */
      if ((lc[i] === 'har' || lc[i] === 'hadde') && PRET2PART[lc[i + 1]]) add('verbform', i, i + 2, [ws[i], PRET2PART[lc[i + 1]]], 'Після har/hadde стоїть причасник (har spist), а не простий минулий.');
      /* 4. Заперечення */
      if (lc[i] === 'ikke' && (lc[i + 1] === 'aldri' || lc[i + 1] === 'ingen' || lc[i + 1] === 'ingenting' || lc[i + 1] === 'ikke')) add('neg', i, i + 2, [ws[i + 1]]);
      /* 5. Узгодження прикметника */
      if (lc[i] === 'et' && NEUT[lc[i + 1]]) add('adjagree', i, i + 2, [ws[i], NEUT[lc[i + 1]]]);
      if ((lc[i] === 'en' || lc[i] === 'ei') && COMMON[lc[i + 1]]) add('adjagree', i, i + 2, [ws[i], COMMON[lc[i + 1]]]);
      /* 6. Модальне / å + особова форма замість інфінітива */
      if (MODALS[lc[i]] && lc[i + 1] === 'å' && lc[i + 2]) add('verbform', i, i + 3, [ws[i], ws[i + 2]], 'Після модального дієслова å не потрібне: må være, kan gå.');
      if (MODALS[lc[i]]) {
        k = i + 1; if (lc[k] === 'ikke') k++;
        if (FIN2INF[lc[k]]) add('verbform', i, k + 1, ws.slice(i, k).concat([FIN2INF[lc[k]]]), 'Після модального дієслова стоїть інфінітив без å: kan gå, må være.');
        else if (PRON[lc[i + 1]] && FIN2INF[lc[i + 2]]) add('verbform', i, i + 3, [ws[i], ws[i + 1], FIN2INF[lc[i + 2]]], 'Після модального дієслова стоїть інфінітив без å: kan du gå?');
      }
      if (lc[i] === 'å' && FIN2INF[lc[i + 1]]) add('verbform', i, i + 2, ['å', FIN2INF[lc[i + 1]]], 'Після å стоїть інфінітив: å gå, å være.');
      /* 7. present perfect із маркером минулого */
      if (lc[i] === 'har' && PART2PRET[lc[i + 1]]) {
        var past = PASTMARK.slice(0, 3).some(function (m) { for (var j = i + 2; j < lc.length; j++) if (eq(lc, j, m)) return true; return false; });
        if (past) { var rw = ws.slice(0, i).concat([PART2PRET[lc[i + 1]]], ws.slice(i + 2)); add('verbform', 0, ws.length, rw, 'Для конкретного моменту в минулому (i går, i fjor) вживай простий минулий.'); }
      }
    }
    return out;
  }
  O.rules = {
    check: function (text) {
      var seen = {}, res = [];
      String(text || '').split(/(?<=[.!?])\s+|\n+/).forEach(function (sent) { sentenceIssues(sent.trim()).forEach(function (x) { var k = x.type + '|' + x.wrong; if (!seen[k] && x.wrong !== x.right) { seen[k] = 1; res.push(x); } }); });
      return res;
    }
  };
})();
