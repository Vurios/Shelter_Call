# Prompt 10 overhaul progress

Status: **implemented, verified and deployed**. Prompts 1–10 are complete within the documented evidence limits. This is one authorized overhaul; no approval pause between milestones. See [verification and comparison](OVERHAUL_VERIFICATION.md) for evidence and explicit acceptance limits.

## Recoverable baseline

- Clean `main` at `8237f366668ecfd9a93a4d4f52d29ea512f54377`; all prior work is committed. No user edits were present. No branch/reset is used.
- Production: https://shelter-call.pages.dev/. Local production preview: port 4173.
- Stack/lock checked: vanilla ES modules, Vite 8.3.4, Three 0.186.1, existing pure seeded engine and verified archive. No framework migration.
- No applicable AGENTS.md or docs/CHALLENGE.md found. CLAUDE.md, canonical design/prompts, art direction, decisions, playtest, README, package/lock and pipeline report inspected.
- Delegated read-only scouts hit the account usage limit before producing evidence. Main agent continues directly.

## Milestones

1. **Complete:** 50 baseline browser tests passed in 8.8 minutes. Four viewport captures and a 25-second real-control recording passed with zero browser errors. Font readiness is awaited before capture. Evidence committed and pushed as `b3acf13`.
2. **Complete:** articulated crew, original 3D/illustrated habitat, crew strip, focused inspector and pure consequence previews. Four actual saved checkpoints rendered without errors/overflow. Wall previews, context loss, translated large text, interrupted-shift resume and offline entry passed.
3. **Complete:** coherent models, portraits, fallback sprites, title/draft/forecast/event/reveal/replay screens; graphics tiers, independent sound controls, science notes, localization and accessibility. Final inspection fixed dynamic Filipino labels and status/footer overlap at large text.
4. **Complete:** renderer checks passed 18/18 (4.7 minutes). Final shelter/overhaul selection passed 20/20 (1.3 minutes), then 6/6 after the status/footer fix. Four complete capture routes and a new 25-second recording passed. Exact baseline engine parity holds across 100 committed actions and both ending reveals. Final code commit `3f09709` passed CI: 95 unit tests, 23 pipeline tests and 56 browser tests (16.0 minutes), then deployed. Production Lighthouse scored 93 performance/100 accessibility with 2.963-second interaction. Real keyboard/touch routes at 1280×720 and 360×640 completed offline reloads and endings with zero browser errors; DONKI returned 181 JSON records.

## Commands and evidence

- `npm run build` and `npm run test:coverage` passed locally and in the final code CI run.
- `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` serves the built app.
- `npm run e2e > playwright-report/prompt10-baseline-tests.log 2>&1` — 50 passed in 8.8 minutes.
- `node tools/capture-submission.mjs http://127.0.0.1:4173 docs/overhaul/before 1280x720,1920x1080,360x640,390x844` — same fixed judge seed, real control route, persisted hatch checkpoints. Capture tool now accepts explicit sizes.
- Baseline images in `docs/overhaul/before/`; ignored external reference images in `playwright-report/reference/` are for inspection only and never game assets.
- Current unit/coverage gate passed: 95 tests; 99.71% statements, 99.08% branches, 100% functions, 99.83% lines. Includes current event costs and eight articulated-rig geometry/color/pose tests. Preview tests cover exact effects, no mutation/RNG, equipment gates, partial work and BOLT uncertainty.
- Current art check passed: 29 models, 33 portraits, 38 icons, six plant moods and ten endings; 2,764,404 bytes before the manifest. Actual indexed triangle counts now checked.
- Current lint/build passed. Initial broader browser run found removed PCFSoftShadowMap and tests reaching supplies without opening the new inspector. Shadow mode and actual test navigation fixed; that interrupted run is not a pass.
- Broader run then passed 48 and failed six scramble checks because crew art exceeded the unchanged 220-draw budget (419, then 221). Vertex colors now merge each static prop per finish and each crew per joint. The subsequent 18 renderer checks passed; no budget was relaxed. A three-context lifecycle test uses a 90-second test timeout for software GPU setup and passed in 12.6 seconds desktop / 14.2 seconds mobile.
- `tools/capture-overhaul.mjs` records the actual baseline saves after identical public planning actions. Four widths passed no overflow/warnings/errors; high-tier shelter: 84 draws including shadows, about 52,744 rendered triangles, 42 active geometries. Fallback, Filipino largest text and 200%-equivalent reflow captures are included. Actual physical/browser UI zoom is not inferred from reflow emulation.
- `npx playwright test tests/e2e/overhaul.spec.js tests/e2e/shelter.spec.js --project=desktop` — nine passed, log `playwright-report/prompt10-focused.log`.
- Production preview uses port 4173. The committed `tools/capture-overhaul.mjs` resumes actual baseline saves at four sizes, writes `docs/overhaul/after/room-*.png`, and records errors/overflow/renderer.
- Independent audio controls, persistent graphics tiers, illustrated scramble, smoother movement, title/draft artwork, gallery lighting/pose diagnostics, differentiated props/portraits and post-mission reflection/science copy are implemented. The complete local suite passed 56/56 in 8.9 minutes. CI for `2346190` passed 56/56 in 16.5 minutes. Final code CI [37996180837](https://github.com/Vurios/Shelter_Call/actions/runs/37996180837) passed all gates and deployed to [2207df45.shelter-call.pages.dev](https://2207df45.shelter-call.pages.dev). Production screenshots, route records and final Lighthouse results are committed under `docs/overhaul/`.

## Open evidence limits

- Exact entered Space Apps challenge/year is not recorded. User was asked for the official title/URL; do not guess eligibility or revise challenge claims without it.
- Human playtesting and representative physical Android frame rate are unavailable so far. Desktop Chrome/touch emulation are separate evidence.
- Linked YouTube trailers failed in the web reader. Official descriptions and screenshots were inspected; no video timing or internal-engine claims are made.
- Publication of code commit `3f09709` is verified. Final documentation/evidence updates contain no runtime changes; their push uses the same validation/deploy workflow.

## Second pass (October 23, 2026)

Requested: redo and improve the overhaul toward the room storytelling of 60 Seconds!/60 Parsecs!, and clear the VS Code Gradle notices. Baseline `237a82d` (clean `main`). No `src/core` change; mission v1, typed actions, RNG and survival configuration unchanged.

1. **Complete:** Capacitor CLI aligned to 8.5.3 (`cap doctor` clean, `cap sync android`, `gradlew assembleDebug` succeeded with JDK 21). `.vscode/settings.json` makes the Java extension apply Gradle changes automatically.
2. **Complete:** diorama-first shelter (`68d97be`): habitat module, pod wrapped by eight pockets, crew sitting/walking/expressions, scene hotspots pressing DOM controls, full-viewport desktop layout, shift report and time-passing dim.
3. **Complete:** staged scramble (pallets, gear at modules, crew at workplaces, closer follow camera, carried pack, off-screen crew arrows); regenerated crew GLBs with expressions.
4. **Complete:** title diorama, 2D pallets, matching illustrated shelter, tick-caption fix, readable draft cards.
5. **Evidence (local, Windows 11, Chrome headless via Playwright, GPU on):**
   - `npm run lint`, `npm run format:check`: pass. `npm test`: 95/95. `npm run test:coverage`: 99.71% statements, 99.08% branches, 100% functions, 99.83% lines.
   - `npm run build`: pass, 173 precache entries (4,560.63 KiB). `npm run art:check`: pass, 29 models, 3,034,212 bytes, minimum contrast 5.61.
   - `npm run e2e`: first full run 52/56; four failures were real regressions from the title diorama (one decorative loop on the title; a WebGL renderer error when WebGL is blocked). Fixed with a WebGL probe and a lifecycle assertion that still forbids leaked shelter canvases/loops. Rerun: 56/56 in 10.0 minutes; shelter/overhaul subset 20/20 after the caption move.
   - `node tools/verify-overhaul-parity.mjs`: `docs/overhaul/parity.json` regenerated byte-identical (27- and 73-action transcripts, same final hashes), so engine results are unchanged.
   - `node tools/capture-pass2.mjs http://127.0.0.1:4173 docs/overhaul/pass2`: room and shift report at 1280×720, 1920×1080, 360×640, 390×844; title, illustrated shelter and 3D/2D scramble at 1280×720 and 360×640. Zero console/network errors and no horizontal overflow. Shelter high tier: 152–236 draw calls including shadows (wide framing about 204–236), 47,512–65,642 triangles.
   - Scramble capacity bot (headless, 40 seeds per difficulty) and gear-first reachability are recorded in DECISIONS.md. Bot evidence is not human pacing.
   - Not measured this pass: Lighthouse, physical Android frame rate, human playtests.
