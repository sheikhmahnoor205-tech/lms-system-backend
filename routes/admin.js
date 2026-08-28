import express from 'express';
import { login, getProfile, updateProfile, forgotPassword, resetPassword } from '../controllers/admincontroller.js';

const router = express.Router();

router.post('/login', login);
router.get('/profile', getProfile);
router.post('/update', updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
