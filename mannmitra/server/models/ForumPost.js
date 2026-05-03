import mongoose from "mongoose";
const ReplySchema = new mongoose.Schema({
  anonymousId: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
});
const ForumPostSchema = new mongoose.Schema(
  {
    anonymousId: String,
    title: String,
    content: String,
    tags: [String],
    isFlagged: { type: Boolean, default: false },
    replies: [ReplySchema],
  },
  { timestamps: true },
);
export default mongoose.model("ForumPost", ForumPostSchema);
