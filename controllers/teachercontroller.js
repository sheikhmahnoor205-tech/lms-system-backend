import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import teacher from "../models/teacher.js"
import { sendPasswordResetEmail } from "../utils/mailer.js"

export let list = async (req, res) => {
    try {
        let data = await teacher.find().select('-password');
        res.send(data);
    } catch (err) {
        console.error('Error fetching teachers:', err);
        res.status(500).send('Error fetching teachers');
    }
}

export let store = async (req, res) => {
    try {
        const { _id, id, password, ...teacherData } = req.body;

        const rawPassword = password && password.trim() ? password : 'password123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        let storedata = await teacher.findOneAndUpdate(
            { email: teacherData.email },
            { ...teacherData, password: hashedPassword },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const safeData = storedata.toObject();
        delete safeData.password;

        res.status(200).send({ message: 'Data Saved Successfully', data: safeData });
    } catch (err) {
        console.error('Error storing teacher:', err);
        res.status(500).send('Error storing teacher: ' + err.message);
    }
}

export let login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send({ message: 'Email and password are required' });
        }

        const teacherDoc = await teacher.findOne({ email: email.toLowerCase() });
        if (!teacherDoc) {
            return res.status(404).send({ message: 'Teacher email not registered in database' });
        }

        const isMatch = await bcrypt.compare(password, teacherDoc.password);
        if (!isMatch) {
            return res.status(401).send({ message: 'Incorrect password' });
        }

        const safeData = teacherDoc.toObject();
        delete safeData.password;

        res.status(200).send(safeData);
    } catch (err) {
        console.error('Error logging in teacher:', err);
        res.status(500).send({ message: 'Error logging in: ' + err.message });
    }
}

export let update = async (req, res) => {
    try {
        const { _id, id, password, ...updateFields } = req.body;
        const target = req.params.id;

        if (password) {
            updateFields.password = await bcrypt.hash(password, 10);
        }

        let updatedata;
        if (mongoose.Types.ObjectId.isValid(target)) {
            updatedata = await teacher.findByIdAndUpdate(target, updateFields, { new: true });
        } else {
            updatedata = await teacher.findOneAndUpdate(
                { $or: [{ email: target }, { email: req.body.email }] },
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
        console.error('Error updating teacher in controller:', err);
        res.status(500).send('Error updating teacher: ' + err.message);
    }
}

export let edit = async (req, res) => {
    try {
        const target = req.params.id;
        let data;
        if (mongoose.Types.ObjectId.isValid(target)) {
            data = await teacher.findById(target).select('-password');
        } else {
            data = await teacher.findOne({ email: target }).select('-password');
        }
        res.send(data);
    } catch (err) {
        res.status(500).send('Error finding teacher');
    }
}

export let deletedata = async (req, res) => {
    try {
        const target = req.params.id;
        let data;
        if (mongoose.Types.ObjectId.isValid(target)) {
            data = await teacher.findByIdAndDelete(target);
        } else {
            data = await teacher.findOneAndDelete({ email: target });
        }
        if (data) {
            res.status(200).send('Data deleted Successfully');
        } else {
            res.status(404).send('Data not delete successfully');
        }
    } catch (err) {
        res.status(500).send('Error deleting teacher');
    }
}

export let forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).send({ message: 'Email address is required' });
        }

        const teacherDoc = await teacher.findOne({ email: email.trim().toLowerCase() });
        if (!teacherDoc) {
            return res.status(404).send({ message: 'Teacher email not registered in database' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        teacherDoc.resetPasswordToken = resetToken;
        teacherDoc.resetPasswordOtp = otp;
        teacherDoc.resetPasswordExpires = expires;
        await teacherDoc.save();

        const emailResult = await sendPasswordResetEmail({
            to: teacherDoc.email,
            name: teacherDoc.name || 'Professor',
            resetToken,
            otp,
            role: 'teacher'
        });

        res.status(200).send({
            message: 'Password reset instructions dispatched to your teacher email.',
            email: teacherDoc.email,
            previewUrl: emailResult.previewUrl,
            otp: emailResult.otp,
            token: resetToken
        });
    } catch (err) {
        console.error('Error in teacher forgotPassword:', err);
        res.status(500).send({ message: 'Failed to send reset email: ' + err.message });
    }
}

export let resetPassword = async (req, res) => {
    try {
        const { email, token, otp, newPassword } = req.body;

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).send({ message: 'New password must be at least 6 characters long' });
        }

        let teacherDoc = null;
        if (email && email.trim()) {
            teacherDoc = await teacher.findOne({
                email: email.trim().toLowerCase(),
                resetPasswordExpires: { $gt: new Date() }
            });
        }

        let isValid = false;
        if (teacherDoc) {
            if (token && teacherDoc.resetPasswordToken === token) {
                isValid = true;
            } else if (otp && teacherDoc.resetPasswordOtp === String(otp).trim()) {
                isValid = true;
            }
        }

        if (!isValid) {
            const directMatch = await teacher.findOne({
                $or: [
                    ...(token ? [{ resetPasswordToken: token }] : []),
                    ...(otp ? [{ resetPasswordOtp: String(otp).trim() }] : [])
                ],
                resetPasswordExpires: { $gt: new Date() }
            });

            if (directMatch) {
                teacherDoc = directMatch;
                isValid = true;
            }
        }

        if (!isValid || !teacherDoc) {
            return res.status(400).send({ message: 'Invalid or expired password reset link / code' });
        }

        const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
        teacherDoc.password = hashedPassword;
        teacherDoc.resetPasswordToken = undefined;
        teacherDoc.resetPasswordOtp = undefined;
        teacherDoc.resetPasswordExpires = undefined;
        await teacherDoc.save();

        res.status(200).send({ message: 'Teacher password has been reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Error in teacher resetPassword:', err);
        res.status(500).send({ message: 'Failed to reset teacher password: ' + err.message });
    }
}