const { watchEventSchema } = require("../validators/watchValidators");
const { watchService } = require("../services/watchService");

const watchController = {
  event: async (req, res, next) => {
    try {
      const input = watchEventSchema.parse(req.body);
      const result = await watchService.ingestEvent(input);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { watchController };

