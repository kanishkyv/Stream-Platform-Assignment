function env(key, fallback) {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return v;
}

const config = {
  redisUrl: env("REDIS_URL", "redis://127.0.0.1:6379"),
  watchFlushEveryMs: Number(env("WATCH_FLUSH_EVERY_MS", String(2 * 60 * 1000))), // default 2 min
  watchFlushChunkSize: Number(env("WATCH_FLUSH_CHUNK_SIZE", "500")),
  idempotencyTtlMs: Number(env("IDEMPOTENCY_TTL_MS", String(24 * 60 * 60 * 1000))), // 24h
  externalCallTimeoutMs: Number(env("EXTERNAL_CALL_TIMEOUT_MS", "1500")),
};

module.exports = { config };

