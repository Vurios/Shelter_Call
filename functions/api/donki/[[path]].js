const ENDPOINTS = new Set([
  'FLR',
  'SEP',
  'CME',
  'IPS',
  'WSAEnlilSimulations',
  'notifications',
]);
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=3600',
};
const error = (status, message) =>
  Response.json(
    { error: message },
    { status, headers: { ...headers, 'Cache-Control': 'no-store' } },
  );

/** Optional live relay. Archived mission inputs remain public/data/episodes.json. */
export async function onRequest({ request, params, waitUntil }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'GET') return error(405, 'Use GET.');
  const path = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!ENDPOINTS.has(path)) return error(404, 'Unknown DONKI endpoint.');
  const url = new URL(request.url);
  // Cache successful JSON for one hour at the edge, not in the service worker.
  const key = new Request(url.toString(), { method: 'GET' });
  const cache = globalThis.caches?.default;
  const cached = await cache?.match(key);
  if (cached) return cached;
  // NASA replaced the requested legacy API on September 30, 2026.
  // Try that route first, then the documented public replacement; never fake data.
  for (const base of [
    'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/',
    'https://ccmc.gsfc.nasa.gov/DONKI-API/get/',
  ]) {
    const upstream = new URL(path, base);
    upstream.search = url.search;
    try {
      const response = await fetch(upstream, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) continue;
      const body = await response.json();
      const result = Response.json(body, {
        headers: { ...headers, 'X-DONKI-Source': base },
      });
      if (cache) waitUntil(cache.put(key, result.clone()));
      return result;
    } catch {
      // A retired route may return HTML or fail TLS; try the other official route.
    }
  }
  return error(502, 'DONKI is unavailable or did not return JSON.');
}
