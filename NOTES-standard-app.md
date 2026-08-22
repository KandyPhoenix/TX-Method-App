# Ideas borrowed from "The Standard"

Running list of things Kandy liked in The Standard app and wants evaluated for
TX Method. Each entry records what was asked for, what the app does today, and
how much work it actually is — so we can pick them off one at a time instead of
attempting a rewrite.

Status legend: **done** · **next** · **spec'd** · **needs detail**

---

## 1. White balance / light theme — **done** (v99)

Wanted a light, clean, well-organised look.

The stylesheet was only half tokenised, so a light theme was impossible without
touching nearly every rule. Fixed that first: `:root` is now a full semantic
token set, with a `:root[data-theme="light"]` palette beside it. Theme picker
(Dark / Light / Auto) lives in Setup.

The one real trap: lime `#aaff00` on white is ~1.4:1 contrast. Solved by
splitting the accent into `--accent` (fills, still brand lime) and
`--accent-ink` (text on page background, darkened to `#4a7a00`).

## 2. Density — **done** (v99), may want further tuning

"Everything is so big."

Root cause was an 18px base font under a default page zoom of **1.28** — the app
was effectively rendering at ~23px. Dropped the default zoom to 1 and tightened
the type/spacing scale. Roughly doubles what fits on screen. The Setup text-size
slider is untouched, so it's reversible per-person.

## 3. Whole-session workout timer — **next**

A timer that starts when the workout starts and runs until you exit, rather than
only counting rest between sets.

Today the app only has `restTimer` (a per-set countdown overlay) and the guided
session overlay. There is no elapsed-session clock. This is genuinely new, but
small: a start timestamp on the session + a ticking display, persisted so it
survives a backgrounded PWA. Should write total session time into the day's log
so it can show up in Stats.

## 4. Home-gym weights vs bodyweight toggle — **spec'd**

Switch a workout between loaded and bodyweight versions.

Partially latent in the app already: `DEFAULTS` has `plates` and `barWeight`, and
several programs (Prep30, Mobility, Core, Pilates, HIIT, BJJ) are already pure
bodyweight while others (Texas, Dumbbell, SuperAge) are loaded. What's missing is
a per-exercise *substitution* — the same session rendered either way.

Needs the same substitution hook as item 6, so build them together.

## 5. Per-exercise video that plays while you work through the sets — **needs detail**

Each exercise card shows a looping demo video above the set list.

Today each exercise has a `formTips` entry (a text how-to popup) and some have a
`tip-demo` link out. Structurally the hook already exists — `formTips` is keyed by
exercise key, so a `video` field alongside `body` would slot in cleanly.

Open question is hosting: bundling video files would bloat the PWA cache badly
(sw.js precaches assets). Probably wants short muted looping clips, lazy-loaded,
*not* in the service-worker precache list. Worth checking what The Standard does.

## 6. "Train precisely to your unique footprint" — **spec'd**

The marketing line Kandy liked. Interpreted as a personal profile (goals,
limitations, equipment) rather than limb-length anthropometry — that reading
matches her known constraints. Confirm before building.

The gap is real and specific: her footprint is already *in* the app, but hardcoded
rather than configurable.

- `glutestep` (Glute Step Down) is a first-class tracked lift in `liftLog`,
  alongside squat/deadlift/bench — that's the glutes-first rule, baked in.
- ATG split squats, tibialis raises, knee-to-wall ankle rocks and deep squat
  holds are seeded through `MOBILITY` / `SA_POOL` — that's knee protection,
  baked in.

Because they're hardcoded they can't follow her. Switch from Mobility to
SuperAge 4-Day or Dumbbell B and the glutes-first guarantee silently disappears,
because nothing in the code knows it's a rule.

**Minimal build:** a `footprint` block in `DEFAULTS` (`priorityMuscles`,
`jointCautions`, `equipment`) plus one substitution/injection pass in the
day-render path. Deliberately do *not* rewrite the program arrays to prove it
out — add the fields and one hook, confirm glutes-first holds across all eleven
programs, then decide whether to go further.

## 7. Assessments — **needs detail**

Kandy asked "can we add these assessments?" while looking at The Standard. Not
yet seen — need a screenshot or description of what the app actually assesses
(movement screen? strength benchmark? intake questionnaire?) before this can be
specced.

Note: TX Method already computes Wilks, powerlifting total, strength-to-weight
ratios and estimated 1RMs, so some of this may already exist under another name.

---

## Ground rule

Everything here is additive. TX Method has eleven programs and real training
history in `localStorage` + Firebase sync — no change should alter existing
program data or force anyone onto a new layout. Ship behind a setting where the
change is a matter of taste (as the theme and text-size controls do).
