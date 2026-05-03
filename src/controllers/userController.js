const { userSignupSchema } = require("../validators/userValidators");
const { userService } = require("../services/userService");

const userController = {
  signup: async (req, res, next) => {
    try {
      const input = userSignupSchema.parse(req.body);
      const result = await userService.signup(input);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { userController };

