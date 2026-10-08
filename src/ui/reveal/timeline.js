/** Read-only post-mission comparisons. No hindsight enters the play view. */
export function timelineRows(reveal, crewIds = []) {
  const rows = [];
  const end = Date.parse(reveal.dates.end);
  const calls = reveal.timeline.playerCalls;
  function outsideAt(time) {
    const assignments = Object.fromEntries(
      crewIds.map((id) => [id, 'shelter']),
    );
    for (const call of calls) {
      if (Date.parse(call.utc) > time) continue;
      if (call.type === 'assignCrew' && call.crewId !== 'bolt')
        assignments[call.crewId] = call.task;
      if (call.type === 'recallAll')
        Object.keys(assignments).forEach((id) => {
          assignments[id] = 'shelter';
        });
    }
    return Object.values(assignments).some((task) => task !== 'shelter');
  }
  calls.forEach((call, index) =>
    rows.push({
      id: `call-${index}`,
      lane: 0,
      time: Date.parse(call.utc),
      source: 'GAME',
      type: call.type,
      call,
    }),
  );
  for (const forecast of reveal.timeline.nasaForecast) {
    const predicted = Date.parse(forecast.predicted);
    const actual = forecast.actual ? Date.parse(forecast.actual) : null;
    const evaluated = actual ?? predicted + 30 * 3600000;
    const reached = evaluated <= end;
    const missed =
      reached && (!actual || Math.abs(actual - predicted) > 12 * 3600000);
    const outside = reached && outsideAt(evaluated);
    const comparison = !reached
      ? 'Not reached before your journal closed'
      : !actual
        ? outside
          ? 'Worked through a false alarm'
          : 'Sheltered through a false alarm'
        : outside
          ? 'Crew outside at the arrival'
          : missed
            ? 'Crew sheltered when the forecast missed'
            : 'Crew sheltered at the arrival';
    rows.push({
      id: `forecast-${forecast.id}`,
      lane: 1,
      time: predicted,
      source: forecast.source ?? 'GAME',
      type: 'forecast',
      forecast,
      missed,
      comparison,
      reached,
    });
  }
  reveal.timeline.reality.forEach((event, index) =>
    rows.push({
      id: `real-${index}`,
      lane: 2,
      time: Date.parse(event.utc),
      source: event.source ?? 'GAME',
      type: event.kind,
      event,
      caught:
        ['particles', 'shock'].includes(event.kind) &&
        outsideAt(Date.parse(event.utc)),
    }),
  );
  return rows.sort((a, b) => a.time - b.time || a.lane - b.lane);
}
