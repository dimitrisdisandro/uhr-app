// app.js — main application logic

// ── Storage helpers ───────────────────────────────────────────────
const Store = {
  get(k, def) { try { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):def; } catch(e){return def;} },
  set(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};

// ── Settings ──────────────────────────────────────────────────────
let settings = Store.get('settings', { lang:'de', sound:true, speech:true, timer:0 });
// timer: 0=off, 5, 10, 15 seconds

// ── Profiles ──────────────────────────────────────────────────────
// profile = { id, name, emoji, lang, stats:{totalAll,correctAll,bestStreak,perfectRun,modesUsed,langsUsed,dailyStreak,lastDay}, earned:[], sessionCorrect, sessionTotal, sessionStreak, diff, mode }
function loadProfiles() { return Store.get('profiles', []); }
function saveProfiles(p) { Store.set('profiles', p); }

const EMOJIS = ['🧒','👦','👧','🧑','🌟','🚀','🦁','🐯','🐸','🦊','🦋','🎮'];

let profiles = loadProfiles();
let currentProfile = null;
let currentProfileIdx = -1;

// ── Game state ────────────────────────────────────────────────────
let G = {
  mode: 0, diff: 0,
  tH: 3, tM: 0,
  uH: 6, uM: 0,
  answered: false,
  dragging: null,
  wordAnswer: [], wordBank: [],
  timerInterval: null,
  timerRemaining: 0,
  dailyDone: 0,
  dailyTotal: 5
};

// Learning path: 8 steps, each requires N correct answers total
const PATH_THRESHOLDS = [0, 3, 8, 15, 25, 40, 60, 85, 120];
function getPathStep(totalAll) {
  let step = 0;
  for (let i = 0; i < PATH_THRESHOLDS.length; i++) { if (totalAll >= PATH_THRESHOLDS[i]) step = i; }
  return Math.min(step, PATH_THRESHOLDS.length - 1);
}

// Adaptive: track which times are hard
function recordAttempt(h, m, correct) {
  if (!currentProfile) return;
  const key = `${h}:${m}`;
  const w = currentProfile.weights = currentProfile.weights || {};
  if (!w[key]) w[key] = { attempts: 0, wrong: 0 };
  w[key].attempts++;
  if (!correct) w[key].wrong++;
}

function randTime(diff) {
  const mins = DIFFS[diff].minutes;
  // Adaptive: give harder times more weight
  if (currentProfile && currentProfile.weights) {
    const pool = [];
    for (let h = 1; h <= 12; h++) {
      for (const m of mins) {
        const key = `${h}:${m}`;
        const w = currentProfile.weights[key];
        const weight = w ? Math.max(1, w.wrong * 2 + 1) : 1;
        for (let i = 0; i < weight; i++) pool.push({h, m});
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return { h: Math.floor(Math.random()*12)+1, m: mins[Math.floor(Math.random()*mins.length)] };
}

function wrongAnswers(h, m, lang, diff) {
  const pool = [];
  const mins = DIFFS[diff].minutes;
  const correct = fmtTime(h, m, lang);
  for (let dh = -3; dh <= 3; dh++) {
    for (const dm of mins) {
      if (dh===0 && dm===m) continue;
      const wh = ((h-1+dh+12)%12)+1;
      const txt = fmtTime(wh, dm, lang);
      if (txt !== correct) pool.push(txt);
    }
  }
  return [...new Set(pool)].sort(()=>Math.random()-.5).slice(0, 3);
}

// ── Confetti ──────────────────────────────────────────────────────
function launchConfetti() {
  const cel = document.getElementById('celebrate');
  cel.style.display = 'block'; cel.innerHTML = '';
  const cols = ['#2563eb','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2'];
  for (let i = 0; i < 42; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random()*100+'%'; c.style.top = '-10px';
    c.style.background = cols[Math.floor(Math.random()*cols.length)];
    c.style.animationDelay = Math.random()*.5+'s';
    c.style.animationDuration = (.7+Math.random()*.6)+'s';
    c.style.width = (8+Math.random()*8)+'px'; c.style.height = (8+Math.random()*8)+'px';
    cel.appendChild(c);
  }
  setTimeout(()=>{ cel.style.display='none'; cel.innerHTML=''; }, 1500);
}

// ── Badge toast ───────────────────────────────────────────────────
function showBadgeToast(badges, lang) {
  const toast = document.getElementById('badge-toast');
  const b = badges[0];
  toast.textContent = b.icon + ' ' + Badges.getLabel(b, lang) + '!';
  toast.style.display = 'block';
  Audio.play('badge');
  setTimeout(()=>{ toast.style.display='none'; }, 3000);
}

// ── Profile save ──────────────────────────────────────────────────
function saveCurrentProfile() {
  if (currentProfileIdx < 0) return;
  profiles[currentProfileIdx] = currentProfile;
  saveProfiles(profiles);
}

// ── Daily task ────────────────────────────────────────────────────
function checkDaily() {
  if (!currentProfile) return;
  const today = new Date().toDateString();
  if (!currentProfile.stats.lastDay) currentProfile.stats.lastDay = '';
  if (currentProfile.stats.lastDay !== today) {
    // New day
    const yesterday = new Date(Date.now()-86400000).toDateString();
    if (currentProfile.stats.lastDay === yesterday) {
      currentProfile.stats.dailyStreak = (currentProfile.stats.dailyStreak||0) + 1;
    } else {
      currentProfile.stats.dailyStreak = 1;
    }
    currentProfile.stats.lastDay = today;
    currentProfile.dailyDone = 0;
    saveCurrentProfile();
  }
  G.dailyDone = currentProfile.dailyDone || 0;
  renderDailyBanner();
}

function renderDailyBanner() {
  const L = LANGS[settings.lang];
  const banner = document.getElementById('daily-banner');
  const done = G.dailyDone;
  const total = G.dailyTotal;
  if (done >= total) { banner.style.display='none'; return; }
  banner.style.display = 'flex';
  document.getElementById('daily-text').textContent = L.dailyText + ' ' + done + '/' + total;
  const dots = document.getElementById('daily-dots');
  dots.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'daily-dot' + (i < done ? ' done' : '');
    dots.appendChild(d);
  }
}

// ── Timer ─────────────────────────────────────────────────────────
function startTimer() {
  if (settings.timer === 0) return;
  clearInterval(G.timerInterval);
  G.timerRemaining = settings.timer;
  const wrap = document.getElementById('timer-bar-wrap');
  const bar = document.getElementById('timer-bar');
  wrap.style.display = 'block';
  bar.style.width = '100%';
  bar.classList.remove('urgent');
  G.timerInterval = setInterval(()=>{
    G.timerRemaining -= 0.1;
    const pct = Math.max(0, (G.timerRemaining / settings.timer) * 100);
    bar.style.width = pct + '%';
    if (G.timerRemaining <= settings.timer * 0.3) bar.classList.add('urgent');
    if (G.timerRemaining <= 0) {
      clearInterval(G.timerInterval);
      if (!G.answered) timeOut();
    }
  }, 100);
}

function stopTimer() {
  clearInterval(G.timerInterval);
  document.getElementById('timer-bar-wrap').style.display = 'none';
}

function timeOut() {
  const L = LANGS[settings.lang];
  G.answered = true;
  G.timerInterval = null;
  Audio.play('wrong');
  currentProfile.stats.bestStreak = Math.max(currentProfile.stats.bestStreak||0, currentProfile.sessionStreak||0);
  currentProfile.sessionStreak = 0;
  const fb = document.getElementById('feedback');
  fb.className = 'fb-error';
  fb.textContent = '⏱ ' + fmtTime(G.tH, G.tM, settings.lang);
  currentProfile.stats.totalAll = (currentProfile.stats.totalAll||0) + 1;
  saveCurrentProfile();
  renderScores();
  const btnRow = document.getElementById('btn-row');
  btnRow.innerHTML = '';
  addNextBtn(btnRow, L);
}

// ── Screens ───────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
}

// ── Profile Screen ────────────────────────────────────────────────
function renderProfileScreen() {
  const L = LANGS[settings.lang];
  document.getElementById('ph-title').textContent = L.whoPlays;
  document.getElementById('btn-add-profile').textContent = '+ ' + L.newProfile;
  renderProfileList();
  renderLangBarProfile();
}

function renderLangBarProfile() {
  const lb = document.getElementById('lang-bar-profile');
  lb.innerHTML = '';
  Object.entries(LANGS).forEach(([k, L])=>{
    const b = document.createElement('button'); b.className = 'lang-btn'+(k===settings.lang?' active':'');
    b.textContent = L.flag+' '+L.name;
    b.onclick = ()=>{ Audio.play('tick'); settings.lang=k; Store.set('settings',settings); renderProfileScreen(); };
    lb.appendChild(b);
  });
}

function renderProfileList() {
  const list = document.getElementById('profile-list');
  // Remove all non-form children
  [...list.children].forEach(c=>{ if(!c.classList.contains('new-profile-form')) c.remove(); });

  profiles.forEach((p, i)=>{
    const card = document.createElement('div'); card.className = 'profile-card';
    const av = document.createElement('div'); av.className = 'profile-avatar';
    av.style.background = profileColor(i); av.textContent = p.emoji || '🧒';
    const info = document.createElement('div'); info.className = 'profile-info';
    const name = document.createElement('div'); name.className = 'profile-name'; name.textContent = p.name;
    const stats = document.createElement('div'); stats.className = 'profile-stats';
    const total = p.stats?.totalAll || 0;
    const correct = p.stats?.correctAll || 0;
    stats.textContent = `${correct}/${total} ✓  🔥${p.stats?.dailyStreak||0}`;
    info.appendChild(name); info.appendChild(stats);
    const del = document.createElement('button'); del.className = 'profile-del'; del.textContent = '×';
    del.onclick = (e)=>{ e.stopPropagation(); if(confirm('Profil löschen?')){profiles.splice(i,1);saveProfiles(profiles);renderProfileList();} };
    card.appendChild(av); card.appendChild(info); card.appendChild(del);
    card.onclick = ()=>{ Audio.play('tick'); selectProfile(i); };
    list.insertBefore(card, list.firstChild);
  });
}

function profileColor(i) {
  const cols = ['#dbeafe','#dcfce7','#fef3c7','#ede9fe','#fee2e2','#e0f2fe'];
  return cols[i % cols.length];
}

let newProfileForm = null;
document.getElementById('btn-add-profile').onclick = ()=>{
  if (newProfileForm) return;
  const L = LANGS[settings.lang];
  const form = document.createElement('div'); form.className = 'new-profile-form';
  newProfileForm = form;
  const inp = document.createElement('input'); inp.placeholder = L.profileName; inp.maxLength = 20;
  const picker = document.createElement('div'); picker.className = 'emoji-picker';
  let selEmoji = EMOJIS[0];
  EMOJIS.forEach(em=>{
    const opt = document.createElement('span'); opt.className = 'emoji-opt'+(em===selEmoji?' selected':'');
    opt.textContent = em;
    opt.onclick = ()=>{ selEmoji=em; picker.querySelectorAll('.emoji-opt').forEach(x=>x.classList.remove('selected')); opt.classList.add('selected'); };
    picker.appendChild(opt);
  });
  const btns = document.createElement('div'); btns.className = 'form-btns';
  const saveBtn = document.createElement('button'); saveBtn.className = 'btn btn-primary'; saveBtn.textContent = '✓';
  saveBtn.onclick = ()=>{
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    const p = { id: Date.now(), name, emoji: selEmoji, stats:{ totalAll:0,correctAll:0,bestStreak:0,perfectRun:0,dailyStreak:0,lastDay:'',modesUsed:[],langsUsed:[] }, earned:[], sessionCorrect:0, sessionTotal:0, sessionStreak:0, dailyDone:0, weights:{} };
    profiles.push(p); saveProfiles(profiles);
    form.remove(); newProfileForm=null;
    renderProfileList();
  };
  const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn'; cancelBtn.textContent = '×';
  cancelBtn.onclick = ()=>{ form.remove(); newProfileForm=null; };
  btns.appendChild(cancelBtn); btns.appendChild(saveBtn);
  form.appendChild(inp); form.appendChild(picker); form.appendChild(btns);
  document.getElementById('profile-list').appendChild(form);
  inp.focus();
};

function selectProfile(idx) {
  currentProfile = profiles[idx];
  currentProfileIdx = idx;
  // Restore sets from arrays
  if (Array.isArray(currentProfile.stats.modesUsed)) currentProfile.stats.modesUsed = new Set(currentProfile.stats.modesUsed);
  else currentProfile.stats.modesUsed = new Set();
  if (Array.isArray(currentProfile.stats.langsUsed)) currentProfile.stats.langsUsed = new Set(currentProfile.stats.langsUsed);
  else currentProfile.stats.langsUsed = new Set();
  // Restore session
  currentProfile.sessionCorrect = currentProfile.sessionCorrect || 0;
  currentProfile.sessionTotal   = currentProfile.sessionTotal   || 0;
  currentProfile.sessionStreak  = currentProfile.sessionStreak  || 0;
  G.mode = currentProfile.lastMode || 0;
  G.diff = currentProfile.lastDiff || 0;
  checkDaily();
  showScreen('app');
  renderApp();
}

// ── App Screen ────────────────────────────────────────────────────
function renderApp() {
  const L = LANGS[settings.lang];
  document.getElementById('app-title') && (document.getElementById('app-title').textContent = L.appTitle);
  document.getElementById('player-name-display').textContent = (currentProfile.emoji||'') + ' ' + currentProfile.name;
  renderModeTabs();
  renderDifficulty();
  renderScores();
  renderPathRow();
  renderDailyBanner();
  Badges.render(currentProfile.earned, settings.lang);
  document.getElementById('lbl-badges').textContent = L.badgesTitle;
  newTask();
  renderTask();
}

function renderModeTabs() {
  const L = LANGS[settings.lang];
  const mt = document.getElementById('mode-tabs'); mt.innerHTML = '';
  const step = getPathStep(currentProfile.stats.totalAll||0);
  // Unlock modes progressively: mode 0 always, 1 after step 1, 2 after step 2, 3 after step 3
  const unlockAt = [0, 1, 2, 3];
  L.modes.forEach((m, i)=>{
    const b = document.createElement('button');
    const locked = step < unlockAt[i];
    b.className = 'mode-tab' + (i===G.mode?' active':'') + (locked?' locked-tab':'');
    b.textContent = (locked?'🔒 ':'')+m;
    b.onclick = ()=>{ if(locked)return; Audio.play('tick'); G.mode=i; currentProfile.lastMode=i; saveCurrentProfile(); newTask(); renderTask(); renderModeTabs(); };
    mt.appendChild(b);
  });
}

function renderDifficulty() {
  const L = LANGS[settings.lang];
  const dr = document.getElementById('difficulty-row');
  document.getElementById('lbl-level').textContent = L.level;
  dr.querySelectorAll('.diff-btn').forEach(b=>b.remove());
  L.levels.forEach((lv, i)=>{
    const b = document.createElement('button'); b.className = 'diff-btn'+(i===G.diff?' active':'');
    b.textContent = lv;
    b.onclick = ()=>{ Audio.play('tick'); G.diff=i; currentProfile.lastDiff=i; saveCurrentProfile(); newTask(); renderApp(); };
    dr.appendChild(b);
  });
}

function renderScores() {
  const L = LANGS[settings.lang];
  document.getElementById('lbl-correct').textContent = L.correct;
  document.getElementById('lbl-total').textContent   = L.total;
  document.getElementById('lbl-streak').textContent  = L.streak;
  document.getElementById('score-correct').textContent = currentProfile.sessionCorrect || 0;
  document.getElementById('score-total').textContent   = currentProfile.sessionTotal   || 0;
  const str = currentProfile.sessionStreak || 0;
  document.getElementById('score-streak').textContent = str>0 ? '⭐'.repeat(Math.min(str,5)) : '—';
  const tot = currentProfile.sessionTotal || 0;
  const cor = currentProfile.sessionCorrect || 0;
  document.getElementById('progress-bar').style.width = (tot>0?Math.round(cor/tot*100):0)+'%';
}

function renderPathRow() {
  const row = document.getElementById('path-row');
  row.innerHTML = '';
  const step = getPathStep(currentProfile.stats.totalAll||0);
  const icons = ['🌱','⭐','🌙','🌟','🔥','💫','🏆','👑','🎓'];
  PATH_THRESHOLDS.forEach((thresh, i)=>{
    const el = document.createElement('div');
    let cls = 'path-step';
    if (i < step) cls += ' done';
    else if (i === step) cls += ' current';
    else cls += ' locked';
    el.className = cls;
    el.textContent = icons[i] || i;
    el.title = thresh > 0 ? `${thresh} ✓` : 'Start';
    row.appendChild(el);
  });
}

// ── Back button ───────────────────────────────────────────────────
document.getElementById('btn-back').onclick = ()=>{
  stopTimer();
  // Save sets as arrays before storing
  if (currentProfile) {
    currentProfile.stats.modesUsed = [...(currentProfile.stats.modesUsed||new Set())];
    currentProfile.stats.langsUsed = [...(currentProfile.stats.langsUsed||new Set())];
    saveCurrentProfile();
  }
  showScreen('profile');
  renderProfileScreen();
};

// ── Settings Screen ───────────────────────────────────────────────
document.getElementById('btn-settings').onclick = ()=>{ renderSettingsScreen(); showScreen('settings'); };
document.getElementById('btn-settings-back').onclick = ()=>{ showScreen('app'); renderApp(); };

function renderSettingsScreen() {
  const L = LANGS[settings.lang];
  document.getElementById('settings-title').textContent = L.settingsTitle;
  document.getElementById('lbl-timer-setting').textContent = L.timerLabel;
  document.getElementById('lbl-speech-setting').textContent = L.speechLabel;
  document.getElementById('lbl-sound-setting').textContent = L.soundLabel;
  document.getElementById('lbl-lang-setting').textContent = L.langLabel;
  document.getElementById('lbl-reset').textContent = L.resetLabel;

  // Timer options
  const to = document.getElementById('timer-options'); to.innerHTML = '';
  [0,5,10,15].forEach((v,i)=>{
    const b = document.createElement('button'); b.className='timer-opt'+(settings.timer===v?' active':'');
    b.textContent = L.timerOpts[i];
    b.onclick=()=>{ settings.timer=v; Store.set('settings',settings); renderSettingsScreen(); };
    to.appendChild(b);
  });

  // Speech toggle
  const sp = document.getElementById('btn-speech-toggle');
  sp.textContent = Audio.isSpeechOn() ? L.on : L.off;
  sp.className = 'toggle-btn' + (Audio.isSpeechOn()?' on':'');
  sp.onclick = ()=>{ Audio.setSpeechEnabled(!Audio.isSpeechOn()); renderSettingsScreen(); };

  // Sound toggle
  const snd = document.getElementById('btn-sound-toggle');
  snd.textContent = Audio.isSoundOn() ? L.on : L.off;
  snd.className = 'toggle-btn' + (Audio.isSoundOn()?' on':'');
  snd.onclick = ()=>{ Audio.setSoundEnabled(!Audio.isSoundOn()); renderSettingsScreen(); };

  // Lang
  const lb = document.getElementById('lang-bar-settings'); lb.innerHTML = '';
  Object.entries(LANGS).forEach(([k,Lv])=>{
    const b=document.createElement('button'); b.className='lang-btn'+(k===settings.lang?' active':'');
    b.textContent=Lv.flag+' '+Lv.name;
    b.onclick=()=>{ settings.lang=k; Store.set('settings',settings); renderSettingsScreen(); };
    lb.appendChild(b);
  });

  // Reset
  document.getElementById('btn-reset').onclick = ()=>{
    if (confirm('Wirklich zurücksetzen?')) {
      currentProfile.stats = { totalAll:0,correctAll:0,bestStreak:0,perfectRun:0,dailyStreak:0,lastDay:'',modesUsed:[],langsUsed:[] };
      currentProfile.earned = []; currentProfile.sessionCorrect=0; currentProfile.sessionTotal=0; currentProfile.sessionStreak=0; currentProfile.weights={};
      saveCurrentProfile();
      showScreen('app'); renderApp();
    }
  };
}

// ── Drag setup ────────────────────────────────────────────────────
function setupDrag() {
  const svg = document.getElementById('clock-svg');
  svg.onmousedown = svg.ontouchstart = (e)=>{
    const t = e.target.closest('[data-hand]'); if(!t) return;
    e.preventDefault(); G.dragging = t.dataset.hand; svg.style.cursor='grabbing';
  };
  const onMove = (e)=>{
    if (!G.dragging) return; e.preventDefault();
    const ang = Clock.getAngle(e);
    if (G.dragging==='hour') { const nH=Clock.snapH(ang); if(nH!==G.uH){G.uH=nH;Audio.play('drag');} }
    else { const nM=Clock.snapM(ang,G.diff); if(nM!==G.uM){G.uM=nM;Audio.play('drag');} }
    Clock.draw(document.getElementById('clock-svg'), G.uH, G.uM, true, G.dragging);
  };
  const onUp = ()=>{ G.dragging=null; document.getElementById('clock-svg').style.cursor='default'; Clock.draw(document.getElementById('clock-svg'),G.uH,G.uM,true,null); };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, {passive:false});
  document.addEventListener('touchend', onUp);
}

// ── Hide helpers ──────────────────────────────────────────────────
function hideAll() {
  ['answer-grid','text-task-box','word-area'].forEach(id=>document.getElementById(id).style.display='none');
}

// ── Render Task ───────────────────────────────────────────────────
function renderTask() {
  const L = LANGS[settings.lang];
  const fb = document.getElementById('feedback');
  const btnRow = document.getElementById('btn-row');
  const ag = document.getElementById('answer-grid');
  fb.className='fb-neutral'; fb.textContent=''; btnRow.innerHTML=''; ag.innerHTML='';
  hideAll(); G.answered = false;
  stopTimer();

  // Track language and mode used
  if (currentProfile.stats.modesUsed instanceof Set) currentProfile.stats.modesUsed.add(G.mode);
  if (currentProfile.stats.langsUsed instanceof Set) currentProfile.stats.langsUsed.add(settings.lang);

  if (G.mode === 0) {
    // ── READ ──
    document.getElementById('task-text').textContent = L.readTask();
    document.getElementById('task-sub').textContent = L.readSub();
    document.getElementById('clock-wrap').style.display = 'flex';
    Clock.draw(document.getElementById('clock-svg'), G.tH, G.tM, false, null);
    if (settings.speech) Audio.speak(fmtTime(G.tH,G.tM,settings.lang)+'?', settings.lang);
    ag.style.display = 'grid';
    const wrong = wrongAnswers(G.tH, G.tM, settings.lang, G.diff);
    const opts = [...wrong, fmtTime(G.tH,G.tM,settings.lang)].sort(()=>Math.random()-.5);
    opts.forEach(opt=>{
      const b = document.createElement('button'); b.className='answer-btn'; b.textContent=opt;
      b.onclick=()=>{
        if (G.answered) return;
        G.answered=true; stopTimer(); Audio.play('tick');
        const ok = opt===fmtTime(G.tH,G.tM,settings.lang);
        setTimeout(()=>{
          handleResult(ok, L);
          b.classList.add(ok?'correct':'wrong');
          if (!ok) ag.querySelectorAll('.answer-btn').forEach(x=>{ if(x.textContent===fmtTime(G.tH,G.tM,settings.lang))x.classList.add('correct'); });
          ag.querySelectorAll('.answer-btn').forEach(x=>x.disabled=true);
          addNextBtn(btnRow, L);
        }, 80);
      };
      ag.appendChild(b);
    });
    startTimer();

  } else if (G.mode === 1) {
    // ── SET ──
    document.getElementById('task-text').textContent = L.setTask(G.tH, G.tM);
    document.getElementById('task-sub').textContent = L.setSub();
    document.getElementById('clock-wrap').style.display = 'flex';
    G.uH = ((G.tH+3)%12)||12; G.uM = 0;
    Clock.draw(document.getElementById('clock-svg'), G.uH, G.uM, true, null);
    setupDrag();
    addHintAndCheck(btnRow, L, ()=>{
      const ok = G.uH%12===G.tH%12 && G.uM===G.tM;
      if (!ok) Clock.draw(document.getElementById('clock-svg'), G.tH, G.tM, false, null);
      return ok;
    });

  } else if (G.mode === 2) {
    // ── TEXT → CLOCK ──
    document.getElementById('task-text').textContent = L.textSetTask();
    document.getElementById('task-sub').textContent = L.textSetSub();
    document.getElementById('clock-wrap').style.display = 'flex';
    const tb = document.getElementById('text-task-box'); tb.style.display='block';
    document.getElementById('text-task-main').textContent = fmtTime(G.tH, G.tM, settings.lang);
    Audio.speak(fmtTime(G.tH, G.tM, settings.lang), settings.lang);
    G.uH = ((G.tH+4)%12)||12; G.uM = 0;
    Clock.draw(document.getElementById('clock-svg'), G.uH, G.uM, true, null);
    setupDrag();
    addHintAndCheck(btnRow, L, ()=>{
      const ok = G.uH%12===G.tH%12 && G.uM===G.tM;
      if (!ok) Clock.draw(document.getElementById('clock-svg'), G.tH, G.tM, false, null);
      return ok;
    });

  } else if (G.mode === 3) {
    // ── WORD ORDER ──
    document.getElementById('task-text').textContent = L.wordTask();
    document.getElementById('task-sub').textContent = L.wordSub();
    document.getElementById('clock-wrap').style.display = 'flex';
    Clock.draw(document.getElementById('clock-svg'), G.tH, G.tM, false, null);
    Audio.speak(fmtTime(G.tH, G.tM, settings.lang), settings.lang);
    const wa = document.getElementById('word-area'); wa.style.display='block'; wa.classList.remove('answered');
    const frag = getFragments(G.tH, G.tM, settings.lang);
    const allChips = [...frag.correct, ...frag.decoys.slice(0,3)].sort(()=>Math.random()-.5);
    G.wordAnswer = []; G.wordBank = [...allChips];
    const bank = document.getElementById('word-bank');
    const answerEl = document.getElementById('word-answer'); answerEl.innerHTML='';
    const ansLabel = document.createElement('span'); ansLabel.id='word-answer-label'; ansLabel.style.cssText='font-size:11px;color:var(--muted);width:100%;margin-bottom:3px;'; ansLabel.textContent=L.wordAnswerLabel;
    answerEl.appendChild(ansLabel);

    function rebuildChips() {
      bank.innerHTML='';
      G.wordBank.forEach((w,i)=>{
        const ch=document.createElement('div'); ch.className='word-chip'; ch.textContent=w;
        ch.onclick=()=>{ if(G.answered)return; Audio.play('place'); G.wordAnswer.push(w); G.wordBank.splice(i,1); rebuildChips(); rebuildAnswer(); };
        bank.appendChild(ch);
      });
    }
    function rebuildAnswer() {
      [...answerEl.children].forEach(c=>{ if(c.id!=='word-answer-label')c.remove(); });
      G.wordAnswer.forEach((w,i)=>{
        const ch=document.createElement('div'); ch.className='word-chip in-answer'; ch.textContent=w;
        ch.onclick=()=>{ if(G.answered)return; Audio.play('tick'); G.wordBank.push(w); G.wordAnswer.splice(i,1); rebuildChips(); rebuildAnswer(); };
        answerEl.appendChild(ch);
      });
    }
    rebuildChips();
    const clearBtn=document.createElement('button'); clearBtn.className='btn'; clearBtn.textContent=L.reset;
    clearBtn.onclick=()=>{ if(G.answered)return; Audio.play('tick'); G.wordBank=[...allChips].sort(()=>Math.random()-.5); G.wordAnswer=[]; rebuildChips(); rebuildAnswer(); };
    const checkBtn=document.createElement('button'); checkBtn.className='btn btn-primary'; checkBtn.textContent=L.check;
    checkBtn.onclick=()=>{
      if (G.answered||G.wordAnswer.length===0) return;
      G.answered=true; wa.classList.add('answered'); Audio.play('tick'); stopTimer();
      setTimeout(()=>{
        const ok = G.wordAnswer.join(' ')===frag.correct.join(' ');
        handleResult(ok, L);
        if (!ok) { const fb=document.getElementById('feedback'); fb.textContent += '  ✓ '+frag.correct.join(' '); }
        btnRow.innerHTML=''; addNextBtn(btnRow, L);
      }, 80);
    };
    btnRow.appendChild(clearBtn); btnRow.appendChild(checkBtn);
    startTimer();
  }
}

function addHintAndCheck(btnRow, L, checkFn) {
  const hintBtn=document.createElement('button'); hintBtn.className='btn'; hintBtn.textContent=L.hint;
  hintBtn.onclick=()=>{ Audio.play('tick'); const fb=document.getElementById('feedback'); fb.className='fb-neutral'; fb.textContent=L.fb.hint; };
  const checkBtn=document.createElement('button'); checkBtn.className='btn btn-primary'; checkBtn.textContent=L.check;
  checkBtn.onclick=()=>{
    if (G.answered) return;
    G.answered=true; stopTimer(); Audio.play('tick');
    setTimeout(()=>{
      const ok=checkFn();
      handleResult(ok, L);
      const btnRow=document.getElementById('btn-row'); btnRow.innerHTML='';
      addNextBtn(btnRow, L);
    }, 80);
  };
  btnRow.appendChild(hintBtn); btnRow.appendChild(checkBtn);
  startTimer();
}

function handleResult(ok, L) {
  const fb = document.getElementById('feedback');
  currentProfile.stats.totalAll   = (currentProfile.stats.totalAll||0)   + 1;
  currentProfile.sessionTotal     = (currentProfile.sessionTotal||0)     + 1;
  recordAttempt(G.tH, G.tM, ok);
  if (ok) {
    Audio.play('correct');
    currentProfile.stats.correctAll   = (currentProfile.stats.correctAll||0)   + 1;
    currentProfile.sessionCorrect     = (currentProfile.sessionCorrect||0)     + 1;
    currentProfile.sessionStreak     = (currentProfile.sessionStreak||0)     + 1;
    currentProfile.stats.bestStreak  = Math.max(currentProfile.stats.bestStreak||0, currentProfile.sessionStreak);
    currentProfile.stats.perfectRun  = (currentProfile.stats.perfectRun||0) + 1;
    // Daily
    if (G.dailyDone < G.dailyTotal) {
      G.dailyDone++; currentProfile.dailyDone = G.dailyDone;
      if (G.dailyDone >= G.dailyTotal) launchConfetti();
    }
    if (currentProfile.sessionStreak % 5 === 0) launchConfetti();
    fb.className='fb-success'; fb.textContent=L.fb.correct;
  } else {
    Audio.play('wrong');
    currentProfile.stats.bestStreak = Math.max(currentProfile.stats.bestStreak||0, currentProfile.sessionStreak||0);
    currentProfile.sessionStreak = 0;
    currentProfile.stats.perfectRun = 0;
    fb.className='fb-error'; fb.textContent=L.fb.wrong;
  }
  // Check badges
  const prevLen = (currentProfile.earned||[]).length;
  currentProfile.earned = Badges.check(currentProfile.stats, currentProfile.earned||[], settings.lang, showBadgeToast);
  if (currentProfile.earned.length > prevLen) Badges.render(currentProfile.earned, settings.lang);
  renderScores();
  renderPathRow();
  renderDailyBanner();
  // Save (convert sets to arrays)
  currentProfile.stats.modesUsed = [...(currentProfile.stats.modesUsed||new Set())];
  currentProfile.stats.langsUsed = [...(currentProfile.stats.langsUsed||new Set())];
  saveCurrentProfile();
  // Restore sets
  currentProfile.stats.modesUsed = new Set(currentProfile.stats.modesUsed);
  currentProfile.stats.langsUsed = new Set(currentProfile.stats.langsUsed);
}

function addNextBtn(btnRow, L) {
  const b=document.createElement('button'); b.className='btn btn-primary'; b.textContent=L.next;
  b.onclick=()=>{ Audio.play('tick'); newTask(); renderTask(); };
  btnRow.appendChild(b);
}

function newTask() {
  const {h,m}=randTime(G.diff); G.tH=h; G.tM=m;
}

// ── Service Worker registration ───────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

// ── Boot ──────────────────────────────────────────────────────────
Audio.setSoundEnabled(settings.sound !== false);
Audio.setSpeechEnabled(settings.speech !== false);
showScreen('profile');
renderProfileScreen();
