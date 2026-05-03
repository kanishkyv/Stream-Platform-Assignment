function notFoundMiddleware() {
  return (req, _res, next) => {
    const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
  };
}

module.exports = { notFoundMiddleware };

