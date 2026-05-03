import Chat from "../models/Chat.js";
import { generateSupportiveReply } from "../services/aiService.js";
import { decryptText } from "../services/cryptoService.js";
import { persistEncryptedChatRound } from "../services/chatPersistence.js";

export const sendChatMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    const reply = await generateSupportiveReply(message, {
      userId: req.user._id,
    });
    const meta = await persistEncryptedChatRound(
      req.user._id,
      message,
      reply,
    );
    res.json({
      reply,
      sentiment: meta.sentiment,
      riskLevel: meta.riskLevel,
      emergencyEscalation: meta.emergencyEscalation,
      chatId: meta.chatId,
    });
  } catch (e) {
    next(e);
  }
};

export const getMyChatHistory = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ userId: req.user._id });
    if (!chat) return res.json({ messages: [] });
    const messages = chat.messages.map((m) => ({
      sender: m.sender,
      text: decryptText({
        cipherText: m.cipherText,
        iv: m.iv,
        authTag: m.authTag,
      }),
      sentiment: m.sentiment,
      createdAt: m.createdAt,
    }));
    return res.json({ latestRiskLevel: chat.latestRiskLevel, messages });
  } catch (e) {
    return next(e);
  }
};
