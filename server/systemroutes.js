const express = require("express");
const packageFile = require("../package.json");
const defaultLog = require("./log");
const ldap = require("./ldap");
const version = require("../config/version");

const router = express.Router();

function _about(req, res) {
  res.setHeader("Content-Type", "text/plain");
  res.send(`
    packageFile.name:${packageFile.name}
    packageFile.version:${packageFile.version}
    packageFile.description:${packageFile.description}
    version.gitBranch:${version.gitBranch}
    version.gitCommit:${version.gitCommit}
    version.jenkinsBuild:${version.jenkinsBuild}
    version.dockerName:${version.dockerName}
    version.dockerVersion:${version.dockerVersion}
    version.jenkinsBuildDate:${version.jenkinsBuildDate}
  `);
}

async function _monitor(req, res) {
  const log = req.log || defaultLog;

  res.setHeader("Content-Type", "text/plain");
  res.send("APPLICATION_STATUS: OK");
}

router.get("/_monitor", _monitor);
router.get("/_about", _about);

module.exports = router;
