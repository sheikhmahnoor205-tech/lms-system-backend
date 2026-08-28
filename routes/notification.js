import express from 'express';
import { list, store, markAllRead } from '../controllers/notificationcontroller.js';

const router = express.Router();

router.get('/', list);
router.post('/store', store);
router.post('/mark-all-read', markAllRead);

export default router;
