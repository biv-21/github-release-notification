const { ZodError } = require("zod");
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    logger.warn("Validation failed: Invalid request data");
    return res.status(400).json({
      message: "Invalid request data",
    });
  }

  if (err.statusCode) {
    logger.warn(`Domain error: ${err.message}`);
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  logger.error(`Unhandled Exception: ${err.stack}`);

  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred."
      : err.message;

  return res.status(500).json({
    message,
  });
};

module.exports = errorHandler;
