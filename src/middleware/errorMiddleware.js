const { ZodError } = require("zod");
const { logger } = require("../utils/logger");

function errorMiddleware() {
  // eslint-disable-next-line no-unused-vars
  return (err, _req, res, _next) => {
    const statusCode = Number(err.statusCode || 500);

    if (err instanceof ZodError) {
      return res.status(400).json({
        status: false,
        error: "VALIDATION_ERROR",
        details: err.issues,
      });
    }

    if (statusCode >= 500) {
      logger.error({ err, statusCode }, "request_failed");
    } else {
      logger.warn({ err: { message: err.message }, statusCode }, "request_rejected");
    }

    res.status(statusCode).json({
      status: false,
      error: err.code || "INTERNAL_ERROR",
      message: statusCode >= 500 ? "Internal Server Error" : err.message,
    });
  };
}

module.exports = { errorMiddleware };

