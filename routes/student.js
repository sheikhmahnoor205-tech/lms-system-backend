import express from 'express'
import { list, store, login, update, updateMarks, edit, deletedata, forgotPassword, resetPassword, resetAllMarks } from '../controllers/studentcontroller.js'
const student = express.Router()

student.get('/', list);
student.post('/store', store);
student.post('/login', login);
student.post('/forgot-password', forgotPassword);
student.post('/reset-password', resetPassword);
student.post('/update/:id', update);
student.post('/update-marks/:id', updateMarks);
student.post('/marks/:id', updateMarks);
student.get('/edit/:id', edit);
student.post('/deletedata/:id', deletedata);
student.get('/deletedata/:id', deletedata);
student.post('/reset-all-marks', resetAllMarks);

export default student;
