import express from 'express'
import { list, assign, remove } from '../controllers/assigncoursecontroller.js'
const assigncourse = express.Router()

assigncourse.get('/', list);
assigncourse.post('/assign/:id', assign);
assigncourse.post('/remove/:id', remove);

export default assigncourse;