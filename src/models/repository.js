const { z } = require("zod");

const RepositorySchema = z.object({
  id: z.uuid(),
  owner_repo: z.string().regex(/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-._]+$/),
  last_seen_tag: z.string().nullable().optional(),
  last_checked_at: z.date().nullable().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

module.exports = {
  tableName: "repositories",
  schema: RepositorySchema,
};
