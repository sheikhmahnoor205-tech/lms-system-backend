import mongoose from "mongoose"
import department from "../models/department.js"

export let list = async (req, res) => {
    try {
        let data = await department.find();
        res.send(data);
    } catch (err) {
        console.error('Error fetching departments:', err);
        res.status(500).send('Error fetching departments');
    }
}

export let store = async (req, res) => {
    try {
        const { _id, id, ...deptData } = req.body;
        let storedata = await department.findOneAndUpdate(
            { code: deptData.code },
            deptData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).send({ message: 'Data Saved Successfully', data: storedata });
    } catch (err) {
        console.error('Error storing department:', err);
        res.status(500).send('Error storing department: ' + err.message);
    }
}

export let update = async (req, res) => {
    try {
        const { _id, id, ...updateFields } = req.body;
        const target = req.params.id;

        let updatedata;
        if (mongoose.Types.ObjectId.isValid(target)) {
            updatedata = await department.findByIdAndUpdate(target, updateFields, { new: true });
        } else {
            updatedata = await department.findOneAndUpdate(
                { $or: [{ code: target }, { code: req.body.code }] },
                updateFields,
                { new: true, upsert: true }
            );
        }

        if (updatedata) {
            res.status(200).send({ message: 'Data updated Successfully', data: updatedata });
        } else {
            res.status(404).send('Data not updated successfully');
        }
    } catch (err) {
        console.error('Error updating department in controller:', err);
        res.status(500).send('Error updating department: ' + err.message);
    }
}

export let edit = async (req, res) => {
    try {
        const target = req.params.id;
        let data;
        if (mongoose.Types.ObjectId.isValid(target)) {
            data = await department.findById(target);
        } else {
            data = await department.findOne({ code: target });
        }
        res.send(data);
    } catch (err) {
        res.status(500).send('Error finding department');
    }
}

export let deletedata = async (req, res) => {
    try {
        const target = req.params.id;
        let data;
        if (mongoose.Types.ObjectId.isValid(target)) {
            data = await department.findByIdAndDelete(target);
        } else {
            data = await department.findOneAndDelete({ code: target });
        }
        if (data) {
            res.status(200).send('Data deleted Successfully');
        } else {
            res.status(404).send('Data not delete successfully');
        }
    } catch (err) {
        res.status(500).send('Error deleting department');
    }
}

// Add courses to an existing department without wiping the existing ones
export let addCourses = async (req, res) => {
    try {
        const target = req.params.id;
        const newCourses = Array.isArray(req.body.courses) ? req.body.courses : [req.body];

        let query = mongoose.Types.ObjectId.isValid(target) ? { _id: target } : { code: target };

        let updatedata = await department.findOneAndUpdate(
            query,
            { $push: { courses: { $each: newCourses } } },
            { new: true }
        );

        if (updatedata) {
            res.status(200).send({ message: 'Courses added Successfully', data: updatedata });
        } else {
            res.status(404).send('Department not found');
        }
    } catch (err) {
        console.error('Error adding courses:', err);
        res.status(500).send('Error adding courses: ' + err.message);
    }
}