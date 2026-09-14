/* =====================================================================
   MUSCLE MAP — taxonomy, classifier, body-map SVG, balance doughnut

   Three consumers, one vocabulary:
     - session cards and the How-to panel show WHICH muscles a movement
       works, on a small front/back figure;
     - the Random Generator's picker lets you tap muscle groups on the
       same figure and pulls matching movements;
     - Stats aggregates checked sets into a muscle-balance doughnut.

   Muscle knowledge comes from three places, in order of trust: the
   generator's own `muscles` arrays (structured data), the body-part text
   the plan schemes already carry ("10-12 · Quads/Glutes"), and finally
   the movement's name. Nothing here invents a new field on any exercise.

   Fifteen tappable REGIONS drive the drawing; eight display BUCKETS
   drive color, the picker and the doughnut. The bucket palette is fixed
   per bucket (color follows the muscle, never its rank) and both theme
   variants were validated for colorblind separation and contrast against
   their card surfaces — see the --mg-* tokens in styles.css.
   ===================================================================== */

const MUSCLE_BUCKETS = [
  { id: 'chest',    name: 'Chest',        regions: ['chest'] },
  { id: 'back',     name: 'Back',         regions: ['back', 'lowerback'] },
  { id: 'shoulders',name: 'Shoulders',    regions: ['shoulders'] },
  { id: 'arms',     name: 'Arms',         regions: ['biceps', 'triceps', 'forearms'] },
  { id: 'core',     name: 'Core',         regions: ['core', 'obliques'] },
  { id: 'pelvic',   name: 'Pelvic Floor', regions: ['pelvic'] },
  { id: 'glutes',   name: 'Glutes',       regions: ['glutes'] },
  { id: 'legs',     name: 'Legs',         regions: ['quads', 'hamstrings', 'calves', 'hips'] }
];
const MM_REGION_BUCKET = {};
MUSCLE_BUCKETS.forEach(b => b.regions.forEach(r => { MM_REGION_BUCKET[r] = b.id; }));

/* ---- vocabulary → regions ----
   Two-word phrases are checked before single words so "lower back" never
   reads as back + generic. Values are region lists; the two flags mark
   whole-body and cardio work, which highlight nothing specific. */
const MM_PHRASES = [
  ['pelvic floor', ['pelvic']], ['deep core', ['core', 'pelvic']],
  ['lower back', ['lowerback']], ['upper back', ['back']], ['mid back', ['back']],
  ['rear delts', ['shoulders']], ['side delts', ['shoulders']], ['rotator cuff', ['shoulders']],
  ['hip flexors', ['hips']], ['inner thighs', ['hips']], ['glute medius', ['glutes']],
  ['posterior chain', ['hamstrings', 'glutes', 'lowerback']],
  ['upper chest', ['chest']], ['full body', '@full'], ['full lower', ['quads', 'hamstrings', 'glutes', 'calves']],
  ['tibialis anterior', ['calves']], ['triceps long head', ['triceps']]
];
const MM_WORDS = {
  chest: ['chest'], pecs: ['chest'],
  back: ['back'], lats: ['back'], traps: ['back'], rhomboids: ['back'], spine: ['lowerback'],
  shoulders: ['shoulders'], delts: ['shoulders'], deltoid: ['shoulders'], subscapularis: ['shoulders'],
  biceps: ['biceps'], triceps: ['triceps'], forearms: ['forearms'], grip: ['forearms'],
  arms: ['biceps', 'triceps'],
  core: ['core'], abs: ['core'], abdominals: ['core'], serratus: ['core'],
  obliques: ['obliques'],
  pelvic: ['pelvic'], kegel: ['pelvic'],
  glutes: ['glutes'], glute: ['glutes'],
  quads: ['quads'], quadriceps: ['quads'],
  hamstrings: ['hamstrings'], hamstring: ['hamstrings'],
  calves: ['calves'], calf: ['calves'], soleus: ['calves'],
  hips: ['hips'], adductors: ['hips'], hip: ['hips'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  cardio: '@cardio', vo2max: '@cardio', conditioning: '@cardio',
  balance: '@none', coordination: '@none', stability: '@none', posture: '@none',
  mobility: '@none', flow: '@none', breathing: '@none'
};

function mmScanText(text) {
  const out = { regions: [], cardio: false, full: false };
  if (!text) return out;
  let t = ' ' + String(text).toLowerCase().replace(/[^a-z]+/g, ' ') + ' ';
  MM_PHRASES.forEach(([ph, v]) => {
    if (t.indexOf(' ' + ph + ' ') < 0) return;
    t = t.split(' ' + ph + ' ').join(' ');
    if (v === '@full') out.full = true; else v.forEach(r => out.regions.push(r));
  });
  t.split(' ').forEach(w => {
    const v = MM_WORDS[w];
    if (!v) return;
    if (v === '@cardio') out.cardio = true;
    else if (v === '@full') out.full = true;
    else if (v !== '@none') v.forEach(r => out.regions.push(r));
  });
  out.regions = [...new Set(out.regions)];
  return out;
}

/* ---- name fallback ----
   For movements whose scheme carries no body-part text (the Texas lifts,
   the prep-plan movements, warm-ups). First matching rule wins. */
const MM_NAME_RULES = [
  [/bench|push[- ]?up|chest (press|fly)|fly[e]?s|dip\b/i,            { p: ['chest'], s: ['triceps', 'shoulders'] }],
  [/overhead press|shoulder press|ohp|press\b(?!.*(leg|bench))/i,    { p: ['shoulders'], s: ['triceps'] }],
  [/lateral raise|front raise|face pull|shrug/i,                     { p: ['shoulders'], s: [] }],
  [/deadlift|rdl\b|romanian|good morning|hip hinge|kettlebell swing|swing\b/i, { p: ['hamstrings', 'glutes'], s: ['lowerback'] }],
  [/pull[- ]?up|chin[- ]?up|pulldown|row\b|rows\b/i,                 { p: ['back'], s: ['biceps'] }],
  [/curl(?!.*leg)/i,                                                 { p: ['biceps'], s: ['forearms'] }],
  [/skull ?crusher|kickback|tricep/i,                                { p: ['triceps'], s: [] }],
  [/squat|leg press|step[- ]?(up|down)|wall sit|lunge|pistol/i,      { p: ['quads'], s: ['glutes'] }],
  [/leg curl|nordic|hamstring/i,                                     { p: ['hamstrings'], s: [] }],
  [/calf|heel raise|tibialis/i,                                      { p: ['calves'], s: [] }],
  [/glute bridge|hip thrust|bridge\b|fire hydrant|donkey kick/i,     { p: ['glutes'], s: ['hamstrings', 'pelvic'] }],
  [/clam ?shell|band walk|hip (er|abduction|circle)|adductor|cossack/i, { p: ['hips'], s: ['glutes'] }],
  [/kegel|pelvic|knack/i,                                            { p: ['pelvic'], s: ['core'] }],
  [/dead bug|bird dog|hollow|plank|crunch|sit[- ]?up|leg raise|ab wheel|mountain climber|heel slide|fallout|draw[- ]?in|tva/i, { p: ['core'], s: ['pelvic'] }],
  [/side plank|pallof|anti[- ]?rotation|woodchop|russian twist|suitcase/i, { p: ['obliques'], s: ['core'] }],
  [/carry|farmer/i,                                                  { p: ['core', 'forearms'], s: ['obliques'] }],
  [/breath/i,                                                        { p: ['core'], s: ['pelvic'] }],
  [/walk|run|jog|bike|cycling|row(er|ing)|jump|sprint|burpee|jack|cardio|interval/i, { cardio: true }],
  [/stretch|pose|cat[- ]?cow|mobility|circle|rotation|roll/i,        { none: true }]
];

/* GEN_EX id → muscles[], built once. gen_ keys are 'gen_' + id. */
let MM_GEN = null;
function mmGenLookup(key) {
  if (MM_GEN === null) {
    MM_GEN = {};
    if (typeof GEN_EX !== 'undefined') GEN_EX.forEach(e => { MM_GEN['gen_' + e.id] = e.muscles || []; });
  }
  return MM_GEN[key];
}

/* The classifier. Takes the exercise object a session row already has
   ({key, name, scheme}) and answers {p, s, cardio, full} in region ids.
   Primary = the first source's first region; the rest are secondary. */
function muscleInfoFor(ex) {
  if (!ex) return { p: [], s: [], cardio: false, full: false };
  const gen = mmGenLookup(ex.key);
  if (gen && gen.length) {
    const scan = mmScanText(gen.join(' '));
    if (scan.regions.length || scan.cardio || scan.full) {
      const first = mmScanText(gen[0]);
      const p = first.regions.length ? first.regions : scan.regions.slice(0, 1);
      return { p, s: scan.regions.filter(r => p.indexOf(r) < 0), cardio: scan.cardio, full: scan.full };
    }
  }
  /* scheme text: the body-part note lives after the last '·' */
  const parts = String(ex.scheme || '').split('·');
  if (parts.length > 1) {
    const scan = mmScanText(parts.slice(1).join(' '));
    if (scan.regions.length || scan.cardio || scan.full) {
      return { p: scan.regions.slice(0, 2), s: scan.regions.slice(2), cardio: scan.cardio, full: scan.full };
    }
  }
  const hay = ex.name || ex.key || '';
  for (const [re, spec] of MM_NAME_RULES) {
    if (!re.test(hay)) continue;
    if (spec.none) return { p: [], s: [], cardio: false, full: false };
    if (spec.cardio) return { p: [], s: [], cardio: true, full: false };
    return { p: spec.p.slice(), s: (spec.s || []).slice(), cardio: false, full: false };
  }
  return { p: [], s: [], cardio: false, full: false };
}

function mmBucketsFor(ex) {
  const m = muscleInfoFor(ex);
  return [...new Set(m.p.concat(m.s).map(r => MM_REGION_BUCKET[r]).filter(Boolean))];
}
function mmPrimaryBucket(ex) {
  const m = muscleInfoFor(ex);
  const r = m.p[0];
  return r ? MM_REGION_BUCKET[r] : null;
}

/* =====================================================================
   THE FIGURE — front and back, drawn from mirrored capsules.

   Coordinates live on a 100×230 grid per view; the back view is the
   same skeleton with its own region set. Every region element carries
   data-r (region) and data-b (bucket) so highlighting and the picker
   are pure CSS-class work.
   ===================================================================== */
function mmShapes(view) {
  const S = [];
  const cap = (r, x, y, w, h, rx) => S.push({ r, el: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx != null ? rx : w / 2}"/>` });
  const ell = (r, cx, cy, rx, ry) => S.push({ r, el: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>` });
  const path = (r, d) => S.push({ r, el: `<path d="${d}"/>` });
  const M = x => 100 - x; /* mirror around the centre line */

  if (view === 'front') {
    ell('shoulders', 24, 43, 8.5, 7); ell('shoulders', M(24), 43, 8.5, 7);
    path('chest', 'M31 40 Q49 36 49 46 L49 58 Q38 62 31 55 Z');
    path('chest', `M${M(31)} 40 Q${M(49)} 36 ${M(49)} 46 L${M(49)} 58 Q${M(38)} 62 ${M(31)} 55 Z`);
    cap('biceps', 16.5, 50, 9, 26, 4.5); cap('biceps', M(25.5), 50, 9, 26, 4.5);
    cap('forearms', 14.5, 79, 8, 26, 4); cap('forearms', M(22.5), 79, 8, 26, 4);
    cap('obliques', 31, 62, 6.5, 28, 3); cap('obliques', M(37.5), 62, 6.5, 28, 3);
    cap('core', 40, 62, 20, 30, 6);
    path('pelvic', 'M40 95 L60 95 Q60 104 50 110 Q40 104 40 95 Z');
    /* quads outer-front, adductors the inner sliver */
    cap('quads', 29, 113, 13, 55, 6); cap('quads', M(42), 113, 13, 55, 6);
    cap('hips', 43.5, 112, 6, 30, 3); cap('hips', M(49.5), 112, 6, 30, 3);
    cap('calves', 31.5, 174, 10, 38, 5); cap('calves', M(41.5), 174, 10, 38, 5);
  } else {
    ell('shoulders', 24, 43, 8.5, 7); ell('shoulders', M(24), 43, 8.5, 7);
    path('back', 'M32 38 L68 38 L64 68 Q50 76 36 68 Z');
    cap('lowerback', 41, 74, 18, 16, 5);
    cap('triceps', 16.5, 50, 9, 26, 4.5); cap('triceps', M(25.5), 50, 9, 26, 4.5);
    cap('forearms', 14.5, 79, 8, 26, 4); cap('forearms', M(22.5), 79, 8, 26, 4);
    ell('glutes', 41, 100, 10.5, 11); ell('glutes', M(41), 100, 10.5, 11);
    cap('hamstrings', 30, 115, 13.5, 52, 6); cap('hamstrings', M(43.5), 115, 13.5, 52, 6);
    cap('calves', 31.5, 172, 10.5, 40, 5); cap('calves', M(42), 172, 10.5, 40, 5);
  }
  return S;
}

/* the non-tappable body behind the regions */
function mmBody() {
  return `<g class="mm-body">
    <circle cx="50" cy="14" r="10"/>
    <rect x="45.5" y="23" width="9" height="9" rx="3"/>
    <path d="M28 36 Q50 30 72 36 L70 92 Q68 96 60 96 L40 96 Q32 96 30 92 Z"/>
    <rect x="14" y="42" width="12" height="66" rx="6"/><rect x="74" y="42" width="12" height="66" rx="6"/>
    <rect x="15" y="107" width="9" height="11" rx="4"/><rect x="76" y="107" width="9" height="11" rx="4"/>
    <path d="M31 96 L69 96 L66 170 L56 170 L53 118 L47 118 L44 170 L34 170 Z"/>
    <rect x="33" y="168" width="14" height="48" rx="6"/><rect x="53" y="168" width="14" height="48" rx="6"/>
    <rect x="31" y="214" width="17" height="8" rx="4"/><rect x="52" y="214" width="17" height="8" rx="4"/>
  </g>`;
}

/* One or two figures as an inline SVG string.
   hl: { p:[regions], s:[regions] } — primary/secondary highlight.
   o:  { h: css height (default 96), views: ['front','back'] | one,
         mode: 'mono' (accent) | 'bucket' (per-bucket colors),
         pick: [bucketIds] — picker mode: these buckets render selected
               and every region becomes a data-pick hit target,
         labels: true — FRONT/BACK captions under the figures } */
function muscleMapSVG(hl, o) {
  o = o || {};
  const views = o.views || ['front', 'back'];
  const p = new Set((hl && hl.p) || []), s = new Set((hl && hl.s) || []);
  const pick = o.pick ? new Set(o.pick) : null;
  const H = o.h || 96;
  const lab = o.labels ? 14 : 0;
  const vw = views.length * 100 + (views.length - 1) * 8;
  let inner = '';
  views.forEach((v, i) => {
    const shapes = mmShapes(v).map(sh => {
      const b = MM_REGION_BUCKET[sh.r];
      let cls = 'mm-r';
      if (pick) { if (pick.has(b)) cls += ' sel'; }
      else if (p.has(sh.r)) cls += ' p';
      else if (s.has(sh.r)) cls += ' s';
      const attrs = ` class="${cls}" data-r="${sh.r}" data-b="${b}"${o.mode === 'bucket' || pick ? ` style="--mg:var(--mg-${b})"` : ''}`;
      /* every shape string ends in "/>" — splice the attributes in before it */
      return sh.el.slice(0, -2) + attrs + '/>';
    }).join('');
    inner += `<g transform="translate(${i * 108},0)">${mmBody()}${shapes}` +
      (o.labels ? `<text class="mm-cap" x="50" y="236" text-anchor="middle">${v.toUpperCase()}</text>` : '') + `</g>`;
  });
  return `<svg class="mm${pick ? ' mm-pick' : ''}" viewBox="0 0 ${vw} ${226 + lab}" style="height:${H}px" role="img" aria-label="Muscle map">${inner}</svg>`;
}

/* Convenience: the map for one exercise (both views, mono highlight). */
function muscleMapForEx(ex, h) {
  const m = muscleInfoFor(ex);
  if (!m.p.length && !m.s.length) return '';
  return muscleMapSVG({ p: m.p, s: m.s }, { h: h || 84 });
}

/* The same, merged over several exercises — a superset card, a whole day.
   A region any exercise hits as primary stays primary. */
function muscleMapMerged(list, h) {
  const p = new Set(), s = new Set();
  (list || []).forEach(ex => {
    const m = muscleInfoFor(ex);
    m.p.forEach(r => p.add(r));
    m.s.forEach(r => s.add(r));
  });
  p.forEach(r => s.delete(r));
  if (!p.size && !s.size) return '';
  return muscleMapSVG({ p: [...p], s: [...s] }, { h: h || 84 });
}

/* =====================================================================
   BALANCE DOUGHNUT — checked sets per bucket over a date window.

   Counts only what was actually ticked, across every program state that
   logs days (the current profile), using the log dates the app already
   stamps. Cardio and unclassifiable work are excluded — this chart is
   muscle balance, and it says so.
   ===================================================================== */
function muscleTally(sinceIso) {
  const tally = {}; let cardio = 0, counted = 0;
  MUSCLE_BUCKETS.forEach(b => { tally[b.id] = 0; });
  Object.keys(DAY_PROGRAMS).forEach(k => {
    const st = S[DAY_PROGRAMS[k].stateKey];
    if (!st || !st.log) return;
    let data = null; /* resolve lazily; generator days rebuild themselves */
    Object.keys(st.log).forEach(dn => {
      const log = st.log[dn];
      if (!log || !log.date || log.date < sinceIso) return;
      const n = Object.keys(log.checks || {}).filter(id => log.checks[id]).length;
      if (!n) return;
      if (!data) { try { data = DAY_PROGRAMS[k].data; } catch (e) { data = []; } }
      const day = data && data[dn - 1];
      if (!day || !day.exercises) return;
      /* checks are keyed key or key_setIndex — count per exercise */
      const byEx = {};
      Object.keys(log.checks).forEach(id => {
        if (!log.checks[id]) return;
        const exKey = id.replace(/_\d+$/, '');
        byEx[exKey] = (byEx[exKey] || 0) + 1;
      });
      day.exercises.forEach(ex => {
        const setsDone = byEx[ex.key];
        if (!setsDone) return;
        const m = muscleInfoFor(ex);
        if (m.cardio) { cardio += setsDone; return; }
        const buckets = [...new Set(m.p.concat(m.s).map(r => MM_REGION_BUCKET[r]).filter(Boolean))];
        if (!buckets.length) return;
        counted += setsDone;
        /* primary gets the full set, secondaries share half — so a squat
           is mostly a leg, not equally a glute */
        const pb = m.p.length ? MM_REGION_BUCKET[m.p[0]] : buckets[0];
        tally[pb] += setsDone;
        const secs = buckets.filter(b => b !== pb);
        secs.forEach(b => { tally[b] += setsDone * 0.5 / secs.length; });
      });
    });
  });
  return { tally, cardio, counted };
}

function muscleDoughnutHTML(days) {
  const since = new Date(Date.now() - days * 86400000);
  const sinceIso = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
  const { tally, counted } = muscleTally(sinceIso);
  const entries = MUSCLE_BUCKETS
    .map(b => ({ id: b.id, name: b.name, v: tally[b.id] }))
    .filter(e => e.v > 0);
  const total = entries.reduce((a, e) => a + e.v, 0);
  if (!total) {
    return `<div class="tiny muted center" style="padding:18px 8px">Nothing logged in the last ${days} days yet — tick sets in any workout and the split appears here.</div>`;
  }
  entries.sort((a, b) => b.v - a.v);

  /* arcs from 12 o'clock, 2px surface gaps between slices */
  const R = 54, C = 70, SW = 22, GAP = 0.045;
  let a0 = -Math.PI / 2, arcs = '', labels = '';
  entries.forEach(e => {
    const frac = e.v / total;
    const a1 = a0 + frac * Math.PI * 2;
    const g = Math.min(GAP, frac * 0.6);
    const b0 = a0 + g / 2, b1 = a1 - g / 2;
    const large = (b1 - b0) > Math.PI ? 1 : 0;
    const x0 = C + R * Math.cos(b0), y0 = C + R * Math.sin(b0);
    const x1 = C + R * Math.cos(b1), y1 = C + R * Math.sin(b1);
    arcs += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="var(--mg-${e.id})" stroke-width="${SW}" fill="none"/>`;
    if (frac >= 0.10) {
      const mid = (a0 + a1) / 2, lx = C + R * Math.cos(mid), ly = C + R * Math.sin(mid);
      labels += `<text class="mg-pct" x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle">${Math.round(frac * 100)}%</text>`;
    }
    a0 = a1;
  });
  const legend = entries.map(e => `<div class="mg-leg-row">
      <span class="mg-dot" style="background:var(--mg-${e.id})"></span>
      <span class="mg-leg-name">${e.name}</span>
      <b class="mg-leg-v">${Math.round(e.v * 10) / 10}</b>
      <span class="mg-leg-pct">${Math.round(e.v / total * 100)}%</span>
    </div>`).join('');
  return `<div class="mg-wrap">
      <svg viewBox="0 0 140 140" class="mg-donut" role="img" aria-label="Training split by muscle group">
        ${arcs}${labels}
        <text class="mg-mid" x="70" y="66" text-anchor="middle">${Math.round(counted)}</text>
        <text class="mg-mid-sub" x="70" y="80" text-anchor="middle">sets</text>
      </svg>
      <div class="mg-legend">${legend}</div>
    </div>
    <div class="tiny muted" style="margin-top:8px">Checked sets, last ${days} days, all programs on this profile. A set counts once for its main muscle and half for assisting ones. Walks and cardio are excluded — this chart is muscle balance.</div>`;
}

/* =====================================================================
   NAMED ANATOMY — the specific muscles behind each region.

   The body map answers "roughly where"; this answers "which muscle,
   exactly, and where on your body that is" — gluteus medius vs maximus,
   the teardrop above the knee vs the shin below it. Attributions follow
   standard kinesiology (which muscles a movement pattern loads), stated
   as anatomy rather than per-exercise measurement claims.
   ===================================================================== */
const MM_ANATOMY = {
  glute_max: { name: 'Gluteus maximus',   where: 'the big main muscle of the bottom — the lower, meatiest part' },
  glute_med: { name: 'Gluteus medius',    where: 'the upper-outer hip, above and to the side of the max — the "top glute"' },
  glute_min: { name: 'Gluteus minimus',   where: 'deep underneath the medius on the outer hip' },
  adductors: { name: 'Adductors (longus, magnus, brevis)', where: 'the inner-thigh muscles, groin to inner knee' },
  hip_flex:  { name: 'Hip flexors (iliopsoas)', where: 'the front of the hip crease' },
  quad_vm:   { name: 'Vastus medialis',   where: 'the teardrop just above the INSIDE of the knee' },
  quad_vl:   { name: 'Vastus lateralis',  where: 'the outer sweep of the front thigh' },
  quad_rf:   { name: 'Rectus femoris',    where: 'the middle strip of the front thigh, crossing up into the hip' },
  hams:      { name: 'Hamstrings (biceps femoris, semitendinosus, semimembranosus)', where: 'the back of the thigh, sit-bone to just below the knee' },
  gastroc:   { name: 'Gastrocnemius',     where: 'the upper-calf bulge just below the BACK of the knee' },
  soleus:    { name: 'Soleus',            where: 'the deeper, lower calf muscle, down toward the ankle' },
  tib_ant:   { name: 'Tibialis anterior', where: 'the shin muscle on the FRONT, below the knee' },
  tva:       { name: 'Transversus abdominis', where: 'the deepest ab layer, wrapping below the navel like a corset' },
  rect_abs:  { name: 'Rectus abdominis',  where: 'the "six-pack" strap down the front of the belly' },
  obl:       { name: 'Internal & external obliques', where: 'the waist muscles along your sides' },
  pf:        { name: 'Pelvic floor (levator ani: pubococcygeus, iliococcygeus; coccygeus)', where: 'the muscular sling from pubic bone to tailbone' },
  diaphr:    { name: 'Diaphragm',         where: 'the breathing dome under the ribs' },
  erectors:  { name: 'Erector spinae',    where: 'the two ropes either side of the spine' },
  multifidus:{ name: 'Multifidus',        where: 'the small, deep stabilisers stitched along the spine' },
  lats:      { name: 'Latissimus dorsi',  where: 'the wide sheets from armpit down to the low back' },
  traps:     { name: 'Trapezius',         where: 'the kite from neck across the shoulders to mid-back' },
  rhomb:     { name: 'Rhomboids',         where: 'between the shoulder blades' },
  pec:       { name: 'Pectoralis major (sternal head)', where: 'the main chest plate' },
  pec_up:    { name: 'Pectoralis major (clavicular head)', where: 'the upper chest shelf below the collarbone' },
  delt_a:    { name: 'Anterior deltoid',  where: 'the FRONT of the shoulder cap' },
  delt_m:    { name: 'Lateral deltoid',   where: 'the SIDE of the shoulder cap — width' },
  delt_p:    { name: 'Posterior deltoid', where: 'the REAR of the shoulder cap' },
  rotator:   { name: 'Rotator cuff (supraspinatus, infraspinatus, teres minor, subscapularis)', where: 'the small stabilisers wrapping the shoulder blade' },
  serratus:  { name: 'Serratus anterior', where: 'the finger-like slips along the ribs under the armpit' },
  biceps_b:  { name: 'Biceps brachii',    where: 'the front of the upper arm' },
  triceps_b: { name: 'Triceps brachii',   where: 'the back of the upper arm' },
  fore:      { name: 'Forearm flexors & extensors', where: 'grip — elbow to wrist' }
};

/* First matching rule wins; p = the movers, s = the helpers. */
const MM_SPECIFIC_RULES = [
  [/clam ?shell|fire hydrant|band walk|lateral.*walk|side[- ]?l(ying|eg).*(raise|lift)|hip (er|abduction)/i, { p: ['glute_med', 'glute_min'], s: ['glute_max'] }],
  [/single[- ]?leg (glute )?bridge/i,                     { p: ['glute_max', 'hams'], s: ['glute_med', 'tva'] }],
  [/glute bridge|hip thrust|bridge\b|donkey kick/i,       { p: ['glute_max'], s: ['hams', 'pf'] }],
  [/bent[- ]?knee fallout|adductor|cossack|inner thigh|sumo/i, { p: ['adductors'], s: ['pf', 'tva'] }],
  [/kegel|pelvic floor|knack|quick flick|long hold/i,     { p: ['pf'], s: ['tva'] }],
  [/360|diaphrag|breath/i,                                { p: ['diaphr'], s: ['tva', 'pf'] }],
  [/tva|draw[- ]?in|heel slide|dead ?bug|hollow/i,        { p: ['tva'], s: ['rect_abs', 'pf'] }],
  [/side plank|pallof|anti[- ]?rotation|suitcase|farmer|carry|woodchop|russian twist/i, { p: ['obl'], s: ['tva', 'glute_med'] }],
  [/bird dog|back extension|superman|good morning/i,      { p: ['erectors', 'multifidus'], s: ['glute_max', 'tva'] }],
  [/plank|mountain climber|ab wheel|rollout/i,            { p: ['tva', 'rect_abs'], s: ['obl', 'serratus'] }],
  [/crunch|sit[- ]?up|leg raise|toe touch/i,              { p: ['rect_abs'], s: ['hip_flex', 'obl'] }],
  [/deadlift|rdl|romanian|hinge|kettlebell swing|swing\b/i, { p: ['hams', 'glute_max'], s: ['erectors', 'fore'] }],
  [/leg curl|nordic|hamstring/i,                          { p: ['hams'], s: ['gastroc'] }],
  [/seated calf|bent[- ]?knee calf/i,                     { p: ['soleus'], s: ['gastroc'] }],
  [/calf|heel raise/i,                                    { p: ['gastroc'], s: ['soleus'] }],
  [/tibialis|toe raise/i,                                 { p: ['tib_ant'], s: [] }],
  [/lunge|split squat|bulgarian|step[- ]?(up|down)|pistol/i, { p: ['quad_vm', 'quad_vl', 'glute_max'], s: ['glute_med', 'adductors'] }],
  [/squat|leg press|wall sit|sit[- ]?to[- ]?stand/i,      { p: ['quad_vl', 'quad_vm', 'quad_rf', 'glute_max'], s: ['adductors', 'erectors'] }],
  [/pull[- ]?up|chin[- ]?up|pulldown|row\b|rows\b/i,      { p: ['lats'], s: ['rhomb', 'traps', 'biceps_b', 'delt_p'] }],
  [/face pull|reverse fly|rear delt/i,                    { p: ['delt_p', 'rhomb'], s: ['traps', 'rotator'] }],
  [/shrug/i,                                              { p: ['traps'], s: ['fore'] }],
  [/external rotation|rotator|cuban/i,                    { p: ['rotator'], s: ['delt_p'] }],
  [/incline.*(press|fly)/i,                               { p: ['pec_up'], s: ['delt_a', 'triceps_b'] }],
  [/bench|push[- ]?up|chest (press|fly)|fly[e]?s|dip\b/i, { p: ['pec'], s: ['delt_a', 'triceps_b', 'serratus'] }],
  [/overhead press|shoulder press|ohp|arnold/i,           { p: ['delt_a', 'delt_m'], s: ['triceps_b', 'traps'] }],
  [/lateral raise/i,                                      { p: ['delt_m'], s: ['delt_a'] }],
  [/front raise/i,                                        { p: ['delt_a'], s: ['delt_m'] }],
  [/skull ?crusher|kickback|tricep|close[- ]?grip/i,      { p: ['triceps_b'], s: [] }],
  [/curl/i,                                               { p: ['biceps_b'], s: ['fore'] }],
  [/grip|dead ?hang|wrist/i,                              { p: ['fore'], s: [] }]
];

/* Region-level fallback when no specific rule matches. */
const MM_REGION_GENERIC = {
  chest: ['pec'], shoulders: ['delt_a', 'delt_m', 'delt_p'], biceps: ['biceps_b'], triceps: ['triceps_b'],
  forearms: ['fore'], core: ['tva', 'rect_abs'], obliques: ['obl'], pelvic: ['pf'],
  back: ['lats', 'traps', 'rhomb'], lowerback: ['erectors', 'multifidus'], glutes: ['glute_max', 'glute_med'],
  quads: ['quad_vl', 'quad_vm', 'quad_rf'], hamstrings: ['hams'], calves: ['gastroc', 'soleus'],
  hips: ['adductors', 'hip_flex']
};

/* {main:[{name,where}], assists:[...]} for one exercise, or null when the
   movement has no muscle story (a stretch, a cardio interval). */
function muscleDetailFor(ex) {
  if (!ex) return null;
  const info = muscleInfoFor(ex);
  const hay = (ex.name || '') + ' ' + (ex.key || '');
  for (const [re, spec] of MM_SPECIFIC_RULES) {
    if (!re.test(hay)) continue;
    const pick = ids => ids.map(id => MM_ANATOMY[id]).filter(Boolean);
    return { main: pick(spec.p), assists: pick(spec.s || []) };
  }
  if (!info.p.length && !info.s.length) return null;
  const fromRegions = rs => {
    const out = [], seen = new Set();
    rs.forEach(r => (MM_REGION_GENERIC[r] || []).forEach(id => {
      if (seen.has(id)) return; seen.add(id);
      if (MM_ANATOMY[id]) out.push(MM_ANATOMY[id]);
    }));
    return out;
  };
  return { main: fromRegions(info.p), assists: fromRegions(info.s) };
}

/* the detail as compact HTML — used by the How-to panel and the Library */
function muscleDetailHTML(ex) {
  const d = muscleDetailFor(ex);
  if (!d || (!d.main.length && !d.assists.length)) return '';
  const li = (m, role) => `<div class="tip-mu ${role}"><b>${m.name}</b> — ${m.where}</div>`;
  return `<div class="tip-muscles">
    ${d.main.map(m => li(m, 'main')).join('')}
    ${d.assists.length ? `<div class="tip-mu-sub">Assisting</div>` + d.assists.map(m => li(m, 'sub')).join('') : ''}
  </div>`;
}
/* searchable text of the same, for the Library's search box */
function muscleDetailText(ex) {
  const d = muscleDetailFor(ex);
  if (!d) return '';
  return d.main.concat(d.assists).map(m => m.name + ' ' + m.where).join(' ').toLowerCase();
}
