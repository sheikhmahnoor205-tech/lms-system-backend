import express from 'express';
import { list, store, storeBatch, getByStudent, deletedata } from '../controllers/attendancecontroller.js';

const router = express.Router();

router.get('/', list);                          // GET  /attendance?studentId=&roll=&date=&dept=
router.post('/store', store);                   // POST /attendance/store
router.post('/batch', storeBatch);              // POST /attendance/batch
router.get('/student/:id', getByStudent);       // GET  /attendance/student/:id (MongoDB _id or roll)
router.get('/deletedata/:id', deletedata);      // GET  /attendance/deletedata/:id

export default router;
