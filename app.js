/* =====================================================================
   TEXAS METHOD TRAINER v8
   ===================================================================== */

'use strict';

/* ---------- constants ---------- */
const LB_PER_KG = 0.45359237;
const WILKS = {
  male:   [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 0.00000701863, -0.00000001291],
  female: [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 0.00004731582, -0.00000009054]
};
const PROGRAM_RULES = {
  squatVolPct:   0.90,
  squatLightPct: 0.80,
  upperVolPct:   0.80,
  upperLightPct: 0.90,
  warmupRamp:    [[0.40, 5], [0.60, 3], [0.80, 2]],
  totalWeeks:    24
};
const CYCLE_LABELS = ['1a','1b','1c','2a','2b','2c','3a','3b','3c','4a','4b','4c'];
const LIFT_META = {
  squat:    { name: 'Squat',          short: 'SQ' },
  bench:    { name: 'Bench Press',    short: 'BP' },
  press:    { name: 'Press',          short: 'PR' },
  deadlift: { name: 'Deadlift',       short: 'DL' },
  clean:    { name: 'Power Clean',    short: 'PC' },
  backext:  { name: 'Back Extension', short: 'BE' },
  chin:     { name: 'Chin-Up',        short: 'CU' }
};
const STD_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
const STD_PLATES_KG = [20, 15, 10, 5, 2.5, 1.25];

/* ---------- defaults ---------- */
const DEFAULTS = {
  units: 'lb',
  sex: 'female',
  bodyweight: 165,
  barWeight: 45,
  plates: [45, 35, 25, 10, 5, 2.5],
  mode: 'limit',
  ohpDecrement: 0.95,
  restSec: 120,
  restStep: 15,
  voice: true,
  lifts: {
    squat:    { weight: 125, reps: 5 },
    bench:    { weight: 85,  reps: 5 },
    deadlift: { weight: 170, reps: 5 },
    press:    { weight: 55,  reps: 5 },
    clean:    { weight: 55,  reps: 5 }
  },
  increment:     { squat: 2.5, bench: 2.5, deadlift: 5, press: 2.5, clean: 2.5 },
  pace2wk:       { squat: 5,   bench: 5,   deadlift: 10, press: 5,   clean: 5   },
  incPerSession: { squat: 2.5, bench: 5,   deadlift: 5,  press: 5,   clean: 2.5 }
};

/* =====================================================================
   30-DAY PREP PLAN  (bodyweight ramp-up before Texas Method)
   ===================================================================== */
const PREP_REST = { rest: true };
/* one day's exercises: push-ups, plank (3 timed sets), leg raises,
   crunches, burpees, squats. plank value = seconds per set. */
function prepDay(pu, plankSec, lr, cr, bp, sq) {
  return { exercises: [
    { key: 'pushups',   name: 'Pushups',    icon: '💪', reps: pu },
    { key: 'plank',     name: 'Plank',      icon: '🧘', sets: 3, sec: plankSec },
    { key: 'legraises', name: 'Leg Raises', icon: '🦵', reps: lr },
    { key: 'crunches',  name: 'Crunches',   icon: '🔄', reps: cr },
    { key: 'burpees',   name: 'Burpees',    icon: '🔥', reps: bp },
    { key: 'squats',    name: 'Squats',     icon: '🏋️', reps: sq }
  ]};
}
/* days 1-30 transcribed from the printed plan (rest: 6, 13, 20, 27) */
const PREP30 = [
  prepDay(10, 30, 10, 10, 10, 50), // 1
  prepDay(12, 30, 12, 12, 12, 55), // 2
  prepDay(12, 30, 12, 12, 12, 55), // 3
  prepDay(15, 30, 15, 15, 15, 55), // 4
  prepDay(15, 30, 15, 15, 15, 55), // 5
  PREP_REST,                       // 6
  prepDay(15, 30, 15, 15, 15, 55), // 7
  prepDay(17, 30, 17, 17, 17, 55), // 8
  prepDay(20, 30, 20, 20, 20, 55), // 9
  prepDay(20, 30, 20, 20, 20, 55), // 10
  prepDay(22, 40, 22, 22, 20, 55), // 11
  prepDay(22, 40, 22, 22, 20, 55), // 12
  PREP_REST,                       // 13
  prepDay(22, 40, 22, 22, 20, 55), // 14
  prepDay(22, 40, 22, 22, 20, 55), // 15
  prepDay(25, 40, 25, 25, 20, 55), // 16
  prepDay(25, 40, 25, 25, 20, 55), // 17
  prepDay(25, 40, 25, 25, 20, 55), // 18
  prepDay(25, 40, 25, 25, 20, 55), // 19
  PREP_REST,                       // 20
  prepDay(25, 40, 25, 25, 20, 55), // 21
  prepDay(25, 40, 25, 25, 20, 55), // 22
  prepDay(27, 40, 27, 27, 20, 60), // 23
  prepDay(27, 40, 27, 27, 20, 60), // 24
  prepDay(29, 40, 29, 29, 20, 60), // 25
  prepDay(29, 40, 29, 29, 20, 60), // 26
  PREP_REST,                       // 27
  prepDay(29, 40, 29, 29, 20, 60), // 28
  prepDay(30, 60, 30, 30, 25, 60), // 29
  prepDay(30, 60, 30, 30, 25, 60)  // 30
];
const PREP_TOTAL = PREP30.length;
/* full-plan totals (denominator for the "reps banked" bars) */
const PREP_EX_KEYS = [
  { key: 'pushups',   name: 'Pushups',    icon: '💪' },
  { key: 'squats',    name: 'Squats',     icon: '🏋️' },
  { key: 'burpees',   name: 'Burpees',    icon: '🔥' },
  { key: 'legraises', name: 'Leg Raises', icon: '🦵' },
  { key: 'crunches',  name: 'Crunches',   icon: '🔄' }
];
const PREP_FULL = (() => {
  const t = { pushups: 0, squats: 0, burpees: 0, legraises: 0, crunches: 0, plankSec: 0 };
  PREP30.forEach(d => {
    if (d.rest) return;
    d.exercises.forEach(ex => { if (ex.sets) t.plankSec += ex.sets * ex.sec; else t[ex.key] += ex.reps; });
  });
  return t;
})();

/* =====================================================================
   MOBILITY METHOD  (28-day daily joint mobility + strength program)
   hips · knees · shoulders · Achilles/ankles
   ===================================================================== */
function mobReps(key, name, icon, reps, side) { return { key, name, icon, reps, side: !!side }; }
function mobHold(key, name, icon, sec, side) { return { key, name, icon, sets: 1, sec, side: !!side }; }
function mobDay(w) {
  return { exercises: [
    mobReps('hipcars',      'Hip CARs',               '🔄', 4 + w,     true),
    mobReps('n9090',        '90/90 Hip Switches',     '🦵', 6 + 2 * w, false),
    mobHold('deepsquat',    'Deep Squat Hold',        '🧘', 30 + 10 * w, false),
    mobReps('tibraise',     'Tibialis Raises',        '🦵', 12 + 3 * w, false),
    mobReps('calfraise',    'Eccentric Calf Raises',  '🦶', 8 + 2 * w, true),
    mobReps('anklerock',    'Knee-to-Wall Ankle Rocks','🦶', 8 + 2 * w, true),
    mobReps('shouldercars', 'Shoulder CARs',          '💪', 4 + w,     true),
    mobReps('wallangel',    'Wall Angels',            '💪', 8 + 2 * w, false),
    mobReps('atgsplit',     'ATG Split Squat',        '🦵', 6 + 2 * w, true)
  ]};
}
/* 4 weeks, 6 days on + 1 rest (days 7/14/21/28), active full-range moves */
const MOBILITY = [];
for (let d = 1; d <= 28; d++) MOBILITY.push(d % 7 === 0 ? PREP_REST : mobDay(Math.floor((d - 1) / 7)));

/* =====================================================================
   CORE & ABS  (28-day progressive core program, 6 days on / 1 rest)
   ===================================================================== */
function coreDay(w) {
  return { exercises: [
    { key: 'crunches',  name: 'Crunches',          icon: '🔄', reps: 15 + 5 * w },
    { key: 'bicycle',   name: 'Bicycle Crunches',  icon: '🚲', reps: 20 + 6 * w },
    { key: 'legraises', name: 'Leg Raises',        icon: '🦵', reps: 12 + 3 * w },
    { key: 'rtwist',    name: 'Russian Twists',    icon: '🔁', reps: 20 + 8 * w },
    { key: 'plank',     name: 'Plank',             icon: '🧘', sets: 1, sec: 30 + 15 * w },
    { key: 'hollow',    name: 'Hollow Body Hold',  icon: '🌙', sets: 1, sec: 20 + 10 * w }
  ]};
}
const CORE = [];
for (let d = 1; d <= 28; d++) CORE.push(d % 7 === 0 ? PREP_REST : coreDay(Math.floor((d - 1) / 7)));

/* =====================================================================
   DUMBBELL FULL-BODY  (alternating A/B sessions — do ~3x/week)
   ===================================================================== */
function db(key, name, icon, reps, scheme, side) { return { key, name, icon, reps, scheme, side: !!side }; }
const DB_A = { exercises: [
  db('gobletsquat', 'Goblet Squat',         '🏋️', 12, '3 × 12'),
  db('dbpress',     'DB Floor Press',        '💪', 12, '3 × 12'),
  db('dbrow',       'DB Bent-Over Row',      '🚣', 12, '3 × 12'),
  db('dbrdl',       'DB Romanian Deadlift',  '🦵', 12, '3 × 12'),
  db('dbohp',       'DB Shoulder Press',     '🙌', 10, '3 × 10'),
  db('dbcurl',      'DB Biceps Curl',        '💪', 12, '3 × 12')
]};
const DB_B = { exercises: [
  db('dblunge',     'DB Reverse Lunge',      '🦵', 10, '3 × 10 / side', true),
  db('dbpushup',    'Push-up',               '💪', 12, '3 × 12'),
  db('dbrenrow',    'DB Renegade Row',       '🚣', 8,  '3 × 8 / side', true),
  db('dbhinge',     'DB Deadlift',           '🏋️', 12, '3 × 12'),
  db('dblatraise',  'DB Lateral Raise',      '🙌', 12, '3 × 12'),
  db('dbhammer',    'DB Hammer Curl',        '💪', 12, '3 × 12')
]};
const DUMBBELL = [];
for (let i = 0; i < 24; i++) DUMBBELL.push(i % 2 === 0 ? DB_A : DB_B);

/* =====================================================================
   PILATES MAT  (classical Joseph Pilates mat sequence — 28 days, 6/1)
   ===================================================================== */
function pilReps(key, name, icon, reps, side) { return { key, name, icon, reps, side: !!side }; }
function pilHold(key, name, icon, sec) { return { key, name, icon, sets: 1, sec }; }
function pilatesDay(w) {
  return { exercises: [
    pilHold('hundred',       'The Hundred',           '🌬️', 40 + 10 * w),
    pilReps('rollup',        'Roll-Up',               '🔄', 5 + w),
    pilReps('legcircle',     'Single Leg Circles',    '⭕', 5 + w, true),
    pilReps('rollball',      'Rolling Like a Ball',   '⚪', 6 + w),
    pilReps('singlestretch', 'Single Leg Stretch',    '🦵', 8 + 2 * w),
    pilReps('doublestretch', 'Double Leg Stretch',    '🦵', 8 + 2 * w),
    pilReps('spinestretch',  'Spine Stretch Forward', '🧘', 5 + w),
    pilReps('saw',           'The Saw',               '↔️', 5 + w, true),
    pilReps('swan',          'Swan',                  '🦢', 6 + w),
    pilReps('sidekick',      'Side Kicks',            '🦵', 8 + 2 * w, true),
    pilReps('teaser',        'Teaser',                '✨', 4 + w)
  ]};
}
const PILATES = [];
for (let d = 1; d <= 28; d++) PILATES.push(d % 7 === 0 ? PREP_REST : pilatesDay(Math.floor((d - 1) / 7)));

/* =====================================================================
   FULL-BODY HIIT  (timed circuit — 28 days, 6/1, work time climbs)
   ===================================================================== */
function hiitWork(key, name, icon, sec) { return { key, name, icon, sets: 1, sec }; }
function hiitDay(w) {
  const t = 30 + 5 * w; // 30 / 35 / 40 / 45s work
  return { exercises: [
    hiitWork('jacks',     'Jumping Jacks',     '⭐', t),
    hiitWork('highknees', 'High Knees',        '🏃', t),
    hiitWork('mtnclimb',  'Mountain Climbers', '⛰️', t),
    hiitWork('squatjump', 'Squat Jumps',       '🦿', t),
    hiitWork('plankjack', 'Plank Jacks',       '🧘', t),
    hiitWork('skaters',   'Skaters',           '⛸️', t),
    hiitWork('buttkick',  'Butt Kicks',        '🦵', t),
    hiitWork('burpees',   'Burpees',           '🔥', t)
  ]};
}
const HIIT = [];
for (let d = 1; d <= 28; d++) HIIT.push(d % 7 === 0 ? PREP_REST : hiitDay(Math.floor((d - 1) / 7)));

/* =====================================================================
   BJJ SOLO DRILLS  (real jiu-jitsu movements — 28 days, 6 on / 1 rest)
   ===================================================================== */
function bjjReps(key, name, icon, reps, side) { return { key, name, icon, reps, side: !!side }; }
function bjjHold(key, name, icon, sec) { return { key, name, icon, sets: 1, sec }; }
function bjjDay(w) {
  return { exercises: [
    bjjReps('shrimp',    'Hip Escape (Shrimp)', '🦐', 8 + 2 * w, true),
    bjjReps('revshrimp', 'Reverse Shrimp',      '🔙', 8 + 2 * w, true),
    bjjReps('bridge',    'Bridge / Upa',        '🌉', 8 + 2 * w, true),
    bjjReps('techstand', 'Technical Stand-up',  '🧍', 6 + w, true),
    bjjReps('granby',    'Granby Roll',         '🤸', 5 + w, true),
    bjjReps('sprawl',    'Sprawls',             '⬇️', 10 + 3 * w),
    bjjReps('sitout',    'Sit-outs',            '🔄', 8 + 2 * w, true),
    bjjReps('breakfall', 'Back Breakfalls',     '🛡️', 6 + w),
    bjjReps('hipheist',  'Hip Heist',           '🦵', 8 + 2 * w, true),
    bjjHold('invhold',   'Inversion Hold',      '🙃', 20 + 10 * w)
  ]};
}
const BJJ = [];
for (let d = 1; d <= 28; d++) BJJ.push(d % 7 === 0 ? PREP_REST : bjjDay(Math.floor((d - 1) / 7)));

/* =====================================================================
   DAY-PROGRAM HELPERS  (shared by 30-Day Prep + Mobility)
   ===================================================================== */
const DAY_PROGRAMS = {
  prep30:   { data: PREP30,   stateKey: 'prep', label: '30-Day Prep',       sub: 'bodyweight ramp-up' },
  mobility: { data: MOBILITY, stateKey: 'mob',  label: 'Mobility Method',   sub: 'daily joint mobility' },
  core:     { data: CORE,     stateKey: 'core', label: 'Core & Abs',        sub: '28-day core builder' },
  dumbbell: { data: DUMBBELL, stateKey: 'db',   label: 'Dumbbell Full-Body', sub: 'A/B strength, 3×/week' },
  pilates:  { data: PILATES,  stateKey: 'pil',  label: 'Pilates Mat',        sub: 'classical mat sequence' },
  hiit:     { data: HIIT,     stateKey: 'hiit', label: 'Full-Body HIIT',     sub: 'timed circuit' },
  bjj:      { data: BJJ,      stateKey: 'bjj',  label: 'BJJ Solo Drills',    sub: 'jiu-jitsu movement' }
};
function isDayProgram() { return !!DAY_PROGRAMS[S.program]; }
function pcfg()   { return DAY_PROGRAMS[S.program] || DAY_PROGRAMS.prep30; }
function pdata()  { return pcfg().data; }
function ptotal() { return pdata().length; }
function pstate() {
  const k = pcfg().stateKey;
  if (!S[k]) S[k] = { day: 1, log: {} };
  if (!S[k].log) S[k].log = {};
  return S[k];
}
function pWorkDays() { return pdata().filter(d => !d.rest).length; }
function pLabel()    { return pcfg().label; }
/* reps-exercise keys present in the active program (for the stats bars) */
function pExKeys() {
  const seen = {}, out = [];
  pdata().forEach(d => { if (d.rest) return; d.exercises.forEach(e => { if (!e.sets && !seen[e.key]) { seen[e.key] = 1; out.push({ key: e.key, name: e.name, icon: e.icon }); } }); });
  return out;
}
function pFull() {
  const t = { plankSec: 0 };
  pdata().forEach(d => { if (d.rest) return; d.exercises.forEach(e => { if (e.sets) t.plankSec += e.sets * e.sec; else t[e.key] = (t[e.key] || 0) + e.reps; }); });
  return t;
}

/* =====================================================================
   PROFILES  (multi-user)
   ===================================================================== */
const PROF_REG_KEY = 'tm_profiles';

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROF_REG_KEY)) || null; } catch { return null; }
}
function saveProfiles(p) { localStorage.setItem(PROF_REG_KEY, JSON.stringify(p)); }

function initProfiles() {
  let p = loadProfiles();
  if (!p) {
    const id = 'p' + Date.now();
    p = { active: id, list: [{ id, name: 'Me' }] };
    // migrate any existing v1 data into the default profile
    const old = localStorage.getItem('tm_state_v1');
    if (old) localStorage.setItem('tm_state_' + id, old);
    saveProfiles(p);
  }
  return p;
}

function activeStateKey() {
  const p = loadProfiles();
  return p ? 'tm_state_' + p.active : 'tm_state_v1';
}

function activeProfile() {
  const p = loadProfiles();
  if (!p) return { id: 'default', name: 'Me' };
  return p.list.find(x => x.id === p.active) || p.list[0];
}

function switchProfile(id) {
  save(); // save current user's state first
  const p = loadProfiles();
  p.active = id;
  saveProfiles(p);
  S = loadState();
  rebuild();
  render();
  updateProfileBtn();
  toast('Switched to ' + (p.list.find(x => x.id === id) || {}).name);
}

function createProfile(name) {
  const id = 'p' + Date.now();
  const p  = loadProfiles();
  p.list.push({ id, name: name.trim() || 'Lifter' });
  p.active = id;
  saveProfiles(p);
  S = loadState(); // fresh state for new user
  rebuild();
  render();
  updateProfileBtn();
  toast('Profile created: ' + name);
}

function deleteProfile(id) {
  const p = loadProfiles();
  if (p.list.length <= 1) { toast('Cannot delete last profile'); return; }
  localStorage.removeItem('tm_state_' + id);
  p.list = p.list.filter(x => x.id !== id);
  if (p.active === id) p.active = p.list[0].id;
  saveProfiles(p);
  S = loadState();
  rebuild();
  render();
  updateProfileBtn();
  toast('Profile deleted');
}

function renameProfile(id, name) {
  const p = loadProfiles();
  const prof = p.list.find(x => x.id === id);
  if (prof) { prof.name = name.trim() || prof.name; saveProfiles(p); updateProfileBtn(); }
}

function updateProfileBtn() {
  const btn = document.getElementById('profileBtn');
  if (btn) btn.textContent = activeProfile().name || 'Me';
}

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2) || '?';
}

/* =====================================================================
   STATE
   ===================================================================== */
initProfiles();

function loadState() {
  try {
    const raw = localStorage.getItem(activeStateKey());
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return { settings: structuredClone(DEFAULTS), cursor: { week: 0, day: 0 }, logs: {}, bodyLog: [],
           program: 'prep30', prep: { day: 1, log: {} }, mob: { day: 1, log: {} }, core: { day: 1, log: {} }, db: { day: 1, log: {} }, pil: { day: 1, log: {} }, hiit: { day: 1, log: {} }, bjj: { day: 1, log: {} }, achievements: [], prs: {}, sessions: 0, history: [] };
}
let S = loadState();

function migrate(st) {
  st.settings = Object.assign(structuredClone(DEFAULTS), st.settings || {});
  st.settings.lifts = Object.assign(structuredClone(DEFAULTS.lifts), st.settings.lifts || {});
  if (st.settings.barWeight == null) st.settings.barWeight = st.settings.units === 'lb' ? 45 : 20;
  if (!st.settings.plates || !st.settings.plates.length)
    st.settings.plates = st.settings.units === 'lb' ? [...STD_PLATES_LB] : [...STD_PLATES_KG];
  st.cursor  = st.cursor  || { week: 0, day: 0 };
  st.logs    = st.logs    || {};
  st.bodyLog = st.bodyLog || [];
  if (st.settings.restSec  == null) st.settings.restSec  = 120;
  if (st.settings.restStep == null) st.settings.restStep = 15;
  if (st.settings.voice    == null) st.settings.voice    = true;
  /* existing profiles default to Texas (don't disrupt anyone mid-cycle) */
  st.program = st.program || 'texas';
  st.prep    = st.prep    || { day: 1, log: {} };
  if (st.prep.day == null) st.prep.day = 1;
  if (!st.prep.log) st.prep.log = {};
  st.mob     = st.mob     || { day: 1, log: {} };
  if (st.mob.day == null) st.mob.day = 1;
  if (!st.mob.log) st.mob.log = {};
  ['core', 'db', 'pil', 'hiit', 'bjj'].forEach(k => { st[k] = st[k] || { day: 1, log: {} }; if (st[k].day == null) st[k].day = 1; if (!st[k].log) st[k].log = {}; });
  if (!st.achievements) st.achievements = [];
  if (!st.prs) st.prs = {};
  if (st.sessions == null) st.sessions = 0;
  if (!st.history) st.history = [];
  return st;
}
function save() {
  localStorage.setItem(activeStateKey(), JSON.stringify(S));
  if (typeof cloudOnLocalChange === 'function') cloudOnLocalChange();
}

/* confirm-tap state (persists across renders) */
const confirmState = { wipe: false, reset: false, factory: false };

/* =====================================================================
   MATH
   ===================================================================== */
const round    = (x, inc) => Math.round(x / inc) * inc;
const floorInc = (x, inc) => Math.floor(x / inc + 1e-9) * inc;
const toKg     = lb => lb * LB_PER_KG;

function oneRM(weight, reps) {
  if (reps <= 1 || reps >= 37) return weight;
  return weight * 36 / (37 - reps);
}

function wilks(totalUnits, bwUnits, sex, units) {
  const bwKg  = units === 'lb' ? toKg(bwUnits)  : bwUnits;
  const totKg = units === 'lb' ? toKg(totalUnits) : totalUnits;
  const c = WILKS[sex] || WILKS.male;
  const d = c[0]+c[1]*bwKg+c[2]*bwKg**2+c[3]*bwKg**3+c[4]*bwKg**4+c[5]*bwKg**5;
  return d ? (500 / d) * totKg : 0;
}

/* =====================================================================
   PLATE MATH  (change #2 & #3)
   ===================================================================== */
function bar()      { return S.settings.barWeight != null ? S.settings.barWeight : (S.settings.units === 'lb' ? 45 : 20); }
function getPlates(){ return (S.settings.plates && S.settings.plates.length) ? S.settings.plates : (S.settings.units === 'lb' ? STD_PLATES_LB : STD_PLATES_KG); }

/* plate visualizer — list of plates to load on ONE side, biggest first */
const PLATE_COLORS = { 45:'#2f6fed', 35:'#e0b400', 25:'#1faa4b', 20:'#2f6fed', 15:'#e0b400', 10:'#dddddd', 5:'#e23b3b', 2.5:'#9aa0a6', 1.25:'#9aa0a6' };
function platesPerSide(weight) {
  const b = bar(), plts = getPlates().filter(p => p > 0).sort((a, b) => b - a);
  let side = (weight - b) / 2; const out = [];
  if (side <= 0) return out;
  for (const p of plts) { let n = Math.floor(side / p + 1e-9); while (n-- > 0) { out.push(p); side = Math.round((side - p) * 1000) / 1000; } }
  return out;
}
function plateStripHTML(weight) {
  const ps = platesPerSide(weight);
  if (!ps.length) return '<span class="plate-none">Bar only</span>';
  const chips = ps.map(p => {
    const c = PLATE_COLORS[p] || '#888';
    const dark = (p === 10);
    return `<span class="plate" style="background:${c};color:${dark ? '#111' : '#fff'}">${fmt(p)}</span>`;
  }).join('');
  return `<span class="plates">${chips}<span class="plate-side">/ side</span></span>`;
}

/* snap target to the nearest loadable weight (greedy floor per side) */
function snapWeight(target, barW, plts) {
  if (target <= barW) return barW;
  const sorted = [...plts].filter(p => p > 0).sort((a, b) => b - a);
  if (!sorted.length) return Math.round(target / 5) * 5;
  let sideRem = (target - barW) / 2, side = 0;
  for (const p of sorted) {
    const n = Math.floor(sideRem / p + 1e-9);
    side += n * p;
    sideRem -= n * p;
  }
  return barW + side * 2;
}

/* return human-readable plate math string, e.g. "35 + 5 / side" */
function plateMath(totalWeight, barW, plts) {
  if (totalWeight <= barW) return 'Bar only';
  const sorted = [...plts].filter(p => p > 0).sort((a, b) => b - a);
  let side = Math.round(((totalWeight - barW) / 2) * 1000) / 1000;
  const used = [];
  for (const p of sorted) {
    const n = Math.floor(side / p + 1e-9);
    if (n > 0) { used.push(n === 1 ? String(fmt(p)) : `${n}×${fmt(p)}`); side = Math.round((side - n * p) * 1000) / 1000; }
  }
  if (Math.abs(side) > 0.01) return `${fmt((totalWeight - barW) / 2)} ea side`;
  return used.length ? used.join(' + ') + ' / side' : 'Bar only';
}

/* =====================================================================
   WARM-UP LADDER
   ===================================================================== */
function warmups(work) {
  const b = bar(), plts = getPlates();
  const out = [];
  if (work > b) out.push({ label: 'Bar', weight: b, reps: 5, sets: 2 });
  for (const [pct, reps] of PROGRAM_RULES.warmupRamp) {
    const w = snapWeight(work * pct, b, plts);
    if (w <= b || w >= work) continue;
    if (out.length && out[out.length - 1].weight === w) continue;
    out.push({ label: 'Warm-up', weight: w, reps, sets: 1 });
  }
  return out;
}

/* =====================================================================
   PROGRAM GENERATION
   ===================================================================== */
function seedIntensity() {
  const L = S.settings.lifts, inc = S.settings.increment;
  return {
    squat:    round(L.squat.weight,    inc.squat),
    bench:    round(L.bench.weight,    inc.bench),
    press:    round(L.press.weight,    inc.press),
    deadlift: round(L.deadlift.weight, inc.deadlift),
    clean:    round(L.clean.weight,    inc.clean)
  };
}

function schemeSets(sets, reps, type, key, work) {
  const r = [];
  for (let i = 0; i < sets; i++) r.push({ reps, weight: work, type, key, set: i + 1, work: true });
  return r;
}

function buildLift(key, rawWork, sets, reps, type, badge, logReps) {
  const b = bar(), plts = getPlates();
  const work = snapWeight(rawWork, b, plts);
  return {
    key, name: LIFT_META[key].name, type, badge,
    schemeLabel: reps === 0 ? `${sets}×F` : `${sets}×${reps}`,
    work,
    warmups: warmups(work),
    sets: schemeSets(sets, reps, type, key, work),
    logReps: !!logReps,
    targetReps: reps
  };
}

function generateProgram() {
  const r = PROGRAM_RULES, inc = S.settings.increment, sp = S.settings.incPerSession;
  const I = seedIntensity();
  const weeks = [];

  for (let wk = 0; wk < r.totalWeeks; wk++) {
    const primary   = wk % 2 === 0 ? 'bench' : 'press';
    const secondary = primary === 'bench' ? 'press' : 'bench';

    const sqHeavy = round(I.squat, inc.squat);
    const sqVol   = floorInc(sqHeavy * r.squatVolPct,   inc.squat);
    const sqLight = floorInc(sqVol   * r.squatLightPct, inc.squat);

    const pHeavy = round(I[primary], inc[primary]);
    const pVol   = floorInc(pHeavy * r.upperVolPct, inc[primary]);

    const sVol   = floorInc(round(I[secondary], inc[secondary]) * r.upperVolPct, inc[secondary]);
    let   sLight = floorInc(sVol * r.upperLightPct, inc[secondary]);
    if (secondary === 'press') sLight = floorInc(sLight * S.settings.ohpDecrement, inc.press);

    const dl = round(I.deadlift, inc.deadlift);
    const pc = round(I.clean,    inc.clean);

    weeks.push({
      idx: wk,
      label:    CYCLE_LABELS[Math.floor(wk / 2)],
      subweek:  (wk % 2) + 1,
      primary, secondary,
      intensity: { ...I },
      heavy: { squat: sqHeavy, [primary]: pHeavy, deadlift: dl },
      days: {
        0: [
          buildLift('squat',    sqVol, 5, 5, 'vol',   'Volume'),
          buildLift(primary,    pVol,  5, 5, 'vol',   'Volume'),
          buildLift('deadlift', dl,    1, 5, 'heavy', 'Heavy', true)
        ],
        1: [
          buildLift('squat',   sqLight, 2, 5,  'light', 'Light'),
          buildLift(secondary, sLight,  3, 5,  'light', 'Light'),
          buildLift('backext', 0,       5, 10, 'acc',   'Back-off'),
          buildLift('chin',    0,       3, 0,  'acc',   'AMRAP')
        ],
        2: [
          buildLift('squat',  sqHeavy, 1, 5, 'heavy', 'Heavy', true),
          buildLift(primary,  pHeavy,  1, 5, 'heavy', 'Heavy', true),
          buildLift('clean',  pc,      5, 3, 'acc',   'Power')
        ]
      }
    });

    advance('squat',    I, sp, 2, wk);
    advance('deadlift', I, sp, 0, wk);
    advance('clean',    I, sp, 2, wk);
    advance(primary,    I, sp, 2, wk);
  }
  return weeks;
}

function advance(key, I, sp, day, wk) {
  const step = sp[key] || 5;
  const cap  = S.settings.pace2wk[key] * (S.settings.mode === 'slowroll' ? 2 : 3);
  const log  = S.logs[`${wk}-${day}`];
  const reps = (log && log.reps && log.reps[key] != null) ? log.reps[key] : null;

  if (reps == null)  { I[key] += step; return; }
  if (reps >= 5)     { let j = step + Math.max(0, reps - 5) * step; if (S.settings.mode !== 'leterrip') j = Math.min(j, cap); I[key] += j; }
  else if (reps <= 2){ I[key] = round(I[key] * 0.9, S.settings.increment[key] || 2.5); }
}

/* =====================================================================
   RENDER
   ===================================================================== */
const view    = document.getElementById('view');
const titleEl = document.getElementById('screenTitle');
const subEl   = document.getElementById('screenSub');
let TAB = 'today', PROGRAM = generateProgram(), progCycle = 0;

function rebuild() { PROGRAM = generateProgram(); }
function render() {
  rebuild();
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === TAB));
  const prep = isDayProgram();
  if (TAB === 'today')   prep ? renderPrepToday()   : renderToday();
  if (TAB === 'program') prep ? renderPrepProgram() : renderProgram();
  if (TAB === 'stats')   renderStats();
  if (TAB === 'setup')   renderSetup();
  if (typeof updateWakeLock === 'function') updateWakeLock();
}

/* =====================================================================
   TODAY  (changes #1 + #2 + #5)
   ===================================================================== */
const DAY_NAMES = ['Monday · Volume', 'Wednesday · Light', 'Friday · Intensity'];

function renderToday() {
  const { week, day } = S.cursor;
  const w = PROGRAM[week];
  titleEl.textContent = 'Today';
  subEl.textContent   = `Cycle ${w.label} · Week ${w.subweek} · ${DAY_NAMES[day]}`;

  const logKey = `${week}-${day}`;
  const log    = S.logs[logKey] || { checks: {}, reps: {} };

  let html = `<div class="screen">
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
      <button class="btn small secondary" id="prevDay">‹ Prev</button>
      <div class="center">
        <div style="font-weight:800;font-size:19px;">${DAY_NAMES[day].split(' · ')[0]}</div>
        <div class="tiny muted">${DAY_NAMES[day].split(' · ')[1]} day</div>
      </div>
      <button class="btn small secondary" id="nextDay">Next ›</button>
    </div>
    <button class="btn primary" id="startSession">▶ Start Guided Workout</button>
    <div class="spacer"></div>`;

  for (const lf of w.days[day]) html += liftCard(lf, logKey, log);

  html += `<button class="btn secondary" id="completeBtn">✓ Mark workout complete</button>
    <div class="spacer"></div>
    <button class="btn secondary" id="timerBtn">⏱ Start rest timer (${fmtClock(restDefault())})</button>
  </div>`;
  view.innerHTML = html;
  wireToday(logKey);
}

/* ---------- lift card (#1 Set labels, #2 plate math, #5 stripes) ---------- */
function liftCard(lf, logKey, log) {
  const b = bar(), plts = getPlates();

  /* bodyweight accessory (back ext / chin) */
  if (lf.work === 0 && lf.type === 'acc') {
    let rows = '';
    for (let i = 0; i < lf.sets.length; i++) {
      const id  = `${lf.key}_w_${i}`;
      const on  = log.checks && log.checks[id] ? 'on' : '';
      const rep = lf.targetReps ? `${lf.targetReps} reps` : 'AMRAP';
      rows += `<div class="set-row workset ${on ? 'done' : ''}">
        <div class="lbl">Set ${i + 1}/${lf.sets.length}</div>
        <div class="wt">Bodyweight</div>
        <div class="set-end"><div class="reps">${rep}</div>
        <button class="check ${on}" data-check="${id}">✓</button></div></div>`;
    }
    return `<div class="card lift">
      <div class="lift-head"><div><div class="name">${lf.name} ${formBtn(lf.key)}</div>
      <div class="scheme">${lf.targetReps ? lf.schemeLabel : lf.sets.length + ' sets to failure'}</div></div>
      <span class="badge ${lf.type}">${lf.badge}</span></div>${rows}</div>`;
  }

  /* warm-up rows */
  let warmupRows = '';
  lf.warmups.forEach((wu, i) => {
    const id    = `${lf.key}_wu_${i}`;
    const on    = log.checks && log.checks[id] ? 'on' : '';
    const math  = plateMath(wu.weight, b, plts);
    warmupRows += `<div class="set-row warmup ${on ? 'done' : ''}">
      <div class="lbl">🔥 ${wu.label}</div>
      <div class="wt">${fmt(wu.weight)} <small>${unit()}</small><div class="plate-math">${plateStripHTML(wu.weight)}</div></div>
      <div class="set-end"><div class="reps">${wu.sets > 1 ? wu.sets + '×' + wu.reps : wu.reps + ' reps'}</div>
      <button class="check ${on}" data-check="${id}">✓</button></div></div>`;
  });

  /* work set rows */
  let setRows = '';
  lf.sets.forEach((st, i) => {
    const id   = `${lf.key}_w_${i}`;
    const on   = log.checks && log.checks[id] ? 'on' : '';
    const math = plateMath(st.weight, b, plts);
    setRows += `<div class="set-row workset ${on ? 'done' : ''}">
      <div class="lbl">💪 Set ${i + 1} of ${lf.sets.length}</div>
      <div class="wt">${fmt(st.weight)} <small>${unit()}</small><div class="plate-math">${plateStripHTML(st.weight)}</div></div>
      <div class="set-end"><div class="reps">${st.reps} reps</div>
      <button class="check ${on}" data-check="${id}">✓</button></div></div>`;
  });

  /* reps logger for intensity lifts */
  let logger = '';
  if (lf.logReps) {
    const cur = (log.reps && log.reps[lf.key] != null) ? log.reps[lf.key] : lf.targetReps;
    logger = `<div class="log-row">
      <label>Reps hit on top set</label>
      <div class="stepper">
        <button data-rep="${lf.key}" data-d="-1">−</button>
        <div class="val" id="rep_${lf.key}">${cur}</div>
        <button data-rep="${lf.key}" data-d="1">+</button>
      </div>
      <span class="tiny muted">drives next-cycle weight</span>
    </div>`;
  }

  const setsHeader = lf.warmups.length
    ? '<div class="sets-divider">Sets</div>'
    : '';

  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${lf.name} ${formBtn(lf.key)}</div>
    <div class="scheme">${lf.schemeLabel} · top ${fmt(lf.work)} ${unit()}</div></div>
    <span class="badge ${lf.type}">${lf.badge}</span></div>
    ${warmupRows}${setsHeader}${setRows}${logger}</div>`;
}

function wireToday(logKey) {
  if (!S.logs[logKey]) S.logs[logKey] = { checks: {}, reps: {} };
  const log = S.logs[logKey];

  view.querySelectorAll('[data-check]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.check;
      log.checks[id] = !log.checks[id];
      btn.classList.toggle('on', log.checks[id]);
      btn.closest('.set-row').classList.toggle('done', log.checks[id]);
      save();
      if (log.checks[id]) startRest();
    };
  });
  view.querySelectorAll('[data-rep]').forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.rep, d = +btn.dataset.d;
      const el = document.getElementById('rep_' + k);
      const v = Math.max(0, (+el.textContent) + d);
      el.textContent = v;
      log.reps[k] = v;
      save();
    };
  });
  document.getElementById('prevDay').onclick = () => moveCursor(-1);
  document.getElementById('nextDay').onclick  = () => moveCursor(1);
  document.getElementById('completeBtn').onclick = () => {
    const w = PROGRAM[S.cursor.week];
    w.days[S.cursor.day].forEach(lf => {
      if (lf.logReps && log.reps[lf.key] == null) log.reps[lf.key] = lf.targetReps;
    });
    const prMsgs = checkPRs(w, log);
    S.sessions = (S.sessions || 0) + 1;
    save(); rebuild();
    celebrateWorkout(prMsgs);
    moveCursor(1);
  };
  document.getElementById('timerBtn').onclick = () => startRest();
  const ss = document.getElementById('startSession');
  if (ss) ss.onclick = () => startSession();
}

function moveCursor(dir) {
  let { week, day } = S.cursor;
  day += dir;
  if (day > 2) { day = 0; week = Math.min(PROGRAM_RULES.totalWeeks - 1, week + 1); }
  if (day < 0) { day = 2; week = Math.max(0, week - 1); }
  S.cursor = { week, day }; save(); render();
}

/* =====================================================================
   30-DAY PREP — TODAY
   ===================================================================== */
/* check-row ids for a prep day: one per reps-exercise, one per plank set */
function prepCheckIds(dayObj) {
  const ids = [];
  dayObj.exercises.forEach(ex => {
    if (ex.sets) for (let i = 0; i < ex.sets; i++) ids.push(`${ex.key}_${i}`);
    else ids.push(ex.key);
  });
  return ids;
}
function prepDayDone(dayNum) {
  const d = pdata()[dayNum - 1];
  if (!d || d.rest) return false;
  const log = pstate().log[dayNum];
  if (log && log.done) return true;
  if (!log || !log.checks) return false;
  return prepCheckIds(d).every(id => log.checks[id]);
}
function prepDaysComplete() {
  let n = 0;
  for (let i = 1; i <= ptotal(); i++) if (!pdata()[i - 1].rest && prepDayDone(i)) n++;
  return n;
}

function renderPrepToday() {
  const dayNum = pstate().day;
  const d = pdata()[dayNum - 1];
  titleEl.textContent = 'Today';
  subEl.textContent   = `${pLabel()} · Day ${dayNum} of ${ptotal()}`;

  let html = `<div class="screen">
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
      <button class="btn small secondary" id="prepPrev" ${dayNum <= 1 ? 'disabled' : ''}>‹ Prev</button>
      <div class="center">
        <div style="font-weight:800;font-size:19px;">Day ${dayNum}</div>
        <div class="tiny muted" style="white-space:nowrap;">${prepDaysComplete()} / ${pWorkDays()} done</div>
      </div>
      <button class="btn small secondary" id="prepNext" ${dayNum >= ptotal() ? 'disabled' : ''}>Next ›</button>
    </div>`;

  if (d.rest) {
    html += `<div class="card lift" style="text-align:center;padding:34px 16px;">
      <div style="font-size:42px;">😴</div>
      <div class="name" style="font-size:22px;margin-top:6px;">Rest Day</div>
      <div class="tiny muted" style="margin-top:6px;">Recover today — back at it tomorrow.</div>
    </div>
    <button class="btn primary" id="prepComplete">Next day ›</button>`;
  } else {
    const log = pstate().log[dayNum] || { checks: {} };
    html += `<button class="btn primary" id="startSession">▶ Start Guided Workout</button><div class="spacer"></div>`;
    for (const item of prepDayItems(d)) {
      html += item.type === 'reps'
        ? prepExerciseCard(item.ex, log)
        : plankSetCard(item.ex, item.setIndex, item.total, log);
    }

    const last = dayNum >= ptotal();
    const lastLabel = S.program === 'prep30' ? '🎉 Finish prep → Start Texas Method' : '🎉 Finish program!';
    html += `<button class="btn ${last ? 'primary' : 'secondary'}" id="prepComplete">${last ? lastLabel : '✓ Mark day complete'}</button>
      <div class="spacer"></div>
      <button class="btn secondary" id="prepTimer">⏱ Start rest timer (${fmtClock(restDefault())})</button>`;
  }

  html += `</div>`;
  view.innerHTML = html;
  wirePrepToday();
}

function prepExerciseCard(ex, log) {
  let rows = '';
  if (ex.sets) {
    /* plank — timed sets */
    for (let i = 0; i < ex.sets; i++) {
      const id = `${ex.key}_${i}`;
      const on = log.checks && log.checks[id] ? 'on' : '';
      rows += `<div class="set-row workset ${on ? 'done' : ''}">
        <div class="lbl">Set ${i + 1}/${ex.sets}</div>
        <button class="mini-start" data-hold="${ex.sec}" data-holdname="${ex.name}" data-holdcheck="${id}">▶ Start · ${ex.sec}s</button>
        <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`;
    }
    return `<div class="card lift">
      <div class="lift-head"><div><div class="name">${ex.name} ${formBtn(ex.key)}</div>
      <div class="scheme">${ex.sets}×${ex.sec} sec</div></div>
      <span class="badge vol">Hold</span></div>${rows}</div>`;
  }
  /* reps exercise — single set */
  const id = ex.key;
  const on = log.checks && log.checks[id] ? 'on' : '';
  rows = `<div class="set-row workset ${on ? 'done' : ''}">
    <div class="lbl">Target</div>
    <div class="wt">${ex.reps}<small> reps${ex.side ? '/side' : ''}</small></div>
    <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`;
  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${ex.name} ${formBtn(ex.key)}</div>
    <div class="scheme">${ex.scheme || `${ex.reps} reps${ex.side ? ' each side' : ''}`}</div></div>
    <span class="badge vol">${ex.scheme ? 'Sets' : 'Reps'}</span></div>${rows}</div>`;
}

/* ordered items for a day; a multi-set hold (prep's plank) is spread
   between the other exercises. Single holds stay in place. */
function exItem(ex) { return ex.sets ? { type: 'plank', ex, setIndex: 0, total: ex.sets } : { type: 'reps', ex }; }
function prepDayItems(d) {
  const spread = d.exercises.find(e => e.sets && e.sets > 1);
  if (!spread) return d.exercises.map(exItem);
  const others = d.exercises.filter(e => e !== spread);
  const items = [];
  let pi = 0;
  others.forEach(ex => {
    items.push(exItem(ex));
    if (pi < spread.sets) { items.push({ type: 'plank', ex: spread, setIndex: pi, total: spread.sets }); pi++; }
  });
  while (pi < spread.sets) { items.push({ type: 'plank', ex: spread, setIndex: pi, total: spread.sets }); pi++; }
  return items;
}

/* a single plank set as its own card */
function plankSetCard(ex, i, total, log) {
  const id = `${ex.key}_${i}`;
  const on = log.checks && log.checks[id] ? 'on' : '';
  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${ex.name} ${formBtn(ex.key)}</div>
    <div class="scheme">${total > 1 ? `Set ${i + 1} of ${total} · ` : ''}${ex.sec} sec hold${ex.side ? ' · each side' : ''}</div></div>
    <span class="badge vol">Hold</span></div>
    <div class="set-row workset ${on ? 'done' : ''}">
      <div class="lbl">🧘 ${ex.side ? 'Each side' : 'Hold'}</div>
      <button class="mini-start" data-hold="${ex.sec}" data-holdname="${ex.name}" data-holdcheck="${id}">▶ Start · ${ex.sec}s</button>
      <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div>
    </div></div>`;
}

function wirePrepToday() {
  const dayNum = pstate().day;
  if (!pstate().log[dayNum]) pstate().log[dayNum] = { checks: {} };
  const log = pstate().log[dayNum];
  if (!log.checks) log.checks = {};

  view.querySelectorAll('[data-pcheck]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.pcheck;
      log.checks[id] = !log.checks[id];
      btn.classList.toggle('on', log.checks[id]);
      btn.closest('.set-row').classList.toggle('done', log.checks[id]);
      save();
      if (log.checks[id]) startRest();
    };
  });

  /* guided hold timer (planks): 3-2-1 get-ready → hold → ding → auto-check */
  view.querySelectorAll('[data-hold]').forEach(btn => {
    btn.onclick = () => {
      const secs = +btn.dataset.hold, checkId = btn.dataset.holdcheck;
      startGuidedHold(secs, (btn.dataset.holdname || 'HOLD').toUpperCase(), () => {
        log.checks[checkId] = true; save();
        const chk = view.querySelector(`[data-pcheck="${checkId}"]`);
        if (chk) { chk.classList.add('on'); chk.closest('.set-row').classList.add('done'); }
      });
    };
  });

  const prev = document.getElementById('prepPrev');
  const next = document.getElementById('prepNext');
  if (prev) prev.onclick = () => movePrepCursor(-1);
  if (next) next.onclick = () => movePrepCursor(1);

  const timer = document.getElementById('prepTimer');
  if (timer) timer.onclick = () => startRest();
  const ss = document.getElementById('startSession');
  if (ss) ss.onclick = () => startSession();

  document.getElementById('prepComplete').onclick = () => {
    const d = pdata()[dayNum - 1];
    if (!d.rest) { log.done = true; S.sessions = (S.sessions || 0) + 1; }
    save();
    if (dayNum >= ptotal()) { finishPrep(); return; }
    if (d.rest) { toast('Rested 😴'); }
    else { celebrateWorkout([]); }
    movePrepCursor(1);
  };
}

function movePrepCursor(dir) {
  pstate().day = Math.min(ptotal(), Math.max(1, pstate().day + dir));
  save(); render();
}

/* prep complete → hand off to Texas Method, Cycle 1a */
function finishPrep() {
  logTrainingDay();
  checkAchievements({});
  if (S.program === 'prep30') {
    S.program = 'texas';
    S.cursor = { week: 0, day: 0 };
    save(); rebuild();
    TAB = 'today';
    render();
    confetti();
    toast('Prep complete! Welcome to Texas Method 🏋️');
  } else {
    // mobility (or any other day-program): celebrate, loop back to day 1
    pstate().day = 1;
    save();
    render();
    confetti();
    toast(`${pLabel()} complete — amazing work! 🎉`);
  }
}

/* =====================================================================
   30-DAY PREP — PROGRAM (calendar)
   ===================================================================== */
function renderPrepProgram() {
  titleEl.textContent = 'Program';
  subEl.textContent   = `${pLabel()} · ${prepDaysComplete()} of ${pWorkDays()} done`;

  let cells = '';
  for (let n = 1; n <= ptotal(); n++) {
    const d = pdata()[n - 1];
    const cur  = n === pstate().day ? 'cur' : '';
    const rest = d.rest ? 'rest' : '';
    const done = prepDayDone(n) ? 'done' : '';
    let inner;
    if (d.rest) {
      inner = `<div class="prep-rest">REST</div>`;
    } else {
      inner = d.exercises.map(ex =>
        `<div class="prep-ex">${ex.sets ? `${ex.name} ${ex.sec}s` : `${ex.name} ${ex.reps}`}</div>`
      ).join('');
    }
    cells += `<div class="prep-cell ${cur} ${rest} ${done}" data-prepday="${n}">
      <div class="prep-num">${n}${done ? ' <span class="prep-tick">✓</span>' : ''}</div>
      ${inner}</div>`;
  }

  view.innerHTML = `<div class="screen">
    <div class="card" style="padding:14px 16px;">
      <div style="font-weight:800;font-size:18px;">${pLabel()}</div>
      <div class="tiny muted" style="margin-top:4px;">Tap any day to jump to it.${S.program === 'prep30' ? ' Finish Day 30 to unlock Texas Method.' : ''}</div>
    </div>
    <div class="prep-grid">${cells}</div>
  </div>`;

  view.querySelectorAll('[data-prepday]').forEach(c => c.onclick = () => {
    pstate().day = +c.dataset.prepday; save(); TAB = 'today'; render();
  });
}

/* =====================================================================
   PROGRAM
   ===================================================================== */
function renderProgram() {
  titleEl.textContent = 'Program';
  subEl.textContent   = '24 weeks · Texas Method';
  let pills = '<div class="scroller">';
  CYCLE_LABELS.forEach((lab, i) => {
    pills += `<span class="cycle-pill ${i === progCycle ? 'on' : ''}" data-cyc="${i}">Cycle ${lab}</span>`;
  });
  pills += '</div>';

  let body = '';
  for (let sub = 0; sub < 2; sub++) {
    const wk = progCycle * 2 + sub;
    const w  = PROGRAM[wk];
    body += `<h2 class="section">Week ${sub + 1} · primary ${LIFT_META[w.primary].name}</h2>`;
    [0, 1, 2].forEach(d => { body += dayTable(w, d); });
  }
  view.innerHTML = `<div class="screen">${pills}${body}</div>`;
  view.querySelectorAll('[data-cyc]').forEach(p => p.onclick = () => { progCycle = +p.dataset.cyc; render(); });
}

function dayTable(w, day) {
  const cls  = ['mon', 'wed', 'fri'][day];
  const done = isDayDone(w.idx, day);
  let rows = '';
  w.days[day].forEach(lf => {
    const wt = lf.work === 0 ? 'BW' : `${fmt(lf.work)} ${unit()}`;
    rows += `<tr><td class="nm">${lf.name}</td><td class="s">${lf.schemeLabel}</td><td class="w">${wt}</td></tr>`;
  });
  return `<div class="day-block">
    <div class="day-title"><span class="dot ${cls}"></span>${DAY_NAMES[day]}
      ${done ? '<span class="pill-done">✓ done</span>' : ''}</div>
    <div class="card" style="padding:6px 12px;"><table class="prog">${rows}</table></div></div>`;
}

function isDayDone(week, day) {
  const l = S.logs[`${week}-${day}`];
  return l && l.checks && Object.values(l.checks).filter(Boolean).length >= 3;
}

/* =====================================================================
   STATS
   ===================================================================== */
const STAT_INFO = {
  pl:      { title: 'Powerlifting Total', body: 'Your squat + bench press + deadlift added together. This is the number used in powerlifting competitions. It\'s the single best snapshot of your overall strength — watch it climb each week.' },
  wilks:   { title: 'Wilks Score', body: 'A bodyweight-adjusted strength score that lets you compare fairly across different body sizes. Under 200 is beginner, 300 is intermediate, 400+ is advanced, 500+ is elite. It uses a formula developed by Robert Wilks for powerlifting meets.' },
  squat1rm:{ title: 'Estimated Squat 1RM', body: 'Your projected one-rep max on the squat, estimated from your training weights using the Brzycki formula: weight × 36 ÷ (37 − reps). It\'s an estimate — actual maxes can vary ±5–10%.' },
  dl1rm:   { title: 'Estimated Deadlift 1RM', body: 'Your projected one-rep max on the deadlift, same Brzycki formula. Deadlift is typically your strongest lift and grows fastest on Texas Method.' },
  orm:     { title: 'Estimated 1RM by Lift', body: 'Projected one-rep maxes for all your lifts using your most recent training weights. The bar length shows relative strength — your longest bar is your strongest lift. Updates each week as you advance.' },
  ch1:     { title: '1RM Over Program', body: 'How your estimated one-rep maxes are growing week by week as you work through the 24-week Texas Method. Each line is a different lift. An upward slope means you\'re getting stronger — that\'s the whole point.' },
  ch2:     { title: 'Powerlifting Total Trend', body: 'Your combined squat + bench + deadlift total plotted across completed weeks. This is the clearest picture of your overall strength progress. A steady climb here means the program is working.' },
  swr:     { title: 'Strength-to-Weight Ratio', body: 'Each lift divided by your bodyweight. A ratio of 1.0× means you lift your own bodyweight. For women, a 1.0× squat is solid, 1.5× is strong, 2.0× is elite. For men: 1.5× solid, 2.0× strong, 2.5× elite.' },
};

function showInfo(id) {
  const info = STAT_INFO[id]; if (!info) return;
  let pop = document.getElementById('infoPop');
  if (!pop) {
    pop = document.createElement('div'); pop.id = 'infoPop'; pop.className = 'info-pop';
    document.body.appendChild(pop);
    document.body.addEventListener('click', e => {
      if (!e.target.closest('.info-btn') && !e.target.closest('.info-pop')) {
        pop.classList.remove('visible');
      }
    }, true);
  }
  pop.innerHTML = `<div class="info-pop-title">${info.title}</div><div class="info-pop-body">${info.body}</div>`;
  pop.classList.toggle('visible');
}

function ib(id) { return `<button class="info-btn" onclick="showInfo('${id}')">ⓘ</button>`; }

/* ---- exercise form tips ---- */
const FORM_TIPS = {
  pushups:   { title: 'Pushups', body: 'Hands just wider than shoulders, body in one straight line from head to heels. Brace your core and squeeze your glutes. Lower until your chest is just above the floor with elbows about 45° from your body, then press up. Don\'t let your hips sag or pike.' },
  plank:     { title: 'Plank', body: 'Forearms under shoulders, body in a straight line. Squeeze glutes, brace your abs, and tuck your ribs down. Keep your neck neutral and breathe steadily. Don\'t let your hips rise or drop.' },
  legraises: { title: 'Leg Raises', body: 'Lie flat, hands tucked under your glutes for support. Keep legs straight and together, raise them toward vertical, then lower slowly. Keep your lower back pressed into the floor — don\'t let it arch.' },
  crunches:  { title: 'Crunches', body: 'Knees bent, feet flat, hands by your ears (don\'t pull your head). Curl your shoulder blades off the floor by contracting your abs, pause, then lower with control. Short range — it\'s about the squeeze, not sitting all the way up.' },
  burpees:   { title: 'Burpees', body: 'Squat and place hands on the floor, jump your feet back to a plank (optional push-up), jump your feet back in, then explode straight up. Land softly with bent knees and keep a steady rhythm.' },
  squats:    { title: 'Bodyweight Squat', body: 'Feet shoulder-width, toes turned slightly out. Sit your hips back and down, knees tracking over your toes, chest tall. Go to at least parallel, then drive up through your whole foot. Keep your heels planted.' },
  squat:     { title: 'Barbell Squat', body: 'Bar on your upper back, feet shoulder-width, toes out slightly. Big breath and brace, sit down between your hips until your hip crease is below your knee, knees out, then drive up. Keep a neutral spine and the bar over mid-foot.' },
  bench:     { title: 'Bench Press', body: 'Pinch your shoulder blades together, slight arch, feet planted. Lower the bar to your mid/lower chest with elbows about 45–75° from your body, touch, then press up and slightly back over your shoulders. Keep your butt on the bench.' },
  press:     { title: 'Overhead Press', body: 'Bar on your front delts, grip just outside shoulders. Squeeze glutes and abs, press the bar straight up, and move your head "through" the window at lockout. Finish with the bar over your mid-foot, biceps by your ears.' },
  deadlift:  { title: 'Deadlift', body: 'Bar over mid-foot, hips higher than knees, flat back, grip just outside your knees. Take the slack out of the bar, then push the floor away and stand tall — bar drags up close to your legs. Lock out hips and knees together; don\'t round your back.' },
  clean:     { title: 'Power Clean', body: 'Set up like a deadlift. Pull from the floor, then explosively extend hips/knees/ankles, shrug, and pull yourself under to catch the bar on your front delts in a quarter squat. Fast elbows, soft knees on the catch.' },
  backext:   { title: 'Back Extension', body: 'Hips on the pad, feet anchored. Lower your torso under control, then raise until your body is in a straight line — squeeze your glutes at the top. Don\'t hyperextend or swing.' },
  chin:      { title: 'Chin-Up', body: 'Underhand (palms-facing-you) grip, shoulder-width. From a dead hang, pull your chest toward the bar leading with your elbows, chin over the bar, then lower all the way under control. Full range each rep.' },
  hipcars:   { title: 'Hip CARs', body: 'Stand tall (hold something for balance). Lift one knee up, rotate it out to the side, then sweep it behind you and back down — drawing the biggest slow circle you can with your knee. Keep your torso still and core braced. Do the reps one direction, then reverse. Both legs.' },
  n9090:     { title: '90/90 Hip Switches', body: 'Sit with one leg bent in front (shin across you) and the other bent out to the side, both knees ~90°. Keeping your chest tall, rotate your knees across the floor to switch to the mirror position. Controlled, no hands if you can. That\'s one rep.' },
  deepsquat: { title: 'Deep Squat Hold', body: 'Sink into the bottom of a squat, heels down, chest up, and gently push your knees out with your elbows. Relax into it and breathe. Hold a doorframe for balance if needed. Builds hip, knee and ankle mobility.' },
  tibraise:  { title: 'Tibialis Raises', body: 'Stand with your back against a wall, feet a step out. Keeping legs straight, pull your toes up toward your shins as high as possible, then lower slowly. Strengthens the front-shin muscle — huge for knee health and ankle control.' },
  calfraise: { title: 'Eccentric Calf Raises', body: 'On a step (or floor), rise onto the balls of both feet, shift to one foot, then lower that heel down slowly (3–4 seconds) below the step for a stretch. Builds strong, resilient Achilles tendons. Do the reps each side.' },
  anklerock: { title: 'Knee-to-Wall Ankle Rocks', body: 'Face a wall, foot a few inches back, heel down. Drive your knee forward over your toes to touch the wall without your heel lifting, then back. Move your foot farther as you improve. Great for ankle/Achilles mobility. Each side.' },
  shouldercars: { title: 'Shoulder CARs', body: 'Stand tall, brace your core. Slowly draw the biggest circle you can with one straight arm — up the front, overhead, around the back, and down — keeping tension the whole way. Keep your ribs down. Reverse direction, then the other arm.' },
  wallangel: { title: 'Wall Angels', body: 'Back against a wall, arms in a goalpost with the backs of your hands/elbows touching the wall. Slide your arms overhead and back down while keeping everything in contact with the wall. Opens tight shoulders and upper back.' },
  atgsplit:  { title: 'ATG Split Squat', body: 'From a long split stance, lower your back knee toward the floor while letting your front knee travel forward over — and past — your toes, keeping the heel down. Sink as deep as you can control, then drive back up. Active, loaded full-range work that builds bulletproof knees and opens the hips. Do the reps each side.' },
  bicycle:   { title: 'Bicycle Crunches', body: 'On your back, hands by your ears, shoulders off the floor. Bring one knee in and rotate the opposite elbow toward it while the other leg extends. Alternate sides in a smooth pedaling motion. Twist from your torso, not your neck. Count every elbow-to-knee as a rep.' },
  rtwist:    { title: 'Russian Twists', body: 'Sit with knees bent, heels down (or feet up for harder), lean back to ~45°. Brace your core and rotate your hands side to side, tapping near each hip. Move from the ribs, not just the arms. Each tap is a rep.' },
  hollow:    { title: 'Hollow Body Hold', body: 'Lie on your back, press your lower back into the floor. Lift your shoulders and legs a few inches, arms reaching overhead — your body forms a shallow banana. Keep that lower back glued down the whole time. Lower the limbs higher to make it easier.' },
  gobletsquat:{ title: 'Goblet Squat', body: 'Hold one dumbbell vertically against your chest. Feet shoulder-width, sit hips down between your knees keeping your chest tall and heels down. Drive up through your whole foot. The dumbbell at your chest helps you stay upright.' },
  dbpress:   { title: 'DB Floor Press', body: 'Lie on the floor (or bench), dumbbells over your chest. Lower until your upper arms touch the floor (elbows ~45° from your body), pause, then press back up. The floor caps the range and protects your shoulders.' },
  dbrow:     { title: 'DB Bent-Over Row', body: 'Hinge at the hips with a flat back, dumbbells hanging. Pull them to your waistline, driving your elbows back and squeezing your shoulder blades. Lower under control. Keep your torso still.' },
  dbrdl:     { title: 'DB Romanian Deadlift', body: 'Soft knees, dumbbells in front of your thighs. Push your hips back and slide the weights down your legs until you feel a hamstring stretch (flat back the whole way), then drive your hips forward to stand. Hinge, don\'t squat.' },
  dbohp:     { title: 'DB Shoulder Press', body: 'Dumbbells at shoulder height, palms forward, core braced. Press straight overhead without arching your lower back, then lower with control to your shoulders. Keep ribs down.' },
  dbcurl:    { title: 'DB Biceps Curl', body: 'Elbows tucked at your sides, curl the dumbbells up by bending only at the elbow, squeeze, then lower slowly. No swinging — keep your upper arms still.' },
  dblunge:   { title: 'DB Reverse Lunge', body: 'Dumbbells at your sides. Step one foot back and lower until both knees are ~90°, front heel down, torso tall. Drive through the front foot to stand. Do all reps, then switch — or alternate.' },
  dbpushup:  { title: 'Push-up', body: 'Hands just wider than shoulders, body in one straight line. Lower until your chest is just above the floor with elbows ~45° from your body, then press up. Keep your core tight and hips level. Drop to your knees if needed.' },
  dbrenrow:  { title: 'DB Renegade Row', body: 'Top of a push-up position gripping two dumbbells, feet wide for balance. Brace hard and row one dumbbell to your waist without letting your hips twist, lower, then the other side. Anti-rotation core plus back work.' },
  dbhinge:   { title: 'DB Deadlift', body: 'Dumbbells on the floor beside your feet (or in front). Flat back, hinge and bend to grip them, then stand tall by driving your hips forward and pushing the floor away. Keep the weights close and your back neutral.' },
  dblatraise:{ title: 'DB Lateral Raise', body: 'Slight bend in the elbows, raise the dumbbells out to your sides to about shoulder height — lead with your elbows, not your hands — then lower slowly. Light weight, no swinging. Hits the side delts.' },
  dbhammer:  { title: 'DB Hammer Curl', body: 'Curl with a neutral grip (palms facing each other, like holding hammers), elbows tucked. Squeeze at the top, lower slowly. Builds the biceps and forearms.' },
  hundred:   { title: 'The Hundred', body: 'On your back, curl your head and shoulders up, legs extended at ~45° (or knees bent/tabletop to start). Reach your arms long by your sides and pump them up and down with small vigorous beats while breathing — 5 counts in, 5 counts out. Keep your lower back pressed down and abs scooped.' },
  rollup:    { title: 'Roll-Up', body: 'Lie flat, arms overhead. Reach forward and peel your spine off the mat one vertebra at a time, curling up and over toward your toes, then roll back down with the same control. Move slowly and articulate the spine — no momentum.' },
  legcircle: { title: 'Single Leg Circles', body: 'On your back, one leg pointed to the ceiling, the other long on the mat. Draw controlled circles with the lifted leg, keeping your hips and torso completely still and stable. Reps one direction, then reverse. Then switch legs.' },
  rollball:  { title: 'Rolling Like a Ball', body: 'Balance at the back of your sit bones, knees tucked, chin to chest in a tight ball. Roll back to your shoulder blades on an inhale, then roll up to balance on an exhale — without your feet touching down. Control, not speed.' },
  singlestretch:{ title: 'Single Leg Stretch', body: 'Curl your head and shoulders up. Hug one knee to your chest while the other leg extends long at ~45°, then switch hands and legs in a smooth pull-pull rhythm. Keep your back flat and abs scooped.' },
  doublestretch:{ title: 'Double Leg Stretch', body: 'Head and shoulders curled up, knees hugged in. Extend arms overhead and legs out long at the same time (stretch), then circle the arms around and pull the knees back in. Keep your lower back anchored throughout.' },
  spinestretch:{ title: 'Spine Stretch Forward', body: 'Sit tall, legs extended a bit wider than your hips, arms reaching forward. Exhale and round forward over your legs, growing tall through the crown as you scoop your belly back — then restack your spine to sit tall. A C-curve, not a flat reach.' },
  saw:       { title: 'The Saw', body: 'Sit tall, legs wide, arms out to the sides. Rotate your torso toward one foot and reach your opposite pinky past your little toe — "sawing" off the toe — then roll up and switch. Twist from the waist, hips stay planted. Each side.' },
  swan:      { title: 'Swan', body: 'Lie face down, hands under your shoulders. Lengthen and lift your chest into a smooth back extension, keeping your glutes and legs engaged and your neck long — then lower with control. Lift from your upper back, don\'t crank your lower back.' },
  sidekick:  { title: 'Side Kicks', body: 'Lie on your side, body in one long line, head supported. Lift the top leg to hip height and swing it forward (two small pulses) then sweep it back, keeping your torso still and core braced. Controlled — your trunk shouldn\'t rock. Each side.' },
  teaser:    { title: 'Teaser', body: 'From lying, float your legs to ~45° and roll your upper body up, reaching your arms toward your toes so your body makes a V balanced on your sit bones. Lower with control. Start with bent knees or one leg if needed — it\'s an advanced move.' },
  jacks:     { title: 'Jumping Jacks', body: 'Jump your feet out wide while raising your arms overhead, then jump back in. Stay light on the balls of your feet and keep a steady pace. Low-impact option: step out one foot at a time.' },
  highknees: { title: 'High Knees', body: 'Run in place driving your knees up toward hip height, landing softly on the balls of your feet, arms pumping. Keep your chest tall and core tight. Go faster as you warm up.' },
  mtnclimb:  { title: 'Mountain Climbers', body: 'From a strong plank (hands under shoulders), drive one knee toward your chest then quickly switch, like running horizontally. Keep your hips low and level — don\'t let your butt pike up.' },
  squatjump: { title: 'Squat Jumps', body: 'Drop into a squat, then explode up into a jump, reaching tall. Land softly with bent knees and immediately sink into the next rep. Low-impact option: fast bodyweight squats with no jump.' },
  plankjack: { title: 'Plank Jacks', body: 'Hold a strong plank on hands or forearms. Jump your feet out wide and back together like a horizontal jumping jack, keeping your hips level and core braced — no bouncing or sagging.' },
  skaters:   { title: 'Skaters', body: 'Bound side to side, leaping onto one foot and sweeping the other leg behind you, like a speed skater. Land soft and bent, stay low and athletic. Low-impact: step side to side instead of jumping.' },
  buttkick:  { title: 'Butt Kicks', body: 'Jog in place flicking your heels up toward your glutes, staying light on the balls of your feet with your chest tall and arms pumping. Quick and bouncy.' },
  shrimp:    { title: 'Hip Escape (Shrimp)', body: 'Lie on your back, feet flat. Turn onto one shoulder, post that foot, push off the floor and drive your hips back and away — sliding your butt toward where your head was. Frame your hands as if defending. Reset and go the other side. The #1 BJJ escape movement; move your hips, not just your feet.' },
  revshrimp: { title: 'Reverse Shrimp', body: 'The shrimp in reverse — instead of pushing your hips away, pull/scoot them back toward your shoulders, sliding up the mat. Stay on your side, frame, and use your legs to move your hips. Useful for recovering position and moving up the body.' },
  bridge:    { title: 'Bridge / Upa', body: 'On your back, feet flat and close to your butt. Plant a foot, turn your head and look over one shoulder, then drive through your heels and explosively lift your hips toward the ceiling and over that shoulder. This is the upa escape from mount — bridge high, not just up.' },
  techstand: { title: 'Technical Stand-up', body: 'From seated, post one hand and the opposite foot behind you, lift your hips and swing the free leg through to stand — keeping a knee/forearm shield between you and an imaginary opponent the whole time. Stand up "in base," never turning your back. Each side.' },
  granby:    { title: 'Granby Roll', body: 'A shoulder roll while inverted on your back — tuck your chin, roll over one shoulder (not your head/neck) hip-to-hip to free your hips and recover guard. Go slow and protect your neck. Drill both directions.' },
  sprawl:    { title: 'Sprawls', body: 'From standing, drop your hips toward the floor and kick both legs back hard, landing in a low plank with hips down and chest up — the takedown defense. Then recover to your feet quickly. Hips down and heavy is the key.' },
  sitout:    { title: 'Sit-outs', body: 'From a quadruped/sprawl base, shoot one leg through underneath you and turn to face up, posting on the opposite hand — like escaping a front headlock or turning in to face your opponent. Return and alternate. Stay low and turn your hips through.' },
  breakfall: { title: 'Back Breakfalls', body: 'From standing or squatting, sit and roll backward onto your rounded back, slapping the mat with both arms at ~45° to disperse the impact, chin tucked to your chest. Practice landing softly and safely — the foundation for being thrown.' },
  hipheist:  { title: 'Hip Heist', body: 'From a seated/sprawl position, post a hand and swivel your hips, switching from facing one way to the other by threading your bottom leg through — the scramble movement used to come up on top. Keep your hips off the floor and switch quickly. Each side.' },
  invhold:   { title: 'Inversion Hold', body: 'On your back, roll your hips up and over so your weight is on your upper back/shoulders with your hips stacked above (support your back with your hands if needed). Hold and breathe — builds the spinal/hip mobility for inverting in guard. Ease into it; protect your neck.' }
};
function showFormTip(key) {
  const info = FORM_TIPS[key]; if (!info) return;
  let pop = document.getElementById('infoPop');
  if (!pop) {
    pop = document.createElement('div'); pop.id = 'infoPop'; pop.className = 'info-pop';
    document.body.appendChild(pop);
    document.body.addEventListener('click', e => {
      if (!e.target.closest('.info-btn') && !e.target.closest('.info-pop')) pop.classList.remove('visible');
    }, true);
  }
  const q = encodeURIComponent(info.title + ' exercise how to');
  pop.innerHTML = `<div class="info-pop-title">${info.title}</div><div class="info-pop-body">${info.body}</div>
    <a class="tip-demo" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">🎬 Watch a demo</a>`;
  pop.classList.add('visible');
}
function formBtn(key) { return FORM_TIPS[key] ? `<button class="info-btn" onclick="showFormTip('${key}')">ⓘ</button>` : ''; }

function renderStats() {
  if (isDayProgram()) { renderPrepStats(); return; }
  titleEl.textContent = 'Stats';
  subEl.textContent   = 'Projections · Wilks · Graphs';

  const doneWeeks = S.cursor.week;
  const hasLogs   = Object.keys(S.logs).length > 0;
  const hasData   = doneWeeks > 0 && hasLogs;

  const u = unit(), L = S.settings.lifts;

  // Tiles: real values when data exists, dash otherwise
  let plNow = '—', wNow = '—', squat1rm = '—', dl1rm = '—';
  let bars = '', ratios = '';

  if (hasData) {
    const completedProgram = PROGRAM.slice(0, doneWeeks);
    const lastWeek = completedProgram[completedProgram.length - 1];
    const cur = {};
    ['squat','bench','deadlift','press','clean'].forEach(k => {
      cur[k] = oneRM(lastWeek.intensity[k] || L[k].weight, 5);
    });
    const plVal = (lastWeek.intensity.squat||0) + (lastWeek.intensity.bench||0) + (lastWeek.intensity.deadlift||0);
    const wVal  = wilks(plVal, S.settings.bodyweight, S.settings.sex, S.settings.units);
    plNow    = `${fmt(plVal)} <small>${u}</small>`;
    wNow     = wVal ? wVal.toFixed(1) : '—';
    squat1rm = `${fmt(cur.squat)} <small>${u}</small>`;
    dl1rm    = `${fmt(cur.deadlift)} <small>${u}</small>`;
    const maxv = Math.max(...Object.values(cur));
    [['squat','Squat'],['bench','Bench'],['deadlift','Deadlift'],['press','Press'],['clean','Power Clean']].forEach(([k,nm]) => {
      const v = cur[k];
      bars += `<div class="bar-line"><div class="top"><span>${nm}</span><b>${fmt(v)} ${u}</b></div>
        <div class="track"><div class="fill" style="width:${(v/maxv*100).toFixed(0)}%"></div></div></div>`;
      const r = v / S.settings.bodyweight;
      ratios += `<div class="bar-line"><div class="top"><span>${LIFT_META[k].name}</span><b>${r.toFixed(2)}×</b></div>
        <div class="track"><div class="fill" style="width:${Math.min(100,r/3*100).toFixed(0)}%"></div></div></div>`;
    });
  } else {
    // Placeholder rows — show lift names but no values yet
    [['squat','Squat'],['bench','Bench'],['deadlift','Deadlift'],['press','Press'],['clean','Power Clean']].forEach(([k,nm]) => {
      bars   += `<div class="bar-line"><div class="top"><span>${nm}</span><b class="dim">—</b></div>
        <div class="track"><div class="fill" style="width:0%"></div></div></div>`;
      ratios += `<div class="bar-line"><div class="top"><span>${LIFT_META[k].name}</span><b class="dim">—</b></div>
        <div class="track"><div class="fill" style="width:0%"></div></div></div>`;
    });
  }

  const weekLabel = hasData ? ` — Week ${doneWeeks}` : '';
  const noDataNote = !hasData ? `<div class="tiny muted center" style="margin-top:6px">Complete your first workout to see data</div>` : '';

  view.innerHTML = `<div class="screen">
    <div class="tiles">
      <div class="tile"><div class="k">Powerlifting Total ${ib('pl')}</div><div class="v">${plNow}</div></div>
      <div class="tile"><div class="k">Wilks Score ${ib('wilks')}</div><div class="v">${wNow}</div></div>
      <div class="tile"><div class="k">Best Squat 1RM ${ib('squat1rm')}</div><div class="v">${squat1rm}</div></div>
      <div class="tile"><div class="k">Best Deadlift 1RM ${ib('dl1rm')}</div><div class="v">${dl1rm}</div></div>
    </div>
    <h2 class="section">Estimated 1RM${weekLabel} ${ib('orm')}</h2>
    <div class="card">${bars}</div>
    <h2 class="section">1RM over program ${ib('ch1')}</h2>
    <div class="card">
      <canvas id="ch1" class="chart"></canvas>
      ${noDataNote}
      <div class="tiny muted center" style="margin-top:4px">Squat · Bench · Deadlift · Press${hasData ? ` — ${doneWeeks} of 24 weeks` : ' — 24 weeks'}</div>
    </div>
    <h2 class="section">Powerlifting total trend ${ib('ch2')}</h2>
    <div class="card">
      <canvas id="ch2" class="chart"></canvas>
      ${noDataNote}
    </div>
    <h2 class="section">Strength-to-weight ratio ${ib('swr')}</h2>
    <div class="card">${ratios}</div>
    ${prCardHTML()}
    ${calendarHTML()}
    ${achievementsCardHTML()}
    <button class="btn secondary" id="shareBtn">📤 Share my progress</button>
  </div>`;
  drawProjectionCharts();
  const sb = document.getElementById('shareBtn'); if (sb) sb.onclick = shareCard;
  wireCalendar();
}

/* ---- Achievements + PR cards (shared by both stats screens) ---- */
function achievementsCardHTML() {
  const items = ACHIEVEMENTS.map(a => {
    const on = S.achievements.includes(a.id);
    return `<div class="ach ${on ? 'on' : ''}"><div class="ach-emoji">${a.emoji}</div><div class="ach-name">${a.name}</div></div>`;
  }).join('');
  const got = S.achievements.length, tot = ACHIEVEMENTS.length;
  return `<h2 class="section">Achievements — ${got}/${tot}</h2><div class="card"><div class="ach-grid">${items}</div></div>`;
}
function prCardHTML() {
  const keys = Object.keys(S.prs || {});
  if (!keys.length) return '';
  const order = ['squat','bench','press','deadlift','clean'];
  const rows = keys.sort((a,b)=>order.indexOf(a)-order.indexOf(b)).map(k => {
    const p = S.prs[k]; const nm = (LIFT_META[k] || {}).name || k;
    return `<div class="pr-row"><span class="pr-nm">${nm}</span><b>${fmt(p.weight)} ${unit()} × ${p.reps}</b><span class="pr-1rm">~${fmt(Math.round(p.e1rm))} 1RM</span></div>`;
  }).join('');
  return `<h2 class="section">🏆 Personal Records</h2><div class="card">${rows}</div>`;
}

/* current & best run of completed workout-days (rest days don't break it) */
function prepStreaks() {
  const seq = [];
  for (let n = 1; n <= ptotal(); n++) {
    if (pdata()[n - 1].rest) continue;
    seq.push(prepDayDone(n));
  }
  let best = 0, run = 0, lastDone = -1;
  seq.forEach((d, i) => { if (d) { run++; best = Math.max(best, run); lastDone = i; } else run = 0; });
  let current = 0;
  for (let i = lastDone; i >= 0 && seq[i]; i--) current++;
  return { current, best };
}

function renderPrepStats() {
  titleEl.textContent = 'Stats';
  subEl.textContent   = `${pLabel()} · progress`;

  const workoutDays = pWorkDays();
  const done = prepDaysComplete();
  const pct  = Math.round(done / workoutDays * 100);
  const { current, best } = prepStreaks();
  const exKeys = pExKeys(), full = pFull();

  // cumulative tally across completed days
  const tally = { plankSec: 0 };
  for (let n = 1; n <= ptotal(); n++) {
    if (!prepDayDone(n)) continue;
    pdata()[n - 1].exercises.forEach(ex => {
      if (ex.sets) tally.plankSec += ex.sets * ex.sec; else tally[ex.key] = (tally[ex.key] || 0) + ex.reps;
    });
  }
  let totalReps = 0; exKeys.forEach(e => totalReps += (tally[e.key] || 0));
  const holdLabel = S.program === 'prep30' ? 'Plank time' : 'Hold time';

  // per-exercise "banked" bars — fill grows toward the full-plan total
  const banked = exKeys.map(e => {
    const v = tally[e.key] || 0, fl = full[e.key] || 1;
    const w = Math.min(100, Math.round(v / fl * 100));
    return `<div class="bar-line"><div class="top"><span>${e.icon} ${e.name}</span><b>${v} <span class="muted" style="font-weight:600">/ ${fl}</span></b></div>
      <div class="track"><div class="fill" style="width:${w}%"></div></div></div>`;
  }).join('');

  view.innerHTML = `<div class="screen prep-stats">
    <div class="tiles">
      <div class="tile"><div class="k">Days complete</div><div class="v">${done} <small>/ ${workoutDays}</small></div></div>
      <div class="tile"><div class="k">🔥 Streak</div><div class="v">${current} <small>day${current===1?'':'s'}</small></div><div class="tile-sub">best ${best}</div></div>
      <div class="tile"><div class="k">Total reps banked</div><div class="v">${totalReps.toLocaleString()}</div></div>
      <div class="tile"><div class="k">${holdLabel}</div><div class="v">${Math.round(tally.plankSec/60)}<small> min</small></div></div>
    </div>

    <h2 class="section">${S.program === 'prep30' ? 'Reps banked — watch it climb' : 'Total movement — watch it climb'}</h2>
    <div class="card">${banked}
      <div class="tiny muted center" style="margin-top:8px">Totals across every workout you've completed. Bars fill toward the full-program total.</div>
    </div>

    <h2 class="section">Completion</h2>
    <div class="card">
      <div class="bar-line"><div class="top"><span>${pLabel()}</span><b>${done} / ${workoutDays} <span class="muted" style="font-weight:600">· ${pct}%</span></b></div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div></div>
      <div class="tiny muted center" style="margin-top:8px">
        ${done >= workoutDays
          ? (S.program === 'prep30' ? 'All done — finish Day 30 to start Texas Method 🏋️' : 'All done — incredible consistency! 🎉')
          : `${workoutDays - done} day${workoutDays-done===1?'':'s'} to go.`}
      </div>
    </div>
    ${calendarHTML()}
    ${achievementsCardHTML()}
    <button class="btn secondary" id="shareBtn">📤 Share my progress</button>
  </div>`;
  const sb = document.getElementById('shareBtn'); if (sb) sb.onclick = shareCard;
  wireCalendar();
}

function drawProjectionCharts() {
  const doneWeeks = S.cursor.week;
  const hasLogs   = Object.keys(S.logs).length > 0;

  if (!doneWeeks || !hasLogs) {
    // Draw empty grid frames so user can see chart areas
    emptyChart(document.getElementById('ch1'), ['Squat','Bench','Deadlift','Press']);
    emptyChart(document.getElementById('ch2'), ['PL Total']);
    return;
  }

  const completedProgram = PROGRAM.slice(0, doneWeeks);
  const labels = completedProgram.map(w => w.label + '.' + w.subweek);

  lineChart(document.getElementById('ch1'),
    ['squat','bench','deadlift','press'].map((k,i) => ({
      name: LIFT_META[k].name,
      color: ['#aaff00','#77cc00','#448800','#ccff44'][i],
      data: completedProgram.map(w => oneRM(w.intensity[k], 5))
    })), labels);

  lineChart(document.getElementById('ch2'),
    [{ name:'PL Total', color:'#aaff00',
       data: completedProgram.map(w => w.intensity.squat + w.intensity.bench + w.intensity.deadlift) }],
    labels);
}

function emptyChart(canvas, seriesNames) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = 200;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const pad = { l:38, r:10, t:12, b:22 };
  // Draw faint grid lines
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (H - pad.t - pad.b) * (g / 4);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  // Legend placeholders
  const colors = ['#aaff00','#77cc00','#448800','#ccff44'];
  ctx.font = '10px -apple-system,sans-serif'; ctx.fillStyle = '#555555';
  seriesNames.forEach((nm, i) => {
    const lx = pad.l + i * 70;
    ctx.fillStyle = colors[i] || '#555555';
    ctx.fillRect(lx, 2, 10, 4);
    ctx.fillStyle = '#555555';
    ctx.fillText(nm, lx + 14, 8);
  });
}

function lineChart(canvas, series, labels) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = 200;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  const pad = { l:38, r:10, t:12, b:22 };
  const all = series.flatMap(s => s.data);
  let min = Math.min(...all), max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const py = v => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));
  const px = i => pad.l + (W - pad.l - pad.r) * (i / (labels.length - 1));
  ctx.strokeStyle = 'rgba(170,255,0,.15)'; ctx.fillStyle = '#aaaaaa'; ctx.font = '10px -apple-system,sans-serif'; ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const v = min + (max - min) * g / 4, y = py(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.globalAlpha = .5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillText(Math.round(v), 4, y + 3);
  }
  for (let i = 0; i < labels.length; i += 4) ctx.fillText(labels[i], px(i) - 8, H - 6);
  series.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.beginPath();
    s.data.forEach((v, i) => { const X = px(i), Y = py(v); i ? ctx.lineTo(X,Y) : ctx.moveTo(X,Y); });
    ctx.stroke();
  });
  let lx = pad.l; ctx.font = '11px -apple-system,sans-serif';
  series.forEach(s => {
    ctx.fillStyle = s.color; ctx.fillRect(lx, 2, 10, 4);
    ctx.fillStyle = '#aaaaaa'; ctx.fillText(s.name, lx + 14, 8);
    lx += ctx.measureText(s.name).width + 34;
  });
}

/* =====================================================================
   SETUP  (changes #3 bar/plates at top + #4 tap-twice confirm)
   ===================================================================== */
function renderSetup() {
  titleEl.textContent = 'Setup';
  subEl.textContent   = 'Your numbers — saved automatically';
  const s = S.settings;
  const cloud = loadCloud();
  const stdPlates = s.units === 'lb' ? STD_PLATES_LB : STD_PLATES_KG;

  const plateChips = stdPlates.map(p =>
    `<span class="plate-chip ${s.plates.includes(p) ? 'on' : ''}" data-plate="${p}">${fmt(p)}</span>`
  ).join('');

  const liftRows = ['squat','bench','deadlift','press','clean'].map(k => `
    <div class="inline3" style="margin-bottom:10px">
      <span class="nm">${LIFT_META[k].name}</span>
      <input type="number" inputmode="decimal" data-lift="${k}" data-f="weight" value="${s.lifts[k].weight}" />
      <input type="number" inputmode="numeric" data-lift="${k}" data-f="reps" value="${s.lifts[k].reps}" />
    </div>`).join('');

  const incRows = ['squat','bench','deadlift','press','clean'].map(k => `
    <div class="inline3" style="margin-bottom:10px">
      <span class="nm">${LIFT_META[k].name}</span>
      <input type="number" inputmode="decimal" data-inc="${k}" value="${s.increment[k]}" />
      <input type="number" inputmode="decimal" data-step="${k}" value="${s.incPerSession[k]}" />
    </div>`).join('');

  view.innerHTML = `<div class="screen">

    <h2 class="section">Active program</h2>
    <div class="card">
      <div class="seg" id="segProgram" style="flex-direction:column;gap:8px">
        <button data-prog="prep30"   class="${S.program==='prep30'?'on':''}">🗓️ 30-Day Prep · bodyweight ramp-up</button>
        <button data-prog="mobility" class="${S.program==='mobility'?'on':''}">🧘 Mobility Method · daily joint mobility</button>
        <button data-prog="core"     class="${S.program==='core'?'on':''}">🔥 Core &amp; Abs · 28-day core builder</button>
        <button data-prog="dumbbell" class="${S.program==='dumbbell'?'on':''}">💪 Dumbbell Full-Body · A/B strength</button>
        <button data-prog="pilates"  class="${S.program==='pilates'?'on':''}">🤸 Pilates Mat · classical J.H. Pilates</button>
        <button data-prog="hiit"     class="${S.program==='hiit'?'on':''}">⚡ Full-Body HIIT · timed circuit</button>
        <button data-prog="bjj"      class="${S.program==='bjj'?'on':''}">🥋 BJJ Solo Drills · jiu-jitsu movement</button>
        <button data-prog="texas"    class="${S.program==='texas'?'on':''}">🏋️ Texas Method · barbell program</button>
      </div>
      <div class="hint">Pick any program. 30-Day Prep, Mobility, Core &amp; Abs and Dumbbell Full-Body are guided day-by-day; Texas Method is the barbell strength program. Switch any time.</div>
    </div>

    <h2 class="section">Display — text size</h2>
    <div class="card">
      <div class="stepper" style="justify-content:center;gap:18px">
        <button id="zoomMinus">−</button>
        <div class="val" id="zoomVal">${Math.round(loadZoom()*100)}%</div>
        <button id="zoomPlus">+</button>
      </div>
      <div class="hint">Make everything bigger or smaller. (You can also pinch-to-zoom in a browser tab; some installed/home-screen apps lock pinch, so use this slider there.)</div>
    </div>

    <h2 class="section">Your bar & plates</h2>
    <div class="card">
      <div class="field">
        <label>Bar weight (${s.units})</label>
        <input type="number" inputmode="decimal" id="barWt" value="${s.barWeight}" />
      </div>
      <div class="field">
        <label>Available plates (${s.units}) — tap to toggle</label>
        <div class="plate-chips" id="plateChips">${plateChips}</div>
        <div class="hint">Checked plates = what's on your bar. All weights snap to what you can actually load.</div>
      </div>
    </div>

    <h2 class="section">Units & lifter</h2>
    <div class="card">
      <div class="field"><label>Units</label>
        <div class="seg" id="segUnits">
          <button data-u="lb" class="${s.units==='lb'?'on':''}">lb</button>
          <button data-u="kg" class="${s.units==='kg'?'on':''}">kg</button>
        </div>
      </div>
      <div class="field"><label>Sex (for Wilks score)</label>
        <div class="seg" id="segSex">
          <button data-x="female" class="${s.sex==='female'?'on':''}">Female</button>
          <button data-x="male"   class="${s.sex==='male'?'on':''}">Male</button>
        </div>
      </div>
      <div class="field"><label>Bodyweight (${s.units})</label>
        <input type="number" inputmode="decimal" id="bw" value="${s.bodyweight}" /></div>
    </div>

    <h2 class="section">Current lifts — weight × reps</h2>
    <div class="card">
      <div class="inline3" style="margin-bottom:8px">
        <span class="tiny muted">Lift</span><span class="tiny muted">Weight</span><span class="tiny muted">Reps</span>
      </div>
      ${liftRows}
      <div class="hint">1RM estimated with Brzycki formula.</div>
    </div>

    <h2 class="section">Rounding & progression</h2>
    <div class="card">
      <div class="inline3" style="margin-bottom:8px">
        <span class="tiny muted">Lift</span><span class="tiny muted">Warm-up round</span><span class="tiny muted">Step / session</span>
      </div>
      ${incRows}
      <div class="hint">Warm-up round = smallest plate jump. Step = weight added each heavy session.</div>
    </div>

    <h2 class="section">Progression mode</h2>
    <div class="card">
      <div class="seg" id="segMode" style="flex-direction:column;gap:8px">
        <button data-m="limit"    class="${s.mode==='limit'?'on':''}">Limit · capped at 3× pace (default)</button>
        <button data-m="slowroll" class="${s.mode==='slowroll'?'on':''}">Slow-roll · capped at 2× pace</button>
        <button data-m="leterrip" class="${s.mode==='leterrip'?'on':''}">Let 'er rip · no cap</button>
      </div>
      <div class="field" style="margin-top:14px"><label>OHP Wednesday decrement (90–99%)</label>
        <input type="number" inputmode="decimal" id="ohp" value="${Math.round(s.ohpDecrement*100)}" /></div>
    </div>

    <h2 class="section">Rest timer</h2>
    <div class="card">
      <div class="field"><label>Default length</label>
        <div class="seg" id="segRest">
          ${[30,60,90,120,180].map(v => `<button data-rest="${v}" class="${s.restSec===v?'on':''}">${fmtClock(v)}</button>`).join('')}
        </div>
      </div>
      <div class="inline2b" style="margin-top:4px">
        <div class="field" style="margin:0"><label>Custom (seconds)</label>
          <input type="number" inputmode="numeric" id="restCustom" value="${s.restSec}" /></div>
        <div class="field" style="margin:0"><label>Adjust step (± sec)</label>
          <input type="number" inputmode="numeric" id="restStepInp" value="${s.restStep}" /></div>
      </div>
      <div class="field" style="margin-top:14px"><label>Voice coaching</label>
        <div class="seg" id="segVoice">
          <button data-voice="on"  class="${s.voice ? 'on' : ''}">On</button>
          <button data-voice="off" class="${s.voice ? '' : 'on'}">Off</button>
        </div>
      </div>
      <div class="hint">Used by the auto-start after each set and the “Start rest timer” button. The ± buttons on the timer bar nudge by your step. Voice coaching speaks the count-in and cues during a guided workout.</div>
    </div>

    <h2 class="section">☁️ Cloud sync — Google</h2>
    <div class="card">
      <div id="cloudAuth"></div>
      <div class="tiny muted" id="cloudStatus" style="margin-top:10px;min-height:18px"></div>
      <div class="hint">Sign in with Google to sync your profiles across your own devices. Each Google account is private — other people sign in with their own account on their own device and only see their own data.</div>
    </div>

    <h2 class="section">Data</h2>
    <div class="card">
      <button class="btn secondary" id="resetCursor">↺ Jump to Week 1, Monday</button>
      <div class="spacer"></div>
      <button class="btn danger" id="wipe">Erase all logged data</button>
    </div>

    <h2 class="section">Backup &amp; Restore</h2>
    <div class="card">
      <p class="tiny muted" style="margin:0 0 12px">Export saves <b>all profiles</b> — every lifter's settings, logs, body weight, cursor and prep progress — in one file. Import restores the whole set onto another device.</p>
      <div class="row2">
        <button class="btn primary" id="exportBtn">⬇ Export all profiles</button>
        <button class="btn secondary" id="importBtn">⬆ Import backup</button>
      </div>
      <input type="file" id="importFile" accept=".json" style="display:none">
    </div>

    <h2 class="section">Factory Reset</h2>
    <div class="card">
      <p class="tiny muted" style="margin:0 0 12px">Wipes everything — all logs, settings, and body weight data. App returns to defaults. Export a backup first.</p>
      <button class="btn danger" id="factoryReset">⚠ Factory reset — erase everything</button>
    </div>

    <div class="center tiny muted" style="margin:18px 0 6px">Texas Method Trainer · works offline · add to Home Screen</div>
  </div>`;

  wireSetup();
}

function wireSetup() {
  const s = S.settings;

  /* program selector */
  view.querySelectorAll('#segProgram button').forEach(b => b.onclick = () => {
    S.program = b.dataset.prog; save(); render();
    const names = { prep30: '30-Day Prep 🗓️', mobility: 'Mobility Method 🧘', core: 'Core & Abs 🔥', dumbbell: 'Dumbbell Full-Body 💪', pilates: 'Pilates Mat 🤸', hiit: 'Full-Body HIIT ⚡', bjj: 'BJJ Solo Drills 🥋', texas: 'Texas Method 🏋️' };
    toast((names[S.program] || S.program) + ' active');
  });

  /* bar weight */
  document.getElementById('barWt').onchange = e => {
    s.barWeight = +e.target.value || (s.units === 'lb' ? 45 : 20); save(); rebuild();
  };

  /* plate chips */
  document.getElementById('plateChips').querySelectorAll('.plate-chip').forEach(chip => {
    chip.onclick = () => {
      const p = +chip.dataset.plate;
      const idx = s.plates.indexOf(p);
      if (idx >= 0) s.plates.splice(idx, 1); else s.plates.push(p);
      s.plates.sort((a, b) => b - a);
      chip.classList.toggle('on');
      save(); rebuild();
    };
  });

  /* units — reset bar & plates to defaults for new unit system */
  view.querySelectorAll('#segUnits button').forEach(b => b.onclick = () => {
    const prev = s.units;
    s.units = b.dataset.u;
    if (prev !== s.units) {
      s.barWeight = s.units === 'lb' ? 45 : 20;
      s.plates    = s.units === 'lb' ? [...STD_PLATES_LB] : [...STD_PLATES_KG];
    }
    save(); render();
  });

  view.querySelectorAll('#segSex button').forEach(b => b.onclick = () => { s.sex = b.dataset.x; save(); render(); });

  /* rest timer */
  view.querySelectorAll('#segRest button').forEach(b => b.onclick = () => {
    s.restSec = +b.dataset.rest; save(); render();
  });
  document.getElementById('restCustom').onchange = e => {
    s.restSec = Math.max(5, Math.min(900, +e.target.value || 120)); save(); render();
  };
  document.getElementById('restStepInp').onchange = e => {
    s.restStep = Math.max(1, Math.min(120, +e.target.value || 15)); save();
  };
  view.querySelectorAll('#segVoice button').forEach(b => b.onclick = () => {
    s.voice = b.dataset.voice === 'on'; save();
    view.querySelectorAll('#segVoice button').forEach(x => x.classList.toggle('on', (x.dataset.voice === 'on') === s.voice));
    if (s.voice) say('Voice coaching on');
  });

  /* page zoom / text size */
  const setZoom = d => {
    let z = Math.round((loadZoom() + d) * 100) / 100;
    z = Math.max(0.9, Math.min(2.0, z));
    localStorage.setItem('tm_zoom', z);
    applyZoom(z);
    const v = document.getElementById('zoomVal'); if (v) v.textContent = Math.round(z * 100) + '%';
  };
  const zMinus = document.getElementById('zoomMinus'), zPlus = document.getElementById('zoomPlus');
  if (zMinus) zMinus.onclick = () => setZoom(-0.08);
  if (zPlus)  zPlus.onclick  = () => setZoom(0.08);

  /* cloud sync (Google sign-in) */
  renderCloudAuth();
  if (cloudUser) cloudStatus('Synced ✓ as ' + (cloudUser.email || 'you'));
  else if (loadCloud().enabled && !fbAuth) cloudInit();   // resume listener if needed
  view.querySelectorAll('#segMode button').forEach(b => b.onclick = () => { s.mode = b.dataset.m; save(); render(); });

  document.getElementById('bw').onchange  = e => { s.bodyweight = +e.target.value || 0; save(); };
  document.getElementById('ohp').onchange = e => { s.ohpDecrement = Math.min(.99, Math.max(.9, (+e.target.value || 95) / 100)); save(); };

  view.querySelectorAll('[data-lift]').forEach(inp => inp.onchange = () => {
    s.lifts[inp.dataset.lift][inp.dataset.f] = +inp.value || 0; save(); rebuild();
  });
  view.querySelectorAll('[data-inc]').forEach(inp => inp.onchange = () => { s.increment[inp.dataset.inc] = +inp.value || 1; save(); rebuild(); });
  view.querySelectorAll('[data-step]').forEach(inp => inp.onchange = () => { s.incPerSession[inp.dataset.step] = +inp.value || 1; save(); rebuild(); });

  /* tap-twice confirm (#4 — no confirm() dialog) */
  document.getElementById('resetCursor').onclick = function () {
    if (!confirmState.reset) {
      confirmState.reset = true;
      this.textContent = '↺ Tap again to confirm reset';
      this.classList.add('danger');
      const btn = this;
      setTimeout(() => {
        confirmState.reset = false;
        if (document.getElementById('resetCursor')) {
          btn.textContent = '↺ Jump to Week 1, Monday';
          btn.classList.remove('danger');
        }
      }, 3000);
    } else {
      confirmState.reset = false;
      S.cursor = { week: 0, day: 0 }; save(); toast('Back to Week 1 🔁'); render();
    }
  };

  document.getElementById('wipe').onclick = function () {
    if (!confirmState.wipe) {
      confirmState.wipe = true;
      this.textContent = '🗑 Tap again to erase everything';
      const btn = this;
      setTimeout(() => {
        confirmState.wipe = false;
        if (document.getElementById('wipe')) btn.textContent = 'Erase all logged data';
      }, 3000);
    } else {
      confirmState.wipe = false;
      S.logs = {}; S.bodyLog = []; S.cursor = { week: 0, day: 0 }; save(); rebuild(); toast('All logs cleared 🗑'); render();
    }
  };

  /* ---- Export backup (all profiles) ---- */
  document.getElementById('exportBtn').onclick = () => {
    save(); // flush the active profile's in-memory state to storage first
    const profiles = loadProfiles() || { active: 'default', list: [{ id: 'default', name: 'Me' }] };
    const states = {};
    profiles.list.forEach(p => {
      const raw = localStorage.getItem('tm_state_' + p.id);
      if (raw) { try { states[p.id] = JSON.parse(raw); } catch { /* skip */ } }
    });
    const bundle = { type: 'tm_full_backup', version: 1, exportedAt: new Date().toISOString(), profiles, states };
    const data = JSON.stringify(bundle, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.href = url; a.download = `tx-method-backup-${date}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast(`Backup saved — ${profiles.list.length} profile${profiles.list.length === 1 ? '' : 's'} ⬇`);
  };

  /* ---- Import backup (full bundle OR legacy single-profile) ---- */
  document.getElementById('importBtn').onclick = () => {
    document.getElementById('importFile').click();
  };
  document.getElementById('importFile').onchange = function () {
    const file = this.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && parsed.type === 'tm_full_backup' && parsed.profiles && parsed.states) {
          /* full device restore — replaces all profiles */
          saveProfiles(parsed.profiles);
          Object.entries(parsed.states).forEach(([id, st]) => {
            localStorage.setItem('tm_state_' + id, JSON.stringify(st));
          });
          S = loadState(); rebuild(); updateProfileBtn(); render();
          toast(`Restored ${parsed.profiles.list.length} profile${parsed.profiles.list.length === 1 ? '' : 's'} ⬆`);
        } else if (parsed && parsed.settings) {
          /* legacy single-profile backup — merge into the active profile */
          Object.assign(S, parsed);
          save(); rebuild(); updateProfileBtn(); render();
          toast('Backup restored ⬆');
        } else {
          throw new Error('Invalid backup file');
        }
      } catch(err) {
        toast('Import failed — invalid file');
      }
    };
    reader.readAsText(file);
    this.value = ''; // reset so same file can be re-imported
  };

  /* ---- Factory reset ---- */
  document.getElementById('factoryReset').onclick = function () {
    if (!confirmState.factory) {
      confirmState.factory = true;
      this.textContent = '⚠ Tap again — this cannot be undone';
      const btn = this;
      setTimeout(() => {
        confirmState.factory = false;
        if (document.getElementById('factoryReset')) btn.textContent = '⚠ Factory reset — erase everything';
      }, 3000);
    } else {
      confirmState.factory = false;
      // Wipe active profile's data AND the profile registry — full factory reset
      localStorage.removeItem(activeStateKey());
      localStorage.removeItem('tm_profiles');
      toast('App reset — reloading…');
      setTimeout(() => location.reload(), 1000);
    }
  };
}

/* =====================================================================
   REST TIMER
   ===================================================================== */
let restInt = null, restLeft = 0, restTotal = 0;
const restEl   = document.getElementById('restTimer');
const restDisp = document.getElementById('restDisplay');
const restFill = document.getElementById('restFill');
const fmtClock = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

function restDefault() { return (S.settings && S.settings.restSec) || 120; }
function restStep()    { return (S.settings && S.settings.restStep) || 15; }

function startRest(sec) {
  if (sec == null) sec = restDefault();
  restLeft = sec; restTotal = sec;
  ensureAudio(); // unlock sound on this tap so the end-ding can play (mobile)
  // reflect the configured adjust step on the +/- buttons
  const step = restStep();
  const pm = document.getElementById('restMinus'), pp = document.getElementById('restPlus');
  if (pm) pm.textContent = '−' + step;
  if (pp) pp.textContent = '+' + step;
  restEl.classList.remove('hidden','warn');
  restDisp.textContent = fmtClock(restLeft);
  restFill.style.transition = 'none';
  restFill.style.width = '100%';
  clearInterval(restInt);
  // let the 100% paint before starting drain animation
  requestAnimationFrame(() => requestAnimationFrame(() => {
    restFill.style.transition = `width ${restTotal}s linear`;
    restFill.style.width = '0%';
  }));
  restInt = setInterval(() => {
    restLeft--;
    restDisp.textContent = fmtClock(Math.max(0, restLeft));
    if (restLeft <= 10) restEl.classList.add('warn');
    if (restLeft <= 0)  { clearInterval(restInt); ding(); buzz(); say("Time's up"); setTimeout(() => restEl.classList.add('hidden'), 1800); }
  }, 1000);
}
function buzz() { if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]); }

/* loud end-of-rest ding via Web Audio (no sound file needed) */
let audioCtx = null;
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* audio not available */ }
}
function ding() {
  ensureAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  // bright, attention-grabbing triple beep
  const notes = [988, 1319, 988, 1319];   // B5 / E6 alternating
  notes.forEach((f, i) => {
    const t   = now + i * 0.20;
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type = 'square';                    // loud/cutting
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.01);   // loud attack
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.20);
  });
}
/* spoken voice cues (Web Speech) — gated by the Voice setting */
function say(text) {
  try {
    if (!S.settings.voice) return;
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1; u.volume = 1;
    speechSynthesis.speak(u);
  } catch { /* unsupported */ }
}

/* short soft beep used for the get-ready count-in and final seconds */
function tick(freq) {
  ensureAudio();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = freq || 880;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.13);
}

/* guided hold: 3-2-1 get ready → count down `seconds` → ding → onDone */
let guidedInt = null;
function stopGuided() { clearInterval(guidedInt); guidedInt = null; }
function startGuidedHold(seconds, label, onDone) {
  ensureAudio();
  clearInterval(restInt); stopGuided();
  const labelEl = document.getElementById('restLabel');
  restEl.classList.remove('hidden', 'warn');
  let ready = 5;
  if (labelEl) labelEl.textContent = 'GET READY';
  restDisp.textContent = ready;
  restFill.style.transition = 'none'; restFill.style.width = '100%';
  tick(660);
  guidedInt = setInterval(() => {
    ready--;
    if (ready > 0) { restDisp.textContent = ready; tick(660); }
    else { stopGuided(); beginHold(); }
  }, 1000);

  function beginHold() {
    if (labelEl) labelEl.textContent = label || 'HOLD';
    let left = seconds, total = seconds;
    restDisp.textContent = fmtClock(left);
    restFill.style.transition = 'none'; restFill.style.width = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      restFill.style.transition = `width ${total}s linear`;
      restFill.style.width = '0%';
    }));
    tick(990);  // go!
    guidedInt = setInterval(() => {
      left--;
      restDisp.textContent = fmtClock(Math.max(0, left));
      if (left <= 5) restEl.classList.add('warn');
      if (left <= 3 && left > 0) tick(880);
      if (left <= 0) {
        stopGuided(); ding(); buzz();
        if (typeof onDone === 'function') onDone();
        setTimeout(() => { restEl.classList.add('hidden'); const l = document.getElementById('restLabel'); if (l) l.textContent = 'REST'; }, 1800);
      }
    }, 1000);
  }
}
function syncFill() {
  const pct = restTotal > 0 ? (restLeft / restTotal) * 100 : 0;
  restFill.style.transition = 'none';
  restFill.style.width = pct + '%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    restFill.style.transition = `width ${restLeft}s linear`;
    restFill.style.width = '0%';
  }));
}
document.getElementById('restPlus').onclick  = () => { restLeft += restStep(); restTotal = Math.max(restTotal, restLeft); restDisp.textContent = fmtClock(restLeft); syncFill(); };
document.getElementById('restMinus').onclick = () => { restLeft = Math.max(0,restLeft-restStep()); restDisp.textContent = fmtClock(restLeft); syncFill(); };
function dismissTimer() { clearInterval(restInt); stopGuided(); restEl.classList.add('hidden'); const l = document.getElementById('restLabel'); if (l) l.textContent = 'REST'; }
document.getElementById('restStop').onclick  = dismissTimer;
/* tap the dimmed backdrop (outside the card) to dismiss */
restEl.onclick = e => { if (e.target === restEl) dismissTimer(); };

/* =====================================================================
   HELPERS
   ===================================================================== */
function unit() { return S.settings.units; }
function fmt(n) { return Number.isInteger(n) ? n : (Math.round(n * 1000) / 1000); }

let toastT = null;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t);
    Object.assign(t.style, { position:'fixed', bottom:'92px', left:'50%', transform:'translateX(-50%)',
      background:'#202020', color:'#ffffff', padding:'12px 18px', borderRadius:'12px', zIndex:60,
      border:'1px solid rgba(255,77,0,.25)', fontWeight:'700', boxShadow:'0 10px 30px rgba(0,0,0,.6)', transition:'opacity .3s' });
  }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = '0', 1600);
}

document.querySelectorAll('.tab').forEach(t => t.onclick = () => { TAB = t.dataset.tab; window.scrollTo(0,0); render(); });
document.getElementById('rfresh').onclick = () => { TAB = 'today'; render(); toast('Today'); };

/* ---- Profile switcher sheet ---- */
function openProfileSheet() {
  let sheet = document.getElementById('profileSheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'profileSheet';
    sheet.className = 'profile-sheet';
    document.body.appendChild(sheet);
    // close on backdrop tap
    sheet.addEventListener('click', e => { if (e.target === sheet) closeProfileSheet(); });
  }
  const p    = loadProfiles();
  const rows = p.list.map(prof => `
    <div class="prof-row ${prof.id === p.active ? 'active' : ''}" data-id="${prof.id}">
      <div class="prof-avatar">${initials(prof.name)}</div>
      <div class="prof-info">
        <div class="prof-name">${prof.name}</div>
        <button class="prof-rename-btn" data-rid="${prof.id}" data-rname="${prof.name}">rename</button>
      </div>
      ${p.list.length > 1 && prof.id !== p.active
        ? `<button class="prof-del" data-del="${prof.id}">✕</button>` : ''}
      ${prof.id === p.active ? '<span class="prof-check">✓</span>' : ''}
    </div>`).join('');

  sheet.innerHTML = `
    <div class="profile-panel">
      <div class="profile-panel-head">
        <span style="font-weight:800;font-size:18px">Profiles</span>
        <button class="prof-close" onclick="closeProfileSheet()">✕</button>
      </div>
      ${rows}
      <div class="prof-add-row">
        <input id="newProfName" class="prof-input" placeholder="New profile name…" maxlength="20">
        <button class="btn primary btn-sm" id="addProfBtn">Add</button>
      </div>
    </div>`;

  sheet.classList.add('open');

  sheet.querySelectorAll('.prof-row').forEach(row => {
    row.onclick = e => {
      if (e.target.closest('.prof-del')) return;
      switchProfile(row.dataset.id);
      closeProfileSheet();
      if (TAB === 'setup') render();
    };
  });
  sheet.querySelectorAll('.prof-del').forEach(btn => {
    btn.onclick = e => { e.stopPropagation(); deleteProfile(btn.dataset.del); openProfileSheet(); };
  });
  sheet.querySelectorAll('.prof-rename-btn').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const nm = prompt('Rename profile:', btn.dataset.rname);
      if (nm && nm.trim()) { renameProfile(btn.dataset.rid, nm.trim()); openProfileSheet(); }
    };
  });
  document.getElementById('addProfBtn').onclick = () => {
    const nm = document.getElementById('newProfName').value.trim();
    if (!nm) return;
    createProfile(nm);
    closeProfileSheet();
    if (TAB === 'setup') render();
  };
  document.getElementById('newProfName').onkeydown = e => {
    if (e.key === 'Enter') document.getElementById('addProfBtn').click();
  };
}

function closeProfileSheet() {
  const sheet = document.getElementById('profileSheet');
  if (sheet) sheet.classList.remove('open');
}

document.getElementById('profileBtn').onclick = openProfileSheet;
updateProfileBtn();

/* =====================================================================
   CLOUD SYNC  (Firebase Firestore — cross-device, all profiles)
   ===================================================================== */
/* Built-in Firebase project config (tx-method) so users don't have to
   paste it — they only choose a private sync code. The web apiKey is
   public by design; data is protected by Firestore rules + the secret
   sync code used as the document id. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBZfOyX_vgMi56WZtOG4stYO1FzBXJbOfQ",
  authDomain: "tx-method.firebaseapp.com",
  projectId: "tx-method",
  storageBucket: "tx-method.firebasestorage.app",
  messagingSenderId: "1065291574937",
  appId: "1:1065291574937:web:ab70fe4d16a8a57a91d208"
};

const CLOUD_KEY = 'tm_cloud';
function loadCloud() { try { return JSON.parse(localStorage.getItem(CLOUD_KEY)) || {}; } catch { return {}; } }
function saveCloud(c) { localStorage.setItem(CLOUD_KEY, JSON.stringify(c)); }

/* bundle = every profile + its state (same shape as the export file) */
function buildBundle() {
  const profiles = loadProfiles() || { active: 'default', list: [{ id: 'default', name: 'Me' }] };
  const states = {};
  profiles.list.forEach(p => {
    const raw = localStorage.getItem('tm_state_' + p.id);
    if (raw) { try { states[p.id] = JSON.parse(raw); } catch { /* skip */ } }
  });
  return { type: 'tm_full_backup', version: 1, profiles, states };
}
function applyBundle(bundle) {
  if (!bundle || !bundle.profiles || !bundle.states) return false;
  saveProfiles(bundle.profiles);
  Object.entries(bundle.states).forEach(([id, st]) => localStorage.setItem('tm_state_' + id, JSON.stringify(st)));
  S = loadState(); rebuild(); updateProfileBtn(); render();
  return true;
}

let fb = null;                 // { ref, setDoc, unsub }
let cloudSDK = null;           // loaded firebase modules
let fbApp = null, fbAuth = null, fbDb = null;
let cloudUser = null;
let cloudWriterId = 'w' + Math.random().toString(36).slice(2);
let cloudApplying = false, cloudPushT = null, cloudLastApplied = 0;

function cloudStatus(msg) {
  const el = document.getElementById('cloudStatus');
  if (el) el.textContent = msg;
}

/* renders the Sign-in / Signed-in UI inside #cloudAuth (Setup tab) */
function renderCloudAuth() {
  const el = document.getElementById('cloudAuth');
  if (!el) return;
  if (cloudUser) {
    el.innerHTML = `<div class="field"><label>Signed in as</label>
      <div style="font-weight:800;font-size:17px;word-break:break-all">${cloudUser.email || cloudUser.displayName || 'You'}</div></div>
      <button class="btn secondary" id="cloudSignOut">Sign out</button>`;
    const b = document.getElementById('cloudSignOut'); if (b) b.onclick = cloudSignOut;
  } else {
    el.innerHTML = `<button class="btn primary" id="cloudSignIn">🔓 Sign in with Google</button>`;
    const b = document.getElementById('cloudSignIn'); if (b) b.onclick = cloudSignIn;
  }
}

async function cloudLoadSDK() {
  if (cloudSDK) return cloudSDK;
  const [appMod, fsMod, authMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
  ]);
  cloudSDK = { appMod, fsMod, authMod };
  return cloudSDK;
}

/* load the SDK and start listening for auth state (resumes prior sign-in) */
async function cloudInit() {
  try {
    const { appMod, fsMod, authMod } = await cloudLoadSDK();
    if (!fbApp) fbApp = appMod.initializeApp(FIREBASE_CONFIG);
    fbAuth = authMod.getAuth(fbApp);
    fbDb   = fsMod.getFirestore(fbApp);
    authMod.onAuthStateChanged(fbAuth, user => {
      cloudUser = user || null;
      if (user) { const c = loadCloud(); c.enabled = true; saveCloud(c); cloudStartSync(user); }
      else { cloudStopSync(); }
      renderCloudAuth();
    });
    return true;
  } catch (err) {
    cloudStatus('Error loading sync: ' + (err && err.message ? err.message : err));
    return false;
  }
}

async function cloudSignIn() {
  cloudStatus('Opening Google sign-in…');
  const c = loadCloud(); c.enabled = true; saveCloud(c);   // so a redirect-return resumes
  if (!fbAuth) { const ok = await cloudInit(); if (!ok) return; }
  try {
    const { authMod } = await cloudLoadSDK();
    await authMod.signInWithPopup(fbAuth, new authMod.GoogleAuthProvider());
    // onAuthStateChanged takes over
  } catch (err) {
    const code = (err && (err.code || err.message)) || String(err);
    if (String(code).includes('popup')) {            // popup blocked → redirect flow
      try {
        const { authMod } = await cloudLoadSDK();
        await authMod.signInWithRedirect(fbAuth, new authMod.GoogleAuthProvider());
        return;
      } catch (e2) { cloudStatus('Sign-in failed: ' + (e2.code || e2.message || e2)); return; }
    }
    cloudStatus('Sign-in failed: ' + code);
  }
}

async function cloudSignOut() {
  const c = loadCloud(); c.enabled = false; saveCloud(c);
  cloudStopSync();
  try {
    if (fbAuth) { const { authMod } = await cloudLoadSDK(); await authMod.signOut(fbAuth); }
  } catch { /* ignore */ }
  cloudUser = null; cloudStatus('Signed out'); renderCloudAuth();
}

/* sync this account's data with users/{uid} */
async function cloudStartSync(user) {
  try {
    const { fsMod } = await cloudLoadSDK();
    if (fb && fb.unsub) { try { fb.unsub(); } catch {} }
    const ref = fsMod.doc(fbDb, 'users', user.uid);
    fb = { ref, setDoc: fsMod.setDoc, unsub: null };
    const who = user.email || user.displayName || 'you';
    cloudStatus('Syncing as ' + who + '…');
    const snap = await fsMod.getDoc(ref);
    if (snap.exists() && snap.data() && snap.data().bundle) {
      cloudApplying = true; applyBundle(snap.data().bundle); cloudApplying = false;
      cloudLastApplied = snap.data().updatedAt || Date.now();
      cloudStatus('Synced ✓ as ' + who);
    } else {
      await cloudPush(true);
      cloudStatus('Synced ✓ as ' + who + ' — uploaded your data');
    }
    fb.unsub = fsMod.onSnapshot(ref, s => {
      if (!s.exists()) return;
      const d = s.data(); if (!d || !d.bundle) return;
      if (d.writerId === cloudWriterId) return;
      if ((d.updatedAt || 0) <= cloudLastApplied) return;
      cloudApplying = true; applyBundle(d.bundle); cloudApplying = false;
      cloudLastApplied = d.updatedAt || Date.now();
      toast('Synced from another device ⬇');
    });
  } catch (err) {
    cloudStatus('Sync error: ' + (err && err.message ? err.message : err));
  }
}

function cloudStopSync() { if (fb && fb.unsub) { try { fb.unsub(); } catch {} } fb = null; }

async function cloudPush(immediate) {
  if (!fb || cloudApplying) return;
  clearTimeout(cloudPushT);
  const doit = async () => {
    if (!fb) return;
    try {
      const updatedAt = Date.now();
      await fb.setDoc(fb.ref, { updatedAt, writerId: cloudWriterId, bundle: buildBundle() });
      cloudLastApplied = updatedAt;
      cloudStatus('Synced ✓ ' + new Date(updatedAt).toLocaleTimeString());
    } catch (err) {
      cloudStatus('Push error: ' + (err && err.message ? err.message : err));
    }
  };
  immediate ? doit() : (cloudPushT = setTimeout(doit, 1500));
}

/* called from save() — debounced upload of local changes */
function cloudOnLocalChange() { if (fb && !cloudApplying) cloudPush(false); }

/* =====================================================================
   PAGE ZOOM  (persisted text-size control)
   ===================================================================== */
function loadZoom() {
  const z = parseFloat(localStorage.getItem('tm_zoom'));
  return (z && z >= 0.8 && z <= 2.2) ? z : 1.28;
}
function applyZoom(z) { document.documentElement.style.setProperty('--content-zoom', z); }
applyZoom(loadZoom());

/* =====================================================================
   WAKE LOCK  (keep the screen awake while working out)
   ===================================================================== */
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* unsupported / denied */ }
}
function releaseWakeLock() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch {} }
function updateWakeLock() { if (TAB === 'today') requestWakeLock(); else releaseWakeLock(); }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && TAB === 'today') requestWakeLock();
});

/* =====================================================================
   CONFETTI  (celebration burst — no library)
   ===================================================================== */
function confetti() {
  const cv = document.createElement('canvas');
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: 200 });
  document.body.appendChild(cv);
  const dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const colors = ['#aaff00', '#ffffff', '#77cc00', '#ffd400', '#ff5e5e'];
  const N = 140, parts = [];
  for (let i = 0; i < N; i++) parts.push({
    x: W / 2 + (Math.random() - .5) * 80, y: H / 3 + (Math.random() - .5) * 40,
    vx: (Math.random() - .5) * 14, vy: Math.random() * -15 - 4,
    s: 5 + Math.random() * 6, c: colors[i % colors.length],
    rot: Math.random() * 6.28, vr: (Math.random() - .5) * .4
  });
  let t = 0;
  (function frame() {
    t++; ctx.clearRect(0, 0, W, H);
    parts.forEach(p => {
      p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
    });
    if (t < 130) requestAnimationFrame(frame); else cv.remove();
  })();
}

/* =====================================================================
   ACHIEVEMENTS + PERSONAL RECORDS
   ===================================================================== */
const ACHIEVEMENTS = [
  { id: 'first',      emoji: '🎉', name: 'First Workout',        test: s => s.workouts >= 1 },
  { id: 'w5',         emoji: '💪', name: '5 Workouts',           test: s => s.workouts >= 5 },
  { id: 'w10',        emoji: '🔥', name: '10 Workouts',          test: s => s.workouts >= 10 },
  { id: 'w25',        emoji: '🏆', name: '25 Workouts',          test: s => s.workouts >= 25 },
  { id: 'w50',        emoji: '👑', name: '50 Workouts',          test: s => s.workouts >= 50 },
  { id: 'streak3',    emoji: '⚡', name: '3-Day Prep Streak',    test: s => s.streak >= 3 },
  { id: 'streak7',    emoji: '🌟', name: '7-Day Prep Streak',    test: s => s.streak >= 7 },
  { id: 'prep_half',  emoji: '🗓️', name: 'Prep Halfway',         test: s => s.prepDays >= 13 },
  { id: 'prep_done',  emoji: '🎖️', name: '30-Day Prep Complete', test: s => s.prepDays >= 26 },
  { id: 'pr',         emoji: '📈', name: 'New Personal Record',  test: s => s.prCount >= 1 }
];

/* actual completed workouts = distinct training days logged on the calendar */
function workoutCount() {
  return (S.history || []).length;
}
function achievementStats() {
  const st = prepStreaks();
  return {
    workouts: workoutCount(),
    prepDays: prepDaysComplete(),
    streak:   st.best,            // best streak (monotonic) drives streak badges
    prCount:  Object.keys(S.prs || {}).length
  };
}
/* recompute the full earned set from current data (self-corrects stale badges) */
function syncAchievements() {
  const stats = achievementStats();
  const earned = ACHIEVEMENTS.filter(a => a.test(stats)).map(a => a.id);
  const changed = earned.length !== S.achievements.length || earned.some(id => !S.achievements.includes(id));
  S.achievements = earned;
  if (changed) save();
}
function checkAchievements() {
  const stats = achievementStats();
  const unlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!S.achievements.includes(a.id) && a.test(stats)) {
      S.achievements.push(a.id); unlocked.push(a);
    }
  });
  if (unlocked.length) {
    save();
    let i = 0;
    const showNext = () => {
      if (i >= unlocked.length) return;
      const a = unlocked[i++];
      toast(`${a.emoji} Achievement: ${a.name}`);
      setTimeout(showNext, 1800);
    };
    setTimeout(showNext, 1600); // after the main "workout logged" toast
  }
  return unlocked;
}

/* check the day's intensity lifts for new estimated-1RM personal records */
function checkPRs(week, log) {
  const msgs = [];
  if (!week || !week.days) return msgs;
  const lifts = week.days[S.cursor.day] || [];
  lifts.forEach(lf => {
    if (!lf.logReps) return;
    const reps = (log.reps && log.reps[lf.key] != null) ? log.reps[lf.key] : lf.targetReps;
    if (!reps || reps < 1) return;
    const e1rm = oneRM(lf.work, reps);
    const prev = S.prs[lf.key];
    if (!prev || e1rm > prev.e1rm + 0.01) {
      S.prs[lf.key] = { weight: lf.work, reps, e1rm, date: Date.now() };
      msgs.push(`📈 New ${lf.name} PR: ${fmt(lf.work)} ${unit()} × ${reps}`);
    }
  });
  return msgs;
}

/* central celebration after finishing a workout */
function celebrateWorkout(prMsgs) {
  logTrainingDay();
  confetti(); buzz();
  const pr = prMsgs && prMsgs.length;
  toast(pr ? prMsgs[0] : 'Workout logged 💪');
  if (pr && prMsgs.length > 1) setTimeout(() => toast(prMsgs[1]), 1800);
  checkAchievements({ prHit: !!pr });
}

/* =====================================================================
   TRAINING CALENDAR + SHAREABLE CARD
   ===================================================================== */
function todayStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function logTrainingDay() {
  const t = todayStr();
  if (!S.history) S.history = [];
  if (!S.history.includes(t)) { S.history.push(t); save(); }
}
let calView = null;
/* re-render when the calendar month arrows are tapped */
function wireCalendar() {
  view.querySelectorAll('[data-cal]').forEach(btn => btn.onclick = () => {
    const now = new Date();
    if (!calView) calView = { y: now.getFullYear(), m: now.getMonth() };
    calView.m += (+btn.dataset.cal);
    if (calView.m < 0) { calView.m = 11; calView.y--; }
    if (calView.m > 11) { calView.m = 0; calView.y++; }
    render();
  });
  view.querySelectorAll('[data-cal-day]').forEach(c => c.onclick = () => {
    const k = c.dataset.calDay;
    if (!S.history) S.history = [];
    const i = S.history.indexOf(k);
    if (i >= 0) S.history.splice(i, 1); else S.history.push(k);
    save(); render();
  });
}
/* one-time: seed the calendar with the current streak so prior days show */
function backfillHistory() {
  if (S.historyBackfilled) return;
  S.historyBackfilled = true;
  if (!S.history) S.history = [];
  let streak = 0;
  try { streak = prepStreaks().current; } catch {}
  if (!streak && (S.sessions || 0) > 0) streak = 1;
  const today = new Date();
  for (let i = 0; i < streak; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const k = todayStr(d);
    if (!S.history.includes(k)) S.history.push(k);
  }
  save();
}
function calendarHTML() {
  const set = new Set(S.history || []);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (!calView) calView = { y: now.getFullYear(), m: now.getMonth() };
  const { y, m } = calView;
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const monthName = first.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<div class="mcal-dow">${x}</div>`).join('');
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="mcal-cell empty"></div>';
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const on = set.has(key);
    const cellDate = new Date(y, m, d);
    const future = cellDate > now;
    const isToday = (y === now.getFullYear() && m === now.getMonth() && d === now.getDate());
    cells += `<div class="mcal-cell ${on ? 'on' : ''} ${isToday ? 'today' : ''} ${future ? 'future' : ''}"${future ? '' : ` data-cal-day="${key}"`}>${d}</div>`;
  }
  const n = (S.history || []).length;
  const note = n ? `${n} training day${n === 1 ? '' : 's'} logged · tap a day to add/remove`
                 : 'Tap a day to log a workout · green = trained';
  return `<h2 class="section">Training calendar</h2><div class="card">
    <div class="mcal-head"><button class="mcal-nav" data-cal="-1">‹</button>
      <div class="mcal-title">${monthName}</div>
      <button class="mcal-nav" data-cal="1">›</button></div>
    <div class="mcal-grid">${dow}${cells}</div>
    <div class="tiny muted center" style="margin-top:10px">${note}</div></div>`;
}

async function shareCard() {
  const W = 1080, H = 1080, c = document.createElement('canvas');
  c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#aaff00'; x.fillRect(0, 0, W, 14);
  const cx = W / 2;
  x.textAlign = 'center';
  x.fillStyle = '#aaff00'; x.font = '700 40px -apple-system,Segoe UI,Roboto,sans-serif';
  x.fillText('TX METHOD TRAINER', cx, 120);
  x.fillStyle = '#ffffff'; x.font = '900 96px -apple-system,Segoe UI,Roboto,sans-serif';
  x.fillText(activeProfile().name || 'Me', cx, 240);
  x.fillStyle = '#999999'; x.font = '600 44px -apple-system,Segoe UI,Roboto,sans-serif';

  let big = [], line = '';
  if (isDayProgram()) {
    x.fillText(pLabel(), cx, 310);
    let reps = 0; for (let nn = 1; nn <= ptotal(); nn++) { if (!prepDayDone(nn)) continue; pdata()[nn-1].exercises.forEach(e => { if (!e.sets) reps += e.reps; }); }
    big = [[prepDaysComplete() + '/' + (pWorkDays()), 'WORKOUTS'], [prepStreaks().current, 'DAY STREAK'], [reps, 'REPS']];
    line = (S.history || []).length + ' total training days';
  } else {
    x.fillText('Texas Method', cx, 310);
    const best = Object.entries(S.prs || {}).sort((a, b) => b[1].e1rm - a[1].e1rm)[0];
    big = [[workoutCount(), 'WORKOUTS'], [S.achievements.length, 'BADGES'], [(S.history || []).length, 'DAYS']];
    line = best ? `Top PR — ${(LIFT_META[best[0]] || {}).name}: ${fmt(best[1].weight)} ${unit()} × ${best[1].reps}` : 'Get after it 💪';
  }
  const tileW = 300, gap = 30, startX = cx - (tileW * 1.5 + gap);
  big.forEach((t, i) => {
    const bx = startX + i * (tileW + gap);
    x.fillStyle = '#1a1a1a'; roundRect(x, bx, 420, tileW, 240, 24); x.fill();
    x.fillStyle = '#aaff00'; x.font = '900 92px -apple-system,Segoe UI,Roboto,sans-serif';
    x.fillText(String(t[0]), bx + tileW / 2, 540);
    x.fillStyle = '#bcbcbc'; x.font = '700 30px -apple-system,Segoe UI,Roboto,sans-serif';
    x.fillText(t[1], bx + tileW / 2, 600);
  });
  x.fillStyle = '#ffffff'; x.font = '700 46px -apple-system,Segoe UI,Roboto,sans-serif';
  wrapText(x, line, cx, 760, W - 140, 56);
  x.fillStyle = '#555555'; x.font = '500 34px -apple-system,Segoe UI,Roboto,sans-serif';
  x.fillText(new Date().toLocaleDateString(), cx, 1000);

  c.toBlob(async blob => {
    const file = new File([blob], 'tx-progress.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My TX Method progress' });
        return;
      }
    } catch { /* fall through to download */ }
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'tx-progress.png'; a.click(); URL.revokeObjectURL(url);
    toast('Progress image saved 📤');
  }, 'image/png');
}
function roundRect(x, px, py, w, h, r) {
  x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
}
function wrapText(x, text, cx, y, maxW, lh) {
  const words = String(text).split(' '); let line = '';
  const lines = [];
  words.forEach(w => { const test = line ? line + ' ' + w : w; if (x.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; });
  if (line) lines.push(line);
  lines.forEach((ln, i) => x.fillText(ln, cx, y + i * lh));
}

/* =====================================================================
   GUIDED FULL-SESSION  (walk through every set, hands-free)
   ===================================================================== */
let sess = null, sessInt = null;

/* flatten today's work into ordered steps */
function buildSteps() {
  const steps = [];
  if (isDayProgram()) {
    const d = pdata()[pstate().day - 1];
    if (!d || d.rest) return steps;
    prepDayItems(d).forEach(item => {
      if (item.type === 'reps') {
        steps.push({ name: item.ex.name, key: item.ex.key, label: 'Target', kind: 'reps', bw: true, reps: item.ex.reps, side: item.ex.side, scheme: item.ex.scheme, checkId: item.ex.key, store: 'prep' });
      } else {
        steps.push({ name: item.ex.name, key: item.ex.key, label: item.total > 1 ? `Set ${item.setIndex + 1} of ${item.total}` : 'Hold', kind: 'hold', seconds: item.ex.sec, side: item.ex.side, checkId: `${item.ex.key}_${item.setIndex}`, store: 'prep' });
      }
    });
  } else {
    const w = PROGRAM[S.cursor.week], lifts = w.days[S.cursor.day], b = bar(), plts = getPlates();
    lifts.forEach(lf => {
      if (lf.work === 0 && lf.type === 'acc') {
        lf.sets.forEach((st, i) => steps.push({ name: lf.name, key: lf.key, label: `Set ${i + 1} of ${lf.sets.length}`, kind: 'reps', bw: true, reps: lf.targetReps || 0, amrap: !lf.targetReps, checkId: `${lf.key}_w_${i}`, store: 'tex' }));
      } else {
        lf.warmups.forEach((wu, i) => steps.push({ name: lf.name, key: lf.key, label: 'Warm-up', kind: 'reps', weight: wu.weight, reps: wu.reps, math: plateMath(wu.weight, b, plts), checkId: `${lf.key}_wu_${i}`, store: 'tex' }));
        lf.sets.forEach((st, i) => steps.push({ name: lf.name, key: lf.key, label: `Set ${i + 1} of ${lf.sets.length}`, kind: 'reps', weight: st.weight, reps: st.reps, math: plateMath(st.weight, b, plts), checkId: `${lf.key}_w_${i}`, store: 'tex' }));
      }
    });
  }
  return steps;
}

function sessMarkDone(step) {
  if (step.store === 'prep') {
    const day = pstate().day;
    if (!pstate().log[day]) pstate().log[day] = { checks: {} };
    if (!pstate().log[day].checks) pstate().log[day].checks = {};
    pstate().log[day].checks[step.checkId] = true;
  } else {
    const lk = `${S.cursor.week}-${S.cursor.day}`;
    if (!S.logs[lk]) S.logs[lk] = { checks: {}, reps: {} };
    S.logs[lk].checks[step.checkId] = true;
  }
  save();
}

function startSession() {
  const steps = buildSteps();
  if (!steps.length) { toast('Nothing to do today 😴'); return; }
  ensureAudio();
  sess = { steps, i: 0, phase: 'ready' };
  renderSession();
}

function closeSession() {
  clearInterval(sessInt); sessInt = null; sess = null;
  const el = document.getElementById('sessionOverlay');
  if (el) el.classList.remove('open');
  render();
}

function setSessDisplay(label, time) {
  const l = document.getElementById('sessLabel'), t = document.getElementById('sessTime');
  if (l && label != null) l.textContent = label;
  if (t && time != null) t.textContent = time;
}

function renderSession() {
  let el = document.getElementById('sessionOverlay');
  if (!el) { el = document.createElement('div'); el.id = 'sessionOverlay'; el.className = 'sess-overlay'; document.body.appendChild(el); }
  const n = sess.steps.length, step = sess.steps[sess.i];
  const pct = Math.round((sess.i) / n * 100);
  let body = '';
  if (sess.phase === 'ready') {
    const sideTxt = step.side ? ' / side' : '';
    const target = step.kind === 'hold' ? `${step.seconds}s hold${sideTxt}`
      : step.scheme ? step.scheme
      : step.bw ? (step.amrap ? 'AMRAP' : `${step.reps} reps${sideTxt}`)
      : `${fmt(step.weight)} ${unit()} × ${step.reps}`;
    const sub = (step.weight != null && step.kind === 'reps')
      ? `<div class="sess-plates">${plateStripHTML(step.weight)}</div>` : '';
    const btn = step.kind === 'hold'
      ? `<button class="btn primary" id="sessAct">▶ Start hold · ${step.seconds}s</button>`
      : `<button class="btn primary" id="sessAct">✓ Done</button>`;
    body = `<div class="sess-ex">${step.name} ${formBtn(step.key)}</div>
      <div class="sess-label" id="sessLabel">${step.label}</div>
      <div class="sess-target">${target}</div>${sub}${btn}`;
    if (sess._spoke !== sess.i) { sess._spoke = sess.i; sayStep(step); }
  } else if (sess.phase === 'resting') {
    body = `<div class="sess-label" id="sessLabel">REST</div>
      <div class="sess-time" id="sessTime">${fmtClock(sess.timeLeft)}</div>
      <button class="btn primary" id="sessSkip">Skip rest ›</button>`;
  } else if (sess.phase === 'holding') {
    body = `<div class="sess-label" id="sessLabel">${sess.holdLabel}</div>
      <div class="sess-time" id="sessTime">${sess.disp}</div>`;
  }
  el.innerHTML = `<div class="sess-card">
    <div class="sess-top"><span class="sess-prog">Set ${Math.min(sess.i + 1, n)} of ${n}</span>
      <button class="sess-x" id="sessExit">✕</button></div>
    <div class="sess-track"><div class="sess-fill" style="width:${pct}%"></div></div>
    ${body}
    <div class="sess-navrow">${sess.i > 0 ? '<button class="sess-prev" id="sessPrev">‹ Prev</button>' : ''}</div>
  </div>`;
  el.classList.add('open');

  document.getElementById('sessExit').onclick = closeSession;
  const prev = document.getElementById('sessPrev');
  if (prev) prev.onclick = () => { clearInterval(sessInt); sess.i = Math.max(0, sess.i - 1); sess.phase = 'ready'; renderSession(); };
  const act = document.getElementById('sessAct');
  if (act) act.onclick = () => {
    const s = sess.steps[sess.i];
    if (s.kind === 'hold') startSessHold(s);
    else { sessMarkDone(s); afterStep(); }
  };
  const skip = document.getElementById('sessSkip');
  if (skip) skip.onclick = () => { clearInterval(sessInt); nextStep(); };
}

function afterStep() {
  if (sess.i >= sess.steps.length - 1) { finishSession(); return; }
  startSessRest();
}
function nextStep() {
  sess.i++;
  if (sess.i >= sess.steps.length) { finishSession(); return; }
  sess.phase = 'ready'; renderSession();
}

function startSessRest() {
  sess.phase = 'resting'; sess.timeLeft = restDefault();
  clearInterval(sessInt); renderSession(); say('Rest');
  sessInt = setInterval(() => {
    sess.timeLeft--;
    if (sess.timeLeft <= 0) { clearInterval(sessInt); ding(); buzz(); nextStep(); }
    else setSessDisplay(null, fmtClock(sess.timeLeft));
  }, 1000);
}

function startSessHold(step) {
  sess.phase = 'holding'; clearInterval(sessInt); ensureAudio();
  let ready = 5; sess.holdLabel = 'GET READY'; sess.disp = String(ready);
  renderSession(); tick(660); say('Get ready');
  sessInt = setInterval(() => {
    ready--;
    if (ready > 0) { sess.disp = String(ready); setSessDisplay('GET READY', sess.disp); tick(660); say(String(ready)); }
    else { clearInterval(sessInt); holdRun(); }
  }, 1000);
  function holdRun() {
    let left = step.seconds;
    sess.holdLabel = step.name.toUpperCase(); sess.disp = fmtClock(left);
    setSessDisplay(sess.holdLabel, sess.disp); tick(990); say('Go');
    sessInt = setInterval(() => {
      left--;
      sess.disp = fmtClock(Math.max(0, left)); setSessDisplay(null, sess.disp);
      if (left <= 3 && left > 0) tick(880);
      if (left <= 0) { clearInterval(sessInt); ding(); buzz(); say('Done'); sessMarkDone(step); afterStep(); }
    }, 1000);
  }
}

/* spoken announcement of the upcoming step */
function unitWord() { return unit() === 'lb' ? 'pounds' : 'kilos'; }
function sayStep(step) {
  const side = step.side ? ' each side' : '';
  if (step.kind === 'hold') { say(`${step.name}. Hold for ${step.seconds} seconds${side}.`); return; }
  if (step.bw) { say(`${step.name}. ${step.amrap ? 'As many as you can.' : step.reps + ' reps' + side + '.'}`); return; }
  say(`${step.name}. ${fmt(step.weight)} ${unitWord()}, ${step.reps} reps.`);
}

function finishSession() {
  clearInterval(sessInt); sessInt = null;
  const el = document.getElementById('sessionOverlay'); if (el) el.classList.remove('open');
  sess = null;
  say('Workout complete. Great work!');
  if (isDayProgram()) {
    const dayNum = pstate().day, d = pdata()[dayNum - 1];
    if (!d.rest) {
      if (!pstate().log[dayNum]) pstate().log[dayNum] = { checks: {} };
      pstate().log[dayNum].done = true; S.sessions = (S.sessions || 0) + 1;
    }
    save();
    if (dayNum >= ptotal()) { finishPrep(); return; }
    celebrateWorkout([]); movePrepCursor(1);
  } else {
    const w = PROGRAM[S.cursor.week], lk = `${S.cursor.week}-${S.cursor.day}`;
    const log = S.logs[lk] || (S.logs[lk] = { checks: {}, reps: {} });
    if (!log.reps) log.reps = {};
    w.days[S.cursor.day].forEach(lf => { if (lf.logReps && log.reps[lf.key] == null) log.reps[lf.key] = lf.targetReps; });
    const prMsgs = checkPRs(w, log);
    S.sessions = (S.sessions || 0) + 1;
    save(); rebuild();
    celebrateWorkout(prMsgs); moveCursor(1);
  }
}

/* init */
backfillHistory();
syncAchievements();
render();
/* auto-resume cloud sync if previously signed in */
if (loadCloud().enabled) { setTimeout(cloudInit, 0); }
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // Auto-reload when a new service worker activates (picks up new version immediately)
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'SW_UPDATED') location.reload();
  });
}
