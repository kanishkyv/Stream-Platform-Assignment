const winston = require("winston");

const level = process.env.LOG_LEVEL || "info";

const logger = winston.createLogger({
  level,
  defaultMeta: {
    service: "streaming-platform-backend",
    env: process.env.NODE_ENV || "development",
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

module.exports = { logger };

