import nodemailer from 'nodemailer';

// Configure the central email transport engine
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendInviteArgs {
  toEmail: string;
  firstName: string;
  schoolName: string;
  schoolId: string;
  role: 'admin' | 'teacher';
}

export const sendFacultyInviteEmail = async ({ toEmail, firstName, schoolName, schoolId, role }: SendInviteArgs) => {
  // Generate the dynamic onboarding link targeting the frontend layout router
  // Passing email, role, and school number directly as URL parameters for seamless UX
  const targetSignupUrl = `http://localhost:5173/signup?school_id=${schoolId}&email=${encodeURIComponent(toEmail)}&role=${role}`;

  const roleTitle = role === 'admin' ? 'Senior Leadership (Admin)' : 'Department Head / Educator';

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; borderRadius: 8px; backgroundColor: #ffffff;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 20px; fontWeight: 800; color: #0d7c71;">EduBuddy.</span>
      </div>
      <h2 style="color: #1a202c; font-size: 22px; font-weight: 800; margin-top: 0;">Workspace Invitation</h2>
      <p style="color: #4a5568; font-size: 15px; line-height: 24px;">Hi ${firstName},</p>
      <p style="color: #4a5568; font-size: 15px; line-height: 24px;">
        Your institution, <strong>${schoolName}</strong>, has successfully deployed its central tracking node on the EduBuddy platform. You have been nominated as a core team member with <strong>${roleTitle}</strong> permissions.
      </p>
      
      <div style="margin: 32px 0; text-align: center;">
        <a href="${targetSignupUrl}" style="background-color: #0d7c71; color: #ffffff; padding: 14px 24px; font-weight: bold; font-size: 15px; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 124, 113, 0.15);">
          Activate Your Account & Sign In
        </a>
      </div>

      <p style="color: #718096; font-size: 13px; line-height: 20px; border-top: 1px solid #edf2f7; padding-top: 20px; margin-bottom: 0;">
        If the button above does not work, copy and paste this link into your address bar:<br/>
        <a href="${targetSignupUrl}" style="color: #0d7c71; word-break: break-all;">${targetSignupUrl}</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"EduBuddy Provisioning" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `[EduBuddy Setup] Invitation to join ${schoolName}`,
    html: htmlContent,
  });
};

interface SendResetArgs {
  toEmail: string;
  resetUrl: string;
}

export const sendPasswordResetEmail = async ({ toEmail, resetUrl }: SendResetArgs) => {
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; borderRadius: 8px; backgroundColor: #ffffff;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 20px; fontWeight: 800; color: #0d7c71;">EduBuddy.</span>
      </div>
      <h2 style="color: #1a202c; font-size: 22px; font-weight: 800; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #4a5568; font-size: 15px; line-height: 24px;">Hello,</p>
      <p style="color: #4a5568; font-size: 15px; line-height: 24px;">
        We received a request to reset the password for your EduBuddy account. This link will expire in 30 minutes.
      </p>
      
      <div style="margin: 32px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #0d7c71; color: #ffffff; padding: 14px 24px; font-weight: bold; font-size: 15px; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 4px 12px rgba(13, 124, 113, 0.15);">
          Reset Your Password
        </a>
      </div>

      <p style="color: #718096; font-size: 13px; line-height: 20px; border-top: 1px solid #edf2f7; padding-top: 20px; margin-bottom: 0;">
        If you did not request a password reset, please ignore this email or contact your administrator.<br/><br/>
        If the button above does not work, copy and paste this link into your address bar:<br/>
        <a href="${resetUrl}" style="color: #0d7c71; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"EduBuddy Support" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `[EduBuddy] Password Reset Request`,
    html: htmlContent,
  });
};