import express from 'express'
import { list, store, update, edit, deletedata, login, forgotPassword, resetPassword } from '../controllers/teachercontroller.js'
const teacher = express.Router()

teacher.get('/', list);
teacher.post('/store', store);
teacher.post('/login', login);
teacher.post('/forgot-password', forgotPassword);
teacher.post('/reset-password', resetPassword);
teacher.post('/update/:id', update);
teacher.get('/edit/:id', edit);
teacher.post('/deletedata/:id', deletedata);
teacher.get('/deletedata/:id', deletedata);

export default teacher;