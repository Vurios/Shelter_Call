import { parentPort, workerData } from 'node:worker_threads';
import { runBot } from './bots.mjs';
// Isolated CPU jobs; every worker uses the identical seed list and pure engine.
parentPort.postMessage(
  Array.from({ length: workerData.samples }, (_, i) =>
    runBot({ seed: `balance:${i}`, ...workerData }),
  ),
);
