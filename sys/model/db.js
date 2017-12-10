var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '555666',
  database : 'sys'
});

connection.connect();

module.exports = connection;
