// Browser-test fixture, bundled in memory by Playwright; never shipped in dist.
// Full loadout isolates journal acceptance, not physical scramble capacity.
import {
  createRun,
  getScrambleSetup,
  applyScrambleResult,
  act,
} from '../../src/core/api.js';
import { mountShelter } from '../../src/ui/shelter/index.js';
import { createStorage } from '../../src/app/storage.js';
import '../../src/ui/styles/main.css';
const scenario = new URLSearchParams(location.search).get('case');
const run = createRun({
  seed: 'journal-acceptance',
  mode: 'judge',
  difficulty: scenario === 'director' ? 'Flight Director' : 'Cadet',
  classroom: scenario === 'classroom',
  ...(['interrupt', 'persist'].includes(scenario)
    ? { windowId: '2011-09-24T20:45:00-WINDOW-001' }
    : {}),
  ...(scenario === 'comms' ? { crewIds: ['mara', 'iggy', 'sol', 'pip'] } : {}),
});
const setup = getScrambleSetup(run);
applyScrambleResult(run, {
  crewSaved: setup.crewSpawns.map((c) => c.id),
  crewExposed: [],
  itemsSaved: scenario === 'blind' ? [] : setup.itemSpawns.map((i) => i.id),
  timeLeft: 0,
});
if (scenario === 'director')
  setup.itemSpawns
    .filter((i) => i.type === 'water')
    .slice(0, 8)
    .forEach((item) => {
      act(run, { type: 'moveItem', itemId: item.id, to: 'wall' });
    });
if (scenario === 'persist')
  act(run, { type: 'assignCrew', crewId: 'ria', task: 'science' });
const storage = createStorage();
mountShelter({
  run,
  settings: { classroom: scenario === 'classroom' },
  ...(['persist', 'classroom'].includes(scenario)
    ? {
        onSave: (journal) =>
          storage.saveMission(
            run,
            run.phase === 'ending' ? 'ending' : 'shelter',
            journal,
          ),
      }
    : {}),
  onExit: () => {
    document.querySelector('#app').innerHTML = '<h1>Fixture title</h1>';
  },
  onReplay: () => location.reload(),
});
