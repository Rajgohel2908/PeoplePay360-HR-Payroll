// server/services/emailService.js
const nodemailer = require('nodemailer');
const db = require('../database/connection');

let transporter = null;

/**
 * Initializes and returns a cached nodemailer transporter.
 * Automatically supports Gmail (with app passwords) and custom SMTP servers.
 */
function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);

  if (!user || !pass) {
    console.warn('⚠️ SMTP_USER or SMTP_PASS not set. Emails will be simulated in email_logs.');
    return null;
  }

  try {
    if (host.includes('gmail') || user.includes('@gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    }
  } catch (err) {
    console.error('Failed to initialize nodemailer transport:', err);
    return null;
  }

  return transporter;
}

/**
 * Dispatches payslip emails in bulk for a payrun.
 * Sends real email via Nodemailer if SMTP configured, and logs to email_logs.
 * @param {number} payrunId
 * @param {Array<number>} selectedPayslipIds (Optional filter)
 */
async function dispatchBulkPayslips(payrunId, selectedPayslipIds = null) {
  let query = db('payslips as ps')
    .join('employees as e', 'ps.employee_id', 'e.id')
    .select(
      'ps.id as payslip_id',
      'ps.payslip_number',
      'ps.net_salary',
      'e.id as employee_id',
      'e.first_name',
      'e.last_name',
      'e.email'
    )
    .where('ps.payrun_id', payrunId);

  if (selectedPayslipIds && selectedPayslipIds.length > 0) {
    query = query.whereIn('ps.id', selectedPayslipIds);
  }

  const recipients = await query;
  const mailer = getTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"PeoplePay360 HR" <${process.env.SMTP_USER}>`;

  let sent = 0;
  let failed = 0;
  let missingEmail = 0;
  const results = [];

  for (const item of recipients) {
    const fullName = `${item.first_name} ${item.last_name}`;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!item.email || !emailRegex.test(item.email)) {
      missingEmail++;
      results.push({
        payslip_id: item.payslip_id,
        employee_id: item.employee_id,
        name: fullName,
        email: item.email || 'N/A',
        status: 'Failed',
        reason: 'Invalid or missing email address'
      });

      await db('email_logs').insert({
        payrun_id: payrunId,
        payslip_id: item.payslip_id,
        employee_id: item.employee_id,
        recipient_email: item.email || 'unknown',
        subject: `Payslip for ${item.payslip_number}`,
        status: 'Failed',
        error_message: 'Invalid or missing email address',
        sent_at: new Date()
      });

      await db('payslips')
        .where('id', item.payslip_id)
        .update({ email_status: 'Failed', updated_at: new Date() });

      continue;
    }

    const subject = `Your Payslip for ${item.payslip_number} is Ready`;
    const netFormatted = `₹${parseFloat(item.net_salary || 0).toLocaleString('en-IN')}`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PeoplePay360</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Enterprise HR & Payroll Platform</p>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #0f172a;">Hello ${fullName},</h2>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
            Your payslip for <strong>${item.payslip_number}</strong> has been processed and approved.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Net Salary Payable</span>
            <div style="font-size: 28px; font-weight: 900; color: #059669; font-family: monospace; margin-top: 4px;">${netFormatted}</div>
          </div>
          <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
            You can view your complete itemized breakdown and download your signed PDF payslip directly from your Employee Self-Service (ESS) portal.
          </p>
          <div style="text-align: center;">
            <a href="http://localhost:3000/login" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px;">Sign In to ESS Portal</a>
          </div>
        </div>
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          This is an automated delivery from PeoplePay360. Please do not reply directly to this email.
        </div>
      </div>
    `;

    try {
      if (mailer) {
        await mailer.sendMail({
          from: fromAddress,
          to: item.email,
          subject,
          text: `Hello ${fullName}, your payslip for ${item.payslip_number} is ready. Net Salary: ${netFormatted}. Log in to view details: http://localhost:3000/login`,
          html: htmlContent
        });
      }

      sent++;
      results.push({
        payslip_id: item.payslip_id,
        employee_id: item.employee_id,
        name: fullName,
        email: item.email,
        status: 'Sent',
        sent_at: new Date().toISOString()
      });

      await db('email_logs').insert({
        payrun_id: payrunId,
        payslip_id: item.payslip_id,
        employee_id: item.employee_id,
        recipient_email: item.email,
        subject,
        status: 'Sent',
        sent_at: new Date()
      });

      await db('payslips')
        .where('id', item.payslip_id)
        .update({
          email_status: 'Sent',
          sent_at: new Date(),
          updated_at: new Date()
        });
    } catch (sendErr) {
      console.error(`Failed to send payslip email to ${item.email}:`, sendErr);
      failed++;
      results.push({
        payslip_id: item.payslip_id,
        employee_id: item.employee_id,
        name: fullName,
        email: item.email,
        status: 'Failed',
        reason: sendErr.message
      });

      await db('email_logs').insert({
        payrun_id: payrunId,
        payslip_id: item.payslip_id,
        employee_id: item.employee_id,
        recipient_email: item.email,
        subject,
        status: 'Failed',
        error_message: sendErr.message,
        sent_at: new Date()
      });

      await db('payslips')
        .where('id', item.payslip_id)
        .update({ email_status: 'Failed', updated_at: new Date() });
    }
  }

  return {
    total: recipients.length,
    sent,
    failed,
    missingEmail,
    results
  };
}

/**
 * Sends welcome onboarding email with login credentials to new employee.
 * Dispatches real email via Nodemailer and stores delivery status in email_logs.
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.name
 * @param {string} params.username
 * @param {string} params.tempPassword
 * @param {string} [params.loginUrl]
 * @param {number} [params.employeeId]
 */
async function sendWelcomeCredentialsEmail({
  email,
  name,
  username,
  tempPassword,
  loginUrl = 'http://localhost:3000/login',
  employeeId = null
}) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    await db('email_logs').insert({
      employee_id: employeeId,
      recipient_email: email || 'unknown',
      subject: 'Welcome to PeoplePay360 - Your Account Credentials',
      status: 'Failed',
      error_message: 'Invalid or missing recipient email',
      sent_at: new Date()
    });
    return { success: false, reason: 'Invalid recipient email' };
  }

  const subject = 'Welcome to PeoplePay360 - Your Account Credentials';
  const mailer = getTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"PeoplePay360 HR" <${process.env.SMTP_USER}>`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 36px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">PeoplePay360</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Enterprise HR & Payroll Platform</p>
      </div>
      
      <div style="padding: 32px 28px;">
        <h2 style="margin: 0 0 14px 0; font-size: 18px; color: #0f172a;">Welcome aboard, ${name}!</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
          Your official <strong>PeoplePay360 Employee Self-Service (ESS)</strong> portal account has been created.
          You can use the corporate credentials below to sign in and access your attendance, time-off requests, and monthly payslips.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="margin-bottom: 14px;">
            <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Portal Web Address</span>
            <a href="${loginUrl}" style="font-size: 13px; color: #059669; font-weight: 600; text-decoration: none;">${loginUrl}</a>
          </div>

          <div style="margin-bottom: 14px;">
            <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Username / Corporate Email</span>
            <span style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${username}</span>
          </div>

          <div>
            <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Temporary Password</span>
            <div style="display: inline-block; background: #ffffff; border: 1px dashed #059669; border-radius: 8px; padding: 8px 16px; margin-top: 4px;">
              <code style="font-size: 18px; font-weight: 800; color: #059669; font-family: monospace; letter-spacing: 1px;">${tempPassword}</code>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${loginUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(5,150,105,0.2);">Sign In to Portal &rarr;</a>
        </div>

        <div style="padding: 14px 18px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; font-size: 12px; color: #065f46; line-height: 1.5;">
          <strong>Security Tip:</strong> We recommend updating your password after logging in. You can click <em>"Forgot password?"</em> on the sign-in screen or use <em>"Change Password"</em> inside your Employee Portal anytime.
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} PeoplePay360 HR Systems. This is a confidential notification intended solely for ${email}.
      </div>
    </div>
  `;

  const textContent = `
Hello ${name},

Welcome to PeoplePay360! Your employee portal account has been created.

Portal URL: ${loginUrl}
Username: ${username}
Temporary Password: ${tempPassword}

Please sign in and change your password at your earliest convenience.
  `.trim();

  let emailStatus = 'Sent';
  let errorMessage = null;

  try {
    if (mailer) {
      const info = await mailer.sendMail({
        from: fromAddress,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`✅ [Nodemailer] Welcome credentials email dispatched to ${email} (messageId: ${info.messageId})`);
    } else {
      console.log(`ℹ️ [Nodemailer Simulation] No SMTP configured. Welcome email logged for ${email}.`);
    }
  } catch (err) {
    console.error(`❌ [Nodemailer Error] Failed to dispatch welcome email to ${email}:`, err);
    emailStatus = 'Failed';
    errorMessage = err.message;
  }

  // Record audit log in database
  await db('email_logs').insert({
    employee_id: employeeId,
    recipient_email: email,
    subject,
    status: emailStatus,
    error_message: errorMessage,
    sent_at: new Date()
  });

  return { success: emailStatus === 'Sent', error: errorMessage };
}

/**
 * Sends password reset email with reset token / link to user.
 * Dispatches real email via Nodemailer and records in email_logs.
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.name
 * @param {string} params.resetToken
 * @param {string} params.resetUrl
 * @param {number} [params.employeeId]
 */
async function sendPasswordResetEmail({
  email,
  name,
  resetToken,
  resetUrl,
  employeeId = null
}) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    await db('email_logs').insert({
      employee_id: employeeId,
      recipient_email: email || 'unknown',
      subject: 'PeoplePay360 - Password Reset Request',
      status: 'Failed',
      error_message: 'Invalid or missing recipient email',
      sent_at: new Date()
    });
    return { success: false, reason: 'Invalid recipient email' };
  }

  const subject = 'PeoplePay360 - Password Reset Verification Code';
  const mailer = getTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"PeoplePay360 Security" <${process.env.SMTP_USER}>`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 36px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">PeoplePay360</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;">Account Security & Recovery</p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="margin: 0 0 14px 0; font-size: 18px; color: #0f172a;">Password Reset Request</h2>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
          Hello ${name || 'User'}, we received a request to reset the password for your PeoplePay360 account associated with <strong>${email}</strong>.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Your 6-Digit Verification Code</span>
          <div style="margin-top: 8px;">
            <span style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #059669; font-family: monospace; background: #ffffff; border: 2px solid #a7f3d0; padding: 8px 24px; border-radius: 12px;">
              ${resetToken}
            </span>
          </div>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">This code will expire in <strong>60 minutes</strong>.</p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 10px; box-shadow: 0 2px 4px rgba(5,150,105,0.2);">
            Click Here to Reset Password &rarr;
          </a>
        </div>

        <div style="padding: 14px 18px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; font-size: 12px; color: #92400e; line-height: 1.5;">
          <strong>Didn't request this?</strong> If you did not make this request, you can safely ignore this email. Your current password will remain completely secure and unchanged.
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} PeoplePay360 Security Team. This is an automated security transmission.
      </div>
    </div>
  `;

  const textContent = `
Hello ${name || 'User'},

We received a request to reset your PeoplePay360 password.
Your verification code is: ${resetToken}

Reset URL: ${resetUrl}

This code is valid for 60 minutes. If you did not request this, you can safely ignore this email.
  `.trim();

  let emailStatus = 'Sent';
  let errorMessage = null;

  try {
    if (mailer) {
      const info = await mailer.sendMail({
        from: fromAddress,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`✅ [Nodemailer] Password reset email dispatched to ${email} (messageId: ${info.messageId})`);
    } else {
      console.log(`ℹ️ [Nodemailer Simulation] No SMTP configured. Password reset code: ${resetToken} for ${email}.`);
    }
  } catch (err) {
    console.error(`❌ [Nodemailer Error] Failed to dispatch password reset email to ${email}:`, err);
    emailStatus = 'Failed';
    errorMessage = err.message;
  }

  // Record audit log in database
  await db('email_logs').insert({
    employee_id: employeeId,
    recipient_email: email,
    subject,
    status: emailStatus,
    error_message: errorMessage,
    sent_at: new Date()
  });

  return { success: emailStatus === 'Sent', error: errorMessage };
}

module.exports = {
  dispatchBulkPayslips,
  sendWelcomeCredentialsEmail,
  sendPasswordResetEmail
};
