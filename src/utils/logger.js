class Logger {
  constructor(level = "INFO") {
    this.levels = { DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 };
    this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;

    this.colors = {
      DEBUG: "\x1b[36m", // Cyan
      INFO: "\x1b[32m", // Green
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
      RESET: "\x1b[0m", // Default
    };
  }

  _log(level, message, ...args) {
    if (this.levels[level] >= this.currentLevel) {
      const timestamp = new Date().toISOString();
      const color = this.colors[level] || this.colors.RESET;

      const formattedMessage =
        typeof message === "object" ? JSON.stringify(message) : message;

      console.log(
        `${color}[${timestamp}] [${level}]${this.colors.RESET} ${formattedMessage}`,
        ...args,
      );
    }
  }

  debug(message, ...args) {
    this._log("DEBUG", message, ...args);
  }
  info(message, ...args) {
    this._log("INFO", message, ...args);
  }
  warn(message, ...args) {
    this._log("WARN", message, ...args);
  }
  error(message, ...args) {
    this._log("ERROR", message, ...args);
  }
}

module.exports = new Logger(process.env.LOG_LEVEL || "INFO");
