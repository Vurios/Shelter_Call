# SHELTER CALL

A warm shelter. A real Sun. Your call. Gather your lunar crew and supplies, build a wall that is also your pantry, and decide when to work outside. Reveal compares your calls with NASA forecasts and recorded events. Intended for ages 10–14; Cadet offers a forgiving start. No one dies: an early return brings care.

[Play](https://shelter-call.pages.dev/) · [Judge guide](https://shelter-call.pages.dev/?judge=1) · [Source](https://github.com/Vurios/Shelter_Call) · [Submission kit](docs/SUBMISSION.md)

## How to play

1. Choose a difficulty and four crew. Read the briefing or try the separate practice.
2. Hop with touch, mouse, WASD or arrows. Crew follow when touched. Return to the glowing hatch to save them and deposit supplies. You carry four slots; water takes two. Full bag? Deposit or drop an item. Close the hatch while grounded there.
3. Select crew and assign shelter or work. Tasks stay set until changed. Seeds enable the greenhouse; solar repair makes power; ice drill brings water; salvage can find supplies.
4. Put supplies in the wall. More mass gives GAME shielding. Midnight meals use shelf supplies first, then the wall; eating it opens a gap.
5. A saved radio shows received warnings and forecasts. A prediction is not a detection; quiet is not an all-clear. Choose whether to recall crew, then finish shifts. A dosimeter shows GAME dose; without one, watch symptoms.
6. Reach an ending, open Reveal and scrub your calls, forecasts and real events. What's real lists source IDs and GAME rules.

English and Filipino, keyboard/touch, text sizes, reduced motion, sound captions and a 2D map are available in Settings. Saves preserve journal decisions and RNG; a Scramble reload restarts its seeded map. Daily Sun, checked friend codes, the source-card Almanac, Historic Storms, achievements and classroom votes support replay. Storage is optional; clearing it resets local progress. There is no server leaderboard.

The judge URL uses fixed seed `shelter-call-judge-2024`, the verified May 11 window and Cadet. It skips practice/coaching without changing your tutorial preference, names source data and opens What's real. Ordinary controls and survival rules apply; it does not inject a winning loadout or skip source events. The suggested three-minute presentation timing is **UNVERIFIED** with human presenters.

## How NASA data is used

NASA DONKI records supply flare starts, grouped near-Earth particle detections, attached alert times, first Earth-arrival forecasts and documented shock links. The pipeline retains official IDs and cache checksums. Predictions, observations and missing records remain distinct. Reveal shows dates after play; optional source stamps identify already-received records.

The audited query covers January 1, 2010 through October 8, 2026. It produced **74 playable windows, 77 clean countdowns and 124 independent clean CME-arrival pairs**. These are archive-quality gates, not counts experienced by one mission. [REPORT](data-pipeline/REPORT.md) documents provenance, assumptions and omissions.

The May 11, 2024 judge case links a 01:10 UTC flare to a 02:10 UTC particle onset: **60 minutes**. Its attached alert is 02:30 UTC, **20 minutes after onset**. These are near-Earth records, not Moon measurements or a statement about all warnings. REPORT's sanity check supports these values.

DONKI is research-quality information, not an operational safety service. Earth observations proxy timing at our fictional Moon outpost. NASA timestamps are never tuned; missing science is not invented. Optional Live Sun requests official records through Cloudflare, conservatively transforms them and falls back to a verified cache or the archive when no complete window exists. MODEL sensor hints are recorded predictions, never detections or guaranteed lead time.

## GAME approximations

- Fictional outpost, characters, choices, pickup layout and hop physics.
- Short scramble seconds derived from real countdown minutes; difficulty supplies/timer.
- Relative dose, tiers, decay, shielding percentages, alarms and EVA consequences; not mSv or measured Moon radiation.
- Food, water, power, morale, production, traits, medevac, resupply, scores, achievements and card rarity.
- Applying Earth timing to the Moon and mapping recorded MODEL lead to the journal clock.
- Original art and synthesized audio; not mission procedures.

Cadet has a 1.5× timer, 25% more food/water pickups and four food/four water in a labelled reserve. Flight Director has 25% fewer pickups and hides uncertainty bands. Commander supplies and survival tuning remain unchanged. What's real retains the detailed approximation list.

## Sources and attribution

- [NASA GSFC / CCMC DONKI overview and research policy](https://ccmc.gsfc.nasa.gov/tools/DONKI/)
- [DONKI API reference](https://ccmc.gsfc.nasa.gov/DONKI/api/) and [May 2024 SEP records](https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31)
- [WSA-Enlil verification study](https://arxiv.org/abs/1801.07818)
- [NASA Orion crew systems](https://www.nasa.gov/reference/crew-systems/) for shelter context, not our numeric rule
- [Full credits and licenses](CREDITS.md) for open tools and OFL fonts

These sources appear in REPORT or [DESIGN §16](docs/DESIGN.md). NASA does not endorse this project. No agency insignia, astronaut likenesses or commercial-game assets. Original art and sound sources are committed; [the art journal](https://shelter-call.pages.dev/?gallery=1) displays them.

## Build and check

Node.js 22.12+ and Python 3 for data/art. CI uses Node 24. Install Chrome/Edge or `npx playwright install chromium`.

```sh
npm ci
npm run dev
npm run lint
npm run format:check
npm run test:coverage
npm run art:check
npm run build
npm run e2e
npm run preview
```

`npm run sim` runs the complete headless balance check; allow several minutes. [The balance report](tools/balance-report.md) discloses the full-loadout proxy and paired item protocol; it does not prove physical pickup capacity. [PLAYTEST](docs/PLAYTEST.md) records five real-control browser runs, including early shortages. **UNVERIFIED:** human Commander 8–12-minute pacing, ~20-second decisions and educational outcomes. Machine timing cannot establish these targets.

```sh
python -m pip install -r data-pipeline/requirements.txt
npm run data
npm run data -- --offline --end 2026-10-08
```

The pipeline fetches official records in cached chunks, tests conservative joins and emits episodes, showcase and REPORT. Blocked local NASA HTTPS can use the authenticated GitHub data workflow. Raw caches and credentials are ignored. No invented rules enter real-data JSON.

`npm run art` regenerates the original kit. Restore pinned fonts with `python tools/fetch-fonts.py`; recreate lossless WOFF2 with `pip install 'fonttools[woff]'` then `python tools/compress-fonts.py`. Original glyphs, TTFs and OFL notices remain.

## Cloudflare Pages and offline play

Deployment is **Cloudflare Pages**, project `shelter-call`, production branch **main**, output **dist**, root URL. Commit and push directly to main; no branches or PRs. Every push checks unit, Python, art and browser results before deploying through `cloudflare/wrangler-action`. GitHub Pages is disabled.

Manual deploy: set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` only in the process environment. Never put values in files, command arguments or logs. `npm run deploy:setup` verifies the project and encrypts repository secrets through `gh api`; build then `npm run deploy`. `npm run preview:cloudflare` serves Functions locally.

The GET relay `/api/donki/` allows six DONKI endpoints, returns JSON/CORS and caches successful responses one hour at the edge. The service worker never permanently caches `/api/*`. After its first cache completes, the archive, lazy scenes, episodes.json, art, fonts and synthesis support a full offline run. The manifest supplies standalone/maskable icons. Physical-phone installation, Android/Safari, in-app browsers, vibration and speaker acceptance remain **UNVERIFIED**.

## Team and AI disclosure

Repository owner: **Vurios** (GitHub handle). Team name, real names, roles, event entry and additional tools are **UNVERIFIED** until supplied. No fictional participants are listed.

OpenAI Codex assisted with implementation, procedural art/audio, translation drafts, documentation and checks across prompts 1–9. The user supplied design/build prompts and approvals. AI did not generate NASA event records; IDs and provenance are retained. No runtime AI connection is required. Filipino review with target readers is **UNVERIFIED**.

[The submission ledger](docs/SUBMISSION.md) verifies science against REPORT/DESIGN §16 and separates implementation evidence from human claims. [Decisions](docs/DECISIONS.md), [design](docs/DESIGN.md), [build prompts](docs/CLAUDE_CODE_PROMPTS.md) and [credits](CREDITS.md) document the work. Root specification copies remain for IDE tabs.
