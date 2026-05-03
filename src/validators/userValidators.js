const { z } = require("zod");

const userSignupSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  deviceToken: z.string().min(1),
});

module.exports = { userSignupSchema };

