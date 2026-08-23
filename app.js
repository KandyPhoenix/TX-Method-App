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
  age: 45,            /* Fingerprint scoring is age-normed — see FP_ASSESS */
  equipment: 'gym',   /* gym | dumbbells | bodyweight — see EQUIP_RANK */
  weeklyGoal: 4,      /* sessions per week — the week strip counts toward this */
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
/* sets is what saApplyProgression() counts reps-hit against — without it the
   dumbbell work was invisible to the progression pass */
function db(key, name, icon, reps, scheme, side, sets) { return { key, name, icon, reps, scheme, sets: sets || 3, side: !!side }; }
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
  db('dbhammer',    'DB Hammer Curl',        '💪', 12, '3 × 12'),
  db('dbwindmill',  'DB Windmill',           '🌀', 8,  '3 × 8 / side', true)
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
   SUPERAGE LONGEVITY  (2-day & 4-day superset plans + weekly cardio)
   ~2 h/week of strength as supersets (8–12 reps, 2–3 reps in reserve,
   60–80 s between paired moves) + ~2 h/week Zone 2 / VO2-max cardio.
   ===================================================================== */
function sa(key, name, icon, reps, scheme, side) { return { key, name, icon, reps, scheme, side: !!side }; }
function saTimed(key, name, icon, sec, sets, scheme, side) { return { key, name, icon, sets: sets || 1, sec, scheme, side: !!side }; }

/* Pools of the article's exercise options. Every superset slot rotates
   through its pool on a different cycle, so consecutive weeks never
   repeat: the 2-day plan runs 12 unique weeks (its full length) and
   the 4-day plan runs 6 unique weeks before any pattern returns. */
const SA_POOL = {
  squat: [
    { key: 'gobletsquat', name: 'Goblet Squat',   icon: '🏋️', reps: 10 },
    { key: 'dblunge',     name: 'Reverse Lunge',  icon: '🦵', reps: 10, side: true },
    { key: 'sidelunge',   name: 'Lateral Lunge',  icon: '↔️', reps: 8,  side: true }
  ],
  hinge: [
    { key: 'deadlift', name: 'Barbell Deadlift',  icon: '🏋️', reps: 10 },
    { key: 'sardl',    name: 'Romanian Deadlift', icon: '🦵', reps: 10 }
  ],
  push: [
    { key: 'sabench', name: 'Bench Press', icon: '💪', reps: 10 },
    { key: 'pushups', name: 'Push-Ups',    icon: '🙌', reps: 10 }
  ],
  pull: [
    { key: 'sarow',   name: 'Bent-Over Row', icon: '🚣', reps: 10 },
    { key: 'latpull', name: 'Pull-Ups',      icon: '🧗', reps: 8 },
    { key: 'chin',    name: 'Chin-Ups',      icon: '🧗', reps: 8 }
  ],
  core: [
    { key: 'plank',     name: 'Plank',            icon: '🧘', hold: 45 },
    { key: 'sideplank', name: 'Side Plank',       icon: '📐', hold: 30, side: true },
    { key: 'hollow',    name: 'Hollow Body Hold', icon: '🌙', hold: 30 },
    { key: 'deadbug',   name: 'Dead Bug',         icon: '🐞', reps: 10, side: true },
    { key: 'legraises', name: 'Leg Raises',       icon: '🦵', reps: 12 },
    { key: 'rtwist',    name: 'Russian Twists',   icon: '🔁', reps: 20 }
  ],
  carry: [
    { key: 'carry',    name: "Farmer's Hold & March",    icon: '🧳', hold: 40 },
    { key: 'suitcase', name: 'Suitcase Hold & March',    icon: '💼', hold: 30, side: true },
    { key: 'rackhold', name: 'Front-Rack / Goblet Hold', icon: '🏋️', hold: 40 },
    { key: 'ohhold',   name: 'Overhead Hold & March',    icon: '🙌', hold: 30, side: true }
  ],
  explosive: [
    { key: 'squatjump',    name: 'Squat Jumps',    icon: '🦿', reps: 8 },
    { key: 'skaters',      name: 'Skater Hops',    icon: '⛸️', reps: 10 },
    { key: 'scissorlunge', name: 'Scissor Lunges', icon: '✂️', reps: 6, side: true },
    { key: 'hops',         name: 'Jump Rope',      icon: '➰', hold: 60 }
  ]
};
function saPick(pool, i) { const p = SA_POOL[pool]; return p[((i % p.length) + p.length) % p.length]; }
function saMove(o, scheme, sets, ss) {
  const m = o.hold != null
    ? saTimed(o.key, o.name, o.icon, o.hold, sets || 2, scheme, o.side)
    : sa(o.key, o.name, o.icon, o.reps, scheme + (o.side ? ' / side' : ''), o.side);
  if (o.hold == null && sets > 1) m.sets = sets;
  if (ss != null) m.ss = ss;
  return m;
}
function saWarmup() { return [
  saTimed('wucardio', 'Jump Rope / Brisk Walk', '➰', 120, 1, '2 min easy — just to get warm'),
  sa('wuarm',   'Arm Circles',       '🔄', 10, '10 each direction — big slow circles'),
  sa('wuhip',   'Hip Circles',       '🌀', 10, '10 each direction — hands on hips'),
  sa('wuleg',   'Leg Swings',        '🦵', 10, '10 / side — front-to-back, hold something', true),
  sa('wuankle', 'Ankle Rolls',       '🦶', 10, '10 each direction / side', true),
  sa('wuband',  'Banded Side-Steps', '↔️', 10, '10 steps each way — band above knees')
]; }
function saLiftNote(rounds) { return `Warm up first, then the explosive move, then the supersets. No rest periods: finish a set and move straight to its partner exercise — that muscle rests while the other works. Alternate for ${rounds} rounds per pair (each move naturally gets ~60–80 s before you're back on it), then go to the next pair. Pick weights that leave 2–3 reps in reserve. The timed core work alternates the same way. Weights start from your Setup lifts (marked ≈) and auto-progress: each set has a reps-hit counter — hit the target on every set and that weight goes up next session; miss any set and it holds.`; }
const SA_Z2    = min => saTimed('zone2', 'Zone 2 Ride', '🚴', min * 60, 1, `${min} min steady road ride — conversational pace`);
function saExplScheme(o, sets) { return o.hold != null ? 'explosive warm-up — quick, light skips' : `${sets} sets · explosive — full effort, land soft`; }
function saZ2Day(min, w) { return { title: `Zone 2 Ride · Wk ${w + 1}`,
  note: 'One steady road ride at a conversational pace — you should be able to talk in full sentences the whole way. Roughly 60–70% of max heart rate. If in doubt, go easier: Zone 2 should feel almost too easy.',
  exercises: [SA_Z2(min)] }; }
function saVO2Day(w) {
  const ex = [saTimed('ridewarm', 'Easy Ride Warm-Up', '🚴', 600, 1, '10 min · easy gear, building to moderate by the end')];
  for (let i = 1; i <= 4; i++) {
    ex.push(saTimed('vo2i' + i, `Hard Interval ${i} of 4`, '🫀', 240, 1, '4 min @ 8/10 effort — only a few words at a time'));
    if (i < 4) ex.push(saTimed('vo2r' + i, 'Easy Recovery', '🌬️', 180, 1, '3 min very easy pedaling — let your breathing settle'));
  }
  ex.push(saTimed('zone2', 'Zone 2 Cool-Down', '🚴', 300, 1, '5 min easy — flush the legs'));
  return { title: `VO₂ Max Ride · Wk ${w + 1}`,
    note: 'One continuous ~40 min road ride: warm up 10 min, then 4 hard intervals of 4 min with 3 min easy pedaling between, and finish with 5 easy minutes. “Hard” = 8/10 — the fastest pace you could hold for the full 4 minutes, breathing hard, only a few words at a time. Ride the intervals seated and smooth (a steady climb or open road works well). If interval 4 matches interval 1, you paced it right.',
    exercises: ex };
}
function saLongRideDay(w) {
  const ex = [saTimed('ridewarm', 'Easy Ride Warm-Up', '🚴', 600, 1, '10 min · easy gear, building to moderate by the end')];
  for (let i = 1; i <= 4; i++) {
    ex.push(saTimed('vo2i' + i, `Hard Interval ${i} of 4`, '🫀', 240, 1, '4 min @ 8/10 effort — only a few words at a time'));
    if (i < 4) ex.push(saTimed('vo2r' + i, 'Easy Recovery', '🌬️', 180, 1, '3 min very easy pedaling — let your breathing settle'));
  }
  ex.push(saTimed('zone2', 'Zone 2 Ride', '🚴', 5100, 1, '85 min steady road ride — conversational pace'));
  return { title: `Long Ride · Wk ${w + 1}`,
    note: 'The week’s full 2 hours of riding in one go: 10 min easy warm-up, the 4 × 4 min VO₂ intervals while your legs are fresh, then settle into Zone 2 for the remaining 85 min. After the intervals, drop to a pace where you can talk in full sentences and hold it there — if you’re still gasping, shift down.',
    exercises: ex };
}

/* --- 2-day: two big sessions/week (~60 min lifting + ~60 min cardio) --- */
function sa2Session(w, v) { /* v: 0 = A, 1 = B */
  const expl = saPick('explosive', w + v * 2);
  const ex = [
    ...saWarmup(),
    saMove(expl, saExplScheme(expl, expl.hold != null ? 2 : 3), expl.hold != null ? 2 : 3),
    saMove(saPick('squat', w + v * 2),     'Superset 1 · 8–12 reps · leave 2–3 in reserve', 4, 1),
    saMove(saPick('hinge', w + v),         'Superset 1 · 8–12 reps · no rest — straight back to partner', 4, 1),
    saMove(saPick('push',  w + v),         'Superset 2 · 8–12 reps · leave 2–3 in reserve', 4, 2),
    saMove(saPick('pull',  w + v * 2 + 1), 'Superset 2 · 8–12 reps · no rest — straight back to partner', 4, 2),
    saMove(saPick('carry', w + v), 'Superset 3 · heavy — alternates with the core exercise', 3, 3),
    saMove(saPick('core', w + v), 'Superset 3 · alternates with the holds', 3, 3)
  ];
  return { title: `Full Body ${v === 0 ? 'A' : 'B'} · Wk ${w + 1}`, note: saLiftNote(4), exercises: ex };
}
const SUPERAGE2 = [];
for (let w = 0; w < 12; w++) SUPERAGE2.push(
  sa2Session(w, 0), PREP_REST, sa2Session(w, 1), PREP_REST, saLongRideDay(w), PREP_REST, PREP_REST
);

/* --- 4-day: 2 upper + 2 lower per week (~30 min lifting + ~30 min cardio) --- */
function sa4Upper(w, v) { /* v: 0 = A, 1 = B */
  const expl = [SA_POOL.explosive[3], SA_POOL.explosive[0]][(w + v) % 2]; /* jump rope / squat jumps */
  const ex = [
    ...saWarmup(),
    saMove(expl, saExplScheme(expl, 2), 2),
    saMove(saPick('push', w + v),         'Superset 1 · 8–12 reps · leave 2–3 in reserve', 3, 1),
    saMove(saPick('pull', w + v * 2),     'Superset 1 · 8–12 reps · no rest — straight back to partner', 3, 1),
    saMove(saPick('push', w + v + 1),     'Superset 2 · 8–12 reps · leave 2–3 in reserve', 3, 2),
    saMove(saPick('pull', w + v * 2 + 1), 'Superset 2 · 8–12 reps · no rest — straight back to partner', 3, 2),
    saMove(saPick('core', w + v), 'Core finisher', 2)
  ];
  return { title: `Upper ${v === 0 ? 'A' : 'B'} · Wk ${w + 1}`, note: saLiftNote(3), exercises: ex };
}
function sa4Lower(w, v) { /* v: 0 = A, 1 = B */
  const expl = [SA_POOL.explosive[0], SA_POOL.explosive[1], SA_POOL.explosive[2]][(w + v) % 3];
  const ex = [
    ...saWarmup(),
    saMove(expl, saExplScheme(expl, 2), 2),
    saMove(saPick('squat', w + v),     'Superset 1 · 8–12 reps · leave 2–3 in reserve', 3, 1),
    saMove(saPick('hinge', w + v),     'Superset 1 · 8–12 reps · no rest — straight back to partner', 3, 1),
    saMove(saPick('squat', w + v + 1), 'Superset 2 · 8–12 reps · leave 2–3 in reserve', 3, 2),
    saMove(saPick('hinge', w + v + 1), 'Superset 2 · 8–12 reps · no rest — straight back to partner', 3, 2),
    saMove(saPick('carry', w + v), 'Core & carry finisher — heavy, tall posture', 2)
  ];
  return { title: `Lower ${v === 0 ? 'A' : 'B'} · Wk ${w + 1}`, note: saLiftNote(3), exercises: ex };
}
const SUPERAGE4 = [];
for (let w = 0; w < 6; w++) SUPERAGE4.push(
  sa4Upper(w, 0), saZ2Day(40, w), sa4Lower(w, 0), saZ2Day(40, w), sa4Upper(w, 1), saVO2Day(w), sa4Lower(w, 1)
);

/* --- hybrid: the week's shape itself rotates on a 4-week cycle ---
   Wk1 condensed lifts + long ride · Wk2 everything spread across the
   week · Wk3 condensed lifts + spread rides · Wk4 spread lifts + long
   ride. Always 2 h lifting + 2 h riding. */
function saHybridWeek(w) {
  switch (w % 4) {
    case 0: return [sa2Session(w, 0), PREP_REST, sa2Session(w, 1), PREP_REST, saLongRideDay(w), PREP_REST, PREP_REST];
    case 1: return [sa4Upper(w, 0), saZ2Day(40, w), sa4Lower(w, 0), saZ2Day(40, w), sa4Upper(w, 1), saVO2Day(w), sa4Lower(w, 1)];
    case 2: return [sa2Session(w, 0), saZ2Day(40, w), PREP_REST, sa2Session(w, 1), saZ2Day(40, w), saVO2Day(w), PREP_REST];
    default: return [sa4Upper(w, 0), sa4Lower(w, 0), PREP_REST, sa4Upper(w, 1), sa4Lower(w, 1), saLongRideDay(w), PREP_REST];
  }
}
const SUPERAGEH = [];
for (let w = 0; w < 12; w++) SUPERAGEH.push(...saHybridWeek(w));

/* =====================================================================
   DAY-PROGRAM HELPERS  (shared by 30-Day Prep + Mobility)
   ===================================================================== */
/* =====================================================================
   FINGERPRINT FOCUS
   ---------------------------------------------------------------------
   The programme that actually consumes the Fingerprint. Every other plan
   here is a fixed array; this one is generated from your current marker
   scores, weakest first, and re-generated whenever those scores or your
   available equipment change.

   Two rules it obeys:
     - Only ASSESSED markers can be called weak. An unassessed marker is
       unknown, not bad, so it sits after the assessed ones rather than
       dominating the plan on the strength of a zero.
     - Every movement is tagged with the kit it needs and filtered through
       the same equipment ladder as the protocol library, so the plan is
       always something you can actually do today.
   ===================================================================== */
function fpx(key, name, icon, reps, scheme, needs, side) {
  return { key, name, icon, reps, scheme, sets: 3, needs: needs || 'bodyweight', side: !!side };
}
/* Bodyweight movements cannot add plates, so they progress by volume instead:
   reps and holds climb each week of the 4-week block. Loaded movements are
   left alone here — they go up through the reps-hit rule like everything else,
   and doing both would double-dip. */
function fpProgress(ex, week) {
  if (!week) return ex;
  const loaded = !!SA_WEIGHT[ex.key];
  if (loaded) return ex;
  const out = Object.assign({}, ex);
  if (out.reps) out.reps = out.reps + week;
  if (out.sec)  out.sec  = out.sec + week * (out.sec >= 300 ? 60 : 5);
  return out;
}
function fpxT(key, name, icon, sec, sets, scheme, needs, side) {
  return { key, name, icon, sets: sets || 1, sec, scheme, needs: needs || 'bodyweight', side: !!side };
}

const FP_POOLS = {
  balance: [
    fpxT('slstance', 'Single-Leg Stance', '🦩', 30, 2, 'Eyes closed if you can — 30 s each side', 'bodyweight', true),
    fpxT('deepsquat', 'Deep Squat Hold', '🧘', 45, 2, 'Sink in, heels down, breathe', 'bodyweight'),
    fpx('slrdl', 'Single-Leg RDL', '🦵', 8, 'Slow — the wobble is the work', 'bodyweight', true),
    fpx('tibraise', 'Tibialis Raises', '🦶', 15, 'Back to a wall, toes up slow', 'bodyweight'),
    fpxT('tandem', 'Tandem Walk', '➡️', 40, 1, 'Heel to toe, arms folded', 'bodyweight'),
    fpx('birddog', 'Bird Dog', '🐕', 8, 'Slow — hips stay square', 'bodyweight', true),
    fpx('slrdlreach', 'Single-Leg RDL Reach', '🦩', 8, 'Reach only as far as the hips allow', 'bodyweight', true),
    fpx('crosscrawl', 'Cross Crawl March', '🚶', 12, 'Opposite elbow to knee, deliberate', 'bodyweight'),
    fpx('pushuptap', 'Push-Up Shoulder Tap', '🤚', 8, 'Hips dead still', 'bodyweight')
  ],
  functional_strength: [
    fpx('squatjump', 'Squat Jumps', '🔥', 6, 'Explosive — full effort, land soft', 'bodyweight'),
    fpx('broadjump', 'Standing Broad Jump', '➡️', 5, 'Max distance, reset every rep', 'bodyweight'),
    fpx('stepup', 'Weighted Step-Ups', '🪜', 8, 'Drive through the heel', 'dumbbells', true),
    fpx('atgsplit', 'ATG Split Squat', '🦵', 8, 'Deep, controlled, knee travels forward', 'bodyweight', true),
    fpx('gobletsquat', 'Goblet Squat', '🏋️', 10, 'Chest tall, elbows inside knees', 'dumbbells'),
    fpx('boxjump', 'Box Jump', '📦', 5, 'Land soft, step down — never jump down', 'bodyweight'),
    fpx('airsquattempo', 'Air Squat (3-2-1)', '⏱️', 8, '3 s down, 2 s pause, 1 s up', 'bodyweight'),
    fpx('frontsquat', 'Barbell Front Squat', '🏋️', 6, 'Elbows high, torso vertical', 'gym'),
    fpx('pushpress', 'Dumbbell Push Press', '🙌', 8, 'Legs start it, shoulders finish it', 'dumbbells'),
    fpx('kbswing', 'Light KB Swing', '🔔', 12, 'Hinge and snap — arms are ropes', 'dumbbells')
  ],
  peripheral_strength: [
    fpxT('deadhang', 'Dead Hang', '🪢', 30, 3, 'Shoulders active, no straps', 'gym'),
    fpxT('farmcarry', 'Farmer Carry', '🧳', 40, 3, 'Heavy, tall, no shrugging', 'dumbbells'),
    fpx('dbrow', 'DB Bent-Over Row', '💪', 10, 'Squeeze the blades, no swing', 'dumbbells'),
    fpxT('towelhang', 'Towel Hang', '🧻', 20, 2, 'Over the bar — brutal on the grip', 'gym'),
    fpx('pushups', 'Pushups', '💪', 12, 'One straight line, no sagging', 'bodyweight'),
    fpxT('frontrackcarry', 'Front Rack Carry', '🧱', 40, 2, 'Elbows up, ribs down', 'dumbbells'),
    fpxT('trapcarry', 'Trap Bar Carry', '🧳', 45, 2, 'Short even steps, shoulders back', 'gym'),
    fpx('sadbpress', 'Single-Arm DB Press', '🙌', 8, 'Do not lean away from the weight', 'dumbbells', true),
    fpx('declinepushup', 'Decline Push-Up', '📐', 8, 'Feet raised, hips level', 'bodyweight')
  ],
  vo2_max: [
    fpxT('zone2', 'Zone 2 Effort', '🚴', 1200, 1, '20 min steady — you can still hold a conversation', 'bodyweight'),
    fpxT('intervals', '4x4 Intervals', '⚡', 960, 1, '4 min hard / 3 min easy, four rounds', 'bodyweight'),
    fpxT('jumprope', 'Jump Rope', '🪢', 180, 3, '3 min on, 1 min off', 'bodyweight'),
    fpxT('brisk', 'Brisk Walk', '🚶', 900, 1, '15 min, fast enough to be slightly breathless', 'bodyweight'),
    fpxT('bike', 'Bike', '🚴', 1500, 1, '25 min conversational', 'bodyweight'),
    fpxT('inclinewalk', 'Incline Treadmill Walk', '⛰️', 1200, 1, 'Raise the incline, not the speed — hands off the rails', 'bodyweight'),
    fpxT('briskmarch', 'Brisk March', '🚶', 600, 1, '10 min, talking should be effortful', 'bodyweight'),
    fpxT('shadowbox', 'Shadow Boxing', '🥊', 180, 3, 'Light feet, relaxed hands', 'bodyweight')
  ],
  agility: [
    fpx('sidestep', 'Banded Side-Steps', '↔️', 12, '12 steps each way, knees out', 'bodyweight'),
    fpxT('carioca', 'Carioca', '🔀', 30, 2, 'Grapevine, both directions', 'bodyweight'),
    fpx('shuffle', 'Lateral Shuffle', '↔️', 10, '5 m out and back, stay low', 'bodyweight'),
    fpxT('highknees', 'High Knees', '🏃', 30, 2, 'Quick feet, tall posture', 'bodyweight'),
    fpx('woodchop', 'DB Wood Chopper', '🪓', 10, 'Rotate from the ribs', 'dumbbells', true),
    fpxT('plankdrag', 'Plank Drag', '🧻', 30, 2, 'Feet wide, hips locked', 'bodyweight')
  ],
  endurance_under_load: [
    fpxT('suitcase', 'Suitcase Carry', '🧳', 40, 2, 'One side at a time, do not lean', 'dumbbells', true),
    fpx('lunge', 'Reverse Lunge', '🦵', 10, 'Long steps, torso tall', 'bodyweight', true),
    fpxT('plank', 'Plank', '🧘', 45, 3, 'Ribs down, glutes on', 'bodyweight'),
    fpx('dblunge', 'DB Reverse Lunge', '💪', 8, 'Weight at your sides', 'dumbbells', true),
    fpx('walkinglunge', 'Walking Lunge', '🚶', 10, 'Long steps load the glutes', 'dumbbells', true),
    fpx('trapdeadlift', 'Trap Bar Deadlift', '🏋️', 6, 'Hinge, flat back, push the floor away', 'gym'),
    fpx('splitsquatecc', 'Split Squat (3-s down)', '⏱️', 8, 'Three seconds lowering, normal speed up', 'dumbbells', true),
    fpxT('marchcarry', 'March Carry', '🧳', 40, 2, 'Knees to hip height, weights still', 'dumbbells'),
    fpxT('carryintervals', 'Carry Intervals', '🧳', 40, 3, 'Posture is the stop signal', 'dumbbells')
  ]
};

/* weakest assessed marker first; unassessed markers trail behind, because an
   unknown score is not the same as a bad one */
function fpWeakestOrder() {
  const keys = Object.keys(FP_POOLS);
  const assessed = [], unknown = [];
  keys.forEach(k => {
    const e = fpGet(k);
    (e ? assessed : unknown).push({ k, score: e ? e.score : null });
  });
  assessed.sort((a, b) => a.score - b.score);
  return assessed.map(x => x.k).concat(unknown.map(x => x.k));
}

function fpPickFrom(pool, i) {
  const usable = FP_POOLS[pool].filter(e => canRun(e.needs));
  const list = usable.length ? usable : FP_POOLS[pool].filter(e => e.needs === 'bodyweight');
  if (!list.length) return null;
  return list[((i % list.length) + list.length) % list.length];
}

function fpFocusWarmup() {
  return [
    fpxT('wucardio', 'Easy Cardio', '🚶', 180, 1, '3 min — just raise the temperature'),
    fpx('hipcars', 'Hip CARs', '🕺', 5, 'Slow, biggest circle you can', 'bodyweight', true),
    fpx('anklerock', 'Ankle Rocks', '🦶', 10, 'Knee to wall, heel down', 'bodyweight', true)
  ];
}

/* Relational Capacity and Working Memory are not in FP_POOLS on purpose — you
   cannot train them with a squat, so they never steer exercise selection. But
   a low score should not simply vanish either, so the session names it. */
function fpNonPhysicalNote() {
  const out = [];
  const rel = fpGet('relational_capacity');
  const wm  = fpGet('working_memory');
  if (rel && rel.score < 40) out.push('Your Relational Capacity is low — that carries more risk than any lift here. Put one contact in the diary this week.');
  if (wm && wm.score < 40) out.push('Working Memory is low; the aerobic work in this plan is the intervention with the best evidence behind it.');
  return out.length ? ' ' + out.join(' ') : '';
}
function fpFocusDay(dayIdx) {
  const order = fpWeakestOrder();
  /* rotate which of the weak markers leads, so four weeks is not one session
     repeated — the first two are always drawn from the weakest half */
  const lead  = order[dayIdx % Math.max(1, Math.min(3, order.length))];
  const second = order[(dayIdx + 1) % Math.max(1, Math.min(4, order.length))];
  const third  = order[(dayIdx + 2) % order.length];
  const picks = [lead, second, third]
    .map((p, n) => fpPickFrom(p, dayIdx + n))
    .filter(Boolean);
  /* a second movement from the leading weakness — it is the priority */
  const extra = fpPickFrom(lead, dayIdx + 4);
  const week = Math.floor(dayIdx / 6);          /* 6 training days per block */
  const exercises = fpFocusWarmup()
    .concat(picks.map(e => fpProgress(e, week)));
  if (extra && !picks.includes(extra)) exercises.push(fpProgress(extra, week));

  const nice = k => (FP_AXES.find(a => a.key === k) || { name: k }).name;
  const e = fpGet(lead);
  return {
    title: 'Focus · ' + nice(lead),
    note: 'Built from your Fingerprint. Today leads on ' + nice(lead) +
          (e ? ' — currently ' + e.score + '%, your weakest assessed marker.'
             : ' — not yet assessed, so it is being trained on the assumption it needs work.') +
          ' Assess more markers in the Fingerprint tab and this plan re-orders itself.' +
          fpNonPhysicalNote(),
    exercises
  };
}

/* 28 days, 6 on / 1 rest. Memoised against the inputs that shape it so pdata()
   is not rebuilding the whole plan on every render. */
let fpPlanCache = null, fpPlanKey = null;
function fpFocusPlan() {
  const key = fpWeakestOrder().join(',') + '|' + haveEquip() + '|' +
              FP_AXES.map(a => { const e = fpGet(a.key); return e ? e.score : '-'; }).join(',');
  if (fpPlanKey === key && fpPlanCache) return fpPlanCache;
  const days = [];
  for (let i = 0; i < 28; i++) days.push((i % 7 === 6) ? { rest: true } : fpFocusDay(i - Math.floor(i / 7)));
  fpPlanKey = key; fpPlanCache = days;
  return days;
}

const DAY_PROGRAMS = {
  prep30:   { data: PREP30,   stateKey: 'prep', label: '30-Day Prep',       sub: 'bodyweight ramp-up' },
  mobility: { data: MOBILITY, stateKey: 'mob',  label: 'Mobility Method',   sub: 'daily joint mobility' },
  core:     { data: CORE,     stateKey: 'core', label: 'Core & Abs',        sub: '28-day core builder' },
  dumbbell: { data: DUMBBELL, stateKey: 'db',   label: 'Dumbbell Full-Body', sub: 'A/B strength, 3×/week' },
  pilates:  { data: PILATES,  stateKey: 'pil',  label: 'Pilates Mat',        sub: 'classical mat sequence' },
  hiit:     { data: HIIT,     stateKey: 'hiit', label: 'Full-Body HIIT',     sub: 'timed circuit' },
  bjj:      { data: BJJ,      stateKey: 'bjj',  label: 'BJJ Solo Drills',    sub: 'jiu-jitsu movement' },
  sa2:      { data: SUPERAGE2, stateKey: 'sa2', label: 'SuperAge 2-Day',     sub: '3 days: 2 lifts + 1 long ride', holdLabel: 'Timed work' },
  sa4:      { data: SUPERAGE4, stateKey: 'sa4', label: 'SuperAge Full Week', sub: 'all week: 4 lifts + 3 rides', holdLabel: 'Timed work' },
  sahyb:    { data: SUPERAGEH, stateKey: 'sahyb', label: 'SuperAge Hybrid',   sub: 'week style rotates weekly', holdLabel: 'Timed work' },
  fpfocus:  { get data() { return fpFocusPlan(); }, stateKey: 'fpfocus', label: 'Fingerprint Focus', sub: 'targets your weakest markers', holdLabel: 'Timed work' }
};
function isDayProgram() { return !!DAY_PROGRAMS[S.program]; }
function pcfg()   { return DAY_PROGRAMS[S.program] || DAY_PROGRAMS.prep30; }
function pdata()  { return pcfg().data; }
function ptotal() { return pdata().length; }
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
/* true once any day has real recorded activity — a checked set, logged
   reps, or a completed day. Just viewing the Today screen stubs in an
   empty `{ checks: {} }` entry (see wirePrepToday), so a bare log key
   is NOT enough to count as "started". */
function progHasActivity(log) {
  return Object.values(log).some(d => d && (
    d.done ||
    (d.checks && Object.values(d.checks).some(Boolean)) ||
    (d.reps && Object.keys(d.reps).length)
  ));
}
function pstate() {
  const k = pcfg().stateKey;
  if (!S[k]) S[k] = { day: 1, log: {} };
  if (!S[k].log) S[k].log = {};
  /* until a day has actually been logged, the program hasn't "started" —
     keep Day 1 anchored to today rather than freezing a stale first-view
     date. Reset is the only way to re-anchor once real progress exists. */
  const started = (S[k].day || 1) > 1 || progHasActivity(S[k].log);
  if (started) {
    if (!S[k].start) { const d = new Date(); d.setDate(d.getDate() - ((S[k].day || 1) - 1)); S[k].start = isoDate(d); }
  } else {
    S[k].start = isoDate(new Date());
  }
  return S[k];
}
/* calendar date for a program day, anchored to when the program was started */
function prepDateFor(dayNum) {
  const st = pstate();
  if (!st.start) return null;
  const d = new Date(st.start + 'T12:00:00');
  d.setDate(d.getDate() + (dayNum - 1));
  return d;
}
function fmtPrepDate(d) { return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
/* rough session length: timed work + recoveries, ~110 s per lift set, 45 s per mobility move */
function estDayMin(d) {
  if (d.rest) return 0;
  let sec = 0;
  d.exercises.forEach(e => {
    const n = e.sets || 1;
    if (e.sec != null) sec += n * e.sec + (n - 1) * 60 + 30;
    else if (e.sets)   sec += n * 110;
    else               sec += 45;
  });
  return Math.max(1, Math.round(sec / 60));
}
function pWorkDays() { return pdata().filter(d => !d.rest).length; }
function pLabel()    { return pcfg().label; }
/* the Setup screen's cursor-reset button: day-programs (SuperAge, prep30,
   etc.) run on a Day 1..N counter anchored to a calendar date, not the
   Texas Method's fixed Monday/Wednesday/Friday week structure */
function resetCursorLabel() {
  return isDayProgram() ? '↺ Jump to Day 1, today' : '↺ Jump to Week 1, Monday';
}
/* reps-exercise keys present in the active program (for the stats bars) */
function pExKeys() {
  const seen = {}, out = [];
  pdata().forEach(d => { if (d.rest) return; d.exercises.forEach(e => { if (e.sec == null && !seen[e.key]) { seen[e.key] = 1; out.push({ key: e.key, name: e.name, icon: e.icon }); } }); });
  return out;
}
function pFull() {
  const t = { plankSec: 0 };
  pdata().forEach(d => { if (d.rest) return; d.exercises.forEach(e => { if (e.sec != null) t.plankSec += (e.sets || 1) * e.sec; else t[e.key] = (t[e.key] || 0) + e.reps * (e.sets || 1); }); });
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
           program: 'prep30', prep: { day: 1, log: {} }, mob: { day: 1, log: {} }, core: { day: 1, log: {} }, db: { day: 1, log: {} }, pil: { day: 1, log: {} }, hiit: { day: 1, log: {} }, bjj: { day: 1, log: {} }, sa2: { day: 1, log: {} }, sa4: { day: 1, log: {} }, sahyb: { day: 1, log: {} }, achievements: [], prs: {}, sessions: 0, history: [] };
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
  ['core', 'db', 'pil', 'hiit', 'bjj', 'sa2', 'sa4', 'sahyb'].forEach(k => { st[k] = st[k] || { day: 1, log: {} }; if (st[k].day == null) st[k].day = 1; if (!st[k].log) st[k].log = {}; });
  if (!st.achievements) st.achievements = [];
  if (!st.prs) st.prs = {};
  if (st.sessions == null) st.sessions = 0;
  if (!st.history) st.history = [];
  if (!st.liftLog) st.liftLog = {};
  if (!st.saWeights) st.saWeights = {};
  ['squat', 'deadlift', 'bench', 'glutestep'].forEach(k => { if (!st.liftLog[k]) st.liftLog[k] = []; });
  return st;
}
function save() {
  localStorage.setItem(activeStateKey(), JSON.stringify(S));
  if (typeof cloudOnLocalChange === 'function') cloudOnLocalChange();
}

/* =====================================================================
   LIFT TRACKER  (cross-program: log a top set, graph it everywhere)
   ===================================================================== */
const LIFT_TRACK = [
  { key: 'squat',     name: 'Squat',           icon: '🏋️' },
  { key: 'deadlift',  name: 'Deadlift',        icon: '🏋️' },
  { key: 'bench',     name: 'Bench Press',     icon: '💪' },
  { key: 'glutestep', name: 'Glute Step Down', icon: '🦵' }
];
function liftTrackerHTML() {
  const L = S.liftLog || {};
  const rows = LIFT_TRACK.map(t => {
    const arr = L[t.key] || [];
    const last = arr.length ? arr[arr.length - 1] : null;
    const setupL = ['squat', 'deadlift', 'bench'].includes(t.key) ? S.settings.lifts[t.key] : null;
    return `<div class="bar-line" style="margin-bottom:14px">
      <div class="top"><span>${t.icon} ${t.name}${setupL ? ` <span class="muted" style="font-weight:600;font-size:11px">· Setup: ${fmt(setupL.weight)} × ${setupL.reps}</span>` : ''}</span>
        <b>${last ? `${fmt(last.w)} ${unit()}${last.r ? ` × ${last.r}` : ''} <span class="muted" style="font-weight:600">· ${last.d.slice(5)}</span>` : '<span class="muted" style="font-weight:600">not logged yet</span>'}</b></div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <input type="number" inputmode="decimal" placeholder="weight (${unit()})" style="flex:1" data-liftlog="${t.key}" />
        <input type="number" inputmode="numeric" placeholder="reps" style="width:70px" data-liftlogreps="${t.key}" />
        <button class="btn small secondary" data-liftlogbtn="${t.key}">＋ Log</button>
      </div>
      ${arr.length > 1 ? `<canvas class="chart" id="lt_${t.key}" style="margin-top:8px"></canvas>`
        : `<div class="tiny muted" style="margin-top:4px">${arr.length === 0 ? 'Not logged yet — ' : 'One entry so far — '}log your top set after each workout; the graph appears from your second logged day.</div>`}
    </div>`;
  }).join('');
  return `<h2 class="section">Lift tracker — all programs</h2><div class="card">${rows}
    <div class="tiny muted center" style="margin-top:2px">Logging squat, deadlift or bench also updates your Setup lifts, so the ≈ weight suggestions and Texas numbers always match your current strength. Twice in one day updates that day's entry.</div></div>`;
}
function wireLiftTracker() {
  view.querySelectorAll('[data-liftlogbtn]').forEach(b => b.onclick = () => {
    const k = b.dataset.liftlogbtn;
    const inp = view.querySelector(`[data-liftlog="${k}"]`);
    const w = parseFloat(inp && inp.value);
    if (!w) { toast('Enter a weight first'); return; }
    if (!S.liftLog) S.liftLog = {};
    if (!S.liftLog[k]) S.liftLog[k] = [];
    const rInp = view.querySelector(`[data-liftlogreps="${k}"]`);
    const r = parseInt(rInp && rInp.value, 10) || 10;
    const arr = S.liftLog[k], d = isoDate(new Date());
    const last = arr[arr.length - 1];
    if (last && last.d === d) { last.w = w; last.r = r; } else arr.push({ d, w, r });
    let synced = false;
    if (['squat', 'deadlift', 'bench'].includes(k)) { S.settings.lifts[k] = { weight: w, reps: r }; synced = true; rebuild(); }
    save(); toast(synced ? 'Logged ✓ — Setup lift updated' : 'Logged ✓'); render();
  });
  LIFT_TRACK.forEach(t => {
    const arr = (S.liftLog && S.liftLog[t.key]) || [];
    if (arr.length > 1) lineChart(document.getElementById('lt_' + t.key),
      [{ name: t.name, color: cssVar('--chart-1', '#aaff00'), data: arr.map(e => e.w) }], arr.map(e => e.d.slice(5)));
  });
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
/* Plate colours drawn from the app's own palette rather than an arbitrary set:
   a deep-navy -> brand-blue -> pale-blue ramp, ending on the highlighter and a
   neutral for the change plates. Ordered so heavier plates are visually
   heavier, which makes a loaded bar readable at a glance. lb and kg
   equivalents share a step (45/20 heaviest, 35/15 next). */
const PLATE_COLORS = { 45:'#17287d', 35:'#1a40ff', 25:'#4f7bff', 20:'#17287d', 15:'#1a40ff', 10:'#9db8ff', 5:'#eaf962', 2.5:'#b8bfcc', 1.25:'#b8bfcc' };
/* Every highlighter is light, so the old "only the 10 is light" rule would put
   white text on yellow. Decide ink from the chip's own luminance instead. */
function plateInk(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? '#10120a' : '#ffffff';
}
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
    return `<span class="plate" style="background:${c};color:${plateInk(c)}">${fmt(p)}</span>`;
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
  if (TAB === 'today') { prep ? renderPrepToday() : renderToday(); mountSessionRail(); }
  if (TAB === 'program') { prep ? renderPrepProgram() : renderProgram(); mountProtocols(); }
  if (TAB === 'stats')   renderStats();
  if (TAB === 'fp')      renderFingerprint();
  if (TAB === 'setup')   renderSetup();
  updateSessionUI();   /* keeps the session bar in step with the current tab */
  if (typeof updateWakeLock === 'function') updateWakeLock();
}

/* =====================================================================
   TODAY  (changes #1 + #2 + #5)
   ===================================================================== */
const DAY_NAMES = ['Monday · Volume', 'Wednesday · Light', 'Friday · Intensity'];


/* =====================================================================
   ROADMAP  (hero + week strip, after The Standard's Roadmap screen)
   ===================================================================== */
/* Rough session length for a Texas day — the day-programs have estDayMin(),
   barbell days don't, and the hero banner wants a number either way. */
function estTexasMin(lifts) {
  const sets = lifts.reduce((n, lf) => n + ((lf.sets && lf.sets.length) || 3) + 3, 0);
  return Math.max(20, Math.round(sets * 2.2 / 5) * 5);
}

function weekStripHTML() {
  const done = new Set(S.history || []);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  /* week runs Mon..Sun; getDay() is 0=Sun so shift by 6 */
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const LBL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  let cells = '', n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const isDone = done.has(isoDate(d));
    const isToday = d.getTime() === now.getTime();
    if (isDone) n++;
    cells += `<div class="day-chip ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}">
      <span class="d">${LBL[i]}</span><span class="n">${isDone ? '✓' : d.getDate()}</span></div>`;
  }
  /* Counting toward seven implied training every day. The Standard counts
     against a weekly goal instead — four sessions whenever they suit you —
     which is how this app's day cursor already behaves. */
  const goal = S.settings.weeklyGoal || 4;
  const hit = n >= goal;
  return `<div class="week">${cells}<span class="week-count${hit ? ' met' : ''}">${n}/${goal}</span></div>`;
}

function roadmapTop(o) {
  const start = o.rest ? '' :
    `<button class="btn primary" id="startSession">▶ Start</button>`;
  return `
  <div class="hl-banner">${o.rest ? 'Rest day &nbsp;|&nbsp; recover' : `Workout &nbsp;|&nbsp; ≈${o.mins} min`}</div>
  <div class="hero">
    <div class="hero-art" aria-hidden="true">${o.art}</div>
    <div class="hero-kicker">${o.kicker}</div>
    <div class="hero-title">${o.title}</div>
    <div class="hero-sub">${o.sub}</div>
    <div class="hero-actions">
      <button class="btn ghost-hl" id="${o.prevId}" style="flex:0 0 44px" ${o.prevDisabled ? 'disabled' : ''}>‹</button>
      ${start}
      <button class="btn ghost-hl" id="${o.nextId}" ${o.nextDisabled ? 'disabled' : ''}>Skip ›</button>
    </div>
  </div>
  <h2 class="section">This week</h2>
  ${weekStripHTML()}
  <button class="link-btn" id="rmLogLift">+ Log a lift</button>`;
}

function renderToday() {
  const { week, day } = S.cursor;
  const w = PROGRAM[week];
  titleEl.textContent = 'Roadmap';
  subEl.textContent   = `Cycle ${w.label} · Week ${w.subweek} · ${DAY_NAMES[day]}`;

  const logKey = `${week}-${day}`;
  const log    = S.logs[logKey] || { checks: {}, reps: {} };

  let html = `<div class="screen">` + roadmapTop({
    kicker: `Texas Method · Cycle ${w.label} · Week ${w.subweek}`,
    title:  DAY_NAMES[day].split(" · ")[0],
    sub:    DAY_NAMES[day].split(" · ")[1] + " day",
    mins:   estTexasMin(w.days[day]),
    rest:   false,
    art:    "🏋️",
    prevId: "prevDay", nextId: "nextDay"
  });

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
      if (log.checks[id] && !isSAProgram()) startRest();
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
  titleEl.textContent = 'Roadmap';
  subEl.textContent   = `${pLabel()} · Day ${dayNum} of ${ptotal()}`;

  let html = `<div class="screen">` + roadmapTop({
    kicker: `${pLabel()} · Day ${dayNum} of ${ptotal()}`,
    title:  d.title || `Day ${dayNum}`,
    sub:    [(x => x ? fmtPrepDate(x) : "")(prepDateFor(dayNum)),
             `${prepDaysComplete()}/${pWorkDays()} done`].filter(Boolean).join(" · "),
    mins:   d.rest ? 0 : estDayMin(d),
    rest:   !!d.rest,
    art:    d.rest ? "😴" : "💪",
    prevId: "prepPrev", prevDisabled: dayNum <= 1,
    nextId: "prepNext", nextDisabled: dayNum >= ptotal()
  });

  if (d.rest) {
    html += `<div class="card lift" style="text-align:center;padding:34px 16px;">
      <div style="font-size:42px;">😴</div>
      <div class="name" style="font-size:22px;margin-top:6px;">Rest Day</div>
      <div class="tiny muted" style="margin-top:6px;">Recover today — back at it tomorrow.</div>
    </div>
    <button class="btn primary" id="prepComplete">Next day ›</button>`;
  } else {
    const log = pstate().log[dayNum] || { checks: {} };
    if (d.note) html += `<details class="card note-fold"><summary>How this session works</summary><div class="note-body">${d.note}</div></details>`;
    html += `<div class="spacer"></div>`;
    for (const g of groupDayItems(prepDayItems(d))) html += groupCard(g, log);

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

/* ---------------------------------------------------------------------
   One card per exercise instead of one per set.

   Grouping is over CONSECUTIVE items only, which matters: prepDayItems()
   interleaves superset sets round-robin on purpose (squat s1 -> hinge s1 ->
   squat s2) so the superset runs as designed. Collapsing by exercise name
   would silently reorder that into straight sets and change the stimulus.
   Consecutive-only grouping folds ordinary straight sets into one card and
   leaves the interleaving untouched — and a whole superset run, which is
   consecutive by definition, becomes a single card with its rows in the
   programmed order.
   --------------------------------------------------------------------- */
function groupDayItems(items) {
  const groups = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.kind === 'ex' && last.ex === it.ex) { last.items.push(it); continue; }
    const ss = it.ex.ss;
    if (ss != null && last && last.kind === 'ss' && last.ss === ss) { last.items.push(it); continue; }
    /* an item starts a superset group only if the next one shares its ss */
    groups.push(ss != null ? { kind: 'ss', ss, items: [it] } : { kind: 'ex', ex: it.ex, items: [it] });
  }
  /* a "superset" of one exercise is just an exercise */
  return groups.map(g => {
    if (g.kind !== 'ss') return g;
    const names = new Set(g.items.map(i => i.ex));
    return names.size > 1 ? g : { kind: 'ex', ex: g.items[0].ex, items: g.items };
  });
}

/* one set row — the same markup the per-set cards used, so every checkbox id
   is unchanged and no logged set is orphaned */
function itemRow(item, log, showName) {
  const ex = item.ex, many = item.total > 1;
  const timed = ex.sec != null;
  const id = (timed || many) ? ex.key + '_' + item.setIndex : ex.key;
  const on = log.checks && log.checks[id] ? 'on' : '';
  const label = showName
    ? ex.name + ' ' + formBtn(ex.key)
    : (many ? 'Set ' + (item.setIndex + 1) + '/' + item.total : 'Target');

  if (timed) {
    return `<div class="set-row workset ${showName ? 'named ' : ''}${on ? 'done' : ''}">
      <div class="lbl">${label}</div>
      <button class="mini-start" data-hold="${ex.sec}" data-holdname="${ex.name}" data-holdcheck="${id}">▶ ${holdTxt(ex.sec).replace(' sec', 's')}</button>
      <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`;
  }

  const hint = saHint(ex.key);
  let row = hint
    ? `<div class="set-row workset ${showName ? 'named ' : ''}${on ? 'done' : ''}">
        <div class="lbl">${label}</div>
        <div class="wt">${fmt(hint.w)} <small>${hint.suffix}</small>${hint.type === 'bar' ? `<div class="plate-math">${plateStripHTML(hint.w)}</div>` : ''}</div>
        <div class="set-end"><div class="reps">${ex.reps} reps${ex.side ? '/side' : ''}</div>
        <button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`
    : `<div class="set-row workset ${showName ? 'named ' : ''}${on ? 'done' : ''}">
        <div class="lbl">${label}</div>
        <div class="wt">${ex.reps}<small> reps${ex.side ? '/side' : ''}</small></div>
        <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`;

  if (hasLoadProgression() && SA_PROGRESS.includes(ex.key) && many) {
    const rid = ex.key + '_' + item.setIndex;
    const cur = (log.reps && log.reps[rid] != null) ? log.reps[rid] : ex.reps;
    row += `<div class="log-row">
      <label>Reps hit</label>
      <div class="stepper">
        <button data-sarep="${rid}" data-d="-1">−</button>
        <div class="val" id="sarep_${rid}">${cur}</div>
        <button data-sarep="${rid}" data-d="1">+</button>
      </div>
      <span class="tiny muted">all sets ${ex.reps}+ → weight up</span>
    </div>`;
  }
  return row;
}

function groupCard(g, log) {
  if (g.kind === 'ss') {
    const names = [...new Set(g.items.map(i => i.ex.name))];
    const rounds = Math.max(...g.items.map(i => i.total));
    return `<div class="card lift">
      <div class="lift-head"><div><div class="name">${names.join(' + ')}</div>
      <div class="scheme">Superset · ${rounds} rounds · alternate with no rest between partners</div></div>
      <span class="badge vol">Superset</span></div>${g.items.map(i => itemRow(i, log, true)).join('')}</div>`;
  }
  const ex = g.ex, n = g.items.length;
  const timed = ex.sec != null;
  const base = ex.scheme || (timed ? holdTxt(ex.sec) + (ex.sec >= 90 ? '' : ' hold') : ex.reps + ' reps' + (ex.side ? ' each side' : ''));
  const hint = saHint(ex.key);
  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${ex.name} ${formBtn(ex.key)}</div>
    <div class="scheme">${n > 1 ? n + ' sets · ' : ''}${base}${hint ? ' · ' + hint.txt : ''}</div></div>
    <span class="badge vol">${timed ? (ex.sec >= 90 ? 'Timed' : 'Hold') : 'Sets'}</span></div>${g.items.map(i => itemRow(i, log, false)).join('')}</div>`;
}

function prepExerciseCard(ex, setIndex, total, log) {
  let rows = '';
  if (ex.sets && ex.sec != null) {
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
  /* reps exercise — one card per set */
  const many = total > 1;
  const hint = saHint(ex.key);
  const id = many ? `${ex.key}_${setIndex}` : ex.key;
  const on = log.checks && log.checks[id] ? 'on' : '';
  /* any weighted move (barbell, dumbbell, or hand weight): same layout as
     the Texas Method lift card — weight prominent, reps in the set-end,
     plate breakdown added for barbell only */
  rows = hint
    ? `<div class="set-row workset ${on ? 'done' : ''}">
        <div class="lbl">${many ? `Set ${setIndex + 1}/${total}` : 'Target'}</div>
        <div class="wt">${fmt(hint.w)} <small>${hint.suffix}</small>${hint.type === 'bar' ? `<div class="plate-math">${plateStripHTML(hint.w)}</div>` : ''}</div>
        <div class="set-end"><div class="reps">${ex.reps} reps${ex.side ? '/side' : ''}</div>
        <button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`
    : `<div class="set-row workset ${on ? 'done' : ''}">
        <div class="lbl">${many ? `Set ${setIndex + 1}/${total}` : 'Target'}</div>
        <div class="wt">${ex.reps}<small> reps${ex.side ? '/side' : ''}</small></div>
        <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`;
  if (isSAProgram() && SA_PROGRESS.includes(ex.key) && many) {
    const rid = `${ex.key}_${setIndex}`;
    const cur = (log.reps && log.reps[rid] != null) ? log.reps[rid] : ex.reps;
    rows += `<div class="log-row">
      <label>Reps hit</label>
      <div class="stepper">
        <button data-sarep="${rid}" data-d="-1">−</button>
        <div class="val" id="sarep_${rid}">${cur}</div>
        <button data-sarep="${rid}" data-d="1">+</button>
      </div>
      <span class="tiny muted">all sets ${ex.reps}+ → weight up</span>
    </div>`;
  }
  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${ex.name} ${formBtn(ex.key)}</div>
    <div class="scheme">${many ? `Set ${setIndex + 1} of ${total} · ` : ''}${ex.scheme || `${ex.reps} reps${ex.side ? ' each side' : ''}`}</div></div>
    <span class="badge vol">${many || ex.scheme ? 'Sets' : 'Reps'}</span></div>${rows}</div>`;
}

/* ordered items for a day. In the 30-Day Prep the multi-set plank is
   spread between the other exercises; elsewhere multi-set holds simply
   expand into one item per set, in place. */
function exItems(ex) {
  const total = ex.sets || 1;
  const type = ex.sec != null ? 'plank' : 'reps';
  const out = [];
  for (let i = 0; i < total; i++) out.push({ type, ex, setIndex: i, total });
  return out;
}
function prepDayItems(d) {
  const spread = S.program === 'prep30' && d.exercises.find(e => e.sets && e.sets > 1);
  if (!spread) {
    /* exercises sharing an `ss` (superset group) interleave their sets
       round-robin — squat s1, hinge s1, squat s2… — so the workout runs
       the superset the way it's meant to be performed */
    const items = [];
    const E = d.exercises;
    let i = 0;
    while (i < E.length) {
      const g = E[i].ss;
      let j = i + 1;
      if (g != null && E[i].sets > 1) {
        while (j < E.length && E[j].ss === g && E[j].sets > 1) j++;
      }
      if (g != null && j - i >= 2) {
        const group = E.slice(i, j);
        const rounds = Math.max(...group.map(e => e.sets));
        for (let s = 0; s < rounds; s++)
          group.forEach(e => { if (s < e.sets) items.push({ type: e.sec != null ? 'plank' : 'reps', ex: e, setIndex: s, total: e.sets }); });
      } else {
        items.push(...exItems(E[i]));
        j = i + 1;
      }
      i = j;
    }
    return items;
  }
  const others = d.exercises.filter(e => e !== spread);
  const items = [];
  let pi = 0;
  others.forEach(ex => {
    items.push(...exItems(ex));
    if (pi < spread.sets) { items.push({ type: 'plank', ex: spread, setIndex: pi, total: spread.sets }); pi++; }
  });
  while (pi < spread.sets) { items.push({ type: 'plank', ex: spread, setIndex: pi, total: spread.sets }); pi++; }
  return items;
}

/* SuperAge weight hints: % of estimated 1RM from the Setup lifts,
   tuned for 8-12 reps with 2-3 in reserve. Barbell weights snap to
   the user's plates; dumbbell/hand weights round to 5s. */
const SA_WEIGHT = {
  sabench:     { src: 'bench',    pct: 0.70, type: 'bar' },
  deadlift:    { src: 'deadlift', pct: 0.70, type: 'bar' },
  sardl:       { src: 'deadlift', pct: 0.55, type: 'bar' },
  sarow:       { src: 'bench',    pct: 0.65, type: 'bar' },
  gobletsquat: { src: 'squat',    pct: 0.30, type: 'db' },
  dblunge:     { src: 'squat',    pct: 0.15, type: 'hand' },
  sidelunge:   { src: 'squat',    pct: 0.15, type: 'hand' },
  carry:       { src: 'deadlift', pct: 0.25, type: 'hand' },
  suitcase:    { src: 'deadlift', pct: 0.25, type: 'hand' },
  rackhold:    { src: 'squat',    pct: 0.30, type: 'db' },
  ohhold:      { src: 'press',    pct: 0.40, type: 'hand' },

  /* Dumbbell A/B — it had no progression at all before: the same two sessions
     at the same reps for 24 days. Anchored off the Setup lifts like the rest. */
  dbpress:     { src: 'bench',    pct: 0.35, type: 'hand' },
  dbrow:       { src: 'bench',    pct: 0.35, type: 'hand' },
  dbrdl:       { src: 'deadlift', pct: 0.30, type: 'hand' },
  dbohp:       { src: 'press',    pct: 0.35, type: 'hand' },
  dbcurl:      { src: 'press',    pct: 0.20, type: 'hand' },
  dbrenrow:    { src: 'bench',    pct: 0.30, type: 'hand' },
  dbhinge:     { src: 'deadlift', pct: 0.35, type: 'hand' },
  dblatraise:  { src: 'press',    pct: 0.12, type: 'hand' },
  dbhammer:    { src: 'press',    pct: 0.20, type: 'hand' },
  dbwindmill:  { src: 'press',    pct: 0.15, type: 'hand' },

  /* Fingerprint Focus loaded movements */
  stepup:      { src: 'squat',    pct: 0.15, type: 'hand' },
  farmcarry:   { src: 'deadlift', pct: 0.30, type: 'hand' },

  /* movements added to broaden the Fingerprint Focus pools */
  frontsquat:     { src: 'squat',    pct: 0.55, type: 'bar' },
  trapdeadlift:   { src: 'deadlift', pct: 0.70, type: 'bar' },
  walkinglunge:   { src: 'squat',    pct: 0.20, type: 'hand' },
  pushpress:      { src: 'press',    pct: 0.45, type: 'hand' },
  sadbpress:      { src: 'press',    pct: 0.30, type: 'hand' },
  kbswing:        { src: 'deadlift', pct: 0.25, type: 'db' },
  splitsquatecc:  { src: 'squat',    pct: 0.15, type: 'hand' },
  woodchop:       { src: 'press',    pct: 0.20, type: 'db' },
  frontrackcarry: { src: 'squat',    pct: 0.25, type: 'db' },
  trapcarry:      { src: 'deadlift', pct: 0.35, type: 'hand' },
  marchcarry:     { src: 'deadlift', pct: 0.25, type: 'hand' },
  carryintervals: { src: 'deadlift', pct: 0.25, type: 'hand' }
};
function isSAProgram() { return S.program === 'sa2' || S.program === 'sa4' || S.program === 'sahyb'; }
/* Which programmes run the reps-hit double progression. Texas has its own
   linear scheme in generateProgram(); the bodyweight plans progress by volume
   inside their own arrays. These are the ones that carry a load and need a
   rule for when it goes up. */
function hasLoadProgression() {
  return isSAProgram() || S.program === 'dumbbell' || S.program === 'fpfocus';
}
function saEstimate(m) {
  const L = S.settings.lifts[m.src]; if (!L || !L.weight) return null;
  const est = oneRM(L.weight, L.reps) * m.pct;
  return m.type === 'bar' ? snapWeight(est, bar(), getPlates()) : Math.max(5, round(est, 5));
}
function saHint(key) {
  if (!hasLoadProgression()) return null;
  const m = SA_WEIGHT[key]; if (!m) return null;
  const stored = S.saWeights && S.saWeights[key] != null;
  const w = stored ? S.saWeights[key] : saEstimate(m);
  if (w == null) return null;
  const suffix = m.type === 'bar' ? unit() : m.type === 'db' ? `${unit()} DB/KB` : `${unit()} / hand`;
  return { w, type: m.type, suffix, txt: `${fmt(w)} ${suffix}` };
}
/* rep-based lifts that auto-progress: hit the target reps on the hardest
   set and the weight goes up next session; miss it and it holds. */
const SA_PROGRESS = [
  'gobletsquat', 'dblunge', 'sidelunge', 'sabench', 'sarow', 'sardl', 'deadlift',
  /* dumbbell programme */
  'dbpress', 'dbrow', 'dbrdl', 'dbohp', 'dbcurl', 'dbrenrow', 'dbhinge',
  'dblatraise', 'dbhammer', 'dbwindmill',
  /* fingerprint focus */
  'stepup', 'farmcarry',
  'frontsquat', 'trapdeadlift', 'walkinglunge', 'pushpress', 'sadbpress',
  'kbswing', 'splitsquatecc', 'woodchop'
];
function saApplyProgression(d, log) {
  if (!hasLoadProgression() || !d || d.rest || log.progressed) return [];
  if (!S.saWeights) S.saWeights = {};
  const msgs = [], seen = new Set();
  d.exercises.forEach(ex => {
    if (seen.has(ex.key) || !SA_PROGRESS.includes(ex.key) || !(ex.sets > 1)) return;
    seen.add(ex.key);
    const m = SA_WEIGHT[ex.key];
    const cur = S.saWeights[ex.key] != null ? S.saWeights[ex.key] : saEstimate(m);
    if (cur == null) return;
    let met = true;
    for (let i = 0; i < ex.sets; i++) {
      const v = log.reps && log.reps[`${ex.key}_${i}`];
      const hit = v != null ? v : (log.reps && log.reps[ex.key] != null ? log.reps[ex.key] : ex.reps);
      if (hit < ex.reps) { met = false; break; }
    }
    const inc = S.settings.units === 'lb' ? 5 : 2.5;
    let next = cur;
    if (met) {
      next = m.type === 'bar' ? snapWeight(cur + inc, bar(), getPlates()) : cur + inc;
      if (next <= cur) next = cur + inc;
      msgs.push(`${ex.name} +${fmt(next - cur)} ${unit()} next time 💪`);
    } else {
      msgs.push(`${ex.name} holds at ${fmt(cur)} ${unit()} — hit ${ex.reps}+ to move up`);
    }
    S.saWeights[ex.key] = next;
  });
  log.progressed = true;
  return msgs;
}

/* duration label for timed work: seconds for holds, m:ss for cardio blocks */
function holdTxt(sec) { return sec >= 90 ? fmtClock(sec) : `${sec} sec`; }

/* a single plank set as its own card */
function plankSetCard(ex, i, total, log) {
  const id = `${ex.key}_${i}`;
  const on = log.checks && log.checks[id] ? 'on' : '';
  const setLbl = total > 1 ? `Set ${i + 1} of ${total} · ` : '';
  const hint = saHint(ex.key);
  const scheme = (ex.scheme
    ? `${setLbl}${holdTxt(ex.sec)} · ${ex.scheme}`
    : `${setLbl}${holdTxt(ex.sec)}${ex.sec >= 90 ? '' : ' hold'}${ex.side ? ' · each side' : ''}`) + (hint ? ` · ${hint.txt}` : '');
  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${ex.name} ${formBtn(ex.key)}</div>
    <div class="scheme">${scheme}</div></div>
    <span class="badge vol">${ex.sec >= 90 ? 'Timed' : 'Hold'}</span></div>
    <div class="set-row workset ${on ? 'done' : ''}">
      <div class="lbl">${ex.sec >= 90 ? '⏱' : '🧘'} ${ex.side ? 'Each side' : ex.sec >= 90 ? 'Timed' : 'Hold'}</div>
      <button class="mini-start" data-hold="${ex.sec}" data-holdname="${ex.name}" data-holdcheck="${id}">▶ Start · ${holdTxt(ex.sec).replace(' sec', 's')}</button>
      <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div>
    </div></div>`;
}

function wirePrepToday() {
  const dayNum = pstate().day;
  if (!pstate().log[dayNum]) pstate().log[dayNum] = { checks: {} };
  const log = pstate().log[dayNum];
  if (!log.checks) log.checks = {};

  if (!log.reps) log.reps = {};
  view.querySelectorAll('[data-sarep]').forEach(btn => {
    btn.onclick = () => {
      const rid = btn.dataset.sarep, d = +btn.dataset.d;
      const k = rid.slice(0, rid.lastIndexOf('_'));
      const ex = pdata()[dayNum - 1].exercises.find(e => e.key === k);
      let v = (log.reps[rid] != null ? log.reps[rid] : (ex ? ex.reps : 10)) + d;
      v = Math.max(0, Math.min(30, v));
      log.reps[rid] = v;
      const el = document.getElementById('sarep_' + rid);
      if (el) el.textContent = v;
      save();
    };
  });
  view.querySelectorAll('[data-pcheck]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.pcheck;
      log.checks[id] = !log.checks[id];
      btn.classList.toggle('on', log.checks[id]);
      btn.closest('.set-row').classList.toggle('done', log.checks[id]);
      save();
      if (log.checks[id] && !isSAProgram()) startRest();
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
    let progMsgs = [];
    if (!d.rest) { log.done = true; S.sessions = (S.sessions || 0) + 1; progMsgs = saApplyProgression(d, log); }
    save();
    if (dayNum >= ptotal()) { finishPrep(); return; }
    if (d.rest) { toast('Rested 😴'); }
    else { celebrateWorkout(progMsgs); }
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
  titleEl.textContent = 'Protocols';
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
        `<div class="prep-ex">${ex.sec != null ? `${ex.name} ${ex.sets > 1 ? ex.sets + '×' : ''}${holdTxt(ex.sec).replace(' sec', 's')}` : `${ex.name} ${ex.sets > 1 ? ex.sets + '×' : ''}${ex.reps}`}</div>`
      ).join('');
    }
    const when = prepDateFor(n);
    const meta = [when ? fmtPrepDate(when) : '', d.rest ? '' : `≈${estDayMin(d)} min`].filter(Boolean).join(' · ');
    cells += `<div class="prep-cell ${cur} ${rest} ${done}" data-prepday="${n}">
      <div class="prep-num">${n}${done ? ' <span class="prep-tick">✓</span>' : ''}</div>
      ${meta ? `<div class="tiny muted" style="font-size:9px;margin:1px 0 3px;">${meta}</div>` : ''}
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
  titleEl.textContent = 'Protocols';
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
  slstance: { title: 'Single-Leg Stance', body: 'Stand on one leg, other foot clear of the floor and not resting against the standing leg. Arms folded across the chest. Close the eyes to make it a real test of proprioception rather than vision. Stand near a counter you can grab but do not lean on. Both sides.' },
  slrdl: { title: 'Single-Leg RDL', body: 'Stand on one leg with a soft knee. Hinge at the hip, letting the free leg extend straight behind you as your torso lowers, until body and rear leg form one line. Keep the hips square to the floor. Drive the standing heel down to return. Slow and controlled — the wobble is the training effect.' },
  tandem: { title: 'Tandem Walk', body: 'Walk a straight line placing each heel directly in front of the opposite toe, like a tightrope. Arms folded, eyes forward rather than down. Short deliberate steps; if you wobble, pause and rebalance rather than rushing through it.' },
  broadjump: { title: 'Standing Broad Jump', body: 'Feet hip-width behind a line. Full countermovement — bend the knees, swing the arms back, then drive them forward and jump for distance. Land on both feet with knees bent and absorb it quietly. Reset fully between reps; this is a max-effort movement, not a conditioning one.' },
  stepup: { title: 'Weighted Step-Up', body: 'Dumbbell in each hand, one foot flat on a box at about knee height. Drive through that heel to stand fully upright, letting the trailing leg do as little as possible. Lower under control — do not drop. The height matters more than the weight; if you cannot control the descent, use a lower box.' },
  deadhang: { title: 'Dead Hang', body: 'Overhand grip a little wider than the shoulders, arms straight, feet clear of the floor. Keep the shoulders active — pulled slightly down away from the ears — rather than hanging fully slack. No straps; straps turn this into a shoulder exercise. Stop when the grip goes, not before.' },
  towelhang: { title: 'Towel Hang', body: 'Drape a towel over the bar and grip an end in each hand. Same rules as a dead hang: straight arms, active shoulders, feet clear. The thicker, less forgiving grip makes this far harder than a bar hang, so expect a fraction of the time.' },
  farmcarry: { title: 'Farmer Carry', body: 'A heavy weight in each hand, shoulders back, ribs stacked over the hips. Walk in short even steps without letting the weights swing or the torso list to one side. Breathe normally. Set them down by hinging, not stooping. Stop when posture fails, not when the hands hurt.' },
  intervals: { title: '4x4 Intervals', body: 'Four minutes hard, three minutes easy, four rounds. Hard means roughly eight out of ten — breathing heavily, only a few words at a time, but a pace you could hold for the full four minutes. If the fourth interval matches the first, you paced it correctly. Warm up ten minutes first.' },
  jumprope: { title: 'Jump Rope', body: 'Small quiet bounces from the ankles, elbows close to the body, wrists turning the rope. Stay on the balls of the feet and barely leave the floor. If you are landing hard you are jumping far too high. Mistakes are fine — pick it straight back up.' },
  brisk: { title: 'Brisk Walk', body: 'Fast enough that holding a conversation takes noticeable effort, but not so fast that it becomes a jog. Tall posture, arms swinging naturally. Unglamorous and effective — the aerobic base only cares about consistency.' },
  sidestep: { title: 'Banded Side-Steps', body: 'Loop a band just above the knees and sink into a quarter squat. Step sideways keeping constant tension on the band, knees pushed out and toes forward. Do not let the trailing foot snap in. Ten steps one way, ten back.' },
  carioca: { title: 'Carioca', body: 'Moving sideways, cross one foot in front of the other, then behind, alternating in a grapevine pattern. Stay light on the balls of the feet and let the hips rotate freely. Start slowly — the coordination is the point, speed comes later. Both directions.' },
  shuffle: { title: 'Lateral Shuffle', body: 'Athletic stance, hips low, chest up. Push off the outside foot to move sideways without letting the feet click together. Five metres out, decelerate under control, and shuffle back. The stopping is as much of the exercise as the moving.' },
  lunge: { title: 'Reverse Lunge', body: 'Step one foot back and lower until both knees reach roughly ninety degrees, front heel planted, torso tall. Drive through the front heel to stand. Stepping backwards rather than forwards is easier on the knees. Complete the reps on one side, then switch.' },
  birddog: { title: 'Bird Dog', body: 'On hands and knees, wrists under shoulders, knees under hips. Reach one arm forward and the opposite leg back until both are level with your spine — no higher. Keep your hips square to the floor; if they rotate you have gone too far. Pause, return under control, then switch. Slow beats long reach.' },
  slrdlreach: { title: 'Single-Leg RDL Reach', body: 'Stand on one leg, soft knee. Hinge at the hip and reach the opposite hand toward the floor while the free leg extends behind you, body forming a straight line. Reach only as far as you can without the hips opening. Drive the standing heel down to return. The wobble is the point — do not fight it, control it.' },
  crosscrawl: { title: 'Cross Crawl March', body: 'Stand tall and march in place, bringing the opposite elbow toward the lifted knee. Keep it slow and deliberate rather than bouncy — the coordination between opposite limbs is what is being trained, not the heart rate. Stay tall through the spine throughout.' },
  pushuptap: { title: 'Push-Up Shoulder Tap', body: 'Start in a high plank, hands under shoulders, feet a little wider than usual for stability. Perform a push-up, then at the top tap one hand to the opposite shoulder. Keep the hips completely still — any rocking means the feet need to be wider or the reps need to be slower.' },
  boxjump: { title: 'Box Jump', body: 'Stand a short step from a stable box. Dip, swing the arms and jump, landing soft and quiet with hips back and knees tracking over the toes. Stand fully upright on the box, then STEP down — never jump down. Quality over height; if the landing is loud, the box is too tall.' },
  frontsquat: { title: 'Barbell Front Squat', body: 'Bar rests on the front delts with elbows high — the hands only stop it rolling. Big breath, brace, then sit straight down keeping the elbows up and the torso vertical. If the elbows drop the bar follows. Drive up through the whole foot. Lighter than a back squat by design.' },
  pushpress: { title: 'Dumbbell Push Press', body: 'Dumbbells at the shoulders, feet hip-width. Dip a few inches by bending the knees, then drive hard through the legs and let that momentum carry the weight overhead, finishing with the arms locked. The legs start it, the shoulders finish it. Lower under control to the shoulders.' },
  airsquattempo: { title: 'Air Squat (3-2-1 tempo)', body: 'Bodyweight squat with the clock doing the work: three seconds down, two seconds paused at the bottom, one second up. Heels stay down, chest tall. The pause is where this earns its keep — no bouncing out of the hole.' },
  splitsquatecc: { title: 'Split Squat (3-sec eccentric)', body: 'Split stance, torso tall. Take three full seconds lowering the back knee toward the floor, then drive up at normal speed. Front heel stays planted throughout. The slow lowering is the entire exercise; rushing it wastes the set.' },
  kbswing: { title: 'Light Kettlebell Swing', body: 'Hinge at the hips, not the knees — the bell travels back between the legs like a rugby pass. Snap the hips forward hard and let the bell float to chest height; the arms are ropes, not levers. Squeeze the glutes at the top, stay braced. This is a hinge, not a squat, and not a front raise.' },
  frontrackcarry: { title: 'Front Rack Carry', body: 'Hold a dumbbell or kettlebell at each shoulder, elbows up, ribs down. Walk with short controlled steps and normal breathing. The front load will try to pull you into extension — resist it by keeping the ribs stacked over the hips. Stop when posture goes, not when the arms tire.' },
  marchcarry: { title: 'March Carry', body: 'Carry a weight in each hand and march on the spot, driving each knee to hip height. Torso stays absolutely upright and the weights must not swing. Slow, tall and deliberate; this is a core exercise disguised as a carry.' },
  trapcarry: { title: 'Trap Bar Carry', body: 'Load a trap bar, stand inside it, brace and stand up with a flat back. Walk in short even steps with the bar hanging at arm’s length, shoulders back, eyes forward. Set it down the way you picked it up — hinge, do not stoop.' },
  carryintervals: { title: 'Carry Intervals', body: 'Alternate a loaded carry with a short rest, repeatedly. Pick a weight you could hold comfortably for twice the interval, because the last round is the one that counts. Posture is the stop signal: when the shoulders round or the ribs flare, the set is over.' },
  walkinglunge: { title: 'Walking Lunge', body: 'Step forward into a lunge until both knees reach about ninety degrees, front heel planted, torso tall. Drive through the front heel to bring the back foot through into the next step. Long steps load the glutes, short steps load the quads. Keep the path straight.' },
  plankdrag: { title: 'Plank Drag', body: 'High plank with a towel or light weight beside one hand. Reach under your body with the opposite hand, drag it across to the other side, then repeat back. Feet wide for stability. The hips must not rotate — if they do, slow down or widen the feet.' },
  trapdeadlift: { title: 'Trap Bar Deadlift', body: 'Stand inside the bar, feet hip-width, handles beside your mid-foot. Hinge down, flat back, chest proud, take the slack out, then push the floor away and stand tall. More forgiving on the lower back than a straight bar because the load sits in line with you. Lock out hips and knees together.' },
  bike: { title: 'Bike', body: 'Steady seated effort at a pace you could hold a conversation through — that is the whole target for zone 2 work. Cadence around eighty to ninety, resistance high enough that your legs are working but your breathing stays conversational. If you cannot speak a full sentence, ease off.' },
  briskmarch: { title: 'Brisk March', body: 'Walk fast enough that talking becomes slightly effortful but not impossible. Arms swinging, posture tall. This is deliberately unglamorous: the aerobic base does not care how it is built, only that it is built consistently.' },
  inclinewalk: { title: 'Incline Treadmill Walk', body: 'Raise the incline rather than the speed. Walk tall without hanging onto the handrails — holding on removes most of the work. Aim for a gradient that makes conversation slightly effortful and hold it steady.' },
  shadowbox: { title: 'Shadow Boxing', body: 'Light on the feet, hands up, throw relaxed combinations while moving in every direction. Keep the shoulders loose and breathe out on each strike. This is coordination and footwork under fatigue, not a punching contest — speed over force.' },
  declinepushup: { title: 'Decline Push-Up', body: 'Feet elevated on a box or step, hands under the shoulders, body in one straight line. Lower until the chest is just above the floor, elbows about forty-five degrees from the body, then press up. Raising the feet shifts load onto the shoulders and upper chest — go higher only when the hips stay level.' },
  sadbpress: { title: 'Single-Arm Dumbbell Press', body: 'One dumbbell at the shoulder, feet hip-width, glutes and abs braced. Press straight overhead without letting the torso lean away from the weight. The anti-rotation demand is the point of doing it one side at a time; if you are leaning, go lighter.' },
  woodchop: { title: 'Dumbbell Wood Chopper', body: 'Hold one dumbbell in both hands. Start high on one side and drive it diagonally down across the body toward the opposite hip, pivoting the back foot and rotating through the trunk rather than the lower back. Control it back to the start. Rotate from the ribs, not the spine.' },
  glutestep: { title: 'Glute Step Down', body: 'Stand on a step or low box on one leg, toes pointing forward. Push your hips back and bend the standing knee to lower the other heel slowly toward the floor — tap it lightly, do not land on it — then drive back up through the standing heel. The knee tracks over the toes, hips stay level. Slow on the way down is the whole exercise; if you drop fast you have skipped the part that works. Do all reps one side, then switch.' },
  gobletsquat:{ title: 'Goblet Squat', body: 'Hold one dumbbell (or your kettlebell by the horns) vertically against your chest. Feet shoulder-width, sit hips down between your knees keeping your chest tall and heels down. Drive up through your whole foot. The dumbbell at your chest helps you stay upright.' },
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
  dbwindmill:{ title: 'DB Windmill', body: 'Press one dumbbell overhead and keep it locked out, eyes on it the whole time. Turn your feet out ~45° away from the weight. Push your hips toward the raised arm and hinge sideways, sliding your free hand down your front leg toward the floor while the top arm stays vertical. Stand back up with control. Builds shoulder stability, core and hip mobility. Do all reps, then switch sides. Start light.' },
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
  invhold:   { title: 'Inversion Hold', body: 'On your back, roll your hips up and over so your weight is on your upper back/shoulders with your hips stacked above (support your back with your hands if needed). Hold and breathe — builds the spinal/hip mobility for inverting in guard. Ease into it; protect your neck.' },
  deadbug:   { title: 'Dead Bug', body: 'Lie on your back, arms pointing at the ceiling, knees bent 90\u00b0 over your hips. Press your lower back into the floor, then slowly lower one arm overhead and the opposite leg toward the floor, return, and switch sides. Go slow \u2014 the whole exercise is keeping your lower back glued down while your limbs move. Each arm-and-leg pair is one rep per side.' },
  suitcase:  { title: 'Suitcase Hold & March', body: 'Hold one heavy dumbbell (or your kettlebell) at your side like a suitcase, the other hand free. Stand tall and refuse to lean — that fight is the exercise. Hold, or march in place with slow knee lifts, then switch hands. Do the time on each side.' },
  rackhold:  { title: 'Front-Rack / Goblet Hold', body: 'Hold one dumbbell at your chest goblet-style, or two dumbbells racked at your shoulders. Ribs down, elbows in, breathing steadily behind the brace. Hold or march in place. The weight in front makes your whole trunk work to stay tall.' },
  ohhold:    { title: 'Overhead Hold & March', body: 'Press one dumbbell overhead and lock the elbow — biceps by your ear, ribs down, eyes forward. Hold, or march in place, keeping the weight stacked straight over your shoulder. Start light; switch arms and do the time on each side.' },
  wucardio:  { title: 'Jump Rope / Brisk Walk', body: '2 minutes easy — rope, brisk walking, or marching in place. Just enough to raise your heart rate and warm your muscles; this is not a workout yet.' },
  wuarm:     { title: 'Arm Circles', body: 'Stand tall, arms out to the sides. Draw big, slow circles from the shoulders — 10 forward, then 10 backward, letting them grow bigger. Loosens the shoulders before pressing and pulling.' },
  wuhip:     { title: 'Hip Circles', body: 'Hands on hips, feet shoulder-width. Circle your hips wide and slow — 10 one way, 10 the other, like stirring a big pot. Frees the hips before squats and hinges.' },
  wuleg:     { title: 'Leg Swings', body: 'Hold a wall or rack for balance. Swing one leg front-to-back like a relaxed pendulum, a little higher each swing — 10 per leg. Hips tight? Add 10 side-to-side swings per leg too.' },
  wuankle:   { title: 'Ankle Rolls', body: 'Standing on one foot (or seated), roll each ankle through big slow circles — 10 each direction per side. Ankles are the base for squats, jumps and jump rope.' },
  wuband:    { title: 'Banded Side-Steps', body: 'Loop the band just above your knees and sink into a quarter squat. Step sideways keeping tension on the band the whole time — 10 steps one way, 10 back. Knees pushed out, toes forward. Wakes up the glutes; this is the article\'s lateral shuffle work.' },
  ridewarm:  { title: 'Easy Ride Warm-Up', body: 'Start your VO\u2082 max ride with 10 minutes in an easy gear, gradually building to a moderate effort so your legs and heart are ready for the first hard interval. Don\'t skip this — intervals on cold legs feel awful and produce less.' },
  hops:      { title: 'Jump Rope', body: 'Quick, light two-footed skips — stay on the balls of your feet, elbows in, turning the rope from the wrists. Smooth and springy beats high and hard. Explosive work where your body leaves the ground keeps power and bone density as you age. Trip a lot? Just keep going — restarts count.' },
  sabench:   { title: 'Bench Press', body: 'On your bench with a barbell or dumbbells. Pinch your shoulder blades together, slight arch, feet planted. Lower to your mid-chest with elbows about 45\u201375\u00b0 from your body, touch, then press up over your shoulders. No spotter with a barbell? Stay 2\u20133 reps shy of failure (as programmed) or use dumbbells.' },
  sarow:     { title: 'Bent-Over Row', body: 'Barbell or dumbbells. Hinge at the hips with a flat back, let the weight hang, then pull it to your waistline \u2014 drive your elbows back and squeeze your shoulder blades. Lower under control, torso still. No heaving.' },
  sardl:     { title: 'Romanian Deadlift', body: 'Barbell or dumbbells in front of your thighs, soft knees. Push your hips back and slide the weight down your legs until you feel a hamstring stretch \u2014 flat back the whole way \u2014 then drive your hips forward to stand tall. Hinge, don\u2019t squat.' },
  scissorlunge: { title: 'Scissor Lunges', body: 'From a lunge position, jump and switch legs in the air, landing softly in a lunge with the other foot forward \u2014 like scissors. Stay tall, arms driving for rhythm. Each switch is a rep per side. Low-impact option: fast alternating reverse lunges with no jump.' },
  latpull:   { title: 'Pull-Ups', body: 'From a dead hang on your bar, pull your chest toward the bar leading with your elbows, chin over the bar, then lower all the way under control. Full range each rep, no swinging. Too hard for 8 reps? Switch to an underhand chin-up grip, or do slow negatives \u2014 jump or step up to the top and lower for a 3\u20135 second count.' },
  sidelunge: { title: 'Lateral Lunge', body: 'Step wide to one side, sit your hips back and bend that knee while the other leg stays straight, chest tall and heels down. Push off to return to standing. Hold a dumbbell at your chest to load it. Side-to-side strength keeps you agile and balanced as you age.' },
  carry:     { title: "Farmer's Hold & March", body: 'The no-space version of the farmer\'s carry. Grab heavy dumbbells — or go suitcase-style with your kettlebell in one hand (switch hands halfway) — and stand tall: shoulders back, ribs down. Hold for the full time, or march in place with slow, controlled knee lifts. Don\'t let the weight pull you into a lean. Same endurance under load, grip, core and posture work — zero floor space needed.' },
  sideplank: { title: 'Side Plank', body: 'Lie on your side, elbow under your shoulder, and lift your hips so your body forms one straight line from head to feet. Brace and breathe. Easier: keep your bottom knee on the floor. Do the time on each side.' },
  zone2:     { title: 'Zone 2 Ride', body: 'A steady road ride at a pace where you can still talk in full sentences but singing would be hard (roughly 60–70% of your max heart rate). Pick a flat-ish route or spin an easy gear at a comfortable cadence (~85–95 rpm); soft-pedal the downhills and ease off on climbs to stay in zone. If you\'re gasping, shift down: it should feel almost too easy. This builds the aerobic base most strongly tied to longevity.' },
  vo2max:    { title: 'VO₂ Max Hard Interval', body: 'Ride 4 minutes at an 8/10 effort — the fastest pace you could hold for the whole interval. Breathing hard, only a few words at a time; by the last minute it should feel genuinely tough. Stay seated and smooth rather than sprinting — a steady climb or a stretch of open road works well. Once a week is plenty; VO₂ max is one of the strongest predictors of a long healthy life.' },
  vo2rec:    { title: 'Easy Recovery', body: 'Shift to an easy gear and keep the legs turning — soft, light pedaling, no hard efforts. Let your breathing and heart rate settle; you should be able to talk again by the end of the 3 minutes. The recovery is what makes the next interval good — don\'t ride it hard.' }
};
/* the VO₂ ride day uses per-interval keys — share the interval/recovery tips */
['vo2i1', 'vo2i2', 'vo2i3', 'vo2i4'].forEach(k => { FORM_TIPS[k] = FORM_TIPS.vo2max; });
['vo2r1', 'vo2r2', 'vo2r3'].forEach(k => { FORM_TIPS[k] = FORM_TIPS.vo2rec; });
/* ---------------------------------------------------------------------
   Demo video per exercise.

   No video IDs are shipped. Guessing YouTube IDs for ~60 exercises would mean
   fabricating them, and a wrong ID silently teaches the wrong movement — worse
   than no video at all. Instead you attach one once per exercise (paste any
   YouTube link) and it plays inline from then on, keyed to the exercise and
   kept in localStorage. The search link stays as the way to go find one.
   --------------------------------------------------------------------- */
/* Demo videos shipped with the app. Every id here was checked against
   YouTube's oEmbed endpoint and the returned title recorded, so none of these
   is a guess — a wrong id would silently teach the wrong movement. Coverage is
   the compound lifts plus the movements that matter most here; everything else
   still falls back to the pin-your-own field. */
const FORM_VIDEOS = {
  squat:       'SbgHegC6lEs',   // How to Back Squat |#AskSquatU Show Ep. 10| — Squat University
  bench:       'A9MM-XkoWcw',   // How to: Barbell Bench Press – Proper Form Tutorial — BarbarianBody
  deadlift:    'XxWcirHIwVo',   // How to PROPERLY Deadlift for Growth — Jeremy Ethier
  press:       'eNFXEEdfQp4',   // How To Press (Overhead…) — Alan Thrall, Untamed Strength
  clean:       'lI35socHJ4k',   // How To Power Clean: Step by Step Beginner's Tutorial — Barbell Logic
  gobletsquat: '6mf0oa2GGUc',   // Goblet Squat Tutorial - Proper Form and Technique — Runna
  plank:       'zDjiVB-8kOs',   // The Proper form for the Plank & Side Plank — Gaston Webbe Fitness
  glutestep:   '3sRrVvxwaUw',   // How to Perform Step Downs | Glute Exercise Tutorial — Buff Dudes
  pushups:     'WDIpL0pjun0',   // How to do a Push-Up | Proper Form & Technique — NASM
  dbpushup:    'WDIpL0pjun0',   // same movement
  chin:        'e1YSApl-QcM',   // PERFECT CHIN-UPS | The Only Chin-up Tutorial You'll Ever Need — Simonster Strength
  burpees:     'qLBImHhCXSw',   // How To Do A Burpee | The Right Way — Well+Good
  atgsplit:    'bHoCPnoHVLk',   // How To ATG Split Squat: In Depth Tutorial — Gymless Fitness
  carry:       'lLAw6fUccKA',   // Farmer's Carry Tutorial - Proper Form and Technique — Runna
  suitcase:    'lLAw6fUccKA'    // same carry mechanics, one side loaded
};
/* a pinned video always beats the bundled one */
function videoFor(key) { return loadVideos()[key] || FORM_VIDEOS[key] || null; }
function isPinned(key) { return !!loadVideos()[key]; }

const VID_KEY = 'tm_videos';
function loadVideos() {
  try { return JSON.parse(localStorage.getItem(VID_KEY)) || {}; } catch { return {}; }
}
function saveVideo(key, id) {
  const v = loadVideos();
  if (id) v[key] = id; else delete v[key];
  try { localStorage.setItem(VID_KEY, JSON.stringify(v)); } catch {}
}
/* accepts a full watch URL, a youtu.be link, an embed URL, or a bare id */
function parseYouTubeId(raw) {
  if (!raw) return null;
  const t = raw.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

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
  const vid = videoFor(key);
  const pinned = isPinned(key);
  const player = vid
    ? `<div class="tip-video">
         <iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="${info.title} demo"
           allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
       </div>
       ${pinned
         ? `<button class="tip-vid-clear" data-vidclear="${key}">Use the built-in demo instead</button>`
         : `<details class="tip-vid-swap"><summary>Pin a different video</summary>
              <div class="tip-vid-add">
                <input type="url" class="tip-vid-input" data-vidfor="${key}" placeholder="Paste a YouTube link" />
                <button class="btn primary small" data-vidsave="${key}">Pin</button>
              </div></details>`}`
    : `<div class="tip-vid-add">
         <input type="url" class="tip-vid-input" data-vidfor="${key}" placeholder="Paste a YouTube link to pin a demo here" />
         <button class="btn primary small" data-vidsave="${key}">Pin</button>
       </div>`;
  const swap = equipSwapFor(key);
  pop.innerHTML = `<div class="info-pop-title">${info.title}</div>
    ${player}
    <div class="info-pop-body">${info.body}</div>
    ${swap ? `<div class="tip-swap"><b>No barbell today?</b> ${swap}</div>` : ''}
    <a class="tip-demo" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">🎬 Find a demo</a>`;
  pop.classList.add('visible');

  pop.querySelectorAll('[data-vidsave]').forEach(b => b.onclick = () => {
    const k = b.dataset.vidsave;
    const input = pop.querySelector('[data-vidfor="' + k + '"]');
    const id = parseYouTubeId(input && input.value);
    if (!id) { toast('That does not look like a YouTube link'); return; }
    saveVideo(k, id); showFormTip(k); toast('Demo pinned');
  });
  pop.querySelectorAll('[data-vidclear]').forEach(b => b.onclick = () => {
    saveVideo(b.dataset.vidclear, null); showFormTip(b.dataset.vidclear);
  });
}
function formBtn(key) { return FORM_TIPS[key] ? `<button class="info-btn form-btn" data-tip="${key}" onclick="showFormTip('${key}')"><span class="fb-i">ⓘ</span> How-to</button>` : ''; }

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
    ${liftTrackerHTML()}
    ${calendarHTML()}
    ${achievementsCardHTML()}
    <button class="btn secondary" id="shareBtn">📤 Share my progress</button>
  </div>`;
  drawProjectionCharts();
  const sb = document.getElementById('shareBtn'); if (sb) sb.onclick = shareCard;
  wireLiftTracker();
  wireCalendar();
}

/* ---- Achievements + PR cards (shared by both stats screens) ---- */
function achievementsCardHTML() {
  const items = ACHIEVEMENTS.map(a => {
    const on = S.achievements.includes(a.id);
    return `<div class="ach ${on ? 'on' : ''}"><div class="ach-emoji">${a.emoji}</div><div class="ach-name">${a.name}</div></div>`;
  }).join('');
  const got = S.achievements.length, tot = ACHIEVEMENTS.length;
  return `<h2 class="section">Achievements — ${got}/${tot}</h2><div class="card"><div class="ach-grid">${items}</div></div><button class="btn secondary small" id="resetAch" style="width:100%;margin-top:10px">Reset achievements</button><div class="hint">Sets your badges back to zero and starts earning them again from today. Your logged sets, history, PRs and streaks are all kept.</div>`;
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
      if (ex.sec != null) tally.plankSec += (ex.sets || 1) * ex.sec; else tally[ex.key] = (tally[ex.key] || 0) + ex.reps * (ex.sets || 1);
    });
  }
  let totalReps = 0; exKeys.forEach(e => totalReps += (tally[e.key] || 0));
  const holdLabel = S.program === 'prep30' ? 'Plank time' : (pcfg().holdLabel || 'Hold time');

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
    ${liftTrackerHTML()}
    ${calendarHTML()}
    ${achievementsCardHTML()}
    <button class="btn secondary" id="shareBtn">📤 Share my progress</button>
  </div>`;
  const sb = document.getElementById('shareBtn'); if (sb) sb.onclick = shareCard;
  wireLiftTracker();
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
      color: chartPalette()[i],
      data: completedProgram.map(w => oneRM(w.intensity[k], 5))
    })), labels);

  lineChart(document.getElementById('ch2'),
    [{ name:'PL Total', color: cssVar('--chart-1', '#aaff00'),
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
  ctx.strokeStyle = cssVar('--chart-grid', 'rgba(255,255,255,.06)'); ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (H - pad.t - pad.b) * (g / 4);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
  }
  // Legend placeholders
  const colors = chartPalette();
  const dimC = cssVar('--dim', '#555555');
  ctx.font = '10px -apple-system,sans-serif'; ctx.fillStyle = dimC;
  seriesNames.forEach((nm, i) => {
    const lx = pad.l + i * 70;
    ctx.fillStyle = colors[i] || dimC;
    ctx.fillRect(lx, 2, 10, 4);
    ctx.fillStyle = dimC;
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
  const axisC = cssVar('--muted', '#aaaaaa');
  ctx.strokeStyle = cssVar('--chart-grid', 'rgba(170,255,0,.15)'); ctx.fillStyle = axisC; ctx.font = '10px -apple-system,sans-serif'; ctx.lineWidth = 1;
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
    ctx.fillStyle = axisC; ctx.fillText(s.name, lx + 14, 8);
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
      <div class="prog-grid" id="segProgram">
        ${[
          ['fpfocus','🧬','Fingerprint Focus','targets your weakest'],
          ['prep30','🗓️','30-Day Prep','bodyweight ramp-up'],
          ['mobility','🧘','Mobility','joint mobility'],
          ['core','🔥','Core & Abs','core builder'],
          ['dumbbell','💪','Dumbbell','A/B strength'],
          ['pilates','🤸','Pilates Mat','classical Pilates'],
          ['hiit','⚡','Full-Body HIIT','timed circuit'],
          ['bjj','🥋','BJJ Drills','jiu-jitsu'],
          ['sa2','🫀','SuperAge 2-Day','3-day condensed week'],
          ['sa4','❤️‍🔥','SuperAge Full Week','4 lifts + 3 rides'],
          ['sahyb','🔀','SuperAge Hybrid','alternating week styles'],
          ['texas','🏋️','Texas Method','barbell']
        ].map(([k,ico,nm,sub]) => `<button class="prog-tile ${S.program===k?'on':''}" data-prog="${k}">
          <div class="prog-ico">${ico}</div><div class="prog-name">${nm}</div><div class="prog-sub">${sub}</div></button>`).join('')}
      </div>
      <div class="hint">Tap a program to switch — your progress in each is saved separately.</div>
    </div>

    <h2 class="section">Display — theme</h2>
    <div class="card">
      <div class="seg" id="segTheme">
        ${[['dark','🌙 Dark'],['light','☀️ Light'],['auto','📱 Auto']]
          .map(([k,lbl]) => `<button data-theme-opt="${k}" class="${loadTheme()===k?'on':''}">${lbl}</button>`).join('')}
      </div>
      <div class="hint">Auto follows your phone's light/dark setting.</div>
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
      <div class="field"><label>Sex (for Wilks score &amp; Fingerprint norms)</label>
        <div class="seg" id="segSex">
          <button data-x="female" class="${s.sex==='female'?'on':''}">Female</button>
          <button data-x="male"   class="${s.sex==='male'?'on':''}">Male</button>
        </div>
      </div>
      <div class="field"><label>Bodyweight (${s.units})</label>
        <input type="number" inputmode="decimal" id="bw" value="${s.bodyweight}" /></div>
      <div class="field"><label>Sessions per week</label>
        <div class="seg" id="segGoal">
          ${[2,3,4,5,6].map(n2 =>
            `<button data-goal="${n2}" class="${(s.weeklyGoal || 4) === n2 ? 'on' : ''}">${n2}</button>`).join('')}
        </div>
        <div class="hint">The week strip on Roadmap counts toward this rather than toward seven days — train on whichever days suit you.</div>
      </div>
      <div class="field"><label>Equipment available</label>
        <div class="seg" id="segEquip">
          ${['gym','dumbbells','bodyweight'].map(k =>
            `<button data-eq="${k}" class="${(s.equipment || 'gym') === k ? 'on' : ''}">${EQUIP_LABEL[k]}</button>`).join('')}
        </div>
        <div class="hint">Protocols you cannot run today are marked in the library, and barbell movements show a stand-in in their How-to.</div>
      </div>
      <div class="field"><label>Age</label>
        <input type="number" inputmode="numeric" id="age" value="${s.age ?? 45}" />
        <div class="hint">Fingerprint scores are percentiles against your age group, so this changes them directly.</div></div>
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
      <button class="btn secondary" id="resetCursor">${resetCursorLabel()}</button>
      <div class="spacer"></div>
      <button class="btn danger" id="wipe">Erase all logged data</button>
      <div class="hint">Clears every set you have ticked, your workout history, personal records, streaks and progression weights — and with them the achievements, which are earned from that data rather than stored separately. Your settings, programmes and Fingerprint scores are kept.</div>
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
      <div class="hint">Clears every profile, all logged data, achievements, personal records, pinned videos and settings on this device, and disconnects cloud sync. <b>Your cloud backup is not deleted</b> — if you sign back into sync afterwards the app will ask whether to restore it or replace it with this empty device.</div>
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
    const names = { prep30: '30-Day Prep 🗓️', mobility: 'Mobility Method 🧘', core: 'Core & Abs 🔥', dumbbell: 'Dumbbell Full-Body 💪', pilates: 'Pilates Mat 🤸', hiit: 'Full-Body HIIT ⚡', bjj: 'BJJ Solo Drills 🥋', sa2: 'SuperAge 2-Day 🫀', sa4: 'SuperAge Full Week ❤️‍🔥', sahyb: 'SuperAge Hybrid 🔀', texas: 'Texas Method 🏋️' };
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

  /* theme */
  view.querySelectorAll('#segTheme button').forEach(b => b.onclick = () => {
    const t = b.dataset.themeOpt;
    localStorage.setItem('tm_theme', t);
    applyTheme(t);
    view.querySelectorAll('#segTheme button')
        .forEach(x => x.classList.toggle('on', x.dataset.themeOpt === t));
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
  view.querySelectorAll('#segGoal button').forEach(b => b.onclick = () => {
    s.weeklyGoal = +b.dataset.goal; save(); render();
  });
  view.querySelectorAll('#segEquip button').forEach(b => b.onclick = () => {
    s.equipment = b.dataset.eq; save(); render();
  });
  document.getElementById('age').onchange = e => {
    s.age = Math.max(10, Math.min(110, +e.target.value || 45)); save();
  };
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
          btn.textContent = resetCursorLabel();
          btn.classList.remove('danger');
        }
      }, 3000);
    } else {
      confirmState.reset = false;
      if (isDayProgram()) {
        const k = pcfg().stateKey;
        S[k].day = 1;
        S[k].start = isoDate(new Date());
        save(); toast(`Back to Day 1 — ${fmtPrepDate(new Date())} 🔁`); render();
      } else {
        S.cursor = { week: 0, day: 0 }; save(); toast('Back to Week 1 🔁'); render();
      }
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
      wipeLoggedData(); toast('Logs, streaks and achievements cleared 🗑'); render();
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
      factoryWipe();
      toast('App reset — reloading…');
      setTimeout(() => location.reload(), 1000);
    }
  };
}

/* =====================================================================
   ERASE LOGGED DATA
   ---------------------------------------------------------------------
   Achievements are not stored — syncAchievements() recomputes them on every
   load from workout count, prep days completed, best streak and PR count. So
   clearing S.achievements does nothing; it repopulates immediately.

   The old wipe cleared S.logs, bodyLog and cursor — none of which are what
   achievements are derived from. S.history, S.prs and the per-programme day
   logs all survived, so every badge came straight back and the reset looked
   broken. This clears the inputs, which is the only thing that actually
   resets them.
   ===================================================================== */
function wipeLoggedData() {
  S.logs = {};
  S.bodyLog = [];
  S.cursor = { week: 0, day: 0 };
  S.history = [];          /* workout count comes from here */
  S.prs = {};              /* PR badges come from here */
  S.sessions = 0;
  S.saWeights = {};        /* progression starts from the Setup lifts again */
  S.achievements = [];
  S.achieveBaseline = null;   /* raw counts go to zero, so the origin must too */
  /* every day-programme's cursor and log — prep days and streaks live here */
  Object.values(DAY_PROGRAMS).forEach(cfg => { S[cfg.stateKey] = { day: 1, log: {} }; });
  if (S.liftLog) Object.keys(S.liftLog).forEach(k => { S.liftLog[k] = []; });
  save();
  rebuild();
  syncAchievements();      /* recomputes to zero now the inputs are gone */
  save();
}

/* =====================================================================
   FACTORY WIPE
   ---------------------------------------------------------------------
   The old reset removed exactly two keys: the ACTIVE profile's state and the
   profile registry. Everything else survived — every other profile's state
   (achievements, PRs, history all live in there), the pinned videos, the
   session clock, theme and zoom.

   Worse, it left tm_cloud behind. With sync enabled the reload immediately
   signed back in, pulled the bundle down from Firebase and restored the very
   data that was just erased — which is why achievements kept coming back.

   So: enumerate the keys rather than naming two, and drop the cloud link too.
   The remote copy is deliberately NOT deleted — erasing someone's backup from
   a device-local button is not a decision this button gets to make — but the
   device forgets it, so nothing re-downloads.
   ===================================================================== */
function factoryWipe() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('tm_') === 0) doomed.push(k);   // every profile, every setting
    }
    doomed.forEach(k => localStorage.removeItem(k));
  } catch { /* storage blocked — nothing persisted to clear */ }
  /* drop anything held only in memory so the reload starts genuinely clean */
  try { if (typeof fb === 'object' && fb && fb.unsub) fb.unsub(); } catch {}
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
      padding:'12px 18px', borderRadius:'12px', zIndex:60,
      fontWeight:'700', transition:'opacity .3s' });
  }
  /* recoloured on every call — the node is cached, so styling it only at
     creation time would leave it stuck in whichever theme was active first */
  Object.assign(t.style, {
    background: cssVar('--panel2', '#202020'),
    color:      cssVar('--text', '#ffffff'),
    border:     '1px solid ' + cssVar('--border', '#333333'),
    boxShadow:  '0 10px 30px ' + cssVar('--shadow-3', 'rgba(0,0,0,.6)')
  });
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = '0', 1600);
}

document.querySelectorAll('.tab').forEach(t => t.onclick = () => { TAB = t.dataset.tab; window.scrollTo(0,0); render(); });
/* Roadmap's '+ Log a lift' jumps to the Stats lift tracker. Delegated, so it
   survives the re-render that replaces the button on every screen draw. */
view.addEventListener('click', e => {
  const ra = e.target.closest('#resetAch');
  if (ra) {
    if (ra.dataset.armed !== '1') {
      ra.dataset.armed = '1';
      ra.textContent = 'Tap again to reset badges';
      setTimeout(() => { if (ra.isConnected) { ra.dataset.armed = '0'; ra.textContent = 'Reset achievements'; } }, 3000);
    } else {
      resetAchievements();
      toast('Achievements reset — earning from today');
      render();
    }
    return;
  }
});

view.addEventListener('click', e => {
  if (e.target.closest('#rmLogLift')) { TAB = 'stats'; window.scrollTo(0, 0); render(); return; }
  /* any set tick or pressing Start begins the session clock */
  /* Texas rows use [data-check], the day-programs use [data-pcheck]; the
     shared .check class is what both actually have in common. */
  if (e.target.closest('.check') || e.target.closest('.mini-start') || e.target.closest('#startSession')) {
    sessionEnsure();
    requestAnimationFrame(refreshSessionPanels);
  }
});
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
/* ---------------------------------------------------------------------
   Signing in used to restore the cloud bundle unconditionally, which quietly
   undid a factory reset: the device was wiped and signed out correctly, then
   the next sign-in pulled the whole old bundle straight back down. The reset
   looked like it had done nothing but log you out.

   So when the device is factory-fresh AND the cloud holds data, ask which way
   the sync should go instead of assuming. Nothing is deleted without a choice.
   --------------------------------------------------------------------- */
/* Firebase codes are not answers. Say what to do about it. */
function authWhy(err) {
  const code = (err && (err.code || err.message)) || String(err);
  const map = {
    'auth/unauthorized-domain':  'this address is not on the Firebase authorised-domain list',
    'auth/popup-blocked':        'the browser blocked the sign-in window — allow pop-ups for this site and try again',
    'auth/popup-closed-by-user': 'the sign-in window was closed before finishing',
    'auth/cancelled-popup-request': 'sign-in was already in progress',
    'auth/network-request-failed': 'no network — check the connection and try again',
    'auth/operation-not-supported-in-this-environment': 'this browser will not allow sign-in from an installed app — open the site in the browser instead',
    'auth/web-storage-unsupported': 'this browser is blocking site storage, which sign-in needs — turn off private browsing or allow cookies for this site'
  };
  for (const k in map) if (String(code).includes(k)) return map[k] + ' (' + k + ')';
  return String(code);
}

function localLooksFresh() {
  const profiles = loadProfiles();
  if (!profiles || !profiles.list || profiles.list.length !== 1) return false;
  for (const p of profiles.list) {
    try {
      const st = JSON.parse(localStorage.getItem('tm_state_' + p.id) || '{}');
      if ((st.history || []).length) return false;
      if (Object.keys(st.prs || {}).length) return false;
      if (st.sessions) return false;
      /* Counting log KEYS is wrong: simply opening a workout creates an empty
         record for that day, so a freshly reset device already has one. Ask
         whether anything was actually ticked instead. */
      if (progHasActivity(st.logs || {})) return false;
      for (const cfg of Object.values(DAY_PROGRAMS)) {
        const sub = st[cfg.stateKey];
        if (sub && progHasActivity(sub.log || {})) return false;
      }
    } catch { /* unreadable counts as fresh */ }
  }
  return true;
}

function cloudDirectionChoice(who) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'fp-sheet';
    el.innerHTML = `<div class="fp-panel">
      <div class="fp-kicker">Cloud backup found</div>
      <div class="fp-title">Which one is right?</div>
      <div class="fp-lede">This device has no training data, but there is a backup in the cloud for
        ${who}. If you have just factory reset, restoring will bring all of it back.</div>
      <button class="btn primary" data-dir="restore">Restore my backup to this device</button>
      <button class="btn danger" data-dir="overwrite">Keep this device empty and replace the backup</button>
      <div class="tiny muted center" style="margin-top:10px">Replacing overwrites the cloud copy with this empty device. It cannot be undone.</div>
    </div>`;
    document.body.appendChild(el);
    el.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => {
      const d = b.dataset.dir;
      el.remove();
      resolve(d);
    });
  });
}

async function cloudInit() {
  try {
    const { appMod, fsMod, authMod } = await cloudLoadSDK();
    if (!fbApp) fbApp = appMod.initializeApp(FIREBASE_CONFIG);
    fbAuth = authMod.getAuth(fbApp);
    fbDb   = fsMod.getFirestore(fbApp);
    /* A redirect sign-in came back and nothing ever read the result. On a
       phone the popup is usually blocked, so cloudSignIn falls through to
       signInWithRedirect — and the return trip landed on a page that never
       asked how it went. Errors were invisible and a failure looked like a
       hang. onAuthStateChanged still fires on success; this is here to catch
       the failures it cannot report. */
    authMod.getRedirectResult(fbAuth).catch(err => {
      cloudStatus('Sign-in failed: ' + authWhy(err));
    });
    authMod.onAuthStateChanged(fbAuth, user => {
      clearTimeout(cloudSignInT);
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

let cloudSignInT = null;
async function cloudSignIn() {
  cloudStatus('Opening Google sign-in…');
  /* If nothing resolves, say so rather than leaving that message up for good.
     A silent wait is indistinguishable from a broken button. */
  clearTimeout(cloudSignInT);
  cloudSignInT = setTimeout(() => {
    if (!cloudUser) cloudStatus('Still waiting on Google. If no window opened, allow pop-ups for this site, or open the site in your browser rather than the installed app, then try again.');
  }, 12000);
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
      } catch (e2) { cloudStatus('Sign-in failed: ' + authWhy(e2)); return; }
    }
    cloudStatus('Sign-in failed: ' + authWhy(err));
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
      let dir = 'restore';
      if (localLooksFresh()) dir = await cloudDirectionChoice(who);
      if (dir === 'overwrite') {
        await cloudPush(true);
        cloudStatus('Synced ✓ as ' + who + ' — backup replaced with this device');
      } else {
        cloudApplying = true; applyBundle(snap.data().bundle); cloudApplying = false;
        cloudLastApplied = snap.data().updatedAt || Date.now();
        cloudStatus('Synced ✓ as ' + who);
      }
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
    cloudStatus('Sync error: ' + authWhy(err));
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
  return (z && z >= 0.8 && z <= 2.2) ? z : 1;
}
function applyZoom(z) { document.documentElement.style.setProperty('--content-zoom', z); }

/* v99 dropped the default zoom from 1.28 to 1. Anyone whose stored value is
   still exactly the old default never deliberately chose it — they'd just see
   no change from the density work — so clear it once. Any other value was a
   real choice and is left alone. */
(function migrateZoomDefault() {
  try {
    if (!localStorage.getItem('tm_zoom_v99') ) {
      if (localStorage.getItem('tm_zoom') === '1.28') localStorage.removeItem('tm_zoom');
      localStorage.setItem('tm_zoom_v99', '1');
    }
  } catch { /* storage blocked — nothing to migrate */ }
})();

applyZoom(loadZoom());

/* =====================================================================
   THEME  (dark / light / follow the phone)
   ===================================================================== */
const THEME_BAR = { dark: '#080808', light: '#fff7eb' };
function loadTheme() {
  const t = localStorage.getItem('tm_theme');
  return (t === 'dark' || t === 'light' || t === 'auto') ? t : 'light';
}
function resolvedTheme(t) {
  if (t !== 'auto') return t;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applyTheme(t) {
  const r = resolvedTheme(t);
  document.documentElement.setAttribute('data-theme', r);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', THEME_BAR[r]);
}
applyTheme(loadTheme());

/* Canvas can't use CSS vars, so read the resolved value at draw time.
   Anything drawn on <canvas> must go through this or it won't follow the theme. */
function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch { return fallback; }
}
function chartPalette() {
  return [cssVar('--chart-1', '#aaff00'), cssVar('--chart-2', '#77cc00'),
          cssVar('--chart-3', '#448800'), cssVar('--chart-4', '#ccff44')];
}

/* keep 'auto' honest when the phone flips light/dark mid-session */
matchMedia('(prefers-color-scheme: light)')
  .addEventListener('change', () => { if (loadTheme() === 'auto') applyTheme('auto'); });

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
  /* --text keeps one streamer readable against the page in either theme */
  const colors = [cssVar('--chart-1', '#aaff00'), cssVar('--text', '#ffffff'),
                  cssVar('--chart-2', '#77cc00'), '#ffd400', '#ff5e5e'];
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
/* Achievements are derived, never stored — syncAchievements() rebuilds them
   from these four numbers on every load. That is why clearing the list does
   nothing, and why the only way to reset the badges WITHOUT throwing away your
   training history is to move the origin: record where you are now, and count
   from there. Everything below is a delta against that baseline. */
function achievementStats() {
  const st = prepStreaks();
  const b = S.achieveBaseline || {};
  const sub = (now, was) => Math.max(0, now - (was || 0));
  return {
    workouts: sub(workoutCount(), b.workouts),
    prepDays: sub(prepDaysComplete(), b.prepDays),
    streak:   sub(st.best, b.streak),   // best streak (monotonic) drives streak badges
    prCount:  sub(Object.keys(S.prs || {}).length, b.prCount)
  };
}

/* zero the badges but keep every logged set, PR and streak */
function resetAchievements() {
  const st = prepStreaks();
  S.achieveBaseline = {
    workouts: workoutCount(),
    prepDays: prepDaysComplete(),
    streak:   st.best,
    prCount:  Object.keys(S.prs || {}).length
  };
  S.achievements = [];
  save();
  syncAchievements();   /* recomputes against the new origin — all deltas zero */
  save();
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

/* Deliberately NOT themed: this renders a 1080x1080 image the user exports and
   posts elsewhere. It's a branded artifact, not app chrome, so it stays dark
   whatever theme the app is in. Leave the literal colours below alone. */
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
        const many = item.total > 1;
        const step = { name: item.ex.name, key: item.ex.key, label: many ? `Set ${item.setIndex + 1} of ${item.total}` : 'Target', kind: 'reps', bw: true, reps: item.ex.reps, side: item.ex.side, scheme: many ? `${item.ex.reps} reps${item.ex.side ? ' / side' : ''}` : item.ex.scheme, checkId: many ? `${item.ex.key}_${item.setIndex}` : item.ex.key, store: 'prep' };
        const h = saHint(item.ex.key);
        if (h) { step.scheme = (step.scheme ? step.scheme + ' · ' : '') + h.txt; if (h.w != null) step.weight = h.w; }
        steps.push(step);
      } else {
        steps.push({ name: item.ex.name, key: item.ex.key, label: item.total > 1 ? `Set ${item.setIndex + 1} of ${item.total}` : (item.ex.sec >= 90 ? 'Timed' : 'Hold'), kind: 'hold', seconds: item.ex.sec, side: item.ex.side, checkId: `${item.ex.key}_${item.setIndex}`, store: 'prep' });
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
    const target = step.kind === 'hold' ? `${holdTxt(step.seconds)}${step.seconds >= 90 ? '' : ' hold'}${sideTxt}`
      : step.scheme ? step.scheme
      : step.bw ? (step.amrap ? 'AMRAP' : `${step.reps} reps${sideTxt}`)
      : `${fmt(step.weight)} ${unit()} × ${step.reps}`;
    const sub = (step.weight != null && step.kind === 'reps')
      ? `<div class="sess-plates">${plateStripHTML(step.weight)}</div>` : '';
    const btn = step.kind === 'hold'
      ? `<button class="btn primary" id="sessAct">▶ Start · ${holdTxt(step.seconds).replace(' sec', 's')}</button>`
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
    <div class="tiny muted" style="margin:2px 0 6px">${(n2 => `${n2.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${n2.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`)(new Date())}</div>
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
  /* supersets provide the rest: SuperAge moves straight to the partner
     exercise while the last muscle group recovers */
  if (hasLoadProgression()) { nextStep(); return; }
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
  if (step.kind === 'hold') {
    if (step.seconds >= 90) { say(`${step.name}. ${Math.round(step.seconds / 60)} minutes.`); return; }
    say(`${step.name}. Hold for ${step.seconds} seconds${side}.`); return;
  }
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
    let progMsgs = [];
    if (!d.rest) {
      if (!pstate().log[dayNum]) pstate().log[dayNum] = { checks: {} };
      pstate().log[dayNum].done = true; S.sessions = (S.sessions || 0) + 1;
      progMsgs = saApplyProgression(d, pstate().log[dayNum]);
    }
    save();
    if (dayNum >= ptotal()) { finishPrep(); return; }
    celebrateWorkout(progMsgs); movePrepCursor(1);
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
/* =====================================================================
   SESSION PROGRESS  (elapsed clock + sticky bar + right-hand rail)
   ---------------------------------------------------------------------
   The clock is keyed to the specific workout, persisted to localStorage,
   and derived from wall-clock timestamps rather than an interval counter —
   so a backgrounded PWA (screen off mid-set) still reports the real
   elapsed time when it wakes.
   ===================================================================== */
const SESS_KEY = 'tm_session';

function sessionDayKey() {
  return isDayProgram()
    ? S.program + '-' + pstate().day
    : 'texas-' + S.cursor.week + '-' + S.cursor.day;
}
function sessionLoad() {
  try { return JSON.parse(localStorage.getItem(SESS_KEY)) || null; } catch { return null; }
}
function sessionSave(o) { try { localStorage.setItem(SESS_KEY, JSON.stringify(o)); } catch {} }

/* start the clock on first real activity; switching workouts starts a new one */
function sessionEnsure() {
  const key = sessionDayKey();
  const cur = sessionLoad();
  if (!cur || cur.key !== key) sessionSave({ key, started: Date.now(), stopped: null });
}
function sessionStop() {
  const cur = sessionLoad();
  if (cur && cur.key === sessionDayKey() && !cur.stopped) {
    cur.stopped = Date.now(); sessionSave(cur);
  }
}
function sessionElapsedMs() {
  const cur = sessionLoad();
  if (!cur || cur.key !== sessionDayKey()) return 0;
  return (cur.stopped || Date.now()) - cur.started;
}
function fmtElapsed(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? h + ':' : '') + mm + ':' + String(sec).padStart(2, '0');
}

/* counts come from the rendered checkboxes, so this works for every program
   without each renderer having to report its own totals */
function sessionCounts() {
  const all = view.querySelectorAll('.check');
  let done = 0;
  all.forEach(c => { if (c.classList.contains('on')) done++; });
  return { done, total: all.length };
}

function railHTML() {
  const { done, total } = sessionCounts();
  const pct = total ? Math.round(done / total * 100) : 0;
  const est = isDayProgram()
    ? (pdata()[pstate().day - 1] && !pdata()[pstate().day - 1].rest ? estDayMin(pdata()[pstate().day - 1]) : 0)
    : estTexasMin(PROGRAM[S.cursor.week].days[S.cursor.day]);
  return `<div class="card rail-card">
    <div class="rail-kicker">Progress</div>
    <div class="rail-big"><b id="railDone">${done}</b><span>/ ${total}</span></div>
    <div class="rail-lbl">Sets complete</div>
    <div class="rail-track"><span class="rail-fill" id="railFill" style="width:${pct}%"></span></div>
    <div class="rail-row"><span>Elapsed</span><b id="railClock">${fmtElapsed(sessionElapsedMs())}</b></div>
    <div class="rail-row"><span>Estimated</span><b>${est ? '≈' + est + ' min' : '—'}</b></div>
    <div class="rail-row hl"><span>Complete</span><b id="railPct">${pct}%</b></div>
  </div>` + railExtrasHTML();
}

/* Wrap whatever the day renderer drew into a two-column grid and hang the
   progress rail beside it. appendChild MOVES the nodes, so every listener the
   renderer already bound survives intact. */

/* Fills the space under the progress card: what's next, the written cue for
   it, and a line to sit with. Each is one idea with room around it — the
   progress card reads calmly because it has a single hierarchy, and these
   follow the same rule rather than packing text in. */
/* Practical habit-formation and longevity prompts, written here rather than
   lifted from anyone's newsletter. The behavioural ones are standard findings
   (implementation intentions, habit stacking, friction, never-miss-twice); the
   physiological ones restate the same evidence the Fingerprint protocols cite. */
const RAIL_LINES = [
  ['Decide when and where, not just what. "Monday, Wednesday, Friday at seven" beats "three times a week" — a plan with a time attached is far more likely to happen.', 'Habit'],
  ['Never miss twice. One skipped session is an accident; two in a row is the start of a new pattern. Protect the second day harder than the first.', 'Habit'],
  ['Stack it onto something you already do without thinking. After the morning coffee, the kit goes on. The existing habit becomes the cue.', 'Habit'],
  ['Cut the friction to almost nothing. Clothes out the night before, bag by the door. Most missed sessions are lost at the getting-ready stage, not the training stage.', 'Habit'],
  ['On a bad day, do two minutes. The point is not the training effect — it is refusing to break the chain. Two minutes usually turns into the session anyway.', 'Habit'],
  ['You are not trying to finish a programme, you are becoming someone who trains. Every session is a vote for that, and the votes compound.', 'Habit'],
  ['Make the streak visible. A row of completed days is a surprisingly stubborn thing to break, and this app already draws you one.', 'Habit'],
  ['Reduce the decision. Same time, same place, same first exercise. Willpower spent deciding is willpower not spent lifting.', 'Habit'],
  ['Type II muscle fibres shrink at roughly twice the rate of Type I after forty. Something explosive each week — a jump, a throw, a fast step-up — is what defends them.', 'Longevity'],
  ['VO2 max falls about ten percent a decade once it goes unchallenged, and it is the most reversible marker here. Two easy aerobic sessions a week move it more than one hard one.', 'Longevity'],
  ['Grip strength tracks with all-cause mortality more tightly than blood pressure does. Hang from something. It costs thirty seconds.', 'Longevity'],
  ['Eyes-closed balance drops from about ten seconds in your thirties to three by your sixties — and it comes back fast when trained. Practise it while the kettle boils.', 'Longevity'],
  ['Weak social ties carry a mortality risk comparable to smoking. Of everything here, that is the one most likely to be neglected by someone who trains seriously.', 'Longevity'],
  ['Almost no fall happens standing still — it happens mid-transition, rising or turning. Train the transitions, not just the strength.', 'Longevity'],
  ['Recovery is not time off from the programme, it is part of it. Adaptation happens between sessions, not during them.', 'Training'],
  ['Add a little, recover well, repeat. Progressive overload is not complicated; it is just hard to stay patient with.', 'Training'],
  ['Leave two or three reps in reserve on most sets. Training to failure every session buys fatigue, not progress.', 'Training'],
  ['Consistency beats intensity across a year. The programme you actually follow outperforms the better one you abandon in March.', 'Training'],
  ['Slow the lowering phase. Most of the strength you are building is in the part everyone rushes.', 'Training'],
  ['Progress is boring up close and obvious from a distance. Judge it in months, not sessions.', 'Training']
];
/* one line per day, stable across re-renders so it does not flicker mid-set */
function railLine() {
  const d = new Date();
  const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return RAIL_LINES[day % RAIL_LINES.length];
}

/* identifies which exercise the rail is currently describing */
/* Which card the rail describes: the one you opened by hand if it is still
   open, otherwise whichever holds the next unticked set. Opening a card is an
   explicit "show me this", and it should win over the automatic follow. */
let railFocus = null;

function railTargetCard() {
  const cards = [...view.querySelectorAll('.card.lift')];
  if (railFocus != null) {
    const c = cards[railFocus];
    if (c && !c.classList.contains('collapsed')) return { card: c, focused: true };
    railFocus = null;                       /* it was closed or is gone */
  }
  const next = view.querySelector('.check:not(.on)');
  const card = next && next.closest('.card');
  return card ? { card, focused: false, next } : null;
}

/* the row whose exercise the rail should describe — matters on superset cards,
   which hold two different movements */
function railTargetRow(t) {
  if (!t) return null;
  if (!t.focused && t.next) return t.next.closest('.set-row');
  return t.card.querySelector('.check:not(.on)')?.closest('.set-row')
      || t.card.querySelector('.set-row');
}

function currentRailKey() {
  const t = railTargetCard();
  if (!t) return 'all-done';
  const row = railTargetRow(t);
  const btn = (row && row.querySelector('.form-btn[data-tip]')) || t.card.querySelector('.form-btn[data-tip]');
  if (btn) return (t.focused ? 'focus:' : '') + btn.dataset.tip;
  const nm = t.card.querySelector('.lift-head .name');
  return (t.focused ? 'focus:' : '') + (nm ? nm.textContent.trim() : 'unknown');
}

function railExtrasHTML() {
  const [quote, by] = railLine();
  const quoteCard = `<div class="card rail-card rail-quote-card">
      <div class="rail-kicker">${by || 'Today'}</div>
      <blockquote class="rail-quote">${quote}</blockquote>

    </div>`;

  const t = railTargetCard();
  if (!t) {
    return `<div class="card rail-card">
      <div class="rail-kicker">Session</div>
      <div class="rail-next">All sets done</div>
      <div class="rail-next-sub">Everything on this day is ticked — mark the day complete to bank it.</div>
    </div>` + quoteCard;
  }
  const card = t.card;
  const row  = railTargetRow(t);
  const nm  = card.querySelector('.lift-head .name');
  /* the How-to button lives inside .name, so textContent would read
     "Squat ⓘ How-to" — take only the element's own text nodes */
  const nmText = nm ? [...nm.childNodes].filter(x => x.nodeType === 3).map(x => x.textContent).join('').trim() : '';
  const sch = card.querySelector('.lift-head .scheme');
  /* on a superset card prefer the row being pointed at, not the card's first */
  const btn = (row && row.querySelector('.form-btn[data-tip]')) || card.querySelector('.form-btn[data-tip]');
  const tip = btn && FORM_TIPS[btn.dataset.tip];
  let out = `<div class="card rail-card">
      <div class="rail-kicker">${t.focused ? 'Viewing' : 'Up next'}</div>
      <div class="rail-next">${nmText || '—'}</div>
      ${sch ? `<div class="rail-next-sub">${sch.textContent.trim()}</div>` : ''}
    </div>`;
  if (tip) {
    const vid = videoFor(btn.dataset.tip);
    out += `<div class="card rail-card">
      <div class="rail-kicker">How to</div>
      <div class="rail-next">${tip.title}</div>
      ${vid ? `<div class="tip-video rail-video">
           <iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="${tip.title} demo"
             allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
             allowfullscreen loading="lazy"></iframe>
         </div>` : ''}
      <div class="rail-tip-body">${tip.body}</div>
    </div>`;
  }
  return out + quoteCard;
}

/* The type pill on an exercise card said "SETS" — on a card whose entire
   content is sets. Turn it into that exercise's own progress where there is
   more than one set to track, keep TIMED/HOLD because those change how you use
   the row, and drop it when it would say nothing at all. */
/* ---------------------------------------------------------------------
   Collapse finished exercises.

   Note what this deliberately does NOT do: it does not group sets under their
   exercise. prepDayItems() interleaves superset sets round-robin on purpose
   (squat s1 -> hinge s1 -> squat s2) so the superset runs the way it is meant
   to be performed, and regrouping would silently destroy that ordering.
   Collapsing finished cards gets the same "less to read" result while leaving
   the sequence exactly as programmed.
   --------------------------------------------------------------------- */
let collapseChoice = new Map();   // card index -> true = user forced open
let collapseDayKey = null;

/* ---------------------------------------------------------------------
   Effort rating for the session ("how did that feel?").

   Stored on the same per-day log the checkboxes use, so it rides to Firebase
   with everything else and survives a profile switch. Placed at the END of the
   workout rather than per-exercise: our day-programs render one card per SET,
   so a per-exercise control would repeat a dozen times down the page.
   --------------------------------------------------------------------- */
const RPE_STEPS = [
  [1, 'Too hard'],
  [2, 'Hard'],
  [3, 'Just right'],
  [4, 'Easy'],
  [5, 'Too easy']
];

function sessionLogRef() {
  if (isDayProgram()) {
    const st = pstate(), d = st.day;
    if (!st.log[d]) st.log[d] = { checks: {} };
    return st.log[d];
  }
  const k = S.cursor.week + '-' + S.cursor.day;
  if (!S.logs[k]) S.logs[k] = { checks: {}, reps: {} };
  return S.logs[k];
}

function rpeHTML() {
  const cur = sessionLogRef().rpe || 0;
  const dots = RPE_STEPS.map(([v, label]) =>
    `<button class="rpe-dot ${cur === v ? 'on' : ''}" data-rpe="${v}" title="${label}"
       aria-label="${label}"></button>`).join('');
  const label = cur ? (RPE_STEPS.find(r => r[0] === cur) || [, ''])[1] : 'Not rated';
  return `<div class="card rpe-card">
    <div class="rpe-kicker">How did that feel?</div>
    <div class="rpe-scale">
      <span class="rpe-end">Too hard</span>
      <div class="rpe-dots">${dots}</div>
      <span class="rpe-end">Too easy</span>
    </div>
    <div class="rpe-value ${cur ? 'set' : ''}">${label}</div>
  </div>`;
}

function mountRpe() {
  const main = view.querySelector('.session-main');
  if (!main || main.querySelector('.rpe-card')) return;
  main.insertAdjacentHTML('beforeend', rpeHTML());
}

/* delegated so it survives every re-render and reconcile */
view.addEventListener('click', e => {
  const b = e.target.closest('[data-rpe]');
  if (!b) return;
  const v = +b.dataset.rpe;
  const log = sessionLogRef();
  log.rpe = (log.rpe === v) ? 0 : v;   // tapping the same dot clears it
  save();
  const card = view.querySelector('.rpe-card');
  if (card) card.outerHTML = rpeHTML();
});

function applyCollapse() {
  /* a new day means the old per-card choices no longer refer to anything */
  const key = sessionDayKey();
  if (collapseDayKey !== key) { collapseDayKey = key; collapseChoice = new Map(); }

  const cards = view.querySelectorAll('.card.lift');
  cards.forEach((card, i) => {
    const checks = card.querySelectorAll('.check');
    if (!checks.length) return;
    let done = 0;
    checks.forEach(c => { if (c.classList.contains('on')) done++; });
    const finished = done === checks.length;
    /* Closed is the default state for every exercise, not just finished ones —
       you open the one you are working on. A card you open by hand stays open
       until you close it or the day changes. */
    const forcedOpen = collapseChoice.get(i);
    card.classList.toggle('collapsed', forcedOpen !== true);
    card.classList.toggle('is-done', finished);
  });
}

/* tapping the header opens or closes that exercise; the How-to button and any
   control inside the header keep their own behaviour */
view.addEventListener('click', e => {
  const head = e.target.closest('.lift-head');
  if (!head || e.target.closest('button')) return;
  const card = head.closest('.card.lift');
  if (!card) return;
  const cards = [...view.querySelectorAll('.card.lift')];
  const i = cards.indexOf(card);
  if (i < 0) return;
  const nowCollapsed = card.classList.contains('collapsed');
  collapseChoice.set(i, nowCollapsed);        // opening it = forced open
  card.classList.toggle('collapsed', !nowCollapsed);
  /* opening a card focuses the rail on it; closing that same card releases it
     back to following whatever set is next */
  railFocus = nowCollapsed ? i : (railFocus === i ? null : railFocus);
  refreshSessionPanels();
});

function annotateBadges() {
  view.querySelectorAll('.card.lift').forEach(card => {
    const badge = card.querySelector('.badge');
    if (!badge) return;
    const checks = card.querySelectorAll('.check');
    if (checks.length > 1) {
      let done = 0;
      checks.forEach(c => { if (c.classList.contains('on')) done++; });
      badge.textContent = done + '/' + checks.length;
      badge.classList.toggle('badge-done', done === checks.length);
      return;
    }
    const t = badge.textContent.trim().toUpperCase();
    if (t === 'SETS' || t === 'REPS') badge.remove();
  });
}

function mountSessionRail() {
  const screen = view.querySelector('.screen');
  if (!screen || screen.querySelector('.session-grid')) return;
  annotateBadges();
  applyCollapse();
  const grid = document.createElement('div'); grid.className = 'session-grid';
  const main = document.createElement('div'); main.className = 'session-main';
  while (screen.firstChild) main.appendChild(screen.firstChild);
  const rail = document.createElement('aside'); rail.className = 'session-rail';
  grid.appendChild(main); grid.appendChild(rail);
  screen.appendChild(grid);
  /* fill the rail only AFTER the grid is in the document — sessionCounts()
     queries `view`, and a detached main would report zero sets */
  rail.innerHTML = railHTML();
  mountRpe();
}

/* Ticking a set toggles the checkbox class in place — it does NOT re-render —
   so anything derived from the checks has to be refreshed explicitly or it
   silently goes stale. That covers the per-exercise pills and the rail's
   "up next" / "form cue", which both depend on which set is next. */
function refreshSessionPanels() {
  annotateBadges();
  const rail = view.querySelector('.session-rail');
  if (rail) rail.innerHTML = railHTML();
  updateSessionUI();
}
function updateSessionUI() {
  const bar = document.getElementById('sessBar');
  if (!bar) return;
  /* the rail sticks below the whole sticky header, whose height changes with
     the session bar showing or hiding — measure it rather than hard-coding */
  const head = document.querySelector('.stickytop');
  if (head) document.documentElement.style.setProperty('--sticky-h', head.offsetHeight + 'px');
  const onRoadmap = TAB === 'today';
  const { done, total } = onRoadmap ? sessionCounts() : { done: 0, total: 0 };
  bar.classList.toggle('hidden', !onRoadmap || !total);
  if (!onRoadmap || !total) return;
  const pct = Math.round(done / total * 100);

  /* Ticking a set toggles a class in place without re-rendering, and the click
     path proved unreliable to hook (the row's own handler can open the rest
     overlay mid-dispatch). Reconcile here instead: this already runs once a
     second while the Roadmap is up, so anything derived from the checks
     self-heals rather than silently going stale. The rail is only rebuilt when
     the count actually moves, so it is not thrashed every tick. */
  annotateBadges();
  applyCollapse();
  /* Rebuild the rail only when the NEXT exercise changes, not on every set.
     The progress figures are patched by id above, so they stay live without a
     rebuild — and rebuilding would tear out the how-to iframe and restart the
     video underneath you mid-set, which is exactly when you are watching it. */
  const tipKey = currentRailKey();
  if (updateSessionUI._tipKey !== tipKey) {
    updateSessionUI._tipKey = tipKey;
    const rail = view.querySelector('.session-rail');
    if (rail) rail.innerHTML = railHTML();
  }

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('sessCount', done + ' / ' + total);
  set('sessClock', fmtElapsed(sessionElapsedMs()));
  set('railDone', done);
  set('railClock', fmtElapsed(sessionElapsedMs()));
  set('railPct', pct + '%');
  const f = document.getElementById('sessFill'); if (f) f.style.width = pct + '%';
  const rf = document.getElementById('railFill'); if (rf) rf.style.width = pct + '%';
}

/* One ticker for the whole app. It must run on EVERY tab, not just the
   Roadmap: updateSessionUI() is also what hides the session bar, so gating the
   interval on TAB left the bar frozen on screen after navigating away. It
   early-returns cheaply everywhere else. */
setInterval(updateSessionUI, 1000);

/* =====================================================================
   PROTOCOLS  (browsable library, after The Standard's Protocols screen)
   ---------------------------------------------------------------------
   Layered ON TOP of the existing program detail view rather than replacing
   it: mountProtocols() prepends into whatever renderProgram() /
   renderPrepProgram() already drew, so the Texas table and the prep
   calendar keep working untouched.
   ===================================================================== */
/* ---------------------------------------------------------------------
   Equipment.

   Kit is a ladder, not a set: a barbell gym can run anything, dumbbells can
   run dumbbell and bodyweight work, bodyweight runs only itself. So one rank
   comparison decides whether a protocol is available.

   Note what this does NOT do: silently swap exercises inside a running
   programme. Texas Method prescribes 110lb because of what you squatted last
   week — quietly turning that into a goblet squat would keep the number and
   make it meaningless, and the same applies to every SuperAge progression.
   Instead the library tells you what you can actually run today, and each
   barbell movement carries a documented stand-in in its How-to.
   --------------------------------------------------------------------- */
const EQUIP_RANK  = { bodyweight: 0, dumbbells: 1, gym: 2 };
const EQUIP_LABEL = { bodyweight: 'Bodyweight only', dumbbells: 'Dumbbells', gym: 'Full gym' };
const EQUIP_NEEDS = { bodyweight: 'bodyweight', dumbbells: 'dumbbells', gym: 'a barbell' };

function haveEquip() { return S.settings.equipment || 'gym'; }
function canRun(needs) { return EQUIP_RANK[haveEquip()] >= EQUIP_RANK[needs || 'bodyweight']; }

/* stand-ins shown in the How-to when you do not have the kit for a movement */
const EQUIP_SWAPS = {
  squat:    { dumbbells: 'Goblet squat — same depth, hold one dumbbell at the chest.',
              bodyweight: 'Bodyweight squat, or an ATG split squat for more load per leg.' },
  bench:    { dumbbells: 'Dumbbell bench press, or a floor press if you have no bench.',
              bodyweight: 'Push-ups — elevate the feet to make them harder.' },
  deadlift: { dumbbells: 'Dumbbell Romanian deadlift — hinge, do not squat it.',
              bodyweight: 'Single-leg Romanian deadlift, then glute bridges for volume.' },
  press:    { dumbbells: 'Dumbbell shoulder press, seated or standing.',
              bodyweight: 'Pike push-ups; feet raised as you get stronger.' },
  clean:    { dumbbells: 'Dumbbell snatch or a dumbbell high pull.',
              bodyweight: 'Squat jumps — the point is speed, not load.' },
  backext:  { dumbbells: 'Dumbbell good morning, light.',
              bodyweight: 'Supermans, or a glute bridge hold.' },
  chin:     { dumbbells: 'Dumbbell bent-over row.',
              bodyweight: 'Inverted row under a table, or a doorway isometric hold.' }
};
function equipSwapFor(key) {
  const sw = EQUIP_SWAPS[key];
  if (!sw) return '';
  const have = haveEquip();
  if (have === 'gym') return '';
  return sw[have] || '';
}

const PROTOCOLS = [
  { key: 'fpfocus',  ico: '\u{1F9EC}', name: 'Fingerprint Focus', tag: 'Adaptive', grp: 'workout', needs: 'bodyweight', sub: 'Built from your markers' },
  { key: 'texas', needs: 'gym',     ico: '🏋️', name: 'Texas Method',      tag: 'Strength',     grp: 'workout', sub: 'Barbell' },
  { key: 'dumbbell', needs: 'dumbbells',  ico: '💪',         name: 'Dumbbell A/B',      tag: 'Strength',     grp: 'workout', sub: 'Dumbbells only' },
  { key: 'prep30', needs: 'bodyweight',    ico: '🗓️', name: '30-Day Prep',       tag: 'Strength',     grp: 'workout', sub: 'Bodyweight ramp-up' },
  { key: 'sa2', needs: 'gym',       ico: '🫀',         name: 'SuperAge 2-Day',    tag: 'Longevity',    grp: 'workout', sub: '2 lifts + 1 long ride' },
  { key: 'sa4', needs: 'gym',       ico: '❤️‍🔥', name: 'SuperAge Full Week', tag: 'Longevity', grp: 'workout', sub: '4 lifts + 3 rides' },
  { key: 'sahyb', needs: 'gym',     ico: '🔀',         name: 'SuperAge Hybrid',   tag: 'Longevity',    grp: 'workout', sub: 'Week style rotates' },
  { key: 'hiit', needs: 'bodyweight',      ico: '⚡',          name: 'Full-Body HIIT',    tag: 'Conditioning', grp: 'workout', sub: 'Timed circuit' },
  { key: 'bjj', needs: 'bodyweight',       ico: '🥋',         name: 'BJJ Drills',        tag: 'Conditioning', grp: 'workout', sub: 'Jiu-jitsu movement' },
  { key: 'core', needs: 'bodyweight',      ico: '🔥',         name: 'Core & Abs',        tag: 'Conditioning', grp: 'workout', sub: 'Core builder' },
  { key: 'mobility', needs: 'bodyweight',  ico: '🧘',         name: 'Mobility',          tag: 'Mobility',     grp: 'recovery', sub: 'Hips · knees · ankles' },
  { key: 'pilates', needs: 'bodyweight',   ico: '🤸',         name: 'Pilates Mat',       tag: 'Mobility',     grp: 'recovery', sub: 'Classical Pilates' }
];

/* length in days, so every card carries a duration the way The Standard's do */
function protoLen(key) {
  if (key === 'texas') return PROGRAM_RULES.totalWeeks + ' weeks';
  const cfg = DAY_PROGRAMS[key];
  return cfg ? cfg.data.length + ' days' : '';
}

function protoCard(p) {
  const on = S.program === p.key;
  const ok = canRun(p.needs);
  return `<div class="proto ${on ? 'on' : ''} ${ok ? '' : 'needs-kit'}">
    <div class="proto-art" aria-hidden="true">${p.ico}</div>
    <div class="proto-body">
      <span class="proto-tag">${p.tag}</span>
      <div class="proto-nm">${p.name}</div>
      <div class="proto-meta">${p.sub}${protoLen(p.key) ? ' · ' + protoLen(p.key) : ''}</div>
      <button class="btn ${on ? 'secondary' : ok ? 'primary' : 'secondary'}" data-proto="${p.key}">
        ${on ? 'Current' : ok ? 'Start' : 'Needs ' + EQUIP_NEEDS[p.needs]}</button>
    </div>
  </div>`;
}

function protocolsLibraryHTML() {
  const workouts = PROTOCOLS.filter(p => p.grp === 'workout').map(protoCard).join('');
  const recovery = PROTOCOLS.filter(p => p.grp === 'recovery').map(protoCard).join('');

  /* diagnostics mirror the Fingerprint tab — live ones are startable, the
     rest are listed so the set of markers reads as complete */
  const diag = FP_AXES.map(ax => {
    const a = FP_ASSESS[ax.key], e = fpGet(ax.key);
    const live = !!a;
    return `<div class="proto ${live ? '' : 'locked-proto'}">
      <div class="proto-art" aria-hidden="true">${live ? '🧬' : '🔒'}</div>
      <div class="proto-body">
        <span class="proto-tag">${live ? a.duration : 'Locked'}</span>
        <div class="proto-nm">${ax.name}</div>
        <div class="proto-meta">${e ? e.score + '% · ' + fpTier(e.score).name
          : live ? 'Not yet assessed' : (FP_PENDING[ax.key] || '')}</div>
        ${live ? `<button class="btn ${e ? 'secondary' : 'primary'}" data-diag="${ax.key}">${e ? 'Retake' : 'Take test'}</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `
    <h2 class="section">Workouts</h2>
    <div class="proto-grid">${workouts}</div>
    <h2 class="section">Diagnostic tests</h2>
    <div class="proto-grid">${diag}</div>
    <h2 class="section">Recovery</h2>
    <div class="proto-grid">${recovery}</div>
    <h2 class="section">${pLabel()} · detail</h2>`;
}

function mountProtocols() {
  const screen = view.querySelector('.screen') || view;
  screen.insertAdjacentHTML('afterbegin', protocolsLibraryHTML());
  screen.querySelectorAll('[data-proto]').forEach(b => b.onclick = () => {
    const k = b.dataset.proto;
    if (k === S.program) return;
    S.program = k; save(); rebuild();
    TAB = 'today'; window.scrollTo(0, 0); render();
    toast(PROTOCOLS.find(p => p.key === k).name);
  });
  screen.querySelectorAll('[data-diag]').forEach(b => b.onclick = () => {
    TAB = 'fp'; window.scrollTo(0, 0); render(); fpOpen(b.dataset.diag);
  });
}

/* =====================================================================
   LONGEVITY FINGERPRINT
   ---------------------------------------------------------------------
   Modelled on The Standard (standard.superage.com), whose protocols the
   SUPERAGE programs here already follow. Eight markers, each scored as a
   PERCENTILE (0-100) against age- and sex-referenced norms, then bucketed
   into a tier. Tier bands were read off the live app:
     Foundation 0-39 · Core 40-71 · Advanced 72-87 · Elite 88-100

   Only the markers we can score honestly are live. The rest render as
   "not yet available" rather than inventing a number — a longevity score
   that is quietly made up is worse than no score.
   ===================================================================== */
const FP_TIERS = [
  { key: 'foundation', name: 'Foundation', min: 0,  max: 39  },
  { key: 'core',       name: 'Core',       min: 40, max: 71  },
  { key: 'advanced',   name: 'Advanced',   min: 72, max: 87  },
  { key: 'elite',      name: 'Elite',      min: 88, max: 100 }
];
function fpTier(score) {
  if (score == null) return null;
  return FP_TIERS.find(t => score >= t.min && score <= t.max) || FP_TIERS[0];
}

const FP_AXES = [
  { key: 'balance',              name: 'Balance',              label: ['BALANCE'] },
  { key: 'functional_strength',  name: 'Functional Strength',  label: ['FUNCTIONAL','STRENGTH'] },
  { key: 'peripheral_strength',  name: 'Grip Strength',        label: ['GRIP','STRENGTH'] },
  { key: 'endurance_under_load', name: 'Endurance Under Load', label: ['ENDURANCE','UNDER LOAD'] },
  { key: 'vo2_max',              name: 'Aerobic Capacity',     label: ['AEROBIC','CAPACITY'] },
  { key: 'agility',              name: 'Agility',              label: ['AGILITY'] },
  { key: 'relational_capacity',  name: 'Relational Capacity',  label: ['RELATIONAL','CAPACITY'] },
  { key: 'working_memory',       name: 'Working Memory',       label: ['WORKING','MEMORY'] }
];

/* normal CDF (Abramowitz & Stegun 26.2.17) — turns a z-score into a percentile */
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function fpPct(z) { return Math.max(0, Math.min(100, Math.round(normCdf(z) * 100))); }
function fpBand(table, age) {
  for (const [max, v] of table) if (age <= max) return v;
  return table[table.length - 1][1];
}

const FP_ASSESS = {
  /* ---------------- Balance ---------------- */
  balance: {
    id: 'balance', axis: 'balance', title: 'Balance', duration: '5 min',
    kicker: 'Single-leg stance, eyes closed',
    description: 'Single-leg stance with eyes closed measures static balance and proprioception — both strong predictors of fall risk and functional independence. With vision removed you are relying on the inner ear and on position sense from the joints, which is what actually degrades with age.',
    steps: [
      ['Setup requirements', 'Bare feet, hard flat floor. Stand next to a wall or counter you can grab, but do not rest against it. Have a timer ready or use the one below.'],
      ['Movement', 'Shift your weight onto one leg, lift the other foot clear of the floor (do not rest it against the standing leg), fold your arms across your chest, then close your eyes and start the clock.'],
      ['Measurement', 'Stop the clock the moment your eyes open, your arms unfold, your raised foot touches down, or you hop or reach for support. Take the better of two attempts on your stronger leg.'],
      ['Contraindications', 'Skip this if you have significant vertigo, an unmanaged inner-ear condition, or any balance impairment that makes an unsupported fall likely.']
    ],
    why: 'Eyes-closed balance falls off a cliff with age — the median drops from roughly 10 seconds in your thirties to about 3 seconds by your sixties. It is one of the earliest measurable signals of neuromuscular ageing, and unlike many markers it responds quickly to deliberate practice.',
    input: { label: 'Best hold', units: [['sec', 1]], hint: 'Scored against age-referenced norms.' },
    /* Median eyes-closed single-leg stance in seconds by age band. The
       distribution is heavily right-skewed, so the percentile is taken on
       log(seconds) rather than raw seconds. */
    norms: { median: [[39, 10.0], [49, 7.2], [59, 5.0], [69, 3.1], [79, 1.9], [199, 1.3]], logSd: 0.62 },
    score(v, s) {
      if (!(v > 0)) return 0;
      const m = fpBand(this.norms.median, s.age || 45);
      return fpPct((Math.log(v) - Math.log(m)) / this.norms.logSd);
    },
    blurb: {
      foundation: 'Below the range for your age group, and this is one of the most trainable markers there is. Daily practice — 30 seconds a side, eyes closed, next to a counter — usually moves this within weeks.',
      core:       'A solid baseline. Eyes-closed balance responds fast to deliberate work; adding single-leg holds to the end of your existing sessions is usually enough to push this up a tier.',
      advanced:   'Strong proprioception for your age group. Keep it by progressing the challenge — narrow the base, add a head turn, or stand on a folded towel.',
      elite:      'Top-percentile balance. This is a meaningful marker of neuromuscular age running younger than chronological age. Maintain rather than chase it.'
    }
  },

  /* ---------------- Functional strength ---------------- */
  functional_strength: {
    id: 'functional_strength', axis: 'functional_strength', title: 'Functional Strength', duration: '3 min',
    kicker: 'Standing broad jump',
    description: 'The standing broad jump measures lower-body explosive power: the ability to generate maximal force rapidly through the legs. Unlike tests of sustained force, it captures peak power output and fast-twitch fibre recruitment — the fastest-declining physical attribute with age, and one of the most responsive to training.',
    steps: [
      ['Setup requirements', 'Hard flat surface — tile, hardwood or concrete, not carpet or grass. A tape measure and at least 3 m of clear landing zone. Bare feet or thin shoes, kept consistent between retests.'],
      ['Movement', 'Stand behind the start line, feet hip-width, toes at the line. Perform a full countermovement: bend the knees, swing the arms back, then drive the arms forward and jump.'],
      ['Landing and measurement', 'Measure from the start line to the back of the nearest heel. If you lose balance on landing — step, stumble or fall back — the attempt is void. Up to 3 attempts, 60-90 seconds rest between. Your best valid jump is the score.'],
      ['Contraindications', 'Do not attempt this with an acute lower-limb injury, post-surgical restrictions on loaded jumping, or significant balance impairment.']
    ],
    why: 'Type II (fast-twitch) fibres atrophy at roughly twice the rate of Type I after 40. By the seventh decade power output can be 30-40% below peak even in people who stay aerobically active. That decline underlies fall risk, stair-climbing capacity, and the ability to recover from a stumble.',
    input: { label: 'Best valid jump', units: [['in', 1], ['cm', 0.3937008]], hint: 'Scored against research norms for your age and sex.' },
    /* Median standing broad jump in inches by age band, from field-test
       population data. Roughly normal within a band. */
    norms: {
      median: { male:   [[29, 80], [39, 75], [49, 70], [59, 63], [69, 55], [199, 45]],
                female: [[29, 63], [39, 59], [49, 55], [59, 49], [69, 43], [199, 35]] },
      sd: { male: 10, female: 8 }
    },
    score(v, s) {
      if (!(v > 0)) return 0;
      const sex = s.sex === 'male' ? 'male' : 'female';
      const m = fpBand(this.norms.median[sex], s.age || 45);
      return fpPct((v - m) / this.norms.sd[sex]);
    },
    blurb: {
      foundation: 'Below the range for your age group. Explosive power is highly trainable — start with low-impact work (step-ups, fast concentric squats) before adding jumps.',
      core:       'Solid baseline. There is meaningful room to grow, and explosive power is one of the most responsive attributes to targeted training. A focused 8-12 week power block can shift this noticeably.',
      advanced:   'Strong lower-body power for your age group. Hold it with regular low-volume jump work — quality over quantity, and always land soft.',
      elite:      'Elite explosive power. Your lower-body output ranks in the top percentile for your age group, a strong marker of biological age running younger than chronological age.'
    }
  }
,

  /* ---------------- Grip strength ---------------- */
  peripheral_strength: {
    id: 'peripheral_strength', axis: 'peripheral_strength', title: 'Grip Strength', duration: '5 min',
    kicker: 'Dead hang for time',
    description: 'Grip and forearm endurance is one of the most consistently predictive single measures in longevity research — it tracks with all-cause mortality more tightly than blood pressure does. A dead hang measures grip endurance relative to your own bodyweight, which is more functionally relevant day to day than raw crushing force.',
    steps: [
      ['Setup requirements', 'A pull-up bar, doorway bar or any solid overhead bar you can hang from with your feet clear of the floor. Chalk if you use it, but no straps — straps make this measure your shoulders, not your grip.'],
      ['Movement', 'Take an overhand grip a little wider than your shoulders. Hang with your arms straight, shoulders active rather than fully slack, feet off the floor. Start the clock when you settle.'],
      ['Measurement', 'Stop the clock the moment you drop, a hand slips, or you touch down. One attempt when fresh — a second attempt is always worse and will understate you.'],
      ['Contraindications', 'Skip this with a shoulder injury or impingement, an elbow or wrist problem, or any recent upper-limb surgery. Do not attempt it over a hard floor without something to land on.']
    ],
    why: 'Grip predicts more than forearm strength: it stands in for total-body neuromuscular integrity, which is why it keeps turning up as a mortality marker. It also declines quietly — most people lose it without noticing, because nothing in daily life tests it to failure.',
    input: { label: 'Hang time', units: [['sec', 1]], hint: 'Scored against age- and sex-referenced norms.' },
    /* Median dead-hang seconds by age band. Heavily right-skewed, so the
       percentile is taken on log(seconds). */
    norms: {
      median: { male:   [[39, 45], [49, 38], [59, 30], [69, 22], [199, 15]],
                female: [[39, 30], [49, 25], [59, 20], [69, 14], [199, 9]] },
      logSd: 0.52
    },
    score(v, s) {
      if (!(v > 0)) return 0;
      const sex = s.sex === 'male' ? 'male' : 'female';
      const m = fpBand(this.norms.median[sex], s.age || 45);
      return fpPct((Math.log(v) - Math.log(m)) / this.norms.logSd);
    },
    blurb: {
      foundation: 'Below the range for your age group, and grip responds quickly to being asked. Hang for as long as you can, twice a day, and this moves within a fortnight.',
      core:       'A solid baseline. Grip is cheap to train — add two hangs to the end of any session and let the time creep up.',
      advanced:   'Strong grip endurance for your age group. Keep it by hanging regularly rather than chasing a number.',
      elite:      'Top-percentile grip. Given how tightly this tracks with overall resilience, it is one of the better numbers to hold on to.'
    }
  },

  /* ---------------- Aerobic capacity ---------------- */
  vo2_max: {
    id: 'vo2_max', axis: 'vo2_max', title: 'Aerobic Capacity', duration: '18 min',
    kicker: 'Cooper 12-minute test',
    description: 'Cover as much ground as you can in twelve minutes. The distance estimates VO2 max — the ceiling on how much oxygen your body can use — which is the single strongest predictor of how long you stay independent. You can run, jog, walk, or mix all three; the test is the distance, not the method.',
    steps: [
      ['Setup requirements', 'A measured route: a running track is ideal, otherwise use a phone GPS or a treadmill. Warm up for five easy minutes first. Pick a day you feel normal — this is not a day to push through illness.'],
      ['Movement', 'Twelve minutes, as much distance as you can cover. Start conservatively; almost everyone goes out too hard and walks the last three minutes. Even effort beats a fast start.'],
      ['Measurement', 'Record total distance at exactly twelve minutes. Enter it below in miles or metres. Cool down properly afterwards.'],
      ['Contraindications', 'Do not attempt this with known cardiac disease, uncontrolled blood pressure, or if you have been told to avoid maximal exertion. If in doubt, ask your doctor first — this is a hard effort by design.']
    ],
    why: 'VO2 max falls roughly 10% per decade after thirty, and the drop accelerates once it goes unchallenged. It is also the most reversible of the longevity markers: moving from the bottom quartile to merely average is associated with a larger reduction in mortality risk than almost any other single change.',
    input: { label: 'Distance in 12 minutes', units: [['mi', 1609.34], ['m', 1]], hint: 'Converted to an estimated VO2 max, then scored for your age and sex.' },
    /* Cooper: VO2max ~= (metres - 504.9) / 44.73. Median VO2max by age band
       from population data; roughly normal within a band. */
    norms: {
      median: { male:   [[29, 42], [39, 40], [49, 37], [59, 34], [69, 30], [199, 26]],
                female: [[29, 35], [39, 33], [49, 31], [59, 28], [69, 25], [199, 22]] },
      sd: 7
    },
    score(v, s) {
      if (!(v > 0)) return 0;                       /* v arrives in metres */
      const vo2 = (v - 504.9) / 44.73;
      const sex = s.sex === 'male' ? 'male' : 'female';
      const m = fpBand(this.norms.median[sex], s.age || 45);
      return fpPct((vo2 - m) / this.norms.sd);
    },
    blurb: {
      foundation: 'Below the range for your age group — and this is the marker where improvement pays off most. Two easy aerobic sessions a week, long enough to be boring, moves it faster than anything harder.',
      core:       'A workable base. Adding one longer easy session and one harder interval session per week is the standard route from here.',
      advanced:   'Strong aerobic capacity for your age group. Protect it with volume; intensity alone will not hold this.',
      elite:      'Top-percentile aerobic capacity. This is the number most worth defending as you age — it buys more independent years than any other marker here.'
    }
  }
,

  /* ---------------- Endurance under load ---------------- */
  endurance_under_load: {
    id: 'endurance_under_load', axis: 'endurance_under_load', title: 'Endurance Under Load', duration: '4 min',
    kicker: '30-second sit-to-stand',
    description: 'How many times you can stand from a chair in thirty seconds. It measures repeated force production under your own bodyweight — leg endurance rather than peak strength — and it is one of the best-validated field tests there is, drawn from the Senior Fitness Test battery.',
    steps: [
      ['Setup requirements', 'A straight-backed chair about 17 inches (43 cm) high, against a wall so it cannot slide. No arms, or arms you will not use. A timer.'],
      ['Movement', 'Sit in the middle of the seat, feet flat, arms crossed over your chest with hands on opposite shoulders. On "go", stand fully upright, then sit back down completely. Repeat as many times as you can in thirty seconds.'],
      ['Measurement', 'Count every full stand. If you are more than halfway up when time expires, count it. Arms must stay crossed — pushing off your thighs makes this a different test.'],
      ['Contraindications', 'Skip this with acute knee or hip pain, recent lower-limb surgery, or if standing unaided is not currently safe for you.']
    ],
    why: 'Leg endurance is what actually fails first in daily life — the fourth flight of stairs, standing up from a low sofa, getting off the floor. It predicts future mobility limitation earlier and more reliably than grip or single-rep strength, and it is trainable at any age.',
    input: { label: 'Full stands in 30 seconds', units: [['reps', 1]], hint: 'Scored against age- and sex-referenced norms.' },
    /* Median full stands by age band. Anchored on the Senior Fitness Test
       (Rikli & Jones) tables for 60+, extended sensibly for younger adults. */
    norms: {
      median: { male:   [[39, 25], [49, 23], [59, 20], [69, 17], [79, 14], [199, 12]],
                female: [[39, 22], [49, 20], [59, 18], [69, 15], [79, 13], [199, 11]] },
      sd: 4.2
    },
    score(v, s) {
      if (!(v > 0)) return 0;
      const sex = s.sex === 'male' ? 'male' : 'female';
      const m = fpBand(this.norms.median[sex], s.age || 45);
      return fpPct((v - m) / this.norms.sd);
    },
    blurb: {
      foundation: 'Below the range for your age group. Sit-to-stands are their own remedy — three sets to near-failure, twice a week, moves this quickly.',
      core:       'A workable base. Add load (hold a dumbbell at the chest) or slow the descent to keep this climbing.',
      advanced:   'Strong leg endurance for your age group. Progress by loading it rather than by adding reps.',
      elite:      'Top-percentile leg endurance. This is the marker that quietly protects your independence — worth defending.'
    }
  },

  /* ---------------- Agility ---------------- */
  agility: {
    id: 'agility', axis: 'agility', title: 'Agility', duration: '4 min',
    kicker: '8-foot up-and-go',
    description: 'Stand from a chair, walk eight feet around a marker, and sit back down — timed. It measures the whole chain of getting up, changing direction and controlling deceleration, which is what actually keeps you upright when you catch a toe on a kerb. Faster is better on this one.',
    steps: [
      ['Setup requirements', 'The same chair against a wall, and a cone, bottle or shoe placed exactly 8 feet (2.44 m) in front of it, measured from the front edge of the seat. Clear floor, normal shoes.'],
      ['Movement', 'Start seated, back against the chair, hands on thighs, feet flat. On "go", stand, walk as quickly as you safely can around the marker (either side), return and sit fully back down.'],
      ['Measurement', 'Time from "go" to the moment you are seated again. Take two attempts with a minute between, and record the faster one. Walk — do not run.'],
      ['Contraindications', 'Skip this if you have any significant balance impairment, use a walking aid, or have been advised against unassisted turning.']
    ],
    why: 'Almost no fall happens standing still. It happens during a transition — rising, turning, changing direction — which is exactly what this test times. It declines earlier than straight-line walking speed, so it catches trouble sooner.',
    input: { label: 'Best time', units: [['sec', 1]], hint: 'Faster is better. Scored against age- and sex-referenced norms.' },
    /* Median seconds by age band, anchored on the Senior Fitness Test 8-ft
       up-and-go tables for 60+ and extended for younger adults. LOWER IS
       BETTER, so the z-score is inverted below. */
    norms: {
      median: { male:   [[39, 3.8], [49, 4.2], [59, 4.7], [69, 5.2], [79, 6.0], [199, 7.2]],
                female: [[39, 4.0], [49, 4.4], [59, 4.9], [69, 5.4], [79, 6.3], [199, 7.6]] },
      sd: 0.9
    },
    score(v, s) {
      if (!(v > 0)) return 0;
      const sex = s.sex === 'male' ? 'male' : 'female';
      const m = fpBand(this.norms.median[sex], s.age || 45);
      /* inverted: a smaller time is a better result */
      return fpPct((m - v) / this.norms.sd);
    },
    blurb: {
      foundation: 'Slower than the range for your age group. Practise the transition itself — stand, turn, sit, repeated deliberately — rather than only walking more.',
      core:       'A solid baseline. Add direction changes: lateral shuffles, carioca, and turning drills carry over directly.',
      advanced:   'Quick transitions for your age group. Keep the skill sharp with regular change-of-direction work.',
      elite:      'Top-percentile agility. This is the marker most protective against falls, and you are holding it well.'
    }
  }
,

  /* ---------------- Relational capacity ---------------- */
  relational_capacity: {
    id: 'relational_capacity', axis: 'relational_capacity', title: 'Relational Capacity', duration: '3 min',
    kicker: 'Social network inventory', kind: 'survey',
    description: 'Six questions about the people around you: how many you are in regular contact with, how many you could call on for help, and how many you can talk to about private things. Social connection is not a soft marker — weak social ties carry a mortality risk comparable to smoking, and larger than obesity or physical inactivity.',
    steps: [
      ['What this asks', 'Three questions about relatives and the same three about friends. Count people, not interactions.'],
      ['Answer honestly', 'Count only people you actually see or hear from — not everyone you could theoretically call. Undercounting is the more common error here than overcounting.'],
      ['Measurement', 'Each answer scores nought to five, for a total out of thirty. A total below twelve is the threshold researchers use to flag social isolation.'],
      ['Note', 'This is modelled on the structure of published social-network scales rather than being a reproduction of a clinical instrument. Treat it as a prompt to look at your connections, not a diagnosis.']
    ],
    why: 'Isolation acts on the body, not just the mood: it raises inflammatory markers, disrupts sleep, and predicts cognitive decline independently of how much you exercise. Of all eight markers here, this is the one most likely to be quietly neglected by someone who trains seriously.',
    survey: [
      'How many relatives do you see or hear from at least once a month?',
      'How many relatives could you call on for help if you needed it?',
      'How many relatives can you talk to about private matters?',
      'How many friends do you see or hear from at least once a month?',
      'How many friends could you call on for help if you needed it?',
      'How many friends can you talk to about private matters?'
    ],
    surveyOptions: ['0', '1', '2', '3-4', '5-8', '9+'],
    /* total out of 30; population centre ~17.5 */
    norms: { median: 17.5, sd: 6 },
    score(v) {
      return fpPct((v - this.norms.median) / this.norms.sd);
    },
    blurb: {
      foundation: 'This is in the range researchers associate with social isolation. It is also the most fixable marker here — one standing weekly contact, put in the diary like a training session, changes it.',
      core:       'A reasonable network. Depth matters more than breadth from here: one or two relationships you can be genuinely honest in outweigh a wider circle.',
      advanced:   'A strong network for regular contact and support. Worth protecting deliberately as schedules shift.',
      elite:      'An unusually well-connected result. On the evidence this is doing as much for your longevity as your training is.'
    }
  },

  /* ---------------- Working memory ---------------- */
  working_memory: {
    id: 'working_memory', axis: 'working_memory', title: 'Working Memory', duration: '5 min',
    kicker: 'Digit span', kind: 'digitspan',
    description: 'A sequence of digits appears one at a time; you type them back in order. The sequence gets longer until you miss twice at the same length. Your span — the longest run you can hold and reproduce — is a direct measure of working memory capacity.',
    steps: [
      ['Setup requirements', 'Somewhere quiet, for five minutes, with no one talking to you. Phone notifications off. This is genuinely sensitive to distraction.'],
      ['Movement', 'Watch the digits appear. When the sequence ends, type what you saw, in order. Do not write anything down and do not say them aloud — both turn this into a different test.'],
      ['Measurement', 'Two attempts at each length. Get either one right and the sequence grows; miss both and the test ends. Your score is the longest length you completed.'],
      ['Contraindications', 'None physical. Do not bother taking it exhausted or after a poor night — you will measure your sleep, not your memory.']
    ],
    why: 'Working memory is the scratchpad everything else runs on: following a conversation in a noisy room, holding a plan while executing it, keeping track mid-task. It declines gradually from the thirties, and the decline is steeper in people who are sedentary — which is one of the clearer links between training and cognition.',
    /* Forward digit span. Adult mean sits near seven, drifting down with age. */
    norms: {
      median: [[39, 7.0], [49, 6.8], [59, 6.5], [69, 6.2], [199, 5.8]],
      sd: 1.3
    },
    score(v, s) {
      if (!(v > 0)) return 0;
      const m = fpBand(this.norms.median, s.age || 45);
      return fpPct((v - m) / this.norms.sd);
    },
    blurb: {
      foundation: 'Below the typical span for your age group. Worth retaking rested before reading anything into it — this test punishes tiredness harder than it punishes age.',
      core:       'A typical span for your age group. Aerobic work is the intervention with the best evidence behind it for holding this steady.',
      advanced:   'Above the typical span for your age group. Keep loading it — novelty and complexity, not repetition of things you already do well.',
      elite:      'An excellent span. Combined with your aerobic work this is the pairing most associated with cognitive resilience later on.'
    }
  }
};

/* Markers The Standard scores but we can't yet, shown honestly as locked. */
const FP_PENDING = {};

function fpState() { if (!S.fp) S.fp = {}; return S.fp; }
function fpGet(axis) { return fpState()[axis] || null; }
function fpSave(axis, raw, unit, score) {
  fpState()[axis] = { raw, unit, score, tier: fpTier(score).key, date: isoDate(new Date()) };
  save();
}

/* ---------- radar ---------- */
function fpRadar(canvas) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = W;            /* square */
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 68;
  const n = FP_AXES.length;
  const ang = i => (i / n) * Math.PI * 2 - Math.PI / 2;
  const grid = cssVar('--chart-grid', 'rgba(255,255,255,.06)');
  const dim  = cssVar('--dim', '#555555');

  /* web: 4 rings + spokes */
  ctx.strokeStyle = grid; ctx.lineWidth = 1;
  for (let r = 1; r <= 4; r++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = ang(i), x = cx + Math.cos(a) * R * r / 4, y = cy + Math.sin(a) * R * r / 4;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
  }

  /* scored polygon */
  const vals = FP_AXES.map(ax => { const e = fpGet(ax.key); return e ? e.score : 0; });
  if (vals.some(v => v > 0)) {
    ctx.beginPath();
    vals.forEach((v, i) => {
      const a = ang(i), r = R * (v / 100);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = cssVar('--accent-soft', 'rgba(170,255,0,.12)'); ctx.fill();
    ctx.strokeStyle = cssVar('--accent-ink', '#aaff00'); ctx.lineWidth = 2; ctx.stroke();
    /* each vertex takes its own tier colour, so the legend below the chart
       actually decodes something rather than sitting there decoratively */
    vals.forEach((v, i) => {
      if (!v) return;
      const a = ang(i), r = R * (v / 100);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 4, 0, Math.PI * 2);
      ctx.fillStyle = cssVar('--tier-' + fpTier(v).key, cssVar('--accent-ink', '#aaff00'));
      ctx.fill();
      ctx.strokeStyle = cssVar('--panel', '#1a1a1a'); ctx.lineWidth = 1.5; ctx.stroke();
    });
  }

  /* axis labels */
  ctx.font = '700 8.5px -apple-system,Segoe UI,Roboto,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  FP_AXES.forEach((ax, i) => {
    const a = ang(i), cs = Math.cos(a), sn = Math.sin(a);
    /* anchor the text away from the wheel instead of centring it, or the
       left- and right-hand labels run off the edge of the canvas */
    ctx.textAlign = cs > 0.3 ? 'left' : cs < -0.3 ? 'right' : 'center';
    const lx = cx + cs * (R + 8), ly = cy + sn * (R + 12);
    const e = fpGet(ax.key);
    const lines = e ? ax.label.concat(e.score + '%') : ax.label;
    lines.forEach((ln, k) => {
      ctx.fillStyle = (e && k === lines.length - 1) ? cssVar('--accent-ink', '#aaff00') : dim;
      ctx.fillText(ln, lx, ly + (k - (lines.length - 1) / 2) * 10);
    });
  });
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}

/* ---------- screen ---------- */
function renderFingerprint() {
  titleEl.textContent = 'Fingerprint';
  subEl.textContent   = 'Your 8-marker health profile';

  const cards = FP_AXES.map(ax => {
    const a = FP_ASSESS[ax.key], e = fpGet(ax.key);
    if (!a) return `<div class="fp-card locked">
        <div class="fp-card-nm">${ax.name}</div>
        <div class="fp-card-sub">${FP_PENDING[ax.key] || 'Not yet available'}</div>
      </div>`;
    const t = e ? fpTier(e.score) : null;
    return `<div class="fp-card">
        <div class="fp-card-nm">${ax.name}</div>
        <div class="fp-card-sub">${e
          ? `<b class="fp-score">${e.score}%</b> · ${t.name} <span class="dim">· ${e.date}</span>`
          : 'Not yet assessed'}</div>
        <button class="btn ${e ? 'secondary' : 'primary'} small fp-take" data-fp="${ax.key}">
          ${e ? 'Retake' : 'Take assessment'}</button>
      </div>`;
  }).join('');

  const done = FP_AXES.filter(ax => fpGet(ax.key)).length;
  view.innerHTML = `<div class="screen">
    <div class="card fp-radar-card"><canvas id="fpRadar" class="fp-radar"></canvas>
      <div class="fp-legend">${FP_TIERS.map(t =>
        `<span class="fp-leg"><i class="fp-dot ${t.key}"></i>${t.name}</span>`).join('')}</div>
    </div>
    <h2 class="section">Assessments · ${done} of ${FP_AXES.length} scored</h2>
    <div class="fp-grid">${cards}</div>
    <div class="card"><div class="tiny muted" style="line-height:1.55">
      Scores are percentiles against age- and sex-referenced norms, so 50% is
      average <em>for you</em>, not a pass mark. Set your age and sex in Setup —
      they drive the whole calculation. Markers without a protocol yet are shown
      unscored rather than guessed at.</div></div>
  </div>`;

  fpRadar(document.getElementById('fpRadar'));
  view.querySelectorAll('.fp-take').forEach(b => b.onclick = () => fpOpen(b.dataset.fp));
}

/* ---------- assessment sheet ---------- */
let fpCur = null, fpUnit = 0;
function fpOpen(axis) {
  const a = FP_ASSESS[axis]; if (!a) return;
  fpCur = axis; fpUnit = 0;
  fpRenderSheet('protocol');
}
function fpClose() { fpCur = null; const el = document.getElementById('fpSheet'); if (el) el.remove(); }

/* ---------------------------------------------------------------------
   Two assessment formats that are not "type in a number".
   --------------------------------------------------------------------- */

let fpSurveyAns = [];
function fpSurveySheet(el, a) {
  if (fpSurveyAns.length !== a.survey.length) fpSurveyAns = a.survey.map(() => -1);
  const rows = a.survey.map((q, i) => `
    <div class="fp-q">
      <div class="fp-q-text">${i + 1}. ${q}</div>
      <div class="fp-q-opts">${a.surveyOptions.map((o, v) =>
        `<button class="fp-q-opt ${fpSurveyAns[i] === v ? 'on' : ''}" data-q="${i}" data-v="${v}">${o}</button>`).join('')}</div>
    </div>`).join('');
  const answered = fpSurveyAns.filter(x => x >= 0).length;
  const done = answered === a.survey.length;
  el.innerHTML = `<div class="fp-panel">
    <div class="fp-panel-head">
      <div><div class="fp-kicker">Enter your result</div><div class="fp-title">${a.title}</div></div>
      <button class="prof-close" id="fpX">✕</button>
    </div>
    ${rows}
    <div class="hint">${answered} of ${a.survey.length} answered</div>
    <button class="btn primary" id="fpCalc" ${done ? '' : 'disabled'}>Calculate my score</button>
    <button class="btn secondary" id="fpCancel">Cancel</button>
  </div>`;
  el.querySelector('#fpX').onclick = () => { fpSurveyAns = []; fpClose(); };
  el.querySelector('#fpCancel').onclick = () => { fpSurveyAns = []; fpClose(); };
  el.querySelectorAll('.fp-q-opt').forEach(b => b.onclick = () => {
    fpSurveyAns[+b.dataset.q] = +b.dataset.v;
    fpSurveySheet(el, a);                       /* re-render keeps state visible */
  });
  const calc = el.querySelector('#fpCalc');
  if (calc && done) calc.onclick = () => {
    const total = fpSurveyAns.reduce((n, v) => n + Math.max(0, v), 0);
    const sc = a.score(total, S.settings);
    fpSave(a.axis, total, 'pts', sc);
    fpSurveyAns = [];
    fpRenderSheet('result', sc);
  };
}

/* digit span: show a sequence, type it back, grow until two misses at a length */
let fpDig = null;
function fpDigitSheet(el, a) {
  if (!fpDig) fpDig = { level: 3, fails: 0, best: 0, phase: 'ready', seq: [] };
  const d = fpDig;

  const finish = () => {
    const best = d.best;
    fpDig = null;
    if (!best) { toast('No length completed — try again when rested'); fpClose(); return; }
    const sc = a.score(best, S.settings);
    fpSave(a.axis, best, 'digits', sc);
    fpRenderSheet('result', sc);
  };

  const wrap = inner => {
    el.innerHTML = `<div class="fp-panel fp-dig">
      <div class="fp-panel-head">
        <div><div class="fp-kicker">Digit span</div><div class="fp-title">${a.title}</div></div>
        <button class="prof-close" id="fpX">✕</button>
      </div>${inner}</div>`;
    el.querySelector('#fpX').onclick = () => { fpDig = null; fpClose(); };
  };

  if (d.phase === 'ready') {
    wrap(`<div class="dig-stage">
        <div class="dig-level">${d.level} digits</div>
        <div class="dig-hint">${d.best ? 'Best so far: ' + d.best + ' digits. ' : ''}Watch the sequence, then type it back in order.</div>
      </div>
      <button class="btn primary" id="digGo">Show sequence</button>
      <button class="btn secondary" id="digQuit">${d.best ? 'Finish and score' : 'Cancel'}</button>`);
    el.querySelector('#digGo').onclick = () => {
      d.seq = Array.from({ length: d.level }, () => Math.floor(Math.random() * 10));
      d.phase = 'show';
      fpDigitSheet(el, a);
    };
    el.querySelector('#digQuit').onclick = () => { if (d.best) finish(); else { fpDig = null; fpClose(); } };
    return;
  }

  if (d.phase === 'show') {
    wrap(`<div class="dig-stage"><div class="dig-digit" id="digDigit">&nbsp;</div>
      <div class="dig-hint">Watching…</div></div>`);
    const cell = el.querySelector('#digDigit');
    let i = 0;
    /* Each showing gets a token. Re-entering this phase — reopening the test,
       a re-render, a double tap on Show — starts a new chain, and without a
       token the old one keeps writing digits and flipping phase underneath it.
       Two chains interleaving left the test stuck on "Watching..." forever. */
    d.run = (d.run || 0) + 1;
    const myRun = d.run;
    const step = () => {
      if (!fpDig || fpDig !== d || d.phase !== 'show' || d.run !== myRun) return;
      if (i >= d.seq.length) {
        cell.innerHTML = '&nbsp;';
        d.phase = 'input';
        setTimeout(() => fpDigitSheet(el, a), 260);
        return;
      }
      cell.textContent = d.seq[i++];
      setTimeout(() => { cell.innerHTML = '&nbsp;'; setTimeout(step, 220); }, 700);
    };
    setTimeout(step, 420);
    return;
  }

  if (d.phase === 'input') {
    wrap(`<div class="dig-stage">
        <input class="dig-input" id="digIn" inputmode="numeric" autocomplete="off"
               placeholder="${'•'.repeat(d.level)}" />
        <div class="dig-hint">Type the ${d.level} digits in order</div>
      </div>
      <button class="btn primary" id="digSubmit">Check</button>`);
    const inp = el.querySelector('#digIn');
    setTimeout(() => inp.focus(), 40);
    const submit = () => {
      const ok = inp.value.replace(/[^0-9]/g, '') === d.seq.join('');
      if (ok) { d.best = d.level; d.level++; d.fails = 0; }
      else { d.fails++; }
      if (!ok && d.fails >= 2) { finish(); return; }
      toast(ok ? 'Correct — going longer' : 'Missed — one more try at ' + d.level);
      d.phase = 'ready';
      fpDigitSheet(el, a);
    };
    el.querySelector('#digSubmit').onclick = submit;
    inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
    return;
  }
}

function fpRenderSheet(stage, payload) {
  const a = FP_ASSESS[fpCur]; if (!a) return;
  let el = document.getElementById('fpSheet');
  if (!el) { el = document.createElement('div'); el.id = 'fpSheet'; el.className = 'fp-sheet'; document.body.appendChild(el); }

  if (stage === 'protocol') {
    el.innerHTML = `<div class="fp-panel">
      <div class="fp-panel-head">
        <div><div class="fp-kicker">Longevity marker</div>
             <div class="fp-title">${a.title}</div></div>
        <button class="prof-close" id="fpX">✕</button>
      </div>
      <div class="fp-lede">${a.description}</div>
      <div class="fp-chips"><span class="fp-chip">⏱ ${a.duration}</span>
        <span class="fp-chip">${a.kicker}</span></div>
      <ol class="fp-steps">${a.steps.map(([t, b]) =>
        `<li><b>${t}</b><span>${b}</span></li>`).join('')}</ol>
      <h2 class="section">Why it matters</h2>
      <div class="fp-lede">${a.why}</div>
      <button class="btn primary" id="fpStart">${fpGet(a.axis) ? 'Retake' : 'Start'}</button>
      <button class="btn secondary" id="fpCancel">Cancel</button>
    </div>`;
    document.getElementById('fpX').onclick = fpClose;
    document.getElementById('fpCancel').onclick = fpClose;
    document.getElementById('fpStart').onclick = () => fpRenderSheet('input');
    return;
  }

  if (stage === 'input') {
    if (a.kind === 'survey')    { fpSurveySheet(el, a); return; }
    if (a.kind === 'digitspan') { fpDigitSheet(el, a);  return; }
    const u = a.input.units;
    el.innerHTML = `<div class="fp-panel">
      <div class="fp-panel-head">
        <div><div class="fp-kicker">Enter your result</div>
             <div class="fp-title">How did you do?</div></div>
        <button class="prof-close" id="fpX">✕</button>
      </div>
      <div class="field">
        <label>${a.input.label}</label>
        ${u.length > 1 ? `<div class="seg" id="fpUnits">${u.map(([nm], i) =>
          `<button data-u="${i}" class="${i === fpUnit ? 'on' : ''}">${nm}</button>`).join('')}</div>` : ''}
        <input type="number" inputmode="decimal" id="fpVal" placeholder="0" />
        <div class="hint">${a.input.hint}</div>
      </div>
      <button class="btn primary" id="fpCalc">Calculate my score</button>
      <button class="btn secondary" id="fpCancel">Cancel</button>
    </div>`;
    document.getElementById('fpX').onclick = fpClose;
    document.getElementById('fpCancel').onclick = fpClose;
    el.querySelectorAll('#fpUnits button').forEach(b => b.onclick = () => {
      fpUnit = +b.dataset.u;
      el.querySelectorAll('#fpUnits button').forEach(x => x.classList.toggle('on', +x.dataset.u === fpUnit));
    });
    const inp = document.getElementById('fpVal');
    setTimeout(() => inp.focus(), 30);
    document.getElementById('fpCalc').onclick = () => {
      const v = parseFloat(inp.value);
      if (!(v > 0)) { toast('Enter your result first'); return; }
      const base = v * a.input.units[fpUnit][1];      /* convert to the norm's unit */
      const sc = a.score(base, S.settings);
      fpSave(a.axis, v, a.input.units[fpUnit][0], sc);
      fpRenderSheet('result', sc);
    };
    return;
  }

  if (stage === 'result') {
    const t = fpTier(payload);
    el.innerHTML = `<div class="fp-panel fp-result tier-${t.key}">
      <div class="fp-kicker center">Results</div>
      <div class="fp-title center">${a.title} complete</div>
      <div class="fp-big">${payload}%</div>
      <div class="center"><span class="fp-pill ${t.key}">${t.name} · ${t.min}-${t.max}</span></div>
      <div class="fp-lede center">${a.blurb[t.key]}</div>
      <button class="btn primary" id="fpDone">Back to Fingerprint</button>
      <div class="tiny muted center">You can retake this assessment at any time.</div>
    </div>`;
    document.getElementById('fpDone').onclick = () => { fpClose(); render(); };
    if (t.key === 'elite') confetti();
  }
}

backfillHistory();
syncAchievements();
render();
/* auto-resume cloud sync if previously signed in */
if (loadCloud().enabled) { setTimeout(cloudInit, 0); }
if ('serviceWorker' in navigator) {
  /* Registering alone is not enough. An installed PWA opened from the home
     screen does not navigate, so the browser may never re-check sw.js and the
     app can sit on a months-old worker — which is how a phone ends up running
     code many versions behind while the site itself is current. Ask for an
     update explicitly on launch, and again whenever the app is brought back to
     the foreground. */
  let swReg = null;
  const swCheck = () => { try { if (swReg) swReg.update(); } catch {} };
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => { swReg = reg; reg.update().catch(() => {}); })
      .catch(() => {});
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') swCheck();
  });
  // Auto-reload when a new service worker activates (picks up new version immediately)
  navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'SW_UPDATED') return;
    /* one reload per activation — never a loop if a worker keeps re-claiming */
    try {
      const last = +(sessionStorage.getItem('tm_swreload') || 0);
      if (Date.now() - last < 10000) return;
      sessionStorage.setItem('tm_swreload', String(Date.now()));
    } catch {}
    location.reload();
  });
}
