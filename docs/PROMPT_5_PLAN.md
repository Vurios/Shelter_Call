# Prompt 5 — playable lunar scramble

Use the existing pure engine, source countdown, original GLBs, palette, fonts and audio. Add a deterministic render-agnostic controller, an isometric Three.js scene, and a canvas fallback. All movement numbers live in the shared GAME config; archived NASA data and survival balance stay unchanged.

The player starts at the hatch, tags four crew, carries four weighted slots, and deposits supplies/crew by returning. Keyboard, point-to-hop, large navigation aids and optional gamepad use the same motion logic. The timer begins only after loading and explicit input, uses elapsed time, warns during its last ten seconds, and partitions saved/exposed crew at zero. A results screen applies the exact `ScrambleResult` to core and supports replay; Shelter Days UI remains prompt 6.

Use one low directional sun, ambient fill, shadows, seeded stations, instanced supplies/terrain, landing dust, a height-sensitive shadow and gentle camera follow. Cap pixel ratio at 1.5. Offer 2D after three seconds below 25 fps; support a manual switch and immediate WebGL fallback. Switching renderer preserves the run. Dispose renderers, GPU resources, inputs and audio on exit; pause on backgrounding.

Prove deterministic logic, weighted carry/deposit, conga crew, deadline/exposure, safe early closure and real core integration. Play three different seeds at both 1280x720 and 360x640 through ordinary DOM controls, capture/review screenshots, verify tap and keyboard movement, renderer switching, reduced motion, offline first scene load and no errors/overflow. Browser frame-rate samples are local evidence; mid-range Android hardware acceptance remains a separate check.

Update both source/canonical Markdown copies to Cloudflare Pages and direct `main` pushes. Commit working steps on `main`; final validation and deployment run through `.github/workflows/deploy.yml`. Stop and ask before prompt 6.
