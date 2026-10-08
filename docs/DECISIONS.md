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
