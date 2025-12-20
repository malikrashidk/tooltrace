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
