import { useCallback, useEffect, useRef } from "react";
import api from "../services/api";

const WINDOW_MS = 30000;

/**
 * Collects interaction metadata only (no typed content). Flushes to `/learning/behavior`.
 */
export function useBehaviorTracking({
  enabled,
  sessionId,
  onRiskUpdate,
}) {
  const metricsRef = useRef({
    mouseSpeedSum: 0,
    mouseSamples: 0,
    lastMouse: null,
    idleMs: 0,
    lastActivity: Date.now(),
    idleAccumStart: null,
    tabSwitchCount: 0,
    typingKeys: 0,
    typingStart: null,
    typingLast: null,
    scrollEvents: 0,
    scrollDeltaSum: 0,
    lastScrollY: typeof window !== "undefined" ? window.scrollY : 0,
    videoPauseCount: 0,
    videoReplayCount: 0,
  });

  const flush = useCallback(async () => {
    if (!enabled) return;
    const m = metricsRef.current;
    const mouseAvgSpeedPxPerSec = m.mouseSamples
      ? m.mouseSpeedSum / m.mouseSamples
      : 0;

    let typingWpmEstimate = 0;
    if (m.typingKeys > 4 && m.typingStart && m.typingLast) {
      const mins = (m.typingLast - m.typingStart) / 60000;
      if (mins > 0.02) {
        typingWpmEstimate = Math.min(130, (m.typingKeys / 5) / mins);
      }
    }

    const payload = {
      sessionId,
      windowMs: WINDOW_MS,
      mouseAvgSpeedPxPerSec,
      mouseSampleCount: m.mouseSamples,
      idleMs: Math.min(WINDOW_MS, m.idleMs),
      tabSwitchCount: m.tabSwitchCount,
      typingWpmEstimate,
      typingSampleCount: m.typingKeys,
      scrollEvents: m.scrollEvents,
      scrollDeltaSum: m.scrollDeltaSum,
      videoPauseCount: m.videoPauseCount,
      videoReplayCount: m.videoReplayCount,
    };

    try {
      const { data } = await api.post("/learning/behavior", payload);
      onRiskUpdate?.(data);
    } catch {
      /* offline / consent */
    }

    metricsRef.current.idleMs = 0;
    metricsRef.current.tabSwitchCount = 0;
    metricsRef.current.typingKeys = 0;
    metricsRef.current.typingStart = null;
    metricsRef.current.typingLast = null;
    metricsRef.current.scrollEvents = 0;
    metricsRef.current.scrollDeltaSum = 0;
    metricsRef.current.mouseSpeedSum = 0;
    metricsRef.current.mouseSamples = 0;
    metricsRef.current.videoPauseCount = 0;
    metricsRef.current.videoReplayCount = 0;
  }, [enabled, sessionId, onRiskUpdate]);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(flush, WINDOW_MS);
    return () => clearInterval(id);
  }, [enabled, flush]);

  useEffect(() => {
    if (!enabled) return undefined;
    const m = metricsRef.current;

    const markActive = () => {
      const now = Date.now();
      if (m.idleAccumStart != null) {
        m.idleMs += Math.min(now - m.idleAccumStart, WINDOW_MS);
        m.idleAccumStart = null;
      }
      m.lastActivity = now;
    };

    const onMove = (e) => {
      const now = performance.now();
      if (m.lastMouse) {
        const dt = (now - m.lastMouse.t) / 1000;
        if (dt > 0 && dt < 1.5) {
          const dist = Math.hypot(
            e.clientX - m.lastMouse.x,
            e.clientY - m.lastMouse.y,
          );
          m.mouseSpeedSum += dist / dt;
          m.mouseSamples += 1;
        }
      }
      m.lastMouse = { x: e.clientX, y: e.clientY, t: now };
      markActive();
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        m.tabSwitchCount += 1;
        if (m.idleAccumStart == null) m.idleAccumStart = Date.now();
      } else {
        markActive();
      }
    };

    const onScroll = () => {
      const y = window.scrollY;
      m.scrollEvents += 1;
      m.scrollDeltaSum += Math.abs(y - m.lastScrollY);
      m.lastScrollY = y;
      markActive();
    };

    /** Wheel deltas refine scroll “pattern” without reading page content. */
    const onWheel = (e) => {
      m.scrollDeltaSum += Math.abs(Number(e.deltaY) || 0);
      markActive();
    };

    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        m.typingKeys += 1;
        const t = Date.now();
        if (!m.typingStart) m.typingStart = t;
        m.typingLast = t;
      }
      markActive();
    };

    const idleTimer = setInterval(() => {
      if (Date.now() - m.lastActivity > 4000) {
        if (m.idleAccumStart == null) m.idleAccumStart = Date.now();
      }
    }, 1000);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      clearInterval(idleTimer);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);

  const recordVideoPause = useCallback(() => {
    metricsRef.current.videoPauseCount += 1;
  }, []);

  const recordVideoReplay = useCallback(() => {
    metricsRef.current.videoReplayCount += 1;
  }, []);

  return { recordVideoPause, recordVideoReplay };
}
