import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String, default: 'Administration' },
    role: { type: String, default: 'Admin' },
    avatar: { type: String, default: '' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordOtp: { type: String }
  },
  { timestamps: true }
);

const admin = mongoose.model('admin', adminSchema);
export default admin;
