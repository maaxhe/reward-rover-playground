import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FEEDBACK_TO, FEEDBACK_FROM } = process.env;

const transport =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

/** Mails one feedback note to the owner. Without SMTP settings it does nothing (the note is still saved to disk). */
export async function sendFeedbackMail({ text, level, at }) {
  if (!transport) return false;
  await transport.sendMail({
    from: FEEDBACK_FROM || SMTP_USER,
    to: FEEDBACK_TO || "contact@maximilianherrmann.com",
    subject: `Reward Rover Feedback${level ? ` (Level ${level})` : ""}`,
    text: `${text}\n\n— ${at}${level ? `, Level ${level}` : ""}`,
  });
  return true;
}
