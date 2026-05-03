const express = require("express");
const { routes } = require("./routes");
const { mountBullBoard } = require("./bullboard/bullboard");
const { errorMiddleware } = require("./middleware/errorMiddleware");
const { notFoundMiddleware } = require("./middleware/notFoundMiddleware");
const { requestLoggerMiddleware } = require("./middleware/requestLoggerMiddleware");

function createApp() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.use(requestLoggerMiddleware());
  mountBullBoard(app);
  app.use(routes());

  app.use(notFoundMiddleware());
  app.use(errorMiddleware());

  return app;
}

module.exports = { createApp };

