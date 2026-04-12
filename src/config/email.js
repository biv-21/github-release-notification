module.exports = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.EMAIL_FROM || '"GitHub Notifier" <noreply@notifier.local>',
  secure: parseInt(process.env.SMTP_PORT, 10) === 465,
};
