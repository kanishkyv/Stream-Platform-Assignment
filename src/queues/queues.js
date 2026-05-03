const { Queue } = require("bullmq");
const { getRedis } = require("../redis/redis");

const connection = getRedis();

const queues = {
  userSideEffects: new Queue("user-side-effects", { connection }),
  purchaseSideEffects: new Queue("purchase-side-effects", { connection }),
  watchFlush: new Queue("watch-flush", { connection }),
};

module.exports = { queues };

