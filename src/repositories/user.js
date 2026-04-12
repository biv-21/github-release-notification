const db = require("../database");
const { User } = require("../models");

const create = async (email) => {
  const query = `
    INSERT INTO ${User.tableName} (email)
    VALUES ($1)
    RETURNING *
  `;
  const { rows } = await db.query(query, [email]);
  return rows[0];
};

const findByEmail = async (email) => {
  const query = `
    SELECT * FROM ${User.tableName}
    WHERE email = $1
  `;

  const { rows } = await db.query(query, [email]);
  return rows[0] || null;
};

module.exports = {
  create,
  findByEmail,
};
