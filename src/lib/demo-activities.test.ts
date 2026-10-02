import { describe, expect, it } from 'vitest';
import { DEMO_ID_PREFIX, isDemoActivity } from './demo-activities';

describe('isDemoActivity', () => {
  it('is true only for ids starting with demo- (incl. span tails)', () => {
    expect(DEMO_ID_PREFIX).toBe('demo-');
    expect(isDemoActivity({ id: 'demo-123' })).toBe(true);
    expect(isDemoActivity({ id: 'demo-123-next' })).toBe(true);
    expect(isDemoActivity({ id: '123-demo' })).toBe(false);
    expect(isDemoActivity({ id: 'a1b2' })).toBe(false);
  });
});
