# Prompt 6 — Shelter Days journal

Build a playable journal reached from the real scramble result. The UI reads only `getShiftView`, changes the run with `act`, and advances time with `resolveShift`. Reuse local portraits, icons, textures, fonts and synthesized sound.

Acceptance: day/AM/PM pages; four crew cards and optional BOLT; accessible tap-then-assign tasks; eight wall slots, grouped pantry and explicit item use; immediate shielding changes; resource/resupply status; saved-radio messages and forecast timelines; honest archive association hints; blocking REAL recall decisions and GAME choices; short stamped resolution logs; page/dose animations with reduced-motion support. All controls are at least 44 CSS pixels and keyboard accessible at 360×640 and 1280×720.

Expose only the presentation data missing from the engine view: known source UTC timestamps, difficulty-adjusted dose thresholds and whether a shift is already resolving. Document these additive fields and update the mock contract. Do not expose future actual arrivals, forecast outcomes or hidden mission dates.

Verify three days at both viewport sizes, including a two-day browser regression, shielding consumption, blind mode, forecast/interrupt states, keyboard, offline and ending handoff. Run formatting, lint, coverage, art checks, build and browser checks; inspect screenshots. Commit and push directly to main; verify the Cloudflare production deployment.

Stop at the finished journal/terminal handoff. Prompt 7 owns crew draft, full ending/reveal screens, persistence, settings, tutorial and translations. Do not change survival tuning or NASA archive payloads for UI work. Ask before prompt 7.
