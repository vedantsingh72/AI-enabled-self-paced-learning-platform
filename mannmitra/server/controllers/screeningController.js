import Screening from "../models/Screening.js";
import RiskAlert from "../models/RiskAlert.js";
import { calculateRisk } from "../services/riskEngine.js";
const classifyPHQ9 = (s) =>
  s <= 4
    ? "Minimal"
    : s <= 9
      ? "Mild"
      : s <= 14
        ? "Moderate"
        : s <= 19
          ? "Moderately Severe"
          : "Severe";
const classifyGAD7 = (s) =>
  s <= 4 ? "Minimal" : s <= 9 ? "Mild" : s <= 14 ? "Moderate" : "Severe";
export const submitScreening = async (req, res, next) => {
  try {
    const { type, answers } = req.body;
    const score = answers.reduce((a, c) => a + Number(c || 0), 0);
    const severity =
      type === "PHQ9" ? classifyPHQ9(score) : classifyGAD7(score);
    const risk = calculateRisk({ screeningScore: score });
    const screening = await Screening.create({
      userId: req.user._id,
      type,
      answers,
      score,
      severity,
      riskLevel: risk.level,
    });
    if (risk.level === "HIGH")
      await RiskAlert.create({
        userId: req.user._id,
        source: "screening",
        riskLevel: "HIGH",
        reason: `${type} severe score: ${score}`,
      });
    res
      .status(201)
      .json({ screening, emergencyEscalation: risk.level === "HIGH" });
  } catch (e) {
    next(e);
  }
};

/** List current user's screenings (newest first). Omits raw answers. */
export const listMyScreenings = async (req, res, next) => {
  try {
    const rows = await Screening.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("type score severity riskLevel createdAt")
      .lean();
    res.json(rows);
  } catch (e) {
    next(e);
  }
};
