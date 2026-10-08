# SHELTER CALL

## Project summary (10 lines)
1. SHELTER CALL is a replayable lunar-outpost browser game.
2. Primary players are ages 10–14; everyone can play.
3. The run has Scramble, Shelter Days, and Reveal phases.
4. Scramble uses Three.js with moon hops and a seeded layout.
5. Its timer comes from a verified flare-to-particle countdown.
6. Shelter Days uses accessible HTML, CSS, and SVG.
7. Food and water can be shelter walls, so consuming them costs shielding.
8. A saved radio relays verified NASA forecasts and warnings.
9. Reveal compares player choices, forecasts, and actual events.
10. Prompt 4 adds original art, audio, an offline gallery and install icons; full interactive gameplay arrives in prompts 5-7.

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

## Commands
- `npm install`: install locked project dependencies (CI uses `npm ci`).
- `npm run dev`: start Vite development server.
- `npm run build`: build offline assets into `dist/`.
- `npm run preview`: serve `dist/` locally.
- `npm test`: run Vitest unit tests.
- `npm run test:coverage`: enforce at least 90% statements, branches, functions and lines in real core code.
- `npm run e2e`: test the production build with Playwright; build first.
- `npm run sim`: run `node tools/balance.mjs` (headless Monte Carlo; see tools/balance-report.md).
- `npm run data`: run `python data-pipeline/run.py` (implemented in prompt 2).
- `npm run art`: regenerate original art and its manifest using committed fonts.
- `npm run art:check`: verify the full asset kit, hashes, models, contrast, glyphs and budget.
- `npm run lint`: run ESLint.
- `npm run format:check`: check formatting.
- `npm run format`: format project files.

## Conventions
- Use ES modules, vanilla JavaScript, no framework, small files, and JSDoc types.
- `src/core` is PURE: no DOM, no Three.js, no Math.random; use the seeded RNG.
- Core functions consume explicit state and input. No network, storage, timers, or current-clock reads in core.
- Preserve DESIGN §12.1 API exports. Prompt 1 mutators update and return state; views return detached snapshots.
- Never mark mock fixture events REAL. Real records must originate in `public/data/episodes.json`.
- Canonical specifications live in `docs/`; root source copies remain for the user's existing IDE tabs.
- Plan and complete each requested prompt autonomously. The user waived separate plan approval on October 9, 2026. Stop after that prompt and ask before starting the next prompt.

## Definition of done
For every task: it runs, tests pass, you checked it visually with headless Playwright screenshots at 1280×720 and 360×640, `docs/DECISIONS.md` is updated if you made a choice, and it is committed.
Never claim a complete game, real-data verification, balance, or physical-device acceptance from scaffold checks.

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


Rule: never start a layer until the one below is playable. Prompt 3 establishes headless rules; the full playable UI remains later work.

@docs/DESIGN.md
