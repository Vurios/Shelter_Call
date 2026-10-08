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
