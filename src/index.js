const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { startScanner } = require("./workers/scanner");

const port = config.app.port;

app.listen(port, () => {
  if (config.app.isDev) {
    logger.warn("Application is running in development mode");
  }
  logger.info(`Server started on port ${port}`);
  startScanner();
});
