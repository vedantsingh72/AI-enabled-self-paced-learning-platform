import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import IdentityVault from "../models/IdentityVault.js";
import {
  generatePublicAnonymousId,
  toDisplayName,
} from "../services/anonymousIdService.js";
import { encryptText } from "../services/cryptoService.js";
export const createSession = async (req, res, next) => {
  try {
    const { college } = req.body || {};
    const anonymousId = uuidv4();
    const publicAnonymousId = generatePublicAnonymousId();
    const user = await User.create({
      anonymousId,
      college: college?.trim() || "Unspecified",
      publicAnonymousId,
      displayName: toDisplayName(publicAnonymousId),
      role: "student",
    });
    await IdentityVault.create({
      publicAnonymousId,
      userId: user._id,
    });
    res.status(201).json({
      anonymousId,
      userId: user._id,
      college: user.college,
      role: user.role,
      publicAnonymousId: user.publicAnonymousId,
      displayName: user.displayName,
    });
  } catch (e) {
    next(e);
  }
};

export const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const expectedUsername = process.env.ADMIN_USERNAME || "admin";
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
    if (username !== expectedUsername || password !== expectedPassword) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { role: "main_admin", username },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "12h" },
    );
    res.json({ token, role: "main_admin", username });
  } catch (e) {
    next(e);
  }
};

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, institute, username } = req.body || {};
    if (!email || !password || !institute || !name || !username) {
      return res.status(400).json({
        message: "name, username, email, password and institute are required",
      });
    }
    const normalizedUsername = username.toLowerCase().trim();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }
    const existingUsername = await User.findOne({
      username: normalizedUsername,
    });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const publicAnonymousId = generatePublicAnonymousId();
    const user = await User.create({
      anonymousId: uuidv4(),
      name,
      username: normalizedUsername,
      email: email.toLowerCase(),
      passwordHash,
      institute,
      college: institute,
      publicAnonymousId,
      displayName: toDisplayName(publicAnonymousId),
      role: "student",
      isPaidCounsellor: false,
    });
    const encryptedPayload = encryptText(
      JSON.stringify({
        name: name || "User",
        email: email.toLowerCase(),
      }),
    );
    await IdentityVault.create({
      publicAnonymousId,
      userId: user._id,
      encryptedPayload: encryptedPayload.cipherText,
      iv: encryptedPayload.iv,
      authTag: encryptedPayload.authTag,
    });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "7d" },
    );
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        institute: user.institute,
        publicAnonymousId: user.publicAnonymousId,
        displayName: user.displayName,
      },
    });
  } catch (e) {
    return next(e);
  }
};

/** Public self-serve counsellor registration (same shape as student signup + speciality). */
/** Public self-serve doubt teacher (academic video support) — same shape as counsellor + subjects. */
export const signupDoubtTeacher = async (req, res, next) => {
  try {
    const { name, email, password, institute, username, speciality } =
      req.body || {};
    if (!email || !password || !institute || !name || !username) {
      return res.status(400).json({
        message: "name, username, email, password and institute are required",
      });
    }
    const normalizedUsername = username.toLowerCase().trim();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }
    const existingUsername = await User.findOne({
      username: normalizedUsername,
    });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const publicAnonymousId = generatePublicAnonymousId();
    const user = await User.create({
      anonymousId: uuidv4(),
      name,
      username: normalizedUsername,
      email: email.toLowerCase(),
      passwordHash,
      institute,
      college: institute,
      publicAnonymousId,
      displayName: name.trim() || toDisplayName(publicAnonymousId),
      role: "doubt_teacher",
      isPaidCounsellor: false,
      speciality: (speciality || "").trim(),
    });
    const encryptedPayload = encryptText(
      JSON.stringify({
        name: name || "User",
        email: email.toLowerCase(),
      }),
    );
    await IdentityVault.create({
      publicAnonymousId,
      userId: user._id,
      encryptedPayload: encryptedPayload.cipherText,
      iv: encryptedPayload.iv,
      authTag: encryptedPayload.authTag,
    });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "7d" },
    );
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        institute: user.institute,
        speciality: user.speciality,
        publicAnonymousId: user.publicAnonymousId,
        displayName: user.displayName,
      },
    });
  } catch (e) {
    return next(e);
  }
};

export const signupCounsellor = async (req, res, next) => {
  try {
    const { name, email, password, institute, username, speciality } = req.body || {};
    if (!email || !password || !institute || !name || !username) {
      return res.status(400).json({
        message: "name, username, email, password and institute are required",
      });
    }
    const normalizedUsername = username.toLowerCase().trim();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }
    const existingUsername = await User.findOne({
      username: normalizedUsername,
    });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const publicAnonymousId = generatePublicAnonymousId();
    const user = await User.create({
      anonymousId: uuidv4(),
      name,
      username: normalizedUsername,
      email: email.toLowerCase(),
      passwordHash,
      institute,
      college: institute,
      publicAnonymousId,
      displayName: name.trim() || toDisplayName(publicAnonymousId),
      role: "counsellor",
      isPaidCounsellor: false,
      speciality: (speciality || "").trim(),
    });
    const encryptedPayload = encryptText(
      JSON.stringify({
        name: name || "User",
        email: email.toLowerCase(),
      }),
    );
    await IdentityVault.create({
      publicAnonymousId,
      userId: user._id,
      encryptedPayload: encryptedPayload.cipherText,
      iv: encryptedPayload.iv,
      authTag: encryptedPayload.authTag,
    });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "7d" },
    );
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        institute: user.institute,
        speciality: user.speciality,
        publicAnonymousId: user.publicAnonymousId,
        displayName: user.displayName,
      },
    });
  } catch (e) {
    return next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = (email || "").toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const mainAdminEmail = (
        process.env.MAIN_ADMIN_EMAIL || "admin@mannmitra.com"
      ).toLowerCase();
      const mainAdminPassword = process.env.MAIN_ADMIN_PASSWORD || "admin123";
      if (
        normalizedEmail === mainAdminEmail &&
        password === mainAdminPassword
      ) {
        const token = jwt.sign(
          { role: "main_admin", email: normalizedEmail },
          process.env.JWT_SECRET || "dev-secret-change-me",
          { expiresIn: "12h" },
        );
        return res.json({
          token,
          user: {
            id: "main-admin-env",
            name: "Main Admin",
            username: "main_admin",
            email: normalizedEmail,
            role: "main_admin",
            institute: "Platform",
            publicAnonymousId: null,
            displayName: "Main Admin",
          },
        });
      }
    }
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password || "", user.passwordHash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "7d" },
    );
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        institute: user.institute,
        publicAnonymousId: user.publicAnonymousId,
        displayName: user.displayName,
      },
    });
  } catch (e) {
    return next(e);
  }
};
