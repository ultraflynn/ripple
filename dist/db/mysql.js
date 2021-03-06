"use strict";

// ----------------------------------------------------------------------------
// API
// ----------------------------------------------------------------------------
module.exports = mysql;

var promise = require("../utils").promise;

var con,
    log = console.log.bind(console, "[ripple/mysql]");
function mysql(config) {
  con = require("mysql").createPool(config);
  return mysql;
}

mysql.all = function (table, body) {
  log("getting", table);
  var p = promise();

  con.query("SHOW TABLES LIKE \"" + table + "\"", function (e, rows) {
    if (e) return log("ERROR", table, e);
    if (!rows.length) return (log("table does not exist", table), p.resolve(body));

    con.query("SELECT * FROM " + table, function (e, rows) {
      if (e) return log("ERROR", table, e);
      log("got", table, rows.length);
      p.resolve(rows);
    });
  });

  return p;
};

mysql.tables = function () {
  var p = promise();

  con.query("SHOW TABLES", function (e, rows) {
    if (e) return log("ERROR", e);
    log("tables", rows.length);
    p.resolve(rows);
  });

  return p;
};

mysql.update = function (table, data) {
  var sql = sqlu(table, data),
      p = promise();

  con.query(sql, function (err, rows, fields) {
    if (err) return log("update", table, "failed", err);
    log("update", table, "done");
    p.resolve();
  });

  return p;
};

mysql.push = function (table, data) {
  var sql = sqlc(table, data);
  var p = promise();

  con.query(sql, function (err, rows, fields) {
    if (err) return log("push", table, "failed", err);
    log("push", table, "done");
    p.resolve(data.id = rows.insertId);
  });

  return p;
};

mysql.remove = function (table, data) {
  var sql = sqld(table, data),
      p = promise();

  con.query(sql, function (err, rows, fields) {
    if (err) return log("remove", table, "failed", err);
    log("remove", table, "done");
    p.resolve();
  });

  return p;
};

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------
function sqlc(name, body) {
  if (!isObject(body)) {
    return;
  }var template = "INSERT INTO {table} ({keys}) VALUES ({values});";
  template = template.replace("{table}", name);
  template = template.replace("{keys}", Object.keys(body).filter(skip("id")).join(","));
  template = template.replace("{values}", Object.keys(body).filter(skip("id")).map(value(body)).join(","));
  log(template);
  return template;
}

function sqlu(name, body) {
  if (!isObject(body)) {
    return;
  }var template = "UPDATE {table} SET {kvpairs} WHERE id = {id};";
  template = template.replace("{table}", name);
  template = template.replace("{id}", body.id);
  template = template.replace("{kvpairs}", Object.keys(body).filter(skip("id")).map(kvpair(body)).join(","));
  log(template);
  return template;
}

function sqld(name, body) {
  if (!isObject(body)) {
    return;
  }var template = "DELETE FROM {table} WHERE id = {id};";
  template = template.replace("{table}", name);
  template = template.replace("{id}", body.id);
  log(template);
  return template;
}

function skip(d) {
  return function (key) {
    return key !== d;
  };
}

function value(arr) {
  return function (key) {
    return con.escape(arr[key]);
  };
}

function kvpair(arr) {
  return function (key) {
    return key + "=" + con.escape(arr[key]);
  };
}