module.exports = {
  port: parseInt(process.env.PORT, 10) || 3303,
  env: process.env.NODE_ENV || "dev",
  isDev: process.env.NODE_ENV === undefined || process.env.NODE_ENV === "dev",
  githubToken: process.env.GITHUB_TOKEN,
  scannerCron: process.env.SCANNER_CRON || "*/10 * * * *",
};
