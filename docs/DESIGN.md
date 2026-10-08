# SHELTER CALL — Game Design Document (v1)

> **Where this file goes:** `docs/DESIGN.md` in the game repo. Claude Code reads it through `CLAUDE.md`.
> **Challenge:** NASA Space Apps 2026 — *Build a Junior Astronaut Mission Trainer*
> **One line:** A scramble-and-survive game on a Moon outpost where every solar storm, every countdown, and every forecast comes from real NASA records.
> **Hook:** *"You get as many seconds as the real crew would have had minutes."*

---

## 1. From hook to solution (how we got here)

### 1.1 The brief
Space Apps 2026 ("The Next Frontier", Nov 14–15) offers 14 challenges. Our constraints:
- 1–3 BSIT students with no aerospace background.
- Originally a 40-hour hackathon build; **this version of the plan has no time limit**. We build in layers (§13) and aim for quality.
- A hard filter: **a stranger must want to come back to it**, not just watch a one-time demo.

### 1.2 How we chose
- **Filtered 14 → 6.** We cut every challenge that needs specialist science we'd end up faking: SAR, sensor cross-calibration, agronomy, combustion, medicine, trend significance, horizon math, analog geology.
- **Invented one concept for each of the 6 kept** (Abandoned Hardware, Junior Astronaut, Martian Map, SPHEREx, Mission Design, Earth Jukebox) and checked each one for prior art.
- **Prior art killed several.** Public repos built for 2026 already exist for the Martian Map (at least three), the Jukebox, and basic Junior Astronaut outposts; mission-design browser games already exist too.
- **Winner: Junior Astronaut.** The concept is the only one where the real data *is* the fun. The runner-up, "Lost & Found: Solar System" (Abandoned challenge), is our Oct 28 fallback.

### 1.3 The core idea
Space-weather forecasts are uncertain in ways kids can feel.
- **Forecast error is large.** CME arrival-time models are off by about 10 hours on average, with standard deviations often above 20 hours (CCMC CME Scoreboard analysis).
- **Some radiation comes with almost no warning.** NOAA can't warn of a solar particle event until the flare or CME is detected. The particles usually arrive within an hour, and Moon crews would need more time than that to shelter.
- **This is a real, open Artemis problem.** It's also a problem every kid in typhoon-prone Bicol already understands: *when do you evacuate on a forecast that might be wrong?*

### 1.4 Making it a game people replay
- **Structure borrowed from *60 Seconds!*.** A frantic grab phase, then a slower survival phase.
- **The trap.** *60 Parsecs!* already is "60 Seconds in space", and critics say luck decides its outcomes more than skill.
- **Our thesis.** *The chaos is the real Sun, and real information lets skill beat it.* Forecasts, flare warnings and alerts are real, so players can learn to win.

### 1.5 What we verified in real data and real procedure
- **Real countdowns exist in DONKI.** The May 11, 2024 records show a flare logged at 01:10 UTC and >100 MeV protons detected at 02:10 UTC, a 60-minute window. The official alert went out at 02:30, twenty minutes *after* the particles arrived.
- **DONKI quirks we must handle:**
  - It mixes model predictions ("MODEL: REleASE") with real detections.
  - One particle event can link to many flares and CMEs.
  - Every event is repeated per instrument, so rows must be deduplicated.
- **The shelter mechanic is real procedure.** Orion's crew builds a radiation shelter out of stowage bags (food, water, supplies), adding mass around themselves.
  - They have up to about one hour to set it up.
  - Reports say they may stay inside up to 24 hours.
  - Radiation rises gradually, "like filling a bathtub."

### 1.6 The solution
**SHELTER CALL** is a replayable web game in three phases.

1. **SCRAMBLE.** Hop around a 3D low-poly lunar south-pole outpost grabbing crew and supplies.
   - The countdown in seconds equals the real minutes between a real flare and its particles.
2. **SHELTER DAYS.** Survive about 12 days (two shifts per day) in a shelter whose walls are made of your food and water, so *eating your wall weakens your shield*.
   - A radio relays the real forecasts and flares from a hidden real stretch of the Sun's history.
   - You send crew outside to farm, repair and do science, or keep them safe.
3. **REVEAL.** The real date is revealed. One timeline compares *your calls*, *NASA's forecast* and *what actually happened*. Every real event you survived becomes a collectible **Sun Almanac** card.

---

## 2. Target audience

The official challenge text targets **students**: it asks for a game that lets students run an outpost and experience real mission trade-offs at a level that holds a *young learner's* attention. It's tagged Intermediate + Beginner/Youth but names no age. **Our choice:** ages 10–14 as primary. That's old enough for real trade-offs, young enough that the challenge's "hold their attention" problem is sharpest, and it matches the upper-elementary and junior high school classes where this would actually be played.

| Audience | Who | What we design for |
|---|---|---|
| **Primary** | Students aged **10–14** (Grades 5–9) | One-thumb controls, ~Grade 5 reading level, runs of 8–12 min, humor, no death, visible cause → effect |
| **Secondary** | Teachers and classrooms | Projector-friendly **Classroom mode**: pauses on forecast cards for a class vote, discussion questions on the reveal; one run fits a class period |
| **Tertiary** | Families, all ages | **Cadet** difficulty for age 8+; nothing depends on reading speed; **Flight Director** difficulty for teens and adults |
| **Judges** | NASA / partner-agency experts | **Judge mode**: a 3-minute guided run, a "What's real?" panel, data stats, DONKI IDs on every real event |

**Design implications:**
- Every rule is shown, not explained.
- Every number has an icon.
- Every consequence is animated.
- No death: crew are *sent home early* (medevac) instead.
- No scary imagery.
- Works on low-end Android phones (common in Philippine schools) and on desktops/projectors.

---

## 3. Design pillars

1. **Panic, then plan.** A spiky 15–90 s scramble followed by calm, thoughtful shelter days. The contrast is the fun.
2. **Every choice has a visible cost.** Wall = pantry. EVA = production + risk. Radio slot = information.
3. **The Sun is the dungeon master.** Real, fair, never repeating. Nothing hazardous is scripted.
4. **Learn by losing.** The reveal shows exactly which call went wrong and what the forecast actually said.
5. **One more run.** Short runs, collection (Almanac, endings, achievements), a daily seed, and friend codes.

---

## 4. Visual & platform decision: a 2D + 3D mix

**Decision:** a web game (HTML/CSS/JS). The Scramble is **3D** (Three.js); everything else is **2D** (HTML/CSS/SVG).

| Part | Tech | Why |
|---|---|---|
| Scramble | **Three.js, orthographic isometric camera, low-poly, flat-shaded** | The most intense moment deserves spatial chaos. The lunar south pole's low Sun gives dramatic long shadows that are *scientifically true* and beautiful. Three.js is mature and CC0 low-poly kits exist |
| Shelter Days, Reveal, menus | **HTML/CSS/SVG** (DOM) | Information-dense, icon-and-text UI; best accessibility; fastest to style and iterate; cheap CSS 3D touches (page flips, card flips) |
| Almanac cards, endings | SVG + CSS | Crisp at any size, easy to generate from data |

- **Why not all 3D?** Scope, low-end phone performance, and text-heavy UI is worse in WebGL.
- **Why not all 2D?** Less stage impact, and the long-shadow Moon look sells the setting instantly.
- **Safety net:** scramble *logic* is separate from *rendering*. If 3D misses performance targets on low-end phones, a 2D top-down canvas renderer can be swapped in.

### 4.1 Art direction ("cozy sci-fi", explicitly *not* retro Atomic Age)
- **Setting:** a hopeful near-future lunar south pole.
  - Cold blue-grey regolith, jet-black long shadows, a low white-gold Sun on the horizon.
  - Warm amber habitat lights.
- **Crew:**
  - Chunky helmets, readable silhouettes.
  - Each crew member gets a distinct suit color **and** shape accent (colorblind-safe).
- **Mascot:** **Kamote**, a potted sweet potato plant in the greenhouse. It reacts to events (droops when sad, sprouts when fed).
- **Journal (Shelter Days):** a crew logbook with graph paper, tape, stickers, kid-like doodles, handwritten headings, and clean UI text for numbers.
- **Palette:** 8–10 tokens, colorblind-safe. Danger is never shown by color alone; it always pairs with an icon or pattern.

### 4.2 Audio direction
- **Soundtrack:**
  - Calm, curious base theme.
  - Rising-tempo scramble music tied to the timer.
  - Ambient shelter music that thins as the shield weakens.
- **Style:** playful synth + soft percussion.
- **Light data sonification:** flare class sets alarm pitch and intensity.
- **Captions** for key sounds.

---

## 5. Game flow

### 5.1 Run structure (8–12 min on Commander)
Title → **Crew Draft** (pick 4 of 8; auto-pick on Cadet) → **Briefing** (15 s, skippable) → **Scramble** (15–90 s) → **Shelter Days** (Cadet 10 / Commander 12 / Flight Director 14 days × 2 shifts) → **Ending** → **Reveal** → Almanac unlocks → **Play again** (one tap)

Each run is built on a **real window** of 10–14 days from DONKI (dates hidden until the reveal). The window starts at a real flare whose particles really arrived, and it always contains at least one real CME forecast.

### 5.2 Phase 1 — SCRAMBLE
- **Map:** a procedural outpost from the run seed.
  - The shelter hatch sits at the center.
  - Modules sit on a ring with random rotation and offset: greenhouse, solar field, ice drill, lander, rover bay, science lab.
  - Rocks, craters and boulders are scattered around.
- **Movement — moon hops:**
  - 1/6 g arcs with momentum and slight overshoot.
  - A dust puff on landing; the drop shadow scales with height (depth cue).
  - Controls: tap/click-to-hop toward a point, WASD/arrows, optional gamepad.
- **Carry:** 4 slots; a water brick takes 2. Walk over an item to pick it up; reach the hatch to auto-deposit it.
- **Crew:** bump into a crew member to *tag* them. They hop behind you in a line that slightly slows you. Reaching the hatch with them saves them.
  - *This conga line is our mechanic, not 60 Seconds' carrying.*
- **Timer (REAL):**
  - Seconds = real minutes between the linked flare and the particle onset, clamped to 15–90.
  - The HUD shows it: `REAL: 60 min → YOU: 60 s`.
  - If clamped, it says so ("the real crew had even less time" / "we trimmed a 4-hour wait to 90 s").
- **Last 10 s:** alarm, red vignette, particle shimmer.
- **At zero:** a particle-storm effect. Anyone or anything still outside is **exposed** (dose applied at the start of Shelter Days).
- **Output:** `ScrambleResult {itemsSaved[], crewSaved[], crewExposed[], timeLeft}`

### 5.3 Phase 2 — SHELTER DAYS (the heart of the game)
Each day is one page of the crew journal, headed "Day 4" (no real date). Each day has **two shifts** (AM 00–12h, PM 12–24h in the hidden real day).

Per shift, the player:
1. **Reads the radio** (only if the radio was saved).
   - **REAL** messages: flares (with class badge), CME launches, official alerts.
   - **CME forecast card:** predicted arrival on a timeline with a ± band (the band width comes from our data report; hidden on Flight Director).
2. **Assigns crew:** IN SHELTER, or an EVA task:
   - **Greenhouse:** food; needs the seed cartridge.
   - **Solar repair:** power.
   - **Ice drill:** makes water bricks.
   - **Salvage lander:** a random useful item.
   - **Science walk:** science points.
3. **Arranges the wall.**
   - 8 wall slots surround the crew pod; everything else sits on the pantry shelf.
   - Items in the wall add shielding.
   - *Consuming a wall item (eating, drinking) opens a visible gap.* The shield % gauge updates live.
4. **Ends the shift.** Real events resolve at their real hours; game events are drawn from the deck.

**Flare interrupt ("Rush Back")**
- Trigger: a REAL flare happens during a shift while crew are outside, and the radio was saved.
- The game pauses with a big choice:
  - **RECALL NOW:** lose the shift's output.
  - **KEEP WORKING:** keep the output and risk exposure.
- Shown data: the flare class and a plain-language, data-derived hint, e.g. *"In our records, 1 in 5 X-class flares led to particles."* The rate is computed by the pipeline, never invented.
- *Most flares don't cause particle storms*, so this is genuine forecasting under uncertainty.

**No radio = blind mode**
- You get no forecasts and no flare warnings.
- With the dosimeter, you learn about a storm when its alarm trips at onset.
- Without the dosimeter, you learn when crew start feeling sick.
- Hard, but winnable; there's an achievement for it.

**"All clear" call**
- After onset, the particle level decays over time (a labeled game approximation).
- Crew can go back out whenever you choose: too early means dose, too late means starving your production.

**Win condition:** survive until the resupply lander arrives. It comes on a random day within the last 2 days of the run.

### 5.4 Phase 3 — REVEAL
- **Date reveal animation:** "This was **March 2012**."
- **One scrubbable timeline, three lanes:** YOUR CALLS / NASA FORECAST / WHAT HAPPENED. Highlights mark where the forecast missed and where the player beat it or got caught.
- **Stats:** crew home, science, total dose, food eaten from the wall.
- **Ending card** with art and a one-line kind or funny epilogue.
- **"What's real?" panel:** every REAL event with its DONKI ID and UTC timestamp, plus a list of every game approximation used.
- **Almanac:** cards unlock with a flip animation.

---

## 6. Content

### 6.1 Crew (draft 4 of 8, all original characters)

| Crew | Trait |
|---|---|
| Ria — Botanist | Greenhouse output ×2; keeps Kamote happy |
| Dom — Engineer | Solar/repair tasks ×2; can fix broken items |
| Aiko — Medic | Treats Rad Sick (reduces dose effects) once per 3 days |
| Tunde — Geologist | Science walk ×2 |
| Mara — Comms Officer | Decodes the radio: shows the real forecast's issue time and predicted storm strength (Kp); +morale on good news |
| Iggy — Rover Pilot | Hops farther in the Scramble; salvage finds better items |
| Sol — Chef | Food packs feed 1.5 crew |
| Pip — Rookie | No trait at first; gains one random trait after surviving a storm |

- **Robot companion BOLT (optional scramble pickup):**
  - Can do EVA during storms (no dose) at half speed.
  - Uses power every shift.

### 6.2 Items (scramble pickups)

| Item | Slots | Use |
|---|---|---|
| Water brick | 2 | Drink (1 crew-day), or shield mass 3 |
| Food pack | 1 | Eat (1 crew-day), or shield mass 1 |
| Sun Watch radio | 1 | Enables forecasts, flare warnings, alerts |
| Dosimeter | 1 | Shows exact dose numbers; alarm at particle onset |
| Seed cartridge | 1 | Enables the greenhouse |
| Repair kit | 1 | Fixes one breakdown event |
| Med kit | 1 | Cures Rad Sick once |
| Battery pack | 1 | +power buffer |
| Guitar / board game | 1 | Morale item (reduces bad crew-mood events) |
| BOLT robot | 2 | See above |
| (NICE) Electron early-warning sensor | 1 | Uses REAL model lead times (DONKI "MODEL:" rows) to warn before some particle onsets |

### 6.3 Event deck (GAME events — no REAL stamp)
About 30 short, kid-safe, lightly funny events with 2 choices each. Examples:
- **Moon dust in the air filter:** spend power or morale.
- **Kamote sprouted!:** morale +.
- **Earthrise video call with family:** morale +, costs power.
- **Mystery beeping (it was the toaster).**
- **Crewmate's birthday:** share a food pack for morale?
- **Rover battery acting up:** repair kit or lose salvage.
- **Micrometeoroid ping on the greenhouse:** repair or lose a harvest.

Tone is kind, curious, lightly silly. Never cruel, never dark comedy.

### 6.4 Endings (collect them all)

| Ending | How you get it |
|---|---|
| Mission Complete | All crew home, healthy |
| Science Legend | All home + science ≥ target |
| Kamote Kingdom | Never did an EVA; survived anyway; the plant thrived |
| Early Ride Home | A crew member hit the dose limit → medevac |
| Lights Out | Power ran out → early evacuation |
| Snack Attack | Ate so much wall that a storm got in → medevac |
| Forecast Whisperer | Outguessed the model 3+ times + all home |
| Blind Luck | Won without the radio |
| Skeleton Crew | Only one crew member made it into the shelter, and still survived |
| Close Call | Survived a top-tier storm with a crew member outside |

### 6.5 Achievements (12)
Outguessed the Model · Trusted the Forecast · Blind Luck · Full House (all crew saved in the scramble) · Kamote Kingdom · Iron Wall (shield ≥ 90% during a storm) · Sun Streak (Daily Sun 7 days in a row) · Historian (5 historic storms) · Almanac 25% / 50% / 100% · Flight Director win

---

## 7. Replayability systems

1. **The real Sun as level generator.** A random real window since 2010 (it starts at a real flare→particle event and contains ≥1 CME forecast). Dates hidden.
2. **Real, varying countdowns:** every run's scramble timer is different.
3. **Procedural outpost layout** and item/crew spawns.
4. **Crew draft + traits** change strategy.
5. **Loadout decides information:** radio, dosimeter or electron sensor. Different runs feel different.
6. **Event deck** with branching choices.
7. **Collections:** Sun Almanac (a Pokédex of real solar storms), endings, achievements.
8. **Daily Sun:** a shared seed (same window, layout and crew pool for everyone) plus an emoji share grid.
9. **Live Sun:** when online, play the last 30 days of the real Sun; falls back to cache.
10. **Historic Storms:** curated real windows, unlocked after the first win.
11. **Seed codes:** replay a friend's exact run.

**Why a stranger comes back next week:**
- A new daily Sun.
- An unfinished Almanac.
- An ending they haven't seen.
- A friend's seed to beat.

---

## 8. Real vs. game layer (shown in-game in the "What's real?" panel)

| REAL (from NASA DONKI records) | GAME approximation (labeled) |
|---|---|
| Flare times and classes; particle onset times | How long particle levels stay high (decay curve by tier) |
| Scramble countdown = flare → onset gap | Dose "rad units" (relative severity; **never** mSv) |
| Official alert times (sometimes after onset) | Shield % from item mass (more mass = more shielding, simplified) |
| CME forecasts (issued, predicted) and actual arrivals | Food, water, power and science numbers |
| Hit / miss / false-alarm classification (±30 h window, CCMC convention) | Crew events, morale, salvage results |
| Flare-class → particle association rates (computed) | CME shock "second surge" size |
| Shelter built from supplies (Orion procedure) | Crew traits, robot |

**In-game labels:**
- Every REAL event shows a **REAL** stamp.
- Every GAME event has no stamp.

---

## 9. Data spec (DONKI → `public/data/episodes.json`)

**Source:** CCMC DONKI web services, no key needed.
- URL pattern: `https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR|SEP|CME|IPS|WSAEnlilSimulations|notifications}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- Fallback: `api.nasa.gov/DONKI/*` with a key (1,000 req/h).
- Query in 30-day chunks from 2010-01-01 to the present; cache raw responses.

### 9.1 Join rules
- **SEP events**
  - Drop rows whose instrument starts with `MODEL:` from *detections*. Keep them separately as model-lead data.
  - Group duplicate rows (per instrument/channel) into one event.
  - Onset = the earliest detection by a near-Earth instrument (GOES, SOHO, ACE). Ignore STEREO for Moon timing.
- **Countdown** = onset − the most recent linked FLR start (use `beginTime`; also store `peakTime`) before onset.
- **Alert lag** = the earliest `sentNotifications.messageIssueTime` − onset. It can be positive: the alert came after the particles.
- **Tier (relative severity, labeled):**
  - Tier 3 if a >100 MeV channel is detected.
  - Tier 2 if >10 MeV at GOES.
  - Tier 1 otherwise.
  - If a verified NOAA S-scale source is available, use it instead and document it.
- **CME forecasts** (from WSAEnlilSimulations with an Earth impact):
  - Issued = `modelCompletionTime`; predicted = `estimatedShockArrivalTime`.
  - Actual = the linked Earth IPS.
  - Keep the first run per CME and note later revisions.
  - Classify: **hit** if |error| ≤ 30 h (CCMC verification convention); **false alarm** if no arrival; **miss / surprise** = an Earth IPS with no prior forecast.
- **Flare → SEP association rate** by class (C/M/X) = share of flares of that class linked to an SEP event.
- **Playable window:** starts at an SEP event with a valid countdown, and the next 14 days contain ≥1 CME forecast (issued inside the window). Windows may overlap. Months are kept only for grouping and labels.
- **Sanity test:** 2024-05-11 flare 01:10Z → GOES >100 MeV onset 02:10Z → alert 02:30Z ⇒ countdown 60 min, alert lag +20 min.

**Pipeline clarification (October 8, 2026):** NASA moved the public API September 30. GitHub Actions transports verified official-source raw cache when local HTTPS fails. An actual linked arrival outside the 30-hour band is a timing `miss`, not a `false_alarm`. Missing times/errors/rates are `null`. Window IDs retain the SEP timestamp and suffix; showcase entries add `windowId` and `eventId`. Shared multi-CME simulations appear once, with input aliases/revisions in the audit. Statistics use the full archive; shipped records are the union needed by playable windows.

### 9.2 Schema (compact)
```json
{
  "meta": {"generated": "ISO", "source": "NASA/CCMC DONKI", "attribution": "...", "range": ["2010-01-01","..."]},
  "stats": {"cmeErrorHours": {"median": 0, "p25": 0, "p75": 0}, "flareSepRate": {"C": 0, "M": 0, "X": 0}},
  "flares": [{"id":"","begin":"","peak":"","class":"X1.5"}],
  "sepEvents": [{"id":"","onset":"","tier":1,"flareId":"","countdownMin":0,"alertTime":"","alertLagMin":0,"modelLeadMin":null,"instruments":[]}],
  "cmeForecasts": [{"id":"","cmeId":"","issued":"","predicted":"","actual":"","outcome":"hit|miss|false_alarm","errorH":0}],
  "surpriseArrivals": [{"id":"","time":""}],
  "windows": [{"id":"2012-03-07","sepId":"","start":"","end":"","refs":{"flares":[],"sepEvents":[],"cmeForecasts":[],"surpriseArrivals":[]}}],
  "showcase": [{"key":"","why":"biggest miss | near-perfect | false alarm | alert after onset | ..."}]
}
```

**Go / no-go:** ≥40 clean CME forecast→arrival pairs **and** ≥40 clean flare→SEP countdowns **and** ≥30 playable windows. If this fails, switch to the fallback concept.

---

## 10. Rules engine starting numbers (to be tuned by the balance simulator)

### 10.1 Starting values (`src/core/config.js`)
- **Time:** 2 shifts/day. Scramble seconds = real minutes, clamped to 15–90 (Cadet ×1.5).
- **Carry:** 4 slots. **Wall:** 8 slots.
- **Shield:** `shield = min(0.9, 1 − exp(−mass/8))`. Mass: water brick 3, food 1, other items 1.
- **Dose while outside, per shift of exposure:** tier 1 = 2, tier 2 = 5, tier 3 = 10. Inside: × (1 − shield).
- **Particle decay (game approximation):** elevated for tier 1 = 1 day, tier 2 = 2 days, tier 3 = 3 days, halving each shift after the peak shift.
- **CME arrival surge (game approximation):** tier 1 for 1 shift.
- **Crew dose:** ≥25 → Rad Sick (half output); ≥50 → medevac (Early Ride Home). Cadet ×1.5 thresholds.
- **Upkeep:** each crew eats 1 food and drinks 1 water per day. One missed day → Weak; two → medevac (Cadet: three).
- **Power:**
  - Base production 3/day; a solar-repair EVA restores degraded production.
  - Upkeep 1/day each for life support, the greenhouse, and the radio.
  - Power 0 for 2 shifts → Lights Out.
- **Production:**
  - Greenhouse EVA: +2 food every 2nd harvest shift (needs seeds).
  - Ice drill EVA: +1 water brick.
  - Science walk: +1–3 science.
- **Science target:** Commander 18 (Cadet 12, Flight Director 24).

### 10.2 Balance targets (the simulator must hit these on Commander)
- **AlwaysShelter:** survives ≥60% but reaches Science Legend <5%, so its average score is low.
- **NeverShelter:** fails (medevac) ≥70%.
- **TrustForecast** (shelter within the forecast band, recall on X-class flares): wins 45–65% and beats both extremes on score.
- **No single item** changes win rate by more than +25 percentage points. The radio should be the strongest but not mandatory (Blind Luck is reachable in ≥5% of good-play runs).
- **Variety:** ≥6 different endings appear in 1,000 runs.
- **Length:** median run 20–28 shifts. Scramble median 30–60 s.

---

## 11. Originality guardrails (inspired by, never copying, *60 Seconds!* / *60 Parsecs!*)

| Theirs | Ours |
|---|---|
| Fixed 60-second timer | **Variable real timer** from NASA records (15–90 s) |
| Atomic Age / Cold War retro look, dark comedy, nukes | **Cozy near-future lunar south pole**, kind humor, a real hazard (the Sun) |
| Carrying family members | **Tagged crew hop behind you in a line** |
| Death, permadeath, funerals | **No death**: medevac endings |
| Mostly random outcomes | **Real forecasts and warnings** give actionable information |
| Survival through daily event text choices | **Crew assignment board + wall/pantry shield grid + forecast timeline** |
| Soup cans, sock puppets, cockroaches, etc. | None of their items, names, jokes, UI layouts, fonts, sounds or music |

---

## 12. Tech architecture

- **Stack:** Vite + vanilla JavaScript (ES modules, no framework), Three.js (scramble only), HTML/CSS/SVG UI, Vitest (unit), Playwright or Claude in Chrome (end-to-end + screenshots), vite-plugin-pwa (offline).
- **Audio:** ZzFX/Web Audio (synthesized SFX) + CC0 or procedural music.
- **Data pipeline:** Python 3 (requests, pandas, matplotlib, pytest).

```
/data-pipeline/          Python: fetch_donki.py, build_episodes.py, tests/, REPORT.md (raw/ is gitignored)
/public/data/            episodes.json, showcase.json
/src/main.js             boot + screen state machine
/src/core/               PURE engine (no DOM/Three): api.js (public contract, §12.1), mock-run.js, rng.js, config.js, state.js, rules.js, dose.js, forecast.js, events.js, endings.js, reveal.js
/src/scenes/scramble/    logic.js (render-agnostic) + render3d.js (Three.js) [+ render2d.js fallback]
/src/ui/                 shelter/, reveal/, menus/, almanac/, components/, styles/
/src/audio/              sfx.js, music.js
/src/data/               loader.js, live.js (online DONKI → same transforms)
/src/i18n/               en.json, fil.json
/tools/balance.mjs       headless Monte Carlo balance simulator (imports src/core)
/tests/                  unit + e2e
/docs/                   DESIGN.md, DECISIONS.md, ART_DIRECTION.md, PLAYTEST.md, SUBMISSION.md
CLAUDE.md  CREDITS.md  README.md
```

**Budgets:**
- 60 fps on desktop; ≥30 fps on mid-range Android.
- Pixel ratio capped at 1.5.
- Total download <25 MB; 3D scene lazy-loaded.
- First interaction <3 s on 4G.
- Fully offline after the first load.

**Where it runs:** works locally or in a Claude Code cloud session on a GitHub repo. In the cloud, allow network access to `kauai.ccmc.gsfc.nasa.gov`, `api.nasa.gov` and any asset sites used (or commit raw DONKI JSON and generate assets procedurally), and use headless Playwright for browser checks.

**Determinism:** all randomness goes through the seeded RNG in `src/core/rng.js` (never `Math.random`). The same seed + inputs always produce the same run.

### 12.1 Engine API contract (`src/core/api.js`)
The UI and the Scramble talk to the engine only through these functions. Prompt 1 creates stubs that return realistic mock data; prompt 3 replaces them with the real engine. If the contract has to change, update this section first.

| Function | Returns / does |
|---|---|
| `createRun({ seed, difficulty, windowId?, crewIds, mode })` | New run state. `mode`: normal · daily · live · historic · judge |
| `getScrambleSetup(state)` | Real countdown (seconds, real minutes, clamp note), layout seed, item/crew spawn tables |
| `applyScrambleResult(state, result)` | Takes `ScrambleResult {itemsSaved[], crewSaved[], crewExposed[], timeLeft}` |
| `getShiftView(state)` | Everything the UI shows: day/shift, radio messages (REAL-stamped), forecast cards with bands, crew status, wall/pantry, shield %, power, food, water, science |
| `act(state, action)` | `assignCrew`, `moveItem` (wall↔pantry), `consume`, `useItem`, `recallAll`, `keepWorking`, `endShift` |
| `resolveShift(state)` | Event log. REAL events: `{source:"REAL", donkiId, utc}`. GAME events: `{source:"GAME"}` |
| `checkEnding(state)` | Ending id or null |
| `buildReveal(state)` | Real dates, 3-lane timeline data (player calls / NASA forecast / reality), stats, ending, approximations used |

---

## 13. Scope and build order (no deadline)

We build without a clock. Quality beats speed, but we still build in layers so the game is **playable at every step**, never half-finished everywhere.

**Layer 1: Core (playable end to end)**
- Shelter Days loop with real forecasts, the radio, wall = pantry, and real particle events.
- The 3D scramble with the real countdown, moon-hop physics and shadows.
- Ending + reveal timeline + "What's real?".
- Runs offline; deployed URL.

**Layer 2: Full game**
- Procedural layout, 8 crew with traits, BOLT, all 10 endings, achievements.
- Audio and music.
- Tutorial, menus, difficulty modes, accessibility, Filipino translation.
- 2D scramble fallback renderer for weak phones.

**Layer 3: Replay & reach**
- Sun Almanac, Daily Sun + share, seed codes, Historic Storms.
- Live Sun, electron early-warning sensor.
- Classroom mode, judge mode.
- Juice pass (animation, particles, feel).

**Layer 4: Optional extras**
- Android APK (Capacitor).
- Mars mode (MSL/RAD surface particle record).

**Rule:** never start a layer until the one below it is fully playable, tested and balanced. The real-data shelter loop is the heart and is never cut or faked.

---

## 14. Accessibility & localization
- Colorblind-safe palette + patterns + icons.
- Text size setting; reduced-motion mode.
- Full keyboard play; touch targets ≥44 px.
- Screen-reader labels on DOM UI.
- Captions for key sounds; nothing flashes faster than 3 Hz.
- Strings in `src/i18n/*.json`: English first, Filipino (NICE).

---

## 15. Judge demo path (`?judge=1`, about 3 minutes)
1. **Title (5 s)** → a scramble on a showcase event.
   - Prefer the 60-minute May 11, 2024 case if the pipeline confirms it and it starts a playable window.
   - Otherwise use the pipeline's best "alert after onset" showcase.
2. **One shelter day (60 s)** with a real CME forecast card → a class vote → resolve.
3. **Fast-forward** → reveal with the forecast-vs-reality timeline.
4. **"What's real?"** panel + a data-stats slide (counts, error distribution).

---

## 16. References (verified during research, Sept 26, 2026)
- CCMC DONKI web services & WSA-Enlil fields: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- DONKI SEP records, May 2024 (sanity case): https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31
- CME Scoreboard forecast error analysis (Riley et al.): https://arxiv.org/abs/1810.07289
- WSA-Enlil real-time verification (±30 h hit convention): https://arxiv.org/pdf/1801.07818
- Warning-time gap for Artemis Moon crews: https://www.astronomy.com/space-exploration/space-weather-forecasting-needs-an-upgrade-to-protect-future-artemis-astronauts/
- Shelter / all-clear decisions (MSL/RAD nowcasting): https://arxiv.org/pdf/2502.02469
- Orion radiation shelter from stowage bags: https://www.nasa.gov/missions/artemis/orion/scientists-and-engineers-evaluate-orion-radiation-protection-plan/ and https://www.nasa.gov/reference/crew-systems/
- Artemis II shelter procedure, gradual rise: https://science.nasa.gov/missions/artemis/artemis-2/to-protect-artemis-ii-astronauts-nasa-experts-keep-eyes-on-sun/
- 60 Parsecs! (inspiration and what not to copy): https://robotgentleman.com/presskit/60Parsecs.htm ; luck critique: https://www.cubed3.com/games/reviews/pc/60-parsecs
- Space Apps project submission guide (AI allowed; no NASA branding in generated content): https://www.spaceappschallenge.org/resources/project-submission-guide/
