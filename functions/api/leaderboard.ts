/**
 * Global high-score leaderboard, backed by a Cloudflare KV namespace.
 *
 * The whole board lives at a single key (`KEY` below) as a JSON array
 * sorted by descending score. Read/write traffic is small (one short
 * request at the end of each playthrough) so a single-key store is fine.
 *
 * Wrangler binding: see `wrangler.jsonc` → `kv_namespaces[].binding`.
 */

export interface Env {
  LEADERBOARD: KVNamespace;
}

interface Entry {
  name: string;
  score: number;
  achievedAt: string;
}

const KEY = "v1";
const MAX_ENTRIES = 100;
const NAME_MAX_LEN = 6;
const SCORE_CAP = 99_999;

/**
 * Per-IP submission rate limit. KV's minimum TTL is 60 s, so the window is
 * fixed at 60 s — a generous 10 submissions / minute / IP comfortably fits
 * a human button-mashing replays but turns a bash loop into a 429 fountain.
 *
 * The limiter is approximate: two near-simultaneous POSTs from the same IP
 * can both observe the same pre-increment count. That's fine; the worst
 * case is one extra request slipping past the cap.
 */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_TTL_SEC = 60;

function isEntry(v: unknown): v is Entry {
  if (!v || typeof v !== "object") return false;
  const e = v as Partial<Entry>;
  return (
    typeof e.name === "string" &&
    typeof e.score === "number" &&
    Number.isFinite(e.score) &&
    typeof e.achievedAt === "string"
  );
}

/**
 * Server-side mirror of `normalizeInitials` in `src/game/leaderboard.ts`.
 * Never trust the client's name — strip to A-Z/0-9, cap length, default
 * to "AAA" if the result is empty.
 */
function normalizeName(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, NAME_MAX_LEN);
  return cleaned.length === 0 ? "AAA" : cleaned;
}

function sortAndCap(list: Entry[]): Entry[] {
  return [...list]
    .sort((a, b) => b.score - a.score || a.achievedAt.localeCompare(b.achievedAt))
    .slice(0, MAX_ENTRIES);
}

async function loadBoard(env: Env): Promise<Entry[]> {
  const raw = await env.LEADERBOARD.get(KEY, "json");
  if (!Array.isArray(raw)) return [];
  return raw.filter(isEntry);
}

/**
 * Increment a rolling per-IP counter and report whether the caller has
 * blown the cap. Returns `true` if the request should be rejected.
 */
async function isRateLimited(env: Env, ip: string): Promise<boolean> {
  const rlKey = `rl:${ip}`;
  const prev = parseInt((await env.LEADERBOARD.get(rlKey)) ?? "0", 10);
  if (prev >= RATE_LIMIT_MAX) return true;
  await env.LEADERBOARD.put(rlKey, String(prev + 1), {
    expirationTtl: RATE_LIMIT_TTL_SEC,
  });
  return false;
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const entries = sortAndCap(await loadBoard(env));
  return json({ entries });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // `cf-connecting-ip` is set by Cloudflare's edge. In `wrangler pages dev`
  // it's set to the loopback address. Missing only happens off-platform.
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (await isRateLimited(env, ip)) {
    return json({ error: "rate_limited" }, {
      status: 429,
      headers: { "retry-after": String(RATE_LIMIT_TTL_SEC) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const b = (body ?? {}) as Partial<Entry>;
  if (typeof b.name !== "string") {
    return json({ error: "invalid_name" }, { status: 400 });
  }
  if (
    typeof b.score !== "number" ||
    !Number.isFinite(b.score) ||
    b.score < 0
  ) {
    return json({ error: "invalid_score" }, { status: 400 });
  }

  const entry: Entry = {
    name: normalizeName(b.name),
    score: Math.min(SCORE_CAP, Math.floor(b.score)),
    achievedAt: new Date().toISOString(),
  };

  // KV is last-write-wins. Two concurrent submits in different colos can
  // both read a pre-write snapshot (up to ~60 s apart) and clobber each
  // other. Acceptable for an arcade leaderboard; swap for a Durable Object
  // if it ever matters.
  const current = await loadBoard(env);
  const next = sortAndCap([...current, entry]);
  await env.LEADERBOARD.put(KEY, JSON.stringify(next));

  return json({ entries: next, accepted: entry });
};
