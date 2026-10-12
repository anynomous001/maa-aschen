/**
 * Live road traffic next to each pandal, from TomTom's Traffic Flow API (free tier: 2,500 calls a day).
 * A cron run every 15 minutes checks a quarter of the pandals, so each is refreshed hourly and one run stays well under
 * the Workers limit of 50 outbound calls. Runs only on Puja days and in the evening/night, when crowds build.
 * The result is a congestion score per pandal that shared/crowd.mjs uses to nudge the queue estimate.
 */
import data from '../../data/pandals.json';
import { DAY_LOAD, ist } from '../../shared/crowd.mjs';
import type { Traffic } from '../../shared/crowd.mjs';
import type { Env } from './env';

const pandals = (data.pandals as { id: string; lat: number; lng: number }[]).map(({ id, lat, lng }) => ({ id, lat, lng }));
export const PANDAL_IDS = new Set(pandals.map((p) => p.id));

const SLICES = 4;
/** IST hours (inclusive start) when traffic is checked: 3 pm to 4 am. */
const ACTIVE_HOURS = new Set([15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3]);

/** Whether a cron run at `now` should call TomTom at all. */
export function trafficActive(now: number): boolean {
  const { date, hour } = ist(now);
  // Before 5 am it is still the previous evening's Puja night.
  const day = hour < 5 ? ist(now - 6 * 3600_000).date : date;
  return day in DAY_LOAD && ACTIVE_HOURS.has(hour);
}

interface FlowSegment {
  flowSegmentData?: { currentSpeed: number; freeFlowSpeed: number; confidence: number; roadClosure: boolean };
}

/** 0 = free-flowing, 1 = jammed: speeds at 85% of free flow or better count as clear, 30% or worse as jammed. */
const congestion = (current: number, free: number) => Math.max(0, Math.min(1, (0.85 - current / Math.max(free, 1)) / 0.55));

async function flowAt(key: string, lat: number, lng: number, now: number): Promise<Traffic | null> {
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/12/json?point=${lat},${lng}&unit=KMPH&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const f = ((await res.json()) as FlowSegment).flowSegmentData;
  if (!f || f.confidence < 0.4) return null;
  return { c: Math.round(congestion(f.currentSpeed, f.freeFlowSpeed) * 100) / 100, closed: !!f.roadClosure, at: now };
}

/** Checks this run's quarter of the pandals; returns only the ones TomTom answered. */
export async function checkTraffic(env: Env, now = Date.now()): Promise<Record<string, Traffic>> {
  if (!env.TOMTOM_KEY) return {};
  const slice = Math.floor(now / (15 * 60_000)) % SLICES;
  const mine = pandals.filter((_, i) => i % SLICES === slice);
  const out: Record<string, Traffic> = {};
  const results = await Promise.allSettled(mine.map((p) => flowAt(env.TOMTOM_KEY!, p.lat, p.lng, now)));
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) out[mine[i].id] = r.value;
  });
  return out;
}
