/* Історії для читання: A1-A2, про роботу й побут у Норвегії. Кожне речення має переклад. Написані моделлю, носієм не перевірені. */
(function () {
  var O = window.ORD = window.ORD || {};
  var S = [
    { id: 's1', title: 'Første dag på verkstedet', lvl: 'A1', theme: 'weld', s: [
      ['I dag er det min første dag på verkstedet.', 'Сьогодні мій перший день у майстерні.'],
      ['Jeg kommer klokka sju.', 'Я приходжу о сьомій.'],
      ['Sjefen heter Per.', 'Керівника звати Пер.'],
      ['Han viser meg verktøyet og tegningene.', 'Він показує мені інструмент і креслення.'],
      ['Jeg får hjelm, vernebriller og hansker.', 'Я отримую каску, захисні окуляри й рукавиці.'],
      ['Vi har HMS-møte klokka åtte.', 'О восьмій у нас збори з ОПБ.'],
      ['Etter møtet begynner jeg å sveise.', 'Після зборів я починаю зварювати.'],
      ['Det er en god dag.', 'Це хороший день.']] },
    { id: 's2', title: 'Kaffe og kollegaer', lvl: 'A1', theme: 'cup', s: [
      ['Jeg heter Vasyl, og jeg er fra Ukraina.', 'Мене звати Василь, я з України.'],
      ['Nå bor jeg i Tromsø.', 'Тепер я живу в Тромсе.'],
      ['På jobb er det mange kollegaer.', 'На роботі багато колег.'],
      ['Vi tar kaffe klokka ni.', 'Ми п’ємо каву о дев’ятій.'],
      ['Kari spør: «Hvordan har du det?»', 'Карі питає: «Як справи?»'],
      ['Jeg svarer: «Bare bra, takk!»', 'Я відповідаю: «Добре, дякую!»'],
      ['Hun snakker fort, men jeg forstår litt.', 'Вона говорить швидко, але я трохи розумію.'],
      ['Jeg sier: «Kan du snakke litt saktere?»', 'Я кажу: «Можеш говорити трохи повільніше?»']] },
    { id: 's3', title: 'På butikken', lvl: 'A1', theme: 'cart', s: [
      ['Jeg går til Rema 1000 etter jobb.', 'Після роботи я йду в Rema 1000.'],
      ['Jeg trenger brød, melk og ost.', 'Мені потрібні хліб, молоко й сир.'],
      ['Brødet koster førti kroner.', 'Хліб коштує сорок крон.'],
      ['Det er dyrt i Norge.', 'У Норвегії дорого.'],
      ['Jeg betaler med kort.', 'Я плачу карткою.'],
      ['Kassadamen sier: «Vil du ha kvittering?»', 'Касирка питає: «Хочете чек?»'],
      ['Jeg sier nei takk og går hjem.', 'Я кажу «ні, дякую» і йду додому.']] },
    { id: 's4', title: 'Været i Tromsø', lvl: 'A1', theme: 'snow', s: [
      ['I dag er det kaldt, og det snør.', 'Сьогодні холодно, і йде сніг.'],
      ['Det er mørkt klokka tre.', 'О третій уже темно.'],
      ['Jeg tar på lue, jakke og votter.', 'Я вдягаю шапку, куртку й рукавиці.'],
      ['Bussen går klokka åtte.', 'Автобус їде о восьмій.'],
      ['Jeg venter på bussen i ti minutter.', 'Я чекаю автобус десять хвилин.'],
      ['På lørdag blir det sol.', 'У суботу буде сонячно.'],
      ['Da skal jeg gå en tur i fjellet.', 'Тоді я піду на прогулянку в гори.']] },
    { id: 's5', title: 'Jobbintervju', lvl: 'A2', theme: 'doc', s: [
      ['Jeg har jobbintervju hos et skipsverft i Tromsø.', 'У мене співбесіда на верфі в Тромсе.'],
      ['Sjefen spør: «Hvor lenge har du jobbet som sveiser?»', 'Керівник питає: «Як довго ти працюєш зварювальником?»'],
      ['Jeg svarer at jeg har ti års erfaring.', 'Я відповідаю, що маю десять років досвіду.'],
      ['Jeg har også sertifikat for TIG-sveising.', 'У мене також є сертифікат на TIG-зварювання.'],
      ['Han vil vite om jeg snakker norsk.', 'Він хоче знати, чи я говорю норвезькою.'],
      ['Jeg sier at jeg lærer hver dag, og at jeg forstår mye.', 'Я кажу, що вчуся щодня й багато розумію.'],
      ['Til slutt spør jeg om lønn og arbeidstid.', 'Наприкінці я питаю про зарплату й робочий час.']] },
    { id: 's6', title: 'Hos NAV', lvl: 'A2', theme: 'doc', s: [
      ['I morgen har jeg time hos NAV.', 'Завтра в мене прийом у NAV.'],
      ['Jeg må ta med pass, oppholdstillatelse og fødselsnummer.', 'Мушу взяти паспорт, дозвіл на проживання й особистий номер.'],
      ['Jeg logger inn med BankID og fyller ut skjemaet på nett.', 'Я входжу через BankID і заповнюю форму онлайн.'],
      ['Saksbehandleren spør hva slags jobb jeg søker.', 'Працівник питає, яку роботу я шукаю.'],
      ['Jeg sier at jeg er sveiser og vil jobbe i nord.', 'Я кажу, що я зварювальник і хочу працювати на півночі.'],
      ['Hun gir meg en liste med ledige stillinger.', 'Вона дає мені список вакансій.']] },
    { id: 's7', title: 'Leilighet i Tromsø', lvl: 'A2', theme: 'house', s: [
      ['Jeg leter etter en liten leilighet i Tromsø.', 'Я шукаю маленьку квартиру в Тромсе.'],
      ['Husleien er femten tusen kroner i måneden.', 'Оренда — п’ятнадцять тисяч крон на місяць.'],
      ['Utleieren vil ha depositum, tre måneder husleie.', 'Орендодавець хоче заставу — три місяці оренди.'],
      ['Jeg spør om strøm og internett er med i prisen.', 'Я питаю, чи електрика й інтернет входять у ціну.'],
      ['Han sier nei, jeg må betale strøm selv.', 'Він каже ні, електрику я плачу сам.'],
      ['Vi blir enige om at jeg kan flytte inn første desember.', 'Ми домовляємося, що я можу в’їхати першого грудня.']] },
    { id: 's8', title: 'Uhell på jobb', lvl: 'A2', theme: 'cross', s: [
      ['I går skjedde det et uhell på byggeplassen.', 'Учора на будмайданчику стався нещасний випадок.'],
      ['En kollega glemte vernebriller og fikk en gnist i øyet.', 'Колега забув захисні окуляри й отримав іскру в око.'],
      ['Vi ringte legevakten, og han kom raskt til lege.', 'Ми зателефонували в невідкладну допомогу, і він швидко потрапив до лікаря.'],
      ['Etterpå varslet vi sjefen og skrev en rapport.', 'Потім ми повідомили керівника й склали звіт.'],
      ['Alle på laget fikk en ny HMS-runde.', 'Уся команда пройшла нове заняття з ОПБ.'],
      ['Det er viktig å bruke verneutstyr hver gang.', 'Важливо щоразу користуватися засобами захисту.']] },
    { id: 's9', title: 'Hos legen', lvl: 'A2', theme: 'cross', s: [
      ['Jeg har vondt i ryggen og i hodet.', 'У мене болить спина й голова.'],
      ['Derfor ringer jeg legekontoret og bestiller time.', 'Тому я телефоную в лікарський кабінет і записуюся на прийом.'],
      ['Legen spør: «Hvor lenge har du hatt vondt?»', 'Лікар питає: «Як довго у вас болить?»'],
      ['Jeg sier at det har vart i en uke.', 'Я кажу, що це триває тиждень.'],
      ['Han undersøker ryggen min og skriver en resept.', 'Він оглядає мою спину й виписує рецепт.'],
      ['Jeg må hente medisinen på apoteket.', 'Мушу забрати ліки в аптеці.'],
      ['Legen sier at jeg skal hvile og ikke løfte tungt.', 'Лікар каже, що я маю відпочивати й не піднімати важке.'],
      ['Han skriver også sykemelding til sjefen min.', 'Він також виписує лікарняний для мого керівника.']] },
    { id: 's10', title: 'Sveiseinstruks', lvl: 'A2', theme: 'weld', s: [
      ['Før du sveiser, må du sjekke utstyret.', 'Перш ніж зварювати, перевір обладнання.'],
      ['Bruk alltid hjelm, hansker og vernebriller.', 'Завжди використовуй каску, рукавиці й захисні окуляри.'],
      ['Ventilasjonen må fungere, ellers blir røyken farlig.', 'Вентиляція має працювати, інакше дим стане небезпечним.'],
      ['Ikke sveis nær noe som kan brenne.', 'Не вари біля того, що може горіти.'],
      ['Ha en brannslokker i nærheten.', 'Тримай поблизу вогнегасник.'],
      ['Hvis noe går galt, stopp arbeidet og si fra til sjefen.', 'Якщо щось іде не так, зупини роботу й скажи керівнику.'],
      ['Etter jobben rydder du opp og slår av maskinen.', 'Після роботи прибери й вимкни апарат.']] },
    { id: 's11', title: 'Fisketur med kollegaer', lvl: 'A2', theme: 'snow', s: [
      ['På fredag spør Per om jeg vil bli med på fisketur.', 'У п’ятницю Пер питає, чи хочу я поїхати на риболовлю.'],
      ['Jeg har aldri fisket i fjorden, men jeg sier ja.', 'Я ніколи не ловив рибу у фіорді, але кажу «так».'],
      ['Vi møtes på lørdag morgen klokka seks.', 'Зустрічаємось у суботу вранці о шостій.'],
      ['Per tar med kaffe, og jeg tar med matpakke.', 'Пер бере каву, а я беру їжу з собою.'],
      ['Det er kaldt, men utsikten er vakker.', 'Холодно, але краєвид гарний.'],
      ['Vi fanger tre torsk og en sei.', 'Ми ловимо три тріски й одного сайду.'],
      ['På kvelden griller vi fisken sammen.', 'Увечері ми смажимо рибу разом.'],
      ['Jeg lærer mange nye ord, og det er gøy.', 'Я вчу багато нових слів, і це весело.']] }
  ];
  S.forEach(function (t) { t.no = t.s.map(function (p) { return p[0]; }).join(' '); t.uk = t.s.map(function (p) { return p[1]; }).join(' '); });
  O.stories = S; O.texts = S;
  /* Мінімальні пари для тренування слуху. Якість залежить від норвезького голосу macOS. */
  O.pairs = [
    ['tak', 'дах', 'takk', 'дякую'], ['mat', 'їжа', 'matt', 'втомлений'], ['fin', 'гарний', 'finn', 'знайди'], ['pen', 'гарний, охайний', 'penn', 'ручка'],
    ['ny', 'новий', 'ni', 'дев’ять'], ['sy', 'шити', 'si', 'сказати'], ['hel', 'цілий', 'hell', 'удача'], ['kjøre', 'їхати', 'skjøre', 'тендітний'],
    ['bønder', 'фермери', 'bønner', 'боби, молитви'], ['sju', 'сім', 'sjø', 'море']
  ].map(function (p) { return { a: p[0], aUk: p[1], b: p[2], bUk: p[3] }; });
})();
