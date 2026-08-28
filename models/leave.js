import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    roll: { type: String, required: true },
    dept: { type: String, default: '' },
    type: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    applicantRole: { type: String, enum: ['Student', 'Teacher', 'Admin'], default: 'Student' },
    appliedOn: { type: String, default: () => new Date().toISOString().split('T')[0] }
  },
  { timestamps: true }
);

const leave = mongoose.model('leave', leaveSchema);
export default leave;
