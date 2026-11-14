// Logical screen size. Height is always 270. On phones the width grows to match the screen's
// shape (up to 600) so the game fills a wide phone screen instead of sitting in a small box.
// Desktop stays at 480x270 (16:9).
export const H = 270;
export const isPhone = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 1) &&
  Math.min(screen.width, screen.height) < 820;
function viewWidth() {
  if (!isPhone) return 480;
  const a = Math.max(innerWidth, innerHeight) / Math.min(innerWidth, innerHeight);
  return Math.max(480, Math.min(600, Math.round((H * a) / 2) * 2));
}
export const W = viewWidth();
export const OX = Math.round((W - 480) / 2); // shift for layouts designed at 480 wide
