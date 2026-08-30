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
  dbMax: 50,          /* heaviest dumbbell/kettlebell owned, per hand — see capHand */
  readiness: null,    /* 1-4 how you slept / feel today; suggests a tier, never sets one */
  readinessDay: null,
  waveLoad: true,     /* ramp into a top set, back off, repeat — see waveFactors */
  autoDeload: true,   /* drop 10% after 3 straight failed sessions — see STALL_LIMIT.
                         Weight NEVER rises on a miss either way; this only controls
                         whether a repeated stall drops it. */
  /* What is actually in the room. The generator's exercises carry their own
     equipment lists, so this is a set of things owned rather than a tier.
     Corrected 2026-08-29: there are no stairs to use, and there IS a
     treadmill — it is just not the first choice. Punching bag stays off; it
     is disliked. The bike is a road bike. */
  kit: ['barbell','dumbbells','kettlebell','bench','box','bands','jump-rope','bike','treadmill','pull-up-bar','mat','yoga-ball'],
  bodyweight: 145,   /* Kandy's. A saved profile keeps its own value; this
                          only seeds a fresh one. Drives the guide worked
                          examples via guideVars, and Wilks scoring. */
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
  incPerSession: { squat: 2.5, bench: 5,   deadlift: 5,  press: 5,   clean: 2.5 },
  /* Footprint — constraints that should follow you between programs rather
     than being baked into one. Empty by default: with no cautions set the
     substitution pass hands back the very same array, so nothing changes for
     anyone who has not asked for it. See KNEE_SWAP and footprintDay(). */
  footprint: { jointCautions: [], priorityMuscles: [] }   /* 'knees' · 'glutes' */
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
   The program that actually consumes the Fingerprint. Every other plan
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
  const loaded = !!loadEntry(ex.key);
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
    fpxT('deadhang', 'Dead Hang', '🪢', 30, 3, 'Shoulders active, no straps', 'bodyweight'),
    fpxT('farmcarry', 'Farmer Carry', '🧳', 40, 3, 'Heavy, tall, no shrugging', 'dumbbells'),
    fpx('dbrow', 'DB Bent-Over Row', '💪', 10, 'Squeeze the blades, no swing', 'dumbbells'),
    fpxT('towelhang', 'Towel Hang', '🧻', 20, 2, 'Over the bar — brutal on the grip', 'bodyweight'),
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

/* ---------------------------------------------------------------------
   The Standard's Protocols page lists every workout against the longevity
   marker it trains, which is the thing worth copying: a session is not a
   random circuit, it is an intervention aimed at one marker. The marker
   column below is theirs, recorded as printed — including Balance & Control
   sitting under Functional Strength, which reads oddly but is what the page
   says.

   Five of these are open on her account and their contents were read from the
   app. The other seven are locked, so the name and the marker are theirs and
   the programming is ours in that spirit — 'bias' just steers which pool
   entries the session prefers, so equipment fallback and fpProgress keep
   working exactly as before.
   --------------------------------------------------------------------- */
const FP_SESSIONS = [
  { key: 'balance_control',  name: 'Balance & Control',   marker: 'functional_strength', open: true,
    bias: ['slstance', 'tandem', 'birddog', 'airsquattempo', 'atgsplit', 'slrdl'] },
  { key: 'continuous_cap',   name: 'Continuous Capacity',  marker: 'endurance_under_load', open: true,
    bias: ['carryintervals', 'marchcarry', 'walkinglunge', 'plank', 'lunge'] },
  { key: 'dynamic_load',     name: 'Dynamic Load',         marker: 'endurance_under_load', open: true,
    bias: ['trapdeadlift', 'dblunge', 'splitsquatecc', 'suitcase', 'lunge'] },
  { key: 'ground_press',     name: 'Ground & Press',       marker: 'agility', open: true,
    bias: ['plankdrag', 'shuffle', 'carioca', 'sidestep', 'woodchop'] },
  { key: 'foot_health',      name: 'Ground-Up: Foot Health', marker: 'balance', open: true, recovery: true,
    bias: ['tibraise', 'slstance', 'tandem', 'crosscrawl', 'deepsquat'] },

  { key: 'thirty_thirty',    name: '30/30',                marker: 'vo2_max',
    bias: ['intervals', 'jumprope', 'shadowbox'] },
  { key: 'slow_burn',        name: 'The Slow Burn',        marker: 'vo2_max',
    bias: ['zone2', 'bike', 'brisk'] },
  { key: 'vertical_output',  name: 'Vertical Output',      marker: 'functional_strength',
    bias: ['boxjump', 'squatjump', 'broadjump', 'pushpress', 'stepup'] },
  { key: 'elastic_engine',   name: 'Elastic Engine',       marker: 'agility',
    bias: ['highknees', 'carioca', 'shuffle', 'sidestep'] },
  { key: 'sprint_repeat',    name: 'Sprint Repeat',        marker: 'agility',
    bias: ['shuffle', 'highknees', 'sidestep', 'plankdrag'] },
  { key: 'loaded_flow',      name: 'Loaded Aerobic Flow',  marker: 'balance',
    bias: ['slrdlreach', 'crosscrawl', 'pushuptap', 'birddog', 'slrdl'] },
  { key: 'loaded_power',     name: 'Loaded Power',         marker: 'peripheral_strength',
    bias: ['trapcarry', 'frontrackcarry', 'farmcarry', 'deadhang', 'towelhang'] }
];

/* ---------------------------------------------------------------------
   The five protocols that are unlocked on the account, transcribed from the
   app itself — exercise for exercise, in order, with their own set counts.
   The loads are not copied: those come from The Standard's own algorithm tier
   for her, and this app already has its own progression. Movements map onto
   keys that already exist here, so the How-to text, the videos, the equipment
   filter and fpProgress all keep working.

   The seven locked protocols have no list here on purpose. They fall back to
   pool selection steered by their bias, and the session note says the content
   is ours rather than theirs.
   --------------------------------------------------------------------- */
function pex(base, sets) { const e = Object.assign({}, base); e.sets = sets; return e; }

const PROTOCOL_EX = {
  balance_control: () => [
    pex(fpx('woodchop',      'Dumbbell Wood Chopper',    '🪓',  8, 'Up to 8 each side — rotate from the ribs',   'dumbbells', true), 2),
    pex(fpx('splitsquatecc', 'Dumbbell Split Squat',     '🦵',  8, 'Up to 8 each leg — chest tall',              'dumbbells', true), 2),
    pex(fpx('sadbpress',     'Single-Arm Dumbbell Press','🙌',  8, 'Up to 8 each side — do not lean away',       'dumbbells', true), 2),
    pex(fpx('slrdl',         'Single-Leg RDL',           '🦩',  6, '6 each leg — slow, the wobble is the work',  'bodyweight', true), 2),
    pex(fpxT('suitcase',     'Suitcase Carry',           '🧳', 30, 2, '20-40 s each side, one side loaded',      'dumbbells', true), 2)
  ],
  continuous_cap: () => [
    pex(fpxT('carryintervals', 'Dumbbell Carry Intervals', '🧳', 120, 3, '2 min on / 1 min off — posture is the stop signal', 'dumbbells'), 3),
    pex(fpxT('jumprope',       'Jump Rope',                '🪢', 120, 2, '2 min continuous',                                  'bodyweight'), 2),
    pex(fpxT('kbswing',        'Light Kettlebell Swings',  '🔔', 120, 3, '2 min — hinge and snap, arms are ropes',            'dumbbells'), 3),
    pex(fpxT('stepup',         'Step Ups',                 '🪜',  30, 4, '30 s on / 30 s off — drive through the heel',       'bodyweight'), 4)
  ],
  dynamic_load: () => [
    pex(fpx('sardl',          'Barbell RDL',          '🏋️', 10, 'Up to 10 — hinge, flat back, bar close', 'gym'), 2),
    pex(fpxT('farmcarry',     'Heavy Carry Complex',  '🧳', 30, 2, '30 s heavy — tall, no shrugging',      'dumbbells'), 2),
    pex(fpx('stepup',         'Dumbbell Step-Ups',    '🪜',  8, 'Up to 8 each leg — drive through the heel', 'dumbbells', true), 2),
    pex(fpx('declinepushup',  'Decline Push-Up',      '📐',  6, 'Up to 6 — feet raised, hips level',       'bodyweight'), 2),
    pex(fpx('walkinglunge',   'Walking Lunge',        '🚶',  8, 'Up to 8 each leg — long steps',           'dumbbells', true), 2)
  ],
  ground_press: () => [
    pex(fpx('dbrow',       'Dumbbell Row',           '💪', 10, 'Up to 10 — squeeze the blades, no swing', 'dumbbells'), 2),
    pex(fpx('pushpress',   'Dumbbell Push Press',    '🙌',  8, 'Up to 8 — legs start it, shoulders finish', 'dumbbells'), 2),
    pex(fpx('dblunge',     'Dumbbell Reverse Lunge', '🦵',  8, 'Up to 8 each leg — torso tall',           'dumbbells', true), 2),
    pex(fpxT('farmcarry',  'Farmer Carry',           '🧳', 25, 2, '20-30 s — heavy, tall, no shrugging',   'dumbbells'), 2),
    pex(fpx('gobletsquat', 'Goblet Squat',           '🏋️', 10, 'Up to 10 — elbows inside the knees',      'dumbbells'), 2)
  ],
  /* ------------------------------------------------------------------
     The seven locked protocols.

     Their contents cannot be read — they are paywalled, the page payload is
     not extractable, and Super Age publishes no exercise lists for them. So
     these are NOT transcripts. Each is built from the three things that ARE
     known — the protocol's name, the longevity marker the Protocols page
     lists it against, and its stated duration — laid out in the template the
     five readable protocols all share: four or five movements, two to four
     sets, a carry or a hang wherever grip is the marker.

     The session note keys off sess.open, not off whether a list exists here,
     so these days still say the session is ours rather than theirs. That is
     deliberate: filling in the exercises must not quietly upgrade the claim.
     ------------------------------------------------------------------ */
  thirty_thirty: () => [
    pex(fpxT('bike',      'Bike 30/30',       '🚴', 30, 8, '30 s hard / 30 s easy — the name is the protocol', 'bodyweight'), 8),
    pex(fpxT('jumprope',  'Jump Rope 30/30',  '🪢', 30, 6, '30 s on / 30 s off',                               'bodyweight'), 6),
    pex(fpxT('highknees', 'High Knees',       '🏃', 30, 4, '30 s quick feet, tall posture',                    'bodyweight'), 4),
    pex(fpxT('mtnclimb',  'Mountain Climbers','🧗', 30, 4, '30 s — hips low, quick feet',                      'bodyweight'), 4)
  ],
  slow_burn: () => [
    pex(fpxT('bike',  'Long Ride',   '🚴', 2400, 1, '40 min steady — you can still hold a conversation', 'bodyweight'), 1),
    pex(fpxT('brisk', 'Cool-Down Walk', '🚶', 600, 1, '10 min easy, nose breathing',                     'bodyweight'), 1)
  ],
  vertical_output: () => [
    pex(fpx('boxjump',    'Box Jump',            '📦', 5, 'Land soft, step down — never jump down', 'bodyweight'), 3),
    pex(fpx('squatjump',  'Squat Jumps',         '🔥', 6, 'Explosive, land soft',                    'bodyweight'), 3),
    pex(fpx('broadjump',  'Standing Broad Jump', '➡️', 5, 'Max distance, reset every rep',           'bodyweight'), 3),
    pex(fpx('pushpress',  'Dumbbell Push Press', '🙌', 8, 'Legs start it, shoulders finish it',      'dumbbells'), 3)
  ],
  elastic_engine: () => [
    pex(fpxT('hops',      'Pogo Hops',   '🦘', 45, 3, 'Stiff ankles, minimal ground time', 'bodyweight'), 3),
    pex(fpxT('skaters',   'Skater Bounds','⛸️', 30, 3, 'Side to side, stick the landing',  'bodyweight'), 3),
    pex(fpxT('carioca',   'Carioca',     '🔀', 30, 2, 'Grapevine, both directions',        'bodyweight'), 2),
    pex(fpxT('plankjack', 'Plank Jacks', '🧘', 30, 3, 'Hips still, feet quick',            'bodyweight'), 3)
  ],
  sprint_repeat: () => [
    pex(fpxT('bike',      'Bike Sprints',   '🚴', 20, 6, '20 s max / 90 s easy — full recovery between', 'bodyweight'), 6),
    pex(fpx('shuffle',    'Lateral Shuffle','↔️', 10, '5 m out and back, stay low',                      'bodyweight'), 4),
    pex(fpxT('buttkick',  'Butt Kicks',     '🦵', 20, 3, '20 s quick turnover',                           'bodyweight'), 3),
    pex(fpxT('highknees', 'High Knees',     '🏃', 20, 3, '20 s, tall posture',                            'bodyweight'), 3)
  ],
  loaded_flow: () => [
    pex(fpxT('marchcarry',  'March Carry',    '🧳', 40, 3, 'Knees to hip height, weights still', 'dumbbells'), 3),
    pex(fpx('slrdl',        'Single-Leg RDL', '🦩',  8, 'Slow — the wobble is the work',         'bodyweight', true), 3),
    pex(fpx('crosscrawl',   'Cross Crawl March','🚶',12, 'Opposite elbow to knee, deliberate',   'bodyweight'), 3),
    pex(fpxT('suitcase',    'Suitcase Carry', '🧳', 30, 3, 'One side loaded — do not lean',       'dumbbells', true), 3)
  ],
  loaded_power: () => [
    pex(fpxT('trapcarry',      'Trap Bar Carry',  '🧳', 45, 3, 'Short even steps, shoulders back', 'gym'), 3),
    pex(fpxT('farmcarry',      'Farmer Carry',    '🧳', 40, 3, 'Heavy, tall, no shrugging',        'dumbbells'), 3),
    pex(fpxT('deadhang',       'Dead Hang',       '🪢', 30, 3, 'Shoulders active, no straps',      'bodyweight'), 3),
    pex(fpxT('frontrackcarry', 'Front Rack Carry','🧱', 40, 2, 'Elbows up, ribs down',             'dumbbells'), 2)
  ],
  foot_health: () => [
    pex(fpx('toeyoga',   'Toe Yoga and Toe Spread', '🦶', 10, '10 each way per foot — slow and deliberate', 'bodyweight', true), 1),
    pex(fpx('shortfoot', 'Short Foot',              '🦶',  8, '8 holds of 5 s per foot',                    'bodyweight', true), 1),
    pex(fpx('calfraise', 'Calf Raises',             '🦵', 12, 'Slow down — the lowering is the work',       'bodyweight'), 1),
    pex(fpx('anklerock', 'Ankle Dorsiflexion',      '🦶', 10, 'Knee to wall, heel stays down',              'bodyweight'), 1)
  ]
};

/* An explicit list still has to respect the equipment on hand: a barbell RDL
   is no use on a bodyweight day. Anything unusable is replaced by a pool pick
   for the same marker rather than silently dropped, so the session keeps its
   shape and its set count. */
function fpSessionExercises(sess, dayIdx) {
  const make = PROTOCOL_EX[sess.key];
  if (!make) return null;
  const seen = new Set();
  const out = [];
  make().forEach((e, n) => {
    /* Runnable is not enough: an earlier swap may already have taken this
       exact movement (a bodyweight Loaded Power substitutes Dead Hang for the
       trap bar carry, and then meets Dead Hang again as its own third item).
       Treat that as needing a substitute too, or it is accepted and then
       dropped as a duplicate, costing the session an exercise. */
    let pick = (canRun(e.needs) && !seen.has(e.key)) ? e : null;
    if (!pick) {
      /* the first substitute is often one already used by an earlier swap;
         walk the pool until an unused movement turns up, so a bodyweight day
         keeps five exercises rather than collapsing to three */
      /* Prefer the session's own marker, then its bias dropped, then any
         other pool. Endurance Under Load has only two bodyweight movements,
         so a bodyweight Dynamic Load needing four swaps cannot be served from
         that pool alone — without this it silently shrank to three. */
      const pools = [sess.marker].concat(Object.keys(FP_POOLS).filter(p => p !== sess.marker));
      for (let pi = 0; pi < pools.length && !pick; pi++) {
        for (let k = 0; k < 10 && !pick; k++) {
          const sub = fpPickFrom(pools[pi], dayIdx + n + k, (pi === 0 && k < 5) ? sess.bias : null);
          if (sub && !seen.has(sub.key)) pick = pex(sub, e.sets);
        }
      }
    }
    if (pick && !seen.has(pick.key)) { seen.add(pick.key); out.push(pick); }
  });
  return out.length ? out : null;
}

/* every session that trains this marker, in table order */
function fpSessionsFor(marker) {
  return FP_SESSIONS.filter(x => x.marker === marker);
}
/* Chosen from (marker, dayIdx) alone — nothing is stored. fpFocusPlan's cache
   key already covers both, so adding a remembered rotation here would serve
   stale days. */
function fpSessionFor(marker, dayIdx) {
  const list = fpSessionsFor(marker);
  if (!list.length) return null;
  return list[((dayIdx % list.length) + list.length) % list.length];
}

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

/* Which marker leads the day.

   This used to be order[dayIdx % 3], so only the weakest three markers ever
   led a session — and with twelve protocols mapped to six markers that meant
   seven of them could never appear at all. The point of naming the sessions is
   lost if you only ever see five of them.

   The weakest three still lead three times as often as the rest; the
   difference is that the rest now lead at all. Derived from order and dayIdx
   only, so fpFocusPlan's cache key still covers it. */
function fpLeadCycle(order) {
  if (!order.length) return [];
  const weak = order.slice(0, 3);
  const rest = order.slice(3);
  const cyc = [];
  const rounds = Math.max(1, rest.length);
  for (let i = 0; i < rounds; i++) {
    weak.forEach(k => cyc.push(k));
    if (rest[i]) cyc.push(rest[i]);
  }
  return cyc;
}

function fpPickFrom(pool, i, bias) {
  const all = FP_POOLS[pool] || [];
  const usable = all.filter(e => canRun(e.needs));
  let list = usable.length ? usable : all.filter(e => e.needs === 'bodyweight');
  if (!list.length) return null;
  /* A session prefers its own movements, but only among the ones this
     equipment can actually run — so the bias never reintroduces a barbell on a
     bodyweight setup. If none of them survive that filter, fall back to the
     whole pool rather than returning nothing. */
  if (bias && bias.length) {
    const pref = list.filter(e => bias.indexOf(e.key) !== -1);
    if (pref.length) list = pref;
  }
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
  const cyc   = fpLeadCycle(order);
  const lead  = cyc.length ? cyc[dayIdx % cyc.length] : order[0];
  const second = order[(dayIdx + 1) % Math.max(1, Math.min(4, order.length))];
  const third  = order[(dayIdx + 2) % order.length];
  const sess = fpSessionFor(lead, dayIdx);
  const bias = sess ? sess.bias : null;
  /* only the leading marker's movements are steered by the session; the
     supporting two stay free so the day is not three variations of one idea */
  const picks = [lead, second, third]
    .map((p, n) => fpPickFrom(p, dayIdx + n, n === 0 ? bias : null))
    .filter(Boolean);
  /* a second movement from the leading weakness — it is the priority */
  const extra = fpPickFrom(lead, dayIdx + 4, bias);
  const week = Math.floor(dayIdx / 6);          /* 6 training days per block */
  const real = sess ? fpSessionExercises(sess, dayIdx) : null;
  const exercises = fpFocusWarmup()
    .concat((real || picks).map(e => fpProgress(e, week)));
  /* the extra movement is a pool-selection idea; a transcribed protocol
     already says how much work it is */
  if (!real && extra && !picks.includes(extra)) exercises.push(fpProgress(extra, week));

  const nice = k => (FP_AXES.find(a => a.key === k) || { name: k }).name;
  const e = fpGet(lead);
  const where = e ? ' — currently ' + e.score + '%, your weakest assessed marker.'
                  : ' — not yet assessed, so it is being trained on the assumption it needs work.';
  const basis = sess
    ? sess.name + ' is built on ' + nice(lead) + where +
      (sess.open
        ? ' These are the protocol\u2019s own exercises, in its own order; the loads are this app\u2019s.'
        : ' This one is locked on The Standard, so the name and the marker are theirs and the session is ours in that spirit.')
    : 'Today leads on ' + nice(lead) + where;
  return {
    title: sess ? sess.name : 'Focus · ' + nice(lead),
    note: 'Built from your Fingerprint. ' + basis +
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

/* =====================================================================
   Random workout generator — ported from the Synthesis app.

   The selection logic is theirs: pick a category, filter by difficulty, score
   every exercise for freshness, then weight the random draw toward what you
   have not done lately, roughly 60/40 basic to creative. What is new here is
   everything around it — the workout has to survive being rendered, ticked,
   progressed, tier-scaled and equipment-filtered by machinery that already
   exists, so a generated session is turned into an ordinary day-program day
   and nothing downstream needs to know where it came from.

   The one genuinely dangerous part is randomness. pdata() is read on every
   render, so generating inside it would reshuffle the workout under your
   hands as you ticked sets. Generation therefore happens once, is written to
   state, and is read back from there for ever after.
   ===================================================================== */
const GEN_TYPES = [
  { key: 'random',     name: 'Surprise me' },
  { key: 'full-body',  name: 'Full body' },
  { key: 'push',       name: 'Push' },
  { key: 'pull',       name: 'Pull' },
  { key: 'legs',       name: 'Legs' },
  { key: 'core',       name: 'Core' },
  { key: 'cardio',     name: 'Cardio' }
];
const GEN_DIFFS = [
  { key: 'easy',   name: 'Easy' },
  { key: 'medium', name: 'Medium' },
  { key: 'hard',   name: 'Hard' }
];
const GEN_SLOTS = 28;

function genState() {
  if (!S.gen) S.gen = { day: 1, log: {}, made: {}, used: {}, type: 'random', diff: 'medium' };
  const g = S.gen;
  if (g.day == null) g.day = 1;
  if (!g.log) g.log = {};
  if (!g.made) g.made = {};
  if (!g.used) g.used = {};
  if (!g.type) g.type = 'random';
  if (!g.diff) g.diff = 'medium';
  return g;
}

function kit() { return S.settings.kit || DEFAULTS.kit; }

/* Bodyweight mode means no equipment beyond a mat. Gym mode means the things
   actually owned — which is why this is a set test, not a rank comparison. */
function genCanRun(ex) {
  const need = ex.equip || [];
  if (!need.length) return true;
  if (haveEquip() === 'bodyweight') return need.every(k => k === 'mat');
  const have = kit();
  return need.every(k => have.indexOf(k) !== -1);
}

/* Map the generator's equipment list onto this app's coarse needs value, so a
   generated exercise passes through canRun() like any other. */
function genNeeds(ex) {
  const need = ex.equip || [];
  if (need.every(k => k === 'mat')) return 'bodyweight';
  if (need.indexOf('barbell') !== -1) return 'gym';
  return 'dumbbells';
}

function genPoolFor(type, diff) {
  let pool = GEN_EX.filter(e => {
    switch (type) {
      case 'upper-body': return e.cat === 'push' || e.cat === 'pull';
      case 'full-body':  return ['full-body','legs','push','pull'].indexOf(e.cat) !== -1;
      case 'random':     return true;
      default:           return e.cat === type;
    }
  });
  if (diff === 'easy')      pool = pool.filter(e => e.diff === 'easy' || e.diff === 'medium');
  else if (diff === 'hard') pool = pool.filter(e => e.diff === 'medium' || e.diff === 'hard');
  return pool.filter(genCanRun);
}

/* Freshness: never done ranks highest, done this week lowest. Theirs. */
function genFreshness(ex, used, now) {
  const last = used[ex.id];
  if (!last) return 3;
  const day = 86400000;
  if (last < now - 14 * day) return 2.5;
  if (last < now - 7 * day)  return 1.5;
  return 0.5;
}

function genWeightedDraw(pool, count, out, seen) {
  const avail = pool.slice();
  for (let i = 0; i < count && avail.length; i++) {
    const total = avail.reduce((a, e) => a + e._fresh, 0);
    let r = Math.random() * total, idx = 0;
    for (let j = 0; j < avail.length; j++) { r -= avail[j]._fresh; if (r <= 0) { idx = j; break; } }
    const pick = avail.splice(idx, 1)[0];
    if (!seen.has(pick.id)) { seen.add(pick.id); out.push(pick); }
  }
}

function genPickOne(list) { return list[Math.floor(Math.random() * list.length)]; }

/* Turn a generator record into the shape a day-program exercise has. The
   key is namespaced so a generated Push-Up can never collide with the
   Fingerprint pools' own pushups entry in logs or progression. */
function genEx(e, n) {
  const out = {
    key: 'gen_' + e.id,
    name: e.name,
    icon: GEN_ICON[e.cat] || '💪',
    sets: e.sets || 3,
    scheme: e.scheme || '',
    needs: genNeeds(e)
  };
  if (e.reps != null) out.reps = e.reps;
  if (e.sec != null)  out.sec = e.sec;
  if (e.side) out.side = true;
  return out;
}
const GEN_ICON = { push: '🙌', pull: '💪', legs: '🦵', core: '🧘', cardio: '🚴', 'full-body': '🔥' };

function genWarmCool(list, prefix) {
  return list.map(w => {
    const out = { key: prefix + slugKey(w.name), name: w.name, icon: prefix === 'gw_' ? '🔥' : '🧊',
                  sets: 1, scheme: w.scheme || '', needs: 'bodyweight' };
    if (w.sec != null) out.sec = w.sec; else out.reps = w.reps != null ? w.reps : 10;
    if (w.side) out.side = true;
    return out;
  });
}
function slugKey(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

function genBuild(type, diff) {
  const g = genState();
  const now = Date.now();
  const chosen = type === 'random'
    ? GEN_TYPES.filter(t => t.key !== 'random')[Math.floor(Math.random() * (GEN_TYPES.length - 1))].key
    : type;
  let pool = genPoolFor(chosen, diff);
  /* Nothing runnable in this category on today's equipment — widen rather than
     hand back an empty workout. */
  if (pool.length < 3) pool = genPoolFor('random', diff);
  pool = pool.map(e => Object.assign({ _fresh: genFreshness(e, g.used, now) }, e));

  let target = chosen === 'cardio' ? 3 : chosen === 'core' ? 5 : 6;
  if (diff === 'easy') target = Math.max(4, target - 1);
  else if (diff === 'hard') target = target + 1;

  const basic = pool.filter(e => e.kind === 'basic').sort((a, b) => b._fresh - a._fresh);
  const creative = pool.filter(e => e.kind === 'creative').sort((a, b) => b._fresh - a._fresh);
  const picked = [], seen = new Set();
  genWeightedDraw(basic, Math.ceil(target * 0.6), picked, seen);
  genWeightedDraw(creative, target - Math.ceil(target * 0.6), picked, seen);
  /* short of target because a pool ran dry — top up from whatever is left */
  if (picked.length < target) genWeightedDraw(pool, target - picked.length, picked, seen);
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = picked[i]; picked[i] = picked[j]; picked[j] = t; }

  const wuGroup = GEN_WARMUP[chosen] ? [chosen, 'general'] : ['general'];
  const cdGroup = GEN_COOLDOWN[chosen] ? [chosen, 'general'] : ['general'];
  const wu = [], cd = [];
  wuGroup.forEach(k => { const l = GEN_WARMUP[k]; if (l && l.length) wu.push(genPickOne(l)); });
  cdGroup.forEach(k => { const l = GEN_COOLDOWN[k]; if (l && l.length) cd.push(genPickOne(l)); });

  const name = (GEN_TYPES.find(t => t.key === chosen) || { name: chosen }).name;
  const dn = (GEN_DIFFS.find(d => d.key === diff) || { name: diff }).name;
  return {
    genType: chosen,
    genDiff: diff,
    ids: picked.map(e => e.id),
    title: name,
    note: 'Generated for you — ' + name.toLowerCase() + ', ' + dn.toLowerCase() +
          '. Exercises you have not done recently are favoured, so generating again gives you a different session. ' +
          'Tap Generate a different one if this is not what today needs.',
    exercises: genWarmCool(wu, 'gw_')
      .concat(picked.map(genEx))
      .concat(genWarmCool(cd, 'gc_'))
  };
}

/* Read the stored workout for a slot, making one the first time it is asked
   for. Never regenerates on its own — see the note at the top. */
function genDay(n) {
  const g = genState();
  if (!g.made[n]) { g.made[n] = genBuild(g.type, g.diff); save(); }
  return g.made[n];
}
function genRegenerate() {
  const g = genState();
  delete g.made[g.day];
  genDay(g.day);
  save();
  render();
  toast('New workout generated 🎲');
}
/* Mark everything in the finished session as done today, which is what makes
   the next generation prefer different movements. */
function genMarkUsed(n) {
  const g = genState();
  const w = g.made[n];
  if (!w) return;
  const now = Date.now();
  (w.ids || []).forEach(id => { g.used[id] = now; });
  save();
}
function genPlan() {
  const g = genState();
  const out = [];
  for (let i = 1; i <= GEN_SLOTS; i++) out.push(i === g.day ? genDay(i) : (g.made[i] || genPlaceholder()));
  return out;
}
function genPlaceholder() {
  return { title: 'Generated workout', note: 'This one is made when you reach it.',
           exercises: [{ key: 'gen_pending', name: 'Not generated yet', icon: '🎲', sets: 1, reps: 1,
                         scheme: 'Open this day to roll a workout', needs: 'bodyweight' }] };
}

/* Instructions for every generated movement, warm-up and cool-down, folded
   into the same table the How-to panel already reads. 110 exercises plus
   warm-ups and cool-downs arrive with their text written. */
function genRegisterTips() {
  if (typeof GEN_EX === 'undefined') return;
  GEN_EX.forEach(e => { if (e.body) FORM_TIPS['gen_' + e.id] = { title: e.name, body: e.body }; });
  [['gw_', GEN_WARMUP], ['gc_', GEN_COOLDOWN]].forEach(([p, db]) => {
    Object.keys(db).forEach(gk => db[gk].forEach(w => {
      if (w.body) FORM_TIPS[p + slugKey(w.name)] = { title: w.name, body: w.body };
    }));
  });
}

/* =====================================================================
   The nine complete programs from Synthesis's fitness tracker.

   These are fixed splits, not generated: Push Pull Legs, Upper/Lower, Full
   Body 3x, Knee-Friendly, Asian Pilates, Military Calisthenics & Pelvic
   Pilates, Mobility Snacks, Joint Mobility Mastery and MovesMethod. A split
   repeats — day 7 of a 6-day PPL is Push A again — so the days are cycled out
   to a month, which is how a split is meant to be run and keeps the cursor,
   the calendar and "day N of M" behaving as they do everywhere else.

   Their coaching text is richer than anything here: every movement carries
   instructions, a list of cues and, for all but three, an anatomy note. All of
   it is folded into the same table the How-to panel reads.
   ===================================================================== */
function synCfgKey(id) { return 'syn_' + id.replace(/-/g, '_'); }

function synPlanDays(plan) {
  const src = plan.days;
  if (!src.length) return [];
  const out = [];
  const target = Math.max(src.length, Math.ceil(28 / src.length) * src.length);
  for (let i = 0; i < target; i++) {
    const d = src[i % src.length];
    const cycle = Math.floor(i / src.length) + 1;
    out.push({
      title: d.title,
      note: (d.focus ? d.focus + '. ' : '') + plan.name + ' — ' + (plan.desc || '') +
            (src.length > 1 ? ' Round ' + cycle + ' of this ' + src.length + '-day split.' : ''),
      exercises: d.exercises
    });
  }
  return out;
}

let synPlanCache = {};
function synData(id) {
  const plan = (typeof SYN_PLANS === 'undefined' ? [] : SYN_PLANS).find(p => p.id === id);
  if (!plan) return [];
  if (!synPlanCache[id]) synPlanCache[id] = synPlanDays(plan);
  return synPlanCache[id];
}

function synRegisterTips() {
  if (typeof SYN_TIPS === 'undefined') return;
  Object.keys(SYN_TIPS).forEach(k => { if (!FORM_TIPS[k]) FORM_TIPS[k] = SYN_TIPS[k]; });
}

/* Icons and grouping per program, so the library reads at a glance. */
const SYN_ICO = {
  'ppl': '\u{1F3CB}\u{FE0F}', 'upper-lower': '\u{2696}\u{FE0F}', 'full-body': '\u{1F525}',
  'knee-friendly-2x': '\u{1F9BF}', 'asian-pilates-3x': '\u{1F338}',
  'military-pelvic-4x': '\u{1F396}\u{FE0F}', 'mobility-snacks-4x': '\u{1F34E}',
  'joint-mobility-mastery-7x': '\u{1F9B4}', 'movesmethod-workouts-3x': '\u{1F57A}',
  'dumbbell-49-supersets': '\u{1F517}', 'sims-lift-heavy-sprint-short': '\u{26A1}',
  'norwegian-4x4': '\u{1F6B4}'
};
const SYN_TAG = {
  'ppl': 'Strength', 'upper-lower': 'Strength', 'full-body': 'Strength',
  'knee-friendly-2x': 'Strength', 'asian-pilates-3x': 'Mobility',
  'military-pelvic-4x': 'Conditioning', 'mobility-snacks-4x': 'Mobility',
  'joint-mobility-mastery-7x': 'Mobility', 'movesmethod-workouts-3x': 'Mobility',
  'dumbbell-49-supersets': 'Strength', 'sims-lift-heavy-sprint-short': 'Strength',
  'norwegian-4x4': 'Conditioning'
};
const SYN_GRP = {
  'asian-pilates-3x': 'recovery', 'mobility-snacks-4x': 'recovery',
  'joint-mobility-mastery-7x': 'recovery', 'movesmethod-workouts-3x': 'recovery'
};

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
  fpfocus:  { get data() { return fpFocusPlan(); }, stateKey: 'fpfocus', label: 'Fingerprint Focus', sub: 'targets your weakest markers', holdLabel: 'Timed work' },
  gen:      { get data() { return genPlan(); }, stateKey: 'gen', label: 'Random Generator', sub: 'a fresh workout on demand', holdLabel: 'Timed work' }
};
/* Registered from the data file rather than written out one by one, so
   adding a program there is enough to make it appear everywhere. */
if (typeof SYN_PLANS !== 'undefined') {
  SYN_PLANS.forEach(p => {
    DAY_PROGRAMS['syn-' + p.id] = {
      get data() { return synData(p.id); },
      stateKey: synCfgKey(p.id),
      label: p.name,
      sub: p.desc.length > 46 ? p.desc.slice(0, 44) + '\u2026' : p.desc,
      holdLabel: 'Timed work'
    };
  });
}

/* =====================================================================
   FOOTPRINT — constraints that follow you from program to program

   The knee-protection rules were previously baked into individual
   programs: the glute step-down is a first-class tracked lift, and ATG
   split squats and ankle work are seeded through MOBILITY and SA_POOL.
   That holds right up until you switch program, at which point the
   guarantee silently disappears, because nothing in the code knows it is
   a rule. This makes it a rule.

   One substitution pass, applied in pdata() rather than in the session
   renderer, so the month calendar, the day card, the check-row ids and
   the session itself all agree about what you are doing.
   ===================================================================== */

/* Knee-safe stand-ins, in rotation order. Every one is already used by the
   knee-friendly-2x program, so nothing here invents a movement.

   A day never gets the same stand-in twice. Check-row ids are
   `key_setIndex` (see prepCheckIds), and no shipped day has ever had a
   repeated key — two copies of one movement would make a single tick
   check both. When the rotation runs out the movement is dropped rather
   than duplicated: if a day holds more knee-intensive work than there are
   safe movements to stand in for it, doing fewer things is the honest
   answer, not doing the same shallow split squat four times. */
const KNEE_POOL = [
  { key: 'syn_split_squat_shallow',           name: 'Split Squat (Shallow)',         needs: 'bodyweight', side: true,  part: 'Quads/Glutes' },
  { key: 'syn_controlled_glute_step_down',    name: 'Controlled Glute Step Down',    needs: 'bodyweight', side: true,  part: 'Glutes/Quads' },
  { key: 'syn_b_stance_rdl',                  name: 'B-Stance RDL',                  needs: 'bodyweight', side: true,  part: 'Hamstrings/Glutes' },
  { key: 'syn_lateral_band_walk',             name: 'Lateral Band Walk',             needs: 'dumbbells',  side: true,  part: 'Glute Medius' },
  { key: 'syn_stability_ball_hamstring_curl', name: 'Stability Ball Hamstring Curl', needs: 'dumbbells',  side: false, part: 'Hamstrings' }
];

/* deep knee flexion, heavy load through a bent knee, or impact */
const KNEE_AVOID = [
  'syn_squats', 'syn_goblet_squats', 'syn_front_squats', 'syn_bulgarian_split_squats',
  'sims_back_squat', 'wu_heel_elevated_squat', 'wu_sissy_squat',
  'syn_walking_lunges', 'wu_step_up', 'wu_weighted_step_up_glute',
  'sims_squat_jump', 'sims_box_jump'
];

/* the cautions currently switched on, as a stable cache key ('' when none) */
function fpCautions() {
  const f = (S.settings && S.settings.footprint) || DEFAULTS.footprint;
  return ((f && f.jointCautions) || []).slice().sort().join(',');
}
function kneeCare() { return fpCautions().split(',').indexOf('knees') >= 0; }

/* ---- priority muscles ----
   The glutes-first rule was the other half of the hardcoded footprint: the
   glute step-down is a first-class tracked lift, but nothing in the code
   knew that was a *rule*, so it evaporated the moment you changed program.

   Priority work moves earlier in the day, where you are freshest — it does
   not add or remove anything. Detection reads the body-part text the data
   already carries in `scheme` ("10-12 · Quads/Glutes"), so no new field is
   needed on any exercise. */
const PRIORITY_MUSCLES = {
  glutes: {
    label: 'Glutes',
    test: (e) => /glute/i.test(e.scheme || '') ||
                 /glute|hip thrust|hip bridge|bridge/i.test(e.name || '')
  }
};
function fpPriority() {
  const f = (S.settings && S.settings.footprint) || DEFAULTS.footprint;
  return ((f && f.priorityMuscles) || []).filter(m => PRIORITY_MUSCLES[m]);
}

/* Openers stay put. Warm-ups and explosive work lead a session for a
   reason — jumps are a bone stimulus that wants a fresh nervous system —
   so promoting glute work above them would break the thing it sits in.
   A leading run of single-set timed work counts too: that is the shape of
   breathwork and mobility openers, which carry no body-part text to spot
   them by. */
function isOpener(e) {
  return /plyometric|warm|mobility/i.test(e.scheme || '') ||
         /^wu/.test(e.key || '') ||
         /warm|jump|hop/i.test(e.name || '') ||
         (e.sec != null && (e.sets || 1) <= 1);
}

/* A recovery program is a flow: its order IS the exercise, and pulling a
   bridge to the front of a breath-led sequence breaks the session it sits
   in. Reordering only applies where the day is a list of work, not a
   choreography. */
function dayIsReorderable() {
  const key = String(S.program || '');
  if (key.indexOf('syn-') !== 0) return true;
  return typeof SYN_GRP === 'undefined' || SYN_GRP[key.slice(4)] !== 'recovery';
}

/* Reorders whole superset groups, never individual exercises: a pair whose
   members drifted apart would stop being a superset, since prepDayItems
   groups on `ss` adjacency. */
function priorityDay(d) {
  const want = fpPriority();
  if (!want.length || !d || !d.exercises || d.exercises.length < 2) return d;
  if (!dayIsReorderable()) return d;
  const tests = want.map(m => PRIORITY_MUSCLES[m].test);

  const groups = [];
  d.exercises.forEach(e => {
    const last = groups[groups.length - 1];
    if (last && e.ss != null && last.ss === e.ss) last.items.push(e);
    else groups.push({ ss: e.ss, items: [e] });
  });

  const opener = g => g.items.some(isOpener);
  const hit    = g => g.items.some(e => tests.some(t => t(e)));

  const head = [], pri = [], rest = [];
  let stillOpening = true;
  groups.forEach(g => {
    if (stillOpening && opener(g)) { head.push(g); return; }
    stillOpening = false;
    (hit(g) ? pri : rest).push(g);
  });
  if (!pri.length || !rest.length) return d;          /* nothing to move */

  const out = [];
  head.concat(pri, rest).forEach(g => out.push(...g.items));
  if (out.length !== d.exercises.length) return d;    /* never lose an exercise */
  if (out.every((e, i) => e === d.exercises[i])) return d;

  const label = want.map(m => PRIORITY_MUSCLES[m].label).join(' and ');
  return Object.assign({}, d, {
    exercises: out,
    note: (d.note ? d.note + ' ' : '') + label + ' first: that work moved earlier in the session, while you are fresh.'
  });
}

/* Reps-for-reps only: a timed movement is never turned into a rep one, and
   sets/reps/ss carry over untouched so tier scaling and the reps-hit
   progression keep working across a swap. A stand-in can only ever lower
   the kit you need, never raise it. */
function footprintDay(d) {
  if (!d || !d.exercises || !kneeCare()) return d;
  if (!d.exercises.some(e => KNEE_AVOID.indexOf(e.key) >= 0)) return d;

  /* seed with everything already in the day, so a stand-in is never chosen
     onto a movement the day is doing anyway */
  const used = {};
  d.exercises.forEach(e => { used[e.key] = true; });

  let swapped = 0, dropped = 0;
  const exercises = [];
  d.exercises.forEach(ex => {
    const risky = KNEE_AVOID.indexOf(ex.key) >= 0 && ex.sec == null && ex.reps != null;
    if (!risky) { exercises.push(ex); return; }
    const rank = EQUIP_RANK[ex.needs || 'bodyweight'];
    let sub = null;
    for (let i = 0; i < KNEE_POOL.length; i++) {
      const t = KNEE_POOL[i];
      if (!used[t.key] && EQUIP_RANK[t.needs] <= rank) { sub = t; break; }
    }
    if (!sub) { dropped++; return; }
    used[sub.key] = true; swapped++;
    exercises.push(Object.assign({}, ex, {
      key: sub.key, name: sub.name, needs: sub.needs, side: !!sub.side,
      scheme: ex.reps + (sub.side ? ' each' : '') + ' · ' + sub.part +
              ' · swapped from ' + ex.name + ' to spare the knees',
      fpSwapFrom: ex.name
    }));
  });

  if (!exercises.length) return d;   /* never hand back an empty day */

  const bits = [];
  if (swapped) bits.push(swapped + (swapped > 1 ? ' movements' : ' movement') + ' swapped');
  if (dropped) bits.push(dropped + ' dropped — no safe movement left to rotate to');
  const note = (d.note ? d.note + ' ' : '') + 'Knee care: ' + bits.join(', ') + '.';
  return Object.assign({}, d, { exercises, note });
}

/* Keyed on the source array so the static plans map once. fpFocusPlan caches
   its own array; genPlan rebuilds one per call and simply re-maps, which is
   the cost it already pays. */
const fpSwapCache = new WeakMap();
function footprintPlan(days) {
  const c = fpCautions(), p = fpPriority().join(',');
  if ((!c && !p) || !Array.isArray(days)) return days;
  const key = c + '|' + p;
  const hit = fpSwapCache.get(days);
  if (hit && hit.k === key) return hit.v;
  /* swap first, then reorder — a stand-in should be judged on where the
     movement it replaced belongs, not where the original one did */
  const out = days.map(d => priorityDay(footprintDay(d)));
  fpSwapCache.set(days, { k: key, v: out });
  return out;
}

/* =====================================================================
   PROGRAM GUIDE — the coaching that is not an exercise

   A program is more than its sets. Sims prescribes when to eat, how much
   protein, what to watch for; none of that fitted anywhere, so it lived in
   a document nobody opens mid-session. A plan may now carry a `guide`:
   `rotate` cycles a card day to day so it stays noticeable, `days` keys a
   card on that day's title, and `groups` fills a Guide tab. Content is
   per-program — this is a place to put advice, not shared advice.
   A plan without a guide simply has no Guide tab.
   ===================================================================== */
function programGuide() {
  if (typeof SYN_PLANS === 'undefined') return null;
  const key = String(S.program || '');
  if (key.indexOf('syn-') !== 0) return null;
  const p = SYN_PLANS.find(x => x.id === key.slice(4));
  return (p && p.guide) || null;
}
function hasGuide() { return !!programGuide(); }

/* Three named slots rather than one list, because where a card belongs is
   part of what it means: a habit you are meant to carry into the session
   opens the rail, the day's own note follows it, and post-session advice
   goes to the bottom where you will actually be when it applies. */
function guideSlots(dayNum, dayTitle) {
  const g = programGuide();
  if (!g) return { habit: null, today: null, after: null, any: false };
  const pick = (arr) => (arr && arr.length) ? arr[(Math.max(1, dayNum) - 1) % arr.length] : null;
  const habit = pick(g.rotate);
  const today = (g.days && dayTitle && g.days[dayTitle]) || null;
  const after = pick(g.after);
  return { habit, today, after, any: !!(habit || today || after) };
}
/* flat list, for the Guide screen and the day note */
function guideCardsFor(dayNum, dayTitle) {
  const s = guideSlots(dayNum, dayTitle);
  return [s.habit, s.today, s.after].filter(Boolean);
}

function isDayProgram() { return !!DAY_PROGRAMS[S.program]; }
function pcfg()   { return DAY_PROGRAMS[S.program] || DAY_PROGRAMS.prep30; }
function pdata()  { return footprintPlan(pcfg().data); }
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
  /* The old middle equipment tier is gone. It has to be migrated HERE rather
     than in the Setup screen: applyBundle writes tm_state_* straight from the
     cloud bundle, so an old value can arrive at any time from another device
     or a restore, and a one-off fix in the UI would not catch it. Left alone,
     EQUIP_SHORT['dumbbells'] is undefined and the header pill reads
     "undefined". */
  if (st.settings && st.settings.equipment === 'dumbbells') st.settings.equipment = 'gym';
  /* one slot per imported program, same shape as the built-in ones */
  if (typeof SYN_PLANS !== 'undefined') {
    SYN_PLANS.forEach(p => {
      const k = 'syn_' + p.id.replace(/-/g, '_');
      st[k] = st[k] || { day: 1, log: {} };
      if (st[k].day == null) st[k].day = 1;
      if (!st[k].log) st[k].log = {};
    });
  }
  ['core', 'db', 'pil', 'hiit', 'bjj', 'sa2', 'sa4', 'sahyb'].forEach(k => { st[k] = st[k] || { day: 1, log: {} }; if (st[k].day == null) st[k].day = 1; if (!st[k].log) st[k].log = {}; });
  if (!st.achievements) st.achievements = [];
  if (!st.prs) st.prs = {};
  if (st.sessions == null) st.sessions = 0;
  if (!st.history) st.history = [];
  if (!st.liftLog) st.liftLog = {};
  if (!st.saWeights) st.saWeights = {};
  /* consecutive missed sessions per movement, and the extra reps earned by
     a movement stuck at the heaviest weight in the room */
  if (!st.stalls) st.stalls = {};
  if (!st.repBonus) st.repBonus = {};
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
/* The tab you were last on, kept across reloads — refreshing used to drop
   you back on Roadmap wherever you were. This is a view preference, so it
   lives in its own key alongside tm_theme and tm_zoom rather than in S:
   S is training data and syncs between devices, and which tab you happen
   to have open should not follow you to another one.

   Validated against the tab bar itself rather than a hardcoded list, so a
   tab added to index.html needs no change here and a value left over from
   an older build quietly falls back to Roadmap. app.js loads at the end of
   body, so the buttons exist by the time this runs. */
const TAB_KEY = 'tm_tab';
function loadTab() {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return t && document.querySelector('.tab[data-tab="' + t + '"]') ? t : 'today';
  } catch { return 'today'; }
}
/* Written at the END of render(), so a tab is only remembered once it has
   actually drawn without throwing — otherwise a tab that breaks on some
   state would be restored into the same break on every reload. */
let tabSaved = null;
function saveTab() {
  if (TAB === tabSaved) return;
  tabSaved = TAB;
  try { localStorage.setItem(TAB_KEY, TAB); } catch {}
}

let TAB = loadTab(), PROGRAM = generateProgram(), progCycle = 0;

function rebuild() { PROGRAM = generateProgram(); }
function renderLibrary() {
  titleEl.textContent = 'Library';
  subEl.textContent = Object.keys(FORM_TIPS).length + ' movements';
  view.innerHTML = libraryHTML();
  const inp = document.getElementById('libSearch');
  if (inp) {
    /* Re-rendering on every keystroke would blur the field, so the list is
       replaced in place and the input is left alone. */
    inp.oninput = () => {
      libQuery = inp.value;
      const listEl = view.querySelector('.lib-list');
      const cntEl = view.querySelector('.lib-count');
      const tmp = document.createElement('div');
      tmp.innerHTML = libraryHTML();
      if (listEl) listEl.innerHTML = tmp.querySelector('.lib-list').innerHTML;
      if (cntEl) cntEl.textContent = tmp.querySelector('.lib-count').textContent;
    };
    if (libQuery) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
}

function render() {
  rebuild();
  /* the Guide tab only exists for programs that carry a guide — a seventh
     tab is tight on a phone, and a permanently empty one is worse */
  const gt = document.querySelector('.tab[data-tab="guide"]');
  if (gt) gt.hidden = !hasGuide();
  if (TAB === 'guide' && !hasGuide()) TAB = 'today';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === TAB));
  const prep = isDayProgram();
  if (TAB === 'today') { prep ? renderPrepToday() : renderToday(); mountSessionRail(); }
  if (TAB === 'program') { prep ? renderPrepProgram() : renderProgram(); mountProtocols(); }
  if (TAB === 'lib')     renderLibrary();
  if (TAB === 'stats')   renderStats();
  if (TAB === 'fp')      renderFingerprint();
  if (TAB === 'guide')   renderGuide();
  if (TAB === 'setup')   renderSetup();
  updateSessionUI();   /* keeps the session bar in step with the current tab */
  if (typeof updateWakeLock === 'function') updateWakeLock();
  saveTab();           /* last, so only a tab that rendered cleanly is remembered */
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
    /* estimate the session you are actually about to do, not the Core one */
    mins:   d.rest ? 0 : estDayMin(tierDay(d)),
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
    const gc = guideCardsFor(dayNum, d.title);
    if (d.note || gc.length) {
      const guideBits = gc.map(c => `<p class="note-guide"><b>${c.title}.</b> ${guideRich(c.body)}</p>`).join('');
      const more = hasGuide() ? `<button class="link-btn note-guide-more" data-goguide="1">Open the full guide</button>` : '';
      html += `<details class="card note-fold"><summary>Today&rsquo;s session</summary><div class="note-body">${d.note || ''}${guideBits}${more}</div></details>`;
    }
    html += readinessHTML();
    html += tierBarHTML();
    if (S.program === 'gen') html += genBarHTML();
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

  const hint = saHintSet(ex.key, item.setIndex, item.total);
  let row = hint
    ? `<div class="set-row workset ${showName ? 'named ' : ''}${on ? 'done' : ''}">
        <div class="lbl">${label}</div>
        <div class="wt${hint.top === false ? ' wt-back' : ''}">${fmt(hint.w)} <small>${hint.suffix}${hint.top === true ? ' · top set' : ''}</small>${hint.type === 'bar' ? `<div class="plate-math">${plateStripHTML(hint.w)}</div>` : ''}</div>
        <div class="set-end"><div class="reps">${repTarget(ex)} reps${ex.side ? '/side' : ''}</div>
        <button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`
    : `<div class="set-row workset ${showName ? 'named ' : ''}${on ? 'done' : ''}">
        <div class="lbl">${label}</div>
        <div class="wt">${repTarget(ex)}<small> reps${ex.side ? '/side' : ''}</small></div>
        <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`;

  if (hasLoadProgression() && loadProgresses(ex.key) && many) {
    const rid = ex.key + '_' + item.setIndex;
    const cur = (log.reps && log.reps[rid] != null) ? log.reps[rid] : ex.reps;
    row += `<div class="log-row">
      <label>Reps hit</label>
      <div class="stepper">
        <button data-sarep="${rid}" data-d="-1">−</button>
        <div class="val" id="sarep_${rid}">${cur}</div>
        <button data-sarep="${rid}" data-d="1">+</button>
      </div>
      <span class="tiny muted">all sets ${repTarget(ex)}+ → ${repBonus(ex.key) ? 'reps up again' : 'weight up'}</span>
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
        <div class="wt${hint.top === false ? ' wt-back' : ''}">${fmt(hint.w)} <small>${hint.suffix}${hint.top === true ? ' · top set' : ''}</small>${hint.type === 'bar' ? `<div class="plate-math">${plateStripHTML(hint.w)}</div>` : ''}</div>
        <div class="set-end"><div class="reps">${repTarget(ex)} reps${ex.side ? '/side' : ''}</div>
        <button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`
    : `<div class="set-row workset ${on ? 'done' : ''}">
        <div class="lbl">${many ? `Set ${setIndex + 1}/${total}` : 'Target'}</div>
        <div class="wt">${repTarget(ex)}<small> reps${ex.side ? '/side' : ''}</small></div>
        <div class="set-end"><button class="check ${on}" data-pcheck="${id}">✓</button></div></div>`;
  if (hasLoadProgression() && loadProgresses(ex.key) && many) {
    const rid = `${ex.key}_${setIndex}`;
    const cur = (log.reps && log.reps[rid] != null) ? log.reps[rid] : ex.reps;
    rows += `<div class="log-row">
      <label>Reps hit</label>
      <div class="stepper">
        <button data-sarep="${rid}" data-d="-1">−</button>
        <div class="val" id="sarep_${rid}">${cur}</div>
        <button data-sarep="${rid}" data-d="1">+</button>
      </div>
      <span class="tiny muted">all sets ${repTarget(ex)}+ → ${repBonus(ex.key) ? 'reps up again' : 'weight up'}</span>
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
/* ---------------------------------------------------------------------
   Session difficulty tier.

   The Standard puts a Foundation / Core / Advanced / Elite selector at the top
   of a session and labels it "session only — your next workout uses your
   algorithm tier". That last part is the whole point: it is a dial for how you
   feel today, not a change to your program. Turning it up because you slept
   well should not permanently raise your targets, and turning it down on a bad
   day should not cost you the progress you have already earned.

   So it is deliberately NOT persisted, and it resets the moment the day
   changes. It scales sets and timed holds, and it scales reps only on
   bodyweight movements — a loaded lift progresses through the reps-hit rule,
   and rewriting its target reps would corrupt that. Same reasoning as
   fpProgress, which leaves loaded movements alone for the same reason.
   --------------------------------------------------------------------- */
const TIERS = [
  { key: 'foundation', name: 'Foundation', sets: -1, vol: 0.75, note: 'Less volume — building the habit, or coming back from a break.' },
  { key: 'core',       name: 'Core',       sets:  0, vol: 1,    note: 'The session as programmed.' },
  { key: 'advanced',   name: 'Advanced',   sets:  1, vol: 1.2,  note: 'More volume — for a day you have the time and the legs for it.' },
  { key: 'elite',      name: 'Elite',      sets:  2, vol: 1.4,  note: 'Significantly more work. Do not use this to make up for a missed day.' }
];
function tierBy(k) { return TIERS.find(t => t.key === k) || TIERS[1]; }

let sessionTier = 'core';
let sessionTierDay = null;

/* Reads as a getter so anything can ask; resets itself when the day moves on. */
function currentTier() {
  const dayKey = S.program + ':' + (isDayProgram() ? pstate().day : 0);
  if (sessionTierDay !== dayKey) { sessionTierDay = dayKey; sessionTier = 'core'; }
  return sessionTier;
}
function setSessionTier(k) {
  currentTier();                      /* make sure the day key is current first */
  sessionTier = tierBy(k).key;
  rebuildSessionSteps();              /* keep a running session in step with it */
  render();
  toast(tierBy(k).name + ' — this session only');
}

/* Which checkIds are already banked for today, read from the same place
   sessMarkDone() writes them so a rebuild cannot lose completed sets. */
function sessDoneIds() {
  const ids = new Set();
  const checks = isDayProgram()
    ? (((pstate().log || {})[pstate().day] || {}).checks || {})
    : (((S.logs || {})[S.cursor.week + '-' + S.cursor.day] || {}).checks || {});
  Object.keys(checks).forEach(k => { if (checks[k]) ids.add(k); });
  return ids;
}

/* Changing the tier mid-session used to redraw the Roadmap list and nothing
   else: sess.steps is built once in startSession(), so the guided session and
   its voice cues kept reading the tier that was active when you pressed Start.
   Rebuild the running session too - completed sets are kept (they live in the
   log, not in sess), the cursor lands on the first set still outstanding, and
   _spoke is cleared so the new set is actually announced. */
function rebuildSessionSteps() {
  if (!sess) return;
  const steps = buildSteps();
  if (!steps.length) return;
  const done = sessDoneIds();
  let i = 0;
  while (i < steps.length && done.has(steps[i].checkId)) i++;
  clearInterval(sessInt);
  sess.steps = steps;
  sess.i = Math.min(i, steps.length - 1);
  sess.phase = 'ready';
  sess._spoke = null;
  renderSession();
}

/* Returns a NEW day object; never mutates the program data, which for the
   generated Focus plan is a memoised array shared across renders. */
function tierDay(d) {
  const t = tierBy(currentTier());
  if (t.key === 'core' || !d || !d.exercises) return d;
  const scale = (n, min) => Math.max(min, Math.round(n * t.vol));
  const out = Object.assign({}, d);
  out.exercises = d.exercises.map(ex => {
    const e = Object.assign({}, ex);
    if (e.sets) e.sets = Math.max(1, e.sets + t.sets);
    if (e.sec)  e.sec  = Math.max(10, Math.round(scale(e.sec, 10) / 5) * 5);
    /* loaded movements keep their target reps — that is what the reps-hit
       progression reads */
    if (e.reps && !loadEntry(e.key)) e.reps = scale(e.reps, 1);
    return e;
  });
  return out;
}

function genBarHTML() {
  const g = genState();
  return `<div class="gen-bar">
    <div class="gen-row">
      <select id="genType" class="gen-sel" aria-label="Workout type">
        ${GEN_TYPES.map(t => `<option value="${t.key}" ${t.key === g.type ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
      <select id="genDiff" class="gen-sel" aria-label="Difficulty">
        ${GEN_DIFFS.map(d => `<option value="${d.key}" ${d.key === g.diff ? 'selected' : ''}>${d.name}</option>`).join('')}
      </select>
      <button class="btn primary gen-roll" id="genRoll">🎲 Generate a different one</button>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------------
   Readiness.

   A tier chosen from how you actually slept beats a tier chosen from habit.
   This asks once a day and SUGGESTS — it never changes the tier on its own,
   because a bad night is a reason to consider less work, not an instruction
   to do less, and having the app quietly reprogram the session would be
   worse than not asking.
   --------------------------------------------------------------------- */
const READY = [
  { v: 1, label: 'Rough', tier: 'foundation', why: 'Slept badly or still sore — Foundation keeps the habit without digging a hole.' },
  { v: 2, label: 'OK',    tier: 'core',       why: 'Core: the session as programmed.' },
  { v: 3, label: 'Good',  tier: 'core',       why: 'Core, and push the top sets.' },
  { v: 4, label: 'Great', tier: 'advanced',   why: 'Advanced if you have the time — this is the day to take it.' }
];
function readyToday() {
  const key = isoDate(new Date());
  if (S.settings.readinessDay !== key) return null;
  return S.settings.readiness || null;
}
function setReadiness(v) {
  S.settings.readinessDay = isoDate(new Date());
  S.settings.readiness = v;
  save();
  /* A rough night now moves the session to Foundation on its own (Kandy,
     2026-08-29). The better nights still only suggest, so the app never
     quietly adds volume you did not ask for - which was the original reason
     this whole control was advisory. */
  const rec = READY.find(r => r.v === v);
  if (v === 1 && rec && currentTier() !== rec.tier) { setSessionTier(rec.tier); return; }
  render();
}
function readinessHTML() {
  const cur = readyToday();
  const rec = cur ? READY.find(r => r.v === cur) : null;
  return `<div class="ready-bar">
    <div class="ready-row">
      <span class="ready-q">How did you sleep?</span>
      <div class="seg ready-seg" id="segReady">
        ${READY.map(r => `<button data-ready="${r.v}" class="${cur === r.v ? 'on' : ''}">${r.label}</button>`).join('')}
      </div>
    </div>
    ${rec ? `<div class="tiny muted ready-why">${rec.why}${rec.tier !== currentTier() ? ` <button class="ready-apply" data-applytier="${rec.tier}">Use ${tierBy(rec.tier).name}</button>` : ''}</div>` : ''}
  </div>`;
}

function tierBarHTML() {
  const cur = currentTier();
  return `<div class="tier-bar">
    <div class="seg tier-seg" id="segTier">
      ${TIERS.map(t => `<button data-tier="${t.key}" class="${t.key === cur ? 'on' : ''}">${t.name}</button>`).join('')}
    </div>
    <div class="tiny muted tier-note">${tierBy(cur).note} <b>This session only</b> — tomorrow returns to Core.</div>
  </div>`;
}

function prepDayItems(d) {
  d = tierDay(d);
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
/* Which programs run the reps-hit double progression. Texas has its own
   linear scheme in generateProgram(); the bodyweight plans progress by volume
   inside their own arrays. These are the ones that carry a load and need a
   rule for when it goes up. */
function hasLoadProgression() {
  return isSAProgram() || S.program === 'dumbbell' || S.program === 'fpfocus' ||
         !!SYN_LOAD[S.program];
}

/* ---------------------------------------------------------------------
   Load progression for the syn plans.

   SA_WEIGHT is one global table keyed by exercise, which was fine while only
   the SuperAge and dumbbell A/B plans used it. The syn plans share exercise
   keys with each other — dumbbell-49's "DB RDLs" and Sims' barbell Romanian
   deadlift are both syn_romanian_deadlift — so a single global entry cannot
   describe both. Each syn plan therefore carries its own table AND its own
   saWeights namespace; without the second, switching programs would hand the
   dumbbell RDL a barbell working weight.

   An entry is either derived (src + pct off the Setup lifts) or fixed
   (start, in lb, converted for metric). Entries progress by the reps-hit rule
   unless they say prog: false.
   --------------------------------------------------------------------- */
const SYN_LOAD = {
  'syn-sims-lift-heavy-sprint-short': {
    /* Percentages are Epley inverted at the written rep target plus the 2-3
       reps in reserve the program asks for, so the suggestion is a weight you
       can finish rather than a limit set:
           pct = (37 - (reps + 2.5)) / 36   ->   4 reps .85 | 5 reps .82 | 6 reps .79
       Lifts with no Setup entry of their own scale off the nearest one by the
       usual ratio: an RDL is about .70 of a deadlift, a front squat about .85
       of a back squat, a push press sits above a strict press. Push press and
       hip thrust start deliberately low; progression lifts them within a few
       sessions and starting under is the cheaper mistake. */
    sims_back_squat:            { src: 'squat',    pct: 0.82, type: 'bar'  },
    syn_romanian_deadlift:      { src: 'deadlift', pct: 0.57, type: 'bar'  },
    syn_barbell_hip_thrust:     { src: 'squat',    pct: 0.80, type: 'bar'  },
    syn_overhead_press:         { src: 'press',    pct: 0.82, type: 'bar'  },
    syn_bench_press:            { src: 'bench',    pct: 0.82, type: 'bar'  },
    syn_deadlift:               { src: 'deadlift', pct: 0.85, type: 'bar'  },
    syn_front_squats:           { src: 'squat',    pct: 0.67, type: 'bar'  },
    sims_push_press:            { src: 'press',    pct: 0.90, type: 'bar'  },
    syn_bulgarian_split_squats: { src: 'squat',    pct: 0.18, type: 'hand' },
    wu_cs_db_row:               { src: 'bench',    pct: 0.35, type: 'hand' },
    /* The carries are timed and distance work with no rep target. They get a
       suggestion but prog:false keeps them out of the reps-hit rule, which
       compares against ex.reps and would read a missing target as met on
       every session — raising the load for ever. */
    sims_suitcase_carry:        { src: 'deadlift', pct: 0.25, type: 'hand', prog: false },
    sims_farmer_carry:          { src: 'deadlift', pct: 0.30, type: 'hand', prog: false },
  },
  /* Dumbbell 49: 45 loaded movements, every one starting at 10 lb (5 kg) and
     progressing on its own. A flat start is right here — most of these are
     small isolation lifts, and the reps-hit rule separates the goblet squat
     from the lateral raise within a few weeks without anyone guessing up
     front. Pull-ups, push-ups, bench dips and sissy squats hold no dumbbell
     and are absent, so they progress by reps as before.
     Note every hand weight is still clamped by dbMax — the heaviest dumbbell
     in Setup, 25 lb by default. */
  /* Push Pull Legs.
     pct is the fraction of the Setup lift's estimated 1RM to use as the
     working weight. Barbell entries are computed: the lift's ratio to its
     Setup lift, times Epley inverted at THIS program's own rep target plus
     2 reps in reserve — w = 1RM x (37 - (reps + 2)) / 36. That is why bench
     is .750 here at 8 reps and .833 in a program that writes it for 5.
     Dumbbell entries are taken verbatim from SA_WEIGHT for the same
     movement: those are shipped working weights, already rep-adjusted, so
     running Epley over them again would discount them twice. Isolation work
     with no shipped equivalent starts at 10 lb and lets the reps-hit rule
     find it — a guessed lateral-raise ratio would be false precision.
     Bodyweight movements are absent and progress by reps as before. */
  'syn-ppl': {
    syn_bench_press:                    { src: 'bench', pct: 0.750, type: 'bar'  },   /* Bench Press · 8 reps · 1.00 x Epley(8+2) */
    syn_overhead_press:                 { src: 'press', pct: 0.750, type: 'bar'  },   /* Overhead Press · 8 reps · 1.00 x Epley(8+2) */
    syn_incline_dumbbell_press:         { src: 'bench', pct: 0.30, type: 'hand' },   /* Incline Dumbbell Press · from dbrenrow */
    syn_lateral_raises:                 { src: 'press', pct: 0.12, type: 'hand' },   /* Lateral Raises · from dblatraise */
    syn_dumbbell_kickbacks:             { start: 10, type: 'hand' },   /* Dumbbell Kickbacks · 12 reps · starts light */
    syn_overhead_tricep_extension:      { start: 10, type: 'hand' },   /* Overhead Tricep Extension · 12 reps · starts light */
    syn_deadlift:                       { src: 'deadlift', pct: 0.833, type: 'bar'  },   /* Deadlift · 5 reps · 1.00 x Epley(5+2) */
    syn_barbell_rows:                   { src: 'bench', pct: 0.675, type: 'bar'  },   /* Barbell Rows · 8 reps · 0.90 x Epley(8+2) */
    syn_bent_over_reverse_flyes:        { start: 10, type: 'hand' },   /* Bent Over Reverse Flyes · 15 reps · starts light */
    syn_barbell_curls:                  { src: 'press', pct: 0.382, type: 'bar'  },   /* Barbell Curls · 10 reps · 0.55 x Epley(10+2) */
    syn_hammer_curls:                   { src: 'press', pct: 0.20, type: 'hand' },   /* Hammer Curls · from dbhammer */
    syn_squats:                         { src: 'squat', pct: 0.806, type: 'bar'  },   /* Squats · 6 reps · 1.00 x Epley(6+2) */
    syn_romanian_deadlift:              { src: 'deadlift', pct: 0.486, type: 'bar'  },   /* Romanian Deadlift · 10 reps · 0.70 x Epley(10+2) */
    syn_goblet_squats:                  { src: 'squat', pct: 0.30, type: 'db' },   /* Goblet Squats · from gobletsquat */
    syn_calf_raises:                    { start: 10, type: 'hand' },   /* Calf Raises · 15 reps · starts light */
    syn_walking_lunges:                 { src: 'squat', pct: 0.20, type: 'hand' },   /* Walking Lunges · from walkinglunge */
    syn_dumbbell_bench_press:           { src: 'bench', pct: 0.35, type: 'hand' },   /* Dumbbell Bench Press · from dbpress */
    syn_arnold_press:                   { src: 'press', pct: 0.35, type: 'hand' },   /* Arnold Press · from dbohp */
    syn_dumbbell_flyes:                 { start: 10, type: 'hand' },   /* Dumbbell Flyes · 12 reps · starts light */
    syn_front_raises:                   { start: 10, type: 'hand' },   /* Front Raises · 12 reps · starts light */
    syn_skull_crushers:                 { src: 'press', pct: 0.312, type: 'bar'  },   /* Skull Crushers · 10 reps · 0.45 x Epley(10+2) */
    syn_dumbbell_rows:                  { src: 'bench', pct: 0.35, type: 'hand' },   /* Dumbbell Rows · from dbrow */
    syn_single_arm_dumbbell_row:        { src: 'bench', pct: 0.35, type: 'hand' },   /* Single Arm Dumbbell Row · from dbrow */
    syn_reverse_flyes:                  { start: 10, type: 'hand' },   /* Reverse Flyes · 15 reps · starts light */
    syn_concentration_curls:            { start: 10, type: 'hand' },   /* Concentration Curls · 10 reps · starts light */
    syn_incline_curls:                  { start: 10, type: 'hand' },   /* Incline Curls · 10 reps · starts light */
    syn_hip_thrusts:                    { src: 'squat', pct: 0.694, type: 'bar'  },   /* Hip Thrusts · 10 reps · 1.00 x Epley(10+2) */
    syn_front_squats:                   { src: 'squat', pct: 0.637, type: 'bar'  },   /* Front Squats · 8 reps · 0.85 x Epley(8+2) */
    syn_good_mornings:                  { src: 'deadlift', pct: 0.312, type: 'bar'  },   /* Good Mornings · 10 reps · 0.45 x Epley(10+2) */
    syn_bulgarian_split_squats:         { src: 'squat', pct: 0.18, type: 'hand' },   /* Bulgarian Split Squats · from Sims table */
    syn_seated_dumbbell_calf_raises:    { start: 10, type: 'hand' },   /* Seated Dumbbell Calf Raises · 15 reps · starts light */
    syn_single_leg_calf_raises:         { start: 10, type: 'hand' },   /* Single Leg Calf Raises · 15 reps · starts light */
  },
  /* Upper Lower Split.
     pct is the fraction of the Setup lift's estimated 1RM to use as the
     working weight. Barbell entries are computed: the lift's ratio to its
     Setup lift, times Epley inverted at THIS program's own rep target plus
     2 reps in reserve — w = 1RM x (37 - (reps + 2)) / 36. That is why bench
     is .750 here at 8 reps and .833 in a program that writes it for 5.
     Dumbbell entries are taken verbatim from SA_WEIGHT for the same
     movement: those are shipped working weights, already rep-adjusted, so
     running Epley over them again would discount them twice. Isolation work
     with no shipped equivalent starts at 10 lb and lets the reps-hit rule
     find it — a guessed lateral-raise ratio would be false precision.
     Bodyweight movements are absent and progress by reps as before. */
  'syn-upper-lower': {
    syn_bench_press:                    { src: 'bench', pct: 0.833, type: 'bar'  },   /* Bench Press · 5 reps · 1.00 x Epley(5+2) */
    syn_barbell_rows:                   { src: 'bench', pct: 0.750, type: 'bar'  },   /* Barbell Rows · 5 reps · 0.90 x Epley(5+2) */
    syn_overhead_press:                 { src: 'press', pct: 0.806, type: 'bar'  },   /* Overhead Press · 6 reps · 1.00 x Epley(6+2) */
    syn_barbell_curls:                  { src: 'press', pct: 0.413, type: 'bar'  },   /* Barbell Curls · 8 reps · 0.55 x Epley(8+2) */
    syn_squats:                         { src: 'squat', pct: 0.833, type: 'bar'  },   /* Squats · 5 reps · 1.00 x Epley(5+2) */
    syn_romanian_deadlift:              { src: 'deadlift', pct: 0.564, type: 'bar'  },   /* Romanian Deadlift · 6 reps · 0.70 x Epley(6+2) */
    syn_goblet_squats:                  { src: 'squat', pct: 0.30, type: 'db' },   /* Goblet Squats · from gobletsquat */
    syn_calf_raises:                    { start: 10, type: 'hand' },   /* Calf Raises · 12 reps · starts light */
    syn_incline_dumbbell_press:         { src: 'bench', pct: 0.30, type: 'hand' },   /* Incline Dumbbell Press · from dbrenrow */
    syn_dumbbell_rows:                  { src: 'bench', pct: 0.35, type: 'hand' },   /* Dumbbell Rows · from dbrow */
    syn_lateral_raises:                 { src: 'press', pct: 0.12, type: 'hand' },   /* Lateral Raises · from dblatraise */
    syn_hammer_curls:                   { src: 'press', pct: 0.20, type: 'hand' },   /* Hammer Curls · from dbhammer */
    syn_dumbbell_overhead_extensions:   { start: 10, type: 'hand' },   /* Dumbbell Overhead Extensions · 12 reps · starts light */
    syn_hip_thrusts:                    { src: 'squat', pct: 0.694, type: 'bar'  },   /* Hip Thrusts · 10 reps · 1.00 x Epley(10+2) */
    syn_front_squats:                   { src: 'squat', pct: 0.637, type: 'bar'  },   /* Front Squats · 8 reps · 0.85 x Epley(8+2) */
    syn_good_mornings:                  { src: 'deadlift', pct: 0.312, type: 'bar'  },   /* Good Mornings · 10 reps · 0.45 x Epley(10+2) */
    syn_reverse_lunges:                 { src: 'squat', pct: 0.15, type: 'hand' },   /* Reverse Lunges · from dblunge */
    syn_seated_dumbbell_calf_raises:    { start: 10, type: 'hand' },   /* Seated Dumbbell Calf Raises · 15 reps · starts light */
  },
  /* Full Body 3x.
     pct is the fraction of the Setup lift's estimated 1RM to use as the
     working weight. Barbell entries are computed: the lift's ratio to its
     Setup lift, times Epley inverted at THIS program's own rep target plus
     2 reps in reserve — w = 1RM x (37 - (reps + 2)) / 36. That is why bench
     is .750 here at 8 reps and .833 in a program that writes it for 5.
     Dumbbell entries are taken verbatim from SA_WEIGHT for the same
     movement: those are shipped working weights, already rep-adjusted, so
     running Epley over them again would discount them twice. Isolation work
     with no shipped equivalent starts at 10 lb and lets the reps-hit rule
     find it — a guessed lateral-raise ratio would be false precision.
     Bodyweight movements are absent and progress by reps as before. */
  'syn-full-body': {
    syn_squats:                         { src: 'squat', pct: 0.806, type: 'bar'  },   /* Squats · 6 reps · 1.00 x Epley(6+2) */
    syn_bench_press:                    { src: 'bench', pct: 0.806, type: 'bar'  },   /* Bench Press · 6 reps · 1.00 x Epley(6+2) */
    syn_barbell_rows:                   { src: 'bench', pct: 0.725, type: 'bar'  },   /* Barbell Rows · 6 reps · 0.90 x Epley(6+2) */
    syn_overhead_press:                 { src: 'press', pct: 0.750, type: 'bar'  },   /* Overhead Press · 8 reps · 1.00 x Epley(8+2) */
    syn_bicep_curls:                    { src: 'press', pct: 0.20, type: 'hand' },   /* Bicep Curls · from dbcurl */
    syn_dumbbell_skull_crushers:        { start: 10, type: 'hand' },   /* Dumbbell Skull Crushers · 10 reps · starts light */
    syn_deadlift:                       { src: 'deadlift', pct: 0.833, type: 'bar'  },   /* Deadlift · 5 reps · 1.00 x Epley(5+2) */
    syn_incline_press:                  { src: 'bench', pct: 0.637, type: 'bar'  },   /* Incline Press · 8 reps · 0.85 x Epley(8+2) */
    syn_lunges:                         { src: 'squat', pct: 0.15, type: 'hand' },   /* Lunges · from dblunge */
    syn_lateral_raises:                 { src: 'press', pct: 0.12, type: 'hand' },   /* Lateral Raises · from dblatraise */
    syn_bent_over_reverse_flyes:        { start: 10, type: 'hand' },   /* Bent Over Reverse Flyes · 15 reps · starts light */
    syn_front_squats:                   { src: 'squat', pct: 0.637, type: 'bar'  },   /* Front Squats · 8 reps · 0.85 x Epley(8+2) */
    syn_dumbbell_press:                 { src: 'bench', pct: 0.35, type: 'hand' },   /* Dumbbell Press · from dbpress */
    syn_dumbbell_rows:                  { src: 'bench', pct: 0.35, type: 'hand' },   /* Dumbbell Rows · from dbrow */
    syn_romanian_deadlift:              { src: 'deadlift', pct: 0.486, type: 'bar'  },   /* Romanian Deadlift · 10 reps · 0.70 x Epley(10+2) */
    syn_arnold_press:                   { src: 'press', pct: 0.35, type: 'hand' },   /* Arnold Press · from dbohp */
    syn_calf_raises:                    { start: 10, type: 'hand' },   /* Calf Raises · 15 reps · starts light */
  },
  /* Knee-Friendly 2x.
     pct is the fraction of the Setup lift's estimated 1RM to use as the
     working weight. Barbell entries are computed: the lift's ratio to its
     Setup lift, times Epley inverted at THIS program's own rep target plus
     2 reps in reserve — w = 1RM x (37 - (reps + 2)) / 36. That is why bench
     is .750 here at 8 reps and .833 in a program that writes it for 5.
     Dumbbell entries are taken verbatim from SA_WEIGHT for the same
     movement: those are shipped working weights, already rep-adjusted, so
     running Epley over them again would discount them twice. Isolation work
     with no shipped equivalent starts at 10 lb and lets the reps-hit rule
     find it — a guessed lateral-raise ratio would be false precision.
     Bodyweight movements are absent and progress by reps as before. */
  'syn-knee-friendly-2x': {
    syn_bench_press:                    { src: 'bench', pct: 0.806, type: 'bar'  },   /* Bench Press · 6 reps · 1.00 x Epley(6+2) */
    syn_barbell_rows:                   { src: 'bench', pct: 0.675, type: 'bar'  },   /* Barbell Rows · 8 reps · 0.90 x Epley(8+2) */
    syn_overhead_press:                 { src: 'press', pct: 0.750, type: 'bar'  },   /* Overhead Press · 8 reps · 1.00 x Epley(8+2) */
    syn_bent_over_reverse_flyes:        { start: 10, type: 'hand' },   /* Bent Over Reverse Flyes · 15 reps · starts light */
    syn_barbell_curls:                  { src: 'press', pct: 0.382, type: 'bar'  },   /* Barbell Curls · 10 reps · 0.55 x Epley(10+2) */
    syn_dumbbell_kickbacks:             { start: 10, type: 'hand' },   /* Dumbbell Kickbacks · 12 reps · starts light */
    syn_barbell_hip_thrust:             { src: 'squat', pct: 0.750, type: 'bar'  },   /* Barbell Hip Thrust · 8 reps · 1.00 x Epley(8+2) */
    syn_romanian_deadlift:              { src: 'deadlift', pct: 0.525, type: 'bar'  },   /* Romanian Deadlift · 8 reps · 0.70 x Epley(8+2) */
    syn_b_stance_rdl:                   { src: 'deadlift', pct: 0.15, type: 'hand' },   /* B-Stance RDL · half dbrdl: it is near single-leg, and dbrdl's .30 put it at the dumbbell ceiling */
    syn_split_squat_shallow:            { src: 'squat', pct: 0.10, type: 'hand' },   /* Split Squat (Shallow) · under stepup's .15 on purpose — this is the knee-protective program, so the accessories start light and climb */
  },
  'syn-dumbbell-49-supersets': {
    syn_dumbbell_bench_press:         { start: 10, type: 'hand' },   /* Flat DB Press */
    syn_incline_dumbbell_press:       { start: 10, type: 'hand' },   /* Incline DB Press */
    wu_single_arm_lat_row:            { start: 10, type: 'hand' },   /* Single-Arm Lat-Biased Row */
    wu_db_floor_press:                { start: 10, type: 'hand' },   /* DB Floor Press */
    wu_db_pullover:                   { start: 10, type: 'hand' },   /* DB Pull-Overs */
    syn_dumbbell_flyes:               { start: 10, type: 'hand' },   /* DB Flyes */
    wu_incline_dual_pullover:         { start: 10, type: 'hand' },   /* Incline Dual DB Pull-Overs */
    wu_weighted_pushup:               { start: 10, type: 'hand' },   /* Weighted Push-Ups */
    wu_weighted_deadbug:              { start: 10, type: 'hand' },   /* Weighted Deadbug */
    wu_plank_db_transfer:             { start: 10, type: 'hand' },   /* Plank with DB Transfer */
    syn_goblet_squats:                { start: 10, type: 'hand' },   /* Goblet Squats */
    syn_romanian_deadlift:            { start: 10, type: 'hand' },   /* DB RDLs */
    syn_bulgarian_split_squats:       { start: 10, type: 'hand' },   /* Bulgarian Split Squats */
    wu_single_leg_rdl:                { start: 10, type: 'hand' },   /* Single-Leg RDLs */
    syn_walking_lunges:               { start: 10, type: 'hand' },   /* Walking Lunges */
    syn_hip_thrusts:                  { start: 10, type: 'hand' },   /* DB Hip Thrusts */
    wu_step_up:                       { start: 10, type: 'hand' },   /* Step-Ups */
    wu_db_glute_bridge:               { start: 10, type: 'hand' },   /* DB Glute Bridges */
    wu_heel_elevated_squat:           { start: 10, type: 'hand' },   /* Heel-Elevated Squats */
    wu_weighted_step_up_glute:        { start: 10, type: 'hand' },   /* Weighted Step-Ups (glute-biased) */
    wu_db_leg_curl:                   { start: 10, type: 'hand' },   /* DB Leg Curls */
    wu_seated_db_press:               { start: 10, type: 'hand' },   /* Seated DB Press */
    syn_incline_curls:                { start: 10, type: 'hand' },   /* Incline Bench Curls */
    wu_standing_db_press:             { start: 10, type: 'hand' },   /* Standing DB Press */
    syn_hammer_curls:                 { start: 10, type: 'hand' },   /* Standing Hammer Curls */
    syn_arnold_press:                 { start: 10, type: 'hand' },   /* Arnold Press */
    syn_concentration_curls:          { start: 10, type: 'hand' },   /* Concentration Curls */
    syn_lateral_raises:               { start: 10, type: 'hand' },   /* Lateral Raises */
    wu_db_spider_curl:                { start: 10, type: 'hand' },   /* DB Spider Curls */
    syn_front_raises:                 { start: 10, type: 'hand' },   /* Front Raises */
    wu_cs_rear_delt_fly:              { start: 10, type: 'hand' },   /* Chest-Supported Rear Delt Flyes */
    wu_upright_row:                   { start: 10, type: 'hand' },   /* Upright Rows */
    wu_weighted_leg_raise:            { start: 10, type: 'hand' },   /* Weighted Leg Raises */
    wu_bent_over_dual_row:            { start: 10, type: 'hand' },   /* Bent-Over Dual DB Rows */
    syn_dumbbell_overhead_extensions: { start: 10, type: 'hand' },   /* Overhead DB Extension */
    syn_single_arm_dumbbell_row:      { start: 10, type: 'hand' },   /* Single-Arm DB Row */
    syn_dumbbell_skull_crushers:      { start: 10, type: 'hand' },   /* DB Skull Crushers */
    wu_cs_db_row:                     { start: 10, type: 'hand' },   /* Chest-Supported DB Rows */
    syn_dumbbell_kickbacks:           { start: 10, type: 'hand' },   /* DB Kickbacks */
    wu_batwing_row:                   { start: 10, type: 'hand' },   /* DB Batwing Rows */
    wu_reacher_row:                   { start: 10, type: 'hand' },   /* Reacher Row */
    syn_single_leg_calf_raises:       { start: 10, type: 'hand' },   /* Single-Leg Calf Raises */
    wu_db_shrug:                      { start: 10, type: 'hand' },   /* DB Shrugs */
    syn_seated_dumbbell_calf_raises:  { start: 10, type: 'hand' },   /* Seated DB Calf Raises */
    wu_db_russian_twist:              { start: 10, type: 'hand' },   /* DB Russian Twists */
  }
};
/* the plan's own entry wins; SA_WEIGHT stays the fallback for everything else */
function loadEntry(key) {
  const t = SYN_LOAD[S.program];
  return (t && t[key]) || SA_WEIGHT[key] || null;
}
/* Working weights are namespaced per plan wherever the plan has its own
   table. The SuperAge and dumbbell A/B plans keep bare keys so no saved
   progress is orphaned. */
function saSlot(key) { return SYN_LOAD[S.program] ? S.program + '|' + key : key; }
function loadProgresses(key) {
  const t = SYN_LOAD[S.program];
  if (t) { const m = t[key]; return !!m && m.prog !== false; }
  return SA_PROGRESS.includes(key);
}
function saEstimate(m) {
  /* a fixed starting weight rather than one derived from the Setup lifts */
  if (m.start != null) {
    const w = S.settings.units === 'lb' ? m.start : round(m.start * LB_PER_KG, 2.5);
    return capHand(Math.max(5, w), m.type);
  }
  const L = S.settings.lifts[m.src]; if (!L || !L.weight) return null;
  const est = oneRM(L.weight, L.reps) * m.pct;
  return m.type === 'bar' ? snapWeight(est, bar(), getPlates())
                         : capHand(Math.max(5, round(est, 5)), m.type);
}
/* A movement holding at the ceiling is chasing more reps than it was written
   with. Say so where the reps are shown, or the card and the progression would
   disagree about what counts as a good set. */
function repTarget(ex) { return (ex.reps || 0) + repBonus(ex.key); }

/* ---------------------------------------------------------------------
   Wave loading across the sets of one exercise.

   Flat sets — every set at the same weight — waste the first set and make the
   last one the hardest, which is the wrong way round. A wave ramps into the
   top set, drops back for one, then goes to the top again. You earn the top
   weight rather than starting there, and the back-off set lets you repeat it.

   The factors are of the WORKING weight, which is still the number the
   session-to-session progression moves. Nothing here changes when the weight
   goes up: that still needs every set to hit its target, so one good set
   never moves anything. */
const WAVE = {
  1: [1],
  2: [0.92, 1],
  3: [0.88, 1, 0.94],
  4: [0.85, 0.94, 1, 0.94],
  5: [0.82, 0.90, 1, 0.92, 1],
  6: [0.80, 0.88, 0.95, 1, 0.92, 1]
};
function waveFactors(sets) {
  if (WAVE[sets]) return WAVE[sets];
  /* longer than the table: ramp over the first half, then alternate top and
     back-off for the rest */
  const out = [];
  const ramp = Math.max(2, Math.floor(sets / 2));
  for (let i = 0; i < sets; i++) {
    if (i < ramp) out.push(+(0.80 + (0.20 * (i / (ramp - 1 || 1)))).toFixed(3));
    else out.push(i % 2 === ramp % 2 ? 0.92 : 1);
  }
  return out;
}
function waveOn() { return S.settings.waveLoad !== false; }

/* A per-set view of the exercise's working weight. Returns the same shape
   saHint does so the row rendering does not have to care. */
function saHintSet(key, i, total) {
  const h = saHint(key);
  if (!h || !waveOn() || !(total > 1)) return h;
  const f = waveFactors(total)[i];
  if (f == null || f === 1) return Object.assign({}, h, { top: true });
  const raw = h.w * f;
  const w = h.type === 'bar' ? snapWeight(raw, bar(), getPlates())
                             : capHand(Math.max(5, round(raw, 5)), h.type);
  return Object.assign({}, h, { w: w, top: false, txt: fmt(w) + ' ' + h.suffix });
}

function saHint(key) {
  if (!hasLoadProgression()) return null;
  const m = loadEntry(key); if (!m) return null;
  const slot = saSlot(key);
  const stored = S.saWeights && S.saWeights[slot] != null;
  const w = stored ? S.saWeights[slot] : saEstimate(m);
  if (w == null) return null;
  const suffix = m.type === 'bar' ? unit() : m.type === 'db' ? `${unit()} DB/KB` : `${unit()} / hand`;
  return { w, type: m.type, suffix, txt: `${fmt(w)} ${suffix}` };
}
/* rep-based lifts that auto-progress: hit the target reps on the hardest
   set and the weight goes up next session; miss it and it holds. */
const SA_PROGRESS = [
  'gobletsquat', 'dblunge', 'sidelunge', 'sabench', 'sarow', 'sardl', 'deadlift',
  /* dumbbell program */
  'dbpress', 'dbrow', 'dbrdl', 'dbohp', 'dbcurl', 'dbrenrow', 'dbhinge',
  'dblatraise', 'dbhammer', 'dbwindmill',
  /* fingerprint focus */
  'stepup', 'farmcarry',
  'frontsquat', 'trapdeadlift', 'walkinglunge', 'pushpress', 'sadbpress',
  'kbswing', 'splitsquatecc', 'woodchop'
];
/* ---------------------------------------------------------------------
   Stalling.

   The progression rule was: hit every set and the weight goes up, miss any set
   and it holds. Holds — and then holds again, and again, for ever. An app that
   answers three failed sessions in a row with "same weight, try harder" is
   giving bad advice: repeating a weight you cannot lift is how you stay stuck
   and how you get hurt.

   Three consecutive misses now trigger a response, and which response depends
   on why you are stuck:

   - A barbell or trap-bar lift DELOADS ten percent, rounded to real plates.
     You rebuild through the same reps-hit rule, which usually carries you
     past the old sticking point. This is the standard answer and it is what
     Texas Method itself prescribes.

   - A dumbbell or kettlebell lift ALREADY AT THE RACK CEILING cannot deload
     its way out, because the problem is not that the weight is too heavy —
     it is that the next weight up does not exist in the room. Dropping to
     20lb to climb back to a 25lb you already own solves nothing. So it holds
     the weight and moves the target: reps go up instead, which is exactly how
     the bodyweight movements in this app already progress.

   - Anything else deloads ten percent like the barbell.
   --------------------------------------------------------------------- */
const STALL_LIMIT = 3;

function stallCount(key) { return (S.stalls && S.stalls[key]) || 0; }
function stallBump(key, n) {
  if (!S.stalls) S.stalls = {};
  if (n === 0) delete S.stalls[key]; else S.stalls[key] = n;
}
/* Extra reps earned by holding a capped weight. Read by the renderer so the
   target you see is the target you are held to. */
function repBonus(key) { return (S.repBonus && S.repBonus[key]) || 0; }
function repBonusAdd(key, n) {
  if (!S.repBonus) S.repBonus = {};
  S.repBonus[key] = repBonus(key) + n;
}
function atCeiling(key, w) {
  const m = loadEntry(key);
  if (!m || (m.type !== 'db' && m.type !== 'hand')) return false;
  return w >= dbCap();
}

function saApplyProgression(d, log) {
  if (!hasLoadProgression() || !d || d.rest || log.progressed) return [];
  if (!S.saWeights) S.saWeights = {};
  const msgs = [], seen = new Set();
  d.exercises.forEach(ex => {
    if (seen.has(ex.key) || !loadProgresses(ex.key) || !(ex.sets > 1)) return;
    seen.add(ex.key);
    const m = loadEntry(ex.key); if (!m) return;
    const slot = saSlot(ex.key);
    const cur = S.saWeights[slot] != null ? S.saWeights[slot] : saEstimate(m);
    if (cur == null) return;
    let met = true;
    for (let i = 0; i < ex.sets; i++) {
      const v = log.reps && log.reps[`${ex.key}_${i}`];
      const hit = v != null ? v : (log.reps && log.reps[ex.key] != null ? log.reps[ex.key] : ex.reps);
      if (hit < ex.reps + repBonus(ex.key)) { met = false; break; }
    }
    /* Record what was actually lifted. Nothing has ever stored this: the day
       log holds reps and ticks, and saWeights holds only the CURRENT weight,
       so past sessions were unrecoverable. This is written from here on;
       days logged before it simply have no weight and say so. */
    if (!log.w) log.w = {};
    log.w[ex.key] = cur;
    /* and when. Day logs are keyed by day NUMBER, which orders a single
       program but cannot order points gathered from several. */
    if (!log.date) log.date = isoDate(new Date());
    const inc = S.settings.units === 'lb' ? 5 : 2.5;
    let next = cur;
    if (met) {
      /* Clamping only the displayed suggestion would let the STORED working
         weight climb past the rack forever while the screen still read 25 —
         the number you are told to lift and the number being progressed would
         silently diverge. Clamp here too. */
      next = m.type === 'bar' ? snapWeight(cur + inc, bar(), getPlates())
                              : capHand(cur + inc, m.type);
      /* This guard exists because snapWeight can land back on the current
         weight when the next plate jump is out of reach. It must NOT apply to
         hand weights, or it would step straight over the ceiling the line
         above just imposed. */
      if (next <= cur && m.type === 'bar') next = cur + inc;
      stallBump(ex.key, 0);
      /* a weight increase resets the earned reps — the new load starts from
         the written target again */
      if (next > cur && S.repBonus) delete S.repBonus[ex.key];
      if (next > cur) msgs.push(`${ex.name} +${fmt(next - cur)} ${unit()} next time 💪`);
      else {
        /* At the rack ceiling the weight cannot be the progression, so the
           rep target is: clear every set and you owe one more rep next time.
           Same volume progression the bodyweight movements already use. */
        repBonusAdd(ex.key, 1);
        msgs.push(`${ex.name} stays at ${fmt(cur)} ${unit()} — heaviest you own, so the target rises to ${ex.reps + repBonus(ex.key)} reps 🎯`);
      }
    } else {
      const n = stallCount(ex.key) + 1;
      if (n < STALL_LIMIT) {
        stallBump(ex.key, n);
        msgs.push(`${ex.name} holds at ${fmt(cur)} ${unit()} — hit ${ex.reps + repBonus(ex.key)}+ on every set to move up (${n} of ${STALL_LIMIT} before a reset)`);
      } else if (atCeiling(ex.key, cur)) {
        /* Nothing heavier to drop back from, so the rep target is what backs
           off. Raising it here would answer three failed sessions by making
           the set harder, which is the opposite of a deload. */
        stallBump(ex.key, 0);
        const had = repBonus(ex.key);
        if (had > 0) {
          S.repBonus[ex.key] = had - 1;
          msgs.push(`${ex.name} stalled three times at your heaviest weight — target eases back to ${ex.reps + repBonus(ex.key)} reps 📉`);
        } else {
          msgs.push(`${ex.name} is stuck at ${fmt(cur)} ${unit()} for ${STALL_LIMIT} sessions and there is nothing lighter to drop to. Slow the lowering, or rest longer between sets.`);
        }
      } else if (S.settings.autoDeload === false) {
        /* Deload turned off: hold the weight and keep counting, so the message
           still tells the truth about how long this has been stuck. */
        stallBump(ex.key, n);
        msgs.push(`${ex.name} holds at ${fmt(cur)} ${unit()} — stuck for ${n} sessions. Turn on auto-deload in Setup if you want it to drop back.`);
      } else {
        stallBump(ex.key, 0);
        const dropped = m.type === 'bar'
          ? snapWeight(cur * 0.9, bar(), getPlates())
          : Math.max(5, round(cur * 0.9, 5));
        next = dropped < cur ? dropped : Math.max(5, cur - inc);
        msgs.push(`${ex.name} stalled three times — dropping to ${fmt(next)} ${unit()} to build back up 📉`);
      }
    }
    S.saWeights[slot] = next;
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
    /* Finishing a generated session is what teaches the generator what you
       have just done — without this, freshness never moves and every roll
       draws from the same favourites. */
    if (S.program === 'gen' && !d.rest) genMarkUsed(dayNum);
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
  toeyoga: {
    title: 'Toe Yoga and Toe Spread',
    body: 'Stand or sit barefoot with the foot flat. Press the big toe down while lifting the other four; then reverse — big toe up, the other four down. Then spread all five toes apart without curling them. Slow and deliberate; the point is control you do not currently have, not range. 10 of each per foot.'
  },
  shortfoot: {
    title: 'Short Foot',
    body: 'Stand barefoot. Without curling your toes, shorten the foot by drawing the ball of the foot toward the heel — as if making the arch taller by contracting the sole. The toes stay long and flat on the ground. Hold each contraction 5 seconds, then release. Repeat 8 times. Think of making a fist with the bottom of your foot.'
  },
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
  suitcase:    'lLAw6fUccKA',   // same carry mechanics, one side loaded

  /* Added v134. Same rule as the originals: each id was fetched from
     YouTube's oEmbed endpoint and the returned title recorded here, so a
     wrong id shows up as a mismatched title rather than silently teaching
     the wrong movement. Candidates that came back as Shorts, playlists or
     multi-exercise videos were dropped — a gap beats a bad demo. */
  sarow:       'G8l_8chR5BE',   // "How To" Barbell Row — Alan Thrall, Untamed Strength
  sardl:       'uhghy9pFIPY',   // How To Perform PERFECT Romanian Deadlifts | RDLs — E3 Rehab
  slrdl:       'Zfr6wizR8rs',   // The BEST Single-Leg RDL Tutorial — Squat University
  dbrdl:       'ZEnWV4kguKc',   // How to do romanian deadlifts safely — Jack Hanrahan Fitness

  /* Added v137. Sourced by reading YouTube's own results page for each
     movement and then confirming every id against oEmbed — the title
     beside each entry is what oEmbed returned, not what the search said.
     Candidates that came back untitled or unavailable were dropped, and
     each key was checked to exist in FORM_TIPS before being written, so
     a demo cannot be attached to a movement the app does not have.

     Several movements appear under more than one key — the generator and
     the imported programs each have their own Bird Dog — so the same id
     is registered against each. The library merges them into one row and
     prefers whichever key carries a video. */
  bicycle:                           'HWX93vAoLvw',   // How to Do Bicycle Crunches — Hinge Health
  birddog:                           'QABW99qPiNM',   // Bird Dog Exercise | Improve Your Core and Balance — Muscle & Motion
  calfraise:                         'CtyIVeJH6lI',   // You're Doing Calf Raises WRONG — Rehab and Revive
  dbcurl:                            'QZEqB6wUPxQ',   // How To: Barbell Bicep Curl | 3 GOLDEN RULES — ScottHermanFitness
  dbhammer:                          'BRVDS6HVR9Q',   // How To Perform HAMMER CURLS — Buff Dudes
  dblatraise:                        'XPPfnSEATJA',   // How to do a Dumbbell Lateral Raise — NASM
  dbrow:                             'gfUg6qWohTk',   // STOP F*cking Up Dumbbell Rows (PROPER FORM!) — ATHLEAN-X
  deadbug:                           'GbSC02oU3To',   // How to Do a Dead Bug: A Guide from Physical Therapists — Hinge Health
  deadhang:                          'GwMTIwfOPQE',   // Dead Hang VS Active Hang - CHOOSE WISELY — GoPrimate
  frontsquat:                        '7pyxT5hqmQY',   // How To Front Squat (WAYS TO KEEP YOUR CHEST UP!) — Squat University
  'gen_bicycle-crunches':            'HWX93vAoLvw',   // How to Do Bicycle Crunches — Hinge Health
  'gen_bird-dog':                    'QABW99qPiNM',   // Bird Dog Exercise | Improve Your Core and Balance — Muscle & Motion
  'gen_chin-ups':                    'e1YSApl-QcM',   // PERFECT CHIN-UPS — Simonster Strength
  'gen_dead-bug':                    'GbSC02oU3To',   // How to Do a Dead Bug: A Guide from Physical Therapists — Hinge Health
  'gen_good-mornings':               'f23vXjoG2e8',   // HOW TO DO THE GOOD MORNING EXERCISE — Jeff Nippard
  'gen_hammer-curls':                'BRVDS6HVR9Q',   // How To Perform HAMMER CURLS — Buff Dudes
  'gen_hip-thrust':                  'xDmFkJxPzeM',   // How To Build Great Glutes with Perfect Hip Thrust Technique — Jeff Nippard
  'gen_incline-db-press':            'IP4oeKh1Sd4',   // How to do the INCLINE DUMBBELL BENCH PRESS! — Max Euceda
  'gen_pull-ups':                    'eGo4IYlbE5g',   // The Perfect Pull Up - Do it right! — Calisthenicmovement
  'gen_tib-raises':                  'VzIcGAgBiaM',   // Tibialis Wall Raises (Exercise Demo) — The Barefoot Sprinter
  shouldercars:                      'wVFHnG2flJ4',   // Daily Mobility Exercise: Shoulder CARS — Pippin Performance
  syn_active_hang:                   '0_YZc2yuKkE',   // How To Do Active Hang — Calixpert
  syn_arnold_press:                  '6Z15_WdXmVw',   // Arnold Press - Shoulder Exercise - Proper Form Tutorial — Buff Dudes
  syn_barbell_curls:                 'QZEqB6wUPxQ',   // How To: Barbell Bicep Curl | 3 GOLDEN RULES — ScottHermanFitness
  syn_barbell_hip_thrust:            'xDmFkJxPzeM',   // How To Build Great Glutes with Perfect Hip Thrust Technique — Jeff Nippard
  syn_barbell_rows:                  'T3N-TO4reLQ',   // How to do Barbell Rows PROPERLY for a Big Back — ATHLEAN-X
  syn_bear_crawl:                    'U3Y58Kyw7Xw',   // Bear Crawl Tutorial - Proper Form and Technique — Runna
  syn_bent_over_reverse_flyes:       '4Xr7bKE_fxE',   // How To Perform Bent Over Reverse Flys — Buff Dudes
  syn_bicycle_crunches:              'HWX93vAoLvw',   // How to Do Bicycle Crunches — Hinge Health
  syn_bird_dog:                      'QABW99qPiNM',   // Bird Dog Exercise | Improve Your Core and Balance — Muscle & Motion
  syn_bulgarian_split_squats:        'SkNsa3eBwLA',   // How to do the BULGARIAN SPLIT SQUAT! — Max Euceda
  syn_calf_raises:                   'CtyIVeJH6lI',   // You're Doing Calf Raises WRONG — Rehab and Revive
  syn_chin_ups:                      'e1YSApl-QcM',   // PERFECT CHIN-UPS — Simonster Strength
  syn_controlled_glute_step_down:    'wGoKb6mPJzU',   // Step-Ups for Glutes (w/ Common Mistakes) — Physique Development
  syn_dead_bug:                      'GbSC02oU3To',   // How to Do a Dead Bug: A Guide from Physical Therapists — Hinge Health
  syn_dips:                          'vi1-BOcj3cQ',   // Are You Doing Dips Properly? (AVOID MISTAKES!) — ATHLEAN-X
  syn_dumbbell_rows:                 'gfUg6qWohTk',   // STOP F*cking Up Dumbbell Rows (PROPER FORM!) — ATHLEAN-X
  syn_front_squats:                  '7pyxT5hqmQY',   // How To Front Squat (WAYS TO KEEP YOUR CHEST UP!) — Squat University
  syn_good_mornings:                 'f23vXjoG2e8',   // HOW TO DO THE GOOD MORNING EXERCISE — Jeff Nippard
  syn_hammer_curls:                  'BRVDS6HVR9Q',   // How To Perform HAMMER CURLS — Buff Dudes
  syn_hip_thrusts:                   'xDmFkJxPzeM',   // How To Build Great Glutes with Perfect Hip Thrust Technique — Jeff Nippard
  syn_incline_dumbbell_press:        'IP4oeKh1Sd4',   // How to do the INCLINE DUMBBELL BENCH PRESS! — Max Euceda
  syn_lateral_raises:                'XPPfnSEATJA',   // How to do a Dumbbell Lateral Raise — NASM
  syn_neck_cars:                     'BsZmSx34hvQ',   // Neck CAR (Controlled Articular Rotation) — Precision Movement
  syn_pull_ups:                      'eGo4IYlbE5g',   // The Perfect Pull Up - Do it right! — Calisthenicmovement
  syn_shoulder_cars:                 'wVFHnG2flJ4',   // Daily Mobility Exercise: Shoulder CARS — Pippin Performance
  syn_skull_crushers:                'S0fmDR60X-o',   // How to do the SKULLCRUSHER! — Max Euceda
  syn_thread_the_needle:             'SkQhKf74nZk',   // How to Do a Thread the Needle Stretch — Hinge Health
  syn_tibialis_raises:               'VzIcGAgBiaM',   // Tibialis Wall Raises (Exercise Demo) — The Barefoot Sprinter
  syn_walking_lunges:                'Pbmj6xPo-Hw',   // Walking Lunges Exercise Tutorial — Buff Dudes
  tibraise:                          'VzIcGAgBiaM',   // Tibialis Wall Raises (Exercise Demo) — The Barefoot Sprinter
  walkinglunge:                      'Pbmj6xPo-Hw',  // Walking Lunges Exercise Tutorial — Buff Dudes
  wu_sissy_squat:                    'DOxGMy258rM',  // Sissy Squat Correct Form | Gareth Sapstead — Mirafit

  /* Found by searching YouTube per movement, scoring each candidate title
     against the exercise name, and confirming the winner resolves through
     oEmbed. Anything with no confident match was left without a video
     rather than given a plausible-looking wrong one — the How-to card
     falls back to a search link, which cannot teach the wrong movement.
     Every one of these is overridable in-app: the How-to popover pins
     your own link over any of them. */
  airsquattempo:                                  'Uk2ft1Ky7Fk',   // Tempo Squat 3-2-1 — Through Fire Fitness
  anklerock:                                      'Gs4AyvJpG1M',   // Knee-to-Wall Ankle Rocks – Improve Ankle Mobility — Train With Cuz
  backext:                                        'G6HG5VzJoNc',   // Form Tips: How to perform a back extension | Glute Bias 45° Extension Form — Alexandra Yaeger
  bike:                                           'gWosN1CY4bg',   // Zero Healthcare™ Fitness Tips At Home | How To Use A Spin Bike Correctly — Zero Healthcare_Official
  boxjump:                                        'kNIInK_Le8I',   // How to Do Beginner Box Jump Exercises — National Academy of Sports Medicine (NASM)
  breakfall:                                      '52DcHM2VQxQ',   // 5 Baby Steps to Learn the Back Breakfall Technique — MovNat
  bridge:                                         'B7kTkXDIMuE',   // How to Do a Supine Bridge Exercise | 30 Seconds | MedBridge — Medbridge
  brisk:                                          'nmvVfgrExAg',   // How to do Brisk Walk - Warm Up Exercise — GetFitso
  briskmarch:                                     'nmvVfgrExAg',   // How to do Brisk Walk - Warm Up Exercise — GetFitso
  broadjump:                                      'BiaUluYAjNM',   // Testing Standing Broad Jump | Tips to Jump Farther — Simple Speed Coach
  buttkick:                                       'vXVPvY1UbJI',   // How to Do：BUTT KICKS — Leap Fitness
  carioca:                                        'R3__Q_SulyM',   // How To Do The CARIOCA EXERCISE | Exercise Demonstration Video and Guide — Live Lean TV Daily Exercises
  carryintervals:                                 'z7E_YU9P1jU',   // How to Perform the Farmer’s Carry — Dr. Carl Baird
  crosscrawl:                                     'Slw1dQrm4R4',   // Cross crawl March — SAPT Strength
  crunches:                                       '9T4WQGlKCRk',   // How to Do Crunches Properly for Stronger Abs | Workout for Beginners | Abs — wearecult
  dbhinge:                                        'Ipi8_vz8_z0',   // Dumbbell Deadlift Technique – Perfect Form Video Tutorial Guide — Fit Father Project - Fitness For Busy Fathers
  dblunge:                                        'xrPteyQLGAo',   // How To Reverse Lunge — PureGym
  dbohp:                                          'vlFGTI5JzjI',   // How To PROPERLY Dumbbell Shoulder Press (LEARN FAST) — Colossus Fitness
  dbpress:                                        'T0Y3OBF1bNI',   // How To Do A Dumbbell Floor Press — PureGym
  dbrenrow:                                       '4qEIChzM4ZA',   // Renegade Row Guide | Form Tips, Muscles Worked, and Variations — BarBend
  dbwindmill:                                     'ogCw52FZlfM',   // How to Do the Windmill Exercise — Openfit on BODi
  declinepushup:                                  'O7dVvwEK9J4',   // Decline Push-Up Tutorial True Form — The Health Alchemist
  deepsquat:                                      'XujJTXZxaYs',   // How to Deep Squat Hold — Man Flow Yoga
  doublestretch:                                  'FLQ78kIiaaI',   // How to do: Double leg stretch — P4P WORKOUTS
  farmcarry:                                      'z7E_YU9P1jU',   // How to Perform the Farmer’s Carry — Dr. Carl Baird
  frontrackcarry:                                 'NvzLYnME8_A',   // How to do the KB Front Rack Carry - Technique Tip Tuesday — Conquer Athlete
  granby:                                         'exkwjkM0P7U',   // The Shoulder Roll (aka Granby Roll) Tutorial - 5 Easy Steps! (White Belt G — Grappling SMARTY
  highknees:                                      'FvjmPRU3zn4',   // How to do High Knees | Forever Living UK & Ireland — Forever Living Products UK
  hipcars:                                        'wz1GbxKLkKg',   // Hip CARs // For IT Band Syndrome, Piriformis Syndrome, Lateral Knee Pain a — Tom Morrison
  hipheist:                                       '7Rm0CAFiXo4',   // Hip Heist Drill For Wrestling - The School of Wrestling Technique — The School of Wrestling
  hollow:                                         'Gkh7ZF_lcGw',   // Hollow Body Hold — The Active Life
  hops:                                           'u3zgHI8QnqE',   // How To Jump Rope | The Right Way | Well+Good — Well+Good
  hundred:                                        'lFvSS82o_ZY',   // How To Perform The Hundred — Sports and Fitness
  inclinewalk:                                    'NAsObfFJXvE',   // How To: Incline Treadmill Walk (12-3-30 Workout) — Live Lean TV Daily Exercises
  intervals:                                      'lJNaHXWi4KY',   // The Perfect Norwegian 4x4 Pace: The Correct Speed for VO2 Max Intervals — VO2 Max Lab
  invhold:                                        'Wjf_Hxn0EO8',   // How to Use an Inversion Table for Back Pain — Teeter
  jacks:                                          'XR0xeuK5zBU',   // How to do Jumping Jacks exercise - Best Cardio Exercises video tutorial — P4P WORKOUTS
  jumprope:                                       'u3zgHI8QnqE',   // How To Jump Rope | The Right Way | Well+Good — Well+Good
  kbswing:                                        'bDCeXbMJVNs',   // How To Kettlebell Swing (in 3 minutes) — Zack Henderson
  latpull:                                        'vw5Xmu5CIew',   // How to Perform Pull Ups - Proper Pull-Up Exercise Tutorial — Buff Dudes
  legcircle:                                      'bVmm1XVgHfU',   // How to Do Single Leg Circles With Andrea Rogers — Openfit on BODi
  legraises:                                      '3oIpxsn6FxQ',   // Perfect Lying Leg Raises Form to Strengthen Your Core & Avoid Back Pain — Mobility Doc
  lunge:                                          'u_zSfK5ZFU4',   // Reverse Lunge Exercise: Proper Form — BuiltLean®
  marchcarry:                                     'z7E_YU9P1jU',   // How to Perform the Farmer’s Carry — Dr. Carl Baird
  mtnclimb:                                       'cnyTQDSE884',   // How to Do Mountain Climbers | The Right Way | Well+Good — Well+Good
  n9090:                                          'YxECcOkUCEY',   // 90 90 Hip Switches — Advanced Therapy and Performance
  ohhold:                                         'dN2mr1X82vA',   // How To Do A SINGLE ARM OVERHEAD DUMBBELL MARCH | Exercise Demonstration Vi — Live Lean TV Daily Exercises
  plankdrag:                                      'uWn2uvYl-lY',   // How To Kettlebell Plank Drag Through — Third Space London
  plankjack:                                      'Jo0LKx6c7XM',   // How to do Plank Jacks — Sunstone Fitness
  pushpress:                                      'sElIkjcfyNY',   // Dumbbell Push Press - How To — Bobby Maximus
  pushuptap:                                      'StCOnB6qHaY',   // How to do Shoulder Tap Push-Up | Joanna Soh — Joanna Soh
  rackhold:                                       'ncS_REM-6MM',   // How To Load A Front Rack & Goblet Hold — Fit Code
  revshrimp:                                      '8ZcHXERyuEQ',   // How to Do the Reverse Shrimp in Jiu Jitsu — 2nd Gear Jiu Jitsu
  ridewarm:                                       'TWMzgPamY8U',   // 5 Minute Pre-Ride Warm Up to Make You a Better Cyclist — Dynamic Cyclist
  rollball:                                       'ONTuOk-ji94',   // How to Perform 'Rolling Like A Ball' in Pilates | The Right Way | Well+Goo — Well+Good
  rollup:                                         'PGnibcCcAUE',   // How to do a Pilates Roll Up | The Right Way | Well+Good — Well+Good
  rtwist:                                         'fCHFQTBqm-U',   // How to PROPERLY Do Russian Twists For ABS (FIX THIS NOW!) — Colossus Fitness
  sabench:                                        '4Y2ZdHCOXok',   // How to PROPERLY Bench Press for Growth (5 Easy Steps) — Jeremy Ethier
  sadbpress:                                      '0Ckp4XpWGIc',   // How to PROPERLY Single Arm Dumbbell Chest Press (Fix Your Form Now) — Colossus Fitness
  saw:                                            '5cv9yA24lks',   // How to Do Saw Exercise — Blind Athletes Exercise
  scissorlunge:                                   'wrwwXE_x-pQ',   // How To Do A LUNGE | Lunges for BEGINNERS | FITNESS SPECIAL | WORKOUT VIDEO — Mind Body Soul
  shadowbox:                                      'J4j3AOVWuHE',   // Quick Shadow Boxing Tutorial by Olympian — Tony Jeffries
  shortfoot:                                      'iy1Qxt2mnsE',   // Performing The Short Foot Exercise Properly — CPCinfo
  shrimp:                                         '_Pkeue2N-Gs',   // BJJ Fundamentals: How to Hip Escape (shrimp) — Ernest Chavez
  shuffle:                                        'mziPKITnPeQ',   // How To Do a Lateral Shuffle — Get Healthy U - with Chris Freytag
  sidekick:                                       '8TMu5t9AGfc',   // How to Do Side Kicks | Health — Health
  sidelunge:                                      'liFeq7swKfc',   // Side (Lateral) Lunge Technique — Mind Pump TV
  sideplank:                                      'NQsqPcarPXY',   // How to Perform a Proper Side Plank | San Diego Chiropractic and Functional — Peak Form Health Center
  sidestep:                                       'X0jsl2ZrXug',   // How to Do Banded Side Steps Properly — [P]rehab
  sims_back_squat:                                'my0tLDaWyDU',   // How To Squat Correctly (NO BACK PAIN) — Squat University
  sims_box_jump:                                  'kNIInK_Le8I',   // How to Do Beginner Box Jump Exercises — National Academy of Sports Medicine (NASM)
  sims_farmer_carry:                              'z7E_YU9P1jU',   // How to Perform the Farmer’s Carry — Dr. Carl Baird
  sims_hike:                                      'tkqF1hRe3yY',   // Warm Up Stretches Before Walk or Hike - Prevent Injuries & Feel Energized! — VIGEO
  sims_pallof_press:                              '_2xWmYNnFS8',   // How to Do the Pallof Press (Perfect Form for a Stronger Core) — Colossus Fitness
  sims_pogo_hop:                                  'lz6BM6WyJ0k',   // How To Do Pogo Hops — Swift Movement Academy
  sims_push_press:                                'gFmV302JErc',   // How To Push Press with Good Form — Peak Strength
  sims_sprint30:                                  'YipJAsAj5Kc',   // 30 Second Sprint Intervals | 25 Minute Indoor Cycling Training Session — GCN Training
  sims_squat_jump:                                'A-cFYWvaHr0',   // How To Do A Squat Jump | The Right Way | Well+Good — Well+Good
  sims_suitcase_carry:                            'y-hn_Ha1-RE',   // How To Perform The Suitcase Carry — Dr. Carl Baird
  sims_walk:                                      'FokKK-cV35w',   // Seniors: How to walk correctly to prevent falls: A Physical therapist Expl — Balance Builders by Doug Weiss
  singlestretch:                                  'ATuKvmsjBwU',   // Technique Tutorials - The Single Leg Stretch — ReBalance Physiotherapy
  sitout:                                         'uSiRmwHJaIg',   // Sit Outs | Core Strengthening Exercise — Dr. Carl Baird
  skaters:                                        '9_jLW6VkU8A',   // Speed Skaters Exercise (Skater Hops): Proper Form — BuiltLean®
  slrdlreach:                                     '3rawGylFPNs',   // Single Leg RDL (with reach) with Dr. Leo Kormanik [GLUTES, HAMSTRINGS] — Running Rehab
  slstance:                                       'Wb68ze1oH5c',   // How to Do a Single Leg Stance Exercise | 30 Seconds | MedBridge — Medbridge
  spinestretch:                                   'IAKURhFoODE',   // How to Do: FORWARD SPINE STRETCH PULSE — Leap Fitness
  splitsquatecc:                                  'PMFnb-SG_HM',   // DB Split Squat w/ 3-sec Eccentric — Next Level Physical Therapy
  sprawl:                                         'UFFODmd6RTc',   // How to Do Sprawls Correctly | Full Body Fat Burn Exercise | cult fit | @cu — wearecult
  squatjump:                                      'A-cFYWvaHr0',   // How To Do A Squat Jump | The Right Way | Well+Good — Well+Good
  squats:                                         'm0GcZ24pK6k',   // How to do a bodyweight squat | Bupa Health — Bupa Health
  stepup:                                         'YcG-aMcGms0',   // How To PROPERLY Weighted Step Up | 3 Muscle Gain Variations Included — Colossus Fitness
  swan:                                           'sas3F7QHAtg',   // How to Do Swan Exercise — Blind Athletes Exercise
  syn_3_part_breath_qigong_close:                 'sc1uN1Asifk',   // 3 Breath Qigong Practice with Jeffrey Chand — Qigong For Vitality
  syn_90_90_hip_lift_off:                         'sLWSmo0uk2E',   // 90:90 Hip Internal Rotation Active Range Lift Off Tutorial — Rafal Matuszewski
  syn_90_90_hip_stretch_with_active_lift:         'VYvMMw8z3rE',   // How to do a 90/90 Hip Stretch properly - CORRECT FORM IS ESSENTIAL — Jack Hanrahan Fitness
  syn_90_90_hip_switches:                         'YxECcOkUCEY',   // 90 90 Hip Switches — Advanced Therapy and Performance
  syn_active_pancake_stretch:                     'w7i6W7rFqUw',   // Pancake Stretch - Active Flexibility Technique — Integral Movement
  syn_ankle_cars:                                 'fyShbLKXMkY',   // How To Do Ankle CARs — Alex Murphy
  syn_ankle_wrist_circles:                        '20Y-W5fHPEM',   // How To Do KNEELING WRIST CIRCLES | Exercise Demonstration Video and Guide — Live Lean TV Daily Exercises
  syn_b_stance_rdl:                               'SwQtQvcrz-c',   // How To Properly B Stance RDL For More Glute Gains (Learn In 3 Minutes) — Colossus Fitness
  syn_banded_clamshell_with_lift:                 'IgAH3_8kXqY',   // Banded Clamshell Glute Activation — Axistence Athletics
  syn_banded_hip_thrust:                          '0XXUdRSTBxA',   // How to: Banded Hip Thrust (floor) — FitLife Gym
  syn_bear_hold:                                  'hePvEr_iYRE',   // How To Do a Bear Hold — Swift Movement Academy
  syn_bear_plank_hold_shoulder_tap:               'F99Lb0cx7_Y',   // Bear Hold to Shoulder Tap — Pathway Training
  syn_bench_press:                                '4Y2ZdHCOXok',   // How to PROPERLY Bench Press for Growth (5 Easy Steps) — Jeremy Ethier
  syn_bicep_curls:                                'XE_pHwbst04',   // Bicep Curls — (DUMBBELL FORM & TECHNIQUE) — Fit Father Project - Fitness For Busy Fathers
  syn_cat_cow_breath_led:                         '1Y0YjXS9sKI',   // How to Do a Cat Cow Stretch: A Guide from Physical Therapists — Hinge Health
  syn_cat_cow_flow:                               '1Y0YjXS9sKI',   // How to Do a Cat Cow Stretch: A Guide from Physical Therapists — Hinge Health
  syn_cat_cow_hip_rocks:                          '1Y0YjXS9sKI',   // How to Do a Cat Cow Stretch: A Guide from Physical Therapists — Hinge Health
  syn_cat_cow_lateral_bow:                        '1Y0YjXS9sKI',   // How to Do a Cat Cow Stretch: A Guide from Physical Therapists — Hinge Health
  syn_child_s_pose_to_cobra_flow:                 'RnQmgpOzpkg',   // Child’s Pose to Cobra | Simple Spine Mobility Flow — WAVE Physical Therapy + Pilates
  syn_child_s_pose_wide_knee:                     '1MB_XclBMhA',   // Yin yoga tutorial: Wide knee child's pose with a twist | Yinfluence — Yinfluence
  syn_chin_tucks_isometric:                       'KqR1EoEmq9c',   // You're Doing Chin Tucks WRONG | Physical Therapist Teaches The Correct Way — Rehab and Revive
  syn_closing_meditation:                         'DbDoBzGY3vo',   // Breathing Exercises with Guided Meditation | 5 Minutes | TAKE A DEEP BREAT — Mike Maher | TAKE A DEEP BREATH
  syn_cobra_to_child_s_pose_flow:                 'RnQmgpOzpkg',   // Child’s Pose to Cobra | Simple Spine Mobility Flow — WAVE Physical Therapy + Pilates
  syn_commando_plank:                             'hD0JzzfaXB4',   // How to setup, perform the Commando Plank — AlphaFitCity.com
  syn_commando_plank_hold:                        'hD0JzzfaXB4',   // How to setup, perform the Commando Plank — AlphaFitCity.com
  syn_concentration_curls:                        'ebqgIOiYGEY',   // Concentration Curls Aren't Working for You (HERE'S WHY!) — ATHLEAN-X™
  syn_cossack_squat_assisted:                     'oQFqFije-BM',   // Assisted Cossack Squat — Somerset Fitness
  syn_cossack_squat_flow_assisted:                'usfu415_0AI',   // Assisted Cossack Squat — OPEX Fitness
  syn_couch_stretch_with_active_extension:        'XEBJCDY6hbM',   // Using & Exploring the Couch Stretch to IMPROVE your Hip Extension — Loco Motion New York
  syn_crab_walk:                                  '42cYOwpwOIc',   // How to properly perform Banded Crab Walk..(Band position for best Muscle A — Performance Sport & Spine
  syn_dead_bug_alternating:                       'GkosKAHcm58',   // How to do a Dead bug Alternating Leg Reach — TurnFit - Vancouver Personal Trainers
  syn_dead_bug_progression_slow_tempo:            'mCSUBupA3yg',   // Dead Bug Exercise Progression — Inner Dynamics Physical Therapy
  syn_deadlift:                                   'XxWcirHIwVo',   // How to PROPERLY Deadlift for Growth (5 Easy Steps) — Jeremy Ethier
  syn_deep_squat_hold:                            'XujJTXZxaYs',   // How to Deep Squat Hold — Man Flow Yoga
  syn_deep_squat_to_stand_assisted:               'IHApHfNA2Ag',   // How to Do a Deep Squat According to Physical Therapists — Hinge Health
  syn_deep_squat_walk_around:                     'IHApHfNA2Ag',   // How to Do a Deep Squat According to Physical Therapists — Hinge Health
  syn_donkey_kicks_with_band:                     'O4r7C5CxMw8',   // How To Do Resistance Band Donkey Kicks | Exercise Demonstration Video and  — Live Lean TV Daily Exercises
  syn_dumbbell_flyes:                             'QENKPHhQVi4',   // How to Properly Do a DUMBBELL FLY | Mind Pump — Mind Pump TV
  syn_dumbbell_kickbacks:                         'SaFWkVnGLPA',   // How to Perform Dumbbell Kickbacks - Proper Form for Maximum Tricep Growth — Cris Edmonds TV
  syn_dumbbell_overhead_extensions:               '-X5il2vPwqU',   // How to Perfect Your Dumbbell Overhead Extensions with Krissy Cela — EvolveYou
  syn_dumbbell_skull_crushers:                    '1BDGIcMTSXc',   // Dumbbell Triceps Skull Crusher — Onnit Academy
  syn_elevated_frog_pumps_feet_on_block:          'NK4axZ_5xCc',   // Feet Elevated Frog Pumps — Laura Lucas
  syn_explosive_hip_thrust:                       'da46ZUbxgjg',   // Explosive Hip Thrust — Ronan O Brien
  syn_figure_4_stretch_supine:                    '--IEeqF8VTg',   // Stretch Figure 4 Supine — The Doctors of Physical Therapy
  syn_finger_tendon_glides:                       'grbacaaEwjg',   // Finger Tendon Glides for Hand Injury or Surgery - Ask Doctor Jo — AskDoctorJo
  syn_fire_hydrant_with_kegel_hold:               'IRkRgk2Gc1E',   // How to Do a Fire Hydrant Exercise: A Guide from Physical Therapists — Hinge Health
  syn_frog_rocks:                                 'eSHUKW7eK2M',   // Frog Rocks — Chicago Chiropractic & Sports Medicine
  syn_frog_stretch_with_pulses:                   'dUuZLrUOmhU',   // Loosen Tight Hips With the Frog Stretch with Sea Lark Chiropractic — Sea Lark Chiropractic
  syn_front_raises:                               'CH9JzDStL3U',   // How to Do Dumbbell Front Raises | Proper Form & Tips — Colossus Fitness
  syn_glute_bridge_isometric:                     'cmkMMjo0fRo',   // Isometric Glute Bridge Hold: How to — Mobility Doc
  syn_glute_bridge_march:                         'rXAbcneAr3I',   // How to Do the Glute Bridge March | Abs Workout — Howcast
  syn_goblet_squats:                              'Mu7aVOjEBdA',   // How To: Goblet Squats — Mobility Doc
  syn_half_kneeling_hip_flexor_rotation:          'CkeaVh1sOjI',   // Half Kneeling Hip Flexor Stretch with Sidebend and Rotation — E3 Rehab Exercise Library
  syn_heel_elevated_squat_pulse:                  'MT9PdMD6qsw',   // Heel elevated goblet pulse squat — Dangerfit Personal Training
  syn_hip_cars_controlled_articular_rotations:    'xyFx3UeIjTk',   // Hip Mobility: Where to Start? CARs - Controlled Articular Rotations — B4 Fitness: BodyBUILDING B4 BodyBreaking
  syn_hip_cars_standing:                          'qhBzUkehLe0',   // Standing Hip CARs | Correct Form Demo (No Talking) — Dubai Wala Coach
  syn_hip_circles_on_all_fours_with_band:         '5HdkpRVr66E',   // All Fours Bent knee Hip Circles — Coach Alyssa Chang
  syn_hip_thrust_with_band:                       '2OaqZ-QAiYw',   // Hip Thrust with Resistance Band — Luke Briggs
  syn_incline_curls:                              'DCe8f6vMe9A',   // Stop Screwing Up Incline Dumbbell Curls (PROPER FORM!) — ATHLEAN-X™
  syn_incline_press:                              'VesHgJR14E8',   // INCLINE CHEST PRESS | Exercise Form Guide — Max Euceda
  syn_jefferson_curl_bodyweight:                  'nM747P0_OwM',   // Bodyweight Jefferson Curl — Functional Bodybuilding
  syn_kneeling_hip_flexor_stretch:                'iZ1eZBY4fwM',   // How To Do Kneeling Lunge (Hip Flexor Stretch) — PureGym
  syn_kneeling_hip_hinges_with_pelvic_tilt:       'K_SGYeZLWWU',   // Hip Hinge Pelvic Tilt — Cuirim Sports Recovery
  syn_lateral_band_walk:                          'y_bqFDQZSHQ',   // Lateral Band Walk | Proper Form Tutorial for Hip Stability — FIT.nl
  syn_lateral_bear_crawl:                         'he1k9F-P4DI',   // How to do a Lateral Bear Crawl | The Right Way | Well+Good — Well+Good
  syn_lateral_lunge_flow:                         'liFeq7swKfc',   // Side (Lateral) Lunge Technique — Mind Pump TV
  syn_lateral_neck_press_isometric:               'kwKq9n8ima4',   // How to Perform Neck Isometric Rehab Exercises for Neck Pain, Strength, and — Washington Park Chiropractic
  syn_legs_up_the_wall:                           'h2UrHSo9Pdk',   // How to Do Legs Up the Wall Yoga Pose | Pregnancy Workout — Howcast
  syn_lizard_lunge_rotation:                      'SSWWRQ87X2E',   // Lizard Lunge + Rotation | Thoracic Mobility | Tight Hips Relief — Commit To Life Fitness
  syn_lizard_lunge_thoracic_rotation:             'SSWWRQ87X2E',   // Lizard Lunge + Rotation | Thoracic Mobility | Tight Hips Relief — Commit To Life Fitness
  syn_lunges:                                     'ASdqJoDPMHA',   // HOW TO DO A LUNGE / LUNGES FOR BEGINNERS — Fitness For Transformation
  syn_meridian_side_stretch:                      'QawhsBp5IB8',   // The Side Stretch You Should Be Doing! — Tom Morrison
  syn_modified_hundred_feet_down:                 'sze_IgnsDK8',   // Flexing Feet During the Hundred | Teaching Tip — Balanced Body
  syn_overhead_press:                             'QAQ64hK4Xxs',   // How To Overhead Press For Bigger Shoulders (5 Mistakes You're Probably Mak — Jeremy Ethier
  syn_overhead_tricep_extension:                  'fYqswDVbJDg',   // HOW TO: Overhead Triceps Extension (BEST EXERCISE FOR HUGE TRICEPS) || PER — ScottHermanFitness
  syn_pelvic_clocks:                              'Ie9MNEKXfTI',   // Pelvic Clocks — [P]rehab
  syn_pelvic_curls_bridge_flow:                   'C0IsZDzR8Og',   // HOW TO PROPERLY BRIDGE - LEARN THE PELVIC CURL — alystacie
  syn_pike_push_ups:                              '226O2XfevJ0',   // How To Do Pike Push Ups — Calixpert
  syn_pilates_roll_up_modified:                   'PGnibcCcAUE',   // How to do a Pilates Roll Up | The Right Way | Well+Good — Well+Good
  syn_pilates_swimming_modified:                  '34JojDmn94g',   // The modified Pilates Swimming - level 1 — Mountain Movement Fitness
  syn_plank_hold:                                 '6LqqeBtFn9M',   // How to do the perfect PLANK: technique and common mistakes — Get Exercise Confident
  syn_plank_up_downs:                             'OZjX3gyca3c',   // Plank Up/Downs Tutorial — Form First Fitness
  syn_prone_back_extension_cobra:                 'j_55FmX9ZOk',   // Correct A Lower Back (Lumbar Spine) Shift With A Prone Cobra Exercise - Le — Online Physio Expert
  syn_prone_y_t_w:                                'QdGTI4Lshg4',   // Prone Y T W — The Active Life
  syn_push_up_to_side_plank:                      'pJUY83BsReY',   // How to do Push-Up To Side Plank | Joanna Soh — Joanna Soh
  syn_qigong_arm_circles:                         '3STTSi_jdHk',   // How To Arm Circles | Nuffield Health — Nuffield Health
  syn_qigong_shaking:                             'PacNJE1XOhc',   // Qigong for Beginners: Shaking the Body Qigong — Master Daniel Lee - Tai Chi & Qigong
  syn_quadruped_hip_circles:                      'xke_FGQjMEM',   // Quadruped Hip Circles - Exercise Demonstration — The Barefoot Sprinter
  syn_quadruped_hip_extension:                    '8C2wimwn3LI',   // Exercise Tutorial: Hip Extension Quadruped Position — Travis Tarrant
  syn_reclined_spinal_twist:                      'ezyMaQEaVaI',   // How to do Supta Matsyendrasana - Supine Spinal Twist - Beginners Yoga — Yoga & You
  syn_resistance_band_adductor_squeeze:           'LV10oi6ruUY',   // How To Properly Do An Adductor Ball Squeeze - Inner Thigh Strength Exercis — Wellen
  syn_reverse_flyes:                              'dC7jhEk-29A',   // How to PROPERLY Reverse Pec Deck Fly (DO THIS) — Colossus Fitness
  syn_reverse_lunge_to_knee_drive_step_back_only: 'ezhwJ0i1XYE',   // Step Back Lunge w Knee Drive — Incline Strength & Fitness
  syn_reverse_lunges:                             'RZKXLMxPF_I',   // Dumbbell Reverse Lunges | How To | Proper Form & Technique — FITTR
  syn_reverse_nordic_modified:                    '0OkyP-qFwlk',   // Reverse Nordic Technique — Gede Foster
  syn_reverse_snow_angels:                        '0qLP2RNKX4A',   // How to Do：REVERSE SNOW ANGELS — Leap Fitness
  syn_reverse_wrist_push_ups_backs_of_hands:      'H-Kp4VdZ8gQ',   // How to fix your wrist pain during push ups and wrist bending backward — All About Rehab
  syn_romanian_deadlift:                          'fKWeeTI8jlQ',   // How to Romanian Deadlift Properly (Avoid Back Pain) — Sharelle Grant
  syn_rotation_isometric:                         'WkOqC4LfSGA',   // Rotator Cuff Isometric Exercises (External and Internal Rotation) — Gordon Physical Therapy
  syn_seated_dumbbell_calf_raises:                'fFWpWJy8ybU',   // How To: Dumbbell Seated Calf Raise — Live Lean TV Daily Exercises
  syn_seated_forward_fold_yin_style:              'EyHTs9_-vKA',   // Seated Forward Fold with Modifications - Yin Yoga Pose for Tight Legs - Yo — The Moonflower Path
  syn_segmental_cat_cow:                          'mSzU47-uPb4',   // How to do a Segmental Cat Cow — TurnFit - Vancouver Personal Trainers
  syn_shavasana_with_body_scan:                   'rKBEGpzK25s',   // 10 Minute Guided Meditation for Relaxation - Savasana Body Scan — Yoga With Bird
  syn_shoulder_dislocates:                        'SL8VAYpmpCQ',   // SHOULDER DISLOCATES — Atomic Athlete
  syn_side_lying_adductor_lifts:                  'p-ShPzWxjzA',   // Side lying Adductor Lifts — Dr. Christy Lee
  syn_side_lying_clamshell_hip_er:                'm7RyKQV4XhE',   // The Side Lying Clam Exercise for the Hip - Explained — www.sportsinjuryclinic.net
  syn_side_lying_leg_lift_tai_chi_pace:           'VlwBJE1WtOQ',   // How to Do：SIDE-LYING LEG LIFT — Leap Fitness
  syn_side_lying_thoracic_windmill:               '4ReGvUD-7iU',   // Thoracic Spine Mobility | Side Lying Windmill — Tangelo - Seattle Chiropractor + Rehab
  syn_side_plank_thread_the_needle:               'TfLt8orAiiQ',   // Side Plank Thread the Needle — MoveMend Rehab and Training
  syn_single_arm_dumbbell_row:                    'dFzUjzfih7k',   // How to do the SINGLE ARM DUMBBELL ROW! | 2 Minute Tutorial — Max Euceda
  syn_single_leg_balance_eyes_closed:             'okRFJ_1GmqY',   // Single Leg Balance With Eyes Closed — altaTherapies
  syn_single_leg_calf_raises:                     'crM3pHqjxSg',   // How To Do, Perform Single Leg Calf Raises Exercise With Dumbbells For Begi — Whats Up Dude
  syn_single_leg_circle_small:                    'nlHrAwsal1w',   // How to do Single Leg Circle | Joanna Soh — Joanna Soh
  syn_single_leg_rdl_assisted:                    'Zfr6wizR8rs',   // The BEST Single-Leg RDL Tutorial (Romanian Deadlift) — Squat University
  syn_slow_step_down:                             '9fQnswyCZ0Y',   // Slow Step Downs — Inside Out Training
  syn_snake_flow_prone_spinal_wave:               '2UAko2ErAyU',   // VenusFit: Wave Flow - how to create healthy spinal mobility and strength — VenusFit
  syn_sphinx_to_seal_flow:                        'HFY2LS72ODk',   // Yin Yoga Tutorial: Sphinx & Seal — The Yin Method
  syn_spine_flexion_extension_in_squat:           'E5kzsLcxLVw',   // How to Align YO SPINE During a Squat — MoveU
  syn_spine_twist_seated:                         'XbQzj8rjBbw',   // How to Do the Spine Twist | Pilates Workout — Howcast
  syn_split_squat_shallow:                        'hXpGSa5HYqY',   // How to do a SPLIT SQUAT — Atomic Athlete
  syn_squats:                                     'xuf1czJv-XI',   // How to Do Squats Correctly [Exercise At Home] — Babylon
  syn_stability_ball_hamstring_curl:              'sn9ljNil_F4',   // Stability Ball Hamstring Curl Tutorial | HNL Movement — HNL Movement | Optimizing Human Performance
  syn_stability_ball_hamstring_curls:             '8Wagn999nhA',   // How To Do Stability Ball Hamstring Curls — Tangelo - Seattle Chiropractor + Rehab
  syn_standing_calf_raises_wall_support:          'k8ipHzKeAkQ',   // Exercises with an Athletic Trainer: Standing Calf Raises — Children's Hospital Colorado
  syn_standing_figure_8_hips:                     'q7GPVEDzVMw',   // How to do Latin Hip Action. Figure 8 exercises. — Ballroom with Alexey
  syn_standing_hip_cars:                          'Z8RuMjxYKgk',   // Try This Hip Exercise for Stronger Mobility! Standing Hip CARs — Mobility Doc
  syn_standing_hip_hinge_hip_internal_rotation:   'AnkBK38UNhA',   // Standing Hip Internal/External Rotation — Strive2Move
  syn_standing_hip_isolations:                    'AXDy-GrK4Ww',   // Standing Hip Hike | RPI Physical Therapy — Rehabilitation Professionals, Inc.
  syn_standing_knee_circles:                      'urrVyUcNdkY',   // How To: Standing Knee Circles — Live Lean TV Daily Exercises
  syn_standing_pelvic_power_circles:              '1VQ5ITSDpaI',   // How to Do a Standing Pelvic Tilt | Back Workout — Howcast
  syn_standing_roll_down:                         'ZbpwzA3AuI8',   // Standing Roll Down, How to do a Standing Roll Down exercise || healthspanM — Robert Todd Hurst, MD, FACC, FASE - HealthspanMD
  syn_standing_spinal_roll_down:                  'tUDhqhLMXsU',   // Pilates Roll Down From Standing / Beginners Pilates / Spinal Flexion — Lucy Filce Pilates
  syn_standing_spinal_twists:                     'UPGXfQZjcDw',   // Standing Spinal Twists | Exercise For Back Pain Relief | Full Body mobilit — O'Coach - HIIT Timer, Yoga, Tabata, Rehab App
  syn_standing_thoracic_rotation:                 'PWmNVcs8rJY',   // Standing Thoracic Rotation — Garrett McLaughlin
  syn_supine_butterfly:                           'C6IhNrbZHfA',   // Supine Butterfly Stretch — Pillar Kinetic
  syn_supine_hip_circles_with_legs_extended:      '_5iz_drS2-g',   // Supine Hip Circles — Elevate Chiropractic and Rehab
  syn_supine_leg_slides:                          'sju4rw5_jmI',   // Supine Leg Slides — CCEDseminars
  syn_supported_side_plank_knee_down:             'ic40NXcsQ2M',   // How To Properly Do A Knee Plank - Strength Exercises - Wellen — Wellen
  syn_swimmers_prone:                             'P_YdO_bLrwk',   // Prone Swimmers — The Active Life
  syn_tai_chi_cloud_hands:                        'jGTFq5yaAwU',   // Cloud Hands Tai Chi Tutorial with English Instruction | Tai Chi Qigong | I — QIGONG TAICHI CENTRE | Yogalily Studio
  syn_tai_chi_waving_hands:                       '9aT4oSvyHww',   // Learn Sun Style Tai Chi Waving Hands in Clouds Form - A Step-by-Step Guide — Internal Tai Chi
  syn_terminal_knee_extension:                    'd5khkVKosUE',   // How to Do a Prone Terminal Knee Extension Exercise | 30 Seconds | MedBridg — Medbridge
  syn_thread_the_needle_to_hip_circle:            'D1H-51sH-fI',   // Thread the Needle and Hip Circles for Shoulder and Hip Mobility — FitCity CrossFit
  syn_toe_taps_lying:                             'yvoIdwwwCpE',   // How To Properly Do Supine Toe Taps - Strength and Posture Exercises - Well — Wellen
  syn_toe_taps_supine:                            'yvoIdwwwCpE',   // How To Properly Do Supine Toe Taps - Strength and Posture Exercises - Well — Wellen
  syn_tricep_dips:                                'oA8Sxv2WeOs',   // How to do Chest Dips vs Tricep Dips — nutritioneering
  syn_tricep_dips_with_leg_extension:             'cQ4eqmpbkNM',   // How To: do a tricep dip with leg extension LIKE A BOSS — Katie Wygant
  syn_wall_angels:                                'ywYi4rBhRBQ',   // How To Do Wall Angels - Tangelo Health — Tangelo - Seattle Chiropractor + Rehab
  syn_wall_knee_drive_ankle_dorsiflexion:         'Clutk_VsgUY',   // How To Do The KNEE TO WALL ANKLE DORSIFLEXION TEST | Exercise Demonstratio — Live Lean TV Daily Exercises
  syn_wall_sit_isometric:                         'JjWs0cwqxEk',   // Wall Sit - HASfit Squat Exercise Demonstration - Wall Squat Form - Isometr — HASfit
  syn_wall_sit_qigong_breath:                     'cWTZ8Am1Ee0',   // How to Do a Wall Sit Exercise | 30 Seconds | MedBridge — Medbridge
  syn_wall_slide_protraction:                     '4QqcbCjnnlw',   // How to Do a Shoulder Flexion Wall Slide with Towel Exercise | 30 Seconds | — Medbridge
  syn_world_s_greatest_stretch_flow:              'T6j7BpxeqqU',   // World’s Greatest Stretch | Tutorial — FIT.nl
  syn_wrist_cars:                                 'ZxdrkW_orFI',   // How To Do Wrist CARs — Alex Murphy
  syn_wrist_push_ups_palms_down:                  'MSXslgJV9g0',   // Wrist Pain with Push Ups? (How To Help | Wrist Extension Mobility) — E3 Rehab
  tandem:                                         'MuueTXaBJ3k',   // Tandem Walk — BSR Physical Therapy
  teaser:                                         'UJ5gZQSqlXo',   // How to Do Teaser 1 | Pilates Workout — Howcast
  techstand:                                      'W1z4rVOsGH4',   // Technical Stand Up : How to do it properly !!!! — Power Academy Tunisia
  toeyoga:                                        'jXN7vflnH6c',   // How to Improve Toe Spread — Chulel-Corrective Bodywork & Pilates
  towelhang:                                      'UpP-77-GeLA',   // How to Perform a Towel Dead Hang — Nottingham Physio
  trapcarry:                                      'Zyiui0FXwns',   // Trap Bar Farmer Carry — Jason Brown
  trapdeadlift:                                   'EsqwERaSTMI',   // How To Trap Bar Deadlift *Build Strength And Size* | Form Check | Men's He — Men’s Health Muscle
  vo2max:                                         'ZNs2qTXlRfg',   // How to improve your VO₂ max as a beginner — Peter Attia MD
  wallangel:                                      'ywYi4rBhRBQ',   // How To Do Wall Angels - Tangelo Health — Tangelo - Seattle Chiropractor + Rehab
  woodchop:                                       '5ab5UQ468M0',   // Ripped Obliques w/ The Dumbbell Wood Chopper - Quick How To — MuscleWiki
  wu_batwing_row:                                 'J531b8jwGc4',   // Batwing Rows — Somerset Fitness
  wu_bench_dip:                                   'j_WpuVY3wbo',   // How To Do Bench Dips For Bigger Triceps - The Proper Form, Sets, Reps & Ro — Fit Father Project - Fitness For Busy Fathers
  wu_cs_db_row:                                   'vmX58YYK3-8',   // Perfect Dumbbell Chest Supported Rows (KING of Back Exercises) — Seriously Strong Training
  wu_cs_rear_delt_fly:                            'iCbVhDNpG-Y',   // DB Chest Supported Rear Delt Fly — Functional AF
  wu_db_floor_press:                              'T0Y3OBF1bNI',   // How To Do A Dumbbell Floor Press — PureGym
  wu_db_russian_twist:                            'TfTUk2AjV7g',   // Russian Twists with Dumbbell — Critical Bench Compound
  wu_heel_elevated_squat:                         '7JWehDbcrnM',   // Why You Should Do Heel Elevated Squats - COMPLETE GUIDE (Benefits, Demonst — Chaplin Performance
  wu_incline_decline_pushup:                      'QBlYp-EwHlo',   // How To Do A Decline Push Up — PureGym
  wu_reacher_row:                                 'vDX7NG2KuGA',   // Reach and Row: Master the Reacher Row for Total Upper Body Strength! — TGRIP
  wu_seated_db_press:                             'rO_iEImwHyo',   // How to do the SEATED DUMBBELL SHOULDER PRESS! | 2 Minute Tutorial — Max Euceda
  wu_single_arm_lat_row:                          'zEFFP3B8WuA',   // Single Arm Lat Biased Cable Row | COMPLETE GUIDE | Target the middle lats  — ATLASTHETICS
  wu_single_leg_rdl:                              'Oi40un_XoOw',   // Single Leg RDLs (You're Doing It WRONG!) — MOVE with Dr. Mike
  wu_standing_db_press:                           'OOe_HrNnQWw',   // How to: Standing DB Shoulder Press for Physique Development — Physique Development
  wu_step_up:                                     'aKj-6hgiViA',   // How To PROPERLY Perform Dumbbell Step Ups (GLUTE FOCUSED) — Colossus Fitness
  wu_upright_row:                                 'K0dYqPCaO14',   // How-To Perform Upright Rows | Dumbbell Exercise Tutorial — Buff Dudes Workouts
  wu_weighted_deadbug:                            'hUAROQHYJ64',   // Weighted Deadbug — Simone Sports Performance
  wu_weighted_leg_raise:                          'mE19zgF7fFQ',   // How to do Leg Raises | Form, Tips & Mistakes — The Bodyweight Process
  wu_weighted_pushup:                             'I9fsqKE5XHo',   // Do Push-Ups with Proper Form! — Upright Health
  wu_weighted_step_up_glute:                      'aKj-6hgiViA',   // How To PROPERLY Perform Dumbbell Step Ups (GLUTE FOCUSED) — Colossus Fitness
  wuankle:                                        'dV5opNYJvQE',   // Ankle Rolls — Kyle Norman
  wuarm:                                          '3STTSi_jdHk',   // How To Arm Circles | Nuffield Health — Nuffield Health
  wuband:                                         'X0jsl2ZrXug',   // How to Do Banded Side Steps Properly — [P]rehab
  wucardio:                                       'u3zgHI8QnqE',   // How To Jump Rope | The Right Way | Well+Good — Well+Good
  wuhip:                                          'D_kQzMB_HkY',   // How to do standing hip circles (Home training exercise) — Sporting Health Club
  wuleg:                                          'difYoBtZi2s',   // How To Do Leg Swings — PureGym
  zone2:                                          'AyMUWBUt3WY'   // How To Turbo Charge Zone 2 Training — Global Cycling Network
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

/* =====================================================================
   GUIDE SCREEN
   ===================================================================== */
function renderGuide() {
  const g = programGuide();
  titleEl.textContent = 'Guide';
  subEl.textContent   = pLabel();
  if (!g) {
    view.innerHTML = `<div class="screen"><div class="card guide-empty">
      <div class="rail-kicker">Guide</div>
      <p>This program does not carry a guide yet. Programs that do show their coaching here — what to eat and when, what to take, and what to watch for.</p>
    </div></div>`;
    return;
  }
  const st = pstate();
  const dayNum = st && st.day ? st.day : 1;
  const d = pdata()[dayNum - 1];
  const today = guideCardsFor(dayNum, d && d.title);

  /* Sections are numbered in the order they actually render, so the numeral
     means "third thing on this page" rather than "third entry in the data" —
     which is what it looks like it means when you are scrolling. */
  let n = 0;
  const head = (title, icon) => {
    n += 1;
    return `<h2 class="guide-head">
      <span class="guide-num">${String(n).padStart(2, '0')}</span>
      ${icon ? `<span class="guide-ico" aria-hidden="true">${icon}</span>` : ''}
      <span class="guide-head-t">${title}</span>
    </h2>`;
  };

  /* the day's own three cards lead the page, in the app's accent rather than
     a section colour — this is the live one, the rest are reference */
  const todayHTML = today.length ? `
    <section class="guide-group guide-now">
      ${head('For today', '📌')}
      <div class="guide-today">${today.map(c => `<div class="card guide-card">
        <div class="rail-kicker">${c.kicker}</div>
        <div class="guide-card-title">${guideRich(c.title)}</div>
        <p class="guide-card-body">${guideRich(c.body)}</p>
      </div>`).join('')}</div>
    </section>` : '';

  /* the "watch for" group is the only one that is a caution rather than an
     instruction, so it is the only one that gets a warning tint */
  const groups = (g.groups || []).map(gr => {
    const warn = /watch/i.test(gr.title) ? ' guide-group-warn' : '';
    return `
    <section class="guide-group${warn}" data-tone="${gr.tone || ''}">
      ${head(gr.title, gr.icon)}
      <div class="guide-items">${gr.items.map(it => `<div class="card guide-item">
          <div class="guide-item-title">${guideRich(it.title)}</div>
          <p class="guide-item-body">${guideRich(it.body)}</p>
        </div>`).join('')}</div>
    </section>`;
  }).join('');

  view.innerHTML = `<div class="screen">
    <header class="guide-mast">
      <div class="guide-eyebrow">Program guide</div>
      <h1 class="guide-title">${pLabel()}</h1>
      <div class="guide-mast-rule"></div>
      ${g.blurb ? `<p class="guide-lead">${g.blurb}</p>` : ''}
    </header>
    ${todayHTML}
    ${groups}
    ${g.sources ? `<div class="card guide-sources"><div class="rail-kicker">Where this comes from</div><p>${g.sources}</p></div>` : ''}
  </div>`;
}

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
    ${strengthChartsHTML()}
    ${liftTrackerHTML()}
    ${calendarHTML()}
    ${achievementsCardHTML()}
    <button class="btn secondary" id="shareBtn">📤 Share my progress</button>
  </div>`;
  drawProjectionCharts();
  drawStrengthCharts();
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
    ${strengthChartsHTML()}
    ${liftTrackerHTML()}
    ${calendarHTML()}
    ${achievementsCardHTML()}
    <button class="btn secondary" id="shareBtn">📤 Share my progress</button>
  </div>`;
  drawStrengthCharts();
  const sb = document.getElementById('shareBtn'); if (sb) sb.onclick = shareCard;
  wireLiftTracker();
  wireCalendar();
}

/* =====================================================================
   Strength progression, per movement, from what was actually lifted.

   The two charts that already existed do not answer this. ch1/ch2 plot the
   Texas Method's PLANNED intensity — a projection of what the program
   intends, drawn whether or not you did it — and the lift-tracker charts only
   cover the four lifts you log by hand.

   This reads real session history: the working weight written into each day
   log as a session is completed, across every program, plus the manual log.
   Sessions recorded before v133 have no weight stored and simply are not
   points; that is why a chart fills in from the day you start rather than
   showing a history it cannot know.
   ===================================================================== */
function strengthSeries(key) {
  const pts = [];
  (S.liftLog && S.liftLog[key] ? S.liftLog[key] : []).forEach(e => {
    if (e && e.w) pts.push({ date: e.d, w: e.w, r: e.r || null });
  });
  Object.keys(DAY_PROGRAMS).forEach(pk => {
    const cfg = DAY_PROGRAMS[pk];
    const st = S[cfg.stateKey];
    if (!st || !st.log) return;
    Object.keys(st.log).forEach(d => {
      const L = st.log[d];
      if (!L || !L.w || L.w[key] == null) return;
      const reps = [];
      Object.keys(L.reps || {}).forEach(k => {
        if (k === key || k.indexOf(key + '_') === 0) reps.push(L.reps[k]);
      });
      pts.push({
        date: L.date || null,
        day: +d,
        w: L.w[key],
        r: reps.length ? Math.max.apply(null, reps) : null
      });
    });
  });
  /* dated points first in date order, then any undated ones by day number —
     an undated point cannot be interleaved honestly, so it trails */
  const dated = pts.filter(p => p.date).sort((a2, b2) => a2.date < b2.date ? -1 : 1);
  const undated = pts.filter(p => !p.date).sort((a2, b2) => (a2.day || 0) - (b2.day || 0));
  return dated.concat(undated);
}

/* Every loaded movement the app can progress, plus the four hand-logged
   lifts. Built from SA_WEIGHT so a movement added later appears here without
   being listed twice. */
function strengthLifts() {
  const seen = new Set(), out = [];
  LIFT_TRACK.forEach(t => { seen.add(t.key); out.push({ key: t.key, name: t.name }); });
  Object.keys(SA_WEIGHT).forEach(k => {
    if (seen.has(k)) return;
    seen.add(k);
    const tip = FORM_TIPS[k];
    out.push({ key: k, name: (tip && tip.title) || k });
  });
  return out;
}

function strengthChartsHTML() {
  const lifts = strengthLifts().map(l => Object.assign({}, l, { pts: strengthSeries(l.key) }));
  const withData = lifts.filter(l => l.pts.length >= 1);
  const waiting = lifts.filter(l => l.pts.length === 0);
  if (!withData.length) {
    return `<h2 class="section">Strength progression</h2>
      <div class="card"><div class="tiny muted">
        No lifts recorded yet. Complete a session with a loaded movement and its chart starts here \u2014 one per exercise, filling in as you train.
      </div></div>`;
  }
  const cards = withData.map(l => {
    const last = l.pts[l.pts.length - 1];
    const first = l.pts[0];
    const delta = l.pts.length > 1 ? last.w - first.w : 0;
    const sign = delta > 0 ? '+' : '';
    return `<div class="card str-card">
      <div class="str-head">
        <div class="str-name">${l.name}</div>
        <div class="str-now">${fmt(last.w)} <small>${unit()}</small>${
          l.pts.length > 1 ? `<span class="str-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${sign}${fmt(delta)}</span>` : ''
        }</div>
      </div>
      ${l.pts.length > 1
        ? `<canvas id="str_${l.key}" class="str-chart"></canvas>`
        : `<div class="tiny muted">One session recorded. The chart appears once there are two points to draw a line between.</div>`}
      <div class="tiny muted str-sub">${l.pts.length} session${l.pts.length === 1 ? '' : 's'} recorded${
        last.r ? ' \u00b7 last set ' + last.r + ' reps' : ''}</div>
    </div>`;
  }).join('');
  const waitingLine = waiting.length
    ? `<div class="tiny muted" style="margin-top:8px">${waiting.length} more movement${waiting.length === 1 ? '' : 's'} will chart here once you train ${waiting.length === 1 ? 'it' : 'them'}.</div>`
    : '';
  return `<h2 class="section">Strength progression</h2>${cards}${waitingLine}`;
}

/* Drawn after the markup is in the document — a canvas has no width until it
   is laid out, and lineChart reads clientWidth. */
function drawStrengthCharts() {
  strengthLifts().forEach(l => {
    const pts = strengthSeries(l.key);
    if (pts.length < 2) return;
    const cv = document.getElementById('str_' + l.key);
    if (!cv) return;
    const pal = chartPalette();
    const series = [{ name: l.name, color: pal[0], data: pts.map(p => p.w) }];
    /* an estimated one-rep max only means anything where reps were recorded */
    if (pts.every(p => p.r)) {
      series.push({ name: 'Est. 1RM', color: pal[2], data: pts.map(p => Math.round(oneRM(p.w, p.r))) });
    }
    lineChart(cv, series, pts.map((p, i) => p.date ? p.date.slice(5) : String(i + 1)));
  });
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
          ['gen','🎲','Random Generator','a fresh workout on demand'],
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
      <div class="field"><label>Set loading</label>
        <div class="seg" id="segWave">
          <button data-wave="1" class="${s.waveLoad === false ? '' : 'on'}">Wave</button>
          <button data-wave="0" class="${s.waveLoad === false ? 'on' : ''}">Flat</button>
        </div>
        <div class="hint">Wave ramps into a top set, drops back for one, then goes to the top again — you earn the heaviest set instead of starting there. Flat puts every set at the working weight. Either way the weight only rises when every set hits its target.</div>
      </div>
      <div class="field"><label>After 3 failed sessions</label>
        <div class="seg" id="segDeload">
          <button data-deload="1" class="${s.autoDeload === false ? '' : 'on'}">Drop 10%</button>
          <button data-deload="0" class="${s.autoDeload === false ? 'on' : ''}">Hold the weight</button>
        </div>
        <div class="hint">Weight never goes up unless you hit every set — that does not change. This is only what happens when a lift has stalled three sessions running: drop back and rebuild, or sit at the same weight until you clear it.</div>
      </div>
      <div class="field"><label>Glutes first</label>
        <div class="seg" id="segGlutes">
          <button data-glutes="0" class="${fpPriority().indexOf('glutes') < 0 ? 'on' : ''}">Leave the order</button>
          <button data-glutes="1" class="${fpPriority().indexOf('glutes') >= 0 ? 'on' : ''}">Glutes first</button>
        </div>
        <div class="hint">Follows you between programs. Glute work moves earlier in the session, where you are freshest, whichever program you are running. Warm-ups and jumps stay where they are — jumps lead a session because they want a fresh nervous system, so promoting anything above them would break the thing it sits in. Nothing is added or removed and supersets stay paired; only the order changes, and the day says when it did.</div>
      </div>
      <div class="field"><label>Knees</label>
        <div class="seg" id="segKnee">
          <button data-knee="0" class="${kneeCare() ? '' : 'on'}">No limits</button>
          <button data-knee="1" class="${kneeCare() ? 'on' : ''}">Go easy on them</button>
        </div>
        <div class="hint">Follows you between programs instead of being tied to one. Deep squats, loaded lunges, step-ups and jumps are replaced by knee-safe movements — whichever program you are running. A stand-in can only lower the kit you need, never raise it, and swapped rows say what they were swapped from. A day never repeats a stand-in: if it runs out of safe movements the extra ones are dropped and the day says so, because doing fewer things beats doing the same shallow split squat four times. The cost is real: removing the jumps removes the bone-density stimulus, so raise it with whoever looks after your knees rather than leaving this on forever.</div>
      </div>
      <div class="field"><label>Heaviest dumbbell / kettlebell (per hand)</label>
        <input type="number" inputmode="numeric" id="dbMax" value="${s.dbMax ?? 25}" />
        <div class="hint">Dumbbell and kettlebell suggestions stop here instead of climbing past what is on the rack. Barbell and trap bar are loaded from plates, so they are not capped.</div>
      </div>
      <div class="field"><label>Equipment available</label>
        <div class="seg" id="segEquip">
          ${['gym','bodyweight'].map(k =>
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
      <div class="hint">Clears every set you have ticked, your workout history, personal records, streaks and progression weights — and with them the achievements, which are earned from that data rather than stored separately. Your settings, programs and Fingerprint scores are kept.</div>
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
  view.querySelectorAll('#segWave button').forEach(b2 => b2.onclick = () => {
    s.waveLoad = b2.dataset.wave === '1'; save(); render();
  });
  view.querySelectorAll('#segDeload button').forEach(b2 => b2.onclick = () => {
    s.autoDeload = b2.dataset.deload === '1'; save(); render();
  });
  view.querySelectorAll('#segGlutes button').forEach(b2 => b2.onclick = () => {
    const fp = Object.assign({ jointCautions: [], priorityMuscles: [] }, s.footprint);
    const set = (fp.priorityMuscles || []).filter(m => m !== 'glutes');
    if (b2.dataset.glutes === '1') set.push('glutes');
    fp.priorityMuscles = set;
    s.footprint = fp; save(); render();
  });
  view.querySelectorAll('#segKnee button').forEach(b2 => b2.onclick = () => {
    const fp = Object.assign({ jointCautions: [], priorityMuscles: [] }, s.footprint);
    const set = (fp.jointCautions || []).filter(c => c !== 'knees');
    if (b2.dataset.knee === '1') set.push('knees');
    fp.jointCautions = set;
    s.footprint = fp; save(); render();
  });
  const dbm = document.getElementById('dbMax');
  if (dbm) dbm.onchange = () => { s.dbMax = Math.max(5, +dbm.value || 25); save(); render(); };
  view.querySelectorAll('#segGoal button').forEach(b => b.onclick = () => {
    s.weeklyGoal = +b.dataset.goal; save(); render();
  });
  view.querySelectorAll('#segEquip button').forEach(b => b.onclick = () => {
    /* the header pill reads the same setting, so refresh it too */
    setTimeout(renderEquipBtn, 0);
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
   achievements are derived from. S.history, S.prs and the per-program day
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
  /* every day-program's cursor and log — prep days and streaks live here */
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
/* every "open the full guide" button, wherever it is rendered */
document.addEventListener('click', e => {
  if (e.target.closest('[data-goguide]')) { TAB = 'guide'; window.scrollTo(0, 0); render(); }
});
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
  /* Pinned videos were never in the bundle, so a factory reset wiped them and
     a restore could not bring them back — and they never reached a second
     device either. They are per-device, not per-profile, so they ride at the
     top level. */
  return { type: 'tm_full_backup', version: 1, profiles, states, videos: loadVideos() };
}
/* ---------------------------------------------------------------------
   Today's session, published for other surfaces.

   Kandy's Command Center used to re-derive the workout from raw state and
   fell back to classic Texas Method for any program it did not recognise -
   so a Sims program was being shown as Squat/Bench/Deadlift with invented
   weights. Rather than teach the dashboard every program's data (which lives
   here, in plans-data.js), the app publishes what it is actually showing and
   the dashboard reads it verbatim. One source of truth.

   Always the session as programmed (Core). The tier is a session-only dial
   that is deliberately not persisted and resets each day, so a published
   tier-adjusted session would be stale the moment it changed.
   --------------------------------------------------------------------- */
function buildTodayPublic() {
  try {
    const proto = typeof PROTOCOLS !== 'undefined'
      ? PROTOCOLS.find(p => p.key === S.program) : null;
    const out = {
      date: isoDate(new Date()),
      program: S.program,
      programName: (proto && proto.name)
        || (isDayProgram() && pcfg().label) || String(S.program || ''),
      title: '',
      rest: false,
      exercises: []
    };

    if (isDayProgram()) {
      const day = pstate().day;
      const d = pdata()[day - 1];
      out.day = day;
      out.totalDays = ptotal();
      out.title = (d && d.title) ? d.title : ('Day ' + day);
      if (!d || d.rest) { out.rest = true; return out; }
    } else {
      out.title = 'Week ' + (S.cursor.week + 1) + ' · Day ' + (S.cursor.day + 1);
    }

    /* force Core so the published session is the program, not today's dial */
    const keep = sessionTier;
    let steps;
    sessionTier = 'core';
    try { steps = buildSteps(); } finally { sessionTier = keep; }

    /* collapse identical consecutive sets into "3 x 10 reps" */
    const rows = [];
    steps.forEach(st => {
      const desc = st.kind === 'hold'
        ? (st.seconds + ' sec hold')
        : (st.amrap ? 'AMRAP' : (st.reps + ' reps'));
      const w = st.weight ? (' @ ' + fmt(st.weight) + unit()) : '';
      const last = rows[rows.length - 1];
      if (last && last.name === st.name && last.desc === desc && last.w === w) last.n++;
      else rows.push({ name: st.name, desc: desc, w: w, n: 1 });
    });
    out.exercises = rows.map(r =>
      r.name + ' — ' + (r.n > 1 ? (r.n + ' × ') : '') + r.desc + r.w);
    return out;
  } catch (e) {
    return null;   /* never let this break a cloud save */
  }
}

function applyBundle(bundle) {
  if (!bundle || !bundle.profiles || !bundle.states) return false;
  saveProfiles(bundle.profiles);
  Object.entries(bundle.states).forEach(([id, st]) => localStorage.setItem('tm_state_' + id, JSON.stringify(st)));
  /* Older bundles have no videos key — leave whatever is on this device alone
     rather than clearing it. */
  if (bundle.videos && typeof bundle.videos === 'object') {
    try { localStorage.setItem(VID_KEY, JSON.stringify(bundle.videos)); } catch {}
  }
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
  /* Deliberately the same test that is applied to the backup, so the device
     and the cloud copy cannot disagree about what counts as empty. Note what
     it does NOT do: counting log KEYS is wrong, because simply opening a
     workout creates an empty record for that day, so a freshly reset device
     already has one. It asks whether anything was actually ticked. */
  for (const p of profiles.list) {
    let st = null;
    try { st = JSON.parse(localStorage.getItem('tm_state_' + p.id) || '{}'); }
    catch { continue; }                       /* unreadable counts as fresh */
    if (stateHasActivity(st)) return false;
  }
  return true;
}

/* Does one profile's saved state contain any actual training?
   Used for BOTH sides of the sync question — the device and the backup — so
   "empty" means the same thing in both places. */
function stateHasActivity(st) {
  if (!st) return false;
  try {
    if ((st.history || []).length) return true;
    if (Object.keys(st.prs || {}).length) return true;
    if (st.sessions) return true;
    if (progHasActivity(st.logs || {})) return true;
    for (const cfg of Object.values(DAY_PROGRAMS)) {
      const sub = st[cfg.stateKey];
      if (sub && progHasActivity(sub.log || {})) return true;
    }
  } catch { /* unreadable counts as empty */ }
  return false;
}

/* A backup that exists but holds no training is not a competing copy — there
   is nothing to choose between it and an empty device. Asking anyway produced
   a loop: whichever button was pressed, both sides stayed empty and the
   question came back on the next load, because cloudStartSync runs on every
   auth state change. */
function bundleHasActivity(bundle) {
  if (!bundle || !bundle.states) return false;
  return Object.values(bundle.states).some(stateHasActivity);
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
      /* Only a device with nothing on it AND a backup with something on it is
         a real conflict. Two empties are not a question worth asking. */
      if (localLooksFresh() && bundleHasActivity(snap.data().bundle)) {
        dir = await cloudDirectionChoice(who);
      }
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
      await fb.setDoc(fb.ref, { updatedAt, writerId: cloudWriterId,
                              bundle: buildBundle(), today: buildTodayPublic() });
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
  ['You are not trying to finish a program, you are becoming someone who trains. Every session is a vote for that, and the votes compound.', 'Habit'],
  ['Make the streak visible. A row of completed days is a surprisingly stubborn thing to break, and this app already draws you one.', 'Habit'],
  ['Reduce the decision. Same time, same place, same first exercise. Willpower spent deciding is willpower not spent lifting.', 'Habit'],
  ['Type II muscle fibers shrink at roughly twice the rate of Type I after forty. Something explosive each week — a jump, a throw, a fast step-up — is what defends them.', 'Longevity'],
  ['VO2 max falls about ten percent a decade once it goes unchallenged, and it is the most reversible marker here. Two easy aerobic sessions a week move it more than one hard one.', 'Longevity'],
  ['Grip strength tracks with all-cause mortality more tightly than blood pressure does. Hang from something. It costs thirty seconds.', 'Longevity'],
  ['Eyes-closed balance drops from about ten seconds in your thirties to three by your sixties — and it comes back fast when trained. Practise it while the kettle boils.', 'Longevity'],
  ['Weak social ties carry a mortality risk comparable to smoking. Of everything here, that is the one most likely to be neglected by someone who trains seriously.', 'Longevity'],
  ['Almost no fall happens standing still — it happens mid-transition, rising or turning. Train the transitions, not just the strength.', 'Longevity'],
  ['Recovery is not time off from the program, it is part of it. Adaptation happens between sessions, not during them.', 'Training'],
  ['Add a little, recover well, repeat. Progressive overload is not complicated; it is just hard to stay patient with.', 'Training'],
  ['Leave two or three reps in reserve on most sets. Training to failure every session buys fatigue, not progress.', 'Training'],
  ['Consistency beats intensity across a year. The program you actually follow outperforms the better one you abandon in March.', 'Training'],
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

/* ---------------------------------------------------------------------
   "Last time you did this".

   Reads the most recent EARLIER day in the current program's log that has
   this movement. With wave loading on, a session has several weights, so what
   is reported is the TOP set — the number the progression actually tracks and
   the one worth beating.

   Days recorded before v133 have no weight stored, so those report reps only
   rather than inventing a number from the current working weight, which she
   may never have lifted.
   --------------------------------------------------------------------- */
function lastTimeFor(key) {
  if (!isDayProgram()) return null;
  const st = pstate();
  const today = st.day;
  const days = Object.keys(st.log || {}).map(Number)
    .filter(d => d < today).sort((a2, b2) => b2 - a2);
  for (const d of days) {
    const L = st.log[d];
    if (!L) continue;
    const reps = [];
    Object.keys(L.reps || {}).forEach(k => {
      if (k === key || k.indexOf(key + '_') === 0) reps.push(L.reps[k]);
    });
    const ticked = Object.keys(L.checks || {}).some(k => k === key || k.indexOf(key + '_') === 0);
    if (!reps.length && !ticked) continue;
    return {
      day: d,
      w: L.w ? L.w[key] : null,
      reps: reps,
      best: reps.length ? Math.max.apply(null, reps) : null,
      sets: reps.length
    };
  }
  return null;
}

function lastTimeHTML(key, name) {
  const L = lastTimeFor(key);
  if (!L) return '';
  const when = 'day ' + L.day;
  let line;
  if (L.w != null && L.best != null) line = fmt(L.w) + ' ' + unit() + ' \u00d7 ' + L.best + ' reps';
  else if (L.best != null) line = L.best + ' reps';
  else line = 'completed';
  const sub = L.w == null && L.best != null
    ? 'Weight was not recorded on that day \u2014 it is from here on.'
    : (L.sets > 1 ? 'Top set of ' + L.sets + ' \u00b7 ' + when : when);
  return `<div class="card rail-card">
      <div class="rail-kicker">Last time</div>
      <div class="rail-next">${line}</div>
      <div class="rail-next-sub">${sub}</div>
    </div>`;
}

/* ---------------------------------------------------------------------
   Warm-up ramp for barbell work.

   The plate math already existed; what was missing was telling you what to
   put on the bar on the way up. Percentages of the top set, snapped to real
   plates, stopping once a rung is not meaningfully lighter than the one
   before. Bodyweight and dumbbell movements get nothing — there is nothing to
   ramp.
   --------------------------------------------------------------------- */
const WARMUP_RUNGS = [
  { pct: 0,    reps: 8, label: 'Empty bar' },
  { pct: 0.45, reps: 5 },
  { pct: 0.65, reps: 3 },
  { pct: 0.85, reps: 2 }
];
function warmupRamp(key) {
  const h = saHint(key);
  if (!h || h.type !== 'bar') return null;
  const top = h.w, b0 = bar();
  const out = [];
  let prev = -1;
  WARMUP_RUNGS.forEach(r => {
    const w = r.pct === 0 ? b0 : snapWeight(top * r.pct, b0, getPlates());
    if (w >= top) return;             /* never warm up at or above the work set */
    if (w <= prev) return;            /* a rung that adds nothing */
    prev = w;
    out.push({ w: w, reps: r.reps, label: r.label });
  });
  return out.length ? out : null;
}
function warmupHTML(key) {
  const r = warmupRamp(key);
  if (!r) return '';
  return `<div class="card rail-card">
      <div class="rail-kicker">Warm-up</div>
      ${r.map(x => `<div class="warm-row"><span class="warm-w">${fmt(x.w)} <small>${unit()}</small></span><span class="warm-r">\u00d7 ${x.reps}</span></div>`).join('')}
      <div class="rail-next-sub">Then your first working set. Ramp only \u2014 stop short of failure.</div>
    </div>`;
}

/* =====================================================================
   Exercise library.

   497 movements now carry a written how-to and there has been no way to reach
   any of them except by waiting for a program to serve it up. This is a
   flat, searchable index of everything the app knows.

   It reads FORM_TIPS rather than a list of its own. That table is where
   genRegisterTips() and synRegisterTips() fold the generator's 110 and the
   imported programs' 201 at boot, so the library is complete by
   construction and cannot drift as movements are added.
   ===================================================================== */
let libQuery = '';

function libSource(key) {
  if (key.indexOf('gen_') === 0) return 'Generator';
  if (key.indexOf('syn_') === 0) return 'Programs';
  if (key.indexOf('gw_') === 0 || key.indexOf('gc_') === 0) return 'Warm-up / cool-down';
  return 'Core';
}

/* The same movement often exists in more than one source — a Barbell Hip
   Thrust is in both the generator and the imported programs, under different
   keys. The keys must stay distinct, because logs and progression are keyed by
   them, but showing the reader the same exercise twice is just noise. The
   library therefore groups by name and keeps the entry with the fullest
   how-to, listing every source it came from. */
function libEntries() {
  const norm = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const byName = new Map();
  Object.keys(FORM_TIPS).forEach(k => {
    const tip = FORM_TIPS[k] || {};
    const title = tip.title || k;
    const body = tip.body || '';
    const src = libSource(k);
    const n = norm(title);
    const hit = byName.get(n);
    if (!hit) {
      byName.set(n, { key: k, bodyKey: k, keys: [k], title: title, body: body, src: src, srcs: [src] });
      return;
    }
    if (hit.srcs.indexOf(src) === -1) hit.srcs.push(src);
    hit.keys.push(k);
    /* keep the richest text, and the title that goes with it */
    if (body.length > hit.body.length) { hit.body = body; hit.bodyKey = k; hit.title = title; }
  });
  /* Choose the key LAST, over all the merged keys, rather than as each
     duplicate arrives. Deciding it incrementally loses the demo whenever the
     movement with the video is seen before one with a longer paragraph — the
     key had already been reassigned by the time the video was considered. */
  byName.forEach(e => {
    const withVideo = e.keys.filter(k => videoFor(k));
    e.key = withVideo.length ? withVideo[0] : (e.bodyKey || e.keys[0]);
  });
  return [...byName.values()]
    .map(e => Object.assign(e, { src: e.srcs.length > 1 ? e.srcs.length + ' sources' : e.src }))
    .sort((a2, b2) => a2.title.localeCompare(b2.title));
}

function libMatches() {
  const q = libQuery.trim().toLowerCase();
  const all = libEntries();
  if (!q) return all;
  /* match the name first, then anything in the how-to text, so searching
     "knee" finds movements that only mention knees in their cues */
  const byName = all.filter(e => e.title.toLowerCase().indexOf(q) !== -1);
  const seen = new Set(byName.map(e => e.key));
  const byBody = all.filter(e => !seen.has(e.key) && e.body.toLowerCase().indexOf(q) !== -1);
  return byName.concat(byBody);
}

function libraryHTML() {
  const all = libEntries();
  const hits = libMatches();
  const rows = hits.slice(0, 120).map(e => {
    const vid = videoFor(e.key);
    return `<details class="lib-item">
      <summary>
        <span class="lib-name">${e.title}</span>
        <span class="lib-tags">${vid ? '<span class="lib-vid">video</span>' : ''}<span class="lib-src">${e.src}</span></span>
      </summary>
      <div class="lib-body">${e.body || 'No how-to written for this one yet.'}</div>
      ${vid ? `<div class="tip-video rail-video"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="${e.title} demo" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
            : `<a class="rail-vid-search" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.title + ' exercise how to')}" target="_blank" rel="noopener">Find a demo on YouTube \u2197</a>`}
    </details>`;
  }).join('');
  const more = hits.length > 120 ? `<div class="tiny muted center" style="margin-top:10px">Showing 120 of ${hits.length} \u2014 keep typing to narrow it.</div>` : '';
  return `<div class="screen">
    <h2 class="section">Exercise library</h2>
    <div class="card">
      <input id="libSearch" class="lib-search" type="search" placeholder="Search ${all.length} movements \u2014 name, muscle, or cue" value="${libQuery.replace(/"/g, '&quot;')}" />
      <div class="hint">Every movement the app knows, from all programs and the generator. Tap one to read the how-to.</div>
    </div>
    <div class="lib-count tiny muted">${hits.length} of ${all.length} movements</div>
    <div class="card lib-list">${rows || '<div class="tiny muted center">Nothing matches that.</div>'}</div>
    ${more}
  </div>`;
}

/* Rail order, top to bottom: habit, today, how-to, up next, after training.
   On a wide screen the rail is the right-hand column; on a phone it sits
   below the workout, so "bottom" is genuinely the end of the session. */
/* The guide is mostly numbers — 15 g, 2.2–2.4 g/kg, 30–45 minutes — and a
   dose buried mid-sentence is a dose you scroll past. Lifting them out
   turns each card into something you can scan for the figure you came for
   and read the sentence around it only if you need to. Matches a quantity
   followed by a unit, so "day 1 through ovulation" and "ten-minute rule"
   are left alone. */
const GUIDE_DOSE = /(\d+(?:\.\d+)?(?:\s*[–—-]\s*\d+(?:\.\d+)?)?\s*(?:g\/kg|mg|g|kg|%|minutes|minute|min|hours|hour|seconds|second)\b)/g;
/* ---------------------------------------------------------------------
   Worked examples that use YOUR numbers.

   A guide that reads "at 165 lb that is 105-150 g" is doing the arithmetic
   for somebody else. Two tokens resolve against the bodyweight in Setup at
   render time, so the example reads for you and follows you when you change
   it:

     {{bw}}                 ->  "145 lb"
     {{dose:0.64-0.91:g}}   ->  "93-132 g"

   Rates are stored PER POUND — the same figure the sentence around them
   quotes — so the rate and its worked example can never drift apart. In kg
   mode the bodyweight is converted before multiplying, and {{bw}} still
   prints the user's own unit. An unresolved token is left alone rather than
   rendered as a broken number. */
function guideVars(t) {
  const s = String(t == null ? '' : t);
  if (s.indexOf('{{') < 0) return s;
  const raw = +(S.settings && S.settings.bodyweight) || 0;
  const lb  = S.settings.units === 'kg' ? raw / LB_PER_KG : raw;
  return s
    .replace(/\{\{bw\}\}/g, raw ? Math.round(raw) + ' ' + unit() : 'your bodyweight')
    .replace(/\{\{dose:([\d.]+)-([\d.]+):(\w+)\}\}/g, (m, lo, hi, u) => {
      if (!lb) return m;
      const at = v => Math.round(v * lb);
      return at(+lo) + '-' + at(+hi) + ' ' + u;
    });
}
/* vars first, then the dose highlighter — so a computed figure is picked out
   the same way a written one is */
function guideRich(t) { return guideVars(t).replace(GUIDE_DOSE, '<b class="g-dose">$1</b>'); }

function guideCardHTML(c) {
  return c ? `<div class="card rail-card rail-guide-card">
      <div class="rail-kicker">${c.kicker}</div>
      <div class="rail-guide-title">${c.title}</div>
      <div class="rail-guide-body">${guideRich(c.body)}</div>
    </div>` : '';
}
function guideRail() {
  const st = pstate();
  const day = (st && st.day) ? st.day : 1;
  const d = pdata()[day - 1];
  const s = guideSlots(day, d && d.title);
  if (!s.any) return { top: '', bottom: '' };
  return {
    top: guideCardHTML(s.habit) + guideCardHTML(s.today),
    bottom: guideCardHTML(s.after) +
      `<button class="btn secondary rail-guide-more" data-goguide="1">Open the full guide</button>`
  };
}

function railExtrasHTML() {
  const [quote, by] = railLine();
  const quoteCard = `<div class="card rail-card rail-quote-card">
      <div class="rail-kicker">${by || 'Today'}</div>
      <blockquote class="rail-quote">${quote}</blockquote>

    </div>`;

  const t = railTargetCard();
  const guide = guideRail();
  if (!t) {
    return quoteCard + guide.top + `<div class="card rail-card">
      <div class="rail-kicker">Session</div>
      <div class="rail-next">All sets done</div>
      <div class="rail-next-sub">Everything on this day is ticked — mark the day complete to bank it.</div>
    </div>` + guide.bottom;
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
  const upNext = `<div class="card rail-card">
      <div class="rail-kicker">${t.focused ? 'Viewing' : 'Up next'}</div>
      <div class="rail-next">${nmText || '—'}</div>
      ${sch ? `<div class="rail-next-sub">${sch.textContent.trim()}</div>` : ''}
    </div>`;
  let howTo = '';
  if (tip) {
    const vid = videoFor(btn.dataset.tip);
    /* Only 15 of the 129 movements ship with a demo, so most exercises left a
       How-to card with a title, a paragraph and a conspicuous gap where a video
       should be. A search link is not a video, but it beats the gap and it
       cannot teach the wrong movement, which a guessed id would. */
    const q = encodeURIComponent(tip.title + ' exercise how to');
    howTo = `<div class="card rail-card">
      <div class="rail-kicker">How to</div>
      <div class="rail-next">${tip.title}</div>
      ${vid ? `<div class="tip-video rail-video">
           <iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="${tip.title} demo"
             allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
             allowfullscreen loading="lazy"></iframe>
         </div>`
        : `<a class="rail-vid-search" href="https://www.youtube.com/results?search_query=${q}"
              target="_blank" rel="noopener">Find a demo on YouTube ↗</a>`}
      <div class="rail-tip-body">${tip.body}</div>
    </div>`;
  }
  /* How-to first: it is what you read while you are doing the set. Then the
     two facts you want before touching the bar \u2014 what you lifted last time,
     and what to put on the way up. */
  const exKey = btn && btn.dataset.tip;
  const extras = exKey ? (lastTimeHTML(exKey, tip && tip.title) + warmupHTML(exKey)) : '';
  /* habit · today · how-to · (last time, warm-up) · up next · after training.
     After training is LAST on purpose — it is the card you want when you
     finish. The quote sits above it rather than below: it was trailing the
     rail before, and since its kicker is a category that is often literally
     "Habit", the bottom of the rail read "After training, Habit" — the exact
     reverse of the order it is meant to show. */
  /* the quote card leads the rail: its kicker is the line's own category
     (Habit / Longevity), so it is the habit card, and it belongs above the
     pre-session guidance rather than buried between Up next and After
     training. After training stays last. */
  return quoteCard + guide.top + howTo + extras + upNext + guide.bottom;
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
  view.querySelectorAll('#segReady button').forEach(b => b.onclick = () => setReadiness(+b.dataset.ready));
  view.querySelectorAll('[data-applytier]').forEach(b => b.onclick = () => setSessionTier(b.dataset.applytier));
  view.querySelectorAll('#segTier button').forEach(b => b.onclick = () => setSessionTier(b.dataset.tier));
  const gt = document.getElementById('genType'), gd = document.getElementById('genDiff'),
        gb = document.getElementById('genRoll');
  if (gt) gt.onchange = () => { genState().type = gt.value; save(); genRegenerate(); };
  if (gd) gd.onchange = () => { genState().diff = gd.value; save(); genRegenerate(); };
  if (gb) gb.onclick = genRegenerate;
  const eb = document.getElementById('equipBtn');
  if (eb && !eb.dataset.wired) { eb.dataset.wired = '1'; eb.onclick = equipMenu; }
  renderEquipBtn();
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
   program. Texas Method prescribes 110lb because of what you squatted last
   week — quietly turning that into a goblet squat would keep the number and
   make it meaningless, and the same applies to every SuperAge progression.
   Instead the library tells you what you can actually run today, and each
   barbell movement carries a documented stand-in in its How-to.
   --------------------------------------------------------------------- */
const EQUIP_RANK  = { bodyweight: 0, dumbbells: 1, gym: 2 };
/* Two modes, not three. "Dumbbells" as a separate middle tier described a
   kit she does not have — hers is a full rack or nothing, so the choice is
   only ever "am I training with weights today". Exercises still DECLARE
   needs:'dumbbells'; EQUIP_RANK keeps resolving those under gym. Only the
   selectable modes changed. */
const EQUIP_LABEL = { bodyweight: 'Bodyweight only', gym: 'Gym' };
/* The header pill has room for a word, not a phrase. */
const EQUIP_SHORT = { bodyweight: 'Bodyweight', gym: 'Gym' };
const EQUIP_MODES = ['bodyweight', 'gym'];

/* Dumbbells and kettlebells stop at what is on the rack. Barbell and trap bar
   are loaded from plates and are deliberately NOT capped here. */
function dbCap() { const n = +(S.settings.dbMax); return n > 0 ? n : 25; }
function capHand(w, type) {
  return (type === 'db' || type === 'hand') ? Math.min(w, dbCap()) : w;
}

/* ---------------------------------------------------------------------
   Equipment lives in the workout header, not only in Setup.

   The setting already existed and already drove exercise selection, but it
   was four taps away inside Setup — which is the wrong place for a decision
   you make when you walk into the room and find the rack taken. The Standard
   puts exactly this control in the top-right of a running session, and that
   is the right call: it is a property of today, not of your profile.
   --------------------------------------------------------------------- */
function renderEquipBtn() {
  const b = document.getElementById('equipBtn');
  if (!b) return;
  b.textContent = EQUIP_SHORT[haveEquip()] + ' ⌄';
}

function setEquip(k) {
  if (!EQUIP_RANK.hasOwnProperty(k)) return;
  S.settings.equipment = k;
  save();
  /* fpFocusPlan's cache key includes haveEquip(), so the generated plan
     rebuilds itself on the next read — no cache busting needed here. */
  renderEquipBtn();
  render();
  toast(EQUIP_SHORT[k] + ' — today\u2019s session re-picked');
}

function equipMenu() {
  let pop = document.getElementById('equipPop');
  if (pop) { pop.remove(); return; }
  pop = document.createElement('div');
  pop.id = 'equipPop';
  pop.className = 'equip-pop';
  const cur = haveEquip();
  pop.innerHTML = EQUIP_MODES.map(k =>
    `<button data-eq="${k}" class="${k === cur ? 'on' : ''}">
       <span class="equip-dot"></span>${EQUIP_SHORT[k]}
     </button>`).join('');
  document.body.appendChild(pop);
  const b = document.getElementById('equipBtn');
  const r = b.getBoundingClientRect();
  /* right-aligned under the button, clamped so it cannot hang off a phone */
  const w = 176;
  pop.style.top  = (r.bottom + 6) + 'px';
  pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  pop.querySelectorAll('[data-eq]').forEach(x => x.onclick = () => {
    const k = x.dataset.eq; pop.remove(); setEquip(k);
  });
  const away = e => {
    if (e.target.closest('#equipPop') || e.target.closest('#equipBtn')) return;
    pop.remove(); document.removeEventListener('click', away, true);
  };
  setTimeout(() => document.addEventListener('click', away, true), 0);
}
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
  { key: 'gen', needs: 'bodyweight', ico: '\u{1F3B2}', name: 'Random Generator', tag: 'Adaptive', grp: 'workout', sub: '110 exercises, never the same twice' },
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

/* The imported programs join the library from their data file, so adding one
   there is enough to make it appear here too. */
if (typeof SYN_PLANS !== 'undefined') {
  SYN_PLANS.forEach(p => PROTOCOLS.push({
    key: 'syn-' + p.id,
    needs: 'bodyweight',
    ico: SYN_ICO[p.id] || '\u{1F4AA}',
    name: p.name,
    tag: SYN_TAG[p.id] || 'Strength',
    grp: SYN_GRP[p.id] || 'workout',
    sub: p.desc
  }));
}

/* length in days, so every card carries a duration the way The Standard's do */
function protoLen(key) {
  if (key === 'texas') return PROGRAM_RULES.totalWeeks + ' weeks';
  /* Reading .data on the generator would build a workout as a side effect
     of drawing a library card. It has no fixed length anyway. */
  if (key === 'gen') return 'on demand';
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

  /* Each group is its own section so the three can be spaced apart. Run
     together, a diagnostic test read as just another workout tile. */
  return `
    <section class="proto-sec">
      <h2 class="section">Workouts</h2>
      <div class="proto-grid">${workouts}</div>
    </section>
    <section class="proto-sec proto-sec-diag">
      <h2 class="section">Diagnostic tests</h2>
      <p class="proto-sec-note">One-off measurements that score a Fingerprint marker. You take one — you do not run it as a program.</p>
      <div class="proto-grid">${diag}</div>
    </section>
    <section class="proto-sec">
      <h2 class="section">Recovery</h2>
      <div class="proto-grid">${recovery}</div>
    </section>
    <h2 class="section proto-sec-after">${pLabel()} · detail</h2>`;
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
    why: 'Type II (fast-twitch) fibers atrophy at roughly twice the rate of Type I after 40. By the seventh decade power output can be 30-40% below peak even in people who stay aerobically active. That decline underlies fall risk, stair-climbing capacity, and the ability to recover from a stumble.',
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
genRegisterTips();
synRegisterTips();
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
