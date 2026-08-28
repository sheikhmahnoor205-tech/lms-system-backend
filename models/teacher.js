import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    avatar: { type: String, default: '' },
    assignedCourses: [
      {
        code: { type: String },
        name: { type: String },
        semester: { type: String },
        deptCode: { type: String },
        deptName: { type: String }
      }
    ],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordOtp: { type: String }
  },
  { timestamps: true }
);

const teacher = mongoose.model('teacher', teacherSchema);
export default teacher;