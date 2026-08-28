import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    time: { type: String, required: true },
    subject: { type: String, required: true },
    code: { type: String },
    room: { type: String },
    instructor: { type: String },
    dept: { type: String }
  },
  { timestamps: true }
);

const schedule = mongoose.model('schedule', scheduleSchema);
export default schedule;
