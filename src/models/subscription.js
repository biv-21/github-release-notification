const { z } = require("zod");

const SubscriptionStatus = z.enum(["created", "active", "deactivated"]);

const SubscriptionSchema = z.object({
  id: z.uuid().optional(),
  user_id: z.uuid(),
  repo_id: z.uuid(),
  token: z.string(),
  status: SubscriptionStatus.default("created"),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

module.exports = {
  tableName: "subscriptions",
  schema: SubscriptionSchema,
  subscriptionStatus: SubscriptionStatus,
};
