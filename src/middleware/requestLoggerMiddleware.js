const { randomUUID } = require("crypto");
const { logger } = require("../utils/logger");

function requestLoggerMiddleware() {
  return function requestLogger(req, res, next) {
    const id = randomUUID();
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const meta = {
        reqId: id,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 1000) / 1000,
      };

      if (res.statusCode >= 500) {
        logger.error(meta, "http_request");
      } else if (res.statusCode >= 400) {
        logger.warn(meta, "http_request");
      } else {
        logger.info(meta, "http_request");
      }
    });

    next();
  };
}

module.exports = { requestLoggerMiddleware };

