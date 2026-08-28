import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let testAccountTransporter = null;

async function getTransporter() {
  // If custom SMTP or service is provided in env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }),
      from: process.env.SMTP_FROM || `"AttendFlow Portal" <${process.env.SMTP_USER}>`,
      isTest: false
    };
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return {
      transporter: nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      }),
      from: process.env.SMTP_FROM || `"AttendFlow Portal" <${process.env.EMAIL_USER}>`,
      isTest: false
    };
  }

  // Fallback to Ethereal Test Account
  if (!testAccountTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      testAccountTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('📧 Nodemailer initialized with Ethereal Test Account:', testAccount.user);
    } catch (err) {
      console.warn('⚠️ Could not generate Ethereal account, using fallback json transport:', err.message);
      testAccountTransporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  return {
    transporter: testAccountTransporter,
    from: '"AttendFlow Support" <noreply@attendflow.edu>',
    isTest: true
  };
}

export async function sendPasswordResetEmail({ to, name = 'Student', resetToken, otp, role = 'student' }) {
  try {
    const { transporter, from, isTest } = await getTransporter();
    const resetUrl = `http://localhost:5173/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(to)}&role=${encodeURIComponent(role)}&otp=${encodeURIComponent(otp)}`;

    const mailOptions = {
      from,
      to,
      subject: `🔐 Password Reset Request - AttendFlow Portal`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">AttendFlow Portal</h1>
                <p style="color: #c7d2fe; margin: 6px 0 0 0; font-size: 14px;">Password Recovery & Manual Setup</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 28px;">
                <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">Hello ${name},</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                  A password reset was requested for your <strong>${role}</strong> account (<code>${to}</code>). You can reset your password directly using the button below or by using your one-time verification code.
                </p>

                <!-- Action Button -->
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                    Reset My Password
                  </a>
                </div>

                <!-- OTP Box -->
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 24px;">
                  <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">
                    Or enter this 6-Digit Verification Code (OTP):
                  </div>
                  <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: monospace;">
                    ${otp}
                  </div>
                </div>

                <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 16px 0;">
                  <strong>Note:</strong> This password reset link and verification code will expire in <strong>60 minutes</strong>.
                </p>

                <p style="font-size: 13px; line-height: 1.5; color: #94a3b8; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  If you did not request this password reset or change, please safely ignore this email. Your current account details will remain secure.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                  © ${new Date().getFullYear()} AttendFlow System. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    let previewUrl = null;
    if (isTest && nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📬 ========================================================');
      console.log('📬 Password Reset Email Dispatched to:', to);
      console.log('📬 6-Digit OTP:', otp);
      console.log('📬 Reset Link:', resetUrl);
      if (previewUrl) {
        console.log('📬 Preview Ethereal Email at:', previewUrl);
      }
      console.log('📬 ========================================================');
    } else {
      console.log('✉️ Real email sent successfully to:', to, 'Message ID:', info.messageId);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      otp,
      resetUrl
    };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw error;
  }
}
