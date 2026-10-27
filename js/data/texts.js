/* Тексти для читалки (рівень A1-A2) і сценарії для ШІ-репетитора. Написані моделлю, носієм не перевірені. */
(function () {
  var O = window.ORD = window.ORD || {};
  O.texts = [
    { id: 't1', title: 'Første dag på verkstedet', lvl: 'A1',
      no: 'I dag er det min første dag på verkstedet. Jeg kommer klokka sju. Sjefen heter Per. Han viser meg verktøyet og tegningene. Jeg får hjelm, vernebriller og hansker. Vi har HMS-møte klokka åtte. Etter møtet begynner jeg å sveise. Det er en god dag.',
      uk: 'Сьогодні мій перший день у майстерні. Я приходжу о сьомій. Керівника звати Пер. Він показує мені інструмент і креслення. Я отримую каску, захисні окуляри й рукавиці. О восьмій у нас збори з ОПБ. Після зборів я починаю варити. Це гарний день.' },
    { id: 't2', title: 'Jobbintervju', lvl: 'A2',
      no: 'Jeg har jobbintervju hos et skipsverft i Tromsø. Sjefen spør: «Hvor lenge har du jobbet som sveiser?» Jeg svarer at jeg har ti års erfaring. Jeg har også sertifikat for TIG-sveising. Han vil vite om jeg snakker norsk. Jeg sier at jeg lærer hver dag, og at jeg forstår mye. Til slutt spør jeg om lønn og arbeidstid.',
      uk: 'У мене співбесіда на верфі в Тромсе. Керівник питає: «Як довго ти працюєш зварювальником?» Я відповідаю, що маю десять років досвіду. Також у мене є сертифікат на TIG-зварювання. Він хоче знати, чи я говорю норвезькою. Я кажу, що вчуся щодня й багато розумію. Наприкінці я питаю про зарплату й робочий час.' },
    { id: 't3', title: 'Hos NAV', lvl: 'A2',
      no: 'I morgen har jeg time hos NAV. Jeg må ta med pass, oppholdstillatelse og fødselsnummer. Jeg logger inn med BankID og fyller ut skjemaet på nett. Saksbehandleren spør hva slags jobb jeg søker. Jeg sier at jeg er sveiser og vil jobbe i nord. Hun gir meg en liste med ledige stillinger.',
      uk: 'Завтра в мене прийом у NAV. Треба взяти паспорт, дозвіл на проживання й особистий номер. Я входжу через BankID і заповнюю форму онлайн. Працівниця питає, яку роботу я шукаю. Я кажу, що я зварювальник і хочу працювати на півночі. Вона дає мені список вакансій.' },
    { id: 't4', title: 'Leilighet i Tromsø', lvl: 'A2',
      no: 'Jeg leter etter en liten leilighet i Tromsø. Husleien er femten tusen kroner i måneden. Utleieren vil ha depositum, tre måneder husleie. Jeg spør om strøm og internett er med i prisen. Han sier nei, jeg må betale strøm selv. Vi blir enige om at jeg kan flytte inn første desember.',
      uk: 'Я шукаю маленьку квартиру в Тромсе. Оренда — п’ятнадцять тисяч крон на місяць. Орендодавець хоче заставу — три місяці оренди. Я питаю, чи електрика й інтернет входять у ціну. Він каже, що ні, електрику я плачу сам. Ми домовляємося, що я заселюся першого грудня.' },
    { id: 't5', title: 'Uhell på jobb', lvl: 'A2',
      no: 'I går skjedde det et uhell på byggeplassen. En kollega glemte vernebriller og fikk en gnist i øyet. Vi ringte legevakten, og han kom raskt til lege. Etterpå varslet vi sjefen og skrev en rapport. Alle på laget fikk en ny HMS-runde. Det er viktig å bruke verneutstyr hver gang.',
      uk: 'Учора на будмайданчику стався нещасний випадок. Колега забув захисні окуляри й отримав іскру в око. Ми зателефонували в невідкладну допомогу, і він швидко потрапив до лікаря. Потім ми повідомили керівника й склали звіт. Уся бригада пройшла ще один інструктаж з ОПБ. Важливо щоразу користуватися засобами захисту.' }
  ];
  O.scenarios = [
    { id: 'interview', title: 'Співбесіда зварювальником', role: 'керівник виробництва на верфі в Тромсе', goal: 'Пройти співбесіду: досвід, сертифікати, графік, зарплата.', start: 'Hei og velkommen! Kan du fortelle litt om deg selv og erfaringen din?' },
    { id: 'nav', title: 'Прийом у NAV', role: 'працівниця NAV', goal: 'Пояснити свою ситуацію, дізнатися про курс норвезької та вакансії.', start: 'God dag. Hva kan jeg hjelpe deg med i dag?' },
    { id: 'landlord', title: 'Оренда квартири', role: 'орендодавець', goal: 'Домовитися про ціну, заставу, дату заселення.', start: 'Hei! Du vil se leiligheten, ikke sant? Kom inn.' },
    { id: 'colleague', title: 'Розмова з колегою на перерві', role: 'колега-зварювальник, який любить жарти', goal: 'Підтримати побутову розмову: вихідні, погода, робота.', start: 'Hei! Er det du som er ny? Skal vi ta en kaffe?' },
    { id: 'doctor', title: 'Лікар', role: 'лікар загальної практики (fastlege)', goal: 'Описати симптоми, отримати рецепт, домовитися про наступний візит.', start: 'Hei, kom inn og sett deg. Hva feiler det deg?' },
    { id: 'free', title: 'Вільна розмова', role: 'дружній норвезький співрозмовник', goal: 'Практикувати будь-яку тему.', start: 'Hei! Hva har du lyst til å snakke om?' }
  ];
})();
