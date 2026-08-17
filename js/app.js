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
  else if (screen === 'preview') app.innerHTML = renderPreview() + renderNav('home');
  else if (screen === 'workout') app.innerHTML = renderWorkout() + renderNav('home');
  else if (screen === 'progress') app.innerHTML = renderProgress() + renderNav('progress');
  else if (screen === 'profile') app.innerHTML = renderProfileScreen() + renderNav('profile');
  ensureStatsTicker();
  window.scrollTo(0, 0);
}

/* ================= theme (dark / light) ================= */
function applyTheme() {
  document.body.classList.toggle('light', state.theme === 'light');
}
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  save();
  applyTheme();
  render();
}

function go(s) { screen = s; render(); trackView('/' + s); }

/* ---- GoatCounter analytics (anonymous, cookie-free) ----
   The loader script counts the initial page load; these helpers
   count SPA screen changes and key milestone events. */
function trackView(path) {
  try { window.goatcounter?.count?.({ path, title: 'Fit For Life — ' + path.replace('/', ''), event: false }); } catch (e) {}
}
function trackEvent(name) {
  try { window.goatcounter?.count?.({ path: name, title: name, event: true }); } catch (e) {}
}

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
        <p class="splash-credit">Crafted by <span class="grad-text">Jayavardhan Tummidi</span></p>
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
        ${choiceBtn('maternity', 'pregnant', '🤰', 'Currently pregnant', 'Gentle prenatal-safe training')}
        ${choiceBtn('maternity', 'postpartum', '👶', 'Recently a mother', 'Core-restore &amp; gentle strength')}
        ${choiceBtn('maternity', 'none', '💪', 'Neither', 'Standard programs for me')}
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
  trackEvent('profile-created');
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
    const inProgress = state.activeSession && state.activeSession.dayIndex === i && state.activeSession.date === todayKey();
    return `
      <div class="card day-card ${isDoneToday ? 'done-today' : ''}" onclick="openDay(${i})">
        <div class="day-icon">${day.icon}</div>
        <div class="day-info">
          <div class="dn">Day ${i + 1} · ${esc(day.name)} ${isDoneToday ? '<span class="badge badge-success">Done today</span>' : inProgress ? '<span class="badge badge-warn">Resume ▶</span>' : ''}</div>
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
      <button class="theme-btn" onclick="toggleTheme()" aria-label="Toggle theme">${state.theme === 'light' ? '🌙' : '☀️'}</button>
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
      <div class="stat"><div class="v">${vol >= 1000 ? (vol / 1000).toFixed(1) + 'k' : vol}</div><div class="l">Volume (${unit()}·reps)</div></div>
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

/* ================= day preview (customize, then start) ================= */
function openDay(i) {
  currentDay = i;
  const sess = state.activeSession;
  // resume a workout already in progress for this day
  if (sess && sess.exercises && (sess.started || sess.startTs) && sess.dayIndex === i && sess.date === todayKey()) {
    go('workout');
    return;
  }
  // build (or reuse) a customizable draft — NO timer starts here
  if (!state.draft || state.draft.dayIndex !== i || state.draft.date !== todayKey()) {
    const program = getProgram();
    const day = program[i];
    state.draft = {
      dayIndex: i, date: todayKey(), dayName: day.name, dayIcon: day.icon,
      exercises: day.exercises.map((e) => ({ ...e })),
    };
    save();
  }
  go('preview');
}

function estMinutes(exercises) {
  // ~40s per set of work + programmed rest, plus setup transitions
  const secs = exercises.reduce((a, e) => a + e.sets * (40 + (e.rest || 60)), 0) + exercises.length * 30;
  return Math.round(secs / 60);
}

function renderPreview() {
  const d = state.draft;
  if (!d || !d.exercises) { screen = 'dashboard'; return renderDashboard(); }
  const totalSets = d.exercises.reduce((a, e) => a + e.sets, 0);

  const rows = d.exercises.map((slot, i) => {
    const ex = EX_BY_ID[slot.id];
    const alts = altsFor(slot.id, d.exercises.map((e) => e.id));
    const altList = alts.map((a, ai) => `
      <div class="alt-item">
        <div class="alt-row">
          <div class="alt-info">
            <div class="an">${esc(a.n)}</div>
            <div class="am">🎯 ${esc(a.m[0])} · ${a.eq === 'gym' ? '🏢 gym' : a.eq === 'min' ? '🏠 dumbbell/band' : '🌍 no equipment'}</div>
          </div>
          <button class="alt-watch" onclick="pvWatchAlt(${i}, ${ai}, '${a.id}')">▶ Watch</button>
        </div>
        <div class="alt-preview hidden" id="pv-altprev-${i}-${ai}"></div>
      </div>`).join('');

    return `
      <div class="card pv-card">
        <div class="pv-head">
          <div class="ex-num">${i + 1}</div>
          <div class="pv-title">
            <div class="xn">${esc(ex.n)} ${slot.finisher ? '<span class="badge badge-warn">Finisher</span>' : ''}</div>
            <div class="xs">🎯 ${esc(ex.m[0])} · rest ${slot.rest}s</div>
          </div>
          <button class="alt-watch" onclick="pvVideo(${i}, '${slot.id}')">▶</button>
        </div>
        <div class="pv-video hidden" id="pv-vid-${i}"></div>
        <div class="pv-controls">
          <div class="pv-ctl">
            <div class="pv-ctl-label">Sets</div>
            <div class="stepper">
              <button onclick="pvSets(${i}, -1)">−</button>
              <span id="pv-sets-${i}">${slot.sets}</span>
              <button onclick="pvSets(${i}, 1)">＋</button>
            </div>
          </div>
          <div class="pv-ctl">
            <div class="pv-ctl-label">Target reps</div>
            <input class="pv-reps" type="text" inputmode="numeric" value="${esc(slot.reps)}" maxlength="12"
                   onchange="pvReps(${i}, this.value)" />
          </div>
        </div>
        ${alts.length ? `
        <button class="alts-toggle mt-1" onclick="pvToggleAlts(${i})">⇄ Change exercise (${alts.length} alternatives) ▾</button>
        <div class="alts-list hidden" id="pv-alts-${i}">${altList}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="wk-top">
      <button class="wk-link" onclick="go('dashboard')">‹ Back</button>
      <div class="wk-count">PREVIEW &amp; CUSTOMIZE</div>
      <span style="width:52px"></span>
    </div>
    <h1>${d.dayIcon || ''} ${esc(d.dayName)}</h1>
    <div class="pv-meta">
      <span>⚡ ${d.exercises.length} exercises</span>
      <span>🧮 ${totalSets} sets</span>
      <span>🕐 ~${estMinutes(d.exercises)} min</span>
    </div>
    <p class="muted small mb-2">Adjust sets &amp; reps, swap exercises, watch demos — the clock only starts when YOU do.</p>
    ${rows}
    <button class="btn btn-primary btn-block btn-start mt-3" onclick="startWorkout()">START WORKOUT 🚀</button>
    <p class="center small muted mt-1">Timer &amp; stats begin only after you press start.</p>
  `;
}

function pvSets(i, delta) {
  const slot = state.draft?.exercises?.[i];
  if (!slot) return;
  slot.sets = Math.max(1, Math.min(10, slot.sets + delta));
  save();
  const el = $('#pv-sets-' + i);
  if (el) el.textContent = slot.sets;
}

function pvReps(i, val) {
  const slot = state.draft?.exercises?.[i];
  if (!slot) return;
  const clean = String(val).trim().slice(0, 12);
  if (clean) { slot.reps = clean; save(); }
}

function pvVideo(i, exId) {
  const box = $('#pv-vid-' + i);
  const ex = EX_BY_ID[exId];
  if (!box || !ex) return;
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.innerHTML = ex.vid
    ? `<div class="video-shell"><iframe src="https://www.youtube-nocookie.com/embed/${ex.vid}?rel=0&modestbranding=1"
        title="${esc(ex.n)} demo" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen loading="lazy"></iframe></div>`
    : `<button class="btn btn-ghost btn-sm btn-block" onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(ex.v)}','_blank','noopener')">Watch demo on YouTube ↗</button>`;
  box.classList.remove('hidden');
}

function pvToggleAlts(i) {
  $('#pv-alts-' + i)?.classList.toggle('hidden');
}

function pvWatchAlt(i, ai, altId) {
  const box = $(`#pv-altprev-${i}-${ai}`);
  const alt = EX_BY_ID[altId];
  if (!box || !alt) return;
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const video = alt.vid
    ? `<div class="video-shell"><iframe src="https://www.youtube-nocookie.com/embed/${alt.vid}?rel=0&modestbranding=1"
        title="${esc(alt.n)} demo" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen loading="lazy"></iframe></div>`
    : `<button class="btn btn-ghost btn-sm btn-block" onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(alt.v)}','_blank','noopener')">Watch demo on YouTube ↗</button>`;
  box.innerHTML = `
    ${video}
    <ul class="cues">${alt.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    <div class="alt-decide">
      <button class="btn btn-ghost btn-sm" onclick="pvWatchAlt(${i}, ${ai}, '${altId}')">Keep looking 👀</button>
      <button class="btn btn-primary btn-sm" onclick="pvSwap(${i}, '${altId}')">Use this instead ⇄</button>
    </div>`;
  box.classList.remove('hidden');
}

function pvSwap(i, newId) {
  const slot = state.draft?.exercises?.[i];
  if (!slot || !EX_BY_ID[newId]) return;
  state.draft.exercises[i] = { ...slot, id: newId };
  save();
  render();
  toast(`Swapped to ${EX_BY_ID[newId].n} 🔄`);
}

/* the ONLY place a workout (and its timer) starts */
function startWorkout() {
  const d = state.draft;
  if (!d) return;
  const sets = {};
  d.exercises.forEach((e) => {
    sets[e.id] = Array.from({ length: e.sets }, () => ({ w: '', r: '', done: false }));
  });
  state.activeSession = {
    dayIndex: d.dayIndex, date: d.date,
    dayName: d.dayName, dayIcon: d.dayIcon,
    exercises: d.exercises.map((e) => ({ ...e })),
    sets, exIndex: 0,
    startTs: Date.now(),
    started: true,
  };
  state.draft = null;
  save();
  trackEvent('workout-started');
  toast('Let\u2019s go! Clock is running ⏱');
  go('workout');
}

/* Maternity-specific notes are only shown to the users they apply to */
function noteFor(ex) {
  if (!ex.note) return '';
  const m = state.profile?.maternity || 'none';
  if (/pregnan/i.test(ex.note) && m !== 'pregnant') return '';
  if (/postpartum/i.test(ex.note) && m !== 'postpartum') return '';
  return ex.note;
}

/* How to count the weight — every weighted exercise gets guidance */
function weightHint(ex) {
  const n = ex.n.toLowerCase();
  if (ex.eq === 'body') return null;
  if (/\bdip|pull-up|chin-up|hang\b|hanging/.test(n))
    return '⚖️ Bodyweight move — leave weight blank, or log added weight if you use a dip belt.';
  if (n.includes('ez-bar')) return '⚖️ Include the bar: EZ-bar weighs ≈ 7.5 kg / 15 lb empty — log bar + plates.';
  if (n.includes('barbell') || n.includes('t-bar') || n.includes('landmine') || ['deadlift','ohp','cgbp','hip-thrust','rack-pull','good-morning','meadows-row'].includes(ex.id))
    return '⚖️ Include the bar: a standard Olympic bar weighs 20 kg / 45 lb — log bar + all plates.';
  if (n.includes('band'))
    return '⚖️ Bands: log the labeled resistance if known, or leave weight blank.';
  if (n.includes('cable') || n.includes('machine') || n.includes('pulldown') || n.includes('pushdown') || n.includes('pec deck') || n.includes('leg press') || n.includes('leg curl') || n.includes('leg extension') || n.includes('hack squat') || n.includes('abduction') || n.includes('adduction') || n.includes('sled'))
    return '⚖️ Log the number shown on the weight stack / plates you selected.';
  if (n.includes('plate'))
    return '⚖️ Log the weight of the plate you are holding.';
  if (ex.eq === 'min')
    return '⚖️ Log the weight of ONE dumbbell/kettlebell only (e.g. two 10 kg dumbbells → enter 10).';
  return '⚖️ Log the total weight you moved (bar + plates, or the machine stack number).';
}

/* 5–6 alternatives targeting the same primary muscle, equipment & safety aware */
function altsFor(exId, dayExIds) {
  const ex = EX_BY_ID[exId];
  const p = state.profile;
  const tag = Object.keys(MUSCLE_TAGS).find((t) => MUSCLE_TAGS[t].includes(ex.m[0]));
  const tiers = EQUIP_ACCESS[p.equip] || EQUIP_ACCESS.none;
  const safeKey = p.maternity === 'pregnant' ? 'preg' : p.maternity === 'postpartum' ? 'post' : null;
  return EXERCISES.filter((e) =>
    e.id !== exId &&
    !dayExIds.includes(e.id) &&
    tiers.includes(e.eq) &&
    (!safeKey || e[safeKey]) &&
    (tag ? MUSCLE_TAGS[tag].includes(e.m[0]) : e.m[0] === ex.m[0])
  ).slice(0, 6);
}

/* ---------- workout stats (time / volume / reps) ---------- */
function unit() { return state.unit || 'kg'; }
function setUnit(u) { state.unit = u; save(); if (screen === 'workout') { render(); } }

function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function sessStats() {
  const sess = state.activeSession;
  if (!sess) return { time: '0:00:00', vol: 0, reps: 0 };
  let vol = 0, reps = 0;
  for (const arr of Object.values(sess.sets)) for (const s of arr) if (s.done) {
    vol += (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0);
    reps += parseFloat(s.r) || 0;
  }
  return { time: fmtElapsed(Date.now() - (sess.startTs || Date.now())), vol: Math.round(vol), reps: Math.round(reps) };
}

let statsTicker = null;
function updateStats() {
  const st = sessStats();
  const t = $('#wk-time'), v = $('#wk-vol'), r = $('#wk-reps');
  if (t) t.textContent = st.time;
  if (v) v.textContent = `${st.vol} ${unit()}`;
  if (r) r.textContent = st.reps;
}
function ensureStatsTicker() {
  if (screen === 'workout' && state.activeSession) {
    if (!statsTicker) statsTicker = setInterval(updateStats, 1000);
  } else if (statsTicker) { clearInterval(statsTicker); statsTicker = null; }
}

/* ---------- set-table markup (rebuilt surgically, never full-page) ---------- */
function buildSetRows(exId) {
  const sess = state.activeSession;
  const slotIdx = sess.exercises.findIndex((e) => e.id === exId);
  const slot = sess.exercises[slotIdx];
  const ex = EX_BY_ID[exId];
  const isTimed = ex.t === 'cardio' || ex.t === 'mobility' || ex.t === 'recovery';
  const sets = sess.sets[exId] || [];
  const u = unit();
  const rows = sets.map((s, si) => `
      <div class="set-row">
        <div class="sl">${si + 1}</div>
        <input type="number" inputmode="decimal" placeholder="${isTimed ? '—' : u}" value="${esc(s.w)}"
               onchange="logSet('${exId}', ${si}, 'w', this.value)" ${isTimed ? 'disabled' : ''} />
        <input type="number" inputmode="numeric" placeholder="${isTimed ? 'secs' : 'reps'}" value="${esc(s.r)}"
               onchange="logSet('${exId}', ${si}, 'r', this.value)" />
        <button class="set-done ${s.done ? 'on' : ''}" id="sd-${exId}-${si}"
                onclick="toggleSet('${exId}', ${si}, ${slot.rest})">${s.done ? '✓' : '○'}</button>
      </div>`).join('');
  return `
      <div class="set-row">
        <div class="set-head">Set</div>
        <div class="set-head">${isTimed ? '—' : `<span class="unit-seg"><button class="${u === 'kg' ? 'on' : ''}" onclick="setUnit('kg')">KG</button><button class="${u === 'lb' ? 'on' : ''}" onclick="setUnit('lb')">LB</button></span>`}</div>
        <div class="set-head">${isTimed ? 'Seconds' : 'Reps'}</div><div class="set-head">Done</div>
      </div>
      ${rows}`;
}

function renderWorkout() {
  const sess = state.activeSession;
  if (!sess || !sess.exercises) { screen = 'dashboard'; return renderDashboard(); }
  const i = Math.min(sess.exIndex || 0, sess.exercises.length - 1);
  sess.exIndex = i;
  const N = sess.exercises.length;
  const slot = sess.exercises[i];
  const ex = EX_BY_ID[slot.id];
  const st = sessStats();

  const muscleTags = ex.m.map((m, mi) =>
    `<span class="mt ${mi === 0 ? 'primary' : ''}">${mi === 0 ? '🎯 ' : ''}${esc(m)}</span>`).join('');

  const note = noteFor(ex);
  const hint = weightHint(ex);
  const dayIds = sess.exercises.map((e) => e.id);
  const alts = altsFor(slot.id, dayIds);
  const altList = alts.map((a, ai) => `
      <div class="alt-item">
        <div class="alt-row">
          <div class="alt-info">
            <div class="an">${esc(a.n)}</div>
            <div class="am">🎯 ${esc(a.m[0])} · ${a.eq === 'gym' ? '🏢 gym' : a.eq === 'min' ? '🏠 dumbbell/band' : '🌍 no equipment'}</div>
          </div>
          <button class="alt-watch" onclick="previewAlt(${i}, ${ai}, '${a.id}')">▶ Watch</button>
        </div>
        <div class="alt-preview hidden" id="altprev-${i}-${ai}"></div>
      </div>`).join('');

  /* exercise jump list (dots + overlay) */
  const jumpItems = sess.exercises.map((e2, j) => {
    const ex2 = EX_BY_ID[e2.id];
    const arr = sess.sets[e2.id] || [];
    const doneCount = arr.filter((s) => s.done).length;
    const allDone = arr.length > 0 && doneCount === arr.length;
    return `
      <div class="jump-item ${j === i ? 'current' : ''}" onclick="jumpToExercise(${j})">
        <div class="ex-num ${allDone ? 'completed' : ''}">${allDone ? '✓' : j + 1}</div>
        <div class="jump-info">
          <div class="jn">${esc(ex2.n)}</div>
          <div class="jm">${e2.sets} sets × ${esc(e2.reps)} · ${doneCount}/${arr.length} done</div>
        </div>
      </div>`;
  }).join('');

  const nextSlot = i < N - 1 ? sess.exercises[i + 1] : null;
  const nextEx = nextSlot ? EX_BY_ID[nextSlot.id] : null;

  return `
    <div class="wk-top">
      <button class="wk-link" onclick="go('dashboard')">‹ Exit</button>
      <div class="wk-count">EXERCISE ${i + 1}/${N}</div>
      <button class="wk-link" onclick="toggleExList()">Exercises ☰</button>
    </div>

    <div class="wk-stats">
      <div class="ws"><div class="wl">Time</div><div class="wv" id="wk-time">${st.time}</div></div>
      <div class="ws-dot"></div>
      <div class="ws"><div class="wl">Volume</div><div class="wv" id="wk-vol">${st.vol} ${unit()}</div></div>
      <div class="ws-dot"></div>
      <div class="ws"><div class="wl">Reps</div><div class="wv" id="wk-reps">${st.reps}</div></div>
    </div>

    <div class="card ex-step">
      <div class="ex-step-head">
        <div>
          <h2>${esc(ex.n)} ${slot.finisher ? '<span class="badge badge-warn">Finisher</span>' : ''}</h2>
          <div class="muted small">${slot.sets} sets × ${esc(slot.reps)} · rest ${slot.rest}s</div>
        </div>
      </div>
      <div class="muscle-tags">${muscleTags}</div>
      <div class="video-shell" id="vid-${i}">
        <div class="video-load" onclick="loadVideo(${i}, '${slot.id}')">
          <div class="play">▶</div>
          <div class="vt">${ex.vid ? 'Watch how to do it — close-up form demo' : 'Watch a form demo on YouTube ↗'}</div>
        </div>
      </div>
      ${note ? `<div class="safety-note">⚠️ ${esc(note)}</div>` : ''}
      ${hint ? `<div class="weight-hint">${esc(hint)}</div>` : ''}
      <ul class="cues">${ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <div class="set-table" id="settable-${slot.id}">${buildSetRows(slot.id)}</div>
      <button class="btn btn-ghost btn-sm btn-block mt-1" onclick="addSet('${slot.id}')">＋ Add another set</button>
      <div class="rest-hint">✓ a set to auto-start your ${slot.rest}s rest timer</div>
      ${alts.length ? `
      <div class="alts" id="alts-${i}">
        <button class="alts-toggle" onclick="toggleAlts(${i})">🔄 Equipment busy or broken? ${alts.length} alternatives ▾</button>
        <div class="alts-list hidden">${altList}</div>
      </div>` : ''}
    </div>

    <div class="wk-nav">
      <button class="btn btn-ghost" ${i === 0 ? 'disabled' : ''} onclick="stepExercise(-1)">‹ Prev</button>
      ${i < N - 1
        ? `<button class="btn btn-primary" style="flex:1" onclick="stepExercise(1)">Next Exercise ›</button>`
        : `<button class="btn btn-primary" style="flex:1" onclick="finishWorkout()">Finish Workout 🏁</button>`}
    </div>

    ${nextEx ? `
    <div class="next-up" onclick="stepExercise(1)">
      <div class="nu-label">Next exercise</div>
      <div class="nu-row">
        <div class="nu-name">${esc(nextEx.n)}</div>
        <div class="nu-meta">${nextSlot.sets} × ${esc(nextSlot.reps)} · 🎯 ${esc(nextEx.m[0])}</div>
      </div>
    </div>` : `<p class="center small muted mt-2">Last one — finish strong! 💪</p>`}

    <div class="exlist-overlay hidden" id="exlist" onclick="if(event.target===this)toggleExList()">
      <div class="exlist-sheet">
        <div class="exlist-head"><h3>${sess.dayIcon || ''} ${esc(sess.dayName || 'Workout')}</h3>
        <button class="wk-link" onclick="toggleExList()">Close ✕</button></div>
        ${jumpItems}
        <button class="btn btn-primary btn-block mt-2" onclick="finishWorkout()">Finish Workout 🏁</button>
      </div>
    </div>
  `;
}

function stepExercise(d) {
  const sess = state.activeSession;
  if (!sess) return;
  sess.exIndex = Math.max(0, Math.min(sess.exercises.length - 1, (sess.exIndex || 0) + d));
  save();
  render();
}

function jumpToExercise(j) {
  const sess = state.activeSession;
  if (!sess) return;
  sess.exIndex = j;
  save();
  render();
}

function toggleExList() {
  $('#exlist')?.classList.toggle('hidden');
}

function toggleAlts(idx) {
  document.querySelector(`#alts-${idx} .alts-list`)?.classList.toggle('hidden');
}

/* Alternative flow: watch the demo first, then decide to swap or keep browsing */
function previewAlt(cardIdx, altIdx, altId) {
  const box = document.querySelector(`#altprev-${cardIdx}-${altIdx}`);
  const alt = EX_BY_ID[altId];
  if (!box || !alt) return;
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  // close other open previews in this card
  document.querySelectorAll(`[id^="altprev-${cardIdx}-"]`).forEach((el) => { el.classList.add('hidden'); el.innerHTML = ''; });
  const currentId = state.activeSession?.exercises?.[cardIdx]?.id;
  const video = alt.vid
    ? `<div class="video-shell"><iframe src="https://www.youtube-nocookie.com/embed/${alt.vid}?rel=0&modestbranding=1"
         title="${esc(alt.n)} demo" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
         allowfullscreen loading="lazy"></iframe></div>`
    : `<button class="btn btn-ghost btn-sm btn-block" onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(alt.v)}','_blank','noopener')">Watch demo on YouTube ↗</button>`;
  box.innerHTML = `
    ${video}
    <ul class="cues">${alt.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    <div class="alt-decide">
      <button class="btn btn-ghost btn-sm" onclick="previewAlt(${cardIdx}, ${altIdx}, '${altId}')">Keep looking 👀</button>
      <button class="btn btn-primary btn-sm" onclick="swapExercise('${currentId}', '${altId}')">Yes, swap to this ⇄</button>
    </div>`;
  box.classList.remove('hidden');
}

function addSet(exId) {
  const arr = state.activeSession?.sets?.[exId];
  if (!arr) return;
  if (arr.length >= 10) { toast('10 sets is plenty, beast! 🦍'); return; }
  const lastFilled = [...arr].reverse().find((s) => s.w !== '');
  arr.push({ w: lastFilled ? lastFilled.w : '', r: '', done: false });   // carry last used weight
  save();
  // surgical update — no full re-render (protects keyboard/undo state)
  const table = $('#settable-' + exId);
  if (table) table.innerHTML = buildSetRows(exId);
  else render();
  toast('Set added 💪');
}

function swapExercise(oldId, newId) {
  const sess = state.activeSession;
  if (!sess) return;
  const idx = sess.exercises.findIndex((e) => e.id === oldId);
  if (idx < 0 || !EX_BY_ID[newId]) return;
  const slot = sess.exercises[idx];
  sess.exercises[idx] = { ...slot, id: newId };              // keep sets/reps/rest scheme
  const doneSets = (sess.sets[oldId] || []).filter((s) => s.done);
  sess.sets[newId] = [
    ...doneSets,                                             // preserve completed work
    ...Array.from({ length: Math.max(slot.sets - doneSets.length, 1) }, () => ({ w: '', r: '', done: false })),
  ];
  delete sess.sets[oldId];
  save();
  render();
  toast(`Swapped to ${EX_BY_ID[newId].n} 🔄`);
}

function loadVideo(idx, exId) {
  const shell = $('#vid-' + idx);
  const ex = EX_BY_ID[exId];
  if (!shell || !ex) return;
  if (ex.vid) {
    // pinned, verified demo video — privacy-enhanced embed
    shell.innerHTML = `<iframe
        src="https://www.youtube-nocookie.com/embed/${ex.vid}?rel=0&modestbranding=1"
        title="${esc(ex.n)} demo" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen loading="lazy"></iframe>`;
  } else {
    // fallback: open a YouTube search for the exercise demo
    window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.v), '_blank', 'noopener');
  }
}

function logSet(exId, si, field, val) {
  const s = state.activeSession?.sets?.[exId]?.[si];
  if (!s) return;
  s[field] = val;
  save();
  updateStats();
}

function toggleSet(exId, si, rest) {
  const s = state.activeSession?.sets?.[exId]?.[si];
  if (!s) return;
  s.done = !s.done;
  save();
  // surgical DOM update only — no full re-render (fixes iOS "Undo Typing"
  // popups and the first-card auto-expanding bug)
  const btn = $(`#sd-${exId}-${si}`);
  if (btn) { btn.classList.toggle('on', s.done); btn.textContent = s.done ? '✓' : '○'; }
  updateStats();
  if (s.done) startTimer(rest || 60);
}

function finishWorkout() {
  const sess = state.activeSession;
  if (!sess) return;
  const flat = Object.values(sess.sets).flat();
  const done = flat.filter((s) => s.done);
  if (!done.length) { toast('Complete at least one set first 💪'); return; }

  const volume = done.reduce((a, s) => a + (parseFloat(s.w) || 0) * (parseFloat(s.r) || 0), 0);
  const setsRecord = {};
  for (const [exId, arr] of Object.entries(sess.sets)) {
    const d = arr.filter((s) => s.done).map((s) => ({ w: s.w, r: s.r }));
    if (d.length) setsRecord[exId] = d;
  }
  state.logs[sess.date] = {
    dayIndex: sess.dayIndex, dayName: sess.dayName || 'Workout',
    sets: setsRecord, volume: Math.round(volume), ts: Date.now(),
  };
  state.activeSession = null;
  save();
  confetti();
  trackEvent('workout-finished');
  toast(`Crushed it, ${firstName()}! ${done.length} sets logged 🎉`);
  go('progress');
}

/* ================= rest timer (wall-clock based — survives phone lock) ================= */
let timerEndTs = 0, timerTotal = 0;

function startTimer(seconds) {
  stopTimer();
  timerEndTs = Date.now() + seconds * 1000;
  timerTotal = seconds;
  const overlay = $('#timer-overlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  drawTimer();
  // interval throttles in background, but remaining time is computed from
  // the wall clock, so it is always correct when the screen wakes up
  timerHandle = setInterval(tickTimer, 250);
}

function timerRemaining() { return Math.max(0, Math.ceil((timerEndTs - Date.now()) / 1000)); }

let lastDrawn = -1;
function tickTimer() {
  const remaining = timerRemaining();
  if (remaining <= 0) { beep(); stopTimer(); toast('Rest over — next set! 💥'); try { navigator.vibrate?.(200); } catch (e) {} return; }
  if (remaining !== lastDrawn) {
    if (remaining <= 3) beep(660, 0.08);
    drawTimer();
  }
}

function drawTimer() {
  const overlay = $('#timer-overlay');
  const remaining = timerRemaining();
  lastDrawn = remaining;
  const R = 104, CIRC = 2 * Math.PI * R;
  const frac = Math.min(1, remaining / (timerTotal || 1));
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
}

function extendTimer(s) {
  timerEndTs += s * 1000;
  timerTotal += s;
  drawTimer();
}

function stopTimer() {
  clearInterval(timerHandle);
  timerHandle = null;
  timerEndTs = 0;
  const overlay = $('#timer-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

/* instantly resync the timer when the phone screen wakes up */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && timerHandle) tickTimer();
  if (!document.hidden && screen === 'workout') updateStats();
});

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
      <div class="hm">${nice} · ${setCount} sets${log.volume ? ` · ${log.volume} ${unit()}·reps` : ''}</div></div></div>`;
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
      <h3>⚙️ Preferences</h3>
      <div class="pref-row">
        <div>Appearance</div>
        <span class="unit-seg"><button class="${state.theme !== 'light' ? 'on' : ''}" onclick="if(state.theme==='light')toggleTheme()">🌙 Dark</button><button class="${state.theme === 'light' ? 'on' : ''}" onclick="if(state.theme!=='light')toggleTheme()">☀️ Light</button></span>
      </div>
      <div class="pref-row">
        <div>Weight units</div>
        <span class="unit-seg"><button class="${unit() === 'kg' ? 'on' : ''}" onclick="setUnit('kg');render()">KG</button><button class="${unit() === 'lb' ? 'on' : ''}" onclick="setUnit('lb');render()">LB</button></span>
      </div>
    </div>
    <div class="card mt-3">
      <h3>🔒 Your privacy</h3>
      <p class="muted small mt-1">Everything — profile, plans, logs — lives only in this browser on this device.
      Nothing is ever uploaded. Use the same (non-incognito) browser to keep your progress.</p>
    </div>
    <div class="credit-card">
      <div class="credit-glow"></div>
      <div class="credit-label">Designed &amp; Built by</div>
      <div class="credit-name">Jayavardhan Tummidi</div>
      <div class="credit-tag">"Train anywhere. Transform everywhere."</div>
    </div>
    <p class="center small muted mt-2">Fit For Life · made with 💜 · train anywhere</p>`;
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
applyTheme();
render();
