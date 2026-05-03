const { purchaseCompleteSchema } = require("../validators/purchaseValidators");
const { purchaseService } = require("../services/purchaseService");

const purchaseController = {
  complete: async (req, res, next) => {
    try {
      const idempotencyKey = req.header("Idempotency-Key");
      if (!idempotencyKey) {
        const err = new Error("Missing required header: Idempotency-Key");
        err.statusCode = 400;
        err.code = "MISSING_IDEMPOTENCY_KEY";
        throw err;
      }

      const input = purchaseCompleteSchema.parse(req.body);
      const result = await purchaseService.completePurchase({
        idempotencyKey,
        ...input,
      });

      res.status(result.httpStatus).json(result.body);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { purchaseController };

