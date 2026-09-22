import nodemailer from "nodemailer";

interface Mail {
  to: string;
  subject: string;
  html: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendMail(mail: Mail) {
  if (!process.env.SMTP_HOST) throw new Error("SMTP not configured");
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM ?? "noreply@neolearn.dev",
    ...mail,
  });
}