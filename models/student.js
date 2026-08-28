import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    roll: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    password: { type: String },
    dept: { type: String },
    grade: { type: String },
    attendance: { type: Number, default: 0 },
    status: { type: String, default: 'Active' },
    avatar: { type: String },
    midterm: { type: Number, default: 0 },
    final: { type: Number, default: 0 },
    sectional: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    creditHours: { type: Number, default: 3 },
    gpa: { type: Number, default: 0 },
    sgpa: { type: Number, default: 0 },
    cgpa: { type: Number, default: 0 },
    letterGrade: { type: String, default: 'N/A' },
    performanceStatus: { type: String, default: 'Not Evaluated' },
    academicStanding: { type: String, default: 'Not Evaluated' },
    subjects: [
      {
        code: { type: String },
        name: { type: String },
        creditHours: { type: Number, default: 3 },
        midterm: { type: Number, default: 0 },
        final: { type: Number, default: 0 },
        sectional: { type: Number, default: 0 },
        totalMarks: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        letterGrade: { type: String, default: 'N/A' },
        gpa: { type: Number, default: 0 },
        performanceStatus: { type: String, default: 'Not Evaluated' }
      }
    ],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordOtp: { type: String }
  },
  { timestamps: true }
);

const student = mongoose.model('student', studentSchema);
export default student;