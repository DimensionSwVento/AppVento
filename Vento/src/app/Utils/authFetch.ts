/**
 * Authenticated fetch wrapper.
 *
 * A module-level token store is synced by <SessionGuard> so that any
 * `authFetch` call automatically attaches `Authorization: Bearer <token>`.
 * When no token is available the request goes out without the header
 * (useful for public endpoints like /api/tiles/warmup).
 */

let _accessToken: string | undefined;

export function syncAccessToken(token: string | undefined) {
  _accessToken = token;
}

export function getAccessToken(): string | undefined {
  return _accessToken;
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (_accessToken) {
    headers.set("Authorization", `Bearer ${_accessToken}`);
  }
  return fetch(input, { ...init, headers });
}
