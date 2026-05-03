const { v4: uuidv4 } = require("uuid");
const { savePurchase, getPurchaseByIdempotencyKey } = require("../db/purchaseDb");
const { queues } = require("../queues/queues");
const {
  acquireLock,
  releaseLock,
  getCachedResponse,
  setCachedResponse,
  waitForCachedResponse,
} = require("../utils/idempotency");

const purchaseService = {
  completePurchase: async ({ idempotencyKey, userId, planId, amount, email, deviceToken }) => {
    // 1) Fast-path: cached response
    const cached = await getCachedResponse(idempotencyKey);
    if (cached) return cached;

    // 2) Check mock DB (idempotency key persisted)
    const existing = await getPurchaseByIdempotencyKey(idempotencyKey);
    if (existing) {
      const response = {
        httpStatus: 200,
        body: { status: true, message: "Purchase recorded", purchaseId: existing.purchaseId },
      };
      await setCachedResponse(idempotencyKey, response);
      return response;
    }

    // 3) Distributed lock to prevent duplicate concurrent purchases
    const token = await acquireLock(idempotencyKey);
    if (!token) {
      // Another request is in-flight. Prefer returning the same response.
      const waited = await waitForCachedResponse(idempotencyKey, { maxWaitMs: 2500, pollEveryMs: 120 });
      if (waited) return waited;

      const err = new Error("Purchase is already being processed");
      err.statusCode = 409;
      err.code = "IDEMPOTENCY_IN_PROGRESS";
      throw err;
    }

    try {
      const purchaseId = uuidv4();
      await savePurchase({ purchaseId, idempotencyKey, userId, planId, amount });

      await queues.purchaseSideEffects.add(
        "purchase_side_effects",
        { purchaseId, userId, planId, amount, email, deviceToken },
        {
          attempts: 6,
          backoff: { type: "exponential", delay: 800 },
          removeOnComplete: 2000,
          removeOnFail: 2000,
        }
      );

      const response = {
        httpStatus: 200,
        body: { status: true, message: "Purchase recorded", purchaseId },
      };
      await setCachedResponse(idempotencyKey, response);
      return response;
    } finally {
      await releaseLock(idempotencyKey, token);
    }
  },
};

module.exports = { purchaseService };

