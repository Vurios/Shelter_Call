# Prompt 3 implementation plan

Status: approved by the user on October 8, 2026. Implementation and local validation complete. Deployment checks are tracked in the repository Pages workflow.

## Result

Replace the mock engine with a deterministic, headless game driven by the verified NASA episode archive. Produce a reproducible balance report that checks every DESIGN §10.2 target. The existing preview must continue to run through the same public API. Stop after prompt 3, before art and audio work.

## Evidence checked

- The public archive has 74 playable windows. The verified May 11, 2024 window has a 60-minute countdown and a +20-minute alert lag.
- Uniform window selection with the starting 15–90 second clamp gives a 90-second Commander median. Of 74 windows, 63 reach the 90-second cap; only six have timers at most 60 seconds. This conflicts with the 30–60 second median target if the starting cap is left unchanged.
- The first-forecast records currently contain issue, predicted, actual, outcome and error fields, but no Kp fields. Mara's specified forecast-strength trait needs real source fields; it cannot invent a number.
- The public action list has no way to choose between the two options on a GAME event. This needs a small contract clarification.
- The current core has eight API exports and a seeded RNG. Preserve those exports and the synchronous call shape.

## 1. Establish deterministic state and data access

- Use the verified episodes as immutable input. Keep fetching, storage, DOM and Three.js outside core.
- Separate configuration, state creation, inventory, dose, forecast processing, events, endings and reveal logic into small modules.
- Store RNG state and timeline progress as serializable values. Same seed and actions must produce the same results, including after a save/restore boundary.
- Keep API mutators updating and returning supplied state. Return detached, information-filtered views.
- Validate actions and scramble result IDs, duplicate pickups, crew partitions and phase transitions before changing state.
- Select all 74 windows uniformly by default. Explicit window selection and the judge showcase remain reproducible.

## 2. Implement the complete headless run

- Derive scramble minutes from the selected real SEP record. Show the original minutes, game seconds and a clear clamp note. Use seeded crew/item spawn tables.
- Support eight crew, a four-person draft, item instances, exposed crew, BOLT, three difficulty modes and 10/12/14-day runs.
- Process real records in chronological order, including boundary-crossing forecasts, flare interrupts, particle onsets, attached alerts and actual shocks. Preserve source IDs and UTC timestamps.
- Align AM/PM to the hidden UTC day and account for the partial first shift after particle onset. Document exposure integration and upkeep timing as GAME rules.
- Enforce radio and dosimeter information gates. Forecast views must not expose actual arrival, error, outcome or later records before those facts become observable.
- Use full-archive forecast-error percentiles for the forecast band. Flight Director hides the band. Flare hints use recorded association rates.
- Implement wall/pantry transfers, immediate shielding loss when a wall item is consumed, exposure/decay, food/water upkeep, power, production, repair, medicine, morale, crew traits and BOLT.
- Add roughly 30 original, kind GAME events with two choices each. Keep effect values in config and resolve choices through the public action API.
- Define ending precedence so every named ending can be reached without masking another. Track achievements and reveal statistics as core state; persistence and collection UI remain later prompt work.
- Produce all three reveal lanes and an explicit list of GAME approximations. Every REAL log ID must exist in the source episode data.

## 3. Clarify the two necessary contracts

- Add an optional source-backed forecast Kp range, derived from the first simulation's non-null IMF-scenario Kp estimates already present in the verified raw cache. Describe it as a forecast scenario range. Missing values remain unknown.
- Regenerate real episodes through the existing pipeline; preserve dates, joins, error statistics and GO thresholds.
- Add a typed chooseEvent action and a pending event/interrupt shape to DESIGN §12.1, mock-run fixtures and JSDoc in the same commit. Keep all eight API function names and call signatures.
- Synchronize root and canonical DESIGN copies. Record these choices in DECISIONS.md.

## 4. Build and run the simulator

- Run 5,000 seeded runs per difficulty for each of the six bots: AlwaysShelter, NeverShelter, TrustForecast, Cautious, Greedy and Random.
- Bots choose through their permitted views and actions; they receive no hidden actual arrivals or future events. Resolve recalls and event choices through the engine.
- Use paired seeds for item-with/item-without comparisons, including the radio and optional BOLT. Keep scramble/loadout assumptions explicit since the 3D scramble arrives in prompt 5.
- Report wins, endings, science, dose, shifts, score, per-item changes and difficulty differences. Specify a transparent GAME score before tuning.
- Save starting and final configuration results. Tune only GAME numbers in config; never change NASA times, association rates or observed outcomes to make a target pass.
- Proposed timer tuning: test a 60-second Commander upper clamp, with Cadet's 1.5 multiplier. This gives a 60-second archive median while retaining uniform selection and true countdown labels. Keep the starting 90-second result in the before/after report.
- Check every quantitative target, including six endings in 1,000 runs, useful radio without mandatory ownership, and easier Cadet/harder Flight Director results. Report any unresolved target honestly instead of claiming a pass.
- npm run sim must reproduce the final report without browser or network access.

## 5. Verify and finish

- Add Vitest's matching coverage provider. Require at least 90% core coverage and focused tests for determinism, serialization, May 11 timing, dose, shielding, wall consumption, information gates, interrupts, traits, BOLT, all endings, achievements and source-ID integrity.
- Preserve the archived mock fixture for isolated tests; normal runs use real episodes.
- Update the mission-setup preview to show real setup data clearly. The full scramble and Shelter Days UI belong to later prompts.
- Run pipeline regression tests, unit/coverage tests, lint, formatting, build and the final simulator.
- Check the preview and source data offline with Playwright at 1280×720 and 360×640. Review screenshots.
- Update README, CLAUDE.md, credits and decisions where needed. Commit, push, verify Cloudflare Pages CI/deployment, then ask before prompt 4.

## Approval checkpoint

The build playbook marks prompt 3 with a compass and says: “start in plan mode, read the plan, approve, then let it run.”

Approved October 8, 2026. The event-choice contract, real Kp field extension, and GAME-only timer tuning are implemented. All balance gates pass; see tools/balance-report.md. Prompt 4 has not started.
