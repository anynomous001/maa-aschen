/**
 * Live road traffic next to a pandal, as measured by TomTom (worker/src/traffic.ts), turned into a plain label.
 * This is vehicle speed on the nearest road, NOT the crowd or the queue at the pandal; the site says so.
 * Plain JS so the site and the Worker share it; types in crowd.d.mts.
 */

/** Readings older than this are not shown. */
export const LIVE_MAX_AGE_MS = 75 * 60 * 1000;

/** IST dates when the Worker checks traffic (the Puja and the evenings just before it). */
export const TRAFFIC_DATES = ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'];

const IST_MS = 5.5 * 60 * 60 * 1000;
/** IST calendar date and hour for a timestamp. */
export function ist(ms) {
  const d = new Date(ms + IST_MS);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

/**
 * 'clear' | 'slow' | 'heavy' | 'closed' for a fresh reading, else null. `traffic.c` is 0 (cars at normal speed) to
 * 1 (cars at 30% of normal speed or slower), as measured by TomTom on the nearest road segment.
 */
export function trafficLevel(traffic, now) {
  if (!traffic || now - traffic.at > LIVE_MAX_AGE_MS) return null;
  if (traffic.closed) return 'closed';
  return traffic.c < 0.2 ? 'clear' : traffic.c < 0.5 ? 'slow' : 'heavy';
}
