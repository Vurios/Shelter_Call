# SHELTER CALL

A lunar-outpost game for ages 10–14: gather crew and supplies, decide when to shelter, then compare your calls with the Sun's history.

**Current stage: prompt 1 foundation.** The title screen and mission-setup check run. Engine functions use made-up GAME fixtures. There are no NASA records or full gameplay yet.

[Open the development preview](https://vurios.github.io/Shelter_Call/) · [GitHub repository](https://github.com/Vurios/Shelter_Call)

## Run locally

Use Node.js 22.12+ (Node 24 recommended) and Python 3 for the later data pipeline.

```sh
npm ci
npm run dev
```

## Check and build

```sh
npm run lint
npm run format:check
npm test
npm run build
npm run e2e
npm run preview
```

Playwright automatically uses detected local Chrome/Edge/Chromium. To specify another executable, set `PLAYWRIGHT_EXECUTABLE_PATH`. If none exists, run `npx playwright install chromium`. Screenshots at 1280×720 and 360×640 are written under `test-results/`.

`npm run data` is reserved for the Python pipeline in prompt 2. `npm run sim` is reserved for the balance simulator in prompt 3. Both currently exit with an explanatory message.

## Deploy

The GitHub Action validates changes and deploys `main` to GitHub Pages using the repository base path. Pages must use GitHub Actions as its publishing source. The production placeholder is precached for offline reloads after first load; a full offline game and installable app come later.

## Project notes

- [Design](docs/DESIGN.md)
- [Build prompts](docs/CLAUDE_CODE_PROMPTS.md)
- [Agent instructions](CLAUDE.md)
- [Decision log](docs/DECISIONS.md)
- [Credits](CREDITS.md)

Original root Markdown files remain for existing IDE tabs; use the `docs/` copies for future specification edits. Prompt 1 was built with OpenAI Codex assistance. No agency insignia or commercial-game assets are used.
