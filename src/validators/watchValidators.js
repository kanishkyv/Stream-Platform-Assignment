const { z } = require("zod");

// Supports Strategy 3 triggers via eventType.
const watchEventSchema = z.object({
  userId: z.string().min(1),
  contentId: z.string().min(1),
  watchedSeconds: z.number().nonnegative(),
  sessionId: z.string().min(1),
  eventType: z
    .enum(["heartbeat", "pause", "exit", "completion"])
    .default("heartbeat"),
});

module.exports = { watchEventSchema };

