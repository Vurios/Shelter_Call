# Prompt 10 overhaul progress

Status: **in progress**. Prompts 1–9 are complete. This is one authorized overhaul; no approval pause between milestones.

## Recoverable baseline

- Clean `main` at `8237f366668ecfd9a93a4d4f52d29ea512f54377`; all prior work is committed. No user edits were present. No branch/reset is used.
- Production: https://shelter-call.pages.dev/. Local production preview: port 4173.
- Stack/lock checked: vanilla ES modules, Vite 8.3.4, Three 0.186.1, existing pure seeded engine and verified archive. No framework migration.
- No applicable AGENTS.md or docs/CHALLENGE.md found. CLAUDE.md, canonical design/prompts, art direction, decisions, playtest, README, package/lock and pipeline report inspected.
- Delegated read-only scouts hit the account usage limit before producing evidence. Main agent continues directly.

## Milestones

1. **Current:** baseline journeys/captures, source/reference study and audit. Baseline browser suite is running. The first 1280×720 capture completed its route but recorded font-preload warnings during concurrent browser work; retain that finding and repeat capture after the suite finishes.
2. Upgraded articulated crew and original habitat; living shelter + inspector + known-cost previews. Compare the same archived judge checkpoint.
3. Propagate coherent models, portraits, fallback sprites, title/draft/forecast/event/reveal/replay screens; graphics tiers, sound controls, localization and accessibility.
4. Complete journeys, invariants, offline/resume/context-loss/lifecycle tests; measured browser performance and before/after evidence; deploy and verify production.

## Commands and evidence

- `npm run build`; `npm run test:coverage` invoked for baseline; record final output before treating either as verified.
- `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` serves the built app.
- `npm run e2e > playwright-report/prompt10-baseline-tests.log 2>&1` — running, not yet a complete result.
- `node tools/capture-submission.mjs http://127.0.0.1:4173 docs/overhaul/before 1280x720,1920x1080,360x640,390x844` — same fixed judge seed, real control route, persisted hatch checkpoints. Capture tool now accepts explicit sizes.
- Baseline images in `docs/overhaul/before/`; ignored external reference images in `playwright-report/reference/` are for inspection only and never game assets.

## Open evidence limits

- Exact entered Space Apps challenge/year is not recorded. User was asked for the official title/URL; do not guess eligibility or revise challenge claims without it.
- Human playtesting and representative physical Android frame rate are unavailable so far. Desktop Chrome/touch emulation are separate evidence.
- Linked YouTube trailers failed in the web reader. Official descriptions and screenshots were inspected; no video timing or internal-engine claims are made.
- Do not report the overhaul complete until the implemented living shelter, remaining screen/asset pass and final gates are done.
