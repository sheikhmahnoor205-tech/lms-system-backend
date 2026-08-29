import express from 'express'
import cors from 'cors'
import student from './routes/student.js'
import department from './routes/department.js'
import mongoose from 'mongoose'
import teacher from './routes/teacher.js'
import assigncourse from './routes/assigncourse.js'
import scheduleRoute from './routes/schedule.js'
import attendanceRoute from './routes/attendance.js'
import leaveRoute from './routes/leave.js'
import settingRoute from './routes/setting.js'
import adminRoute from './routes/admin.js'
import notificationRoute from './routes/notification.js'

const app = express()

app.use(cors())
app.use(express.json())
mongoose.connect("mongodb+srv://sheikhmahnoor205_db_user:<Mahnoor0307>@lms-cluster.cdcts9h.mongodb.net/?appName=LMS-Cluster")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

app.use('/student', student)
app.use('/department', department)
app.use('/teacher', teacher)
app.use('/assigncourse', assigncourse)
app.use('/schedule', scheduleRoute)
app.use('/attendance', attendanceRoute)
app.use('/leave', leaveRoute)
app.use('/setting', settingRoute)
app.use('/admin-account', adminRoute)
app.use('/notification', notificationRoute)


app.listen(5000, () => {
    console.log('Project run on port 5000')
})