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

var hashmap = require('hashmap');

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

  socket.on('reqData', function (DATA) {
    //load data from database
    console.log(DATA);

    //data(string):
    //    question -> question title,
    //    tag -> tagname
    //    date -> yy-mm-dd
    //    community -> community

    //returns:
    //        data:rows
    //        getby rows[i].field_name
    //        rows[i].tag []

    var data = DATA.data;
    if(data.community.length != 0){
        checkbody = "select * from user where user_id = \'" + data.user_id + '\'';
        connection.query(checkbody, function(err, rows, fields) {
          balance = rows[0].balance;
          if (balance <= 0){
            socket.emit("result", {state: false});
          }
          else {
            var querybody = 'select distinct * from question, QuestionTag, persons, community where question.question_id = QuestionTag.question_id and persons.person_id = question.asker_id and persons.community = community.community_id and title like \'%'
                        + data.question + '%\' and community.name = \'' + data.community + '\'';

            if (data.tag.length != 0){
              querybody += 'and tag_name = \'' + data.tag + '\'';
            }

            if(data.date.length != 0){
              querybody += 'and create_date <= \'' + data.date + '\''
            }

            connection.query(querybody, function(err, rows, fields){
              if (err) throw err;
              console.log('hellos');

              map = new hashmap();
              for (var i=0; i<rows.length; i+=1){
                if (!map.has(rows[i].question_id)){
                  map[rows[i].question_id] = i;
                  rows[i].tags = [rows[i].tagname];
                }
                else{
                  map[rows[i].question_id].tags.push(rows[i].tag_name);
                  array.splice(i, 1);
                  i-=1;
                }
              }
              socket.emit('result', { data: rows, state: true});
            });

            updatebody = 'update User set balance = ' + (data.balance - 1) + ' where user_id = ' + data.user_id;
            connection.query(updatebody, function(err, result){
              if (err) throw err;
            });

            //hid user_id content time
            var date = new Date();
            var curdate = ""+date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
            insertbody = 'insert into history(user_id, content, time) values(\'' + data.user_id + '\', \'' + data.question + '\', \'' + curdate + '\')';
            connection.query(insertbody, function(err, result) {
              if (err) throw err;
            });
          }
        });
      }

    else{
      // check balance
      balancebody = 'select * from user where user_id = \'' + data.user_id + '\'';
      console.log(balancebody);
      connection.query(balancebody, function(err, rows, field){
        var balance = rows[0].balance;
        // balance <= 0
        if (balance <= 0){
          socket.emit("result", {state: false});
        }
        // balance > 0
        else{

          var querybody = 'select distinct * from question, QuestionTag where question.question_id = QuestionTag.question_id and title like \'%' + data.question +'%\'';

          if (data.tag.length != 0){
            querybody += 'and tag_name = \'' + data.tag + '\''
          }

          if (data.date.length != 0){
            querybody += 'and create_date <= \'' + data.date + '\''
          }
          console.log(querybody);

          // query question
          connection.query(querybody, function(err, rows, fields){
            if (err) throw err;
            console.log(rows[0]);

            map = new hashmap();
            for (var i=0; i<rows.length; i+=1){
              if (!map.has(rows[i].question_id)){
                map.set(rows[i].question_id, i);
                rows[i].tags = [];
                rows[i].tags.push(rows[i].tag_name)
              }
              else{
                rows[map.get(rows[i].question_id)].tags.push(rows[i].tag_name);
                rows.splice(i, 1);
                i-=1;
              }
            }
            socket.emit('result', { data: rows, state: true});

            // update balance
            updatebody = 'update User set balance = ' + (balance - 1) + ' where user_id = \'' + data.user_id +'\'';
            connection.query(updatebody, function(err, result){
              if (err) throw err;
            });

            // update search history
            //hid user_id content time
            var date = new Date();
            var curdate = ""+date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
            insertbody = 'insert into history(user_id, content, time) values(\'' + data.user_id + '\', \'' + data.question + '\', \'' + curdate + '\')';
            connection.query(insertbody, function(err, result) {
              if (err) throw err;
            });
        });

        }
      });
    }

    // else if(data.type === 'person'){
    //       connection.query('select * from person where title like %' + data.content + '%', function(err, rows, fields){
    //         if (err) throw err;
    //           socket.emit('question', { data: rows });
    //       })
    // }
    //
    // else if(data.type === 'tag'){
    //       connection.query('select * from QuestionTag where tag_name = ' + data.content, function(err, rows, fields){
    //         if (err) throw err;
    //           socket.emit('tag', { data: rows });
    //       });
    // }
    //
    // else if(data.type === 'answer'){
    //       connection.query('select * from answer where question_id = ' + data.content, function(err, rows, fields){
    //         if (err) throw err;
    //           socket.emit('answer', { data: rows });
    //       });
    // }

    //data.type: transaction
    //data:[user_id, amount, before_balance, after_balance]
    //
    //returns:
    //        data:rows
    //        getby rows[i].field_name


    // connection.query('SELECT * from question', function (err, rows, fields) {
    //   if (err) throw err;
    //   //console.log('The solution is: ', rows[0].question_id, rows[1].question_id);
    //   //socket.emit('getData', { my: 'data' });
    // });
  });

  // retrieve answer according to question id
  socket.on('reqAnswer', function (DATA) {
    console.log(DATA);
    var data = DATA.data;

    querybody = 'select * from Answer where question_id = ' + data;
    connection.query(querybody, function(err, rows, fields){
      if (err) throw err;
      console.log(rows);
      socket.emit('detail', { data: rows });
    });
  });

  socket.on('register', function(DATA) {
    console.log(DATA);
    /*
      data{
        user_id,
        email,
        password,
        firstname,
        lastname,
        gender
      }
    */
    var data = DATA.data;
    var querybody = 'insert into user values(\'' + data.user_id + '\', \'' + data.firstname + ' ' + data.lastname + '\',\''
    + data.password + '\', 0, \'' + data.email + '\', \'' + data.gender + '\')';
    console.log(querybody);
    connection.query(querybody, function(err, result) {
      if (err) throw err;
      if (result){
        socket.emit('register_back', {result: true});
      }
      else {
        socket.emit('register_back', {result: false});
      }
    });
  });

  socket.on('login', function (DATA) {
    /*
      data{
        user_id,
        password
      }
    */
    console.log(DATA);
    var data = DATA.data;
    var querybody = 'select * from User where user_id = \'' + data.user_id + '\' and password = \'' + data.password + '\'';
    console.log(querybody);

    connection.query(querybody, function(err, rows, field){
      if(err) throw err;
      if(rows.length >= 1){
        console.log('-----------USER LOGIN CHECK-----------');
        console.log('USER LOGIN: SUCCESS');
        socket.emit('login_back',{result : true, data: rows[0]});
      }
      else{
        console.log('-----------USER LOGIN CHECK-----------');
        console.log('USER LOGIN: FAILED');
        socket.emit('login_back', {result : false});
      }
  });
});

socket.on('add_balance', function(DATA) {
  console.log(DATA);
  data = DATA.data;
  querybody = 'select * from user where user_id = \'' + data.user_id + '\'';
  console.log(querybody);
  connection.query(querybody, function(err, rows, field) {
    if (err) throw err;

    var newbalance = rows[0].balance + data.amount;
    updatebody = 'update user set balance = ' + newbalance + ' where user_id = \'' + data.user_id + '\'';
    console.log(updatebody);
    connection.query(updatebody, function(err, result) {
      if (err) throw err;
      console.log(newbalance);
      if (result) {
        socket.emit('add_balance_result', {state:true, data:newbalance});
      }
      else {
        socket.emit('add_balance_result', {state:false, data:newbalance});
      }
    });
  });
});

socket.on('get_balance', function(DATA) {
  console.log(DATA);
  data = DATA.data;
  querybody = 'select * from user where user_id = \'' + data.user_id + '\'';
  console.log(querybody);
  connection.query(querybody, function(err, rows, field) {
    if (err) throw err;
    socket.emit('get_balance_result', {data : rows[0].balance});
  });
});

socket.on('get_history', function(DATA) {
  console.log(DATA);
  data = DATA.data;
  querybody = 'select * from history where user_id = \'' + data.user_id + '\'';
  console.log(querybody);
  connection.query(querybody, function(err, rows, field) {
    if (err) throw err;
    socket.emit('get_history_result', {data : rows});
  });
});

    // if(data.type === 'transaction_update'){
    //       connection.query('update User set balance = ' + data.after_balance + ' where user_id = ' + data.user_id, function(err, result){
    //         if(err) {
    //           console.log('[UPDATE ERROR]update transaction failed:'+err.message);
    //           socket.emit('result',{result:false});
    //           return;
    //         }
    //         console.log('-----------UPDATE BALENCE------------');
    //         console.log('Update affectedRows',result.affectedRows);
    //         socket.emit('result', {result:true});
    //       });
    //       connection.query('insert into transaction(user_id, amount, before_balance, after_balance) values(?,?,?,?)',[data.user_id, data.amount, data.before_balance, data.after_balance], function(err, result){
    //         if(err){
    //           console.log('[INSERT ERROR]insert transaction record failed:' + err.message);
    //           socket.emit('result', {result:false});
    //           return;
    //         }
    //         cosole.log('-----------INSERT BALENCE RECORD-----------');
    //         console.log('Insert:',result);
    //         socket.emit('result', {result:true});
    //       });
    // }
    // else if(data.type === 'transaction_query'){
    //       connection.query('select * from Transaction where user_id = ' + data.user_id, function(err, rows, field){
    //         if(err){
    //           console.log('[QUERY ERROR]transaction query failed');
    //           return;
    //         }
    //         cosole.log('-----------QUERY TRANSACTION-----------');
    //         console.log('QUERY: user_id:', data.user_id);
    //         socket.emit('transaction_query', {data : rows});
    //       });
    // }

  //});

});


module.exports = app;
