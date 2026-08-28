import express from 'express';
import { list, store, deletedata } from '../controllers/schedulecontroller.js';

const router = express.Router();

router.get('/', list);
router.post('/store', store);
router.get('/deletedata/:id', deletedata);

export default router;
