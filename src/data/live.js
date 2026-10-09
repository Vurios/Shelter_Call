import archived from '../../public/data/episodes.json' with { type: 'json' };

const HOUR = 3600000,
  DAY = 24 * HOUR;
const kinds = ['flares', 'sepEvents', 'cmeForecasts', 'surpriseArrivals'];
const time = (value) => {
  if (typeof value !== 'string' || !value) return null;
  // DONKI naive timestamps are UTC, matching Python joins.dt.
  const result = Date.parse(
    /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`,
  );
  return Number.isFinite(result) ? result : null;
};
const iso = (value) =>
  value == null
    ? null
    : new Date(value).toISOString().replace('.000Z', 'Z').replace(':00Z', 'Z');
const links = (row) =>
  new Set(
    (row.linkedEvents ?? []).map((entry) => entry.activityID).filter(Boolean),
  );
const intersect = (a, b) => [...a].filter((id) => b.has(id));
const union = (...sets) => new Set(sets.flatMap((set) => [...set]));
const sorted = (set) => [...set].sort();
const round = (value, digits) =>
  Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
function unique(rows, key) {
  const records = new Map();
  for (const row of rows) {
    const id = row?.[key];
    if (typeof id !== 'string' || !id) continue;
    const old = records.get(id);
    const version = Number(row.versionId) || 0,
      oldVersion = Number(old?.versionId) || 0;
    if (
      !old ||
      version > oldVersion ||
      (version === oldVersion &&
        (row.submissionTime ?? '') > (old.submissionTime ?? ''))
    )
      records.set(id, row);
  }
  return new Map([...records].sort(([a], [b]) => a.localeCompare(b)));
}
function percentile(values, fraction) {
  if (!values.length) return null;
  const data = values.toSorted((a, b) => a - b),
    index = (data.length - 1) * fraction;
  return (
    data[Math.floor(index)] +
    (data[Math.ceil(index)] - data[Math.floor(index)]) * (index % 1)
  );
}
/** Conservative port of data-pipeline/joins.py. No time inference or synthetic REAL rows. */
export function transformLive(raw, { endDate, asOf } = {}) {
  for (const name of ['FLR', 'SEP', 'CME', 'IPS', 'WSAEnlilSimulations']) {
    if (!Array.isArray(raw[name]) || raw[name].length > 50000)
      throw new Error('Invalid DONKI response.');
  }
  const end = time(`${endDate}T00:00:00Z`);
  const cutoff = Math.min(
    end == null ? Infinity : end + DAY,
    time(asOf) ?? Infinity,
  );
  if (!Number.isFinite(cutoff))
    throw new Error('A verified cutoff is required.');
  const rawFlares = unique(raw.FLR, 'flrID');
  const flares = [...rawFlares]
    .filter(([, row]) => time(row.beginTime) != null)
    .map(([id, row]) => ({
      id,
      begin: iso(time(row.beginTime)),
      peak: iso(time(row.peakTime)),
      class: row.classType || 'unknown',
    }));
  const byFlare = new Map(flares.map((row) => [row.id, row]));
  const reverse = new Map();
  for (const [id, row] of rawFlares)
    for (const target of links(row)) {
      if (!target.includes('-SEP-')) continue;
      if (!reverse.has(target)) reverse.set(target, new Set());
      reverse.get(target).add(id);
    }
  const models = [],
    detections = [];
  for (const [id, row] of unique(raw.SEP, 'sepID')) {
    const names = (row.instruments ?? []).map(
      (instrument) => instrument.displayName ?? '',
    );
    const at = time(row.eventTime);
    const flareIds = new Set(
      [...union(links(row), reverse.get(id) ?? [])].filter((identity) =>
        byFlare.has(identity),
      ),
    );
    const entry = { id, row, time: at, flares: flareIds };
    const modelNames = names.filter((name) => /^MODEL:/i.test(name));
    if (modelNames.length) models.push({ ...entry, instruments: modelNames });
    const instruments = names.filter(
      (name) =>
        /^(GOES\d*|SOHO|ACE)(?:\b|[-:])/i.test(name) && !/^MODEL:/i.test(name),
    );
    if (!instruments.length || at == null) continue;
    const earlier = [...flareIds]
      .filter((identity) => time(byFlare.get(identity).begin) < at)
      .sort(
        (a, b) =>
          time(byFlare.get(b).begin) - time(byFlare.get(a).begin) ||
          a.localeCompare(b),
      );
    detections.push({ ...entry, instruments, anchor: earlier[0] ?? null });
  }
  const groups = [];
  for (const entry of detections.toSorted(
    (a, b) => a.time - b.time || a.id.localeCompare(b.id),
  )) {
    const group = groups
      .toReversed()
      .find(
        (list) =>
          list[0].anchor === entry.anchor &&
          ((entry.anchor && entry.time - list[0].time <= 6 * HOUR) ||
            entry.time === list[0].time),
      );
    if (group) group.push(entry);
    else groups.push([entry]);
  }
  const associated = new Set();
  const sepEvents = groups.map((group) => {
    const onset = group[0].time,
      flareIds = union(...group.map((entry) => entry.flares));
    const earlier = [...flareIds]
      .filter((id) => time(byFlare.get(id).begin) < onset)
      .sort(
        (a, b) =>
          time(byFlare.get(b).begin) - time(byFlare.get(a).begin) ||
          a.localeCompare(b),
      );
    earlier.forEach((id) => associated.add(id));
    const flareId = earlier[0] ?? null;
    const instruments = sorted(
      new Set(group.flatMap((entry) => entry.instruments)),
    );
    const tier = instruments.some((name) => />\s*100\s*MeV/i.test(name))
      ? 3
      : instruments.some(
            (name) => /^GOES/i.test(name) && />\s*10\s*MeV/i.test(name),
          )
        ? 2
        : 1;
    const alerts = group
      .flatMap((entry) =>
        (entry.row.sentNotifications ?? []).map((notification) =>
          time(notification.messageIssueTime),
        ),
      )
      .filter((at) => at != null);
    const alertTime = alerts.length ? Math.min(...alerts) : null;
    const model = models
      .filter(
        (entry) =>
          entry.time != null &&
          entry.time <= onset &&
          intersect(entry.flares, flareIds).length,
      )
      .sort((a, b) => b.time - a.time || a.id.localeCompare(b.id))[0];
    return {
      id: group[0].id,
      onset: iso(onset),
      tier,
      flareId,
      countdownMin: flareId
        ? round((onset - time(byFlare.get(flareId).begin)) / 60000, 3)
        : null,
      alertTime: iso(alertTime),
      alertLagMin:
        alertTime == null ? null : round((alertTime - onset) / 60000, 3),
      modelLeadMin: model ? round((onset - model.time) / 60000, 3) : null,
      modelId: model?.id ?? null,
      modelTime: iso(model?.time),
      instruments,
    };
  });
  const cmes = unique(raw.CME, 'activityID'),
    simulations = unique(raw.WSAEnlilSimulations, 'simulationID');
  const earth = new Map(
    [...unique(raw.IPS, 'activityID')].filter(
      ([, row]) =>
        String(row.location ?? '').toLowerCase() === 'earth' &&
        time(row.eventTime) != null,
    ),
  );
  const arrivals = new Map();
  const attach = (id, shock) => {
    if (!arrivals.has(id)) arrivals.set(id, new Set());
    arrivals.get(id).add(shock);
  };
  for (const [id, row] of earth)
    for (const cmeId of links(row))
      if (cmeId.includes('-CME-')) attach(cmeId, id);
  for (const [id, row] of cmes)
    for (const shock of links(row)) if (earth.has(shock)) attach(id, shock);
  for (const simulation of simulations.values())
    for (const entry of simulation.cmeInputs ?? [])
      for (const shock of entry.ipsList ?? []) {
        if (
          shock.activityID &&
          String(shock.location ?? '').toLowerCase() === 'earth' &&
          time(shock.eventTime) != null
        ) {
          if (!earth.has(shock.activityID)) earth.set(shock.activityID, shock);
          if (entry.CMEID) attach(entry.CMEID, shock.activityID);
        }
      }
  const candidates = new Map();
  for (const [id, row] of simulations) {
    const issued = time(row.modelCompletionTime);
    const predicted =
      time(row.estimatedShockArrivalTime) ??
      time(
        (row.impactList ?? []).find(
          (impact) => String(impact.location ?? '').toLowerCase() === 'earth',
        )?.arrivalTime,
      );
    if (issued == null || predicted == null || predicted <= issued) continue;
    for (const entry of row.cmeInputs ?? [])
      if (entry.CMEID) {
        if (!candidates.has(entry.CMEID)) candidates.set(entry.CMEID, []);
        candidates.get(entry.CMEID).push({ id, issued, predicted });
      }
  }
  const selected = new Map();
  for (const [cmeId, runs] of [...candidates].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    runs.sort((a, b) => a.issued - b.issued || a.id.localeCompare(b.id));
    const first = runs[0];
    if (!selected.has(first.id))
      selected.set(first.id, { ...first, cmeIds: [] });
    selected.get(first.id).cmeIds.push(cmeId);
  }
  const covered = new Set(),
    cmeForecasts = [];
  for (const [id, first] of [...selected].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const linked = union(
      ...first.cmeIds.map((cmeId) => arrivals.get(cmeId) ?? []),
    );
    const valid = [...linked].filter(
      (shock) =>
        time(earth.get(shock).eventTime) > first.issued &&
        time(earth.get(shock).eventTime) < cutoff,
    );
    if ((linked.size && !valid.length) || valid.length > 1) continue;
    const actual = valid.length ? time(earth.get(valid[0]).eventTime) : null;
    if (actual == null && first.predicted + 30 * HOUR >= cutoff) continue;
    const rawError = actual == null ? null : (actual - first.predicted) / HOUR;
    const kp = ['kp_18', 'kp_90', 'kp_135', 'kp_180']
      .map((key) => simulations.get(id)[key])
      .filter((value) => typeof value === 'number' && value >= 0 && value <= 9);
    cmeForecasts.push({
      id,
      cmeId: first.cmeIds.toSorted()[0],
      issued: iso(first.issued),
      predicted: iso(first.predicted),
      actual: iso(actual),
      outcome:
        actual == null
          ? 'false_alarm'
          : Math.abs(rawError) <= 30
            ? 'hit'
            : 'miss',
      errorH: rawError == null ? null : round(rawError, 4),
      kpRange: kp.length ? [Math.min(...kp), Math.max(...kp)] : null,
    });
    if (valid.length) covered.add(valid[0]);
  }
  for (const [cmeId, shockIds] of arrivals)
    for (const id of shockIds)
      if (
        (candidates.get(cmeId) ?? []).some(
          (run) => run.issued < time(earth.get(id).eventTime),
        )
      )
        covered.add(id);
  const surpriseArrivals = [...earth]
    .filter(([id, row]) => !covered.has(id) && time(row.eventTime) < cutoff)
    .map(([id, row]) => ({ id, time: iso(time(row.eventTime)) }))
    .sort((a, b) => time(a.time) - time(b.time) || a.id.localeCompare(b.id));
  cmeForecasts.sort(
    (a, b) => time(a.issued) - time(b.issued) || a.id.localeCompare(b.id),
  );
  const windows = [];
  for (const sep of sepEvents) {
    const start = time(sep.onset),
      end = start + 14 * DAY;
    if (sep.countdownMin == null || sep.countdownMin <= 0 || end > cutoff)
      continue;
    const inside = (value) =>
      value != null && time(value) >= start && time(value) < end;
    if (!cmeForecasts.some((row) => inside(row.issued))) continue;
    windows.push({
      id: sep.id.replace('-SEP-', '-WINDOW-'),
      sepId: sep.id,
      start: iso(start),
      end: iso(end),
      refs: {
        flares: flares
          .filter((row) => inside(row.begin) || row.id === sep.flareId)
          .map((row) => row.id),
        sepEvents: sepEvents
          .filter((row) => inside(row.onset))
          .map((row) => row.id),
        cmeForecasts: cmeForecasts
          .filter(
            (row) =>
              inside(row.issued) || inside(row.actual) || inside(row.predicted),
          )
          .map((row) => row.id),
        surpriseArrivals: surpriseArrivals
          .filter((row) => inside(row.time))
          .map((row) => row.id),
      },
    });
  }
  const errors = cmeForecasts
    .filter((row) => row.errorH != null)
    .map((row) => row.errorH);
  const rates = Object.fromEntries(
    ['C', 'M', 'X'].map((letter) => {
      const group = flares.filter((row) => row.class.startsWith(letter));
      return [
        letter,
        group.length
          ? round(
              group.filter((row) => associated.has(row.id)).length /
                group.length,
              6,
            )
          : null,
      ];
    }),
  );
  return {
    meta: {
      source: 'NASA/CCMC DONKI',
      generated: iso(cutoff),
      range: [endDate, endDate],
      live: true,
    },
    stats: {
      cmeErrorHours: {
        median: percentile(errors, 0.5),
        p25: percentile(errors, 0.25),
        p75: percentile(errors, 0.75),
      },
      flareSepRate: rates,
    },
    flares,
    sepEvents,
    cmeForecasts,
    surpriseArrivals,
    windows,
  };
}
/** Reject incompatible or corrupt live snapshots before using them in core/storage. */
export function validLiveArchive(data) {
  try {
    if (
      data?.meta?.source !== 'NASA/CCMC DONKI' ||
      data.meta.live !== true ||
      time(data.meta.generated) == null ||
      !Array.isArray(data.windows) ||
      !data.windows.length ||
      data.windows.length > 5000
    )
      return false;
    for (const kind of kinds)
      if (
        !Array.isArray(data[kind]) ||
        data[kind].length > 50000 ||
        data[kind].some(
          (row) => !row || typeof row.id !== 'string' || row.id.length > 200,
        )
      )
        return false;
    const ids = Object.fromEntries(
      kinds.map((kind) => [kind, new Set(data[kind].map((row) => row.id))]),
    );
    if (
      data.flares.some(
        (row) => time(row.begin) == null || typeof row.class !== 'string',
      ) ||
      data.sepEvents.some(
        (row) =>
          time(row.onset) == null ||
          !Array.isArray(row.instruments) ||
          row.instruments.some((value) => typeof value !== 'string') ||
          ((row.modelId != null || row.modelTime != null) &&
            (typeof row.modelId !== 'string' ||
              time(row.modelTime) == null ||
              !(row.modelLeadMin > 0) ||
              time(row.modelTime) >= time(row.onset))) ||
          ![1, 2, 3].includes(row.tier) ||
          (!Number.isFinite(row.countdownMin) && row.countdownMin !== null) ||
          (row.modelLeadMin !== null &&
            (!Number.isFinite(row.modelLeadMin) || row.modelLeadMin < 0)),
      ) ||
      data.cmeForecasts.some(
        (row) =>
          time(row.issued) == null ||
          time(row.predicted) == null ||
          (row.actual !== null && time(row.actual) == null),
      ) ||
      data.surpriseArrivals.some((row) => time(row.time) == null)
    )
      return false;
    if (!data.stats?.cmeErrorHours || !data.stats.flareSepRate) return false;
    for (const value of [
      ...Object.values(data.stats.cmeErrorHours),
      ...Object.values(data.stats.flareSepRate),
    ])
      if (value !== null && !Number.isFinite(value)) return false;
    return data.windows.every(
      (window) =>
        typeof window.id === 'string' &&
        time(window.start) != null &&
        time(window.end) - time(window.start) === 14 * DAY &&
        time(window.end) <= time(data.meta.generated) &&
        ids.sepEvents.has(window.sepId) &&
        kinds.every(
          (kind) =>
            Array.isArray(window.refs?.[kind]) &&
            window.refs[kind].every((id) => ids[kind].has(id)),
        ) &&
        window.refs.cmeForecasts.length > 0,
    );
  } catch {
    return false;
  }
}
export async function loadLive({
  now = Date.now(),
  fetcher = globalThis.fetch,
  cache,
  signal,
} = {}) {
  const asOf = new Date(now).toISOString(),
    endDate = asOf.slice(0, 10),
    startDate = new Date(now - 29 * DAY).toISOString().slice(0, 10);
  try {
    const names = ['FLR', 'SEP', 'CME', 'IPS', 'WSAEnlilSimulations'];
    const rows = await Promise.all(
      names.map(async (name) => {
        const response = await fetcher(
          `/api/donki/${name}?startDate=${startDate}&endDate=${endDate}`,
          {
            signal: signal
              ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
              : AbortSignal.timeout(20000),
          },
        );
        if (!response.ok) throw new Error('DONKI unavailable.');
        return [name, await response.json()];
      }),
    );
    const data = transformLive(Object.fromEntries(rows), { endDate, asOf });
    data.meta.range = [startDate, endDate];
    data.windows = data.windows.filter(
      (window) => time(window.start) >= time(`${startDate}T00:00Z`),
    );
    if (validLiveArchive(data)) {
      cache?.write(data);
      return { data, status: 'fresh' };
    }
    const cached = cache?.read();
    return {
      data: validLiveArchive(cached) ? cached : archived,
      status: validLiveArchive(cached) ? 'cached-quiet' : 'archive-quiet',
    };
  } catch {
    const cached = cache?.read();
    return {
      data: validLiveArchive(cached) ? cached : archived,
      status: validLiveArchive(cached) ? 'cached-offline' : 'archive-offline',
    };
  }
}
