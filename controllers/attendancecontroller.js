import attendance from '../models/attendance.js';
import student from '../models/student.js';
import mongoose from 'mongoose';

// ── Helper: recalculate & persist attendance percentage on the student doc ──
const syncStudentAttendancePct = async (studentId, roll) => {
    try {
        let studentDoc = null;
        if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
            studentDoc = await student.findById(studentId);
        }
        if (!studentDoc && (roll || studentId)) {
            studentDoc = await student.findOne({ roll: roll || studentId });
        }
        if (!studentDoc) return;

        const orConditions = [];
        if (studentDoc._id) orConditions.push({ studentId: String(studentDoc._id) });
        if (studentDoc.roll) {
            orConditions.push({ roll: String(studentDoc.roll) });
            orConditions.push({ studentId: String(studentDoc.roll) });
        }

        const logs = await attendance.find({ $or: orConditions });
        if (!logs.length) {
            await student.findByIdAndUpdate(studentDoc._id, { attendance: 0 });
            return;
        }

        const presentOrLate = logs.filter(l => l.status === 'present' || l.status === 'late').length;
        const pct = Math.round((presentOrLate / logs.length) * 100);
        await student.findByIdAndUpdate(studentDoc._id, { attendance: pct });
    } catch (err) {
        console.error('Error syncing attendance percentage:', err.message);
    }
};

// GET /attendance — list all attendance records (optionally filter by studentId, roll, date, dept, subject)
export const list = async (req, res) => {
    try {
        const filter = {};
        if (req.query.studentId) filter.studentId = req.query.studentId;
        if (req.query.roll)      filter.roll = req.query.roll;
        if (req.query.date)      filter.date = req.query.date;
        if (req.query.dept)      filter.dept = req.query.dept;
        if (req.query.subject)   filter.subject = req.query.subject;

        const records = await attendance.find(filter).sort({ date: -1, createdAt: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch attendance records', details: err.message });
    }
};

// POST /attendance/store — create or update a single attendance record
export const store = async (req, res) => {
    try {
        const { studentId, roll, name, dept, date, subject = '', status, time, markedBy } = req.body;

        if (!roll || !date || !status) {
            return res.status(400).json({ error: 'roll, date and status are required' });
        }

        const effectiveStudentId = studentId || roll;

        const updated = await attendance.findOneAndUpdate(
            { roll: String(roll), date, subject: subject || '' },
            {
                $set: {
                    studentId: String(effectiveStudentId),
                    roll: String(roll),
                    name: name || '',
                    dept: dept || '',
                    date,
                    subject: subject || '',
                    status,
                    time: time || '',
                    markedBy: markedBy || 'Teacher Manual'
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Keep the student's overall attendance percentage in sync
        await syncStudentAttendancePct(effectiveStudentId, roll);

        res.status(200).json(updated);
    } catch (err) {
        console.error('Error in attendance store:', err);
        res.status(500).json({ error: 'Failed to save attendance record', details: err.message });
    }
};

// POST /attendance/batch — save or update an entire class session in one request
// Body: { records: [{ studentId, roll, name, dept, status }], date, subject, time, markedBy }
export const storeBatch = async (req, res) => {
    try {
        const { records, date, subject = '', time = '', markedBy = 'Teacher Manual' } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: 'records array is required and must not be empty' });
        }
        if (!date) {
            return res.status(400).json({ error: 'date is required' });
        }

        const saved = [];
        const errors = [];
        const affectedStudents = [];

        for (const rec of records) {
            try {
                const { studentId, roll, name, dept, status = 'present' } = rec;
                if (!roll && !studentId) {
                    errors.push({ rec, error: 'roll or studentId is required per record' });
                    continue;
                }

                const effectiveRoll = roll ? String(roll) : String(studentId);
                const effectiveStudentId = studentId ? String(studentId) : effectiveRoll;

                const doc = await attendance.findOneAndUpdate(
                    { roll: effectiveRoll, date, subject: subject || '' },
                    {
                        $set: {
                            studentId: effectiveStudentId,
                            roll: effectiveRoll,
                            name: name || '',
                            dept: dept || '',
                            date,
                            subject: subject || '',
                            status,
                            time: time || '',
                            markedBy: markedBy || 'Teacher Manual'
                        }
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                saved.push(doc);
                affectedStudents.push({ studentId: effectiveStudentId, roll: effectiveRoll });
            } catch (innerErr) {
                console.error('Error saving individual attendance in batch:', innerErr);
                errors.push({ rec, error: innerErr.message });
            }
        }

        // Sync attendance % for all affected students
        for (const st of affectedStudents) {
            await syncStudentAttendancePct(st.studentId, st.roll);
        }

        res.status(200).json({
            message: `Batch attendance successfully saved and published for ${saved.length} students.`,
            saved,
            updated: saved,
            errors
        });
    } catch (err) {
        console.error('Error in storeBatch:', err);
        res.status(500).json({ error: 'Failed to save batch attendance', details: err.message });
    }
};

// GET /attendance/student/:id — get all published records for a specific student
// :id can be MongoDB _id or roll number
export const getByStudent = async (req, res) => {
    try {
        const target = String(req.params.id);
        const orConditions = [{ studentId: target }, { roll: target }];

        if (mongoose.Types.ObjectId.isValid(target)) {
            const st = await student.findById(target);
            if (st && st.roll) {
                orConditions.push({ roll: String(st.roll) });
                orConditions.push({ studentId: String(st._id) });
            }
        } else {
            const st = await student.findOne({ roll: target });
            if (st) {
                orConditions.push({ studentId: String(st._id) });
                orConditions.push({ roll: String(st.roll) });
            }
        }

        const records = await attendance.find({ $or: orConditions }).sort({ date: -1, createdAt: -1 });

        const total = records.length;
        const presentOrLate = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const percentage = total > 0 ? Math.round((presentOrLate / total) * 100) : 0;

        res.json({ percentage, total, logs: records });
    } catch (err) {
        console.error('Error in getByStudent:', err);
        res.status(500).json({ error: 'Failed to fetch student attendance', details: err.message });
    }
};

// GET /attendance/deletedata/:id — delete a single attendance record
export const deletedata = async (req, res) => {
    try {
        const deleted = await attendance.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        // Re-sync the student's attendance percentage after deletion
        await syncStudentAttendancePct(deleted.studentId, deleted.roll);
        res.json({ message: 'Attendance record deleted successfully', deleted });
    } catch (err) {
        console.error('Error in deletedata:', err);
        res.status(500).json({ error: 'Failed to delete attendance record', details: err.message });
    }
};
