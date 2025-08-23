// Azure Functions entry point
// This file is required by Azure Functions Core Tools as the main entry point
// Individual functions are loaded from their respective directories

const availabilityApi = require('./availability-api/index');

module.exports = {
  'availability-api': availabilityApi
};