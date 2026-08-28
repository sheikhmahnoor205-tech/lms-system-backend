import express from 'express'
import { list, store, update, edit, deletedata } from '../controllers/departmentcontroller.js'
const department = express.Router()

department.get('/', list);
department.post('/store', store);
department.post('/update/:id', update);
department.get('/edit/:id', edit);
department.get('/deletedata/:id', deletedata);

export default department;