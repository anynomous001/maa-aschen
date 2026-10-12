/**
 * Live crowd signals from the API (GET /crowd): road traffic next to each pandal and how many visitors tapped
 * Directions to it in the last hour. Refreshed every 5 minutes; without an API the site falls back to estimates.
 */
import { API_URL } from '../config';
import type { Traffic } from '../../shared/crowd.mjs';
import { visitorId } from './visitors';

interface CrowdData {
  traffic: Record<string, Traffic>;
  going: Record<string, number>;
}

let data: CrowdData = { traffic: {}, going: {} };
const REFRESH_MS = 5 * 60_000;

export const trafficFor = (id: string): Traffic | undefined => data.traffic[id];
export const goingTo = (id: string): number => data.going[id] ?? 0;

/** Tells the API someone set off for a pandal (anonymous; counted for an hour). */
export function reportGo(pandalId: string) {
  if (!API_URL) return;
  const body = JSON.stringify({ id: visitorId(), pandal: pandalId });
  try {
    // text/plain keeps the beacon a "simple" request (no CORS preflight); the API parses it as JSON anyway.
    if (!navigator.sendBeacon?.(`${API_URL}/go`, new Blob([body], { type: 'text/plain' })))
      void fetch(`${API_URL}/go`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* offline */
  }
}

/** Starts polling /crowd; fires `crowd:update` on window after each successful load. */
export function initCrowd() {
  if (!API_URL) return;
  const load = () =>
    fetch(`${API_URL}/crowd`)
      .then((r) => (r.ok ? (r.json() as Promise<CrowdData>) : null))
      .then((d) => {
        if (!d || typeof d.traffic !== 'object') return;
        data = { traffic: d.traffic ?? {}, going: d.going ?? {} };
        dispatchEvent(new Event('crowd:update'));
      })
      .catch(() => {});
  void load();
  setInterval(() => document.visibilityState === 'visible' && void load(), REFRESH_MS);
}
