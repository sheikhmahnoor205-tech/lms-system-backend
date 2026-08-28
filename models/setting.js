import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    instituteName: { type: String, default: 'TechVision Institute of Technology' },
    academicYear: { type: String, default: '2025-2026' },
    workingHoursStart: { type: String, default: '08:30' },
    workingHoursEnd: { type: String, default: '17:00' },
    lateGraceMinutes: { type: Number, default: 15 },
    emailAlertsDefaulters: { type: Boolean, default: true },
    defaulterThresholdPercent: { type: Number, default: 75 }
  },
  { timestamps: true }
);

const setting = mongoose.model('setting', settingSchema);
export default setting;
