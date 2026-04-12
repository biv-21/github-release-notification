const { subscriptionService } = require("../services");
const logger = require("../utils/logger");

const subscribe = async (req, res, next) => {
  try {
    logger.info("POST /api/subscribe - Initialized");
    const { email, repo } = req.body;
    await subscriptionService.subscribe(email, repo);
    logger.info("POST /api/subscribe - Success");
    return res.status(200).send();
  } catch (error) {
    next(error);
  }
};

const confirmSubscription = async (req, res, next) => {
  try {
    logger.info("GET /api/confirm/:token - Initialized");
    const { token } = req.params;
    await subscriptionService.confirmSubscription(token);
    logger.info("GET /api/confirm/:token - Success");
    return res.status(200).send();
  } catch (error) {
    next(error);
  }
};

const unsubscribe = async (req, res, next) => {
  try {
    logger.info("GET /api/unsubscribe/:token - Initialized");
    const { token } = req.params;
    await subscriptionService.unsubscribe(token);
    logger.info("GET /api/unsubscribe/:token - Success");
    return res.status(200).send();
  } catch (error) {
    next(error);
  }
};

const getSubscriptions = async (req, res, next) => {
  try {
    logger.info("GET /api/confirm/:token - Initialized");
    const { email } = req.query;
    const subscriptions = await subscriptionService.getSubscriptions(email);
    logger.info("GET /api/confirm/:token - Success");
    return res.status(200).json(subscriptions);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribe,
  confirmSubscription,
  unsubscribe,
  getSubscriptions,
};
