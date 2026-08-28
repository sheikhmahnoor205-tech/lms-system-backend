import setting from "../models/setting.js";

// Get current system settings or initialize with defaults if empty
export const getSettings = async (req, res) => {
  try {
    let current = await setting.findOne();
    if (!current) {
      current = new setting({
        instituteName: 'TechVision Institute of Technology',
        academicYear: '2025-2026',
        workingHoursStart: '08:30',
        workingHoursEnd: '17:00',
        lateGraceMinutes: 15,
        emailAlertsDefaulters: true,
        defaulterThresholdPercent: 75
      });
      await current.save();
    }
    res.json(current);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update system settings
export const updateSettings = async (req, res) => {
  try {
    const payload = req.body;
    let current = await setting.findOne();
    if (!current) {
      current = new setting(payload);
    } else {
      Object.assign(current, payload);
    }
    const saved = await current.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
