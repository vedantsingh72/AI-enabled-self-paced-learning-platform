import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";

const AdaptiveLearningContext = createContext(null);

export function AdaptiveLearningProvider({ children }) {
  const [risk, setRisk] = useState({
    riskLevel: "Normal",
    finalScore: 0,
    behavioralScore: 0,
    mentalHealthScore: 2.5,
  });
  /** Per-subject target unit counts from fused risk (see /learning/risk-score). */
  const [lecturePlan, setLecturePlan] = useState(null);
  const [consent, setConsent] = useState(null);

  const refreshRisk = useCallback(async () => {
    try {
      const { data } = await api.get("/learning/risk-score");
      setRisk({
        riskLevel: data.riskLevel || "Normal",
        finalScore: Number(data.finalScore) || 0,
        behavioralScore: Number(data.behavioralScore) || 0,
        mentalHealthScore: Number(data.mentalHealthScore) || 0,
      });
      setLecturePlan(data.lecturePlan ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/learning/consent")
      .then(({ data }) => {
        if (!cancelled) setConsent(!!data?.hasConsent);
      })
      .catch(() => {
        if (!cancelled) setConsent(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const acceptConsent = useCallback(async () => {
    await api.post("/learning/consent", { accepted: true });
    setConsent(true);
    await refreshRisk();
  }, [refreshRisk]);

  const value = useMemo(
    () => ({
      risk,
      setRisk,
      lecturePlan,
      setLecturePlan,
      refreshRisk,
      consentLoading: consent === null,
      hasConsent: consent === true,
      acceptConsent,
    }),
    [risk, setRisk, lecturePlan, refreshRisk, consent, acceptConsent],
  );

  return (
    <AdaptiveLearningContext.Provider value={value}>
      {children}
    </AdaptiveLearningContext.Provider>
  );
}

export function useAdaptiveLearning() {
  const ctx = useContext(AdaptiveLearningContext);
  if (!ctx) {
    throw new Error("useAdaptiveLearning must be used within provider");
  }
  return ctx;
}
