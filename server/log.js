const bunyan = require("bunyan");
const packageFile = require("../package.json");

function init(extraConfig) {
  return bunyan.createLogger({
    name: (extraConfig && extraConfig.name) || "lms-export-logger",
    app: packageFile.name,
    ...extraConfig,
  });
}
// Export a logger
module.exports = init({});

// Also export a function to create another logger
module.exports.init = init;
