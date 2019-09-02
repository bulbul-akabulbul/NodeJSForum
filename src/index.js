const http = require("http");
const nunjucks = require("nunjucks");
const mysql = require("mysql");
const url = require("url");

class Database {
  constructor(config) {
    this.connection = mysql.createConnection(config);
  }
  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
  close() {
    return new Promise((resolve, reject) => {
      this.connection.end(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

let database = new Database({
  host: "remotemysql.com",
  user: "3xjrybgcv9",
  password: "OPSdhyMsQJ",
  database: "3xjrybgcv9",
  port: 3306
});

/**
 * route; /
 * method: GET
 */
function index(req, res, url_parts) {
  let tokens = {
    name: url_parts.query.name,
    unescape: unescape,
    messages: []
  };
  console.log(url_parts.query);
  database
    .query("SELECT * FROM messages")
    .then(rows => {
      rows.forEach((v, i) => {
        tokens.messages.push(v);
      });
    })
    .then(() => {
      res.write(nunjucks.render("src/index.html", tokens));
      res.end();
    });
}

/**
 * route: /post
 * method: POST
 */
function post(req, res, url_parts) {
  let id = 1;
  database
    .query("SELECT ID FROM messages ORDER BY ID DESC LIMIT 1")
    .then(rows => {
      if (rows.length) id = rows[0].ID;
      database
        .query(
          "INSERT INTO messages VALUES (" +
            (id + 1) +
            ', "' +
            escape(url_parts.query.name) +
            '", "' +
            escape(url_parts.query.message) +
            '");'
        )
        .then(rows => {
          console.log(url_parts.hostname);
          res.write(
            nunjucks.render("src/post.html", { name: url_parts.query.name })
          );
          res.end();
        });
    });
}

/**
 * route: /reset
 * method: ANY
 */
function reset(req, res, url_parts) {
  database.query("DELETE FROM messages WHERE '1'='1'").then(() => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("Successfully restarted.");
    res.end();
  });
}

/**
 * route: /message
 * method: GET
 * @param {object} req - Contains information about the request
 * @param {object} res - Output object of the response
 * @param {url object} url_parts - Contains parts of the url such as query, pathname, etc.
 */
function messages(req, res, url_parts) {
  let msgs = [];
  database.query("SELECT * FROM messages").then(rows => {
    rows.forEach((v, i) => {
      v.Name = unescape(v.Name);
      v.Message = unescape(v.Message);
      msgs.push(v);
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(msgs));
  });
}

//create a server object:
http
  .createServer(function(req, res) {
    const url_parts = url.parse(req.url, true);
    if (url_parts.pathname === "/" && req.method === "GET") {
      index(req, res, url_parts);
    } else if (url_parts.pathname === "/post" && req.method === "GET") {
      post(req, res, url_parts);
    } else if (url_parts.pathname === "/reset") {
      reset(req, res, url_parts);
    } else if (url_parts.pathname === "/messages" && req.method === "GET") {
      messages(req, res, url_parts);
    } else {
      console.log(url_parts.pathname);
      console.log(url_parts.method);
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Page Not Found");
    }
  })
  .listen(8080); //the server object listens on port 8080
