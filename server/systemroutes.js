const express = require('express')
const stripIndent = require('common-tags/lib/stripIndent')
const packageFile = require('../package.json')

const router = express.Router()

function _about (req, res) {
  res.setHeader('Content-Type', 'text/plain')
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
  `)
}

router.get('/_monitor', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.send(stripIndent`
    APPLICATION_STATUS: OK
  `)
}))
router.get('/_monitor_all', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.send(stripIndent`
    APPLICATION_STATUS: OK
  `)
}))
router.get('/_about', _about)

module.exports = router
