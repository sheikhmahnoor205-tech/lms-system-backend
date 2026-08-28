import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    roll:      { type: String, required: true },
    name:      { type: String, default: '' },
    dept:      { type: String, default: '' },
    date:      { type: String, required: true },
    subject:   { type: String, default: '' },
    status:    { type: String, enum: ['present', 'late', 'absent'], required: true },
    time:      { type: String, default: '' },
    markedBy:  { type: String, default: 'Teacher Manual' }
  },
  { timestamps: true }
);

const attendance = mongoose.model('attendance', attendanceSchema);
export default attendance;
