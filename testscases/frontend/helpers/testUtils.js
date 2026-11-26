import { vi } from 'vitest';

export const API_BASE_URL = 'https://medicine-inventory-backend-rkud.onrender.com/api';

/**
 * Builds a Response-like object accepted by component fetch() calls.
 */
export function jsonResponse(body, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

/**
 * Installs a fetch mock matching requests by "<METHOD> <path-or-full-url>".
 * Supports either a static response descriptor or a handler function `(url, options) => response`.
 */
export function mockFetch(routes) {
  const fetchSpy = vi.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const normalizedUrl = String(url);
    const relativePath = normalizedUrl.startsWith(API_BASE_URL)
      ? normalizedUrl.slice(API_BASE_URL.length)
      : normalizedUrl;

    const exactKey = `${method} ${normalizedUrl}`;
    const relativeKey = `${method} ${relativePath}`;
    const handler = routes[exactKey] ?? routes[relativeKey];

    if (!handler) {
      throw new Error(`Unexpected fetch call in test: ${method} ${normalizedUrl}`);
    }

    return typeof handler === 'function' ? handler(normalizedUrl, options) : handler;
  });

  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}
