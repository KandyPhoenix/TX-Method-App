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
    { key: 'pushups',   name: 'Push-ups',   icon: '💪', reps: pu },
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
  { key: 'pushups',   name: 'Push-ups',   icon: '💪' },
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
           program: 'prep30', prep: { day: 1, log: {} } };
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
  /* existing profiles default to Texas (don't disrupt anyone mid-cycle) */
  st.program = st.program || 'texas';
  st.prep    = st.prep    || { day: 1, log: {} };
  if (st.prep.day == null) st.prep.day = 1;
  if (!st.prep.log) st.prep.log = {};
  return st;
}
function save() { localStorage.setItem(activeStateKey(), JSON.stringify(S)); }

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
  const prep = S.program === 'prep30';
  if (TAB === 'today')   prep ? renderPrepToday()   : renderToday();
  if (TAB === 'program') prep ? renderPrepProgram() : renderProgram();
  if (TAB === 'stats')   renderStats();
  if (TAB === 'setup')   renderSetup();
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
        <div style="font-weight:800;font-size:17px;">${DAY_NAMES[day].split(' · ')[0]}</div>
        <div class="tiny muted">${DAY_NAMES[day].split(' · ')[1]} day</div>
      </div>
      <button class="btn small secondary" id="nextDay">Next ›</button>
    </div>`;

  for (const lf of w.days[day]) html += liftCard(lf, logKey, log);

  html += `<button class="btn primary" id="completeBtn">✓ Complete workout</button>
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
        <div class="lbl">💪 Set ${i + 1} of ${lf.sets.length}</div>
        <div class="wt">Bodyweight</div>
        <div class="reps">${rep}</div>
        <button class="check ${on}" data-check="${id}">✓</button></div>`;
    }
    return `<div class="card lift">
      <div class="lift-head"><div><div class="name">${lf.name}</div>
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
      <div class="wt">${fmt(wu.weight)} <small>${unit()}</small>
        <div class="plate-math">${math}</div></div>
      <div class="reps">${wu.sets > 1 ? wu.sets + '×' : ''}${wu.reps}</div>
      <button class="check ${on}" data-check="${id}">✓</button></div>`;
  });

  /* work set rows */
  let setRows = '';
  lf.sets.forEach((st, i) => {
    const id   = `${lf.key}_w_${i}`;
    const on   = log.checks && log.checks[id] ? 'on' : '';
    const math = plateMath(st.weight, b, plts);
    setRows += `<div class="set-row workset ${on ? 'done' : ''}">
      <div class="lbl">💪 Set ${i + 1} of ${lf.sets.length}</div>
      <div class="wt">${fmt(st.weight)} <small>${unit()}</small>
        <div class="plate-math">${math}</div></div>
      <div class="reps">${st.reps} reps</div>
      <button class="check ${on}" data-check="${id}">✓</button></div>`;
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
    <div class="lift-head"><div><div class="name">${lf.name}</div>
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
    save(); rebuild(); toast('Workout logged 💪'); moveCursor(1);
  };
  document.getElementById('timerBtn').onclick = () => startRest();
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
  const d = PREP30[dayNum - 1];
  if (!d || d.rest) return false;
  const log = S.prep.log[dayNum];
  if (log && log.done) return true;
  if (!log || !log.checks) return false;
  return prepCheckIds(d).every(id => log.checks[id]);
}
function prepDaysComplete() {
  let n = 0;
  for (let i = 1; i <= PREP_TOTAL; i++) if (!PREP30[i - 1].rest && prepDayDone(i)) n++;
  return n;
}

function renderPrepToday() {
  const dayNum = S.prep.day;
  const d = PREP30[dayNum - 1];
  titleEl.textContent = 'Today';
  subEl.textContent   = `30-Day Prep · Day ${dayNum} of ${PREP_TOTAL}`;

  let html = `<div class="screen">
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
      <button class="btn small secondary" id="prepPrev" ${dayNum <= 1 ? 'disabled' : ''}>‹ Prev</button>
      <div class="center">
        <div style="font-weight:800;font-size:17px;">Day ${dayNum}</div>
        <div class="tiny muted">${prepDaysComplete()} of ${PREP_TOTAL - 4} workouts done</div>
      </div>
      <button class="btn small secondary" id="prepNext" ${dayNum >= PREP_TOTAL ? 'disabled' : ''}>Next ›</button>
    </div>`;

  if (d.rest) {
    html += `<div class="card lift" style="text-align:center;padding:34px 16px;">
      <div style="font-size:40px;">😴</div>
      <div class="name" style="font-size:20px;margin-top:6px;">Rest Day</div>
      <div class="tiny muted" style="margin-top:6px;">Recover today — back at it tomorrow.</div>
    </div>
    <button class="btn primary" id="prepComplete">Next day ›</button>`;
  } else {
    const log = S.prep.log[dayNum] || { checks: {} };
    for (const ex of d.exercises) html += prepExerciseCard(ex, log);

    const last = dayNum >= PREP_TOTAL;
    html += `<button class="btn primary" id="prepComplete">${last ? '🎉 Finish prep → Start Texas Method' : '✓ Complete day'}</button>
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
        <div class="lbl">${ex.icon} Set ${i + 1} of ${ex.sets}</div>
        <div class="wt">${ex.sec}<small> sec</small></div>
        <div class="reps">hold</div>
        <button class="check ${on}" data-pcheck="${id}">✓</button></div>`;
    }
    return `<div class="card lift">
      <div class="lift-head"><div><div class="name">${ex.name}</div>
      <div class="scheme">${ex.sets}×${ex.sec} sec</div></div>
      <span class="badge vol">Hold</span></div>${rows}</div>`;
  }
  /* reps exercise — single set */
  const id = ex.key;
  const on = log.checks && log.checks[id] ? 'on' : '';
  rows = `<div class="set-row workset ${on ? 'done' : ''}">
    <div class="lbl">${ex.icon} Target</div>
    <div class="wt">${ex.reps}<small> reps</small></div>
    <div class="reps"></div>
    <button class="check ${on}" data-pcheck="${id}">✓</button></div>`;
  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${ex.name}</div>
    <div class="scheme">${ex.reps} reps</div></div>
    <span class="badge vol">Reps</span></div>${rows}</div>`;
}

function wirePrepToday() {
  const dayNum = S.prep.day;
  if (!S.prep.log[dayNum]) S.prep.log[dayNum] = { checks: {} };
  const log = S.prep.log[dayNum];
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

  const prev = document.getElementById('prepPrev');
  const next = document.getElementById('prepNext');
  if (prev) prev.onclick = () => movePrepCursor(-1);
  if (next) next.onclick = () => movePrepCursor(1);

  const timer = document.getElementById('prepTimer');
  if (timer) timer.onclick = () => startRest();

  document.getElementById('prepComplete').onclick = () => {
    const d = PREP30[dayNum - 1];
    if (!d.rest) log.done = true;
    save();
    if (dayNum >= PREP_TOTAL) { finishPrep(); return; }
    toast(d.rest ? 'Rested 😴' : 'Day logged 💪');
    movePrepCursor(1);
  };
}

function movePrepCursor(dir) {
  S.prep.day = Math.min(PREP_TOTAL, Math.max(1, S.prep.day + dir));
  save(); render();
}

/* prep complete → hand off to Texas Method, Cycle 1a */
function finishPrep() {
  S.program = 'texas';
  S.cursor = { week: 0, day: 0 };
  save(); rebuild();
  TAB = 'today';
  render();
  toast('Prep complete! Welcome to Texas Method 🏋️');
}

/* =====================================================================
   30-DAY PREP — PROGRAM (calendar)
   ===================================================================== */
function renderPrepProgram() {
  titleEl.textContent = 'Program';
  subEl.textContent   = `30-Day Prep · ${prepDaysComplete()} of ${PREP_TOTAL - 4} done`;

  let cells = '';
  for (let n = 1; n <= PREP_TOTAL; n++) {
    const d = PREP30[n - 1];
    const cur  = n === S.prep.day ? 'cur' : '';
    const rest = d.rest ? 'rest' : '';
    const done = prepDayDone(n) ? 'done' : '';
    let inner;
    if (d.rest) {
      inner = `<div class="prep-rest">REST</div>`;
    } else {
      inner = d.exercises.map(ex =>
        `<div class="prep-ex">${ex.sets ? `Plank ${ex.sec}s×${ex.sets}` : `${ex.name} ${ex.reps}`}</div>`
      ).join('');
    }
    cells += `<div class="prep-cell ${cur} ${rest} ${done}" data-prepday="${n}">
      <div class="prep-num">${n}${done ? ' <span class="prep-tick">✓</span>' : ''}</div>
      ${inner}</div>`;
  }

  view.innerHTML = `<div class="screen">
    <div class="card" style="padding:14px 16px;">
      <div style="font-weight:800;font-size:16px;">30-Day Bodyweight Prep</div>
      <div class="tiny muted" style="margin-top:4px;">Tap any day to jump to it. Finish Day 30 to unlock Texas Method.</div>
    </div>
    <div class="prep-grid">${cells}</div>
  </div>`;

  view.querySelectorAll('[data-prepday]').forEach(c => c.onclick = () => {
    S.prep.day = +c.dataset.prepday; save(); TAB = 'today'; render();
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

function renderStats() {
  if (S.program === 'prep30') { renderPrepStats(); return; }
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
  </div>`;
  drawProjectionCharts();
}

/* current & best run of completed workout-days (rest days don't break it) */
function prepStreaks() {
  const seq = [];
  for (let n = 1; n <= PREP_TOTAL; n++) {
    if (PREP30[n - 1].rest) continue;
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
  subEl.textContent   = '30-Day Prep · progress';

  const workoutDays = PREP_TOTAL - 4; // 4 rest days
  const done = prepDaysComplete();
  const pct  = Math.round(done / workoutDays * 100);
  const { current, best } = prepStreaks();

  // cumulative tally across completed days
  const tally = { pushups: 0, squats: 0, burpees: 0, legraises: 0, crunches: 0, plankSec: 0 };
  for (let n = 1; n <= PREP_TOTAL; n++) {
    if (!prepDayDone(n)) continue;
    PREP30[n - 1].exercises.forEach(ex => {
      if (ex.sets) tally.plankSec += ex.sets * ex.sec; else tally[ex.key] += ex.reps;
    });
  }
  const totalReps = tally.pushups + tally.squats + tally.burpees + tally.legraises + tally.crunches;

  // per-exercise "banked" bars — fill grows toward the full-plan total
  const banked = PREP_EX_KEYS.map(e => {
    const v = tally[e.key], full = PREP_FULL[e.key] || 1;
    const w = Math.min(100, Math.round(v / full * 100));
    return `<div class="bar-line"><div class="top"><span>${e.icon} ${e.name}</span><b>${v} <span class="muted" style="font-weight:600">/ ${full}</span></b></div>
      <div class="track"><div class="fill" style="width:${w}%"></div></div></div>`;
  }).join('');

  view.innerHTML = `<div class="screen prep-stats">
    <div class="tiles">
      <div class="tile"><div class="k">Days complete</div><div class="v">${done} <small>/ ${workoutDays}</small></div></div>
      <div class="tile"><div class="k">🔥 Streak</div><div class="v">${current} <small>day${current===1?'':'s'}</small></div><div class="tile-sub">best ${best}</div></div>
      <div class="tile"><div class="k">Total reps banked</div><div class="v">${totalReps.toLocaleString()}</div></div>
      <div class="tile"><div class="k">Plank time</div><div class="v">${Math.round(tally.plankSec/60)}<small> min</small></div></div>
    </div>

    <h2 class="section">Reps banked — watch it climb</h2>
    <div class="card">${banked}
      <div class="tiny muted center" style="margin-top:8px">Totals across every workout you've completed. Bars fill toward the full 30-day total.</div>
    </div>

    <h2 class="section">Completion</h2>
    <div class="card">
      <div class="bar-line"><div class="top"><span>30-Day Prep</span><b>${done} / ${workoutDays} <span class="muted" style="font-weight:600">· ${pct}%</span></b></div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div></div>
      <div class="tiny muted center" style="margin-top:8px">
        ${done >= workoutDays ? 'All done — finish Day 30 to start Texas Method 🏋️' : `${workoutDays - done} workout${workoutDays-done===1?'':'s'} to go — then on to Texas Method.`}
      </div>
    </div>
  </div>`;
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
        <button data-prog="prep30" class="${S.program==='prep30'?'on':''}">🗓️ 30-Day Prep · bodyweight ramp-up</button>
        <button data-prog="texas"  class="${S.program==='texas'?'on':''}">🏋️ Texas Method · barbell program</button>
      </div>
      <div class="hint">Run the 30-day bodyweight plan first; finishing Day 30 starts Texas Method at Cycle 1a. You can switch any time.</div>
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
      <div class="hint">Used by the auto-start after each set and the “Start rest timer” button. The ± buttons on the timer bar nudge by your step.</div>
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
    toast(S.program === 'prep30' ? '30-Day Prep active 🗓️' : 'Texas Method active 🏋️');
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
    if (restLeft <= 0)  { clearInterval(restInt); buzz(); setTimeout(() => restEl.classList.add('hidden'), 1500); }
  }, 1000);
}
function buzz() { if (navigator.vibrate) navigator.vibrate([200,80,200]); }
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
document.getElementById('restStop').onclick  = () => { clearInterval(restInt); restEl.classList.add('hidden'); };

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
        <span style="font-weight:800;font-size:16px">Profiles</span>
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

/* init */
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // Auto-reload when a new service worker activates (picks up new version immediately)
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'SW_UPDATED') location.reload();
  });
}
