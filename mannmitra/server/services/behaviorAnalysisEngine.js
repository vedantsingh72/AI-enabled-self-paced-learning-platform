/**
 * Behavior Analysis Engine: interaction metadata → behavioral stress score (0–10).
 * Higher score = higher cognitive load / burnout risk signals from patterns.
 * Does not use typed content or media capture.
 */

/**
 * @param {object} metrics
 * @param {number} [metrics.windowMs]
 * @param {number} [metrics.mouseAvgSpeedPxPerSec]
 * @param {number} [metrics.idleMs]
 * @param {number} [metrics.tabSwitchCount]
 * @param {number} [metrics.typingWpmEstimate]
 * @param {number} [metrics.scrollEvents]
 * @param {number} [metrics.scrollDeltaSum]
 * @param {number} [metrics.videoPauseCount]
 * @param {number} [metrics.videoReplayCount]
 * @returns {number} 0–10
 */
export function computeBehavioralScore(metrics) {
  const windowMs = Math.max(Number(metrics.windowMs) || 30000, 1000);
  const minutes = windowMs / 60000;

  const tabPerMin = (Number(metrics.tabSwitchCount) || 0) / Math.max(minutes, 0.01);
  const idleRatio =
    Math.min(1, (Number(metrics.idleMs) || 0) / windowMs);

  const mouse = Number(metrics.mouseAvgSpeedPxPerSec) || 0;
  const mouseStress = Math.min(
    2.5,
    Math.abs(mouse - 180) / 220 + (mouse > 650 ? 1.2 : 0),
  );

  const scrollEvents = Number(metrics.scrollEvents) || 0;
  const scrollPerMin = scrollEvents / Math.max(minutes, 0.01);
  const scrollStress = Math.min(2, scrollPerMin / 25);

  const wpm = Number(metrics.typingWpmEstimate) || 0;
  const wpmStress =
    wpm <= 0 ? 0.8 : Math.min(1.5, Math.abs(wpm - 42) / 55);

  const vid =
    (Number(metrics.videoPauseCount) || 0) +
    (Number(metrics.videoReplayCount) || 0) * 1.2;
  const vidStress = Math.min(2, vid / 4);

  const tabStress = Math.min(3, tabPerMin * 0.75);
  const idleStress = Math.min(2.8, idleRatio * 4);

  let raw =
    tabStress +
    idleStress +
    mouseStress * 0.9 +
    scrollStress +
    wpmStress +
    vidStress;

  raw = raw * 0.78;
  return Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;
}
