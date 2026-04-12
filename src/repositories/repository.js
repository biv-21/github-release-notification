const db = require("../database");
const { Repository } = require("../models");

const create = async (ownerRepo, tag) => {
  const query = `
    INSERT INTO ${Repository.tableName} (owner_repo, last_seen_tag, last_checked_at)
    VALUES ($1, $2, current_timestamp)
    RETURNING *
  `;
  const { rows } = await db.query(query, [ownerRepo, tag]);
  return rows[0];
};

const findByOwnerRepo = async (ownerRepo) => {
  const query = `
    SELECT * FROM ${Repository.tableName}
    WHERE owner_repo = $1
  `;

  const { rows } = await db.query(query, [ownerRepo]);
  return rows[0] || null;
};

const findAllWithActiveSubscriptions = async () => {
  const query = `
    SELECT DISTINCT r.*
    FROM repositories r
    INNER JOIN subscriptions s ON s.repo_id = r.id
    WHERE s.status = 'active'
  `;
  const { rows } = await db.query(query);
  return rows;
};

const updateLastSeenTag = async (repoId, tag) => {
  const query = `
    UPDATE ${Repository.tableName}
    SET last_seen_tag = $1, last_checked_at = current_timestamp, updated_at = current_timestamp
    WHERE id = $2
    RETURNING *
  `;
  const { rows } = await db.query(query, [tag, repoId]);
  return rows[0] || null;
};

module.exports = {
  create,
  findByOwnerRepo,
  findAllWithActiveSubscriptions,
  updateLastSeenTag,
};
