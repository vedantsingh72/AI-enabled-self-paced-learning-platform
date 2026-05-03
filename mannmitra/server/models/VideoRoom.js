import mongoose from "mongoose";
const VideoRoomSchema = new mongoose.Schema(
  {
    roomId: { type: String, unique: true },
    participants: [String],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export default mongoose.model("VideoRoom", VideoRoomSchema);
