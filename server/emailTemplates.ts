import { sendEmail } from "./mailer";

const APP_URL = process.env.APP_URL || "https://app.tooltrace.io";
const LOGO_URL = `${APP_URL}/tooltrace-logo.png`;

const COLORS = {
  primary: "#6366f1", // Indigo 500
  background: "#f3f4f6", // Gray 100
  surface: "#ffffff",
  text: "#1f2937", // Gray 800
  textMuted: "#6b7280", // Gray 500
  border: "#e5e7eb", // Gray 200
};

function getEmailTemplate(content: string, title: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${COLORS.text}; background-color: ${COLORS.background}; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: ${COLORS.background}; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: ${COLORS.surface}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .header { text-align: center; padding: 30px 20px; border-bottom: 1px solid ${COLORS.border}; background-color: ${COLORS.surface}; }
    .logo { height: 40px; width: auto; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; padding: 14px 28px; background-color: ${COLORS.primary}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; font-size: 16px; transition: background-color 0.2s; }
    .button:hover { background-color: #4f46e5; }
    .footer { text-align: center; font-size: 12px; color: ${COLORS.textMuted}; padding: 20px; background-color: #f9fafb; border-top: 1px solid ${COLORS.border}; }
    h2 { margin-top: 0; color: ${COLORS.text}; font-size: 24px; font-weight: 700; }
    p { margin-bottom: 16px; font-size: 16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="${LOGO_URL}" alt="ToolTrace" class="logo" />
      </div>
      <div class="content">
        <h2>${title}</h2>
        ${content}
      </div>
      <div class="footer">
        <p style="margin-bottom: 8px;">&copy; ${new Date().getFullYear()} ToolTrace. All rights reserved.</p>
        <p style="margin: 0;">Automate your SaaS management.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const safeName = name?.trim() || "there";
  const html = getEmailTemplate(`
    <p>Hi ${safeName},</p>
    <p>Welcome to ToolTrace! We're excited to have you on board.</p>
    <p>ToolTrace helps you track your SaaS tools, monitor spending, and manage subscriptions effortlessly.</p>
    <p>To get started, head over to your dashboard and add your first tool.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}" class="button">Go to Dashboard</a>
    </div>
    <p>If you have any questions, feel free to reply to this email.</p>
  `, "Welcome to ToolTrace");

  return sendEmail({
    to,
    subject: "Welcome to ToolTrace",
    html,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = getEmailTemplate(`
    <p>We received a request to reset your ToolTrace password.</p>
    <p>Click the button below to choose a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" class="button" style="color: #ffffff;">Reset Password</a>
    </div>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this change, you can safely ignore this email.</p>
  `, "Reset Your Password");

  return sendEmail({
    to,
    subject: "Reset your ToolTrace password",
    html,
  });
}

export async function sendEmailVerificationEmail(to: string, verifyUrl: string) {
  const html = getEmailTemplate(`
    <p>Thanks for signing up for ToolTrace!</p>
    <p>Please verify your email address to secure your account and access all features.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" class="button" style="color: #ffffff;">Verify Email Address</a>
    </div>
    <p>This link expires in 24 hours.</p>
  `, "Verify Your Email");

  return sendEmail({
    to,
    subject: "Verify your ToolTrace email",
    html,
  });
}

export async function sendTeamInvitationEmail(to: string, inviteUrl: string, inviterName: string) {
  const html = getEmailTemplate(`
    <p>Hello,</p>
    <p><strong>${inviterName}</strong> has invited you to join their team on ToolTrace.</p>
    <p>Collaborate on tool management and subscription tracking together.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" class="button" style="color: #ffffff;">Accept Invitation</a>
    </div>
    <p>This link expires in 7 days.</p>
    <p>If you don't have an account yet, you'll be prompted to create one.</p>
  `, "Join the Team");

  return sendEmail({
    to,
    subject: `Join ${inviterName}'s team on ToolTrace`,
    html,
  });
}
