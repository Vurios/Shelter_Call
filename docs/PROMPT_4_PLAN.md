# Prompt 4 implementation plan

Status: approved and built on October 9, 2026. Final art direction and evidence are in ART_DIRECTION.md and DECISIONS.md.

## Result

Create the complete art and audio kit from prompt 4, with a usable offline gallery at `/?gallery=1`. Preserve the real-data engine and mission-setup preview. Finish with screenshots, asset and audio checks, credits, a commit, and verified Cloudflare Pages deployment. Stop before prompt 5.

## Visual direction

Use hopeful, cozy lunar science fiction: blue-grey terrain, warm habitat windows, oversized helmets, soft geometric silhouettes, and a pale crew journal with graph paper, tape and original doodles. Low-angle lighting evokes the setting; it does not simulate lighting for the archived NASA event date.

Ten shared UI palette tokens:

| Token    | Color     | Main use                               |
| -------- | --------- | -------------------------------------- |
| Ink      | `#101d2a` | Space panels, outlines, journal text   |
| Regolith | `#8297a4` | Terrain, secondary text, Pip           |
| Paper    | `#fff2d5` | Journal pages, tape                    |
| Amber    | `#edb96f` | Habitat light, actions, Dom            |
| Blue     | `#67bbe0` | Forecast information, Tunde            |
| Leaf     | `#86cda1` | Plants, supplies, Ria                  |
| Coral    | `#ec9384` | Caution accents, Iggy                  |
| Violet   | `#b8a4da` | Communications, Mara                   |
| Copper   | `#c68c61` | Pantry accents, Sol                    |
| White    | `#edf2f6` | Helmets, primary dark-panel text, Aiko |

All nine lighter tokens have at least 5.61:1 contrast with Ink, calculated locally. Use Ink text on light colors; light text on Ink. Light accents on Paper require dark outlines or dark text. Pair danger and dose with labels, shapes and patterns.

Typography: locally host unmodified Atkinson Hyperlegible regular/bold for body text and numbers, and Patrick Hand for journal headings. Retain their SIL OFL licenses and credit files. Both source metadata files list Latin and Latin-ext; verify Filipino sample glyphs in the actual downloaded fonts and browser. Use system fallbacks and `font-display: swap`.

Font sources verified during planning:

- [Atkinson Hyperlegible license](https://github.com/google/fonts/blob/main/ofl/atkinsonhyperlegible/OFL.txt) and [metadata](https://github.com/google/fonts/blob/main/ofl/atkinsonhyperlegible/METADATA.pb).
- [Patrick Hand license](https://github.com/google/fonts/blob/main/ofl/patrickhand/OFL.txt) and [metadata](https://github.com/google/fonts/blob/main/ofl/patrickhand/METADATA.pb).

## Original asset kit

Create `docs/ART_DIRECTION.md` from this approved direction. Generate original SVG art and reusable low-poly Three.js model factories, then export self-contained GLB files. Keep regeneration scripts and an asset manifest with stable IDs, sizes and provenance. Avoid large bitmap textures.

| Crew  | Suit     | Shape accent             |
| ----- | -------- | ------------------------ |
| Ria   | Leaf     | Leaf-shaped shoulder tab |
| Dom   | Amber    | Double chevron           |
| Aiko  | White    | Heart tab                |
| Tunde | Blue     | Diamond stone            |
| Mara  | Violet   | Three signal bars        |
| Iggy  | Coral    | Forward wedge            |
| Sol   | Copper   | Rounded hexagon          |
| Pip   | Regolith | Stitched square          |

- Eight crew models with named body parts and ground-level pivots for later hopping. Matching SVG portraits in calm, happy, worried and tired moods. Facial features remain fictional and geometric.
- BOLT model and portrait; Kamote model with six SVG moods: sprout, content, cheerful, thirsty, worried and proud.
- Models for hatch, greenhouse, solar field, ice drill, lander, rover bay and lab. Pickup models for every configured item type; BOLT's existing model doubles as its pickup. Reusable rock and crater props.
- SVG icon sprite covering every item, task, crew trait, stat, storm tier, sound control and REAL stamp. Pair icons with readable text in the gallery. Example REAL stamps are explicitly icon samples, not event records.
- Ten kind ending illustrations keyed to the engine's ending names, plus an empty Almanac card frame. No invented dates, measurements or NASA IDs in sample cards.
- Seamless SVG journal grid, tape and sticker textures. Original favicon, regular app icon and maskable app icon. Keep important icon artwork inside the maskable safe area.
- All models use simple materials and shared geometry where practical. Aim below 5 MB for the kit; enforce the prompt's hard asset limit of 15 MB. No NASA insignia, real astronaut likenesses or borrowed commercial-game designs.

## Audio kit

Use original procedural Web Audio sounds and music; no external audio packs or new runtime synthesis dependency is needed. Keep audio outside `src/core`.

- SFX: hop, landing, pickup, deposit, eight distinct crew-tag chirps, hatch, accelerating timer tick, alarm, storm whoosh, radio static/beep, REAL stamp, page flip, drag/drop, tap and three ending jingles.
- Three loopable themes: calm title, rising scramble tension and shelter ambience. Crossfade themes; tie scramble tempo to remaining time and shelter texture to shield strength. These mappings are GAME presentation.
- Flare class changes alarm pitch/intensity through an explicit input. Gallery buttons use clearly labeled C/M/X sound examples.
- `src/audio` exposes unlock, SFX playback, theme switching, timer/shield updates, volume/mute and disposal. Start or resume AudioContext only after user input. Separate master/music/SFX controls and captions for key cues.
- Use gain ramps and conservative default levels. Check generated buffers with OfflineAudioContext for finite samples, headroom and clipping; cap simultaneous voices. Provide a stop-all control for the gallery.
- Local automated checks cannot establish loudness on physical phone speakers. Report that limit separately from buffer checks and browser playback.

## Gallery and integration

- Lazy-load the gallery and Three.js only for `?gallery=1`. Keep existing mission setup accessible through the normal title screen.
- Show every model rotating, every icon, all portrait and Kamote moods, ending artwork, textures, colors, font samples and sound buttons. Use a responsive grid with section links and readable item names.
- Reuse one renderer for visible model cards, cap pixel ratio at 1.5, pause offscreen previews and dispose resources. Reduced motion disables automatic rotation; provide pause controls. Handle unavailable WebGL with a clear fallback rather than a broken page.
- Controls work with touch, mouse and keyboard, with visible focus and at least 44-pixel targets. Sound captions appear near playback controls. Keep browser autoplay silent.
- Apply the approved tokens/fonts to the existing title without replacing its mission-setup behavior. Full scramble, journal, reveal and collection screens remain their later prompts.
- Extend PWA caching for generated models, fonts, icons and any rendered audio files. All asset URLs must work under the `/Shelter_Call/` deployment base. Runtime asset loading must not use a CDN.
- Update CREDITS for every downloaded font file and retained license, plus any dependency actually added. Identify original project art/audio and generation sources.

## Verification and finish

- Validate asset manifest completeness, all model loads, portrait/ending counts, accessible color combinations, font glyphs and total byte size. Verify regenerated assets are deterministic where applicable.
- Use focused tests for audio settings, unlock/mute behavior, caption mapping and buffer validity. Preserve the core coverage gate; art/audio does not justify changing NASA data or balance rules.
- Run lint, formatting, unit/coverage tests, build and Playwright. Check title and gallery at 1280x720 and 360x640, including every gallery section, keyboard controls, reduced motion and offline reload.
- Exercise each sound button, capture desktop/mobile screenshots, and review models and SVGs visually. Check console errors and network failures. Report physical-phone validation separately.
- Record measured asset size and any material limitations. Update README, CLAUDE and DECISIONS, commit, push, verify CI/Pages, and ask before prompt 5.

## Approval record

The user approved this plan on October 9, 2026, and explicitly waived separate plan approvals for later prompts. Continue planning and executing the requested prompt autonomously; ask before starting the next numbered prompt. The original playbook remains intact, with this session instruction taking precedence.
