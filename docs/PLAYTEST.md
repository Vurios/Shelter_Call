# Prompt 9 playtest and shipping evidence

October 9, 2026. Human notes: **none yet**. No children, classroom or family acceptance is claimed. Automated play uses the real controls and source archive, with no injected loadout, changed clock or hidden forecast outcomes.

## Five complete physical runs

Chrome on Windows; 2D map selected through Settings. Desktop 1280×720, mobile 360×640. Four crew physically rescued in every run. Each reached Ending and Reveal; journal checkpoint reload also passed. Zero console errors or warnings.

| Difficulty      | Seed             | Viewport | Saved pickups | Shifts | Ending          | Automated elapsed | Median / max decision |
| --------------- | ---------------- | -------- | ------------: | -----: | --------------- | ----------------: | --------------------- |
| Cadet           | journal-0        | 360×640  |            17 |     17 | Blind Luck      |            59.5 s | 1.34 / 2.34 s         |
| Commander       | ship-commander-a | 1280×720 |            20 |     19 | Early Ride Home |            67.5 s | 1.42 / 2.41 s         |
| Commander       | ship-commander-b | 360×640  |            14 |      7 | Snack Attack    |            49.2 s | 1.56 / 2.61 s         |
| Commander       | ship-commander-c | 1280×720 |            10 |      6 | Snack Attack    |            45.3 s | 1.73 / 2.59 s         |
| Flight Director | ship-director-d  | 360×640  |            16 |      8 | Snack Attack    |            51.1 s | 1.60 / 2.25 s         |

Raw screenshots, per-shift state and timing: ignored `playwright-report/prompt9-playtest/`. Pickup counts are physical, not the generous simulator loadout. This small sample is not a survival-rate estimate.

## Observed confusion and consequences

- Scramble: Find supply can target an item while incidental pickups fill the bag. Returning to the hatch deposits everything, but the full-bag message did not name this option or water's two-slot cost.
- Journal, all runs: initial forecasts were absent; a missing radio and a quiet saved radio need different next-action explanations. Blind missions cannot be treated as forecasts received.
- Journal, every repeated assignment: tasks persist, but the first crew instruction did not say so. Reassigning all four every shift was unnecessary dead work.
- Commander B/C and Director: shortages triggered early endings. Automatic midnight meals can consume the supply wall; the reminder disappeared after selecting an item. The final shift should explain that consequence before advancing.
- Mobile: a roughly 2,158-pixel journal puts Finish shift below a long scroll. The fixed announcement also needs reserved space so it does not cover controls.
- Classroom screenshot review from prompt 8: oversized modal headings push the forecast and voting controls far below the fold at 360×640. Native scrolling works, but presentation wastes reading space.
- Forecast review: a past predicted time is not an all-clear, yet the former label gave no next step.
- MODEL source review: the timestamp now comes from a recorded source; the old “derived” label was stale.
- Cold mobile Lighthouse: local preview 79, production 87, production interaction 3.085 s. Fonts began after CSS discovery; production missed the <3 s interaction target.
- Metadata: the old description still called this a development art journal; missing robots.txt fell through to HTML.

## Ten fixes

| Priority | Change                                                                 | Scope                                                   |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| 1        | Lossless WOFF2 fonts, font preloads, separate lazy Three core/addons   | Load performance; original glyphs and licenses retained |
| 2        | Full bag explains depositing, dropping and water's two slots           | Scramble feedback                                       |
| 3        | Crew and footer copy says tasks persist                                | Avoid repeated assignments                              |
| 4        | PM footer always explains midnight shelf-first, then wall meals        | Consequence before advancing                            |
| 5        | Sticky Finish shift footer reserves announcement clearance             | Phone journal navigation                                |
| 6        | Smaller classroom modal heading                                        | More room for the real forecast and vote                |
| 7        | Missing-radio copy names rest, drilling and salvage                    | Blind-mode next steps                                   |
| 8        | Quiet-radio copy explicitly says quiet is not safe                     | Archive gaps stay unknown                               |
| 9        | Passed prediction asks for new warnings; MODEL label says recorded UTC | Forecast/source clarity                                 |
| 10       | Accurate description and valid robots.txt                              | Shipping presentation                                   |

These are copy, layout and packaging changes. NASA records, engine rules, difficulty supplies and scoring are unchanged. Judge mode adds only the requested presentation around ordinary controls.

## Balance and pacing

The complete 181,000-run simulator passed all eleven gates again for prompt 9; see [balance report](../tools/balance-report.md). Commander TrustForecast survival is 57.02%, score 208.38 versus shelter-only 190.36 and never-shelter 125.98; median 21 shifts and 60-second timer. Eight variety endings; Cadet 88.62% and Flight Director 8.54% forecast-policy survival. No retuning was necessary. The full-loadout simulator does not prove achievable physical pickup capacity.

**UNVERIFIED: human Commander 8–12-minute pacing and human decisions under ~20 seconds.** Automated decisions are under three seconds; waiting artificially would not validate a human target. The shortage endings suggest prioritizing seeds/food and depositing before searching for a radio. Do not claim the five automated routes all survived. Flight Director's low headless win rate and these physical shortages remain disclosed.

## Shipping checks

64 unit tests pass; core coverage is 99.66% statements, 99.11% branches, 100% functions and 99.81% lines. All 23 pipeline tests and 50 browser checks pass. The final judge offline checks pass separately at both sizes after the native wrapper and guide-copy changes. All eleven full-simulation gates pass without rule changes. Lint, formatting, asset hashes and build pass; npm audit is clean.

Final local Lighthouse mobile: Performance 93, Accessibility 100, Best Practices 100, SEO 100. Simulated 4G: 150 ms RTT, 1,638.4 kbps throughput, 4× CPU slowdown; interaction 2,588.58 ms, LCP 2,588.58 ms, blocking time 82 ms. Raw reports: ignored `playwright-report/prompt9-final-local.*`. Production measurements are appended after deployment. Chrome's installability check in a dedicated persistent mobile profile reports no errors; incognito contexts cannot be used to certify installation.

Production Lighthouse on the deployed shipping build: Performance 96, Accessibility 100, Best Practices 100, SEO 100; interaction 2,129.90 ms, LCP 2,128.90 ms, blocking time 82 ms under the same simulated 4G settings. Report: ignored `playwright-report/prompt9-production-quiet.*`, measured 2026-10-09 09:24 UTC. An earlier concurrent capture/build measurement scored 80 with 4,162.42 ms interaction; it remains in `prompt9-production.*`. These are laboratory measurements, not physical-phone acceptance. The final deployment is measured again before handoff.

The seven screenshot pairs and actual 25.000-second gameplay clip are committed in `docs/submission/`. They show actual pickups, a received forecast and Reveal; the clip ends in Early Ride Home, not a fabricated victory. Extra full-page journal and source views retain the content outside the viewport. Source panels remain checkable. The judge closing audit sits before the long source list, with a direct jump link, so the report counts remain reachable on a phone.

The optional debug APK built in 5m31s on first Gradle assembly and installed on the Android Medium Phone emulator. Hardware Back pauses the scramble timer, returns Settings/Reveal to Title and minimizes at Title. A complete run with emulator Wi-Fi/data disabled reached Reveal without browser errors/warnings. See [release notes](../release/README.md). Physical phone installation, Android/Safari touch feel, in-app browsers, vibration and phone speakers remain UNVERIFIED. An emulator is not a physical device.
