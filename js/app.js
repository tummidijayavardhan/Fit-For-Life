/* ============================================================
   Fit For Life — Application Logic
   ------------------------------------------------------------
   Single-page app. All state lives in localStorage on the
   user's device — nothing is ever sent to a server.

   State shape (localStorage key 'ffl_state_v1'):
   {
     profile: { name, age, gender, maternity, goal, equip, days },
     variant: 0,                    // bumped by "New Mix"
     logs: {                        // completed workouts
       '2026-08-16': { dayIndex, dayName, sets: { exId: [{w,r}] }, volume, ts }
     },
     activeSession: {               // in-progress workout (survives refresh)
       dayIndex, date, sets: { exId: [{w, r, done}] }
     }
   }
   ============================================================ */

const STORE_KEY = 'ffl_state_v1';

let state = loadState();
let screen = state.profile ? 'dashboard' : 'onboard';
let obStep = 0;                       // onboarding step index
let obDraft = {};                     // onboarding answers in progress
let currentDay = null;                // dayIndex when inside a workout
let timerHandle = null;

/* ================= persistence ================= */
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted -> start fresh */ }
  return { profile: null, variant: 0, logs: {}, activeSession: null };
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* ================= helpers ================= */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const todayKey = () => new Date().toISOString().slice(0, 10);

function getProgram() {
  return generateProgram(state.profile, currentWeekNumber(), state.variant || 0);
}

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.add('hidden'), ms);
}

function firstName() {
  return (state.profile?.name || 'Champ').trim().split(/\s+/)[0];
}

/* streak = consecutive days ending today/yesterday with a logged workout */
function calcStreak() {
  const days = Object.keys(state.logs).sort().reverse();
  if (!days.length) return 0;
  let streak = 0;
  const d = new Date();
  // allow the streak to be alive if the last workout was yesterday
  if (days[0] !== todayKey()) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (state.logs[key]) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function totalVolume() {
  return Object.values(state.logs).reduce((a, l) => a + (l.volume || 0), 0);
}

/* ================= render root ================= */
function render() {
  const app = $('#app');
  if (screen === 'onboard') app.innerHTML = renderOnboarding();
  else if (screen === 'dashboard') app.innerHTML = renderDashboard() + renderNav('home');
  else if (screen === 'workout') app.innerHTML = renderWorkout() + renderNav('home');
  else if (screen === 'progress') app.innerHTML = renderProgress() + renderNav('progress');
  else if (screen === 'profile') app.innerHTML = renderProfileScreen() + renderNav('profile');
  window.scrollTo(0, 0);
}

function go(s) { screen = s; render(); }

/* ================= onboarding ================= */
const OB_STEPS = ['welcome', 'name', 'gender', 'maternity', 'goal', 'equip', 'days'];

function activeObSteps() {
  // maternity step only applies to female users
  return OB_STEPS.filter((s) => s !== 'maternity' || obDraft.gender === 'female');
}

function renderOnboarding() {
  const steps = activeObSteps();
  const step = steps[obStep];
  const dots = steps.map((_, i) => `<span class="${i <= obStep ? 'on' : ''}"></span>`).join('');

  let body = '', canNext = false, nextLabel = 'Continue';

  if (step === 'welcome') {
    canNext = true; nextLabel = "Let's Begin 🚀";
    body = `
      <div class="brand-splash">
        <span class="logo">💪</span>
        <h1 class="mt-2">Fit <span class="grad-text">For Life</span></h1>
        <p class="muted mt-1">Your personal world-class trainer.<br/>Every body. Every goal. Anywhere on Earth.</p>
      </div>
      <div class="card mt-3">
        <h3>✨ What you get</h3>
        <ul class="cues mt-1">
          <li>A plan built for <b>you</b> — goal, gender &amp; equipment aware</li>
          <li>Video demos + pro coaching cues for every exercise</li>
          <li>Set-by-set logging with automatic rest timers</li>
          <li>Dedicated prenatal &amp; postpartum programs</li>
          <li>100% private — everything stays on your device</li>
        </ul>
      </div>`;
  }

  if (step === 'name') {
    canNext = !!(obDraft.name && obDraft.name.trim().length >= 2 && obDraft.age >= 13 && obDraft.age <= 100);
    body = `
      <h2>First, tell us about you 👋</h2>
      <p class="muted small mb-2">Your trainer needs to know who they're coaching.</p>
      <div class="field">
        <label>Your name</label>
        <input type="text" id="ob-name" placeholder="e.g. Alex" maxlength="40" value="${esc(obDraft.name || '')}"
               oninput="obDraft.name = this.value; obRefreshNext();" />
      </div>
      <div class="field">
        <label>Your age</label>
        <input type="number" id="ob-age" placeholder="e.g. 28" min="13" max="100" inputmode="numeric" value="${obDraft.age || ''}"
               oninput="obDraft.age = parseInt(this.value)||0; obRefreshNext();" />
      </div>`;
  }

  if (step === 'gender') {
    canNext = !!obDraft.gender;
    body = `
      <h2>How do you identify?</h2>
      <p class="muted small mb-2">We tailor muscle emphasis &amp; exercise selection accordingly.</p>
      <div class="choice-grid cols-2">
        ${choiceBtn('gender', 'male', '🙋‍♂️', 'Male', '')}
        ${choiceBtn('gender', 'female', '🙋‍♀️', 'Female', '')}
      </div>`;
  }

  if (step === 'maternity') {
    canNext = !!obDraft.maternity;
    body = `
      <h2>One important question 💛</h2>
      <p class="muted small mb-2">So we can keep every workout safe and effective for you.</p>
      <div class="choice-grid">
        ${choiceBtn('maternity', 'none', '💪', 'Neither', 'Standard programs for me')}
        ${choiceBtn('maternity', 'pregnant', '🤰', 'Currently pregnant', 'Gentle prenatal-safe training')}
        ${choiceBtn('maternity', 'postpartum', '👶', 'Recently a mother', 'Core-restore &amp; gentle strength')}
      </div>
      <p class="small muted mt-2">⚕️ Always get your doctor's OK before training during pregnancy or postpartum.</p>`;
  }

  if (step === 'goal') {
    canNext = !!obDraft.goal;
    body = `
      <h2>What's your main goal? 🎯</h2>
      <p class="muted small mb-2">This decides your sets, reps and rest periods.</p>
      <div class="choice-grid">
        ${choiceBtn('goal', 'loss', '🔥', 'Weight Loss', 'Higher reps, short rests, cardio finishers')}
        ${choiceBtn('goal', 'strength', '🏋️', 'Strength', 'Heavier sets, longer recovery, get powerful')}
        ${choiceBtn('goal', 'combo', '⚡', 'Weight Loss + Strength', 'The best of both worlds')}
      </div>`;
  }

  if (step === 'equip') {
    canNext = !!obDraft.equip;
    body = `
      <h2>Where will you train? 📍</h2>
      <p class="muted small mb-2">Every exercise will match exactly what you have.</p>
      <div class="choice-grid">
        ${choiceBtn('equip', 'commercial', '🏢', 'Commercial Gym', 'Machines, barbells, cables — full arsenal')}
        ${choiceBtn('equip', 'minimal', '🏠', 'Home / Medium Gym', 'Dumbbells, bands, a bench')}
        ${choiceBtn('equip', 'none', '🌍', 'No Equipment', 'Just you, anywhere on the planet')}
      </div>`;
  }

  if (step === 'days') {
    canNext = !!obDraft.days;
    body = `
      <h2>How many days a week? 📅</h2>
      <p class="muted small mb-2">Consistency beats intensity. Pick what you can truly keep.</p>
      <div class="choice-grid cols-3">
        ${choiceBtn('days', 3, '🌱', '3 Days', 'Full body')}
        ${choiceBtn('days', 4, '🌿', '4 Days', 'Upper / Lower')}
        ${choiceBtn('days', 5, '🌳', '5 Days', 'Pro split')}
      </div>`;
    nextLabel = 'Build My Plan ✨';
  }

  return `
    <div class="onboard">
      <div class="progress-dots">${dots}</div>
      <div class="onboard-body">${body}</div>
      <div class="mt-3" style="display:flex; gap:10px;">
        ${obStep > 0 ? `<button class="btn btn-ghost" onclick="obBack()">Back</button>` : ''}
        <button id="ob-next" class="btn btn-primary btn-block" ${canNext ? '' : 'disabled'} onclick="obNext()">${nextLabel}</button>
      </div>
    </div>`;
}

function choiceBtn(key, val, icon, title, desc) {
  const sel = String(obDraft[key]) === String(val) ? 'selected' : '';
  return `
    <div class="choice ${sel}" onclick="obPick('${key}', '${val}')">
      <span class="icon">${icon}</span>
      <div class="t">${title}</div>
      ${desc ? `<div class="d">${desc}</div>` : ''}
    </div>`;
}

function obPick(key, val) {
  obDraft[key] = key === 'days' ? parseInt(val) : val;
  if (key === 'gender' && val !== 'female') delete obDraft.maternity;
  render();
}

function obRefreshNext() {
  const ok = !!(obDraft.name && obDraft.name.trim().length >= 2 && obDraft.age >= 13 && obDraft.age <= 100);
  const btn = $('#ob-next');
  if (btn) btn.disabled = !ok;
}

function obBack() { if (obStep > 0) { obStep--; render(); } }

function obNext() {
  const steps = activeObSteps();
  if (obStep < steps.length - 1) { obStep++; render(); return; }
  // finish
  state.profile = {
    name: obDraft.name.trim(),
    age: obDraft.age,
    gender: obDraft.gender,
    maternity: obDraft.gender === 'female' ? (obDraft.maternity || 'none') : 'none',
    goal: obDraft.goal,
    equip: obDraft.equip,
    days: obDraft.days,
  };
  save();
  confetti();
  toast(`Welcome to the family, ${firstName()}! 🎉`);
  go('dashboard');
}

/* ================= bottom nav ================= */
function renderNav(active) {
  const item = (id, icon, label, s) => `
    <button class="${active === id ? 'on' : ''}" onclick="go('${s}')">
      <span class="ni">${icon}</span>${label}
    </button>`;
  return `
    <nav class="bottom-nav">
      ${item('home', '🏠', 'Home', 'dashboard')}
      ${item('progress', '📈', 'Progress', 'progress')}
      ${item('profile', '👤', 'Profile', 'profile')}
    </nav>`;
}

/* ================= dashboard ================= */
function renderDashboard() {
  const p = state.profile;
  const program = getProgram();
  const streak = calcStreak();
  const workouts = Object.keys(state.logs).length;
  const vol = totalVolume();
  const goalLabel = p.maternity === 'pregnant' ? 'Prenatal Program'
                  : p.maternity === 'postpartum' ? 'Postpartum Program'
                  : (GOAL_SCHEMES[p.goal]?.label || '');
  const doneToday = !!state.logs[todayKey()];
  const scheme = GOAL_SCHEMES[p.goal];

  const dayCards = program.map((day, i) => {
    const names = day.exercises.slice(0, 3).map((e) => EX_BY_ID[e.id].n).join(' • ');
    const isDoneToday = doneToday && state.logs[todayKey()].dayIndex === i;
    return `
      <div class="card day-card ${isDoneToday ? 'done-today' : ''}" onclick="openDay(${i})">
        <div class="day-icon">${day.icon}</div>
        <div class="day-info">
          <div class="dn">Day ${i + 1} · ${esc(day.name)} ${isDoneToday ? '<span class="badge badge-success">Done today</span>' : ''}</div>
          <div class="dm">${day.exercises.length} exercises · ${esc(names)}…</div>
        </div>
        <div class="chev">›</div>
      </div>`;
  }).join('');

  return `
    <div class="topbar">
      <div>
        <div class="hello">Hey, ${esc(firstName())} 👋</div>
        <div class="muted small">${greeting()}</div>
      </div>
    </div>

    <div class="card hero-card">
      <span class="badge badge-accent">${esc(goalLabel)}</span>
      <h2 class="mt-1">Your ${p.days}-Day Plan</h2>
      <p class="muted small mt-1">${esc(equipLabel(p.equip))} · rotates fresh exercises every week 🔄</p>
      ${scheme && p.maternity === 'none' ? `<p class="small mt-1" style="color:var(--accent)">💡 ${esc(scheme.tip)}</p>` : ''}
    </div>

    <div class="stat-row">
      <div class="stat"><div class="v">${streak}🔥</div><div class="l">Day streak</div></div>
      <div class="stat"><div class="v">${workouts}</div><div class="l">Workouts</div></div>
      <div class="stat"><div class="v">${vol >= 1000 ? (vol / 1000).toFixed(1) + 'k' : vol}</div><div class="l">Volume (kg·reps)</div></div>
    </div>

    <div class="section-head">
      <h2>This Week</h2>
      <button class="btn btn-ghost btn-sm" onclick="shufflePlan()">🎲 New Mix</button>
    </div>
    ${dayCards}
  `;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Rise and grind — the day is yours. ☀️';
  if (h < 17) return 'Perfect time to move that body. 💫';
  return 'Evening session? Legends train anytime. 🌙';
}

function equipLabel(e) {
  return { commercial: '🏢 Commercial gym', minimal: '🏠 Home / minimal equipment', none: '🌍 No equipment — train anywhere' }[e] || '';
}

function shufflePlan() {
  state.variant = (state.variant || 0) + 1;
  state.activeSession = null;    // plan changed — clear any half-done session
  save();
  toast('Fresh mix generated! 🎲');
  render();
}

/* ================= workout screen ================= */
function openDay(i) {
  currentDay = i;
  // start / resume session
  if (!state.activeSession || state.activeSession.dayIndex !== i || state.activeSession.date !== todayKey()) {
    const program = getProgram();
    const sets = {};
    program[i].exercises.forEach((e) => {
      sets[e.id] = Array.from({ length: e.sets }, () => ({ w: '', r: '', done: false }));
    });
    state.activeSession = { dayIndex: i, date: todayKey(), sets };
    save();
  }
  go('workout');
}

function renderWorkout() {
  const program = getProgram();
  const day = program[currentDay];
  const sess = state.activeSession;
  if (!day || !sess) { screen = 'dashboard'; return renderDashboard(); }

  const totalSets = Object.values(sess.sets).flat().length;
  const doneSets = Object.values(sess.sets).flat().filter((s) => s.done).length;

  const cards = day.exercises.map((slot, idx) => {
    const ex = EX_BY_ID[slot.id];
    const sets = sess.sets[slot.id] || [];
    const allDone = sets.length > 0 && sets.every((s) => s.done);
    const isTimed = ex.t === 'cardio' || ex.t === 'mobility' || ex.t === 'recovery';

    const muscleTags = ex.m.map((m, mi) =>
      `<span class="mt ${mi === 0 ? 'primary' : ''}">${mi === 0 ? '🎯 ' : ''}${esc(m)}</span>`).join('');

    const setRows = sets.map((s, si) => `
      <div class="set-row">
        <div class="sl">${si + 1}</div>
        <input type="number" inputmode="decimal" placeholder="${isTimed ? '—' : 'kg / lb'}" value="${esc(s.w)}"
               onchange="logSet('${slot.id}', ${si}, 'w', this.value)" ${isTimed ? 'disabled' : ''} />
        <input type="number" inputmode="numeric" placeholder="${isTimed ? 'secs' : 'reps'}" value="${esc(s.r)}"
               onchange="logSet('${slot.id}', ${si}, 'r', this.value)" />
        <button class="set-done ${s.done ? 'on' : ''}" onclick="toggleSet('${slot.id}', ${si}, ${slot.rest})">${s.done ? '✓' : '○'}</button>
      </div>`).join('');

    return `
      <div class="card ex-card ${idx === 0 ? 'open' : ''}" id="exc-${idx}">
        <div class="ex-head" onclick="toggleCard(${idx})">
          <div class="ex-num ${allDone ? 'completed' : ''}">${allDone ? '✓' : idx + 1}</div>
          <div class="ex-title">
            <div class="xn">${esc(ex.n)} ${slot.finisher ? '<span class="badge badge-warn">Finisher</span>' : ''}</div>
            <div class="xs">${slot.sets} sets × ${esc(slot.reps)} · rest ${slot.rest}s · 🎯 ${esc(ex.m[0])}</div>
          </div>
          <div class="chev">▾</div>
        </div>
        <div class="ex-body">
          <div class="muscle-tags">${muscleTags}</div>
          <div class="video-shell" id="vid-${idx}">
            <div class="video-load" onclick="loadVideo(${idx}, '${encodeURIComponent(ex.v)}')">
              <div class="play">▶</div>
              <div class="vt">Watch how to do it — close-up form demo</div>
            </div>
          </div>
          ${ex.note ? `<div class="safety-note">⚠️ ${esc(ex.note)}</div>` : ''}
          <ul class="cues">${ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
          <div class="set-table">
            <div class="set-row">
              <div class="set-head">Set</div><div class="set-head">${isTimed ? '—' : 'Weight'}</div>
              <div class="set-head">${isTimed ? 'Seconds' : 'Reps'}</div><div class="set-head">Done</div>
            </div>
            ${setRows}
          </div>
          <div class="rest-hint">✓ a set to auto-start your ${slot.rest}s rest timer</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="topbar">
      <button class="btn btn-ghost btn-sm" onclick="go('dashboard')">‹ Back</button>
      <span class="badge badge-accent">${doneSets}/${totalSets} sets</span>
    </div>
    <h1>${day.icon} ${esc(day.name)}</h1>
    <p class="muted small mb-2">Tap an exercise to see the video, cues &amp; log your sets.</p>
    ${cards}
    <button class="btn btn-primary btn-block mt-3" onclick="finishWorkout()">Finish Workout 🏁</button>
    <p class="center small muted mt-1">Progress saves on this device automatically.</p>
  `;
}

function toggleCard(idx) {
  $('#exc-' + idx)?.classList.toggle('open');
}

function loadVideo(idx, query) {
  // Privacy-friendly YouTube search-playlist embed — always finds current, working demos.
  const shell = $('#vid-' + idx);
  if (!shell) return;
  shell.innerHTML = `<iframe
      src="https://www.youtube-nocookie.com/embed?listType=search&list=${query}"
      title="Exercise demo" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen loading="lazy"></iframe>`;
}

function logSet(exId, si, field, val) {
  const s = state.activeSession?.sets?.[exId]?.[si];
  if (!s) return;
  s[field] = val;
  save();
}

function toggleSet(exId, si, rest) {
  const s = state.activeSession?.sets?.[exId]?.[si];
  if (!s) return;
  s.done = !s.done;
  save();
  if (s.done) startTimer(rest || 60);
  render();
}

function finishWorkout() {
  const sess = state.activeSession;
  if (!sess) return;
  const flat = Object.values(sess.sets).flat();
  const done = flat.filter((s) => s.done);
  if (!done.length) { toast('Complete at least one set first 💪'); return; }

  const volume = done.reduce((a, s) => a + (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0), 0);
  const program = getProgram();
  const day = program[sess.dayIndex];
  const setsRecord = {};
  for (const [exId, arr] of Object.entries(sess.sets)) {
    const d = arr.filter((s) => s.done).map((s) => ({ w: s.w, r: s.r }));
    if (d.length) setsRecord[exId] = d;
  }
  state.logs[sess.date] = {
    dayIndex: sess.dayIndex, dayName: day ? day.name : 'Workout',
    sets: setsRecord, volume: Math.round(volume), ts: Date.now(),
  };
  state.activeSession = null;
  save();
  confetti();
  toast(`Crushed it, ${firstName()}! ${done.length} sets logged 🎉`);
  go('progress');
}

/* ================= rest timer ================= */
function startTimer(seconds) {
  stopTimer();
  const overlay = $('#timer-overlay');
  let remaining = seconds;
  const R = 104, CIRC = 2 * Math.PI * R;

  const draw = () => {
    const frac = remaining / seconds;
    overlay.innerHTML = `
      <div class="timer-ring">
        <svg width="230" height="230" viewBox="0 0 230 230">
          <defs>
            <linearGradient id="tgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a78bfa"/>
            </linearGradient>
          </defs>
          <circle class="t-track" cx="115" cy="115" r="${R}" fill="none" stroke-width="12"/>
          <circle class="t-fill" cx="115" cy="115" r="${R}" fill="none" stroke-width="12"
                  stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - frac)}"/>
        </svg>
        <div class="timer-num"><div class="tn">${remaining}</div><div class="tl">Rest · breathe</div></div>
      </div>
      <div class="timer-actions">
        <button class="btn btn-ghost" onclick="extendTimer(15)">+15s</button>
        <button class="btn btn-primary" onclick="stopTimer()">Skip ▸</button>
      </div>`;
  };

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  draw();

  timerHandle = setInterval(() => {
    remaining--;
    if (remaining <= 0) { beep(); stopTimer(); toast('Rest over — next set! 💥'); return; }
    if (remaining <= 3) beep(660, 0.08);
    draw();
  }, 1000);

  overlay._extend = (s) => { remaining += s; draw(); };
}

function extendTimer(s) { $('#timer-overlay')._extend?.(s); }

function stopTimer() {
  clearInterval(timerHandle);
  timerHandle = null;
  const overlay = $('#timer-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

/* short beep via WebAudio — no audio files needed */
let audioCtx = null;
function beep(freq = 880, dur = 0.18) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.25, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* audio blocked — fine */ }
}

/* ================= progress screen ================= */
function renderProgress() {
  const entries = Object.entries(state.logs).sort((a, b) => b[0].localeCompare(a[0]));
  const streak = calcStreak();
  const vol = totalVolume();

  /* this-week strip (Mon..Sun) */
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const strip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const hit = !!state.logs[key];
    const label = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i];
    return `<div class="wd"><div class="wl">${label}</div><div class="wc ${hit ? 'hit' : ''}">${hit ? '✓' : ''}</div></div>`;
  }).join('');

  /* personal bests: heaviest weight per exercise */
  const bests = {};
  for (const log of Object.values(state.logs)) {
    for (const [exId, sets] of Object.entries(log.sets || {})) {
      for (const s of sets) {
        const w = parseFloat(s.w) || 0;
        if (w > (bests[exId]?.w || 0)) bests[exId] = { w, r: s.r };
      }
    }
  }
  const bestRows = Object.entries(bests)
    .sort((a, b) => b[1].w - a[1].w).slice(0, 5)
    .map(([exId, b]) => {
      const ex = EX_BY_ID[exId];
      return ex ? `<div class="history-item"><div class="hi">🏆</div>
        <div class="hd"><div class="hn">${esc(ex.n)}</div><div class="hm">Best: ${b.w} × ${esc(b.r || '?')} reps</div></div></div>` : '';
    }).join('');

  const history = entries.slice(0, 30).map(([date, log]) => {
    const nice = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const setCount = Object.values(log.sets || {}).flat().length;
    return `<div class="history-item"><div class="hi">✅</div>
      <div class="hd"><div class="hn">${esc(log.dayName)}</div>
      <div class="hm">${nice} · ${setCount} sets${log.volume ? ` · ${log.volume} kg·reps` : ''}</div></div></div>`;
  }).join('');

  return `
    <h1>Progress 📈</h1>
    <div class="stat-row">
      <div class="stat"><div class="v">${streak}🔥</div><div class="l">Streak</div></div>
      <div class="stat"><div class="v">${entries.length}</div><div class="l">Workouts</div></div>
      <div class="stat"><div class="v">${vol >= 1000 ? (vol / 1000).toFixed(1) + 'k' : vol}</div><div class="l">Volume</div></div>
    </div>
    <div class="card"><h3>This Week</h3><div class="week-strip">${strip}</div></div>
    ${bestRows ? `<div class="card mt-2"><h3>Personal Bests 🏆</h3>${bestRows}</div>` : ''}
    <div class="card mt-2">
      <h3>History</h3>
      ${history || '<p class="muted small mt-1">No workouts yet — your story starts with Day 1. 💪</p>'}
    </div>`;
}

/* ================= profile screen ================= */
function renderProfileScreen() {
  const p = state.profile;
  const matLabel = { none: '—', pregnant: '🤰 Pregnant', postpartum: '👶 Recently a mother' }[p.maternity];
  const row = (l, v) => `<div class="history-item"><div class="hd"><div class="hm">${l}</div><div class="hn">${v}</div></div></div>`;
  return `
    <h1>Profile 👤</h1>
    <div class="card">
      ${row('Name', esc(p.name))}
      ${row('Age', p.age)}
      ${row('Gender', p.gender === 'male' ? '🙋‍♂️ Male' : '🙋‍♀️ Female')}
      ${p.gender === 'female' ? row('Maternity', matLabel) : ''}
      ${row('Goal', p.maternity !== 'none' ? (p.maternity === 'pregnant' ? 'Prenatal program' : 'Postpartum program') : (GOAL_SCHEMES[p.goal]?.label || ''))}
      ${row('Training location', equipLabel(p.equip))}
      ${row('Days per week', p.days + ' days')}
    </div>
    <button class="btn btn-ghost btn-block mt-2" onclick="editProfile()">✏️ Edit Profile / Rebuild Plan</button>
    <button class="btn btn-danger btn-block mt-2" onclick="resetAll()">🗑 Reset Everything</button>
    <div class="card mt-3">
      <h3>🔒 Your privacy</h3>
      <p class="muted small mt-1">Everything — profile, plans, logs — lives only in this browser on this device.
      Nothing is ever uploaded. Use the same (non-incognito) browser to keep your progress.</p>
    </div>
    <p class="center small muted mt-3">Fit For Life · made with 💜 · train anywhere</p>`;
}

function editProfile() {
  obDraft = { ...state.profile };
  obStep = 1; // skip the welcome splash
  screen = 'onboard';
  render();
}

function resetAll() {
  if (!confirm('Delete your profile AND all workout history from this device?')) return;
  localStorage.removeItem(STORE_KEY);
  state = loadState();
  obDraft = {}; obStep = 0;
  go('onboard');
}

/* ================= confetti ================= */
function confetti() {
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const emojis = ['🎉', '💪', '🔥', '⭐', '✨', '🏆'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.textContent = emojis[i % emojis.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    s.style.animationDelay = Math.random() * 0.4 + 's';
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3600);
}

/* ================= boot ================= */
render();
