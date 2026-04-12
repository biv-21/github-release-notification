require("dotenv").config({ quiet: true });

const appConfig = require("./app");
const databaseConfig = require("./database");
const emailConfig = require("./email");

module.exports = {
  app: appConfig,
  database: databaseConfig,
  email: emailConfig,
};
