/* ============================================================
   Fit For Life — Plan Generation Engine
   ------------------------------------------------------------
   Turns a user profile into a weekly workout program:
   - Splits for 3 / 4 / 5 days per week
   - Goal-based sets / reps / rest (weight loss, strength, combo)
   - Equipment-aware exercise selection (gym / minimal / none)
   - Dedicated prenatal & postpartum programs
   - Deterministic weekly rotation for variety (seeded PRNG),
     so exercises change week to week but stay reproducible.
   ============================================================ */

/* ---------- seeded PRNG (mulberry32) ---------- */
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (h >>> 0) || 42;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- goal programming schemes ---------- */
const GOAL_SCHEMES = {
  loss: {
    label: 'Weight Loss',
    compound:  { sets: 3, reps: '12–15', rest: 45 },
    isolation: { sets: 3, reps: '15–20', rest: 40 },
    core:      { sets: 3, reps: '15–20', rest: 30 },
    cardio:    { sets: 3, reps: '40s work', rest: 30 },
    finishers: 2,          // extra cardio slots appended per day
    tip: 'Short rests keep your heart rate up — that is where the fat-burn magic lives.',
  },
  strength: {
    label: 'Strength',
    compound:  { sets: 4, reps: '6–8',  rest: 120 },
    isolation: { sets: 3, reps: '8–10', rest: 90 },
    core:      { sets: 3, reps: '10–12', rest: 60 },
    cardio:    { sets: 2, reps: '30s work', rest: 60 },
    finishers: 0,
    tip: 'Rest fully between heavy sets. Strength is built with patience and progressive overload.',
  },
  combo: {
    label: 'Weight Loss + Strength',
    compound:  { sets: 4, reps: '8–12',  rest: 75 },
    isolation: { sets: 3, reps: '10–15', rest: 60 },
    core:      { sets: 3, reps: '12–15', rest: 45 },
    cardio:    { sets: 3, reps: '35s work', rest: 40 },
    finishers: 1,
    tip: 'Heavy-enough weights + controlled rests = build muscle while the fat melts.',
  },
};

/* ---------- split templates ----------
   Each day = { name, icon, slots } where each slot is a muscle
   focus tag matched against exercise primary muscles.           */
const MUSCLE_TAGS = {
  chest:  ['Chest', 'Upper Chest', 'Lower Chest'],
  back:   ['Back', 'Lats', 'Mid Back', 'Upper Back', 'Lower Back', 'Traps'],
  shoulders: ['Shoulders', 'Side Delts', 'Front Delts', 'Rear Delts'],
  biceps: ['Biceps', 'Forearms'],
  triceps:['Triceps'],
  quads:  ['Quads'],
  hams:   ['Hamstrings'],
  glutes: ['Glutes', 'Glute Medius', 'Inner Thighs'],
  calves: ['Calves'],
  core:   ['Abs', 'Core', 'Obliques', 'Lower Abs', 'Deep Core'],
  cardio: ['Cardio', 'Full Body'],
  mobility: ['Mobility', 'Hips', 'Spine', 'Hip Flexors'],
};

const SPLITS = {
  3: [
    { name: 'Full Body A', icon: '🏋️', slots: ['quads','chest','back','shoulders','hams','core','cardio'] },
    { name: 'Full Body B', icon: '💪', slots: ['glutes','back','chest','biceps','triceps','core','cardio'] },
    { name: 'Full Body C', icon: '🔥', slots: ['hams','shoulders','back','quads','glutes','core','cardio'] },
  ],
  4: [
    { name: 'Upper Body A', icon: '💪', slots: ['chest','back','shoulders','back','biceps','triceps','core'] },
    { name: 'Lower Body A', icon: '🦵', slots: ['quads','hams','glutes','quads','calves','core','cardio'] },
    { name: 'Upper Body B', icon: '🏋️', slots: ['back','chest','shoulders','chest','triceps','biceps','core'] },
    { name: 'Lower Body B', icon: '🔥', slots: ['glutes','quads','hams','glutes','calves','core','cardio'] },
  ],
  5: [
    { name: 'Push Day',    icon: '🏋️', slots: ['chest','shoulders','chest','triceps','shoulders','triceps','core'] },
    { name: 'Pull Day',    icon: '💪', slots: ['back','back','back','biceps','shoulders','biceps','core'] },
    { name: 'Leg Day',     icon: '🦵', slots: ['quads','hams','glutes','quads','calves','core','cardio'] },
    { name: 'Upper Power', icon: '⚡', slots: ['chest','back','shoulders','triceps','biceps','core'] },
    { name: 'Glutes & Conditioning', icon: '🔥', slots: ['glutes','hams','glutes','quads','core','cardio','cardio'] },
  ],
};

/* Female programming = extra glute/lower-body emphasis on 4 & 5 day splits */
const SPLITS_FEMALE = {
  3: [
    { name: 'Full Body A', icon: '🏋️', slots: ['glutes','quads','back','chest','hams','core','cardio'] },
    { name: 'Full Body B', icon: '💪', slots: ['hams','glutes','shoulders','back','biceps','core','cardio'] },
    { name: 'Full Body C', icon: '🔥', slots: ['quads','glutes','back','shoulders','triceps','core','cardio'] },
  ],
  4: [
    { name: 'Lower Body A (Glute Focus)', icon: '🍑', slots: ['glutes','quads','hams','glutes','calves','core','cardio'] },
    { name: 'Upper Body A', icon: '💪', slots: ['back','chest','shoulders','back','biceps','triceps','core'] },
    { name: 'Lower Body B (Quad Focus)', icon: '🦵', slots: ['quads','glutes','hams','quads','calves','core','cardio'] },
    { name: 'Upper Body B', icon: '🏋️', slots: ['shoulders','back','chest','shoulders','triceps','core','cardio'] },
  ],
  5: [
    { name: 'Glute Day', icon: '🍑', slots: ['glutes','hams','glutes','quads','glutes','core'] },
    { name: 'Upper Body', icon: '💪', slots: ['back','chest','shoulders','back','biceps','triceps','core'] },
    { name: 'Quad Day', icon: '🦵', slots: ['quads','glutes','quads','hams','calves','core'] },
    { name: 'Shoulders & Arms', icon: '⚡', slots: ['shoulders','shoulders','biceps','triceps','biceps','triceps','core'] },
    { name: 'Lower + Conditioning', icon: '🔥', slots: ['hams','glutes','quads','core','cardio','cardio'] },
  ],
};

/* ---------- prenatal & postpartum templates ----------
   These are fixed curated programs (safety > variety).  */
const PRENATAL_SPLIT = {
  3: [
    { name: 'Prenatal Strength', icon: '🤰', ids: ['diaphragm-breath','supported-squat','wall-pushup','band-row','standing-abduction','pelvic-tilt','kegel','cat-cow'] },
    { name: 'Prenatal Mobility & Glutes', icon: '🧘', ids: ['diaphragm-breath','glute-bridge','clamshell','side-leg-raise','bird-dog','side-stretch','kegel','childs-pose'] },
    { name: 'Prenatal Full Body', icon: '🌸', ids: ['diaphragm-breath','bw-squat','incline-pushup','seated-band-press','donkey-kick','wall-sit','pelvic-tilt','brisk-walk'] },
  ],
  4: [
    { name: 'Prenatal Strength', icon: '🤰', ids: ['diaphragm-breath','supported-squat','wall-pushup','band-row','standing-abduction','pelvic-tilt','kegel','cat-cow'] },
    { name: 'Prenatal Glutes & Core', icon: '🍑', ids: ['diaphragm-breath','glute-bridge','clamshell','fire-hydrant','side-leg-raise','bird-dog','kegel','side-stretch'] },
    { name: 'Prenatal Upper & Walk', icon: '💪', ids: ['diaphragm-breath','seated-band-press','band-face-pull','db-curl','lateral-raise','wall-pushup','kegel','brisk-walk'] },
    { name: 'Prenatal Mobility Flow', icon: '🧘', ids: ['diaphragm-breath','cat-cow','hip-flexor-stretch','ham-stretch','chest-doorway','childs-pose','pelvic-tilt','side-stretch'] },
  ],
  5: [
    { name: 'Prenatal Strength', icon: '🤰', ids: ['diaphragm-breath','supported-squat','wall-pushup','band-row','standing-abduction','pelvic-tilt','kegel','cat-cow'] },
    { name: 'Prenatal Glutes', icon: '🍑', ids: ['diaphragm-breath','glute-bridge','clamshell','fire-hydrant','donkey-kick','side-leg-raise','kegel','childs-pose'] },
    { name: 'Prenatal Upper Body', icon: '💪', ids: ['diaphragm-breath','seated-band-press','band-face-pull','db-curl','band-chest-press','lateral-raise','kegel','side-stretch'] },
    { name: 'Prenatal Walk & Core', icon: '🚶‍♀️', ids: ['diaphragm-breath','brisk-walk','bird-dog','pelvic-tilt','standing-abduction','wall-sit','kegel','cat-cow'] },
    { name: 'Prenatal Mobility Flow', icon: '🧘', ids: ['diaphragm-breath','cat-cow','hip-flexor-stretch','ham-stretch','chest-doorway','childs-pose','pelvic-tilt','side-stretch'] },
  ],
};

const POSTPARTUM_SPLIT = {
  3: [
    { name: 'Core Restore A', icon: '🌷', ids: ['diaphragm-breath','pelvic-tilt','heel-slide','glute-bridge','bird-dog','clamshell','kegel','childs-pose'] },
    { name: 'Gentle Strength', icon: '💪', ids: ['diaphragm-breath','bw-squat','wall-pushup','band-row','side-leg-raise','dead-bug','kegel','cat-cow'] },
    { name: 'Core Restore B', icon: '🌸', ids: ['diaphragm-breath','heel-slide','sl-glute-bridge','donkey-kick','bird-dog','reverse-crunch','kegel','brisk-walk'] },
  ],
  4: [
    { name: 'Core Restore A', icon: '🌷', ids: ['diaphragm-breath','pelvic-tilt','heel-slide','glute-bridge','bird-dog','clamshell','kegel','childs-pose'] },
    { name: 'Gentle Strength', icon: '💪', ids: ['diaphragm-breath','bw-squat','wall-pushup','band-row','lateral-raise','dead-bug','kegel','cat-cow'] },
    { name: 'Glutes & Walk', icon: '🍑', ids: ['diaphragm-breath','glute-bridge','fire-hydrant','side-leg-raise','stepup-bw','kegel','brisk-walk','side-stretch'] },
    { name: 'Core Restore B', icon: '🌸', ids: ['diaphragm-breath','heel-slide','sl-glute-bridge','bird-dog','reverse-crunch','plank','kegel','childs-pose'] },
  ],
  5: [
    { name: 'Core Restore A', icon: '🌷', ids: ['diaphragm-breath','pelvic-tilt','heel-slide','glute-bridge','bird-dog','clamshell','kegel','childs-pose'] },
    { name: 'Gentle Strength', icon: '💪', ids: ['diaphragm-breath','bw-squat','wall-pushup','band-row','lateral-raise','dead-bug','kegel','cat-cow'] },
    { name: 'Glutes', icon: '🍑', ids: ['diaphragm-breath','glute-bridge','fire-hydrant','donkey-kick','side-leg-raise','frog-pump','kegel','side-stretch'] },
    { name: 'Walk & Balance', icon: '🚶‍♀️', ids: ['diaphragm-breath','brisk-walk','stepup-bw','standing-abduction','supported-squat','bird-dog','kegel','ham-stretch'] },
    { name: 'Core Restore B', icon: '🌸', ids: ['diaphragm-breath','heel-slide','sl-glute-bridge','dead-bug','reverse-crunch','plank','kegel','childs-pose'] },
  ],
};

/* Gentle scheme used for prenatal / postpartum programs */
const SPECIAL_SCHEME = {
  compound:  { sets: 2, reps: '10–12', rest: 60 },
  isolation: { sets: 2, reps: '12–15', rest: 45 },
  core:      { sets: 2, reps: '8–10',  rest: 45 },
  cardio:    { sets: 1, reps: '10–20 min', rest: 60 },
  mobility:  { sets: 1, reps: '30–60s', rest: 20 },
  recovery:  { sets: 1, reps: '5 slow breaths', rest: 20 },
};

/* ---------- helpers ---------- */
function exercisePool(equipKey, filterFn) {
  const tiers = EQUIP_ACCESS[equipKey] || EQUIP_ACCESS.none;
  return EXERCISES.filter(e => tiers.includes(e.eq) && (!filterFn || filterFn(e)));
}

function matchesTag(ex, tag) {
  const tags = MUSCLE_TAGS[tag] || [];
  return tags.includes(ex.m[0]); // primary muscle match
}

function schemeFor(ex, scheme) {
  if (ex.t === 'mobility')  return SPECIAL_SCHEME.mobility;
  if (ex.t === 'recovery')  return SPECIAL_SCHEME.recovery;
  if (ex.t === 'cardio')    return scheme.cardio;
  if (ex.t === 'core')      return scheme.core;
  if (ex.t === 'isolation') return scheme.isolation;
  return scheme.compound;
}

/* Fallback muscle tags when a pool has no exercise left for a slot
   (e.g. bodyweight-only biceps) — keeps every day at 6–8 exercises. */
const TAG_FALLBACKS = {
  biceps: ['back', 'core'],
  triceps: ['chest', 'shoulders', 'core'],
  calves: ['quads', 'cardio'],
  hams: ['glutes', 'quads'],
  chest: ['triceps', 'shoulders'],
  back: ['shoulders', 'core'],
  shoulders: ['chest', 'core'],
  quads: ['glutes', 'cardio'],
  glutes: ['hams', 'core'],
  core: ['cardio', 'mobility'],
  cardio: ['core', 'mobility'],
};

/* Pick one exercise for a slot, never repeating within the day */
function pickForSlot(pool, tag, usedDay, usedWeek, rnd) {
  const tryTags = [tag, ...(TAG_FALLBACKS[tag] || [])];
  for (const t of tryTags) {
    let candidates = pool.filter(e => matchesTag(e, t) && !usedDay.has(e.id) && !usedWeek.has(e.id));
    if (!candidates.length) candidates = pool.filter(e => matchesTag(e, t) && !usedDay.has(e.id));
    if (candidates.length) return candidates[Math.floor(rnd() * candidates.length)];
  }
  return null;
}

/* ---------- main generator ----------
   profile: { name, age, gender, maternity ('none'|'pregnant'|'postpartum'),
              goal ('loss'|'strength'|'combo'), equip ('commercial'|'minimal'|'none'),
              days (3|4|5) }
   week:    integer >= 0 — rotates exercise variety weekly.
   variant: integer — bumped by the "shuffle" button for a fresh mix. */
function generateProgram(profile, week = 0, variant = 0) {
  const { gender, maternity, goal, equip, days } = profile;

  /* --- prenatal / postpartum: curated fixed programs --- */
  if (maternity === 'pregnant' || maternity === 'postpartum') {
    const src = maternity === 'pregnant' ? PRENATAL_SPLIT : POSTPARTUM_SPLIT;
    const template = src[days] || src[3];
    const tiers = EQUIP_ACCESS[equip] || EQUIP_ACCESS.none;
    const safeFlag = maternity === 'pregnant' ? 'preg' : 'post';
    // pool of safe substitutes for exercises the user has no equipment for
    const safePool = EXERCISES.filter(e => tiers.includes(e.eq) && e[safeFlag]);
    return template.map(day => {
      const ids = day.ids.filter(id => tiers.includes(EX_BY_ID[id].eq));
      const used = new Set(ids);
      for (const alt of safePool) {            // pad back to the full day length
        if (ids.length >= day.ids.length) break;
        if (!used.has(alt.id)) { ids.push(alt.id); used.add(alt.id); }
      }
      return {
        name: day.name,
        icon: day.icon,
        exercises: ids.map(id => {
          const ex = EX_BY_ID[id];
          const s = schemeFor(ex, SPECIAL_SCHEME);
          return { id: ex.id, sets: s.sets, reps: s.reps, rest: s.rest };
        }),
      };
    });
  }

  /* --- standard programs --- */
  const scheme = GOAL_SCHEMES[goal] || GOAL_SCHEMES.combo;
  const splitSrc = gender === 'female' ? SPLITS_FEMALE : SPLITS;
  const template = splitSrc[days] || splitSrc[3];
  const pool = exercisePool(equip);
  const rnd = seededRandom(`${profile.name}|${goal}|${equip}|${days}|w${week}|v${variant}`);
  const usedWeek = new Set();

  return template.map(day => {
    const usedDay = new Set();
    const exercises = [];

    for (const tag of day.slots) {
      const ex = pickForSlot(pool, tag, usedDay, usedWeek, rnd);
      if (!ex) continue;
      usedDay.add(ex.id);
      usedWeek.add(ex.id);
      const s = schemeFor(ex, scheme);
      exercises.push({ id: ex.id, sets: s.sets, reps: s.reps, rest: s.rest });
    }

    /* guarantee 6–8 exercises even in sparse pools */
    for (const padTag of ['core', 'cardio', 'mobility', 'glutes']) {
      while (exercises.length < 6) {
        const ex = pickForSlot(pool, padTag, usedDay, new Set(), rnd);
        if (!ex) break;
        usedDay.add(ex.id);
        const s = schemeFor(ex, scheme);
        exercises.push({ id: ex.id, sets: s.sets, reps: s.reps, rest: s.rest });
      }
      if (exercises.length >= 6) break;
    }

    /* weight-loss / combo cardio finishers */
    for (let f = 0; f < scheme.finishers && exercises.length < 8; f++) {
      const ex = pickForSlot(pool, 'cardio', usedDay, new Set(), rnd);
      if (!ex) break;
      usedDay.add(ex.id);
      const s = scheme.cardio;
      exercises.push({ id: ex.id, sets: s.sets, reps: s.reps, rest: s.rest, finisher: true });
    }

    return { name: day.name, icon: day.icon, exercises: exercises.slice(0, 8) };
  });
}

/* ISO week number — used to rotate variety automatically */
function currentWeekNumber() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d - start) / (7 * 24 * 3600 * 1000));
}
