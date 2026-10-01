export interface TimeBucket {
  /** Bucket start, in minutes since midnight. */
  start: number;
  /** e.g. `09:00–12:00` */
  label: string;
}

const BUCKET_MINUTES = 180;

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * The 3-hour bucket a start time falls in — shared by the "Your routine"
 * insight card and Activity Analytics' "Most common time".
 */
export function getTimeBucket(startMinutes: number): TimeBucket {
  const start = Math.floor(startMinutes / BUCKET_MINUTES) * BUCKET_MINUTES;
  return { start, label: `${clock(start)}–${clock(start + BUCKET_MINUTES)}` };
}
