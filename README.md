# SHELTER CALL

A lunar-outpost game for ages 10–14: gather crew and supplies, decide when to shelter, then compare your calls with the Sun's history.

**Current stage: prompt 6 playable Shelter Days journal.** Play a seeded lunar outpost in 3D or 2D, bring crew and supplies to the hatch, then open the journal to assign tasks, build a supply wall and answer real flare warnings. The REAL countdown and its compressed GAME seconds remain visible. Full ending cards, Reveal and persistence screens arrive in prompt 7. Original models, portraits and sounds remain in [the offline art journal](https://shelter-call.pages.dev/?gallery=1).

[Open the production preview](https://shelter-call.pages.dev/) · [GitHub repository](https://github.com/Vurios/Shelter_Call)

## Run locally

Use Node.js 22.12+ (Node 24 recommended) and Python 3 for the data and art pipelines.

```sh
npm ci
npm run dev
```

## Check and build

```sh
npm run lint
npm run format:check
npm run test:coverage
npm run art:check
npm run build
npm run e2e
npm run preview
```

Playwright automatically uses detected local Chrome/Edge/Chromium. To specify another executable, set `PLAYWRIGHT_EXECUTABLE_PATH`. If none exists, run `npx playwright install chromium`. Screenshots at 1280×720 and 360×640 are written under `test-results/`.

`npm run sim` reproduces [the balance report](tools/balance-report.md): 5,000 runs for each of six bots on each difficulty, starting/final Commander tables, and paired item checks. It uses local data and four isolated CPU workers. Allow several minutes. `npm run sim -- --quick --runs 500` is a faster exploratory check and does not replace final acceptance.

The simulator assumes every pickup was saved. Its single-item ablations remove one instance, so one water brick is compared with one water brick, not an entire mission's water. These headless results do not establish achievable pickup capacity in the physical scramble. The report labels its loadout, fixed score and policies.

The eight synchronous engine calls remain in `src/core/api.js`. Save/reload the JSON run state to preserve RNG, timeline cursor and paused decisions. After `resolveShift`, handle a pending GAME event with `chooseEvent` or a REAL interrupt with `recallAll` / `keepWorking`, then continue the same shift. Views hide future actual arrivals, observed forecast outcomes, mission calendar dates, and exact dose without a dosimeter. Known REAL records carry source UTC tooltips; forecast timestamps describe predictions. Dose thresholds use the chosen difficulty and remain hidden without a dosimeter. `buildReveal` requires the ending phase.

`src/core/collections.js` tracks all collection achievements without storage or a clock; a future UI supplies prior progress and a UTC daily date. The final reveal includes prior source context used by the mission, with no reality events after its ending. Almanac completion counts 1,266 reachable IDs from the current 1,289-record archive; 23 late context records remain available for source checks. No live fetch or persistence UI is included yet.

## Play the scramble

Choose **Play scramble** on the title, enter a seed and difficulty, then start. The clock waits for the outpost to load. Tap/click a place or use WASD / arrows to hop; connected gamepad sticks also move. Crew follow when you touch them. Return to the glowing hatch to save crew and deposit supplies. Four carry slots fill automatically; water uses two. Tap a carried supply to drop it, or press Q to drop the last one.

Crew buttons and Find supply set a destination; Hop to hatch brings you home. Close hatch finishes early only while grounded at the hatch. P / Escape pauses, and switching tabs pauses automatically. Use 2D / Use 3D preserves the same run and clock. Missing WebGL opens 2D automatically; sustained frame rates below 25 fps offer that mode. Sound off keeps important text captions.

At zero, unsaved crew are exposed and join the shelter with the engine's labeled GAME dose bump. The hatch report shows saved crew and pantry; choose **Open shelter journal** to continue the same run. Replay and title controls work. Add `?seed=orbit-a` to share the starting seed, or `?scramble=1&seed=orbit-a` to open its briefing directly.

The browser suite plays three seeds at both desktop 1280x720 and mobile 360x640, checks actual rescue/deposit and storm results, offline first scene load, renderer switching, keyboard/tap controls and fallback. Isolated Chrome samples measured median 180 fps on desktop and 40.35 fps at 360x640 with fourfold CPU throttling and render ratio capped at 1.5. This uses a desktop GPU; physical Android frame rate remains unverified. Evidence is recorded with screenshots in test-results/performance/.

## Play Shelter Days

The journal shows **Day N ? AM/PM**. Tap a crew card, then In shelter or an EVA task. Greenhouse needs seeds and working power; solar repair makes power, ice drill makes water, salvage finds supplies, and science walk earns points. A saved BOLT has its own card. Tap a pantry supply, then **Put in wall** or an empty wall slot. Select a wall supply to move it to the shelf. Food, water and usable gear have explicit use controls; choose the crew recipient for meals and medicine. Shielding updates immediately, and eating a wall opens a visible gap. Automatic midnight meals use the shelf first.

Sun Watch appears only with a saved radio. REAL stamps open source IDs and UTC timestamps, with hover tooltips and keyboard/touch details. Forecast timelines show predicted arrival in shifts and the archive error band; Flight Director hides the band, and Mara decodes issue time/Kp. A real flare during human EVA pauses the shift for **RECALL NOW** or **KEEP WORKING**. Recall preserves work already done and shelters humans for the remainder; BOLT follows its separate assignment. Association hints use the archive's actual rates; missing estimates stay unknown. Without a radio, friendly blind-mode text replaces forecasts. A dosimeter adds GAME relative-dose meters and difficulty-adjusted thresholds; these are never physical dose units.

Finish each shift to get a short illustrated log, then answer any crew-story choice. All actions support keyboard/touch and reduced motion. The journal stops at the engine's ending boundary with replay/title controls; full ending/reveal UI and reload persistence belong to prompt 7.

The journal browser suite covers three days at both viewport sizes, live shielding/consumption, REAL interrupts, blind endings, Flight Director/Mara forecast rules, keyboard targets and the first offline journal entry from an actual scramble. Its isolated full-loadout fixture is bundled in memory for tests and never shipped in `dist/`; it establishes UI behavior, not physical scramble balance.

## Art and sound

Open `/?gallery=1` locally. Every model rotates in a shared WebGL renderer; reduced motion pauses rotation. The gallery has all crew/plant moods, ending illustrations, icons, palette/type samples, 29 sound buttons, three music loops, volume/mute, captions and stop controls. Alarms support the B/C/M/X flare classes present in the archive; the scramble countdown has its own GAME return-to-hatch cue. No sound starts without input. If WebGL is unavailable, the SVG and sound journal stays usable.

`npm run art` regenerates the original kit offline from sources and committed fonts. `python tools/fetch-fonts.py` restores the five pinned font/license files if needed. `npm run art:check` validates every model and manifest hash, asset counts, contrast, Filipino glyphs and the <15 MB budget. The complete asset folder is 994,765 bytes including metadata. See [art direction](docs/ART_DIRECTION.md) and [credits](CREDITS.md).

Browser screenshots include each model, crew moods, plant moods, ending grid, icons, textures, type and section views in `test-results/`. Generated files preserve exact bytes on Windows and Linux. Audio tests establish deterministic finite samples and local offline mix headroom; physical phone speaker loudness and Android/Safari acceptance are not yet verified.

## NASA data pipeline

```sh
npm run data
npm run data -- --offline --end 2026-10-08
```

The pipeline bootstraps an isolated Python environment if needed, runs its tests, fetches six official DONKI endpoints in cached 30-day chunks, verifies checksums, joins records, and generates `public/data/episodes.json`, `public/data/showcase.json`, and [the data report](data-pipeline/REPORT.md). The final line reports GO/NO-GO against the design's three thresholds.

NASA [moved the DONKI API](https://ccmc.gsfc.nasa.gov/news/major-updates/) September 30, 2026. If local HTTPS cannot reach CCMC, the command automatically uses the repository's GitHub data workflow and downloads its official-source cache. This requires authenticated GitHub CLI access. Use `--cloud` to force that route. Raw records and credentials remain ignored by Git; an optional `NASA_API_KEY` environment variable supports the legacy fallback if it returns JSON.

The pipeline uses recorded flare starts, near-Earth particle detections, attached alert times, and first Earth-arrival forecasts. Model rows are predictions, not detections. Arrival comparisons require documented shock links. The report explains grouping, missing records, revisions, and record-based false alarms. DONKI is research-quality data; Earth observations are a game proxy for the fictional Moon setting. No physical dose, decay, shielding or crew outcomes are generated by the data pipeline.

## Deploy

Deployment uses **Cloudflare Pages**, project `shelter-call`, production branch `main`, output `dist/`. Commit and push directly to `main`; `.github/workflows/deploy.yml` validates and deploys every push using `cloudflare/wrangler-action`. GitHub Pages is disabled; no repository-path base is required.

Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the process environment without saving their values in files. Run `npm run deploy:setup` once to create/verify the project and store both GitHub repository secrets through public-key encryption and `gh api`. If repository secret writes are refused, add those exact two names in Settings > Secrets and variables > Actions. Then run `npm run build` and `npm run deploy`. Use `npm run preview:cloudflare` to test Pages Functions locally.

The optional GET relay `/api/donki/<endpoint>` allows only FLR, SEP, CME, IPS, WSAEnlilSimulations and notifications, forwards queries to CCMC, and caches successful JSON for one hour at the edge. It tries the requested legacy route, then NASA's documented `ccmc.gsfc.nasa.gov/DONKI-API/get/` replacement if the old route fails; `X-DONKI-Source` identifies the successful source. Errors are JSON and are not cached. CORS permits public reads. Live requests use the network; the service worker excludes `/api/*` from both navigation fallback and permanent caching. Archived NASA mission inputs stay local and unchanged.

After the first service-worker cache completes, the title, scramble in both renderers, Shelter Days journal, gallery, all original art, local fonts, synthesis and archived NASA JSON work offline. The PWA manifest has original regular/maskable icons; physical-phone installation and full ending/reveal acceptance remain later checks.

## Project notes

- [Design](docs/DESIGN.md)
- [Build prompts](docs/CLAUDE_CODE_PROMPTS.md)
- [Agent instructions](CLAUDE.md)
- [Decision log](docs/DECISIONS.md)
- [Art and sound direction](docs/ART_DIRECTION.md)
- [Credits](CREDITS.md)

Original root Markdown files remain for existing IDE tabs; use the `docs/` copies for future specification edits. Prompts 1-4 were built with OpenAI Codex assistance. No agency insignia or commercial-game assets are used.
