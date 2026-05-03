import MoodEntry from "../models/MoodEntry.js";
export const addMood = async (req, res, next) => {
  try {
    const { mood, note = "", date } = req.body;
    const e = await MoodEntry.findOneAndUpdate(
      { userId: req.user._id, date },
      { userId: req.user._id, mood, note, date },
      { upsert: true, new: true },
    );
    res.status(201).json(e);
  } catch (e) {
    next(e);
  }
};
export const getMoodHistory = async (req, res, next) => {
  try {
    const h = await MoodEntry.find({ userId: req.user._id })
      .sort({ date: -1 })
      .limit(7);
    res.json(h);
  } catch (e) {
    next(e);
  }
};
