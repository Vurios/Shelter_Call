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
  const upstream = new URL(
    `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/${path}`,
  );
  upstream.search = url.search;
  // Cache successful JSON for one hour at the edge, not in the service worker.
  const key = new Request(url.toString(), { method: 'GET' });
  const cache = globalThis.caches?.default;
  const cached = await cache?.match(key);
  if (cached) return cached;
  try {
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok)
      return error(502, `DONKI returned HTTP ${response.status}.`);
    const body = await response.json();
    const result = Response.json(body, { headers });
    if (cache) waitUntil(cache.put(key, result.clone()));
    return result;
  } catch {
    return error(502, 'DONKI is unavailable or did not return JSON.');
  }
}
