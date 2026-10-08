import { draw } from './rng.js';
import { has, remove } from './rules.js';
// Original, gentle GAME stories. Effects are resource trade-offs, not solar hazards.
const stories = [
  ['Moon dust in the filter.', 'Run the fan', 'Brush it by hand'],
  ['Kamote has a new leaf!', 'Take a plant portrait', 'Record its height'],
  ['Earthrise family call.', 'Wave to Earth', 'Send a postcard'],
  ['The toaster is beeping.', 'Toast a snack', 'Check the cables'],
  ['A crew birthday today.', 'Share a snack', 'Make a paper crown'],
  ['Rover battery is sleepy.', 'Charge the rover', 'Polish its wheels'],
  ['A pebble pinged the greenhouse.', 'Patch the panel', 'Use the spare cover'],
  ['A sock escaped its locker.', 'Start a sock hunt', 'Write a lost-sock song'],
  ['The kettle sings in low gravity.', 'Make warm drinks', 'Record the tune'],
  ['A tiny dust swirl outside.', 'Take a photo', 'Draw its path'],
  ['Kamote leans toward the lamp.', 'Turn the pot', 'Measure the leaves'],
  ['The chess board floats.', 'Tape it down', 'Invent moon chess'],
  ['A glove needs a stitch.', 'Use a repair patch', 'Sew it slowly'],
  ['Earth sent a kind message.', 'Play it aloud', 'Pin it to the wall'],
  ['The lab printer made a spiral.', 'Print a moon map', 'Keep the spiral art'],
  ['A rover wheel squeaks.', 'Oil the axle', 'Name its squeak'],
  ['There is frost on the window.', 'Warm the glass', 'Trace a star'],
  ['The crew found a smooth stone.', 'Study the stone', 'Make it a mascot'],
  [
    'Kamote needs a bedtime story.',
    'Read from the journal',
    'Sing a soft song',
  ],
  ['The fan sounds like a drum.', 'Tune the motor', 'Make a drum beat'],
  ['A tool rolled under a bunk.', 'Use the grabber', 'Build a cardboard hook'],
  ['The crew wants a team name.', 'Hold a radio vote', 'Draw names from a cup'],
  ['A new puzzle arrived from Earth.', 'Print the puzzle', 'Solve it together'],
  ['The water pouch makes bubbles.', 'Take a close-up', 'Count the bubbles'],
  ['A sticker lost its stick.', 'Warm the glue', 'Tape it in the log'],
  ['Moon morning exercise time.', 'Play a lively song', 'Stretch in silence'],
  ['The crew made a tiny kite.', 'Test it with the fan', 'Hang it as art'],
  ['A boot left a funny footprint.', 'Scan the print', 'Sketch a moon duck'],
  ['Kamote casts a long shadow.', 'Light a plant photo', 'Measure the shadow'],
  ['The journal needs a new cover.', 'Print a cover', 'Doodle a garden'],
];
export const EVENT_DECK = stories.map(([text, ...choices], index) => ({
  id: `game-${index}`,
  source: 'GAME',
  text,
  choices,
  kind: [0, 6, 12, 15, 19].includes(index)
    ? 'maintenance'
    : index % 3 === 0
      ? 'plant'
      : index % 3 === 1
        ? 'morale'
        : 'science',
}));
export function nextEvent(state) {
  const event = structuredClone(
    EVENT_DECK[Math.floor(draw(state) * EVENT_DECK.length)],
  );
  if (event.kind === 'maintenance') state.broken = true;
  return event;
}
export function choose(state, choice) {
  if (state.pendingEvent?.kind === 'maintenance' && choice === 0) {
    if (has(state, 'repair'))
      remove(
        state,
        state.wall.concat(state.pantry).find((i) => i.type === 'repair').id,
      );
    state.broken = false;
  }
  if (choice === 0) {
    state.power = Math.max(0, state.power - state.config.eventPower);
    state.morale = Math.min(10, state.morale + state.config.eventMorale);
    state.science += state.config.eventScience;
  } else {
    state.morale = Math.min(
      10,
      state.morale +
        (state.wall
          .concat(state.pantry)
          .some((i) => ['guitar', 'game'].includes(i.type))
          ? 2
          : 1),
    );
  }
  state.plant += state.config.eventPlant;
}
