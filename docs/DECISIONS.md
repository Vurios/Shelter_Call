# Decision log

## 2026-10-08 — Prompt 1 foundation

- Preserve the two original Markdown files for existing IDE tabs. Identical copies in `docs/` are the canonical specifications going forward. No design changes.
- No CHALLENGE.md was supplied, so challenge gap review does not apply yet.
- Use vanilla ES modules, Vite, Three.js, Vitest, Playwright, ESLint, Prettier, and vite-plugin-pwa as specified.
- Mock API mutators update and return the supplied state. Views and reveals are detached snapshots. IDs identify crew and item instances.
- The synthetic window spans 12 days with two flares, one CME forecast, one particle event, four crew, and six item instances. Every fixture event is GAME. The `realMinutes` and `nasaForecast` contract fields remain for later replacement, but contain explicitly synthetic data here.
- Implement only lightweight mock assignment, inventory movement, and shift progression to exercise the API. No real dose, survival, forecast scoring, balance, or NASA data joins.
- `data` and `sim` entry points fail with explicit next-prompt messages rather than claim synthetic results are real outputs.
- Title screen offers a small mission-setup check. Original CSS outpost mark and SVG favicon use no third-party artwork or agency insignia.
- Precache the production placeholder with Workbox. Installable PWA icons and full-game offline acceptance remain later work.
- Playwright uses `PLAYWRIGHT_EXECUTABLE_PATH` or a detected preinstalled Chromium/Chrome/Edge when available; otherwise it uses Playwright's installed Chromium.
- GitHub Pages workflow validates the root build, then builds with the repository base path before deployment. Pull requests validate without deployment.

## Validation

- `npm run lint`, `npm run format:check`, `npm test` (3 tests), and `npm run build` pass.
- `npm run e2e` passes at 1280×720 and 360×640, including keyboard activation, click/touch-compatible controls, no horizontal overflow, no browser console errors, and offline reload with the mission fixture still working.
- Visually inspected title and expanded mission-setup screenshots at both sizes. Expanded content scrolls vertically on small screens.
- Fixed a mock timestamp-boundary bug exposed by the unit test: compare parsed UTC timestamps rather than ISO strings with different fractional-second formats.
- Deployment is configured for `https://vurios.github.io/Shelter_Call/`. Remote Pages checks follow the first push; scaffold evidence does not establish full gameplay or physical-device acceptance.

## 2026-10-08 — Prompt 2 NASA data pipeline

- User authorized fixing the unavailable data route autonomously. DNS resolves CCMC, but local HTTPS times out. The legacy api.nasa.gov route returns a 301 to NASA's migration announcement. GitHub's runner successfully fetched the current official CCMC API.
- Use a GitHub workflow as transport for official NASA JSON, not a third-party substitute. Preserve source URLs, UTC query intervals, row counts, fetch times, and SHA-256 hashes in the ignored raw manifest. No firewall, hosts, DNS, or machine network settings were changed.
- Fetch 2010-01-01 through 2026-10-08 in inclusive 30-day chunks. Rate-limit globally to at least one second between requests, retry with exponential backoff, cache every chunk, and retain partial cloud artifacts/caches for resumption.
- `npm run data` selects the isolated Python environment, runs pytest, verifies/fetches the cache locally or through the cloud route, builds episodes/showcase, generates the report and histograms, and prints GO/NO-GO. `--offline` rebuilds from verified cache; `--cloud` forces the remote route.
- Keep model predictions separate. Group near-Earth channel rows conservatively by the latest linked flare within six hours; unlinked rows only merge at equal onset times. Preserve all grouping members, model links, forecast revisions, and actual IPS joins in the audit.
- Preserve a timing `miss` for linked arrivals outside ±30 hours. The original outcome enum omitted this case; both DESIGN copies now clarify it instead of calling real arrivals false alarms.
- Shared multi-CME simulations are one display forecast. Count independent actual IPS IDs for the clean-pair threshold. Exclude ambiguous arrivals and incomplete recent forecast observation periods; never fabricate joins or values.
- Ship only the real records required by playable windows and their linked countdown flares, under 1.5 MB. Full-archive statistics, model predictions and detailed join provenance remain in the report/cache.
- Preserve first-run forecasts issued before a window if their predicted/actual arrival falls inside it. Each playable window still requires a forecast issued inside the window and full 14-day archive coverage.
- Dependencies live in ignored `.venv/`; ESLint and Prettier skip installed Python packages. Pages CI now runs the pipeline tests as well as frontend tests.
- Prompt 3 remains unauthorized. The title screen and engine continue to use clearly labeled prompt 1 GAME fixtures.

### Prompt 2 validation

- Full official-source fetch succeeded: 1,230 verified raw chunks, 2010-01-01 through 2026-10-08.
- GO: 124 independent clean CME-arrival pairs, 77 clean countdowns, and 74 playable windows. All three design thresholds pass. Public episode payload: 238,079 bytes.
- The real May 11, 2024 source record yields a 60-minute countdown and +20-minute alert lag, and starts a playable window selected for the judge showcase.
- Full-archive inspection found legacy GOES13 instrument names. Corrected near-Earth recognition and added a regression test before accepting final counts.
- 21 pytest tests and 3 Vitest tests pass. Desktop and mobile browser tests pass, including fetching the real episode payload online and after offline reload.
- Reviewed all three histogram PNGs and title screenshots at 1280×720 and 360×640. No visual overflow or browser console errors.

## 2026-10-08 - Prompt 3 real-data engine

- User approved [the concrete plan](PROMPT_3_PLAN.md), including event-choice and Kp contract clarifications, and GAME-only timer tuning. Preserve the eight synchronous API exports. Mutators update the supplied state; views are detached.
- Read the committed NASA archive synchronously as immutable ES-module input. No core network, browser, rendering, storage, timers, clock reads or Math.random. Private caches only memoize immutable window/timeline data.
- A serializable numeric RNG and event cursor preserve exact replay after JSON save/reload. Uniformly select all 74 windows; judge mode selects the verified May 11 case. Real countdown minutes remain unchanged; final Commander upper cap is 60 seconds, Cadet multiplies by 1.5.
- Align shift boundaries to hidden UTC AM/PM. Integrate piecewise GAME exposure over exact real event times, including the partial first shift. Upkeep runs at UTC midnight. Resupply is one of the four shift boundaries within the last two mission days, never beyond the final day.
- Radio cards exclude actual arrival, error, outcome and later-issued records. Mara decodes relative issue time and first-simulation Kp scenario range. Flight Director hides the signed empirical forecast-error band. Dosimeter shows exact relative dose and GAME decay level; otherwise only symptoms are visible. Reveal requires the ending phase.
- `chooseEvent` resolves one of two choices; REAL flare/dosimeter interrupts pause at the event timestamp until recall/continue. Their public shapes are in both DESIGN copies and the archived GAME fixture. The archived mock is excluded from real-engine coverage; all production core modules are included.
- `kpRange` preserves first WSA scenario estimates (kp_18, kp_90, kp_135, kp_180), ignores null/non-numeric/out-of-range values, and never becomes measured Kp. Regeneration preserves every original source field, date, join, statistic and window. Add a compact original NASA fixture with an actual linked forecast to prevent a vacuous source test.
- GAME baseline and tuned values are both in config.js. Stronger/longer relative hazards make unprotected EVA costly; 56 food and water pickups let a shelter-only loadout reach resupply. Science output rewards useful EVA. Flight Director's lower dose tolerance and longer run make it harder. NASA data, channel tiers, associations and observed outcomes are never tuned.
- The simulator uses four isolated CPU workers and paired seeds. TrustForecast shelters when the next shift overlaps its permitted forecast band, responds to official particle alerts and recalls on X flares. Cautious adds M flares, a conservative initial shelter period and health cues; Greedy maximizes science EVA; Random uses its own seeded stream. Bots never read future arrivals or observed outcomes.
- Keep a fixed GAME score: 100 for survival + 25 per crew home + min(100, science*2) - total relative dose*0.2. Item checks use Cautious good play and remove ONE instance per type, including BOLT; removing all water is not a single-item comparison. The full-loadout proxy is intentionally generous and must be retested when prompt 5 supplies real pickup physics.
- Endings prioritize Snack Attack, Lights Out, medical evacuation, single saved crew, no-EVA thriving plant, no-radio win, three outguesses, top-tier outside survival, science goal, then normal return. Forecast scoring reconstructs calls at actual arrival rather than crediting a later recall in the same shift.
- Track run achievements in state and provide a pure cross-run collection ledger for all 12 achievements. The caller supplies collection data/daily date; persistence, daily seed generation and collection screens remain prompt 8.
- BOLT has no human dose. Its fractional production persists across shifts, costs power only when assigned outside, and slows during GAME storm exposure. Task-specific fractional work prevents greenhouse progress becoming drill output.
- Current browser preview remains mission setup only. Full scramble/journal/reveal UI, art and audio remain their designated later prompts. Stop and ask before prompt 4.

### Prompt 3 validation

- 176,000 headless runs: 5,000 per six bots per three difficulties (90,000), 30,000 starting-configuration Commander runs, 55,000 paired item ablations, and 1,000 variety runs. All eleven quantitative acceptance checks pass; figures are in [the balance report](../tools/balance-report.md).
- Commander TrustForecast wins 56.4%, scores 207.2 versus AlwaysShelter 190.3 and NeverShelter 125.9, and has a median 21 shifts / 60-second scramble. NeverShelter medevac is 90.3%. Variety includes eight endings. Cadet TrustForecast wins 88.0%; Flight Director 34.7%.
- The Cautious full-loadout proxy wins 98.6%; without radio 97.7%. Radio's +0.9 percentage-point benefit is largest; other single-instance removals show zero survival change here. These generous-loadout results establish the specified gates, not final pickup feasibility or item usefulness in the later physical scramble.
- 17 Vitest tests pass, including every real window, all ending branches, deterministic JSON saves, source-ID integrity, information gates, traits, item effects and all collection achievements. Production core coverage: 99.79% lines, 99.64% statements, 98.79% branches, 100% functions; CI enforces 90% for all four.
- 23 Python tests pass. Source comparison proves that removing the new kpRange field exactly reproduces the prior public episode JSON. GO counts remain 124 / 77 / 74; payload is 243,264 bytes.
- Lint, formatting and production build pass. Desktop 1280x720 and mobile 360x640 Playwright checks pass online/offline, with both real minutes and GAME seconds displayed, no horizontal overflow, and no browser console errors. Screenshots reviewed; no physical-phone acceptance claimed.

## 2026-10-09 - Prompt 3 review with Sol high and prompt 4 compatibility

- User requested a fresh prompt 3 improvement review using `gpt-6.1-sol` at high reasoning, followed by any required prompt 4 integration. That agent reviewed and implemented the core fixes; the root agent completed integration, verification and publication. Ask before prompt 5.
- Real PM-start windows exposed incorrect journal day labels and resupply times past the final UTC mission day. Journal days now use the hidden UTC calendar; an ending boundary labels the shift just completed. Resupply draws from the same four final-two-day boundaries anchored to UTC midnight. No GAME configuration numbers were changed.
- Radio flare recall now requires an active human EVA. Sheltered dosimeter onset alarms still appear, and BOLT remains outside during human recalls. Source-backed regression tests distinguish these cases.
- Four B-class archive flares had no computed particle-association rate. Preserve missing rates as `null` with an unknown-estimate hint rather than presenting a fabricated zero. Existing C/M/X rates remain unchanged. Prompt 4 audio now supports B as the gentlest alarm, with a failed-before/passed-after integration test covering every archived flare class. The gallery has 28 sound cues; its original models, icons and other assets remain compatible.
- Reveal now includes prior source context used by countdown/radio/initial exposure and excludes future reality rows. Almanac percentages count 1,266 IDs reachable across legal mission endings, rather than all 1,289 archive IDs. The 23 late context IDs remain intact for source integrity. Unknown, duplicate and unreachable legacy cards cannot inflate percentages. Tests enumerate all 74 windows, verify linked countdown flares and ending cutoffs, and prove the reveal union can earn 100%. This verifies collection reachability, not physical scramble or survival feasibility.
- Reran the complete 176,000-run simulator. All eleven targets pass: Commander TrustForecast survival 57.0%, mean score 208.4 versus shelter-only 190.4 and never-shelter 126.0; median 21 shifts and 60-second timer. Cadet survival 88.6%, Flight Director 34.7%; eight variety endings. Radio remains the strongest single-instance item benefit at 0.92 percentage points. Starting/final tables use the corrected engine and retain the generous-loadout proxy limitation.
- Local verification: 27 Vitest tests, 23 Python tests, lint, formatting, asset checks and production build pass. Core coverage is 99.8% lines, 99.64% statements, 98.8% branches and 100% functions. Six Playwright checks pass at 1280x720 and 360x640, including all 28 cues, offline first gallery visit/reloads, reduced motion and WebGL fallback. Sound-section screenshots reviewed; stress mix peak remains 0.8873 with finite samples. No physical-phone or Safari acceptance claimed.
- NASA payloads, pipeline, source playbook, verbatim authorization block and art files are unchanged. Both DESIGN copies document the clarified engine/reveal semantics; the eight-call API shape is unchanged.

## 2026-10-09 - Prompt 4 original art and audio

- User approved the prompt 4 plan and waived separate plan approvals for future prompts. Plan and complete the requested prompt autonomously; ask before starting the next numbered prompt. Keep the source playbook and the verbatim authorization block intact.
- Use an original cozy lunar kit: oversized helmets, faceted geometry, warm doorways and a pale graph-paper journal. Ten palette tokens, eight color-and-shape suit identities, readable Atkinson Hyperlegible body text and Patrick Hand headings. Local font cmap checks cover the Filipino sample including Ñ/ñ; all fonts are unmodified and pinned to Google Fonts revision `2eb0b48d5f760f62e286216f0859a8c540dbc1bd` with retained OFL notices and per-file credits.
- Original source factories/generators produce 29 self-contained GLBs, 33 portraits, six Kamote moods, 38 icons and a reusable sprite, ten ending illustrations, an empty Almanac frame, three journal textures, favicon and regular/maskable app icons. No agency insignia, copied commercial assets, real astronaut likenesses or invented event records. Art and sound are GAME presentation.
- Reuse identical faceted geometry inside each model. This cuts indexed art/font size from 3,114,632 to 952,160 bytes without changing silhouettes. Complete asset directory including the manifest: 994,765 bytes, below 15 MB. Models have ground pivots, explicit normals and named parts, no external buffers/textures, and fewer than 6,000 triangles each. Windows/Linux asset byte preservation is explicit in `.gitattributes`.
- Procedural Web Audio supplies all 27 effects and three loopable themes without a new dependency. Construction is silent; create/resume the context synchronously from user input. Eight unique chirps, C/M/X urgency mapping, timer-driven scramble tempo/ticks, shield-driven shelter filtering/gain, 0.6-second crossfades, conservative volume defaults, captions, mute, stop-all and disposal are reusable APIs outside core. Repeated taps cap active effects and music crossfade tracks. Hidden pages stop audio; browser-back cache restoration retains usable controls.
- Gallery query `?gallery=1` lazy-loads Three.js and uses one scissored renderer, a pixel-ratio cap of 1.5 and visible-card rendering. Reduced motion pauses rotation. Missing WebGL leaves the SVG/audio journal usable. Preserve the verified mission-setup preview and add an explicit title-music button. Full gameplay remains prompts 5-7.
- Workbox initially failed installation: unhashed public icons under Vite's default `assets/` directory received null revisions, while manifest inclusion added duplicate keys with content revisions. Move hashed chunks to `bundles/`; public art/fonts now receive consistent content revisions, fixing offline installation and future asset updates. Precache every model/font/icon and lazy chunk. Original install icons are included; physical-phone installation remains unverified.
- Node's direct request to raw.githubusercontent.com timed out; Python's standard URL client fetched the pinned official files successfully. No network/system settings were changed. Normal art regeneration, build and gameplay synthesis need no network.

### Prompt 4 validation

- `art:check` loads all 29 GLBs, verifies complete item/task/trait/mood/ending coverage, SHA-256 and byte counts, ground pivots, normals, no external textures, polygon/15 MB budgets, actual font glyphs and palette contrast. Minimum light-token/Ink contrast is 5.6139:1. Generated art reproduces byte-for-byte; all SVGs parse.
- 21 Vitest tests pass, including four focused audio tests. Core coverage is unchanged: 99.79% lines, 99.64% statements, 98.79% branches, 100% functions. All 23 pipeline tests pass. No NASA payload or core source changed.
- Six Playwright checks pass at desktop 1280x720 and mobile 360x640: complete gallery, each sound button and theme, settings, mute/captions, keyboard interaction, reduced motion, unavailable WebGL, offline title/gallery and all 29 model loads. Every lazy SVG/image loads without failed requests. Screenshots cover every model, all crew and plant moods, ten endings, icons, typography, textures and section views. Visually reviewed the kit at both widths; no horizontal overflow or console errors.
- Real OfflineAudioContext stress mix: eight effects plus scramble music through the compressor, with maximum master/SFX gain. Finite samples, peak 0.8873, RMS 0.1190; no clipping in that case. Unit checks cover every source buffer, not only this mix. Physical phone-speaker loudness, Android frame rate, Safari/in-app-browser playback and device installation are not established by local automation.
- Lint, formatting, coverage, asset checks and build pass. Root production output is 2,150,510 bytes, below the 25 MB total-download budget. Three remains lazy-loaded; Vite's >500 kB warning refers to the 624 kB gallery/Three chunk (158 kB gzip). The title does not execute it. First-interaction timing on actual 4G is not measured.
- Screenshots/audio evidence are under ignored `test-results/` and uploaded by Pages CI. Deployment is verified separately after the push. Stop before prompt 5.
