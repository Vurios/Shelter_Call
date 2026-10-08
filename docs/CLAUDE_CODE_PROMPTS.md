# SHELTER CALL — Claude Code Build Playbook (v2, no deadline)

Nine build prompts and three helper prompts. Copy each one into Claude Code, in order, whenever you're ready. There's no clock: take as long as each step needs and play the game between steps.

---

## Before you start

**Setup (once)**
1. Create a GitHub repo with a README, then add `docs/DESIGN.md` and this file at `docs/CLAUDE_CODE_PROMPTS.md`. Commit.
2. Optional: paste the official challenge statement into `docs/CHALLENGE.md`.
3. **Cloud session?** In the environment settings, allow network access to `kauai.ccmc.gsfc.nasa.gov` and `api.nasa.gov` (needed for prompt 2), plus any asset sites you want Claude to use. Add `NASA_API_KEY` as an environment variable, never in the repo.
4. **Hackathon rules:** if this becomes your Space Apps entry, check whether code written before Nov 14 is allowed. This playbook doesn't assume either way.

**How to run each prompt**
- One prompt = one fresh session (or `/clear`). `CLAUDE.md` + `docs/DESIGN.md` carry everything Claude needs.
- Prompts marked 🧭 are big: start in **plan mode**, read the plan, approve, then let it run.
- After each prompt: commit and push directly to main, verify Cloudflare Pages, play for a few minutes, and send problems with **H1 (bug)**.
- If a session stops midway (cloud time limits), use **H3 (continue)**.
- Each prompt only depends on the ones before it. Don't skip ahead.

**Build order → DESIGN §13 layers**

| # | Prompt | Layer |
|---|---|---|
| 1 | Setup, CLAUDE.md, engine stubs | — |
| 2 | Real NASA data pipeline (+ go/no-go) | 1 |
| 3 | Game engine + balance simulator 🧭 | 1 |
| 4 | Art, audio and style 🧭 | 1–2 |
| 5 | Scramble (3D) 🧭 | 1 |
| 6 | Shelter Days UI 🧭 | 1 |
| 7 | Full game loop, reveal, menus, tutorial, accessibility 🧭 | 1–2 → **first full game** |
| 8 | Replay systems + juice pass 🧭 | 3 |
| 9 | Playtest, balance, ship, judge kit 🧭 | 3–4 |

Optional before prompt 1: **P0 paper prototype** (bottom of this file) to test the fun with kids before coding.

---

## 1 — Setup + CLAUDE.md + engine stubs

```text
Read docs/DESIGN.md completely (and docs/CHALLENGE.md if it exists).

STEP 0: If CHALLENGE.md exists, list any requirement DESIGN.md doesn't cover and propose the smallest changes. Wait for my OK before editing DESIGN.md.

STEP 1: Create CLAUDE.md at the repo root containing:
- a 10-line project summary
- the AUTHORIZATION & RULES block below (verbatim)
- the tech stack and folder structure from DESIGN §12
- commands: dev, build, preview, test, e2e, sim, data
- conventions: ES modules, no framework, small files, JSDoc types; src/core is PURE (no DOM, no Three.js, no Math.random; use the seeded RNG)
- "Definition of done" for every task: it runs, tests pass, you checked it visually with headless Playwright screenshots at 1280×720 and 360×640, DECISIONS.md is updated if you made a choice, and it's committed
- the build layers from DESIGN §13 and the rule "never start a layer until the one below is playable"
- an import line: @docs/DESIGN.md

STEP 2: Scaffold Vite + vanilla JS. Add three, vitest, @playwright/test, vite-plugin-pwa, and a light ESLint + Prettier setup. Create the folders from DESIGN §12. Add npm scripts: dev, build, preview, test, e2e, sim (node tools/balance.mjs), data (runs the Python pipeline). Add data-pipeline/requirements.txt. If running in a cloud container where a Chromium is preinstalled, configure Playwright to use it rather than downloading browsers.

STEP 3: Create docs/DECISIONS.md (short decision log), CREDITS.md (table: asset | source URL | license | author | where used), and a README stub.

STEP 4: Create src/core/api.js implementing the contract in DESIGN §12.1 as STUBS with JSDoc typedefs, backed by a fixture in src/core/mock-run.js (a fake 12-day window with 2 flares, 1 CME forecast, 1 particle event, 4 crew, 6 items). Later prompts build UI against these until the real engine replaces them.

STEP 5: A placeholder title screen "SHELTER CALL", one passing unit test, one e2e test that loads the page and saves a screenshot. Set up a GitHub Action using cloudflare/wrangler-action that deploys every push to main to Cloudflare Pages (project shelter-call, output dist, root path). Work directly on main: no branches or PRs. Read CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID only from environment variables; store them as repository secrets, never in files. .gitignore: node_modules, dist, data-pipeline/raw (unless we choose to commit raw data; see prompt 2). Commit.

===== AUTHORIZATION & RULES (copy verbatim into CLAUDE.md) =====
AUTONOMY
- You may install any npm or pip packages, clone or vendor GitHub repositories, and download asset packs (3D models, sprites, textures, fonts, sound effects, music).
- You may use any installed skills, plugins, MCP servers, subagents, and browser tools that help.
- You may use any animation, tweening, particle, shader, audio, or game-helper libraries you judge useful (license rules below still apply).
- You may create original art yourself (SVG, canvas, shaders, procedural geometry and textures) and original audio yourself (Web Audio / ZzFX synthesis, Tone.js, procedural music).
- Decide the specifics yourself; log non-obvious choices in docs/DECISIONS.md. Prefer the simplest thing that is fun and works. There is no deadline: choose quality over speed, but keep the game playable after every step.
- If a website is blocked by the network (e.g., in a cloud session), say which domain, then use an allowed alternative (GitHub-hosted assets, or make it procedurally) instead of stopping.
LICENSES
- Prefer CC0 / MIT / SIL OFL. CC-BY is fine with attribution. Never use NC, ND, or unknown-license material.
- Every third-party file gets a row in CREDITS.md (URL + license + author).
HARD RULES
- NEVER use NASA logos, the "meatball" or "worm", any agency insignia, mission patches, or real astronaut likenesses, in files or in generated art. NASA data and public-domain NASA imagery are fine with credit.
- Do not copy anything from 60 Seconds!, 60 Parsecs!, or any commercial game: no art, names, text, UI layouts, jokes, sounds or music. They are inspiration only (DESIGN §11).
- Never invent science. Real data comes only from public/data/episodes.json. Anything simulated is a GAME approximation: label it in code comments and in the in-game "What's real?" panel (DESIGN §8).
- Audience: ages 10–14 first, playable by everyone. No death, no gore, no scary imagery. ~Grade 5 reading level. Every action works with touch, mouse, and keyboard.
- The built game must run fully offline from dist/ (no runtime CDN calls). Live data is an optional enhancement with a cached fallback.
- Keep the build green. Commit after each working step with a clear message.
================================================================
```

---

## 2 — Real NASA data pipeline (+ go/no-go)

```text
Follow CLAUDE.md. Build the data pipeline in data-pipeline/ (Python 3) that produces public/data/episodes.json exactly per DESIGN §9 (schema + join rules). Install any Python packages you need; use subagents if helpful.

Fetch (fetch_donki.py):
- CCMC no-key endpoints: https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/{FLR,SEP,CME,IPS,WSAEnlilSimulations,notifications}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
- 30-day chunks from 2010-01-01 to today, ~1 s delay, retry with backoff, raw cache in data-pipeline/raw/.
- Fallback: https://api.nasa.gov/DONKI/... with env var NASA_API_KEY.
- If both are blocked by the network, stop and tell me exactly which domains to allow. If I then put raw JSON files in data-pipeline/raw/, build from those.

Build (build_episodes.py), applying DESIGN §9.1. Known quirks (verified on May 2024 records):
- SEP rows whose instrument starts with "MODEL:" (e.g., REleASE) are PREDICTIONS. Keep them separately as model-lead data, never as detections.
- One physical event appears once per instrument/energy channel: group into events. Onset = earliest near-Earth detection (GOES, SOHO, ACE); ignore STEREO.
- One SEP can link to many flares/CMEs: countdown = onset − start of the MOST RECENT linked flare before onset (store peak time too).
- Alert lag = earliest sentNotifications.messageIssueTime − onset (can be positive).
- CME forecasts from WSAEnlilSimulations with an Earth impact: issued = modelCompletionTime, predicted = estimatedShockArrivalTime, actual = linked Earth IPS. HIT if |error| ≤ 30 h; FALSE ALARM if no arrival; SURPRISE = Earth IPS with no prior forecast. Keep the first run per CME; note revisions.
- Flare-class (C/M/X) → SEP association rates.
- Playable windows (DESIGN §9.1) and showcase picks: biggest miss, near-perfect hit, false alarm, shortest/longest countdown, alert-after-onset cases, best judge window, best historic storms.

Outputs:
- public/data/episodes.json (minified, < 1.5 MB) and public/data/showcase.json (each entry with a one-line "why").
- data-pipeline/REPORT.md: counts per year; histograms (PNG in data-pipeline/report/) of countdown minutes, alert lag, forecast error; events per typical 12-day window (median/min/max); showcase list; every assumption and data problem; a plain-language "How we use NASA data" section for the README; and the GO/NO-GO line (≥40 clean CME pairs, ≥40 clean countdowns, ≥30 playable windows).
- pytest tests, including the must-pass case: flare 2024-05-11 01:10Z → >100 MeV onset 02:10Z → alert 02:30Z ⇒ countdown 60 min, alert lag +20 min.
- `npm run data` runs everything.

Run it end to end and print the summary and GO/NO-GO line. If NO-GO, stop and tell me before doing anything else.
```

---

## 3 — Game engine + balance simulator 🧭

```text
Follow CLAUDE.md. Replace the stubs in src/core/api.js with the real, PURE engine, keeping the exact contract in DESIGN §12.1. If the contract truly must change, update DESIGN §12.1 and src/core/mock-run.js in the same commit and tell me.

PART A — Rules (DESIGN §5, §6, §8, §10):
- Load public/data/episodes.json; createRun picks a random playable window (or the given windowId).
- Implement: the real scramble countdown with clamp info; two shifts per day; radio + forecast cards with bands; wall = pantry (consuming a wall item lowers the shield immediately); blind mode without the radio; dosimeter; the flare interrupt using the real flare-class→SEP rates; "all clear" decay; dose, upkeep, power, production; crew traits; BOLT; difficulty multipliers; all 10 endings; achievements tracking; buildReveal.
- Write ~30 kind, funny, kid-safe GAME events with two choices each in src/core/events.js.
- Every tunable number lives in src/core/config.js with DESIGN §10.1 starting values.
- Vitest (≥90% coverage of src/core): same seed + same actions ⇒ identical run; the May 11, 2024 window loads with a 60-min countdown; dose and shield math; eating from the wall lowers the shield; blind mode hides forecasts; every ending reachable; every REAL event id exists in episodes.json.

PART B — Balance simulator (tools/balance.mjs):
- Headless Monte Carlo over src/core, 5,000 runs per difficulty, bots: AlwaysShelter, NeverShelter, TrustForecast (shelter inside the forecast band, recall on X-class flares), Cautious (recall on any M/X flare), Greedy (max EVA), Random; plus loadout variations (with/without each item).
- tools/balance-report.md: win rate, ending distribution, median run length, science, dose, per-item win-rate delta, ending variety.
- Tune ONLY game-layer numbers in config.js until DESIGN §10.2 targets are met on Commander, with Cadet clearly easier and Flight Director clearly harder. Before/after tables; reasons in DECISIONS.md. `npm run sim` reproduces the report.
```

---

## 4 — Art, audio and style 🧭

```text
Follow CLAUDE.md. You own the look and sound of the game (DESIGN §4, §11). Download suitably licensed packs, clone repos, or make assets yourself — decide what's best for quality.

ART
1. docs/ART_DIRECTION.md: palette tokens (colorblind-safe; danger/dose always pair color with an icon or pattern); typography (handwriting font for journal headings + very readable UI font with Filipino support); icon style; 3D style (low-poly, flat-shaded lunar south pole, low raking sun, long black shadows, cold regolith vs warm amber habitat lights); 8 crew designs with distinct suit color AND shape accent, chunky helmets; BOLT the robot; Kamote the sweet-potato plant (6 moods); journal page style (graph paper, tape, stickers, doodles); ending-card and Almanac-card templates.
2. Produce: 3D models as optimized glTF (downloaded CC0 kits or procedural Three.js geometry); SVG icon sprite (items, tasks, stats, tiers, REAL stamp); crew portraits + moods (SVG); 10 ending illustrations + Almanac frame (SVG); journal textures; favicon and app icon (original, no NASA insignia). Asset payload < 15 MB.

AUDIO (DESIGN §4.2)
3. For each sound decide: synthesize (ZzFX / Web Audio / Tone.js) or CC0 file.
   - SFX: hop, land, pickup, deposit, crew tag (a unique chirp per crew member), hatch, accelerating timer ticks, alarm, particle-storm whoosh, radio static/beeps, REAL stamp thunk, page flip, drag/drop, taps, ending jingles (triumphant / bittersweet / silly).
   - Music: 3 crossfading loops — calm title theme; scramble tension whose tempo rises with the timer; shelter ambience that thins as the shield drops.
   - Sonification: flare class sets alarm pitch/intensity.
   - src/audio/ with volume settings (master/music/SFX/mute), start on first input, captions for key sounds.

CHECK
4. A gallery at /?gallery=1 showing every model (rotating), icon, portrait, color token, font, and a button for every sound. Screenshot it at desktop and mobile sizes; fix anything off-style, unreadable, or too loud on phone speakers.
5. Every third-party file in CREDITS.md. Commit.
```

---

## 5 — Scramble (3D) 🧭

```text
Follow CLAUDE.md. Build the Scramble per DESIGN §5.2 in src/scenes/scramble: game logic in logic.js (render-agnostic, uses core RNG/config), Three.js rendering in render3d.js. Use src/core/api.js (getScrambleSetup, applyScrambleResult) and the assets from prompt 4. Pull in any helper libraries, shaders, or reference repos you find useful.

- Orthographic isometric camera with gentle follow; ONE low sun as a directional light with long real-time shadows; soft ambient fill; subtle starfield.
- Procedural outpost from the seed: hatch at center; greenhouse, solar field, ice drill, lander, rover bay, lab on a ring with random rotation/offset; instanced rocks and craters; item and crew spawns from config.
- Moon-hop controller: 1/6 g arcs, momentum, slight overshoot, landing dust, drop shadow that scales with height. Controls: tap/click-to-hop toward a point, WASD/arrows, optional gamepad.
- Carry 4 slots (water brick = 2) with a slot HUD; walk over to pick up; reach the hatch to deposit (pop + icon flies to the shelter counter).
- Crew: bump to tag; tagged crew hop behind you in a line (slight slowdown); reaching the hatch saves them with a little celebration.
- REAL timer: HUD shows "REAL: 60 min → YOU: 60 s" plus the clamp note if clamped. Last 10 s: alarm, red vignette, shimmer. At 0: particle-storm VFX; anything outside is exposed.
- Emit ScrambleResult to applyScrambleResult.
- Performance: 60 fps desktop, ≥30 fps on a mid-range Android profile; pixel ratio ≤1.5; instancing; dispose on exit; lazy-load the scene.
- Build render2d.js (top-down canvas, same logic.js) as the fallback; auto-offer "Switch to 2D mode?" if fps < 25 for 3 s, and a toggle in settings.

Verify: play 3 scrambles with different seeds at 1280×720 and 360×640 portrait in headless Playwright, capture screenshots, and fix readability, control and camera problems before finishing.
```

---

## 6 — Shelter Days UI 🧭

```text
Follow CLAUDE.md. Build Shelter Days per DESIGN §5.3 as HTML/CSS/SVG in src/ui/shelter, driven only by getShiftView / act / resolveShift. Use the art from prompt 4. Use any small UI/animation libraries you like, or none.

- Journal page per day (CSS 3D page flip; "Day 4 · AM/PM"; no real dates), handwritten heading, stickers.
- Radio panel (only if the radio was saved): REAL-stamped messages; flare class badges (icon + text); CME forecast card as a horizontal timeline with the predicted arrival and ± band (hidden on Flight Director), counting down in shifts; static/beep feel.
- Crew board: 4 crew cards (portrait with mood, trait icon, dose meter with icon thresholds, hunger/thirst, status tags). Assign by drag OR tap-then-tap to IN SHELTER or an EVA task (Greenhouse, Solar repair, Ice drill, Salvage, Science walk). BOLT card if saved.
- Wall & pantry: 8 wall slots around the crew pod + a pantry shelf; drag/tap to move; live SHIELD % gauge. Eating or drinking a wall item visibly opens a gap and drops the gauge — the core lesson, so make it obvious and a little funny.
- Status bar: food, water, power, science, days until resupply.
- Shift resolution: a doodle panel animation + 1–3 short log lines; REAL events show the stamp with DONKI id + UTC time in a tooltip; dose ticks animate.
- Flare interrupt ("Rush Back"): full-screen RECALL NOW vs KEEP WORKING, with the flare class and the real flare-class→particle rate in kid language.
- Blind mode: a friendly "No radio… you're on your own!" state.

Quality bar: touch targets ≥44 px; works at 360×640 portrait and 1280×720; icons + text everywhere; keyboard operable; ARIA labels.

Verify: click through 3 full days on both sizes in headless Playwright; fix layout and clarity issues. Add an e2e test that plays 2 days through the UI.
```

---

## 7 — Full game loop, reveal, menus, tutorial, accessibility 🧭

```text
Follow CLAUDE.md. Turn the pieces into a complete game anyone can learn in under 60 seconds.

FLOW: Title → Crew Draft (pick 4 of 8; auto on Cadet) → Briefing (15 s, skippable; one rule: "the Sun is real") → Scramble → Shelter Days → Ending → Reveal → Almanac unlock → Play Again (one tap, new seed). Save run state every shift so a reload resumes.

REVEAL (DESIGN §5.4): big date-reveal animation; one scrubbable SVG timeline with 3 lanes (YOUR CALLS / NASA FORECAST / WHAT HAPPENED) highlighting forecast misses and where the player beat it or got caught; stats; ending card with art and epilogue; an expandable "What's real?" panel listing every REAL event (DONKI id + UTC) and every GAME approximation used. All 10 endings with art. Save endings/achievements in localStorage, wrapped in try/catch (the game must work if storage is blocked).

MENUS & SETTINGS: Play, Daily Sun (placeholder until prompt 8), Sun Almanac (placeholder), Endings, How It Works (5 illustrated panels on real space weather and the Orion shelter procedure, from DESIGN §1 and §16 only), Settings, Credits.

DIFFICULTY: Cadet (age 8+: ×1.5 timers, generous supplies, highlighted forecast band), Commander (default), Flight Director (no band, tighter supplies).

TUTORIAL (woven into play, skippable, replayable): a 25-second practice scramble with arrows and one-line coach bubbles, then Day 1 with 3 coach tooltips (assign crew, move a wall item, read a forecast).

ACCESSIBILITY & LANGUAGE: colorblind-safe palette + patterns, text-size setting, reduced motion, full keyboard play, focus outlines, ARIA labels, sound captions, nothing flashing faster than 3 Hz. All strings in src/i18n/en.json + natural, kid-friendly Filipino in fil.json, switchable in Settings.

ACCEPTANCE: 3 different complete runs with no dead ends or console errors; an e2e test plays a fixed-seed run from title to reveal; works offline after first load (build → preview → offline); checked with reduced motion, keyboard only, and at mobile size. Tell me the deployed Cloudflare Pages URL so I can play it on my phone.
```

---

## 8 — Replay systems + juice pass 🧭

```text
Follow CLAUDE.md. Make people come back tomorrow (DESIGN §7), then make every action feel great.

REPLAY
- Daily Sun: seed = UTC date → same window, layout and crew pool for everyone; one scored attempt per day; Share button with an emoji result grid + seed code (clipboard + Web Share API).
- Seed codes: enter a friend's code to replay their exact run.
- Sun Almanac: every REAL event encountered becomes a collectible card (type, class, real date, forecast vs actual, one fact TEMPLATED FROM DATA FIELDS ONLY), rarity by tier, grid with progress %, flip animation.
- 12 achievements (DESIGN §6.5) with toasts.
- Historic Storms: unlocked after the first win; curated windows from showcase.json, each with a short intro (dates shown up front in this mode).
- Live Sun: browser-fetch the last 30 days from CCMC DONKI, run the same transforms (port the minimal join logic from Python to src/data/live.js with tests), label it "LIVE"; silently fall back to cache if offline or if nothing happened recently (one friendly line explains why).
- Electron early-warning sensor item using the real MODEL lead times (DESIGN §6.2).
- Classroom mode: large text, auto-pause on every forecast card with a "CLASS VOTE: shelter or keep working?" overlay, 3 discussion questions on the reveal.
- Tests for daily-seed determinism, seed codes, and Live Sun transforms.

JUICE (no rule changes; respect reduced motion)
- hop squash/stretch + dust; pickup pop with icon flying to its slot; crew-tag sparkle + name bubble; timer pulse; storm shockwave + regolith glitter; hatch slam; REAL stamp thunk; page flip; shield gauge glow and crack when it drops; dose meter jitter; forecast band "breathing"; ending card deal-in; Almanac holo shimmer; button hover/press states; iris-wipe transitions; optional haptics on mobile.
- Before/after screenshots of a scramble and a shelter day; list changes in DECISIONS.md.

Finally rerun `npm run sim` and confirm DESIGN §10.2 balance still holds; retune if not.
```

---

## 9 — Playtest, balance, ship, judge kit 🧭

```text
Follow CLAUDE.md. Polish and ship. No new features in this prompt — only clarity, fun, bugs, performance and presentation.

PLAYTEST & BALANCE
1. Rerun `npm run sim`; retune config.js to DESIGN §10.2; update tools/balance-report.md.
2. Play 5 complete runs (Cadet, Commander ×3, Flight Director; different seeds) via headless Playwright. Log every moment of confusion, dead time or unclear consequence in docs/PLAYTEST.md.
3. Merge in the human playtest notes below and fix the top 10 issues. Targets: a Commander run takes 8–12 minutes; each shift decision takes under ~20 s.
4. Zero console errors/warnings; all unit + e2e tests pass.

SHIP
5. Lighthouse (mobile): Performance ≥85, first interaction <3 s on simulated 4G. Lazy-load the 3D scene, code-split, compress models/textures, preload fonts.
6. PWA: installable; precache everything incl. episodes.json; full run works offline.
7. Confirm the Cloudflare Pages deploy works at phone size and give me the URL.
8. OPTIONAL: Capacitor Android debug APK in /release (back-button handling); abandon if blocked for more than 30 minutes.

JUDGE KIT
9. Judge mode (?judge=1): skip the tutorial; fixed seed on the best judge window from showcase.json (prefer the May 11, 2024 60-minute case if it starts a playable window); ~3-minute guided path with callouts naming the real data at each step; "What's real?" open by default; closing slide with data stats from data-pipeline/REPORT.md.
10. README.md: what it is, how to play, how NASA data is used (plain language), sources + attribution, the game-approximation list, CREDITS link, build instructions, team, AI-tools disclosure.
11. docs/SUBMISSION.md: drafts for every Space Apps project-page field; a 30-second video script + shot list; a 90-second live pitch with the class-vote moment; 7 screenshot captions. Capture desktop + mobile screenshots and a 20–30 s gameplay clip (scramble → forecast card → reveal).
12. Verify every factual claim in README/SUBMISSION against data-pipeline/REPORT.md or DESIGN §16; mark anything unverifiable as UNVERIFIED.

Human playtest notes:
[PASTE NOTES FROM KIDS / CLASSMATES / FAMILY HERE, or write "none yet"]
```

---

# HELPER PROMPTS (use any time)

## H1 — Bug report

```text
Follow CLAUDE.md.
BUG: [what happened]
EXPECTED: [what should happen]
STEPS: [1, 2, 3]
DEVICE/BROWSER: [...]
SEED/CODE: [...]
[attach screenshot]
First reproduce it with a failing unit or e2e test, then fix the root cause, then show the test passing. Don't change unrelated code.
```

## H2 — Make it more fun (after prompt 7; use as often as you like)

```text
Follow CLAUDE.md. Play 3 runs as a 12-year-old would. Name the 3 most boring moments and the 3 most exciting ones. Propose 5 small changes (no new systems) that make boring moments tense or funny and make exciting moments happen more often. Wait for my pick, implement the chosen ones, then rerun `npm run sim` to confirm DESIGN §10.2 still holds.
```

## H3 — Continue an unfinished prompt

```text
Follow CLAUDE.md. The previous session stopped partway through prompt [N] of docs/CLAUDE_CODE_PROMPTS.md. Read that prompt, the git log, and docs/DECISIONS.md, list what's done and what's left, then finish the rest. Don't redo finished work.
```

---

# OPTIONAL — P0 paper prototype (before prompt 1)

```text
Using docs/DESIGN.md (sections 5, 6, 8 and 10), make a printable A4 black-and-white PDF paper prototype of Shelter Call's "Shelter Days" phase to playtest with 10–14-year-olds before coding. Install any PDF/graphics tools you need.

Include: 1-page rules at a Grade-5 reading level; 8 crew cards; item tokens; a wall/pantry board with 8 wall slots; 12 two-shift day sheets; ~30 GAME event cards; 10 forecast/flare cards (if data-pipeline/REPORT.md exists, build them from its showcase events with the real date on the back; otherwise mark them SAMPLE); a dose tracker; and a 1-page facilitator guide with 5 questions to ask after each game ("When did you decide to hide? Why?").
```
