const { z } = require("zod");

const purchaseCompleteSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  amount: z.number().positive(),
  email: z.string().email(),
  deviceToken: z.string().min(1),
});

module.exports = { purchaseCompleteSchema };

