import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import {
  commitMinInterval,
  commitSlidingWindow,
  peekMinInterval,
  peekSlidingWindow,
} from "@/lib/rate-limit";

/**
 * Gemini call budget. Checked before every paid Vision request.
 * Daily counters persist under `.data/` so restarts do not reset the bill cap.
 */

const MS_MINUTE = 60_000;
const MS_HOUR = 60 * MS_MINUTE;
const USAGE_DIR = path.join(process.cwd(), ".data");
const USAGE_FILE = path.join(USAGE_DIR, "gemini-quota.json");

type DailyUsage = {
  /** UTC calendar day YYYY-MM-DD */
  day: string;
  global: number;
  users: Record<string, number>;
};

export type VisionQuotaDenialReason =
  | "interval"
  | "minute"
  | "hour"
  | "day_user"
  | "day_global";

export type VisionQuotaResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: VisionQuotaDenialReason;
      retryAfterSec: number;
      message: string;
    };

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Conservative defaults — override via env for demos that need more headroom. */
export function getVisionQuotaLimits() {
  return {
    minIntervalMs: envInt("GEMINI_MIN_INTERVAL_MS", 3_000),
    perUserPerMinute: envInt("GEMINI_MAX_PER_USER_PER_MINUTE", 3),
    perUserPerHour: envInt("GEMINI_MAX_PER_USER_PER_HOUR", 10),
    perUserPerDay: envInt("GEMINI_MAX_PER_USER_PER_DAY", 20),
    globalPerDay: envInt("GEMINI_MAX_GLOBAL_PER_DAY", 50),
  };
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(now = new Date()): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

function readDailyUsage(): DailyUsage {
  const day = utcDay();
  try {
    const raw = readFileSync(USAGE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DailyUsage>;
    if (parsed.day === day && typeof parsed.global === "number") {
      return {
        day,
        global: parsed.global,
        users:
          parsed.users && typeof parsed.users === "object" ? parsed.users : {},
      };
    }
  } catch {
    // missing or corrupt → fresh day
  }
  return { day, global: 0, users: {} };
}

function writeDailyUsage(usage: DailyUsage): void {
  mkdirSync(USAGE_DIR, { recursive: true });
  writeFileSync(USAGE_FILE, `${JSON.stringify(usage, null, 2)}\n`, "utf8");
}

function denial(
  reason: VisionQuotaDenialReason,
  retryAfterSec: number,
  message: string,
): VisionQuotaResult {
  return { allowed: false, reason, retryAfterSec, message };
}

/**
 * Reserve one Gemini Vision call for `userId`.
 * Call this only when an API key is present and you are about to hit Gemini.
 * Peeks all limits first, then commits — so a failed check does not burn budget.
 */
export function tryConsumeVisionQuota(userId: string): VisionQuotaResult {
  const limits = getVisionQuotaLimits();
  const uid = userId || "anonymous";
  const now = Date.now();

  const intervalKey = `vision:interval:${uid}`;
  const minuteKey = `vision:minute:${uid}`;
  const hourKey = `vision:hour:${uid}`;

  const usagePeek = readDailyUsage();
  const userDayPeek = usagePeek.users[uid] ?? 0;
  if (userDayPeek >= limits.perUserPerDay) {
    return denial(
      "day_user",
      secondsUntilUtcMidnight(),
      `Daily vision limit reached (${limits.perUserPerDay}/day for your account). Enter details manually.`,
    );
  }
  if (usagePeek.global >= limits.globalPerDay) {
    return denial(
      "day_global",
      secondsUntilUtcMidnight(),
      `App-wide daily vision budget reached (${limits.globalPerDay}/day). Enter details manually.`,
    );
  }

  const interval = peekMinInterval(intervalKey, limits.minIntervalMs, now);
  if (!interval.ok) {
    return denial(
      "interval",
      interval.retryAfterSec,
      `Please wait ${interval.retryAfterSec}s before analyzing another photo.`,
    );
  }

  const minute = peekSlidingWindow(
    minuteKey,
    limits.perUserPerMinute,
    MS_MINUTE,
    now,
  );
  if (!minute.ok) {
    return denial(
      "minute",
      minute.retryAfterSec,
      `Vision limit: ${limits.perUserPerMinute}/minute. Try again in ${minute.retryAfterSec}s.`,
    );
  }

  const hour = peekSlidingWindow(
    hourKey,
    limits.perUserPerHour,
    MS_HOUR,
    now,
  );
  if (!hour.ok) {
    return denial(
      "hour",
      hour.retryAfterSec,
      `Vision limit: ${limits.perUserPerHour}/hour. Try again in ${hour.retryAfterSec}s.`,
    );
  }

  // Commit persistent daily first (source of billing truth), then in-memory windows.
  const usage = readDailyUsage();
  const userDay = usage.users[uid] ?? 0;
  if (userDay >= limits.perUserPerDay) {
    return denial(
      "day_user",
      secondsUntilUtcMidnight(),
      `Daily vision limit reached (${limits.perUserPerDay}/day for your account). Enter details manually.`,
    );
  }
  if (usage.global >= limits.globalPerDay) {
    return denial(
      "day_global",
      secondsUntilUtcMidnight(),
      `App-wide daily vision budget reached (${limits.globalPerDay}/day). Enter details manually.`,
    );
  }

  usage.users[uid] = userDay + 1;
  usage.global += 1;
  writeDailyUsage(usage);

  commitMinInterval(intervalKey, now);
  commitSlidingWindow(minuteKey, MS_MINUTE, now);
  commitSlidingWindow(hourKey, MS_HOUR, now);

  return { allowed: true };
}
