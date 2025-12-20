import { sendEmail } from "./mailer";

export async function sendWelcomeEmail(to: string, name?: string) {
  const safeName = name?.trim() || "there";
  return sendEmail({
    to,
    subject: "Welcome to Tooltrace",
    text: `Hi ${safeName},\n\nWelcome to Tooltrace — your account is ready.\n\n— Tooltrace`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your Tooltrace password",
    text: `We received a request to reset your Tooltrace password.\n\nReset link:\n${resetUrl}\n\nThis link expires in 1 hour.\nIf you didn’t request this, you can ignore this email.\n\n— Tooltrace`,
  });
}
export async function sendEmailVerificationEmail(to: string, verifyUrl: string) {
  const subject = "Verify your Tooltrace email";
  const html = `
    <p>Welcome to Tooltrace!</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${verifyUrl}">Verify email</a></p>
    <p>This link expires in 24 hours.</p>
  `;
  return sendEmail({ to, subject, html });
}

export async function sendTeamInvitationEmail(to: string, inviteUrl: string, inviterName: string) {
  const subject = `Join ${inviterName}'s team on ToolTrace`;
  const html = `
    <p>Hello,</p>
    <p>${inviterName} has invited you to join their team on ToolTrace.</p>
    <p>Click the link below to accept the invitation:</p>
    <p><a href="${inviteUrl}">Accept Invitation</a></p>
    <p>This link expires in 7 days.</p>
    <p>If you don't have an account, you'll be able to create one.</p>
  `;
  return sendEmail({ to, subject, html });
}
