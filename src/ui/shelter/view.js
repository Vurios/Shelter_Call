import { itemIcon } from '../../art/items.js';
import { t } from '../../i18n/index.js';
// Presentation only: every value comes from the detached public shift view.
export const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  );
export const icon = (name) =>
  `<img class="journal-icon" src="/assets/icons/${escape(itemIcon(name))}.svg" alt="">`;
export const TASK_LABELS = {
  shelter: 'In shelter',
  greenhouse: 'Greenhouse',
  solar: 'Solar repair',
  drill: 'Ice drill',
  salvage: 'Salvage lander',
  science: 'Science walk',
};
const traitIcons = {
  Botanist: 'ria',
  Engineer: 'dom',
  Medic: 'aiko',
  Geologist: 'tunde',
  'Comms Officer': 'mara',
  'Rover Pilot': 'iggy',
  Chef: 'sol',
  Rookie: 'pip',
};
const taskHints = {
  shelter: 'Stay behind the wall',
  greenhouse: 'EVA · food, needs seeds',
  solar: 'EVA · make power',
  drill: 'EVA · make water',
  salvage: 'EVA · find supplies',
  science: 'EVA · science points',
};
export function stamp(row, label = 'UTC') {
  return `<details class="source-stamp"><summary title="${escape(row.donkiId)} · ${label}: ${escape(row.utc)}">${icon(row.source === 'REAL' ? 'real' : 'game')}${escape(row.source)} · source</summary><small>${escape(row.donkiId)}<br>${label}: <time>${escape(row.utc)}</time></small></details>`;
}
export function rateHint(flareClass, rate) {
  const letter = String(flareClass)[0];
  return rate == null
    ? `Our archive has no particle-rate estimate for ${letter}-class flares. Unknown does not mean safe.`
    : `About ${Math.round(rate * 100)} in 100 ${letter}-class flares in our archive were linked to particles. A flare is a warning, not a promise.`;
}
function doseMeter(crew, thresholds) {
  if (crew.dose == null)
    return `<p class="crew-dose">${icon('dosimeter')}No meter · ${escape(crew.symptoms)}</p>`;
  const fraction = Math.min(100, (crew.dose / thresholds.medevac) * 100);
  return `<div class="crew-dose">${icon('dose')}<span>${crew.dose} relative rad · GAME</span></div><div class="dose-track" role="meter" aria-label="${escape(crew.name)} relative GAME dose" aria-valuemin="0" aria-valuemax="${thresholds.medevac}" aria-valuenow="${Math.min(crew.dose, thresholds.medevac)}" aria-valuetext="${crew.dose} relative rad; sick at ${thresholds.sick}; ride home at ${thresholds.medevac}"><span style="width:${fraction}%"></span><i style="left:${(thresholds.sick / thresholds.medevac) * 100}%"></i></div>`;
}
function crewCard(crew, view, selected) {
  const away = crew.assignment !== 'shelter';
  const mood =
    crew.status !== 'healthy'
      ? 'worried'
      : crew.hunger || crew.thirst
        ? 'tired'
        : 'calm';
  return `<button type="button" class="crew-card ${away ? 'crew-away' : ''}" data-crew="${crew.id}" data-key="crew-${crew.id}" aria-pressed="${selected === crew.id}" ${crew.status === 'medevac' ? 'disabled' : ''}>
  <span class="crew-identity"><img class="crew-portrait" src="/assets/portraits/${crew.id}-${mood}.svg" alt=""><span><strong>${escape(crew.name)}</strong><span class="crew-trait">${icon(`trait-${traitIcons[crew.trait] ?? 'pip'}`)}${escape(crew.trait)}</span></span></span>
  <span class="assignment-tag">${icon(crew.assignment)}${TASK_LABELS[crew.assignment]}</span>
  <span class="crew-needs">${icon('food')}Hunger ${crew.hunger} · ${icon('water')}Thirst ${crew.thirst}</span>
  ${doseMeter(crew, view.doseThresholds)}<span class="health-tag">${crew.status === 'rad-sick' ? 'Needs a rest' : crew.status === 'medevac' ? 'Ride home needed' : escape(crew.symptoms)}</span></button>`;
}
export function forecastCard(card) {
  const bands = card.bandHours;
  const low = Math.min(0, card.arrivalInHours + (bands?.[0] ?? 0)) - 12;
  const high = Math.max(0, card.arrivalInHours + (bands?.[1] ?? 0)) + 12;
  const x = (hours) => 16 + ((hours - low) / (high - low)) * 208;
  const countdown =
    card.arrivalInHours > 0
      ? `${(card.arrivalInHours / 12).toFixed(1)} shifts to predicted arrival`
      : 'Predicted arrival time has passed. Check new warnings; this is not an all-clear.';
  return `<article class="forecast-card"><strong>${icon('radio')}CME forecast</strong><p>${countdown}</p><svg class="forecast-timeline" viewBox="0 0 240 54" role="img" aria-label="Predicted arrival timeline${bands ? `; archive middle-half error band ${bands[0]} to ${bands[1]} hours` : '; uncertainty band hidden'}"><path d="M16 30H224" stroke="currentColor" stroke-width="2"/>${bands ? `<rect x="${x(card.arrivalInHours + bands[0])}" y="22" width="${x(card.arrivalInHours + bands[1]) - x(card.arrivalInHours + bands[0])}" height="16" rx="4" fill="#b8a4da"/>` : ''}<path d="M${x(0)} 17V38" stroke="currentColor" stroke-width="2"/><path d="M${x(card.arrivalInHours)} 27l-5 -8h10z" fill="#101d2a"/><text x="${x(0)}" y="51" text-anchor="middle">Now</text><text x="${x(card.arrivalInHours)}" y="11" text-anchor="middle">Arrival</text></svg><small>${bands ? `Archive error band: ${(bands[0] / 12).toFixed(1)} to +${(bands[1] / 12).toFixed(1)} shifts. Not a guarantee.` : card.bandReason === 'unknown' ? 'No measured error band in these records. Uncertainty is unknown.' : 'Flight Director: uncertainty band hidden.'}</small>${card.issueHour != null ? `<p class="comms-note">Mara decodes: issued ${(-card.issueHour / 12).toFixed(1)} shifts ago${card.kpRange ? ` · predicted Earth Kp ${card.kpRange.join('–')}` : ''}.</p>` : ''}${stamp(card, 'Predicted UTC')}${card.issuedUtc ? `<small>Issued UTC: ${escape(card.issuedUtc)}</small>` : ''}</article>`;
}
function radioPanel(view) {
  const sensor = view.electronWarnings?.length
    ? `<section class="journal-radio sensor-note"><h2>${icon('dosimeter')}MODEL sensor</h2>${view.electronWarnings.map((row) => `<article><p>${escape(row.text)}</p><small>Recorded MODEL lead: ${row.modelLeadMin} minutes. Not a guarantee.</small>${stamp(row, 'Recorded MODEL UTC')}</article>`).join('')}</section>`
    : '';
  return sensor + receivedRadioPanel(view);
}
function receivedRadioPanel(view) {
  if (!view.radio)
    return `<section class="journal-radio blind-note" aria-labelledby="radio-heading"><h2 id="radio-heading">${icon('radio')}No radio…</h2><p>You're on your own! Watch how the crew feels${view.dosimeter ? ' and check your dosimeter' : ''}.</p><small>No forecasts or flare warnings. Bring tired crew inside. Ice drill brings water; salvage can find food or seeds.</small></section>`;
  const messages = view.radioMessages
    .slice()
    .sort((a, b) => a.hoursAgo - b.hoursAgo);
  const message = (row) =>
    `<article class="radio-message"><p>${row.class ? `<strong class="flare-badge">${icon('solar')}${escape(row.class)}</strong>` : icon('radio')} ${escape(row.text)} <small>${(row.hoursAgo / 12).toFixed(1)} shifts ago</small></p>${row.class ? `<p>${escape(rateHint(row.class, row.associationRate))}</p>` : ''}${stamp(row)}</article>`;
  return `<section class="journal-radio" aria-labelledby="radio-heading"><h2 id="radio-heading">${icon('radio')}Sun Watch <span class="radio-light" aria-label="Radio saved"></span></h2><p class="section-note">Messages from the real Sun. Predictions can miss.</p>${view.forecastCards.slice(-3).map(forecastCard).join('') || '<p class="quiet-radio">No CME forecasts received yet.</p>'}${messages.slice(0, 3).map(message).join('') || '<p class="quiet-radio">Quiet radio. No new alerts in these records yet. Quiet does not mean safe.</p>'}${messages.length > 3 || view.forecastCards.length > 3 ? `<details class="older-radio"><summary>Earlier records (${Math.max(0, messages.length - 3) + Math.max(0, view.forecastCards.length - 3)})</summary>${view.forecastCards.slice(0, -3).map(forecastCard).join('')}${messages.slice(3).map(message).join('')}</details>` : ''}</section>`;
}
function wallPanel(view, selection, slots) {
  const items = view.wall.concat(view.pantry);
  const selected = items.find((item) => item.id === selection.item);
  const groups = new Map();
  view.pantry.forEach((item) => {
    if (!groups.has(item.type)) groups.set(item.type, []);
    groups.get(item.type).push(item);
  });
  const itemButton = (item, index) =>
    `<button type="button" class="wall-slot" data-item="${item?.id ?? ''}" data-slot="${index}" data-key="wall-${index}" aria-pressed="${Boolean(item && selected?.id === item.id)}" aria-label="${item ? `Wall slot ${index + 1}: ${escape(item.name)}` : `Empty wall slot ${index + 1}`}">${item ? `${icon(item.type)}<span>${escape(item.name)}</span>` : '<span class="gap-symbol" aria-hidden="true">＋</span><span>Gap</span>'}</button>`;
  const wall = slots.map((id, index) =>
    itemButton(
      view.wall.find((i) => i.id === id),
      index,
    ),
  );
  wall.splice(
    4,
    0,
    `<div class="crew-pod" aria-label="Crew pod inside the supply wall">${icon('shelter')}<strong>Crew pod</strong><small>Cozy inside</small></div>`,
  );
  return `<section class="wall-panel" aria-labelledby="wall-heading"><h2 id="wall-heading">${icon('shield')}Your wall is your pantry</h2><div class="shield-readout"><strong>SHIELD <span id="shield-value">${Math.round(view.shield * 100)}%</span></strong><meter min="0" max="90" value="${view.shield * 100}" aria-label="GAME shielding percentage"></meter></div><p class="section-note">Eight slots. More mass, more cover. Eat a wall, leave a gap!</p><div class="wall-grid">${wall.join('')}</div><h3>Pantry shelf <span>${view.pantry.length} supplies</span></h3><div class="pantry-shelf" data-drop="pantry">${[...groups.values()].map((group) => `<button type="button" data-item="${group.find((i) => i.id === selected?.id)?.id ?? group[0].id}" data-key="pantry-${group[0].type}" aria-pressed="${group.some((i) => i.id === selected?.id)}">${icon(group[0].type)}<span>${escape(group[0].name)}<strong> ×${group.length}</strong></span></button>`).join('') || '<p>No supplies on the shelf. Ice drill and salvage can help.</p>'}</div><div class="item-tools">${
    selected
      ? `<p><strong>${escape(selected.name)}</strong> · ${selected.mass} GAME mass · ${view.wall.some((i) => i.id === selected.id) ? 'in wall' : 'on shelf'}</p><div class="item-actions"><button type="button" data-action="move" data-key="move-item" ${view.pantry.some((i) => i.id === selected.id) && view.wall.length >= 8 ? 'disabled' : ''}>${view.wall.some((i) => i.id === selected.id) ? 'Move to shelf' : 'Put in wall'}</button>${['food', 'water', 'med', 'repair', 'battery', 'game', 'guitar'].includes(selected.type) ? `<button type="button" data-action="use" data-key="use-item">${['food', 'water'].includes(selected.type) ? (selected.type === 'food' ? 'Eat' : 'Drink') : 'Use'} ${escape(selected.name)}</button>` : ''}</div>${
          ['food', 'water', 'med'].includes(selected.type)
            ? `<label class="recipient-label">For crew <select id="item-recipient" data-key="recipient">${view.crew
                .filter((c) => c.status !== 'medevac')
                .map(
                  (c) =>
                    `<option value="${c.id}" ${c.id === selection.recipient ? 'selected' : ''}>${escape(c.name)}</option>`,
                )
                .join('')}</select></label>`
            : ''
        }`
      : '<p>Tap a supply, then put it in the wall or use it. Meals at midnight use shelf food first.</p>'
  }</div></section>`;
}
export function renderJournal(view, selection, slots, logs, sound) {
  const selectedCrew =
    selection.crew === 'bolt'
      ? { name: 'BOLT', assignment: view.boltTask }
      : view.crew.find((c) => c.id === selection.crew);
  const inventory = view.wall.concat(view.pantry);
  const seeds = inventory.some((i) => i.type === 'seeds');
  const disabled =
    view.phase !== 'shelter' ||
    view.resolving ||
    view.pendingEvent ||
    view.interrupt;
  const doseNotice = view.dosimeter
    ? `<p class="meter-note">${icon('dosimeter')}GAME dose: rest at ${view.doseThresholds.sick} · ride home at ${view.doseThresholds.medevac}. ${view.allClear ? 'Meter: low particles. You choose when to go out.' : `Meter: ${view.particleLevel} relative rad per shift outside. Shelter helps.`}</p>`
    : '<p class="meter-note">No dosimeter saved. Symptoms only; exact dose is hidden.</p>';
  return `<header class="journal-header"><div><p class="journal-eyebrow">SHELTER CALL / CREW LOGBOOK</p><h1 tabindex="-1">Day ${view.day} <span>· ${view.shift}</span></h1></div><div class="journal-header-tools"><button type="button" data-action="sound" data-key="sound" aria-pressed="${sound}">${icon(sound ? 'sound' : 'mute')}${sound ? 'Sound on' : 'Sound off'}</button><button type="button" data-action="exit" data-key="exit">Title</button></div></header><div class="journal-status" aria-label="Shelter resources">${[
    ['food', 'Food', view.food],
    ['water', 'Water', view.water],
    ['power', 'Power', Number(view.power.toFixed(1))],
    ['science', 'Science', Number(view.science.toFixed(1))],
  ]
    .map(
      ([id, label, value]) =>
        `<div>${icon(id)}<span>${label}<strong data-resource="${id}">${value}</strong></span></div>`,
    )
    .join(
      '',
    )}<div class="resupply-status">${icon('salvage')}<span>Resupply<strong>${view.daysUntilResupply} ${t(view.daysUntilResupply === 1 ? 'day' : 'days')}</strong></span></div></div>
  <div class="journal-columns"><section class="crew-panel" aria-labelledby="crew-heading"><div class="section-title"><h2 id="crew-heading">The crew</h2><span class="journal-sticker">TEAM MOON ☾</span></div><p class="section-note">Tap a crew card, then a task. Tasks stay set next shift. Hunger/thirst = days without enough.</p><div class="crew-board">${view.crew.map((c) => crewCard(c, view, selection.crew)).join('')}${view.boltTask != null ? `<button type="button" class="crew-card bolt-card" data-crew="bolt" data-key="crew-bolt" aria-pressed="${selection.crew === 'bolt'}"><img class="crew-portrait" src="/assets/portraits/bolt.svg" alt=""><strong>BOLT</strong><span>${TASK_LABELS[view.boltTask]}</span><small>No human dose. EVA costs 1 power/shift; storms slow work.</small></button>` : ''}</div>${doseNotice}<fieldset class="task-board" ${disabled ? 'disabled' : ''}><legend>${selectedCrew ? `Assign ${escape(selectedCrew.name)}` : 'Choose a crew card'}</legend>${Object.entries(
    TASK_LABELS,
  )
    .map(
      ([task, label]) =>
        `<button type="button" data-task="${task}" data-key="task-${task}" aria-pressed="${selectedCrew?.assignment === task}" ${!selectedCrew || (task === 'greenhouse' && (!seeds || view.broken || view.power <= 0)) ? 'disabled' : ''}>${icon(task)}<span>${label}<small>${taskHints[task]}</small></span></button>`,
    )
    .join(
      '',
    )}</fieldset>${!seeds || view.broken || view.power <= 0 ? `<p class="task-warning">${!seeds ? 'Greenhouse needs a saved seed cartridge.' : view.broken ? 'Greenhouse panel needs repair. Assign Dom to solar repair or use a repair kit.' : 'Greenhouse needs power. Assign solar repair or use a battery.'}</p>` : ''}</section>${wallPanel(view, selection, slots)}${radioPanel(view)}</div>
  <section class="shift-log" aria-labelledby="log-heading"><h2 id="log-heading">Little things, this shift</h2><div class="shift-doodle" aria-hidden="true">☾ · · · ✦</div>${
    logs.length
      ? `<ol>${logs
          .slice(-3)
          .map(
            (row) =>
              `<li><span>${escape(row.text)}</span>${row.source === 'REAL' ? stamp(row) : '<small class="game-tag">GAME</small>'}</li>`,
          )
          .join('')}</ol>${
          logs.length > 3
            ? `<details><summary>All ${logs.length} entries</summary><ol>${logs
                .slice(0, -3)
                .map(
                  (row) =>
                    `<li>${escape(row.text)}${row.source === 'REAL' ? stamp(row) : '<small class="game-tag">GAME</small>'}</li>`,
                )
                .join('')}</ol></details>`
            : ''
        }`
      : '<p>Boots by the hatch. A fresh page. What shall we do?</p>'
  }</section>
  <footer class="journal-footer"><small>${view.shift === 'PM' ? 'Midnight meals use shelf supplies first, then the wall.' : 'Tasks stay set until you change them.'}<br>Survival and dose are GAME rules.</small><button type="button" class="end-shift" data-action="end" data-key="end" ${disabled ? 'disabled' : ''}><span>${view.resolving ? 'Continue shift' : t('Finish {shift} shift', { shift: view.shift })}</span> <span aria-hidden="true">→</span></button></footer>
  ${view.interrupt ? interruptDialog(view.interrupt) : view.pendingEvent ? `<dialog class="journal-dialog" aria-labelledby="decision-heading"><p class="game-tag">GAME · CREW STORY</p><h2 id="decision-heading">A little Moon moment</h2><p>${escape(view.pendingEvent.text)}</p><div class="decision-buttons">${view.pendingEvent.choices.map((choice, index) => `<button type="button" data-choice="${index}" data-key="choice-${index}">${escape(choice)}</button>`).join('')}</div></dialog>` : view.phase === 'ending' ? `<dialog class="journal-dialog" aria-labelledby="decision-heading"><p class="game-tag">GAME · JOURNAL CLOSED</p><h2 id="decision-heading">Time for a ride home.</h2><p>${view.crew.some((c) => c.status === 'medevac') ? 'A crew member needs care back home.' : view.power <= 0 ? 'The shelter needs more power.' : 'The resupply lander has reached your mission boundary.'} Your journal is complete.</p><div class="decision-buttons"><button type="button" data-action="replay" data-key="replay">New mission</button><button type="button" data-action="exit" data-key="ending-exit">Back to title</button></div></dialog>` : ''}`;
}
function interruptDialog(interrupt) {
  if (interrupt.kind === 'forecast')
    return `<dialog class="journal-dialog classroom-vote" aria-labelledby="decision-heading"><p class="journal-eyebrow">CLASSROOM / REAL FORECAST</p><h2 id="decision-heading">CLASS VOTE: shelter or keep working?</h2><p>A forecast has arrived. Read its prediction; it is not a guarantee. Vote together before continuing the same shift.</p><div class="classroom-prediction"></div>${stamp(interrupt, 'Issued UTC')}<div class="decision-buttons"><button type="button" data-action="recall" data-key="recall">Shelter the crew</button><button type="button" data-action="keep" data-key="keep">Keep current tasks</button></div></dialog>`;
  if (interrupt.kind === 'model')
    return `<dialog class="journal-dialog rush-back" aria-labelledby="decision-heading"><p class="journal-eyebrow">MODEL / EARLY WARNING</p><h2 id="decision-heading">A model sees a clue</h2><p>A recorded MODEL prediction arrived. This is not a particle detection or a guarantee. Recall crew or keep working?</p>${stamp(interrupt, 'MODEL UTC')}<div class="decision-buttons"><button type="button" data-action="recall" data-key="recall">RECALL NOW</button><button type="button" data-action="keep" data-key="keep">KEEP WORKING</button></div></dialog>`;
  const flare = interrupt.kind === 'flare';
  return `<dialog class="journal-dialog rush-back" aria-labelledby="decision-heading"><p class="journal-eyebrow">${flare ? 'SUN WATCH / RUSH BACK' : 'DOSIMETER / PARTICLES'}</p><h2 id="decision-heading">${flare ? 'Rush back?' : 'Particles detected!'}</h2><p class="interrupt-class">${icon(flare ? 'solar' : 'dosimeter')}${flare ? `${escape(interrupt.class)} flare · REAL` : 'Dosimeter alarm · REAL event'}</p><p>${flare ? escape(rateHint(interrupt.class, interrupt.associationRate)) : 'The meter has spotted particles. Being inside cuts GAME dose; working outside adds more.'}</p><p>Recall brings the human crew inside for the rest of this shift. Work already done stays done. BOLT keeps its own task.</p>${stamp(interrupt)}<div class="decision-buttons"><button type="button" data-action="recall" data-key="recall">RECALL NOW</button><button type="button" data-action="keep" data-key="keep">KEEP WORKING</button></div></dialog>`;
}
