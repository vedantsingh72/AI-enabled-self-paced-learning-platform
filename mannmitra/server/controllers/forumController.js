import ForumPost from "../models/ForumPost.js";
export const createPost = async (req, res, next) => {
  try {
    const { title, content, tags = [] } = req.body;
    const flagged = /(violence plan|drug dealing)/i.test(`${title} ${content}`);
    const p = await ForumPost.create({
      anonymousId: req.user.anonymousId,
      title,
      content,
      tags,
      isFlagged: flagged,
    });
    res.status(201).json(p);
  } catch (e) {
    next(e);
  }
};
export const getPosts = async (_req, res, next) => {
  try {
    const p = await ForumPost.find().sort({ createdAt: -1 }).limit(100);
    res.json(p);
  } catch (e) {
    next(e);
  }
};
export const addReply = async (req, res, next) => {
  try {
    const { content } = req.body;
    const p = await ForumPost.findByIdAndUpdate(
      req.params.id,
      { $push: { replies: { anonymousId: req.user.anonymousId, content } } },
      { new: true },
    );
    res.json(p);
  } catch (e) {
    next(e);
  }
};
