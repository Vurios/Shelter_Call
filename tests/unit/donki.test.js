import { afterEach, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api/donki/[[path]].js';

afterEach(() => vi.unstubAllGlobals());
const context = (path = ['FLR'], method = 'GET') => ({
  params: { path },
  request: new Request(
    'https://shelter-call.pages.dev/api/donki/FLR?startDate=2024-05-01&endDate=2024-05-31',
    { method },
  ),
  waitUntil: vi.fn(),
});

it('relays permitted DONKI JSON with the original query and one-hour cache', async () => {
  const rows = [{ flrID: 'source-id' }];
  const fetch = vi.fn().mockResolvedValue(Response.json(rows));
  const cache = { match: vi.fn(), put: vi.fn().mockResolvedValue() };
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('caches', { default: cache });
  const ctx = context();
  const response = await onRequest(ctx);
  expect(String(fetch.mock.calls[0][0])).toBe(
    'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2024-05-01&endDate=2024-05-31',
  );
  expect(await response.json()).toEqual(rows);
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(ctx.waitUntil).toHaveBeenCalledOnce();
  expect(cache.put).toHaveBeenCalledOnce();
  cache.match.mockResolvedValue(Response.json(rows));
  await onRequest(context());
  expect(fetch).toHaveBeenCalledOnce();
});

it('rejects unlisted paths and writes without contacting upstream', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  for (const path of [['FLR', 'extra'], ['https://example.com'], ['flr'], []])
    expect((await onRequest(context(path))).status).toBe(404);
  expect((await onRequest(context(['FLR'], 'POST'))).status).toBe(405);
  expect((await onRequest(context(['FLR'], 'OPTIONS'))).status).toBe(200);
  expect(fetch).not.toHaveBeenCalled();
});

it('returns uncached JSON errors for bad upstream responses', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
    .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
    .mockResolvedValueOnce(new Response('<html>not JSON</html>'))
    .mockResolvedValueOnce(new Response('<html>not JSON</html>'))
    .mockRejectedValueOnce(new Error('network failure'))
    .mockRejectedValueOnce(new Error('network failure'));
  const cache = { match: vi.fn(), put: vi.fn() };
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('caches', { default: cache });
  for (let n = 0; n < 3; n++) {
    const response = await onRequest(context());
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await response.json()).error).toBeTruthy();
  }
  expect(cache.put).not.toHaveBeenCalled();
});

it('uses the official replacement when the requested legacy API stops returning JSON', async () => {
  const rows = [{ flrID: 'source-id' }];
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('<html>API moved</html>'))
    .mockResolvedValueOnce(Response.json(rows));
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('caches', {});
  const response = await onRequest(context());
  expect(String(fetch.mock.calls[1][0])).toBe(
    'https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?startDate=2024-05-01&endDate=2024-05-31',
  );
  expect(await response.json()).toEqual(rows);
  expect(response.headers.get('X-DONKI-Source')).toBe(
    'https://ccmc.gsfc.nasa.gov/DONKI-API/get/',
  );
});
