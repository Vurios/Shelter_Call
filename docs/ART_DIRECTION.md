# SHELTER CALL art and sound direction

Prompt 4 kit, October 9, 2026. Explore it at [the art and sound journal](https://vurios.github.io/Shelter_Call/?gallery=1).

## Look and feeling

A small, hopeful crew makes a warm home on a cold Moon. Use simple geometric forms, oversized helmets, warm amber doorways, cold blue-grey regolith, and friendly expressions. The journal is pale graph paper with tape, stickers and handwritten headings. No gore, death scenes, frightening imagery, borrowed commercial-game art, real astronaut likenesses or agency insignia.

Low-poly models have explicit face normals, rough untextured materials, named parts and ground-level pivots. Warm directional light comes from a low angle, with cool fill and dark shadows. This is artistic lunar lighting, not a calculation for an archived event date. Gallery previews use illustrative lighting; the future scramble supplies its terrain, low sun and longer shadows.

## Palette and readable type

| Token    | Hex       | Use                                    |
| -------- | --------- | -------------------------------------- |
| Ink      | `#101d2a` | Dark panels, outlines and journal text |
| Regolith | `#8297a4` | Terrain and Pip                        |
| Paper    | `#fff2d5` | Journal pages                          |
| Amber    | `#edb96f` | Warm windows, actions and Dom          |
| Blue     | `#67bbe0` | Information, water and Tunde           |
| Leaf     | `#86cda1` | Plants and Ria                         |
| Coral    | `#ec9384` | Caution accents and Iggy               |
| Violet   | `#b8a4da` | Communications and Mara                |
| Copper   | `#c68c61` | Food, pots and Sol                     |
| White    | `#edf2f6` | Helmets and Aiko                       |

Use Ink text on light tokens, and Paper/White text on Ink. All nine light tokens have at least 5.61:1 contrast against Ink. Light accents against Paper need a dark outline. Danger uses a triangle, stripe count and readable labels. Crew identity uses both suit color and shape. Color alone never communicates danger, dose, identity or tier.

Atkinson Hyperlegible regular/bold is the UI and numeric font. Patrick Hand is for journal headings. The three unmodified TrueType files are hosted locally with `font-display: swap` and their two SIL OFL 1.1 notices. Source revision and per-file credits are in CREDITS.md. Checks read the actual font cmap tables for the Filipino sample, including Ñ/ñ, and browser screenshots show the sample in both families. Future Filipino translation remains prompt 7.

Icons use a 32×32 viewbox, two-pixel rounded strokes and simple silhouettes. Use `public/assets/icons/sprite.svg#<id>` with nearby text. Individual SVG versions are also available. The example REAL icon is a sample, never a claim that art or a simulated event is a verified record.

## Crew and companions

| Crew  | Role          | Suit     | Shape badge       |
| ----- | ------------- | -------- | ----------------- |
| Ria   | Botanist      | Leaf     | Leaf              |
| Dom   | Engineer      | Amber    | Double chevron    |
| Aiko  | Medic         | White    | Heart             |
| Tunde | Geologist     | Blue     | Diamond stone     |
| Mara  | Comms Officer | Violet   | Three signal bars |
| Iggy  | Rover Pilot   | Coral    | Forward wedge     |
| Sol   | Chef          | Copper   | Hexagon           |
| Pip   | Rookie        | Regolith | Stitched square   |

Each has a named-part GLB and four SVG portraits: calm, happy, worried and tired. Faces are fictional, geometric and friendly. Aiko's heart avoids using a protected medical red-cross symbol. Body parts support later hop animation, without adding gameplay physics now.

BOLT has compact treads, two blue eyes, a warm body and one antenna. Kamote is a potted sweet-potato companion with six moods: sprout, content, cheerful, thirsty, worried and proud. Both have original models; BOLT has a portrait and Kamote has six SVG illustrations.

## Kit and templates

The manifest has 29 self-contained GLBs: eight crew, BOLT, Kamote, seven stations, ten other supply types, rock and crater. BOLT doubles as its item pickup. Stations are the hatch, greenhouse, solar field, ice drill, lander, rover bay and lab. Every configured item, task and crew trait has an icon; stats, storm tiers, sound/mute and REAL complete the 38-icon sprite.

Reuse faceted geometry and materials inside each model. No texture downloads, external glTF buffers, Draco decoder or new runtime dependency. Each model stays below 6,000 triangles. Generator output reproduces byte-for-byte.

All ten ending cards use a rounded dark sky, cold terrain and warm accents. Their illustrations match the engine's ending names: crew reunion, science flask, thriving plant, gentle evacuation, flashlight, snack table, forecast chart, lucky die, a lone explorer and a hurried safe return. Skeleton Crew shows a safe lone explorer, never a skeleton. Empty Almanac frames have room for the eventual verified record and no invented dates or NASA IDs.

Journal textures are a repeating grid, torn tape and simple leaf/star stickers. The original doorway favicon and app icons have no agency marks. The important maskable-icon art stays inside the central safe circle.

## Sound

All 28 effects and three music loops are original deterministic Web Audio synthesis. No audio pack, runtime CDN, audio file download or additional synthesis dependency. Every buffer uses a short attack/release envelope and a peak at or below 0.45 before bus gains.

Effects cover hop, landing, pickup, deposit, eight crew chirps, hatch, tick, four B/C/M/X alarm samples, particle whoosh, radio static/beeps, stamp, page, drag, drop, tap and three ending jingles. Each crew has a different pitch/rhythm signature. Alarm pitch and intensity rise with the explicit B/C/M/X input. These are GAME sounds, not physical sounds measured in space. The prompt 3 follow-up found four B-class records in the shipped archive; B has the gentlest cue, and an integration test checks every archived class against the audio API.

Music loops are **Warm windows** (title), **Little moon steps** (scramble), and **A quiet room** (shelter). Switches crossfade over 0.6 seconds. Scramble playback rate rises from 0.85 to 1.7 as the GAME timer falls. Tick spacing falls from 1 to 0.16 seconds. Shelter filtering and gain thin as the GAME shield falls. Loop ends are silent and smooth at the wrap.

Defaults: master 55%, music 30%, SFX 60%. Construction never creates an AudioContext. `unlock()` creates/resumes it inside a player gesture. Mute preserves captions. Eight active effects, one short effect release tail and at most two music tracks limit repeated input. Gain ramps and a compressor provide mix headroom. Hidden pages stop all sounds; leaving disposes resources, while browser-back cache restoration preserves usable controls.

`src/audio/index.js` exposes `createAudio`, `unlock`, `play`, `alarm`, `setTheme`, `setTimer`, `setShield`, `setSettings`, `startTicks`, `stopAll`, `dispose`, and detached `getStatus`. The caller supplies timer/shield data; audio never changes the pure game state. `SOUND_CUES` supplies captions. For later gameplay, call `unlock()` synchronously from the input handler before awaiting it, then play the cue or switch themes.

## Gallery, offline use and regeneration

The journal is a lazy-loaded route at `?gallery=1`. The title keeps the verified mission-setup preview and adds optional title music. No sound autoplays. Every gallery asset is labeled, all sound buttons are captioned, controls work with keyboard/touch, and targets are at least 44 pixels tall. Reduced motion pauses rotation; users can explicitly resume it.

One scissored WebGL renderer serves visible model cards. Device pixel ratio is capped at 1.5, offscreen previews stop rendering, and unavailable WebGL leaves readable model names and the entire SVG/audio journal. This gallery is not the later 2D gameplay fallback.

Vite writes hashed chunks into `bundles/` and original public art into `assets/`. Workbox revisions the art/fonts and manifest icons consistently. Using the same directory for unhashed art and hashed chunks caused duplicate icon cache keys; separating them fixes both offline installation and subsequent art updates. After the initial service worker finishes caching, title, real data, all art/fonts, gallery and synthesis work offline under the repository deployment base. The manifest supports installation; physical-device installation remains untested.

```sh
python tools/fetch-fonts.py  # only to restore the pinned third-party font bytes
npm run art                # regenerate original icons, SVGs, GLBs and manifest
npm run art:check           # verify hashes, counts, model loads, budget and glyphs
```

Fonts are committed; ordinary generation and builds need no network. `.gitattributes` preserves exact asset bytes across Windows/Linux. Do not hand-edit generated files; change their source and regenerate. The plan's asset budget is <15 MB. Final indexed files total 952,160 bytes; the complete asset directory including its manifest totals 994,765 bytes. Sound payload is code, not downloaded audio. Full build size and browser evidence are recorded in DECISIONS.md.

## Evidence and limits

Asset checks load every GLB, verify ground pivots/normals/no textures, enforce counts and hashes, inspect actual font glyphs and calculate palette contrast. Unit tests verify every PCM buffer, distinct chirps, urgency mapping, archived flare-class compatibility, gesture gating, mute, voice caps, crossfades and cleanup. The browser suite exercises all 28 sound buttons, all loops and settings, reduced motion, unavailable WebGL and offline reloads at 1280×720 and 360×640. Screenshots include every model, every crew mood, plant moods, endings, icons, textures and typography.

A real OfflineAudioContext renders an eight-effect-plus-music stress mix at maximum master/SFX gain through the compressor. Local peak is 0.8873 and all samples are finite, below clipping. This proves buffer/mix headroom for that case. It does not establish loudness on physical phone speakers, Android frame rate, real-phone installation, or Safari/in-app-browser playback. Those require device checks later. Interactive scramble, shelter and reveal remain prompts 5–7.
