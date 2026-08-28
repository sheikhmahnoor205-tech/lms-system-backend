import schedule from '../models/schedule.js';

// GET /schedule — list all schedule slots
export const list = async (req, res) => {
    try {
        const slots = await schedule.find().sort({ day: 1, time: 1 });
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch schedule', details: err.message });
    }
};

// POST /schedule/store — create a new schedule slot
export const store = async (req, res) => {
    try {
        const { day, time, subject, code, room, instructor, dept } = req.body;

        if (!day || !time || !subject) {
            return res.status(400).json({ error: 'day, time, and subject are required' });
        }

        const newSlot = new schedule({ day, time, subject, code, room, instructor, dept });
        const saved = await newSlot.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create schedule slot', details: err.message });
    }
};

// GET /schedule/deletedata/:id — delete a schedule slot by MongoDB _id
export const deletedata = async (req, res) => {
    try {
        const deleted = await schedule.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Schedule slot not found' });
        }
        res.json({ message: 'Schedule slot deleted successfully', deleted });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete schedule slot', details: err.message });
    }
};
