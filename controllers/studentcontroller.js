import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import student from "../models/student.js"
import { sendPasswordResetEmail } from "../utils/mailer.js"


// Calculate metrics for an individual subject
export const computeSubjectScore = (midterm = 0, final = 0, sectional = 0, creditHours = 3) => {
  const m = Math.max(0, Math.min(25, Number(midterm) || 0));
  const f = Math.max(0, Math.min(50, Number(final) || 0));
  const sec = Math.max(0, Math.min(25, Number(sectional) || 0));
  const ch = Math.max(1, Math.min(6, Number(creditHours) || 3));
  const total = m + f + sec;

  let letterGrade = 'N/A';
  let gpa = 0.00;
  let performanceStatus = 'Not Evaluated';

  if (total > 0 || (midterm !== undefined && final !== undefined && sectional !== undefined)) {
    if (total >= 90) { letterGrade = 'A+'; gpa = 4.00; performanceStatus = 'Outstanding'; }
    else if (total >= 85) { letterGrade = 'A'; gpa = 4.00; performanceStatus = 'Excellent'; }
    else if (total >= 80) { letterGrade = 'A-'; gpa = 3.70; performanceStatus = 'Very Good'; }
    else if (total >= 75) { letterGrade = 'B+'; gpa = 3.30; performanceStatus = 'Good'; }
    else if (total >= 70) { letterGrade = 'B'; gpa = 3.00; performanceStatus = 'Above Average'; }
    else if (total >= 65) { letterGrade = 'B-'; gpa = 2.70; performanceStatus = 'Satisfactory'; }
    else if (total >= 60) { letterGrade = 'C+'; gpa = 2.30; performanceStatus = 'Average'; }
    else if (total >= 55) { letterGrade = 'C'; gpa = 2.00; performanceStatus = 'Pass'; }
    else if (total >= 50) { letterGrade = 'D'; gpa = 1.70; performanceStatus = 'Marginal Pass'; }
    else if (total > 0) { letterGrade = 'F'; gpa = 0.00; performanceStatus = 'Needs Focus'; }
  }

  return {
    midterm: m,
    final: f,
    sectional: sec,
    creditHours: ch,
    totalMarks: total,
    percentage: total,
    letterGrade,
    gpa,
    performanceStatus
  };
};

// Compute student aggregate metrics across all enrolled subjects
export const calculateAggregatePerformance = (subjects = []) => {
  if (!subjects || subjects.length === 0) {
    return {
      subjects: [],
      totalMarks: 0,
      percentage: 0,
      creditHours: 0,
      gpa: 0,
      sgpa: 0,
      cgpa: 0,
      letterGrade: 'N/A',
      performanceStatus: 'Not Evaluated',
      academicStanding: 'Not Evaluated'
    };
  }

  let totalCreditHours = 0;
  let totalWeightedGPA = 0;
  let totalMarksSum = 0;
  let evaluatedSubjectsCount = 0;

  const computedSubjects = subjects.map(sub => {
    const metrics = computeSubjectScore(sub.midterm, sub.final, sub.sectional, sub.creditHours);
    totalCreditHours += metrics.creditHours;
    totalWeightedGPA += (metrics.gpa * metrics.creditHours);
    totalMarksSum += metrics.totalMarks;
    if (metrics.totalMarks > 0) evaluatedSubjectsCount++;

    return {
      code: sub.code || 'SUB-01',
      name: sub.name || 'Subject',
      ...metrics
    };
  });

  const overallSGPA = totalCreditHours > 0 ? Number((totalWeightedGPA / totalCreditHours).toFixed(2)) : 0.00;
  const maxPossibleMarks = computedSubjects.length * 100;
  const overallPercentage = maxPossibleMarks > 0 ? Number(((totalMarksSum / maxPossibleMarks) * 100).toFixed(1)) : 0;

  let overallGrade = 'N/A';
  let academicStanding = 'Not Evaluated';
  let performanceStatus = 'Not Evaluated';

  if (evaluatedSubjectsCount > 0 || totalMarksSum > 0) {
    if (overallSGPA >= 3.85 || overallPercentage >= 90) {
      overallGrade = 'A+';
      performanceStatus = 'Outstanding';
      academicStanding = "Dean's Honor Roll";
    } else if (overallSGPA >= 3.70 || overallPercentage >= 85) {
      overallGrade = 'A';
      performanceStatus = 'Excellent';
      academicStanding = "Dean's Honor Roll";
    } else if (overallSGPA >= 3.50 || overallPercentage >= 80) {
      overallGrade = 'A-';
      performanceStatus = 'Very Good';
      academicStanding = "Dean's Honor Roll";
    } else if (overallSGPA >= 3.00 || overallPercentage >= 70) {
      overallGrade = 'B';
      performanceStatus = 'Good';
      academicStanding = 'Good Standing';
    } else if (overallSGPA >= 2.50 || overallPercentage >= 60) {
      overallGrade = 'C+';
      performanceStatus = 'Satisfactory';
      academicStanding = 'Good Standing';
    } else if (overallSGPA >= 2.00 || overallPercentage >= 50) {
      overallGrade = 'C';
      performanceStatus = 'Pass';
      academicStanding = 'Good Standing';
    } else {
      overallGrade = 'F';
      performanceStatus = 'Needs Focus';
      academicStanding = 'Academic Warning';
    }
  }

  return {
    subjects: computedSubjects,
    totalMarks: totalMarksSum,
    percentage: overallPercentage,
    creditHours: totalCreditHours,
    gpa: overallSGPA,
    sgpa: overallSGPA,
    cgpa: overallSGPA,
    letterGrade: overallGrade,
    performanceStatus,
    academicStanding
  };
};

// Calculate comprehensive dynamic performance metrics from single/legacy marks (4.0 GPA scale)
export const calculatePerformance = (midterm = 0, final = 0, sectional = 0, creditHours = 3) => {
    return computeSubjectScore(midterm, final, sectional, creditHours);
};

import department from "../models/department.js";

export let list = async (req, res) => {
    try {
        let [studentsList, deptsList] = await Promise.all([
            student.find().select('-password'),
            department.find()
        ]);

        const deptsMap = {};
        deptsList.forEach(d => {
            if (d.name) deptsMap[d.name.toLowerCase()] = d;
            if (d.code) deptsMap[d.code.toLowerCase()] = d;
        });

        const enriched = await Promise.all(studentsList.map(async (doc) => {
            const s = doc.toObject();
            let subjects = s.subjects;
            let needsDbSave = false;

            if (!subjects || subjects.length === 0) {
                needsDbSave = true;
                const deptKey = s.dept || 'Computer Science';
                const matchedDept = deptsMap[deptKey.toLowerCase()];

                if (matchedDept && matchedDept.courses && matchedDept.courses.length > 0) {
                    subjects = matchedDept.courses.map((c) => ({
                        code: c.code,
                        name: c.name,
                        creditHours: 3,
                        midterm: 0,
                        final: 0,
                        sectional: 0
                    }));
                } else {
                    subjects = [];
                }
            }

            const performance = calculateAggregatePerformance(subjects);

            // Persist subjects and computed marks to MongoDB if not previously saved
            if (needsDbSave) {
                await student.findByIdAndUpdate(s._id, {
                    $set: {
                        subjects: performance.subjects,
                        totalMarks: performance.totalMarks,
                        percentage: performance.percentage,
                        creditHours: performance.creditHours,
                        gpa: performance.gpa,
                        sgpa: performance.sgpa,
                        cgpa: performance.cgpa,
                        letterGrade: performance.letterGrade,
                        performanceStatus: performance.performanceStatus,
                        academicStanding: performance.academicStanding
                    }
                });
            }

            return {
                ...s,
                ...performance
            };
        }));

        res.send(enriched);
    } catch (err) {
        console.error('Error fetching students:', err);
        res.status(500).send('Error fetching students');
    }
}

export let store = async (req, res) => {
    try {
        const { _id, id, password, subjects, ...studentData } = req.body;
        
        // Only hash password if explicitly provided by user; DO NOT set a default password
        let hashedPassword;
        if (password && password.trim()) {
            hashedPassword = await bcrypt.hash(password.trim(), 10);
        }

        const deptKey = studentData.dept || 'Computer Science';
        let activeSubjects = [];
        if (Array.isArray(subjects) && subjects.length > 0) {
            activeSubjects = subjects;
        } else {
            const matchedDept = await department.findOne({
                $or: [
                    { name: new RegExp('^' + deptKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
                    { code: new RegExp('^' + deptKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
                ]
            });
            if (matchedDept && matchedDept.courses && matchedDept.courses.length > 0) {
                activeSubjects = matchedDept.courses.map((c) => ({
                    code: c.code,
                    name: c.name,
                    creditHours: 3,
                    midterm: 0,
                    final: 0,
                    sectional: 0
                }));
            }
        }

        const performance = calculateAggregatePerformance(activeSubjects);

        const mergedData = {
            ...studentData,
            ...(hashedPassword ? { password: hashedPassword } : {}),
            ...performance
        };

        // Upsert by roll if student already exists, or create new record
        let storedata = await student.findOneAndUpdate(
            { roll: mergedData.roll },
            mergedData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const safeData = storedata.toObject();
        delete safeData.password;

        res.status(200).send({ message: 'Data Saved Successfully', data: safeData });
    } catch (err) {
        console.error('Error storing student:', err);
        res.status(500).send('Error storing student: ' + err.message);
    }
}

export let login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send({ message: 'Email or Roll number and password are required' });
        }

        const queryStr = String(email).trim();
        const studentDoc = await student.findOne({
            $or: [
                { email: queryStr.toLowerCase() },
                { roll: queryStr }
            ]
        });

        if (!studentDoc) {
            return res.status(404).send({ message: 'Student credentials not found in database' });
        }

        if (!studentDoc.password) {
            return res.status(400).send({
                message: 'No password is set for this student account. Please click "Forgot Password?" to receive reset instructions and set your password manually.'
            });
        }

        let isMatch = false;
        if (studentDoc.password.startsWith('$2a$') || studentDoc.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, studentDoc.password);
        } else {
            isMatch = (password === studentDoc.password);
        }

        if (!isMatch) {
            return res.status(401).send({ message: 'Incorrect password. Access denied.' });
        }

        const safeData = studentDoc.toObject();
        delete safeData.password;

        res.status(200).send(safeData);
    } catch (err) {
        console.error('Error logging in student:', err);
        res.status(500).send({ message: 'Error logging in student: ' + err.message });
    }
}

export let forgotPassword = async (req, res) => {
    try {
        const { email, roll } = req.body;
        if (!email && !roll) {
            return res.status(400).send({ message: 'Email address or Roll number is required' });
        }

        const query = [];
        if (email && email.trim()) {
            query.push({ email: email.trim().toLowerCase() });
        }
        if (roll && String(roll).trim()) {
            query.push({ roll: String(roll).trim() });
        }

        const studentDoc = await student.findOne({ $or: query });
        if (!studentDoc) {
            return res.status(404).send({ message: 'No student account found with the provided details' });
        }

        if (!studentDoc.email) {
            return res.status(400).send({ message: 'This student has no email address configured to receive recovery emails.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        studentDoc.resetPasswordToken = resetToken;
        studentDoc.resetPasswordOtp = otp;
        studentDoc.resetPasswordExpires = expires;
        await studentDoc.save();

        const emailResult = await sendPasswordResetEmail({
            to: studentDoc.email,
            name: studentDoc.name || 'Student',
            resetToken,
            otp,
            role: 'student'
        });

        res.status(200).send({
            message: 'Password reset instructions and verification code have been dispatched to your email.',
            email: studentDoc.email,
            previewUrl: emailResult.previewUrl,
            otp: emailResult.otp,
            token: resetToken
        });
    } catch (err) {
        console.error('Error in forgotPassword:', err);
        res.status(500).send({ message: 'Failed to process password reset request: ' + err.message });
    }
}

export let resetPassword = async (req, res) => {
    try {
        const { email, roll, token, otp, newPassword } = req.body;

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).send({ message: 'New password must be at least 6 characters long' });
        }

        if (!token && !otp) {
            return res.status(400).send({ message: 'Reset token or verification OTP code is required' });
        }

        const query = [];
        if (email && email.trim()) {
            query.push({ email: email.trim().toLowerCase() });
        }
        if (roll && String(roll).trim()) {
            query.push({ roll: String(roll).trim() });
        }

        let studentDoc = null;
        if (query.length > 0) {
            studentDoc = await student.findOne({
                $or: query,
                resetPasswordExpires: { $gt: new Date() }
            });
        }

        // Verify token/OTP match
        let isValid = false;
        if (studentDoc) {
            if (token && studentDoc.resetPasswordToken === token) {
                isValid = true;
            } else if (otp && studentDoc.resetPasswordOtp === String(otp).trim()) {
                isValid = true;
            }
        }

        if (!isValid) {
            // Direct search by token/OTP across unexpired records
            const directMatch = await student.findOne({
                $or: [
                    ...(token ? [{ resetPasswordToken: token }] : []),
                    ...(otp ? [{ resetPasswordOtp: String(otp).trim() }] : [])
                ],
                resetPasswordExpires: { $gt: new Date() }
            });

            if (directMatch) {
                studentDoc = directMatch;
                isValid = true;
            }
        }

        if (!isValid || !studentDoc) {
            return res.status(400).send({ message: 'Invalid or expired password reset link / OTP verification code' });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
        studentDoc.password = hashedPassword;
        studentDoc.resetPasswordToken = undefined;
        studentDoc.resetPasswordOtp = undefined;
        studentDoc.resetPasswordExpires = undefined;
        await studentDoc.save();

        res.status(200).send({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
    } catch (err) {
        console.error('Error in resetPassword:', err);
        res.status(500).send({ message: 'Failed to reset password: ' + err.message });
    }
}

export let update = async (req, res) => {
    try {
        const { _id, id, password, ...updateFields } = req.body;
        const target = req.params.id;

        if (password && password.trim()) {
            updateFields.password = await bcrypt.hash(password.trim(), 10);
        }

        // If marks or credit hours are present, dynamically compute performance
        if (
            updateFields.midterm !== undefined ||
            updateFields.final !== undefined ||
            updateFields.sectional !== undefined ||
            updateFields.creditHours !== undefined
        ) {
            const performance = calculatePerformance(
                updateFields.midterm,
                updateFields.final,
                updateFields.sectional,
                updateFields.creditHours
            );
            Object.assign(updateFields, performance);
        }

        let updatedata;
        if (mongoose.Types.ObjectId.isValid(target)) {
            updatedata = await student.findByIdAndUpdate(target, updateFields, { new: true });
        } else {
            updatedata = await student.findOneAndUpdate(
                { $or: [{ roll: target }, { roll: req.body.roll }] },
                updateFields,
                { new: true, upsert: true }
            );
        }

        if (updatedata) {
            const safeData = updatedata.toObject();
            delete safeData.password;
            res.status(200).send({ message: 'Data updated Successfully', data: safeData });
        } else {
            res.status(404).send('Data not updated successfully');
        }
    } catch (err) {
        console.error('Error updating student in controller:', err);
        res.status(500).send('Error updating student: ' + err.message);
    }
}

export let updateMarks = async (req, res) => {
    try {
        const target = req.params.id;
        const { code, subjectCode, midterm, final, sectional, creditHours, subjects } = req.body;

        let studentDoc;
        if (mongoose.Types.ObjectId.isValid(target)) {
            studentDoc = await student.findById(target);
        } else {
            studentDoc = await student.findOne({ roll: target });
        }

        if (!studentDoc) {
            return res.status(404).send({ message: 'Student record not found to update marks' });
        }

        let currentSubjects = [];
        if (studentDoc.subjects && studentDoc.subjects.length > 0) {
            currentSubjects = studentDoc.subjects.map(sub => sub.toObject ? sub.toObject() : sub);
        } else {
            const deptKey = studentDoc.dept || 'Computer Science';
            const matchedDept = await department.findOne({
                $or: [
                    { name: new RegExp('^' + deptKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
                    { code: new RegExp('^' + deptKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
                ]
            });
            if (matchedDept && matchedDept.courses && matchedDept.courses.length > 0) {
                currentSubjects = matchedDept.courses.map((c) => ({
                    code: c.code,
                    name: c.name,
                    creditHours: 3,
                    midterm: 0,
                    final: 0,
                    sectional: 0
                }));
            }
        }

        if (Array.isArray(subjects) && subjects.length > 0) {
            currentSubjects = subjects;
        } else if (code || subjectCode) {
            const targetCode = code || subjectCode;
            let found = false;
            currentSubjects = currentSubjects.map(sub => {
                if (sub.code === targetCode) {
                    found = true;
                    return {
                        ...sub,
                        midterm: midterm !== undefined ? Number(midterm) : sub.midterm,
                        final: final !== undefined ? Number(final) : sub.final,
                        sectional: sectional !== undefined ? Number(sectional) : sub.sectional,
                        creditHours: creditHours !== undefined ? Number(creditHours) : sub.creditHours
                    };
                }
                return sub;
            });
            if (!found) {
                currentSubjects.push({
                    code: targetCode,
                    name: req.body.name || req.body.subjectName || targetCode,
                    creditHours: Number(creditHours) || 3,
                    midterm: Number(midterm) || 0,
                    final: Number(final) || 0,
                    sectional: Number(sectional) || 0
                });
            }
        } else if (midterm !== undefined || final !== undefined || sectional !== undefined) {
            // Update the first subject or baseline
            if (currentSubjects.length > 0) {
                currentSubjects[0] = {
                    ...currentSubjects[0],
                    midterm: midterm !== undefined ? Number(midterm) : currentSubjects[0].midterm,
                    final: final !== undefined ? Number(final) : currentSubjects[0].final,
                    sectional: sectional !== undefined ? Number(sectional) : currentSubjects[0].sectional,
                    creditHours: creditHours !== undefined ? Number(creditHours) : currentSubjects[0].creditHours
                };
            }
        }

        const performance = calculateAggregatePerformance(currentSubjects);

        studentDoc.subjects = performance.subjects;
        studentDoc.totalMarks = performance.totalMarks;
        studentDoc.percentage = performance.percentage;
        studentDoc.creditHours = performance.creditHours;
        studentDoc.gpa = performance.gpa;
        studentDoc.sgpa = performance.sgpa;
        studentDoc.cgpa = performance.cgpa;
        studentDoc.letterGrade = performance.letterGrade;
        studentDoc.performanceStatus = performance.performanceStatus;
        studentDoc.academicStanding = performance.academicStanding;

        if (performance.subjects.length > 0) {
            studentDoc.midterm = performance.subjects[0].midterm;
            studentDoc.final = performance.subjects[0].final;
            studentDoc.sectional = performance.subjects[0].sectional;
        }

        await studentDoc.save();

        const safeData = studentDoc.toObject();
        delete safeData.password;

        res.status(200).send({ message: 'Marks and subject performance updated successfully', data: safeData });
    } catch (err) {
        console.error('Error updating marks in controller:', err);
        res.status(500).send('Error updating marks: ' + err.message);
    }
}

export let edit = async (req, res) => {
    try {
        const target = req.params.id;
        let data;
        if (mongoose.Types.ObjectId.isValid(target)) {
            data = await student.findById(target).select('-password');
        } else {
            data = await student.findOne({ roll: target }).select('-password');
        }
        res.send(data);
    } catch (err) {
        res.status(500).send('Error finding student');
    }
}

export let deletedata = async (req, res) => {
    try {
        const target = req.params.id;
        let data;
        if (mongoose.Types.ObjectId.isValid(target)) {
            data = await student.findByIdAndDelete(target);
        } else {
            data = await student.findOneAndDelete({ roll: target });
        }
        if (data) {
            res.status(200).send('Data deleted Successfully');
        } else {
            res.status(404).send('Data not delete successfully');
        }
    } catch (err) {
        res.status(500).send('Error deleting student');
    }
}

// Migration endpoint: reset all students' subjects marks to 0
// Run once after deploying to clear any dummy data seeded by previous code
export let resetAllMarks = async (req, res) => {
    try {
        const [allStudents, deptsList] = await Promise.all([
            student.find(),
            department.find()
        ]);
        let updatedCount = 0;

        for (const doc of allStudents) {
            // Try to get subjects from existing doc; reset marks to 0 on each
            let subjects = [];
            if (doc.subjects && doc.subjects.length > 0) {
                subjects = doc.subjects.map(sub => ({
                    code: sub.code,
                    name: sub.name,
                    creditHours: sub.creditHours || 3,
                    midterm: 0,
                    final: 0,
                    sectional: 0,
                    totalMarks: 0,
                    percentage: 0,
                    letterGrade: 'N/A',
                    gpa: 0,
                    performanceStatus: 'Not Evaluated'
                }));
            } else {
                const deptKey = doc.dept || 'Computer Science';
                const matchedDept = deptsList.find(d => 
                    (d.name && d.name.toLowerCase() === deptKey.toLowerCase()) ||
                    (d.code && d.code.toLowerCase() === deptKey.toLowerCase())
                );
                if (matchedDept && matchedDept.courses && matchedDept.courses.length > 0) {
                    subjects = matchedDept.courses.map(c => ({
                        code: c.code,
                        name: c.name,
                        creditHours: 3,
                        midterm: 0,
                        final: 0,
                        sectional: 0,
                        totalMarks: 0,
                        percentage: 0,
                        letterGrade: 'N/A',
                        gpa: 0,
                        performanceStatus: 'Not Evaluated'
                    }));
                }
            }

            await student.findByIdAndUpdate(doc._id, {
                $set: {
                    subjects,
                    midterm: 0,
                    final: 0,
                    sectional: 0,
                    totalMarks: 0,
                    percentage: 0,
                    gpa: 0,
                    sgpa: 0,
                    cgpa: 0,
                    letterGrade: 'N/A',
                    performanceStatus: 'Not Evaluated',
                    academicStanding: 'Not Evaluated'
                }
            });
            updatedCount++;
        }

        res.status(200).send({ message: `Successfully reset marks for ${updatedCount} students.`, count: updatedCount });
    } catch (err) {
        console.error('Error resetting all marks:', err);
        res.status(500).send({ message: 'Error resetting marks: ' + err.message });
    }
}
