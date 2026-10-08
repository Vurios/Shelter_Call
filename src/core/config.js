/** All numbers here are GAME approximations, never physical radiation units. */
export const CONFIG = {
  timerMax: 60,
  timerMin: 15,
  dose: [0, 3, 7, 12],
  duration: [0, 4, 8, 10],
  sick: 25,
  medevac: 50,
  water: 1,
  food: 1,
  startPower: 8,
  solar: 1.5,
  science: 5,
  greenhouse: 2,
  drill: 1,
  initialFood: 56,
  initialWater: 56,
  eventEvery: 3,
  eventPower: 1,
  eventScience: 1,
  eventMorale: 2,
  shieldMax: 0.9,
  shieldMassScale: 8,
  wallSlots: 8,
  allClearLevel: 0.5,
  moraleStart: 6,
  moraleMax: 10,
  moraleWeak: 3,
  moraleOutput: 0.8,
  medicReduction: 10,
  medicInterval: 6,
  medReduction: 20,
  batteryPower: 8,
  chefFood: 1.5,
  solarDaily: 3,
  lifePower: 1,
  seedPower: 1,
  radioPower: 1,
  boltPower: 1,
  boltOutput: 0.5,
  powerMax: 30,
  powerGrace: 2,
  eventRepair: 1,
  eventPlant: 1,
  flareMemoryHours: 12,
  alertMemoryHours: 48,
};
export const STARTING_CONFIG = {
  ...CONFIG,
  timerMax: 90,
  dose: [0, 2, 5, 10],
  duration: [0, 2, 4, 6],
  initialFood: 40,
  initialWater: 40,
  science: 2,
};
export const DIFFICULTIES = {
  Cadet: { days: 10, tolerance: 1.5, goal: 12, grace: 3, timer: 1.5 },
  Commander: { days: 12, tolerance: 1, goal: 18, grace: 2, timer: 1 },
  'Flight Director': {
    days: 14,
    tolerance: 0.85,
    goal: 24,
    grace: 2,
    timer: 1,
  },
};
export const CREW = [
  ['ria', 'Ria', 'Botanist'],
  ['dom', 'Dom', 'Engineer'],
  ['aiko', 'Aiko', 'Medic'],
  ['tunde', 'Tunde', 'Geologist'],
  ['mara', 'Mara', 'Comms Officer'],
  ['iggy', 'Iggy', 'Rover Pilot'],
  ['sol', 'Sol', 'Chef'],
  ['pip', 'Pip', 'Rookie'],
].map(([id, name, trait]) => ({ id, name, trait }));
export const ITEM_TYPES = {
  water: { name: 'Water brick', slots: 2, mass: 3 },
  food: { name: 'Food pack', slots: 1, mass: 1 },
  radio: { name: 'Sun Watch radio', slots: 1, mass: 1 },
  dosimeter: { name: 'Dosimeter', slots: 1, mass: 1 },
  seeds: { name: 'Seed cartridge', slots: 1, mass: 1 },
  repair: { name: 'Repair kit', slots: 1, mass: 1 },
  med: { name: 'Med kit', slots: 1, mass: 1 },
  battery: { name: 'Battery pack', slots: 1, mass: 1 },
  guitar: { name: 'Guitar', slots: 1, mass: 1 },
  game: { name: 'Board game', slots: 1, mass: 1 },
  bolt: { name: 'BOLT robot', slots: 2, mass: 1 },
};
export const TASKS = [
  'shelter',
  'greenhouse',
  'solar',
  'drill',
  'salvage',
  'science',
];

// Protect shared configuration; each run owns a detached numeric copy.
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}
[CONFIG, STARTING_CONFIG, DIFFICULTIES, CREW, ITEM_TYPES, TASKS].forEach(
  freeze,
);
