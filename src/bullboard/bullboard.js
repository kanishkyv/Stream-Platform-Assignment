const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const { queues } = require("../queues/queues");

function mountBullBoard(app, { basePath = "/admin/queues" } = {}) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: [
      new BullMQAdapter(queues.userSideEffects),
      new BullMQAdapter(queues.purchaseSideEffects),
      new BullMQAdapter(queues.watchFlush),
    ],
    serverAdapter,
  });

  app.use(basePath, serverAdapter.getRouter());
}

module.exports = { mountBullBoard };

