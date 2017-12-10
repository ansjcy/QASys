$(function () {




    //BEGIN INTRO JS
    $(window).load(function() {
        //introJs().start();
        //console.log("load window in here and emit request");

        var socket = io.connect("http://localhost:1234");
        socket.emit("reqData", { my: 'data' });
        socket.on('getData', function (data) {
           console.log(data);
           //socket.emit('my other event', { my: 'data' });
        });


        //var socket = io.connect('http://localhost');
        //socket.on('news', function (data) {
        //    console.log(data);
        //    socket.emit('my other event', { my: 'data' });
        //});

    });
    //END INTRO JS
});
