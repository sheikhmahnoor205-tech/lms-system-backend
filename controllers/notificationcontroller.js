import notification from "../models/notification.js";

// List all notifications
export const list = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) {
      filter.roles = role;
    }
    const data = await notification.find(filter).sort({ createdAt: -1 }).limit(30);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Store a notification
export const store = async (req, res) => {
  try {
    const { roles, title, msg, time, type, link } = req.body;
    const newNotif = new notification({
      roles: roles || ['Admin', 'Teacher', 'Student'],
      title,
      msg,
      time: time || 'Just now',
      type: type || 'info',
      link: link || ''
    });
    const saved = await newNotif.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications read
export const markAllRead = async (req, res) => {
  try {
    await notification.updateMany({ read: false }, { read: true });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
