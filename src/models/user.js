const { z } = require("zod");

const UserSchema = z.object({
  id: z.uuid().optional(),
  email: z.email(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

module.exports = {
  tableName: "users",
  schema: UserSchema,
};
