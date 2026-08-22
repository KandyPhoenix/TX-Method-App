# Ideas borrowed from "The Standard" (Super Age)

`standard.superage.com` — **The Standard by Super Age**, not the Cbum
bodybuilding app of a similar name. This matters: TX Method's `SUPERAGE2` /
`SUPERAGE4` / `SUPERAGEH` programs are already built from Super Age's protocols,
so this is the same training philosophy we've already committed to, not a
competing one.

Status legend: **done** · **next** · **spec'd** · **needs detail**

---

## The app's shape

Three sections in the left nav, and Kandy wants all three:

| Section | What it is |
|---|---|
| **Roadmap** | Today's queued workout as a hero card (START / SKIP), "+ log your own workout", a "See my week" day strip with a completion counter (1/4), a horizontal scroller of upcoming workouts, then assessments |
| **Fingerprint** | "Longevity Fingerprint — your 8-marker health profile". A radar chart plus a grid of assessment cards |
| **Protocols** | Browsable library, filtered by category and type, split into Workouts / Diagnostic Tests / Recovery |

---

## 1. Warm light theme — **done** (v99)

The "white balance" Kandy liked is not white. Sampled from the live page:
`document.body` is **`#fff7eb`** — a warm cream — with pure-black text and
**white** cards. The cards lift off the cream without needing heavy borders or
shadows, and that separation is what reads as "organised".

Our light theme now uses that palette. The stylesheet had to be fully tokenised
first (~60 raw hex in `styles.css`, ~40 more in `app.js` bypassing `:root`).
Theme picker (Dark / Light / Auto) is in Setup.

Trap worth remembering: lime `#aaff00` on cream is ~1.4:1. Fixed by splitting
the accent into `--accent` (fills — still brand lime) and `--accent-ink` (text
on page background — darkened to `#4a7a00`). Lime survives because The Standard
uses a lime banner too, so it's on-idiom.

## 2. Density — **done** (v99)

"Everything is so big." Cause: 18px base font under a default page zoom of
**1.28**, so the app rendered at ~23px effective. Dropped default zoom to 1 and
tightened the type/spacing scale. Roughly doubles what fits on screen. The Setup
text-size slider is untouched, so it's reversible per-person.

## 3. Fingerprint — **next**, highest value

This is the "training precisely to your unique footprint" Kandy reacted to. It is
literally called *Fingerprint*, and it is concrete, not marketing.

Eight markers on a radar chart: **Balance, Functional Strength, Grip Strength,
Endurance Under Load, Aerobic Capacity, Agility, Relational Capacity, Working
Memory.** Each scores into a tier: Elite / Advanced / Core / Foundation / Not
Assessed. Each has an assessment card — Take Assessment, Retake, or locked
("complete more workouts to unlock").

Why this is very buildable here:
- Canvas charting already exists (`lineChart`, `emptyChart`) — a radar is the
  same machinery, and it now reads colours from tokens via `cssVar()`.
- The scoring vocabulary already exists: Wilks tiers, strength-to-weight ratios
  and estimated 1RM are computed today, with beginner/intermediate/advanced/elite
  bands already written into the `formTips` copy.
- Grip Strength, Functional Strength and Endurance Under Load map onto lifts the
  app already tracks. Balance/Agility map onto the mobility work already in
  `MOBILITY`.

Build: a `fingerprint` block in state (per marker: score, tier, date assessed),
a radar renderer, and an assessments screen. Relational Capacity and Working
Memory are non-physical — decide whether to include them or ship six markers.

## 4. Assessments / Diagnostic tests — **part of Fingerprint**

What Kandy meant by "can we add these assessments". They're the input side of
the Fingerprint: each one is a scored test that fills in a marker. Gated —
locked until enough workouts are complete.

## 5. Roadmap — **spec'd**

A queue rather than a calendar. Today's workout as a hero with START and **SKIP**,
a week strip showing which days are done with an `n/4` counter, and a scroller of
what's coming.

TX Method has the raw material: a day cursor per program, `estDayMin()` for
durations (The Standard puts "~25-30 MIN" on every card), a month calendar, and
completion state. What's missing is SKIP (advancing without logging) and the
"log your own workout" escape hatch.

## 6. Protocols — **spec'd**

A browsable library filtered by category and type, split Workouts / Diagnostic
Tests / Recovery. TX Method's eleven programs are currently a flat grid of tiles
in Setup; this is a presentation change more than a data change, and it becomes
much more useful once individual sessions are addressable rather than only whole
programs.

## 7. Whole-session workout timer — **next**, small

A clock that runs from workout start until you exit, not just rest between sets.

Today there's only `restTimer` (per-set countdown) and the guided session
overlay. No elapsed-session clock. Small build: a start timestamp plus a ticking
display, persisted so it survives a backgrounded PWA, written into the day's log
so it can surface in Stats.

## 8. Home-gym weights vs bodyweight toggle — **spec'd**

Partly latent already: `DEFAULTS` has `plates`/`barWeight`, and several programs
are pure bodyweight (Prep30, Mobility, Core, Pilates, HIIT, BJJ) while others are
loaded (Texas, Dumbbell, SuperAge). Missing piece is per-exercise *substitution* —
the same session rendered either way. Shares a hook with item 9, so build together.

## 9. Per-exercise demo video — **needs detail**

A looping clip on each exercise card, playing while you work the sets below it.

The hook exists: `formTips` is already keyed by exercise key, so a `video` field
alongside `body` slots in cleanly. Open question is hosting — bundling video
would wreck the PWA cache, since `sw.js` precaches assets. Wants short muted
looping clips, lazy-loaded, explicitly **not** in the precache list.

## 10. Footprint-driven programming — **spec'd**

Distinct from the Fingerprint display: making the profile actually *drive* what
gets programmed. Kandy's constraints are already in the app, but hardcoded rather
than configurable:

- `glutestep` (Glute Step Down) is a first-class tracked lift in `liftLog`
  alongside squat/deadlift/bench — the glutes-first rule, baked in.
- ATG split squats, tibialis raises, knee-to-wall ankle rocks and deep squat
  holds are seeded through `MOBILITY` / `SA_POOL` — knee protection, baked in.

Because they're hardcoded they can't follow her. Switch from Mobility to SuperAge
4-Day or Dumbbell B and the glutes-first guarantee silently disappears, because
nothing in the code knows it's a rule.

Minimal build: a `footprint` block in `DEFAULTS` (`priorityMuscles`,
`jointCautions`, `equipment`) plus one substitution pass in the day-render path.
Deliberately do *not* rewrite the program arrays to prove it out.

---

## Ground rule

Everything here is additive. TX Method has eleven programs and real training
history in `localStorage` + Firebase sync — no change should alter existing
program data or force anyone onto a new layout. Ship behind a setting wherever
the change is a matter of taste, as the theme and text-size controls do.
