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
