const nodemailer = require("nodemailer");
const logger = require("../utils/logger");
const config = require("../config");

let transporter = null;
let initPromise = null;

const shouldGenerateTestMessageUrl = config.app.isDev && !config.email.host;

const initTransporter = async () => {
  if (config.email.host) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
    return;
  }

  if (config.app.isDev) {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info(`Ethereal test account created: ${testAccount.user}`);
    return;
  }

  throw new Error("SMTP configuration is required in production");
};

const getTransporter = async () => {
  if (transporter) return transporter;
  if (!initPromise) initPromise = initTransporter();
  await initPromise;
  return transporter;
};

const sendConfirmationEmail = async (email, repo, token) => {
  const mailer = await getTransporter();

  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: `Confirm your subscription to ${repo}`,
    text: `You requested to subscribe to ${repo}.\nYour confirmation token is:\n\n${token}\n\nPlease use this token to activate your subscription.\nIf you did not request this, please ignore this email.`,
  };

  const info = await mailer.sendMail(mailOptions);

  if (shouldGenerateTestMessageUrl) {
    logger.info(`Confirmation Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
};

const sendNewReleaseEmail = async (emails, repoName, newTag) => {
  const mailer = await getTransporter();

  const mailOptions = {
    from: config.email.from,
    to: config.email.from,
    bcc: emails,
    subject: `New Release: ${repoName} ${newTag}`,
    text: `Great news! A new tag (${newTag}) has been detected for ${repoName}.`,
  };

  const info = await mailer.sendMail(mailOptions);

  if (shouldGenerateTestMessageUrl) {
    logger.info(`New Release Preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
};

module.exports = {
  sendConfirmationEmail,
  sendNewReleaseEmail,
};
