const express = require("express");
const { userController } = require("./controllers/userController");
const { purchaseController } = require("./controllers/purchaseController");
const { watchController } = require("./controllers/watchController");

function routes() {
  const router = express.Router();

  router.post("/user/signup", userController.signup);
  router.post("/purchase/complete", purchaseController.complete);
  router.post("/watch/event", watchController.event);

  router.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  return router;
}

module.exports = { routes };

