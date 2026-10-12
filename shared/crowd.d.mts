export type Tier = 'A' | 'B' | 'C';
export interface Traffic {
  /** 0 = free-flowing, 1 = jammed. */
  c: number;
  /** Road closed (often police crowd control near big pandals). */
  closed: boolean;
  /** When it was measured (ms). */
  at: number;
}
export interface CrowdNow {
  minutes: number;
  level: 'low' | 'mid' | 'high';
  /** Live road traffic was used. */
  live: boolean;
}

export const TIER_PEAK_MIN: Record<Tier, number>;
export const DAY_LOAD: Record<string, number>;
export const HOUR_LOAD: number[];
export const LIVE_MAX_AGE_MS: number;
export function ist(ms: number): { date: string; hour: number };
export function baseLoad(ms: number): number | null;
export function liveFactor(traffic: Traffic | null | undefined, now: number): number | null;
export function crowdNow(tier: Tier | string, now: number, traffic?: Traffic | null): CrowdNow | null;
export function queueRange(minutes: number): [number, number];
