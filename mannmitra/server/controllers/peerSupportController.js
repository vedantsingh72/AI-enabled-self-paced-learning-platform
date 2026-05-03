import PeerVolunteer from "../models/PeerVolunteer.js";
import PeerGroup from "../models/PeerGroup.js";
import PeerGroupMember from "../models/PeerGroupMember.js";
import PeerMessage from "../models/PeerMessage.js";
import PeerTrainingRecord from "../models/PeerTrainingRecord.js";
import PeerReport from "../models/PeerReport.js";
import EscalationAlert from "../models/EscalationAlert.js";
import User from "../models/User.js";

const riskyPattern =
  /(suicide|kill myself|self harm|i want to disappear|end my life|hurt myself)/i;

export const recruitVolunteer = async (req, res, next) => {
  try {
    const { email, skills = [] } = req.body || {};
    const institute = req.admin?.institute || req.body?.institute;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    const volunteer = await PeerVolunteer.findOneAndUpdate(
      { userId: user._id, institute },
      { userId: user._id, institute, skills, status: "pending-training" },
      { upsert: true, new: true },
    );
    res.status(201).json(volunteer);
  } catch (e) {
    next(e);
  }
};

export const completeVolunteerTraining = async (req, res, next) => {
  try {
    const { volunteerId } = req.params;
    const modules = req.body?.modules || [
      "active-listening",
      "mental-health-basics",
      "crisis-warning-signs",
      "confidentiality-ethics",
      "escalation-procedures",
    ];
    const record = await PeerTrainingRecord.findOneAndUpdate(
      { volunteerId },
      {
        volunteerId,
        modules,
        completed: true,
        completedAt: new Date(),
        certificateIssued: true,
        badge: "Certified Peer Wellness Mentor",
      },
      { upsert: true, new: true },
    );
    await PeerVolunteer.findByIdAndUpdate(volunteerId, { status: "active" });
    res.json(record);
  } catch (e) {
    next(e);
  }
};

export const createPeerGroup = async (req, res, next) => {
  try {
    if (req.admin?.role !== "institute") {
      return res
        .status(403)
        .json({ message: "Only Institute can create peer support rooms" });
    }
    const { name, category, language, type, scheduledAt } = req.body || {};
    const institute = req.admin?.institute || "Unspecified";
    const group = await PeerGroup.create({
      name,
      category,
      language: language || "English",
      type: type || "group-chat",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      institute,
    });
    res.status(201).json(group);
  } catch (e) {
    next(e);
  }
};

export const listPeerGroups = async (req, res, next) => {
  try {
    const { category, language, institute, type } = req.query;
    const userInstitute = req.user?.institute || req.user?.college || "";
    const filter = {
      active: true,
      institute: {
        $in: ["shared", institute || userInstitute].filter(Boolean),
      },
    };
    if (category) filter.category = category;
    if (language) filter.language = language;
    if (type) filter.type = type;
    const groups = await PeerGroup.find(filter).sort({ createdAt: -1 });
    res.json(groups);
  } catch (e) {
    next(e);
  }
};

export const joinPeerGroup = async (req, res, next) => {
  try {
    const row = await PeerGroupMember.findOneAndUpdate(
      { groupId: req.params.groupId, userId: req.user._id },
      { groupId: req.params.groupId, userId: req.user._id, role: "member" },
      { upsert: true, new: true },
    );
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
};

export const listGroupMessages = async (req, res, next) => {
  try {
    const rows = await PeerMessage.find({ groupId: req.params.groupId })
      .sort({ createdAt: 1 })
      .limit(300)
      .populate("senderId", "displayName name username");
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const postGroupMessage = async (req, res, next) => {
  try {
    const { text } = req.body || {};
    const flagged = riskyPattern.test(text || "");
    const message = await PeerMessage.create({
      groupId: req.params.groupId,
      senderId: req.user._id,
      text,
      flagged,
      flagReason: flagged ? "Potential self-harm language detected" : "",
    });
    if (flagged) {
      await PeerReport.create({
        groupId: req.params.groupId,
        messageId: message._id,
        reportedByUserId: req.user._id,
        reason: "AI moderation flagged risky language",
      });
      await EscalationAlert.create({
        groupId: req.params.groupId,
        userId: req.user._id,
        messageId: message._id,
        source: "ai",
        severity: "HIGH",
        reason: "Risky message in peer support group",
      });
    }
    res.status(201).json(message);
  } catch (e) {
    next(e);
  }
};

export const requestOneToOneMatch = async (req, res, next) => {
  try {
    const { category, language } = req.body || {};
    const institute = req.user.institute || req.user.college;
    const matchedGroup = await PeerGroup.findOne({
      type: "one-to-one",
      category,
      language: language || "English",
      institute: { $in: [institute, "shared"] },
      active: true,
    }).sort({ createdAt: -1 });
    if (!matchedGroup) {
      return res
        .status(404)
        .json({ message: "No one-to-one group available for match" });
    }
    await PeerGroupMember.findOneAndUpdate(
      { groupId: matchedGroup._id, userId: req.user._id },
      { groupId: matchedGroup._id, userId: req.user._id, role: "member" },
      { upsert: true, new: true },
    );
    return res.json(matchedGroup);
  } catch (e) {
    return next(e);
  }
};

export const volunteerEscalate = async (req, res, next) => {
  try {
    const { userId, reason, severity } = req.body || {};
    const row = await EscalationAlert.create({
      groupId: req.params.groupId,
      userId,
      source: "volunteer",
      severity: severity || "HIGH",
      reason: reason || "Volunteer initiated escalation",
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
};

export const listEscalations = async (req, res, next) => {
  try {
    let filter = {};
    if (req.admin?.role === "institute") {
      const studs = await User.find({
        role: "student",
        institute: req.admin.institute,
      }).select("_id");
      const ids = studs.map((u) => u._id);
      filter = { userId: { $in: ids } };
    }
    const rows = await EscalationAlert.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(rows);
  } catch (e) {
    next(e);
  }
};
