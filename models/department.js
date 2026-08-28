import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    courses: [
      {
        code: { type: String, required: true },
        name: { type: String, required: true },
        semester: { type: String, required: true }
      }
    ]
  },
  { timestamps: true }
);

const department = mongoose.model('department', departmentSchema);
export default department;