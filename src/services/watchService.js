const { getRedis } = require("../redis/redis");
const { queues } = require("../queues/queues");

function progressKey(userId, contentId) {
  return `watch:progress:${userId}:${contentId}`;
}
function dirtySetKey() {
  return "watch:dirty";
}

const FLUSH_TRIGGERS = new Set(["pause", "exit", "completion"]);

const watchService = {
  ingestEvent: async ({ userId, contentId, watchedSeconds, sessionId, eventType }) => {
    const redis = getRedis();
    const key = progressKey(userId, contentId);

    // Keep latest progress per (userId, contentId). Prefer max watchedSeconds.
    // Stored as a hash for extensibility.
    const now = Date.now();
    const prev = await redis.hget(key, "watchedSeconds");
    const prevNum = prev ? Number(prev) : 0;
    const nextWatched = Math.max(prevNum, watchedSeconds);

    await redis
      .multi()
      .hset(key, {
        userId,
        contentId,
        sessionId,
        watchedSeconds: String(nextWatched),
        lastEventType: eventType,
        updatedAt: String(now),
      })
      // Track which keys need flushing.
      .sadd(dirtySetKey(), key)
      // Prevent unbounded growth for abandoned sessions.
      .pexpire(key, 60 * 60 * 1000)
      .exec();

    if (FLUSH_TRIGGERS.has(eventType)) {
      // Immediate flush on trigger events (Strategy 3).
      await queues.watchFlush.add(
        "immediate",
        { reason: eventType, keys: [key] },
        {
          attempts: 5,
          backoff: { type: "exponential", delay: 500 },
          removeOnComplete: 5000,
          removeOnFail: 5000,
        }
      );
    }

    return { status: true };
  },
};

module.exports = { watchService, progressKey, dirtySetKey };

