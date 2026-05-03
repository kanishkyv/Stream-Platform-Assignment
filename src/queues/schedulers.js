const { queues } = require("./queues");
const { config } = require("../config/env");
const { logger } = require("../utils/logger");

async function startSchedulers() {
  // Periodic watch flush (Strategy 3: combined)
  // - periodic batching every N minutes
  // - event-triggered immediate flush enqueues ad-hoc jobs
  await queues.watchFlush.add(
    "periodic",
    { reason: "periodic" },
    {
      repeat: { every: config.watchFlushEveryMs },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    }
  );

  logger.info(
    { everyMs: config.watchFlushEveryMs },
    "schedulers_started"
  );
}

module.exports = { startSchedulers };

