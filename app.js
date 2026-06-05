/* =====================================================================
   TEXAS METHOD TRAINER
   A faithful, offline rebuild of the "Texas Method" workout spreadsheet.

   Everything the original workbook did is here:
     • Setup page  -> SETTINGS (lifts, increments, pace, mode, OHP decrement)
     • Workout page -> generated 24-week program (cycles 1a..4c), Mon/Wed/Fri
     • Stats page  -> 1RM projections, PL total, Wilks score, ratios + GRAPHS
   Math constants are taken directly from the sheet (Wilks coeffs, kg/lb,
   Brzycki 1RM). Program ratios live in PROGRAM_RULES so they're easy to tweak.
   ===================================================================== */

'use strict';

/* ---------- exact constants pulled from the spreadsheet ---------- */
const LB_PER_KG = 0.45359237;
const WILKS = {
  male:   [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 0.00000701863, -0.00000001291],
  female: [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 0.00004731582, -0.00000009054]
};

/* ---------- program rules ---------- */
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

/* ---------- default settings ---------- */
const DEFAULTS = {
  units: 'lb',
  sex: 'female',
  bodyweight: 165,
  mode: 'limit',
  ohpDecrement: 0.95,
  lifts: {
    squat:    { weight: 125, reps: 5 },
    bench:    { weight: 85,  reps: 5 },
    deadlift: { weight: 170, reps: 5 },
    press:    { weight: 55,  reps: 5 },
    clean:    { weight: 55,  reps: 5 }
  },
  increment: { squat: 2.5, bench: 2.5, deadlift: 5, press: 2.5, clean: 2.5 },
  pace2wk:   { squat: 5, bench: 5, deadlift: 10, press: 5, clean: 5 },
  incPerSession: { squat: 2.5, bench: 5, deadlift: 5, press: 5, clean: 2.5 }
};

/* =====================================================================
   STATE
   ===================================================================== */
const LS_KEY = 'tm_state_v1';
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return {
    settings: structuredClone(DEFAULTS),
    cursor: { week: 0, day: 0 },
    logs: {},
    bodyLog: []
  };
}
function migrate(st) {
  st.settings = Object.assign(structuredClone(DEFAULTS), st.settings || {});
  st.settings.lifts = Object.assign(structuredClone(DEFAULTS.lifts), st.settings.lifts || {});
  st.cursor = st.cursor || { week: 0, day: 0 };
  st.logs = st.logs || {};
  st.bodyLog = st.bodyLog || [];
  return st;
}
function save() { localStorage.setItem(LS_KEY, JSON.stringify(S)); }

/* =====================================================================
   MATH
   ===================================================================== */
const round = (x, inc) => Math.round(x / inc) * inc;
const floorInc = (x, inc) => Math.floor(x / inc + 1e-9) * inc;
const toKg = (lb) => lb * LB_PER_KG;
const toLb = (kg) => kg / LB_PER_KG;

function oneRM(weight, reps) {
  if (reps <= 1) return weight;
  if (reps >= 37) return weight;
  return weight * 36 / (37 - reps);
}
function estRepMax(orm, reps) { return Math.floor(orm * (37 - reps) / 36); }

function wilks(totalUnits, bwUnits, sex, units) {
  const bwKg = units === 'lb' ? toKg(bwUnits) : bwUnits;
  const totKg = units === 'lb' ? toKg(totalUnits) : totalUnits;
  const c = WILKS[sex] || WILKS.male;
  const denom = c[0] + c[1]*bwKg + c[2]*bwKg**2 + c[3]*bwKg**3 + c[4]*bwKg**4 + c[5]*bwKg**5;
  if (!denom) return 0;
  return (500 / denom) * totKg;
}

function bar() { return S.settings.units === 'lb' ? 45 : 20; }

function warmups(work, inc) {
  const b = bar();
  const out = [];
  if (work > b) out.push({ label: 'Bar', weight: b, reps: 5, sets: 2 });
  for (const [pct, reps] of PROGRAM_RULES.warmupRamp) {
    let w = round(work * pct, inc);
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
    squat:    round(L.squat.weight, inc.squat),
    bench:    round(L.bench.weight, inc.bench),
    press:    round(L.press.weight, inc.press),
    deadlift: round(L.deadlift.weight, inc.deadlift),
    clean:    round(L.clean.weight, inc.clean)
  };
}

function schemeSets(sets, reps, type, key, work) {
  const r = [];
  for (let i = 0; i < sets; i++) r.push({ reps, weight: work, type, key, set: i + 1, work: true });
  return r;
}

function buildLift(key, work, sets, reps, type, badge, logReps) {
  const inc = S.settings.increment[key] || 2.5;
  const w = warmups(work, inc);
  return {
    key, name: LIFT_META[key].name, type, badge,
    schemeLabel: reps === 0 ? `${sets}×F` : `${sets}×${reps}`,
    work, warmups: w,
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
    const primary = wk % 2 === 0 ? 'bench' : 'press';
    const secondary = primary === 'bench' ? 'press' : 'bench';

    const sqHeavy = round(I.squat, inc.squat);
    const sqVol   = floorInc(sqHeavy * r.squatVolPct, inc.squat);
    const sqLight = floorInc(sqVol * r.squatLightPct, inc.squat);

    const pHeavy = round(I[primary], inc[primary]);
    const pVol   = floorInc(pHeavy * r.upperVolPct, inc[primary]);

    const sVol   = floorInc(round(I[secondary], inc[secondary]) * r.upperVolPct, inc[secondary]);
    let   sLight = floorInc(sVol * r.upperLightPct, inc[secondary]);
    if (secondary === 'press') sLight = floorInc(sLight * S.settings.ohpDecrement, inc.press);

    const dl = round(I.deadlift, inc.deadlift);
    const pc = round(I.clean, inc.clean);

    const mon = [
      buildLift('squat', sqVol, 5, 5, 'vol', 'Volume'),
      buildLift(primary, pVol, 5, 5, 'vol', 'Volume'),
      buildLift('deadlift', dl, 1, 5, 'heavy', 'Heavy', true)
    ];
    const wed = [
      buildLift('squat', sqLight, 2, 5, 'light', 'Light'),
      buildLift(secondary, sLight, 3, 5, 'light', 'Light'),
      buildLift('backext', 0, 5, 10, 'acc', 'Back-off'),
      buildLift('chin', 0, 3, 0, 'acc', 'AMRAP')
    ];
    const fri = [
      buildLift('squat', sqHeavy, 1, 5, 'heavy', 'Heavy', true),
      buildLift(primary, pHeavy, 1, 5, 'heavy', 'Heavy', true),
      buildLift('clean', pc, 5, 3, 'acc', 'Power')
    ];

    weeks.push({
      idx: wk,
      label: CYCLE_LABELS[Math.floor(wk / 2)],
      subweek: (wk % 2) + 1,
      primary, secondary,
      intensity: { ...I },
      heavy: { squat: sqHeavy, [primary]: pHeavy, deadlift: dl },
      days: { 0: mon, 1: wed, 2: fri }
    });

    advance('squat', I, sp, 2, wk);
    advance('deadlift', I, sp, 0, wk);
    advance('clean', I, sp, 2, wk);
    advance(primary, I, sp, 2, wk);
  }
  return weeks;
}

function advance(key, I, sp, day, wk) {
  const step = sp[key] || 5;
  const cap = S.settings.pace2wk[key] * (S.settings.mode === 'slowroll' ? 2 : 3);
  const log = S.logs[`${wk}-${day}`];
  let reps = null;
  if (log && log.reps && log.reps[key] != null) reps = log.reps[key];

  if (reps == null) { I[key] += step; return; }
  if (reps >= 5) {
    let jump = step + Math.max(0, reps - 5) * step;
    if (S.settings.mode !== 'leterrip') jump = Math.min(jump, cap);
    I[key] += jump;
  } else if (reps <= 2) {
    I[key] = round(I[key] * 0.9, S.settings.increment[key] || 2.5);
  }
}

/* =====================================================================
   RENDER
   ===================================================================== */
const view = document.getElementById('view');
const titleEl = document.getElementById('screenTitle');
const subEl = document.getElementById('screenSub');
let TAB = 'today';
let PROGRAM = generateProgram();
let progCycle = 0;

function rebuild() { PROGRAM = generateProgram(); }

function render() {
  rebuild();
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === TAB));
  if (TAB === 'today')   renderToday();
  if (TAB === 'program') renderProgram();
  if (TAB === 'stats')   renderStats();
  if (TAB === 'setup')   renderSetup();
}

/* ---------- TODAY ---------- */
const DAY_NAMES = ['Monday · Volume', 'Wednesday · Light', 'Friday · Intensity'];
const DAY_KEY = ['mon', 'wed', 'fri'];

function renderToday() {
  const { week, day } = S.cursor;
  const w = PROGRAM[week];
  titleEl.textContent = 'Today';
  subEl.textContent = `Cycle ${w.label} · Week ${w.subweek} · ${DAY_NAMES[day]}`;

  const lifts = w.days[day];
  const logKey = `${week}-${day}`;
  const log = S.logs[logKey] || { checks: {}, reps: {} };

  let html = `
    <div class="screen">
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
        <button class="btn small secondary" id="prevDay">‹ Prev</button>
        <div class="center">
          <div style="font-weight:800;font-size:17px;">${DAY_NAMES[day].split(' · ')[0]}</div>
          <div class="tiny muted">${DAY_NAMES[day].split(' · ')[1]} day</div>
        </div>
        <button class="btn small secondary" id="nextDay">Next ›</button>
      </div>`;

  for (const lf of lifts) html += liftCard(lf, logKey, log);

  html += `
      <button class="btn primary" id="completeBtn">✓ Complete workout</button>
      <div class="spacer"></div>
      <button class="btn secondary" id="timerBtn">⏱ Start rest timer (2:00)</button>
    </div>`;
  view.innerHTML = html;
  wireToday(logKey);
}

function liftCard(lf, logKey, log) {
  if (lf.work === 0 && lf.type === 'acc') {
    let rows = '';
    for (let i = 0; i < lf.sets.length; i++) {
      const id = `${lf.key}_w_${i}`;
      const on = log.checks && log.checks[id] ? 'on' : '';
      const repLbl = lf.targetReps ? `${lf.targetReps} reps` : 'AMRAP';
      rows += `<div class="set-row work">
        <div class="lbl">Set ${i + 1}</div>
        <div class="wt">Bodyweight</div>
        <div class="reps">${repLbl}</div>
        <button class="check ${on}" data-check="${id}">✓</button></div>`;
    }
    return `<div class="card lift">
      <div class="lift-head"><div><div class="name">${lf.name}</div>
      <div class="scheme">${lf.targetReps ? lf.schemeLabel : lf.sets.length + ' sets to failure'}</div></div>
      <span class="badge ${lf.type}">${lf.badge}</span></div>${rows}</div>`;
  }

  let rows = '';
  lf.warmups.forEach((wu, i) => {
    const id = `${lf.key}_wu_${i}`;
    const on = log.checks && log.checks[id] ? 'on' : '';
    rows += `<div class="set-row">
      <div class="lbl">${wu.label}</div>
      <div class="wt">${fmt(wu.weight)} <small>${unit()}</small></div>
      <div class="reps">${wu.sets > 1 ? wu.sets + '×' : ''}${wu.reps}</div>
      <button class="check ${on}" data-check="${id}">✓</button></div>`;
  });
  lf.sets.forEach((st, i) => {
    const id = `${lf.key}_w_${i}`;
    const on = log.checks && log.checks[id] ? 'on' : '';
    rows += `<div class="set-row work">
      <div class="lbl">Work ${i + 1}</div>
      <div class="wt">${fmt(st.weight)} <small>${unit()}</small></div>
      <div class="reps">${st.reps} reps</div>
      <button class="check ${on}" data-check="${id}">✓</button></div>`;
  });

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

  return `<div class="card lift">
    <div class="lift-head"><div><div class="name">${lf.name}</div>
    <div class="scheme">${lf.schemeLabel} · top ${fmt(lf.work)} ${unit()}</div></div>
    <span class="badge ${lf.type}">${lf.badge}</span></div>${rows}${logger}</div>`;
}

function wireToday(logKey) {
  if (!S.logs[logKey]) S.logs[logKey] = { checks: {}, reps: {} };
  const log = S.logs[logKey];

  view.querySelectorAll('[data-check]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.check;
      log.checks[id] = !log.checks[id];
      btn.classList.toggle('on', log.checks[id]);
      save();
      if (log.checks[id]) startRest(120);
    };
  });
  view.querySelectorAll('[data-rep]').forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.rep, d = +btn.dataset.d;
      const el = document.getElementById('rep_' + k);
      let v = Math.max(0, (+el.textContent) + d);
      el.textContent = v;
      log.reps[k] = v;
      save();
    };
  });
  document.getElementById('prevDay').onclick = () => { moveCursor(-1); };
  document.getElementById('nextDay').onclick = () => { moveCursor(1); };
  document.getElementById('completeBtn').onclick = () => {
    const w = PROGRAM[S.cursor.week];
    w.days[S.cursor.day].forEach(lf => {
      if (lf.logReps && log.reps[lf.key] == null) log.reps[lf.key] = lf.targetReps;
    });
    save(); rebuild();
    toast('Workout logged 💪');
    moveCursor(1);
  };
  document.getElementById('timerBtn').onclick = () => startRest(120);
}

function moveCursor(dir) {
  let { week, day } = S.cursor;
  day += dir;
  if (day > 2) { day = 0; week = Math.min(PROGRAM_RULES.totalWeeks - 1, week + 1); }
  if (day < 0) { day = 2; week = Math.max(0, week - 1); }
  S.cursor = { week, day }; save(); render();
}

/* ---------- PROGRAM ---------- */
function renderProgram() {
  titleEl.textContent = 'Program';
  subEl.textContent = '24 weeks · Texas Method';
  let pills = '<div class="scroller">';
  CYCLE_LABELS.forEach((lab, i) => {
    pills += `<span class="cycle-pill ${i === progCycle ? 'on' : ''}" data-cyc="${i}">Cycle ${lab}</span>`;
  });
  pills += '</div>';

  let body = '';
  for (let sub = 0; sub < 2; sub++) {
    const wk = progCycle * 2 + sub;
    const w = PROGRAM[wk];
    body += `<h2 class="section">Week ${sub + 1} · primary ${LIFT_META[w.primary].name}</h2>`;
    [0, 1, 2].forEach(day => { body += dayTable(w, day); });
  }
  view.innerHTML = `<div class="screen">${pills}${body}</div>`;
  view.querySelectorAll('[data-cyc]').forEach(p => p.onclick = () => { progCycle = +p.dataset.cyc; render(); });
}

function dayTable(w, day) {
  const cls = ['mon', 'wed', 'fri'][day];
  const done = isDayDone(w.idx, day);
  let rows = '';
  w.days[day].forEach(lf => {
    const wt = lf.work === 0 ? 'BW' : `${fmt(lf.work)} ${unit()}`;
    rows += `<tr><td class="nm">${lf.name}</td><td class="s">${lf.schemeLabel}</td><td class="w">${wt}</td></tr>`;
  });
  return `<div class="day-block"><div class="day-title"><span class="dot ${cls}"></span>${DAY_NAMES[day]}
    ${done ? '<span class="pill-done">✓ done</span>' : ''}</div>
    <div class="card" style="padding:6px 12px;"><table class="prog">${rows}</table></div></div>`;
}
function isDayDone(week, day) {
  const l = S.logs[`${week}-${day}`];
  if (!l || !l.checks) return false;
  return Object.values(l.checks).filter(Boolean).length >= 3;
}

/* ---------- STATS ---------- */
function renderStats() {
  titleEl.textContent = 'Stats';
  subEl.textContent = 'Projections · Wilks · Graphs';
  const u = unit();

  const L = S.settings.lifts;
  const cur = {};
  ['squat', 'bench', 'deadlift', 'press', 'clean'].forEach(k => cur[k] = oneRM(L[k].weight, L[k].reps));

  const plNow = round(L.squat.weight, 0.5) + round(L.bench.weight, 0.5) + round(L.deadlift.weight, 0.5);
  const wNow = wilks(plNow, S.settings.bodyweight, S.settings.sex, S.settings.units);

  let bars = '';
  const maxv = Math.max(...Object.values(cur));
  [['squat','Squat'],['bench','Bench'],['deadlift','Deadlift'],['press','Press'],['clean','Power Clean']].forEach(([k, nm]) => {
    const v = cur[k];
    bars += `<div class="bar-line"><div class="top"><span>${nm}</span><b>${fmt(v)} ${u}</b></div>
      <div class="track"><div class="fill" style="width:${(v / maxv * 100).toFixed(0)}%"></div></div></div>`;
  });

  let ratios = '';
  ['squat','bench','deadlift','press','clean'].forEach(k => {
    const r = cur[k] / S.settings.bodyweight;
    ratios += `<div class="bar-line"><div class="top"><span>${LIFT_META[k].name}</span><b>${r.toFixed(2)}×</b></div>
      <div class="track"><div class="fill" style="width:${Math.min(100, r / 3 * 100).toFixed(0)}%"></div></div></div>`;
  });

  view.innerHTML = `
    <div class="screen">
      <div class="tiles">
        <div class="tile"><div class="k">Powerlifting Total</div><div class="v">${fmt(plNow)} <small>${u}</small></div></div>
        <div class="tile"><div class="k">Wilks Score</div><div class="v">${wNow ? wNow.toFixed(1) : '—'}</div></div>
        <div class="tile"><div class="k">Best Squat 1RM</div><div class="v">${fmt(cur.squat)} <small>${u}</small></div></div>
        <div class="tile"><div class="k">Best Deadlift 1RM</div><div class="v">${fmt(cur.deadlift)} <small>${u}</small></div></div>
      </div>

      <h2 class="section">Estimated 1RM</h2>
      <div class="card">${bars}</div>

      <h2 class="section">1RM projection over program</h2>
      <div class="card"><canvas id="ch1" class="chart"></canvas>
        <div class="tiny muted center" style="margin-top:8px">Squat · Bench · Deadlift · Press across 24 weeks (assumes progress)</div></div>

      <h2 class="section">Powerlifting total trend</h2>
      <div class="card"><canvas id="ch2" class="chart"></canvas></div>

      <h2 class="section">Strength-to-weight ratio</h2>
      <div class="card">${ratios}</div>
    </div>`;

  drawProjectionCharts();
}

function drawProjectionCharts() {
  const labels = PROGRAM.map(w => w.label + '.' + w.subweek);
  const series = ['squat','bench','deadlift','press'].map((k, i) => ({
    name: LIFT_META[k].name,
    color: ['#60a5fa','#ff7a18','#f87171','#34d399'][i],
    data: PROGRAM.map(w => oneRM(w.intensity[k], 5))
  }));
  lineChart(document.getElementById('ch1'), series, labels);

  const totalSeries = [{
    name: 'PL Total', color: '#ffa85a',
    data: PROGRAM.map(w => round(w.intensity.squat,1) + round(w.intensity.bench,1) + round(w.intensity.deadlift,1))
  }];
  lineChart(document.getElementById('ch2'), totalSeries, labels);
}

function lineChart(canvas, series, labels) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = 200;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 38, r: 10, t: 12, b: 22 };
  const all = series.flatMap(s => s.data);
  let min = Math.min(...all), max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const py = v => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));
  const px = i => pad.l + (W - pad.l - pad.r) * (i / (labels.length - 1));

  ctx.strokeStyle = '#2c3346'; ctx.fillStyle = '#9aa3bd'; ctx.font = '10px -apple-system,sans-serif';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const v = min + (max - min) * g / 4;
    const y = py(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.globalAlpha = .5; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillText(Math.round(v), 4, y + 3);
  }
  for (let i = 0; i < labels.length; i += 4) ctx.fillText(labels[i], px(i) - 8, H - 6);

  series.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.beginPath();
    s.data.forEach((v, i) => { const X = px(i), Y = py(v); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.stroke();
  });
  let lx = pad.l;
  ctx.font = '11px -apple-system,sans-serif';
  series.forEach(s => {
    ctx.fillStyle = s.color; ctx.fillRect(lx, 2, 10, 4);
    ctx.fillStyle = '#9aa3bd'; ctx.fillText(s.name, lx + 14, 8);
    lx += ctx.measureText(s.name).width + 34;
  });
}

/* ---------- SETUP ---------- */
function renderSetup() {
  titleEl.textContent = 'Setup';
  subEl.textContent = 'Your numbers — saved automatically';
  const s = S.settings;
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

  view.innerHTML = `
    <div class="screen">
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
            <button data-x="male" class="${s.sex==='male'?'on':''}">Male</button>
          </div>
        </div>
        <div class="field"><label>Bodyweight (${s.units})</label>
          <input type="number" inputmode="decimal" id="bw" value="${s.bodyweight}" /></div>
      </div>

      <h2 class="section">Current lifts — weight × reps</h2>
      <div class="card">
        <div class="inline3" style="margin-bottom:8px"><span class="tiny muted">Lift</span><span class="tiny muted">Weight</span><span class="tiny muted">Reps</span></div>
        ${liftRows}
        <div class="hint">Your 1RM is estimated with the Brzycki formula, exactly like the workbook.</div>
      </div>

      <h2 class="section">Rounding & progression</h2>
      <div class="card">
        <div class="inline3" style="margin-bottom:8px"><span class="tiny muted">Lift</span><span class="tiny muted">Warm-up round</span><span class="tiny muted">Step / session</span></div>
        ${incRows}
        <div class="hint">Warm-up round = smallest plate jump. Step = how much you add each time the lift trains heavy.</div>
      </div>

      <h2 class="section">Progression mode</h2>
      <div class="card">
        <div class="seg" id="segMode" style="flex-direction:column;gap:8px">
          <button data-m="limit" class="${s.mode==='limit'?'on':''}">Limit · capped at 3× pace (default)</button>
          <button data-m="slowroll" class="${s.mode==='slowroll'?'on':''}">Slow-roll · capped at 2× pace</button>
          <button data-m="leterrip" class="${s.mode==='leterrip'?'on':''}">Let 'er rip · no cap</button>
        </div>
        <div class="field" style="margin-top:14px"><label>OHP Wednesday decrement (90–99%)</label>
          <input type="number" inputmode="decimal" id="ohp" value="${Math.round(s.ohpDecrement*100)}" /></div>
      </div>

      <h2 class="section">Data</h2>
      <div class="card">
        <button class="btn secondary" id="resetCursor">↺ Jump to Week 1, Monday</button>
        <div class="spacer"></div>
        <button class="btn danger" id="wipe">Erase all logged data</button>
      </div>
      <div class="center tiny muted" style="margin:18px 0 6px">Texas Method Trainer · works offline · add to Home Screen</div>
    </div>`;
  wireSetup();
}

function wireSetup() {
  const s = S.settings;
  view.querySelectorAll('#segUnits button').forEach(b => b.onclick = () => { s.units = b.dataset.u; save(); render(); });
  view.querySelectorAll('#segSex button').forEach(b => b.onclick = () => { s.sex = b.dataset.x; save(); render(); });
  view.querySelectorAll('#segMode button').forEach(b => b.onclick = () => { s.mode = b.dataset.m; save(); render(); });
  document.getElementById('bw').onchange = e => { s.bodyweight = +e.target.value || 0; save(); };
  document.getElementById('ohp').onchange = e => { s.ohpDecrement = Math.min(.99, Math.max(.9, (+e.target.value || 95) / 100)); save(); };

  view.querySelectorAll('[data-lift]').forEach(inp => inp.onchange = () => {
    s.lifts[inp.dataset.lift][inp.dataset.f] = +inp.value || 0; save(); rebuild();
  });
  view.querySelectorAll('[data-inc]').forEach(inp => inp.onchange = () => { s.increment[inp.dataset.inc] = +inp.value || 1; save(); rebuild(); });
  view.querySelectorAll('[data-step]').forEach(inp => inp.onchange = () => { s.incPerSession[inp.dataset.step] = +inp.value || 1; save(); rebuild(); });

  document.getElementById('resetCursor').onclick = () => { S.cursor = { week: 0, day: 0 }; save(); toast('Back to the start'); };
  document.getElementById('wipe').onclick = () => {
    if (confirm('Erase all logged workouts and progress? Your setup numbers stay.')) {
      S.logs = {}; S.bodyLog = []; S.cursor = { week: 0, day: 0 }; save(); rebuild(); toast('Logs cleared'); render();
    }
  };
}

/* =====================================================================
   REST TIMER
   ===================================================================== */
let restInt = null, restLeft = 0;
const restEl = document.getElementById('restTimer');
const restDisp = document.getElementById('restDisplay');
function fmtClock(s) { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; }
function startRest(sec) {
  restLeft = sec; restEl.classList.remove('hidden', 'warn'); restDisp.textContent = fmtClock(restLeft);
  clearInterval(restInt);
  restInt = setInterval(() => {
    restLeft--; restDisp.textContent = fmtClock(Math.max(0, restLeft));
    if (restLeft <= 10) restEl.classList.add('warn');
    if (restLeft <= 0) { clearInterval(restInt); buzz(); setTimeout(() => restEl.classList.add('hidden'), 1500); }
  }, 1000);
}
function buzz() { if (navigator.vibrate) navigator.vibrate([200, 80, 200]); }
document.getElementById('restPlus').onclick = () => { restLeft += 15; restDisp.textContent = fmtClock(restLeft); };
document.getElementById('restMinus').onclick = () => { restLeft = Math.max(0, restLeft - 15); restDisp.textContent = fmtClock(restLeft); };
document.getElementById('restStop').onclick = () => { clearInterval(restInt); restEl.classList.add('hidden'); };

/* =====================================================================
   HELPERS / CHROME
   ===================================================================== */
function unit() { return S.settings.units; }
function fmt(n) { return Number.isInteger(n) ? n : (Math.round(n * 100) / 100); }

let toastT = null;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t);
    Object.assign(t.style, { position: 'fixed', bottom: '92px', left: '50%', transform: 'translateX(-50%)',
      background: '#242a3d', color: '#eef1f8', padding: '12px 18px', borderRadius: '12px', zIndex: 60,
      border: '1px solid #2c3346', fontWeight: '700', boxShadow: '0 10px 30px rgba(0,0,0,.4)', transition: 'opacity .3s' }); }
  t.textContent = msg; t.style.opacity = '1';
  clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = '0', 1600);
}

document.querySelectorAll('.tab').forEach(t => t.onclick = () => { TAB = t.dataset.tab; window.scrollTo(0, 0); render(); });
document.getElementById('rfresh').onclick = () => { TAB = 'today'; render(); toast('Today'); };

/* init */
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
