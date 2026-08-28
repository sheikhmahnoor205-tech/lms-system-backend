import bcrypt from "bcryptjs";
import crypto from "crypto";
import admin from "../models/admin.js";
import department from "../models/department.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

// Ensure a default admin exists in the database
const ensureDefaultAdmin = async () => {
  try {
    const existing = await admin.findOne();
    if (!existing) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const defaultAdmin = new admin({
        name: 'Mahnoor Ahmad',
        email: 'admin@attendflow.edu',
        password: hashedPassword,
        department: 'Administration',
        role: 'Admin',
        avatar: ''
      });
      await defaultAdmin.save();
      console.log('Default dynamic admin seeded in database');
    }
  } catch (err) {
    console.error('Error ensuring default admin in DB:', err);
  }
};

ensureDefaultAdmin();

// Admin Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let foundAdmin;
    if (email) {
      foundAdmin = await admin.findOne({ email: email.trim().toLowerCase() });
    } else {
      foundAdmin = await admin.findOne();
    }

    if (!foundAdmin) {
      return res.status(404).json({ message: "Admin account not found in database." });
    }

    if (password) {
      const isMatch = await bcrypt.compare(password, foundAdmin.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid admin password." });
      }
    }

    res.json({
      _id: foundAdmin._id,
      id: foundAdmin._id,
      name: foundAdmin.name,
      email: foundAdmin.email,
      department: foundAdmin.department,
      role: foundAdmin.role || 'Admin',
      avatar: foundAdmin.avatar || '',
      courses: (await (async () => {
        const depts = await department.find();
        const all = [];
        depts.forEach(d => {
          if (Array.isArray(d.courses)) {
            d.courses.forEach(c => {
              all.push({
                ...c,
                departmentId: d._id,
                departmentName: d.name,
                departmentCode: d.code
              });
            });
          }
        });
        return all;
      })())
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Admin Profile
export const getProfile = async (req, res) => {
  try {
    let foundAdmin = await admin.findOne();
    if (!foundAdmin) {
      await ensureDefaultAdmin();
      foundAdmin = await admin.findOne();
    }
    const courses = (await (async () => {
        const depts = await department.find();
        const all = [];
        depts.forEach(d => {
          if (Array.isArray(d.courses)) {
            d.courses.forEach(c => {
              all.push({
                ...c,
                departmentId: d._id,
                departmentName: d.name,
                departmentCode: d.code
              });
            });
          }
        });
        return all;
      })());
    res.json({
      ...foundAdmin.toObject(),
      courses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Admin Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, password, department, avatar } = req.body;
    let foundAdmin = await admin.findOne();
    if (!foundAdmin) {
      foundAdmin = new admin({ name, email, password: 'admin', department, avatar });
    } else {
      if (name) foundAdmin.name = name;
      if (email) foundAdmin.email = email;
      if (department) foundAdmin.department = department;
      if (avatar !== undefined) foundAdmin.avatar = avatar;
      if (password) {
        foundAdmin.password = await bcrypt.hash(password, 10);
      }
    }
    const saved = await foundAdmin.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot Password for Admin
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    let foundAdmin;
    if (email) {
      foundAdmin = await admin.findOne({ email: email.trim().toLowerCase() });
    } else {
      foundAdmin = await admin.findOne();
    }

    if (!foundAdmin) {
      return res.status(404).json({ message: "No admin account found in database with that email." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    foundAdmin.resetPasswordToken = resetToken;
    foundAdmin.resetPasswordOtp = otp;
    foundAdmin.resetPasswordExpires = Date.now() + 3600000;
    await foundAdmin.save();

    let previewUrl = null;
    try {
      const emailResult = await sendPasswordResetEmail({
        to: foundAdmin.email,
        name: foundAdmin.name,
        resetToken,
        otp,
        role: 'admin'
      });
      previewUrl = emailResult?.previewUrl || null;
    } catch (mailErr) {
      console.error('Mail error in admin forgotPassword:', mailErr);
    }

    res.status(200).json({
      message: "Password recovery instructions generated successfully.",
      previewUrl,
      otp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password for Admin
export const resetPassword = async (req, res) => {
  try {
    const { email, token, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const query = {
      resetPasswordExpires: { $gt: Date.now() }
    };
    if (email) query.email = email.trim().toLowerCase();
    if (token) query.resetPasswordToken = token;
    if (otp) query.resetPasswordOtp = otp;

    let foundAdmin = await admin.findOne(query);
    if (!foundAdmin) {
      foundAdmin = await admin.findOne({ email: email ? email.trim().toLowerCase() : undefined });
      if (!foundAdmin) {
        return res.status(400).json({ message: "Invalid or expired token/OTP code." });
      }
    }

    foundAdmin.password = await bcrypt.hash(newPassword.trim(), 10);
    foundAdmin.resetPasswordToken = undefined;
    foundAdmin.resetPasswordOtp = undefined;
    foundAdmin.resetPasswordExpires = undefined;
    await foundAdmin.save();

    res.status(200).json({ message: "Admin password successfully reset in database." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
