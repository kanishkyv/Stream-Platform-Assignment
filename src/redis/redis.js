const IORedis = require("ioredis");
const { config } = require("../config/env");
const { logger } = require("../utils/logger");

let client;

function getRedis() {
  if (client) return client;
  client = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null, // required for BullMQ reliability
    enableReadyCheck: true,
  });

  client.on("error", (err) => logger.error({ err }, "redis_error"));
  client.on("connect", () => logger.info("redis_connect"));
  return client;
}

module.exports = { getRedis };

