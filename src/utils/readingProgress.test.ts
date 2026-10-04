import { describe, expect, it } from 'vitest';
import { sectionHasBeenRead } from './readingProgress';

describe('sectionHasBeenRead', () => {
  const viewport = 800;

  it('does not count a section the student has not finished', () => {
    expect(sectionHasBeenRead(40, 1400, viewport)).toBe(false);
  });

  it('counts a section once its end is on screen', () => {
    expect(sectionHasBeenRead(20, 700, viewport)).toBe(true);
  });

  it('counts a section already scrolled past', () => {
    expect(sectionHasBeenRead(-900, -40, viewport)).toBe(true);
  });

  it('does not count a section still below the fold', () => {
    expect(sectionHasBeenRead(900, 1600, viewport)).toBe(false);
  });
});
