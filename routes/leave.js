import express from 'express';
import { list, store, updateStatus, deletedata } from '../controllers/leavecontroller.js';

const router = express.Router();

router.get('/', list);
router.post('/store', store);
router.post('/update-status/:id', updateStatus);
router.get('/deletedata/:id', deletedata);
router.post('/deletedata/:id', deletedata);

export default router;
