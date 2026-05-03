const { createApp } = require("./app");
const { logger } = require("./utils/logger");
const { startWorkers } = require("./workers/startWorkers");
const { startSchedulers } = require("./queues/schedulers");

const PORT = Number(process.env.PORT || 3000);

async function main() {
  const app = createApp();

  // Start background processing in the same process for simplicity.
  // In production, run workers/schedulers as separate processes.
  await startWorkers();
  await startSchedulers();
  app.listen(PORT, () => logger.info({ port: PORT }, "server_listening"));
}

main().catch((err) => {
  logger.error(
    {
      errMessage: err && err.message,
      errStack: err && err.stack,
      errCode: err && err.code,
      errName: err && err.name,
    },
    "server_start_failed"
  );
  // Also write to stderr in case logger formatting drops fields.
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

