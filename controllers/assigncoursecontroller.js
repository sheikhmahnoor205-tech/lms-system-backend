import mongoose from "mongoose"
import teacher from "../models/teacher.js"
import department from "../models/department.js"

export let list = async (req, res) => {
    try {
        let data = await teacher.find({ assignedCourses: { $exists: true, $ne: [] } });
        res.send(data);
    } catch (err) {
        console.error('Error fetching assignments:', err);
        res.status(500).send('Error fetching assignments');
    }
}

export let assign = async (req, res) => {
    try {
        const teacherId = req.params.id;
        const { deptId, courseCodes } = req.body;

        if (!teacherId || !deptId || !Array.isArray(courseCodes) || courseCodes.length === 0) {
            return res.status(400).send('teacherId, deptId and courseCodes are required');
        }

        const teacherDoc = await teacher.findById(teacherId);
        if (!teacherDoc) {
            return res.status(404).send('Teacher not found');
        }

        const deptDoc = await department.findById(deptId);
        if (!deptDoc) {
            return res.status(404).send('Department not found');
        }

        const coursesToAssign = deptDoc.courses
            .filter(c => courseCodes.includes(c.code))
            .map(c => ({
                code: c.code,
                name: c.name,
                semester: c.semester,
                deptCode: deptDoc.code,
                deptName: deptDoc.name
            }));

        const existing = teacherDoc.assignedCourses || [];
        const existingCodes = new Set(existing.map(c => c.code));
        const newAdditions = coursesToAssign.filter(c => !existingCodes.has(c.code));

        teacherDoc.assignedCourses = [...existing, ...newAdditions];
        await teacherDoc.save();

        res.status(200).send({ message: 'Courses assigned Successfully', data: teacherDoc, added: newAdditions.length });
    } catch (err) {
        console.error('Error assigning courses:', err);
        res.status(500).send('Error assigning courses: ' + err.message);
    }
}

export let remove = async (req, res) => {
    try {
        const teacherId = req.params.id;
        const { code } = req.body;

        if (!code) {
            return res.status(400).send('course code is required');
        }

        const teacherDoc = await teacher.findById(teacherId);
        if (!teacherDoc) {
            return res.status(404).send('Teacher not found');
        }

        teacherDoc.assignedCourses = (teacherDoc.assignedCourses || []).filter(c => c.code !== code);
        await teacherDoc.save();

        res.status(200).send({ message: 'Course removed Successfully', data: teacherDoc });
    } catch (err) {
        console.error('Error removing course:', err);
        res.status(500).send('Error removing course: ' + err.message);
    }
}