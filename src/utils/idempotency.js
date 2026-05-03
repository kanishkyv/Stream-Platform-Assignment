const { getRedis } = require("../redis/redis");
const { config } = require("../config/env");
const { sleep } = require("./sleep");

function respKey(key) {
  return `idem:resp:${key}`;
}
function lockKey(key) {
  return `idem:lock:${key}`;
}

async function getCachedResponse(idempotencyKey) {
  const redis = getRedis();
  const raw = await redis.get(respKey(idempotencyKey));
  if (!raw) return null;
  return JSON.parse(raw);
}

async function setCachedResponse(idempotencyKey, value, ttlMs = config.idempotencyTtlMs) {
  const redis = getRedis();
  await redis.set(respKey(idempotencyKey), JSON.stringify(value), "PX", ttlMs);
}

async function acquireLock(idempotencyKey, ttlMs = 15_000) {
  const redis = getRedis();
  const token = `${Date.now()}:${Math.random()}`;
  const ok = await redis.set(lockKey(idempotencyKey), token, "NX", "PX", ttlMs);
  return ok ? token : null;
}

async function releaseLock(idempotencyKey, token) {
  const redis = getRedis();
  // Best-effort unlock. (In production you'd use a Lua script for token-checked unlock.)
  const current = await redis.get(lockKey(idempotencyKey));
  if (current === token) await redis.del(lockKey(idempotencyKey));
}

async function waitForCachedResponse(idempotencyKey, { maxWaitMs = 2000, pollEveryMs = 100 } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const cached = await getCachedResponse(idempotencyKey);
    if (cached) return cached;
    await sleep(pollEveryMs);
  }
  return null;
}

module.exports = {
  getCachedResponse,
  setCachedResponse,
  acquireLock,
  releaseLock,
  waitForCachedResponse,
};

