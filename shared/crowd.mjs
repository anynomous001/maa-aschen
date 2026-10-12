/**
 * Queue estimate for a pandal: crowd tier (data/crowd.json) × Puja day × hour of the day (IST), nudged by live road
 * traffic next to the pandal when the API has it (worker/src/traffic.ts). Always an estimate: the site shows a range and
 * says so. Plain JS so the site and the Worker share it; types in crowd.d.mts.
 */

/** Typical queue at the busiest hour of Ashtami night, minutes. */
export const TIER_PEAK_MIN = { A: 75, B: 30, C: 8 };

/** How busy each day is, relative to Ashtami (IST dates). Pre-Puja weekend crowds count too. */
export const DAY_LOAD = {
  '2026-10-13': 0.25,
  '2026-10-14': 0.4,
  '2026-10-15': 0.5,
  '2026-10-16': 0.65,
  '2026-10-17': 0.85,
  '2026-10-18': 0.9,
  '2026-10-19': 1,
  '2026-10-20': 0.95,
  '2026-10-21': 0.35,
};

/** How busy each hour is (IST, 0–23), relative to the peak at 8–11 pm. */
export const HOUR_LOAD = [0.85, 0.75, 0.55, 0.35, 0.2, 0.1, 0.08, 0.1, 0.15, 0.22, 0.28, 0.3, 0.32, 0.35, 0.4, 0.45, 0.55, 0.7, 0.85, 0.95, 1, 1, 1, 0.95];

/** Live data older than this is ignored. */
export const LIVE_MAX_AGE_MS = 75 * 60 * 1000;

const IST_MS = 5.5 * 60 * 60 * 1000;
/** IST calendar date and hour for a timestamp. */
export function ist(ms) {
  const d = new Date(ms + IST_MS);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}
/**
 * The "Puja day" an hour belongs to: until 5 am it is still the night before (Ashtami night runs past midnight).
 */
function pujaDay(ms) {
  const { date, hour } = ist(ms);
  return hour < 5 ? ist(ms - 6 * 60 * 60 * 1000).date : date;
}

/** 0–1 expected busyness from the calendar alone; null outside the Puja window. */
export function baseLoad(ms) {
  const day = DAY_LOAD[pujaDay(ms)];
  return day == null ? null : day * HOUR_LOAD[ist(ms).hour];
}

/**
 * Multiplier from live road traffic next to the pandal: free-flowing roads pull the estimate down a little, jams or
 * a police closure push it up. `traffic` = { c: 0–1 congestion, closed: boolean, at: ms }.
 */
export function liveFactor(traffic, now) {
  if (!traffic || now - traffic.at > LIVE_MAX_AGE_MS) return null;
  const c = traffic.closed ? 1 : Math.max(0, Math.min(1, traffic.c));
  return 0.7 + 0.8 * c;
}

/**
 * Right now: expected queue minutes and a level. `live` says whether road traffic was used.
 * Returns null outside the Puja window.
 */
export function crowdNow(tier, now, traffic) {
  const load = baseLoad(now);
  if (load == null) return null;
  const f = liveFactor(traffic, now);
  const minutes = (TIER_PEAK_MIN[tier] ?? TIER_PEAK_MIN.C) * load * (f ?? 1);
  return { minutes, level: minutes < 10 ? 'low' : minutes < 30 ? 'mid' : 'high', live: f != null };
}

/** "20–40" style range in minutes (rounded to 5), for showing an estimate honestly. */
export function queueRange(minutes) {
  const r5 = (x) => Math.max(5, Math.round(x / 5) * 5);
  const lo = r5(minutes * 0.7);
  const hi = Math.max(lo + 5, r5(minutes * 1.3));
  return [lo, hi];
}

