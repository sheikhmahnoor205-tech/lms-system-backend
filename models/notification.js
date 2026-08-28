import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    roles: [{ type: String }],
    title: { type: String, required: true },
    msg: { type: String, required: true },
    time: { type: String, default: 'Just now' },
    read: { type: Boolean, default: false },
    type: { type: String, enum: ['info', 'warning', 'success', 'danger'], default: 'info' },
    link: { type: String, default: '' }
  },
  { timestamps: true }
);

const notification = mongoose.model('notification', notificationSchema);
export default notification;
