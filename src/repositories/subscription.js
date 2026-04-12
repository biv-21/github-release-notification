const db = require("../database");
const { Subscription, User, Repository } = require("../models");

const create = async (userId, repoId, token) => {
  const query = `
    INSERT INTO ${Subscription.tableName} (user_id, repo_id, token)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const { rows } = await db.query(query, [userId, repoId, token]);
  return rows[0];
};

const findByEmailAndRepo = async (email, repo, statuses = null) => {
  let query = `
    SELECT s.* FROM ${Subscription.tableName} s
    INNER JOIN ${User.tableName} u ON s.user_id = u.id
    INNER JOIN ${Repository.tableName} r ON s.repo_id = r.id
    WHERE u.email = $1
    AND r.owner_repo = $2
  `;
  const values = [email, repo];

  if (statuses) {
    const statusArray = Array.isArray(statuses) ? statuses : [statuses];
    query += ` AND s.status = ANY($3)`;
    values.push(statusArray);
  }

  const { rows } = await db.query(query, values);
  return rows[0] || null;
};

const findByToken = async (token, statuses = null) => {
  let query = `
    SELECT * FROM ${Subscription.tableName}
    WHERE token = $1
  `;
  const values = [token];

  if (statuses) {
    const statusArray = Array.isArray(statuses) ? statuses : [statuses];
    query += ` AND status = ANY($2)`;
    values.push(statusArray);
  }

  const { rows } = await db.query(query, values);
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const query = `
    SELECT u.email, r.owner_repo AS repo, s.status, r.last_seen_tag
    FROM ${Subscription.tableName} s
    INNER JOIN ${User.tableName} u ON s.user_id = u.id
    INNER JOIN ${Repository.tableName} r ON s.repo_id = r.id
    WHERE u.email = $1
    AND s.status = ANY(ARRAY['active', 'created']::subscription_status[])
  `;

  const { rows } = await db.query(query, [email]);
  return rows;
};

const findActiveEmailsByRepoId = async (repoId) => {
  const query = `
    SELECT u.email
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.repo_id = $1 AND s.status = 'active'
  `;

  const { rows } = await db.query(query, [repoId]);
  return rows.map((r) => r.email);
};

const updateStatus = async (id, status) => {
  const query = `
    UPDATE ${Subscription.tableName}
    SET status = $1, updated_at = current_timestamp
    WHERE id = $2
    RETURNING *
  `;
  const { rows } = await db.query(query, [status, id]);
  return rows[0] || null;
};

const updateStatusAndToken = async (id, status, token) => {
  const query = `
    UPDATE ${Subscription.tableName}
    SET status = $1, token = $2, updated_at = current_timestamp
    WHERE id = $3
    RETURNING *
  `;
  const { rows } = await db.query(query, [status, token, id]);
  return rows[0] || null;
};

module.exports = {
  create,
  findByEmailAndRepo,
  findByToken,
  findByEmail,
  findActiveEmailsByRepoId,
  updateStatus,
  updateStatusAndToken,
};
