var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var ejs = require('ejs');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

//var connection = require('./model/db');
var mysql = require('mysql');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('.html', ejs.__express);
app.set('view engine', 'html');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//var io = require('socket.io')(1234);
//console.log("start to listen on socket..");
//io.on('reqData', function (data) {
//  console.log(data);
//  socket.emit('getData', { my: 'data' });
//});

var connection = require('./model/db');

var io = require('socket.io')(1234);
console.log("start to listen on socket..");
io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('reqData', function (data) {
    //load data from database
    console.log(data);

    //data.type: question, tag, date, answer (string)
    //data.content: question -> question title,
    //              tag -> tagname
    //              answer -> question_id(string)
    //returns:
    //        data:rows
    //        getby rows[i].field_name

    if(data.type === 'question'){
      connection.query('select * from question where title like %' + data.content + '%', function(err, rows, fields){
        if (err) throw err;
          socket.emit('question', { data: rows });
      });
    }

    // else if(data.type === 'person'){
    //       connection.query('select * from person where title like %' + data.content + '%', function(err, rows, fields){
    //         if (err) throw err;
    //           socket.emit('question', { data: rows });
    //       })
    // }

    else if(data.type === 'tag'){
          connection.query('select * from QuestionTag where tag_name = ' + data.content, function(err, rows, fields){
            if (err) throw err;
              socket.emit('tag', { data: rows });
          });
    }

    else if(data.type === 'answer'){
          connection.query('select * from answer where question_id = ' + data.content, function(err, rows, fields){
            if (err) throw err;
              socket.emit('answer', { data: rows });
          });
    }

    //data.type: transaction
    //data:[user_id, amount, before_balance, after_balance]
    //
    //returns:
    //        data:rows
    //        getby rows[i].field_name
    else if(data.type === 'transaction_update'){
          connection.query('update User set balance = ' + data.after_balance + ' where user_id = ' + data.user_id, function(err, result){
            if(err) {
              console.log('[UPDATE ERROR]update transaction failed:'+err.message);
              socket.emit('result',{result:false});
              return;
            }
            console.log('-----------UPDATE BALENCE------------');
            console.log('Update affectedRows',result.affectedRows);
            socket.emit('result', {result:true});
          });
          connection.query('insert into transaction(user_id, amount, before_balance, after_balance) values(?,?,?,?)',[data.user_id, data.amount, data.before_balance, data.after_balance], function(err, result){
            if(err){
              console.log('[INSERT ERROR]insert transaction record failed:' + err.message);
              socket.emit('result', {result:false});
              return;
            }
            cosole.log('-----------INSERT BALENCE RECORD-----------');
            console.log('Insert:',result);
            socket.emit('result', {result:true});
          });
    }
    else if(data.type === 'transaction_query'){
          connection.query('select * from Transaction where user_id = ' + data.user_id, function(err, rows, field){
            if(err){
              console.log('[QUERY ERROR]transaction query failed');
              return;
            }
            cosole.log('-----------QUERY TRANSACTION-----------');
            console.log('QUERY: user_id:', data.user_id);
            socket.emit('transaction_query', {data : rows});
          });
    }
    else if(data.type === 'login'){
          connection.query('select * from User where user_id = ' + data.user_id + ' and password =' + data.password, function(err, rows, field){
            if(err){
              console.log('[LOGIN ERROR]login failed');
              return;
            }
            cosole.log('-----------USER LOGIN CHECK-----------');
            console.log('USER LOGIN: SUCCESS');
          });
    }
    // connection.query('SELECT * from question', function (err, rows, fields) {
    //   if (err) throw err;
    //   //console.log('The solution is: ', rows[0].question_id, rows[1].question_id);
    //   //socket.emit('getData', { my: 'data' });
    // });
  });
});


module.exports = app;
