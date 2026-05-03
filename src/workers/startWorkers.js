const { Worker } = require("bullmq");
const { queues } = require("../queues/queues");
const { getRedis } = require("../redis/redis");
const { config } = require("../config/env");
const { logger } = require("../utils/logger");
const { pushProvider, emailService, analytics, crm, revenue } = require("../integrations/mockExternal");
const { dirtySetKey } = require("../services/watchService");

function attachLogging(worker, name) {
  worker.on("completed", (job) => {
    logger.info({ queue: name, jobId: job.id, jobName: job.name }, "job_completed");
  });
  worker.on("failed", (job, err) => {
    logger.error(
      { queue: name, jobId: job && job.id, jobName: job && job.name, err },
      "job_failed"
    );
  });
}

async function flushWatchProgress({ keys } = {}) {
  const redis = getRedis();

  // If keys are provided (immediate flush), flush those; otherwise drain dirty set.
  let toFlush = Array.isArray(keys) && keys.length > 0 ? keys : null;
  if (!toFlush) {
    toFlush = await redis.smembers(dirtySetKey());
  }
  if (!toFlush || toFlush.length === 0) return { flushed: 0 };

  const events = [];
  for (const key of toFlush) {
    const data = await redis.hgetall(key);
    if (!data || Object.keys(data).length === 0) continue;

    events.push({
      type: "watch_progress",
      userId: data.userId,
      contentId: data.contentId,
      sessionId: data.sessionId,
      watchedSeconds: Number(data.watchedSeconds || 0),
      lastEventType: data.lastEventType,
      updatedAt: Number(data.updatedAt || Date.now()),
    });
  }

  // Send in chunks so a large dirty set doesn't create a single huge external call.
  const chunkSize = Math.max(1, Number(config.watchFlushChunkSize || 500));
  for (let i = 0; i < events.length; i += chunkSize) {
    const batch = events.slice(i, i + chunkSize);
    await analytics.trackBatch(batch);
  }

  // Mark as flushed.
  await redis.srem(dirtySetKey(), ...toFlush);
  return { flushed: events.length };
}

let started = false;
const workers = [];

async function startWorkers() {
  if (started) return;
  started = true;

  // Keep same connection shape as queues.
  const connection = getRedis();

  // Workers are created for side effects and watch flush tasks.
  const userSideEffects = new Worker(
    queues.userSideEffects.name,
    async (job) => {
      const { userId, email, name, deviceToken } = job.data || {};

      await crm.upsertContact(email, name, "signup");
      await crm.triggerCampaign(userId, "welcome");
      await analytics.track({ type: "user_signup", userId, email });

      if (deviceToken) {
        await pushProvider.sendWelcome(deviceToken, name);
      }
    },
    { connection }
  );
  attachLogging(userSideEffects, queues.userSideEffects.name);
  workers.push(userSideEffects);

  const purchaseSideEffects = new Worker(
    queues.purchaseSideEffects.name,
    async (job) => {
      const { purchaseId, userId, planId, amount, email, deviceToken } = job.data || {};

      await revenue.capture(userId, amount, "USD", "purchase");
      await analytics.track({ type: "purchase_completed", purchaseId, userId, planId, amount });

      if (email) {
        await emailService.sendPurchaseConfirmation(email, planId, amount);
      }
      if (deviceToken) {
        await pushProvider.sendPurchaseSuccess(deviceToken, planId);
      }
    },
    { connection }
  );
  attachLogging(purchaseSideEffects, queues.purchaseSideEffects.name);
  workers.push(purchaseSideEffects);

  const watchFlush = new Worker(
    queues.watchFlush.name,
    async (job) => {
      const { keys } = job.data || {};
      return await flushWatchProgress({ keys });
    },
    { connection }
  );
  attachLogging(watchFlush, queues.watchFlush.name);
  workers.push(watchFlush);

  logger.info(
    { queues: workers.map((w) => w.name), flushChunkSize: config.watchFlushChunkSize },
    "workers_started"
  );
}

module.exports = { startWorkers };

