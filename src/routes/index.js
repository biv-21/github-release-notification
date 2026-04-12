const express = require("express");
const { subscriptionController } = require("../controllers");
const validate = require("../middleware/validate");
const { z } = require("zod");
const router = express.Router();

const SubscribeRequest = z.object({
  email: z.email(),
  repo: z.string().regex(/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/),
});

const ConfirmParams = z.object({
  token: z.string(),
});

const UnsubscribeParams = z.object({
  token: z.string(),
});

const SubscriptionsQuery = z.object({
  email: z.email(),
});

router.post(
  "/subscribe",
  validate(SubscribeRequest, "body"),
  subscriptionController.subscribe,
);
router.get(
  "/confirm/:token",
  validate(ConfirmParams, "params"),
  subscriptionController.confirmSubscription,
);
router.get(
  "/unsubscribe/:token",
  validate(UnsubscribeParams, "params"),
  subscriptionController.unsubscribe,
);
router.get(
  "/subscriptions",
  validate(SubscriptionsQuery, "query"),
  subscriptionController.getSubscriptions,
);

module.exports = router;
