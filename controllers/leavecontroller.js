import leave from "../models/leave.js";

// List all leaves or filter by roll / studentName / status
export const list = async (req, res) => {
  try {
    const { roll, status, applicantRole } = req.query;
    const filter = {};
    if (roll) filter.roll = roll;
    if (status && status !== 'All') filter.status = status;
    if (applicantRole) filter.applicantRole = applicantRole;

    const data = await leave.find(filter).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Store a new leave application
export const store = async (req, res) => {
  try {
    const { studentName, roll, dept, type, startDate, endDate, reason, applicantRole } = req.body;
    if (!studentName || !roll || !type || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    const newLeave = new leave({
      studentName,
      roll,
      dept: dept || '',
      type,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      applicantRole: applicantRole || 'Student',
      appliedOn: new Date().toISOString().split('T')[0]
    });

    const saved = await newLeave.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update leave status (Approved / Rejected)
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const updated = await leave.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Leave record not found." });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete leave record
export const deletedata = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await leave.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Leave record not found." });
    }
    res.json({ message: "Leave application deleted successfully", id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
