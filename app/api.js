// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
// Responses are cached in memory for 60s so a view fetches its data once.

const API = 'https://make.fun/api';
const TTL_MS = 60_000;
const cache = new Map(); // path -> { at, data }

function apiErrorMessage(data, fallback) {
  if (data && Array.isArray(data.error) && data.error[0] && data.error[0].message) {
    return data.error[0].message;
  }
  return fallback;
}

async function get(path, { retries = 0 } = {}) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const res = await fetch(API + path);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // A leaderboard still being built answers 503 with Retry-After: try once more.
    if (res.status === 503 && retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return get(path, { retries: retries - 1 });
    }
    const err = new Error(apiErrorMessage(data, `make.fun API error ${res.status}`));
    err.status = res.status;
    throw err;
  }
  cache.set(path, { at: Date.now(), data });
  return data;
}

/** The open bounties, soonest deadline first (the board sorts them itself). */
export async function getBounties() {
  const items = [];
  let cursor = '';
  for (let page = 0; page < 5 && items.length < 500; page += 1) {
    const data = await get(`/competitions?status=open&activity=times&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    items.push(...(data.items ?? []));
    cursor = data.next_cursor ?? '';
    if (!cursor) break;
  }
  return { items };
}

/** One bounty, by its slug (summary form: no per-entry submission list). */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`);

/** One bounty's leaderboard: first 10 rows whole, the rest as compact rows. */
export const getLeaderboard = (slug) =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first`, { retries: 1 });

/** One account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** An account's round site picture (used when the profile carries no image URL). */
export const profilePictureUrl = (handle) =>
  `${API}/profiles/${encodeURIComponent(handle)}/picture.png`;
