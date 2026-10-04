/** The student has reached the end of a lesson section. */
export function sectionHasBeenRead(top: number, bottom: number, viewportHeight: number): boolean {
  if (viewportHeight <= 0 || bottom <= top) return false;
  const endReached = bottom <= viewportHeight * 0.92;
  const started = top < viewportHeight * 0.55;
  return endReached && started;
}
