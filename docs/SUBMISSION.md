# SHELTER CALL submission draft

Draft only; nothing submitted externally. Team, challenge, event and account details are **UNVERIFIED**. The current guide URL returned 502 on October 9, 2026. Fields below match the public [official 2025 project-page structure](https://www.spaceappschallenge.org/2025/find-a-team/biovoyager/?tab=project), not a verified 2026 edit form. Exact 2026 labels, required uploads and length limits are **UNVERIFIED**; reconcile these drafts in the team's real form.

## Project name

SHELTER CALL

## Summary / high-level project summary

A warm shelter. A real Sun. Your call. In SHELTER CALL, players gather a lunar crew and supplies, build a wall that is also their pantry, and decide when to work outside. Archived NASA space-weather records set the timing. Reveal compares their decisions with forecasts and recorded events. The fictional survival rules are clearly marked GAME.

## Project demonstration / demo

- [Play the judge tour](https://shelter-call.pages.dev/?judge=1)
- [Gameplay clip](submission/gameplay.webm): actual browser controls, Scramble → forecast → Reveal; no invented NASA events or staged victory.
- [Seven desktop and mobile views](submission/)
- Public video-host link, if the real form requires one: **UNVERIFIED / not uploaded**. The repository clip is the available artifact.

## Project / final project

[Playable Cloudflare Pages build](https://shelter-call.pages.dev/) and [source repository](https://github.com/Vurios/Shelter_Call). English and Filipino UI, touch/keyboard controls, offline archive after the service-worker cache completes. Physical-phone installation and device acceptance are **UNVERIFIED**.

## Project details

Our intended audience is ages 10–14, with Cadet offering a more forgiving introduction. Players rescue crew before a short GAME clock ends. In Shelter Days, they assign work, read a saved radio, and use supplies as shielding. Eating the wall can leave a gap. A forecast asks a question rather than guaranteeing safety. The ending brings care or a return home; Reveal opens the recorded dates and source IDs.

The Python pipeline fetches NASA DONKI records, preserves cache checksums, and joins documented event links. It uses first Earth-arrival predictions, linked observations and conservative particle grouping. Records are never tuned for difficulty. The audited archive provides 74 playable windows, 77 clean countdowns and 124 independent clean CME-arrival pairs. The complete report explains missing links, revisions, censored forecasts and Earth-to-Moon limitations.

The judge tour uses the playable May 11, 2024 case. Its linked flare starts at 01:10 UTC; near-Earth particle onset is 02:10 UTC, a 60-minute gap. The attached alert is 02:30 UTC, 20 minutes after onset. This is one recorded case, not an assertion about every warning or a measurement at the Moon.

Vanilla JavaScript/Vite handles the app; Three.js handles the original outpost; the pure seeded engine handles GAME outcomes. Vitest, Playwright and Python checks support reproducibility. The physical playtests include early shortage endings, which are disclosed. **UNVERIFIED:** educational impact, human 8–12-minute pacing, classroom acceptance or increased real-world decision skill. These need human evaluation.

## Use of artificial intelligence (AI)

OpenAI Codex assisted with design implementation, JavaScript/Python, original procedural art and audio, translation drafts, documentation and automated checks. The user supplied the design, build prompts and approvals. AI did not generate NASA event records. The source pipeline and tests retain IDs/provenance; forecasts are labelled predictions. No runtime AI service is required. Human review of Filipino wording with target readers is **UNVERIFIED**. Additional team AI tools: **UNVERIFIED** until the team confirms them.

## NASA data

- [NASA CCMC DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/): flare starts, grouped near-Earth particle onset, attached alert times, WSA-Enlil Earth predictions and documented shock links.
- [May 2024 SEP source](https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31)
- [Data report and provenance rules](../data-pipeline/REPORT.md)
- [Shipped episodes](../public/data/episodes.json) and [verified showcase](../public/data/showcase.json)

## Space agency partner and other data / resources

No additional measured event dataset is used. Context references: [NASA Orion crew systems](https://www.nasa.gov/reference/crew-systems/) and [WSA-Enlil verification study](https://arxiv.org/abs/1801.07818), listed in DESIGN §16. Open fonts and software are attributed in [CREDITS](../CREDITS.md). No NASA insignia, astronaut likenesses or commercial-game assets.

## Challenge, team and event metadata

| Field                                          | Draft                                                                                                                                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chosen official challenge / challenge response | **UNVERIFIED.** Match the actual selected challenge; do not invent eligibility. Proposed response: teach forecast uncertainty through a playable space-weather story with checkable records. |
| Team name and members                          | **UNVERIFIED.** Repository owner: Vurios; this is a handle, not a confirmed legal identity or team roster.                                                                                   |
| Local event / country / year                   | **UNVERIFIED.** Workspace timezone is not evidence of event registration.                                                                                                                    |
| Tags, if offered                               | Game; space weather; NASA DONKI; education; offline; accessibility                                                                                                                           |
| Team image / cover                             | Original outpost title image; no agency branding. Use screenshot 01 if accepted by the form.                                                                                                 |
| Acknowledgments                                | NASA GSFC / CCMC DONKI for public source records; font and open-tool authors in CREDITS.                                                                                                     |
| Additional links                               | PLAYTEST.md, data-pipeline/REPORT.md, tools/balance-report.md and source repository                                                                                                          |

## Thirty-second video script and shot list

| Time    | Shot                                | Narration                                                                           |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| 0–5 s   | Original outpost, crew and hatch    | “A real Sun. A warm shelter. Your call.”                                            |
| 5–10 s  | Physical pickup and return          | “Save your crew and supplies before the GAME clock ends.”                           |
| 10–17 s | Supply wall and forecast card       | “Your pantry is your wall. NASA predictions help you choose: shelter or work?”      |
| 17–24 s | Reveal's three lanes and source IDs | “Then reveal the dates. Compare your choices with forecasts and what was recorded.” |
| 24–30 s | What's real and closing audit       | “Earth records are real. Moon dose and survival are GAME rules. Play SHELTER CALL.” |

The committed clip records real gameplay without narration. This script is a voiceover draft, not a claim that a narrated video has been produced.

## Ninety-second live pitch with class vote

**0–15 s:** “Can a prediction tell you when to go outside? This is SHELTER CALL. Our Moon outpost is fictional, but the Sun's records are real. You save crew, gather supplies and build a shelter wall from the same supplies you need to eat.”

**15–35 s:** “The judge path starts from May 11, 2024. The linked flare-to-particle gap in our report is sixty minutes. An attached alert came twenty minutes after the onset. We shorten the game clock, clearly marked GAME; we keep the source timing.”

**35–55 s, class vote:** Open a received Sun Watch forecast. “This triangle is a prediction, not a detection. Hands up: shelter, or keep working?” Pause for the vote. Set crew tasks accordingly; press Finish shift. Classroom mode can pause each forecast for the same vote. Do not predict a guaranteed victory.

**55–75 s:** “Food and water matter twice: supplies and wall mass. At midnight we may eat a gap in our cover. At the end, Reveal shows our calls, the NASA predictions and the observed records, each with checkable IDs.”

**75–90 s:** “Our audited pipeline supplies seventy-four playable windows. Dose, decay and crew outcomes are game approximations, not safety guidance. The archive works offline after caching. We want students to ask what a forecast means, and to check the evidence. Testing that learning benefit with real students is still ahead.”

## Seven screenshot captions

Each number has a 1280×720 desktop and 360×640 mobile view; journal/source panels also have full-page copies where needed. Screenshots depict the real build, not mockups.

1. **Title:** A warm shelter, a real Sun, and accessible controls. [Desktop](submission/01-title-desktop.png) · [Mobile](submission/01-title-mobile.png)
2. **Scramble:** Rescue crew and physically deposit supplies at the glowing hatch. The shorter timer is GAME. [Desktop](submission/02-scramble-desktop.png) · [Mobile](submission/02-scramble-mobile.png)
3. **Hatch:** Saved crew and pickups enter the same mission; Cadet's labelled reserve is separate. [Desktop](submission/03-hatch-desktop.png) · [Mobile](submission/03-hatch-mobile.png)
4. **Journal:** The pantry is the wall; tasks persist until changed and meals can open a gap. [Desktop](submission/04-journal-desktop.png) · [Mobile](submission/04-journal-mobile.png)
5. **Forecast:** A received NASA prediction with source ID and archive error band; a prediction is not a detection. [Desktop](submission/05-forecast-desktop.png) · [Mobile](submission/05-forecast-mobile.png)
6. **Reveal:** Your calls, forecasts and recorded events share a checkable UTC timeline. [Desktop](submission/06-reveal-desktop.png) · [Mobile](submission/06-reveal-mobile.png)
7. **What's real:** Open source IDs, GAME approximations and the report's archive-quality gates. [Desktop](submission/07-real-desktop.png) · [Mobile](submission/07-real-mobile.png)

## Claim verification ledger

| Claim used here and in README                                                                              | Evidence / status                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 74 windows, 77 countdowns, 124 independent clean pairs                                                     | REPORT opening GO line and Counts; verified locally                                                                                                    |
| Query 2010-01-01 through 2026-10-08; fetched October 8                                                     | REPORT source range/provenance; verified locally                                                                                                       |
| May 11 timing 01:10 → 02:10; alert 02:30; 60 / 20 min                                                      | REPORT May 11 source sanity check; verified locally                                                                                                    |
| First Earth forecasts, conservative grouping, documented shock links                                       | REPORT assumptions; verified locally                                                                                                                   |
| Research-quality data; model predictions are not detections; Earth timing proxies Moon                     | REPORT assumptions/How we use NASA data and DESIGN §16 DONKI reference                                                                                 |
| Fictional dose/decay/shielding/crew outcomes; no physical Moon dose claim                                  | REPORT final paragraphs; DESIGN §16 application contract                                                                                               |
| Orion stowage/supply shelter is context, not our numeric wall rule                                         | DESIGN §16 NASA crew-systems link; no additional scientific claim made                                                                                 |
| Seeded rules, archive/offline path, UI/features/build commands                                             | Local code and automated checks; implementation claims, not independent science evidence. DESIGN §16 contracts cover the application.                  |
| Team identity, challenge fit/eligibility, event entry, human learning/pacing, physical-device installation | **UNVERIFIED**; no fabricated participants, results or approvals                                                                                       |
| Exact current form fields and limits                                                                       | **UNVERIFIED**; official public 2025 project page supports this draft structure; unavailable 2026 edit form does not support current-form completeness |

No submission claim states that NASA endorses this project or that GAME relative dose is a physical radiation unit.
