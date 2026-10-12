export interface Traffic {
  /** 0 = cars at normal speed on the nearest road, 1 = at 30% of normal speed or slower (TomTom). */
  c: number;
  /** TomTom reports the nearest road segment as closed. */
  closed: boolean;
  /** When it was measured (ms). */
  at: number;
}
export type TrafficLevel = 'clear' | 'slow' | 'heavy' | 'closed';

export const LIVE_MAX_AGE_MS: number;
export const TRAFFIC_DATES: string[];
export function ist(ms: number): { date: string; hour: number };
export function trafficLevel(traffic: Traffic | null | undefined, now: number): TrafficLevel | null;
