import nodemailer from "nodemailer";

// Read the settings on first use: ES imports run before dotenv.config() in index.js, so top-level reads would see nothing.
let transport;
const getTransport = () => {
  if (transport !== undefined) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  transport =
    SMTP_HOST && SMTP_USER && SMTP_PASS
      ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: Number(SMTP_PORT) || 587,
          secure: Number(SMTP_PORT) === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        })
      : null;
  if (!transport) console.warn("feedback mail disabled: SMTP_HOST/SMTP_USER/SMTP_PASS not set");
  return transport;
};

/** Mails one feedback note to the owner. Without SMTP settings it does nothing (the note is still saved to disk). */
export async function sendFeedbackMail({ text, level, at }) {
  const mailer = getTransport();
  if (!mailer) return false;
  const { SMTP_USER, FEEDBACK_TO, FEEDBACK_FROM } = process.env;
  await mailer.sendMail({
    from: FEEDBACK_FROM || SMTP_USER,
    to: FEEDBACK_TO || "contact@maximilianherrmann.com",
    subject: `Reward Rover Feedback${level ? ` (Level ${level})` : ""}`,
    text: `${text}\n\n— ${at}${level ? `, Level ${level}` : ""}`,
  });
  return true;
}
