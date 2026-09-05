// server/database/connection.js
const knex = require('knex');
const config = require('../config/database');

const db = knex(config);

module.exports = db;
