const suicidalKeywords = [
  "suicide",
  "kill myself",
  "end my life",
  "self harm",
  "die",
];

export const calculateRisk = ({
  text = "",
  sentiment = "neutral",
  screeningScore = 0,
  negativeStreak = 0,
}) => {
  const hasKeyword = suicidalKeywords.some((w) =>
    text.toLowerCase().includes(w),
  );
  if (hasKeyword || screeningScore >= 20 || negativeStreak >= 4)
    return { level: "HIGH", reason: "Critical indicators detected" };
  if (sentiment === "negative" || screeningScore >= 10 || negativeStreak >= 2)
    return { level: "MEDIUM", reason: "Elevated distress detected" };
  return { level: "LOW", reason: "No major indicators detected" };
};
