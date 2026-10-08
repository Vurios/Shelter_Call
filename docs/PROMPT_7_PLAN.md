# Prompt 7 — A complete, learnable mission

Reuse the real-data core, scramble renderers, journal, original ending art and pure collection ledger. Add an application controller for crew draft, a skippable 15-second briefing, practice, saved missions, endings, Reveal and menus. Cadet auto-drafts four crew; Commander stays the default. Do not implement Daily Sun, historic/live missions or the full Almanac before prompt 8.

Save versioned run state and journal presentation after actions and each shift, including blocking decisions. Validate stored data before resuming; blocked or corrupt storage must leave the game playable. Persist settings and an idempotent ending/achievement/source-card ledger separately. Reload resumes the current mission; returning to title offers Continue.

Reveal only uses `buildReveal` after the ending. Show all ten original ending illustrations and kind epilogues, an accessible three-lane SVG timeline with a keyboard scrubber and text equivalent, evaluated forecast comparisons, stats, all source IDs/UTC times and GAME approximations. Separate observations reached during the mission from later archive outcomes.

Provide Play, Daily Sun and Sun Almanac placeholders, Endings, five illustrated How It Works panels grounded in DESIGN sections 1 and 16, Settings and Credits. Add English/Filipino catalogs, text sizes, motion reduction, keyboard/focus support, captions and shape/pattern cues. Practice is a separate 25-second GAME exercise; the real mission keeps its verified countdown. Day 1 coaching is dismissible and replayable.

Prove three complete missions, a fixed-seed title-to-Reveal flow, decision/shift reloads, offline first visits after precaching, storage failure, both languages, reduced motion, keyboard-only controls and 360×640 / 1280×720 layouts. Run repository gates and review screenshots before pushing. Deploy through the existing Cloudflare workflow, verify exact commit and production flow, then ask before prompt 8.
