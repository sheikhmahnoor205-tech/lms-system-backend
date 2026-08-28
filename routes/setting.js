import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingcontroller.js';

const router = express.Router();

router.get('/', getSettings);
router.post('/update', updateSettings);

export default router;
