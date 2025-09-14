const environment = require('./environment');
const DatabaseConfig = require('./database');

module.exports = {
  ...environment,
  DatabaseConfig
};