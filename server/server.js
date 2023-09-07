const server = require("kth-node-server");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const uuid = require("uuid/v4");
const logger = require("./log");
const {
  exportResults,
  exportResults2,
  exportResults3,
  exportDone,
} = require("./export");
const systemroutes = require("./systemroutes");

const prefix = "/api/lms-export-results";

/* *******************************
 * *******KTH STYLE *******
 * *******************************
 */

server.use(
  prefix + "/kth-style",
  express.static(path.join(__dirname, "../node_modules/kth-style/dist"))
);

/* *******************************
 * ******* REQUEST PARSING *******
 * *******************************
 */

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cookieParser());

/* *******************************
 * *** PER-REQUEST MIDDLEWARE ****
 * *******************************
 */

server.use((req, res, next) => {
  req.id = uuid();
  req.log = logger.child({
    request_id: req.id,
    request_path: req.path,
  });
  next();
});

/* **********************************
 * ******* APPLICATION ROUTES *******
 * **********************************
 */

server.use(prefix, systemroutes);

server.get(prefix, (req, res) => res.redirect(`${prefix}/_about`));

server.post(prefix + "/export", exportResults);
server.get(prefix + "/export2", exportResults2);
server.get(prefix + "/exportResults3", exportResults3);
server.get(prefix + "/done", exportDone);

// Temp route
server.get(prefix + "/test", (req, res) =>
  res.send(`
  <html>
  <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
  <p>TODO: Detta är bara en testsida för att kunna testa hela oath2-flödet i prod. Så fort som produktion funkar ska denna route tas bort.</p>
  <form method="post" id="form" action="export">
    <input autofocus id="custom_canvas_course_id" name="custom_canvas_course_id" value="2397"></input>
    <input type="submit" />
  </form>
  </html>
  `)
);

// Catch not found and errors

// Expose the server and paths
// server.locals.secret = new Map()
module.exports = server;
