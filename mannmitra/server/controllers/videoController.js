import { v4 as uuidv4 } from "uuid";
import VideoRoom from "../models/VideoRoom.js";
import Booking from "../models/Booking.js";
export const createVideoRoom = async (_req, res, next) => {
  try {
    const room = await VideoRoom.create({ roomId: uuidv4(), participants: [] });
    res.status(201).json(room);
  } catch (e) {
    next(e);
  }
};
export const getVideoRoom = async (req, res, next) => {
  try {
    const room = await VideoRoom.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (e) {
    next(e);
  }
};

export const validateMeetingCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const room = await VideoRoom.findOne({ roomId: code, active: true });
    const booking = await Booking.findOne({
      meetingCode: code,
      meetingStatus: "active",
      status: { $in: ["scheduled", "room-shared"] },
    });
    if (!booking && !room) {
      return res
        .status(404)
        .json({ message: "Meeting code invalid or meeting already completed" });
    }
    return res.json({
      valid: true,
      bookingId: booking?._id || null,
      date: booking?.date || null,
      slot: booking?.slot || null,
      roomId: booking?.meetingCode || room?.roomId || code,
    });
  } catch (e) {
    return next(e);
  }
};
