var http = require('http');
var engine = require('engine.io');
var net = require('net');

const util = require('util');
const EventEmitter = require('events');

var LOGMAX = 20;

function MyEmitter() {
    EventEmitter.call(this);
}

util.inherits(MyEmitter, EventEmitter);

const myEmitter = new MyEmitter();

var cEvent = require('./models/clientEvent');

var httpServer = http.createServer();
var engineServer = engine.attach(httpServer);

function handleData(socket, data) {
    if(data.toString().substring(0, 1) == "{") {
        var pData = JSON.parse(data);
        if(pData.register == "event") {
            var eventArray = pData.listeners;
            eventArray.forEach(function (item) {
                myEmitter.on(item, function (event) {
                    if(event.namespace) {
                        if(event.namespace == socket.namespace) {
                            socket.logEvent(event);
                            socket.send(JSON.stringify(event));
                        }
                    } else {
                        socket.logEvent(event);
                        socket.send(JSON.stringify(event));
                    }
                });
                socket.listeners.push(item);
            });
        }
        if (pData.register == "namespace") {
            var namespace = pData.namespace;
            socket.namespace = namespace;
        }
        if (pData.event) {
            var event = new cEvent(pData);
            event.origin = socket.id;
            myEmitter.emit(event.event, event);
        }
        if(pData.log) {
            socket.getLog(pData.log);
        }
    }
}

function handleClose(socket) {
    console.log("User Disconnected");
    var listenerList = socket.listeners;
    listenerList.forEach(function(item){
        myEmitter.removeListener(item, function(event){
            if(event.namespace) {
                if(event.namespace == socket.namespace) {
                    socket.logEvent(event);
                    socket.send(JSON.stringify(event));
                }
            } else {
                socket.logEvent(event);
                socket.send(JSON.stringify(event));
            }
        });
    });
}

engineServer.on('connection', function(socket){
    console.log("New Engine.IO user connected, type: Engine.IO");
    addHandlers(socket);
    socket.on('message', function(data) {
        handleData(socket, data);
    });
    socket.on('close', function() {
        handleClose(socket);
    });
});
httpServer.listen(3003);

net.createServer(function(socket) {
    console.log("New Engine.IO user connected, type: TCP");
    addHandlers(socket);
    socket.send = function(data) {
        socket.write(data);
    };
    socket.on('data', function(data){
        handleData(socket, data);
    });
    socket.on('end', function(){
        handleClose(socket);
    });
}).listen(3004);

function addHandlers(socket) {
    socket.listeners = [];
    socket.eventLog = [];
    socket.logEvent = function(event) {
        if(socket.eventLog.length > LOGMAX) {
            socket.eventLog.pop();
        }
        socket.eventLog.unshift(event);
    };
    socket.getLog = function(max) {
        var events = [];
        var count = max;
        //Determine which is larger, the size of the array or the max value
        //If max is greater than the number of events, fetch all events
        if(max > socket.eventLog.length) {
            count = socket.eventLog.length;
        }
        for(var i=0;i<count;i++) {
            events.push(socket.eventLog[i]);
        }
        console.log("Event log request, logs: "+events);
        socket.send(JSON.stringify({log: events}));
    }
}