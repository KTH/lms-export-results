require("dotenv").config();
require("@kth/reqvars").check();
const server = require("./server/server");
const log = require("./server/log");

log.info("canvas client id:", process.env.CANVAS_CLIENT_ID);

if (process.env.AZURE_APPINSIGHTS_INSTRUMENTATION_KEY) {
  const appInsights = require("applicationinsights");
  appInsights
    .setup(process.env.AZURE_APPINSIGHTS_INSTRUMENTATION_KEY)
    .setAutoDependencyCorrelation(false)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(false)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .start();
}

module.exports = server.start({
  useSsl: false,
  port: process.env.SERVER_PORT || process.env.PORT || 3001,
  logger: log,
});
