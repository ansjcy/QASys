var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '555666',
  database : 'QAsystem'
});

connection.connect();
console.log("ada");

module.exports = connection;
