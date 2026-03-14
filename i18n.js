// i18n.js — all translations and time formatting

function fmtTime(h, m, lang) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, '0');
  const next = h12 % 12 + 1;
  if (lang === 'de') {
    if (m === 0)  return `${h12} Uhr`;
    if (m === 5)  return `fünf nach ${h12}`;
    if (m === 10) return `zehn nach ${h12}`;
    if (m === 15) return `Viertel nach ${h12}`;
    if (m === 20) return `zwanzig nach ${h12}`;
    if (m === 25) return `fünf vor halb ${next}`;
    if (m === 30) return `halb ${next}`;
    if (m === 35) return `fünf nach halb ${next}`;
    if (m === 40) return `zwanzig vor ${next}`;
    if (m === 45) return `Viertel vor ${next}`;
    if (m === 50) return `zehn vor ${next}`;
    if (m === 55) return `fünf vor ${next}`;
    return `${h12}:${mm} Uhr`;
  }
  if (lang === 'it') {
    if (m === 0)  return h12 === 1 ? `l'una` : `le ${h12}`;
    if (m === 15) return h12 === 1 ? `l'una e un quarto` : `le ${h12} e un quarto`;
    if (m === 30) return h12 === 1 ? `l'una e mezza` : `le ${h12} e mezza`;
    if (m === 45) return `le ${next} meno un quarto`;
    if (m < 30)   return h12 === 1 ? `l'una e ${mm}` : `le ${h12} e ${mm}`;
    return `le ${next} meno ${60 - m}`;
  }
  if (lang === 'ja') {
    if (m === 0)  return `${h12}時`;
    if (m === 30) return `${h12}時半`;
    return `${h12}時${mm}分`;
  }
  // en
  if (m === 0)  return `${h12} o'clock`;
  if (m === 15) return `quarter past ${h12}`;
  if (m === 30) return `half past ${h12}`;
  if (m === 45) return `quarter to ${next}`;
  if (m < 30)   return `${m} past ${h12}`;
  return `${60 - m} to ${next}`;
}

function getFragments(h, m, lang) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const next = h12 % 12 + 1;
  if (lang === 'de') {
    if (m === 0)  return { correct: [`${h12}`, 'Uhr'],                    decoys: ['nach','vor','halb','Viertel'] };
    if (m === 5)  return { correct: ['fünf','nach',`${h12}`],             decoys: ['vor','halb','Uhr','zehn'] };
    if (m === 10) return { correct: ['zehn','nach',`${h12}`],             decoys: ['vor','fünf','halb','Uhr'] };
    if (m === 15) return { correct: ['Viertel','nach',`${h12}`],          decoys: ['vor','halb','zehn','Uhr'] };
    if (m === 20) return { correct: ['zwanzig','nach',`${h12}`],          decoys: ['vor','halb','fünf','Uhr'] };
    if (m === 25) return { correct: ['fünf','vor','halb',`${next}`],      decoys: ['nach',`${h12}`,'Viertel','zehn'] };
    if (m === 30) return { correct: ['halb',`${next}`],                   decoys: ['nach','vor',`${h12}`,'Uhr','fünf'] };
    if (m === 35) return { correct: ['fünf','nach','halb',`${next}`],     decoys: ['vor',`${h12}`,'zehn','Uhr'] };
    if (m === 40) return { correct: ['zwanzig','vor',`${next}`],          decoys: ['nach','halb',`${h12}`,'Uhr'] };
    if (m === 45) return { correct: ['Viertel','vor',`${next}`],          decoys: ['nach','halb',`${h12}`,'zehn'] };
    if (m === 50) return { correct: ['zehn','vor',`${next}`],             decoys: ['nach','halb',`${h12}`,'fünf'] };
    if (m === 55) return { correct: ['fünf','vor',`${next}`],             decoys: ['nach','halb',`${h12}`,'zehn'] };
    return { correct: [`${h12}`,':',`${m.toString().padStart(2,'0')}`,'Uhr'], decoys: ['nach','vor'] };
  }
  if (lang === 'en') {
    if (m === 0)  return { correct: [`${h12}`, "o'clock"],               decoys: ['past','to','half','quarter'] };
    if (m === 15) return { correct: ['quarter','past',`${h12}`],         decoys: ['to','half',`${next}`,'five'] };
    if (m === 30) return { correct: ['half','past',`${h12}`],            decoys: ['to','quarter',`${next}`,'five'] };
    if (m === 45) return { correct: ['quarter','to',`${next}`],          decoys: ['past','half',`${h12}`,'five'] };
    if (m < 30)   return { correct: [`${m}`,'past',`${h12}`],           decoys: ['to',`${next}`,'half','quarter'] };
    return         { correct: [`${60-m}`,'to',`${next}`],               decoys: ['past',`${h12}`,'half','quarter'] };
  }
  if (lang === 'it') {
    if (m === 0)  return h12===1 ? {correct:["l'una"],decoys:['le','e','mezza','meno']} : {correct:['le',`${h12}`],decoys:["l'una",'e','mezza','meno']};
    if (m === 30) return h12===1 ? {correct:["l'una",'e','mezza'],decoys:['le','meno','un','quarto']} : {correct:['le',`${h12}`,'e','mezza'],decoys:["l'una",'meno','un','quarto']};
    if (m === 15) return { correct: ['le',`${h12}`,'e','un','quarto'],   decoys: ["l'una",'meno','mezza',`${next}`] };
    if (m === 45) return { correct: ['le',`${next}`,'meno','un','quarto'],decoys: [`${h12}`,'e','mezza','dopo'] };
    return         { correct: ['le',`${h12}`,'e',`${m.toString().padStart(2,'0')}`], decoys: ['meno',`${next}`,'mezza','quarto'] };
  }
  if (lang === 'ja') {
    if (m === 0)  return { correct: [`${h12}`, '時'],                    decoys: ['半','分','30','15'] };
    if (m === 30) return { correct: [`${h12}`, '時半'],                  decoys: ['分',`${m}`,`${next}`,'時'] };
    return         { correct: [`${h12}`, '時', `${m.toString().padStart(2,'0')}`, '分'], decoys: [`${next}`,`${60-m}`,'半'] };
  }
  return { correct: [fmtTime(h, m, lang)], decoys: [] };
}

const LANGS = {
  de: {
    name:'Deutsch', flag:'🇩🇪',
    appTitle:'⏰ Stell die Uhr!', appSub:'Lerne die Uhr lesen und stellen',
    whoPlays:'Wer spielt?', newProfile:'Neues Profil', profileName:'Name eingeben…',
    modes:['Uhr lesen','Zeiger stellen','Text → Uhr','Uhr → Satz'],
    levels:['Einfach','Mittel','Schwer'],
    correct:'Richtig', total:'Gesamt', streak:'Serie', level:'Stufe:',
    check:'Prüfen', next:'Weiter ➜', hint:'Tipp 💡', reset:'↺',
    readTask:()=>'Wie viel Uhr ist es?', readSub:()=>'Wähle die richtige Antwort.',
    setTask:(h,m)=>`Stelle die Uhr auf: ${fmtTime(h,m,'de')}`, setSub:()=>'Ziehe den blauen Griff (Stunden) und grauen Griff (Minuten).',
    textSetTask:()=>'Stelle die Zeiger richtig!', textSetSub:()=>'Lies den Text und stelle die Uhr entsprechend ein.',
    wordTask:()=>'Richtige Reihenfolge?', wordSub:()=>'Tippe die Wörter in der richtigen Reihenfolge.',
    wordBankLabel:'Verfügbare Wörter:', wordAnswerLabel:'Deine Antwort:',
    settingsTitle:'Einstellungen', timerLabel:'Zeitlimit', speechLabel:'Vorlesen',
    soundLabel:'Ton', langLabel:'Sprache', resetLabel:'Fortschritt zurücksetzen',
    timerOpts:['Aus','5s','10s','15s'], badgesTitle:'Abzeichen',
    dailyText:'Tagesaufgabe:', on:'EIN', off:'AUS',
    pathLabel:'Lernpfad',
    fb:{ correct:'Super gemacht! 🌟', wrong:'Fast! Versuch es nochmal.', hint:'Kurzer Zeiger = Stunden, langer Zeiger = Minuten.' }
  },
  it: {
    name:'Italiano', flag:'🇮🇹',
    appTitle:"⏰ Metti l'orologio!", appSub:"Impara a leggere l'orologio",
    whoPlays:'Chi gioca?', newProfile:'Nuovo profilo', profileName:'Inserisci il nome…',
    modes:["Leggere l'ora","Spostare le lancette","Testo → Orologio","Orologio → Frase"],
    levels:['Facile','Medio','Difficile'],
    correct:'Corretti', total:'Totale', streak:'Serie', level:'Livello:',
    check:'Verifica', next:'Avanti ➜', hint:'Suggerimento 💡', reset:'↺',
    readTask:()=>"Che ora è?", readSub:()=>'Scegli la risposta corretta.',
    setTask:(h,m)=>`Metti l'orologio alle ${fmtTime(h,m,'it')}`, setSub:()=>'Trascina il cerchio blu (ore) e grigio (minuti).',
    textSetTask:()=>"Imposta le lancette!", textSetSub:()=>"Leggi il testo e imposta l'orologio.",
    wordTask:()=>"Ordine corretto?", wordSub:()=>"Tocca le parole nell'ordine corretto.",
    wordBankLabel:'Parole disponibili:', wordAnswerLabel:'La tua risposta:',
    settingsTitle:'Impostazioni', timerLabel:'Timer', speechLabel:'Leggi ad alta voce',
    soundLabel:'Suono', langLabel:'Lingua', resetLabel:'Azzera i progressi',
    timerOpts:['No','5s','10s','15s'], badgesTitle:'Medaglie',
    dailyText:'Compito del giorno:', on:'SÌ', off:'NO',
    pathLabel:'Percorso',
    fb:{ correct:'Bravo! 🌟', wrong:'Quasi! Riprova.', hint:'Lancetta corta = ore, lunga = minuti.' }
  },
  en: {
    name:'English', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    appTitle:'⏰ Set the Clock!', appSub:'Learn to read and set the clock',
    whoPlays:'Who is playing?', newProfile:'New profile', profileName:'Enter name…',
    modes:['Read the clock','Set the clock','Text → Clock','Clock → Sentence'],
    levels:['Easy','Medium','Hard'],
    correct:'Correct', total:'Total', streak:'Streak', level:'Level:',
    check:'Check', next:'Next ➜', hint:'Hint 💡', reset:'↺',
    readTask:()=>'What time is it?', readSub:()=>'Choose the correct time.',
    setTask:(h,m)=>`Set the clock to ${fmtTime(h,m,'en')}`, setSub:()=>'Drag the blue handle (hours) and grey handle (minutes).',
    textSetTask:()=>'Set the hands correctly!', textSetSub:()=>'Read the text and set the clock.',
    wordTask:()=>'Correct order?', wordSub:()=>'Tap the words in the correct order.',
    wordBankLabel:'Available words:', wordAnswerLabel:'Your answer:',
    settingsTitle:'Settings', timerLabel:'Time limit', speechLabel:'Read aloud',
    soundLabel:'Sound', langLabel:'Language', resetLabel:'Reset progress',
    timerOpts:['Off','5s','10s','15s'], badgesTitle:'Badges',
    dailyText:'Daily task:', on:'ON', off:'OFF',
    pathLabel:'Learning path',
    fb:{ correct:'Well done! 🌟', wrong:'Almost! Try again.', hint:'Short hand = hours, long hand = minutes.' }
  },
  ja: {
    name:'日本語', flag:'🇯🇵',
    appTitle:'⏰ 時計を合わせよう！', appSub:'時計の読み方と合わせ方を練習しよう',
    whoPlays:'だれがやる？', newProfile:'新しいプロフィール', profileName:'名前を入力…',
    modes:['時計を読む','針を合わせる','テキスト→時計','時計→文章'],
    levels:['かんたん','ふつう','むずかしい'],
    correct:'正解', total:'合計', streak:'連続', level:'レベル:',
    check:'確認', next:'次へ ➜', hint:'ヒント 💡', reset:'↺',
    readTask:()=>'何時ですか？', readSub:()=>'正しい時刻を選んでください。',
    setTask:(h,m)=>`${fmtTime(h,m,'ja')}に合わせてください`, setSub:()=>'青いハンドル（時）と灰色のハンドル（分）をドラッグ。',
    textSetTask:()=>'針を正しく合わせてください！', textSetSub:()=>'テキストを読んで時計を合わせてください。',
    wordTask:()=>'正しい順番は？', wordSub:()=>'正しい順番で言葉をタップしてください。',
    wordBankLabel:'使える言葉：', wordAnswerLabel:'あなたの答え：',
    settingsTitle:'設定', timerLabel:'タイマー', speechLabel:'読み上げ',
    soundLabel:'サウンド', langLabel:'言語', resetLabel:'進捗をリセット',
    timerOpts:['なし','5秒','10秒','15秒'], badgesTitle:'バッジ',
    dailyText:'今日の課題：', on:'オン', off:'オフ',
    pathLabel:'学習パス',
    fb:{ correct:'よくできました！🌟', wrong:'惜しい！もう一度。', hint:'短い針が時、長い針が分です。' }
  }
};

const DIFFS = {
  0: { minutes: [0, 30] },
  1: { minutes: [0, 15, 30, 45] },
  2: { minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] }
};
