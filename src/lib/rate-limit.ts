/**
 * In-memory sliding-window rate limiter (single Node process).
 * Suitable for local/demo Next.js; not shared across multiple server instances.
 */

type WindowBucket = {
  timestamps: number[];
};

const windows = new Map<string, WindowBucket>();
const lastHitAt = new Map<string, number>();

function prune(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

function getBucket(key: string): WindowBucket {
  let bucket = windows.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    windows.set(key, bucket);
  }
  return bucket;
}

/** Peek whether `key` may proceed (does not record a hit). */
export function peekSlidingWindow(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (limit <= 0) {
    return { ok: false, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  const bucket = getBucket(key);
  const live = prune(bucket.timestamps, now, windowMs);
  if (live.length >= limit) {
    const oldest = live[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

/** Record a hit after a successful peek (+ other checks). */
export function commitSlidingWindow(
  key: string,
  windowMs: number,
  now = Date.now(),
): void {
  const bucket = getBucket(key);
  bucket.timestamps = prune(bucket.timestamps, now, windowMs);
  bucket.timestamps.push(now);
}

/** Peek minimum gap between events for `key`. */
export function peekMinInterval(
  key: string,
  minIntervalMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (minIntervalMs <= 0) return { ok: true };

  const prev = lastHitAt.get(key);
  if (prev !== undefined && now - prev < minIntervalMs) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((prev + minIntervalMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

export function commitMinInterval(key: string, now = Date.now()): void {
  lastHitAt.set(key, now);
}

/**
 * Atomically check + record for a single window.
 * Prefer peek/commit when combining multiple limits.
 */
export function takeSlidingWindow(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const peek = peekSlidingWindow(key, limit, windowMs, now);
  if (!peek.ok) return peek;
  commitSlidingWindow(key, windowMs, now);
  return { ok: true };
}

export function takeMinInterval(
  key: string,
  minIntervalMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const peek = peekMinInterval(key, minIntervalMs, now);
  if (!peek.ok) return peek;
  commitMinInterval(key, now);
  return { ok: true };
}

/** Test helper — clear all in-memory windows. */
export function resetRateLimitStores(): void {
  windows.clear();
  lastHitAt.clear();
}
