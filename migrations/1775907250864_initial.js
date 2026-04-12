/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    email: { type: "varchar(255)", notNull: true, unique: true },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createIndex("users", "email");

  pgm.createTable("repositories", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    owner_repo: { type: "varchar(255)", notNull: true, unique: true },
    last_seen_tag: { type: "varchar(255)" },
    last_checked_at: { type: "timestamp" },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createIndex("repositories", "owner_repo");

  pgm.createType("subscription_status", ["created", "active", "deactivated"]);

  pgm.createTable("subscriptions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
    },
    repo_id: {
      type: "uuid",
      notNull: true,
      references: '"repositories"',
      onDelete: "CASCADE",
    },
    token: { type: "varchar(255)", notNull: true, unique: true },
    status: { type: "subscription_status", notNull: true, default: "created" },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.addConstraint("subscriptions", "unique_user_repo_constraint", {
    unique: ["user_id", "repo_id"],
  });

  pgm.createIndex("subscriptions", "token");
  pgm.createIndex("subscriptions", "user_id");
  pgm.createIndex("subscriptions", "repo_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable("subscriptions");
  pgm.dropType("subscription_status");
  pgm.dropTable("repositories");
  pgm.dropTable("users");
};
