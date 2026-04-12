const { Pool } = require("pg");
const config = require("../config");

const db = new Pool(config.database);

module.exports = db;
