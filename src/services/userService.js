const { saveUser } = require("../db/userDb");
const { queues } = require("../queues/queues");

const userService = {
  signup: async ({ userId, email, name, deviceToken }) => {
    await saveUser({ userId, email, name });

    // enqueue side-effects
    await queues.userSideEffects.add(
      "user_signup_side_effects",
      { userId, email, name, deviceToken },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 500 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      }
    );

    return { status: true, message: "User created successfully" };
  },
};

module.exports = { userService };

