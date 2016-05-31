var http = require('http');
var engine = require('engine.io');
var net = require('net');

var cEvent = require('./models/clientEvent');
var cAck = require('./models/acknowledgement.js');

var httpServer = http.createServer();
var engineServer = engine.attach(httpServer);

var LOGMAX = 20;

var eventQueue = [];
var Listeners = {};
var Spaces = {};

function incomingData(socket, data) {
    if(data.toString().substring(0, 1) == "{") {
        var dData = JSON.parse(data);
        if(dData.register == "event") {
            socket.registerListeners(dData.listeners);
        }
        if(dData.register == "namespace") {
            socket.registerNamespace(dData.namespace);
        }
        if(dData.event) {
            socket.handleEvent(dData);
        }
        if(dData.ackId){
          socket.ackLog.push(dData.ackId);
        }
        if(dData.log) {
            socket.getToLog(dData);
        }
    }
}

engineServer.on('connection', function(socket){
    console.log("New Engine.IO user connected, type: Engine.IO");
    addHandlers(socket);
    socket.on('message', function(data) {
        incomingData(socket, data);
    });
    socket.on('close', function() {
        socket.handleClose();
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
        incomingData(socket, data);
    });
    socket.on('end', function(){
        socket.handleClose();
    });
}).listen(3004);

function addHandlers(socket) {
    socket.listeners = [];
    socket.eventLogFrom = [];
    socket.eventLogTo = [];
    socket.ackLog = [];
    socket.registerListeners = function(listeners) {
        listeners.forEach(function(item) {
            socket.listeners.push(item);
            if (!Listeners[item]) {
                Listeners[item] = [];
            }
            Listeners[item].push(socket);
        });
    };
    socket.registerNamespace = function(name) {
        socket.namespace = name;
        if(!Spaces[name]) {
            Spaces[name] = [];
            Spaces[name].push(socket);
        } else {
            if(Spaces[name].indexOf(socket) < 0) {
                Spaces[name].push(socket);
            }
        }
    };
    socket.handleEvent = function(eventData) {
        var event = new cEvent(eventData);
        event.origin = socket.id;
        event.eventId = socket.id + ':' + event.timestamp.getYear().toString() + event.timestamp.getMonth().toString() + event.timestamp.getDate().toString()
            + event.timestamp.getHours().toString() + event.timestamp.getMinutes().toString() + event.timestamp.getSeconds().toString() + event.timestamp.getMilliseconds().toString();
        if(event.namespace) {
            if(Spaces[event.namespace]) {
                eventQueue.push(event);
                socket.logEventFrom(event);
            } else {
                socket.send(JSON.stringify({error: "Namespace not found"}));
            }
        } else {
            eventQueue.push(event);
            socket.logEventFrom(event);
            if(event.ack) {
              var ack = new cAck(event);
              socket.send(JSON.stringify(ack));
            }
        }
    };
    socket.handleClose = function() {
        console.log("User Disconnected");
        var listenerList = socket.listeners;
        listenerList.forEach(function(item){
            var k = Listeners[item].indexOf(socket);
            Listeners[item].splice(k, 1);
        });
    };
    socket.logEventFrom = function(event) {
        if(socket.eventLogFrom.length >= LOGMAX) {
            socket.eventLogFrom.pop();
        }
        socket.eventLogFrom.unshift(event);
    };
    socket.logEventTo = function(event) {
      if(socket.eventLogTo.length >= LOGMAX) {
          socket.eventLogTo.pop();
      }
      socket.eventLogTo.unshift(event);
    };
    socket.getFromLog = function(data) {
        var events = [];
        var count = data.size;
        //Determine which is larger, the size of the array or the max value
        if(data.size > socket.eventLogFrom.length) {
            count = socket.eventLogFrom.length;
        }
        for(var i=0;i<count;i++) {
            events.push(socket.eventLogFrom[i]);
        }
        console.log("Event log request, logs: "+events);
        var log = {
          logId: data.logId,
          log: events
        };
        socket.send(JSON.stringify(log));
    };
    socket.getToLog = function(data) {
      var events = [];
      var count = data.size;
      //Determine which is larger, the size of the array or the max value
      if(data.size > socket.eventLogTo.length) {
          count = socket.eventLogTo.length;
      }
      for(var i=0;i<count;i++) {
          events.push(socket.eventLogTo[i]);
      }
      console.log("Event log request, logs: "+events);
      var log = {
        logId: data.logId,
        log: events
      };
      socket.send(JSON.stringify(log));
    }
}

var eventLoop = setInterval(function() {
    while(eventQueue.length > 0){
        var event = eventQueue[0];
        console.log("Event found, emitting: "+event.event);
        emitEvent(event);
        eventQueue.shift();
    }
}, 200);

function emitEvent(event) {
    if(event.namespace) {
        Spaces[event.namespace].forEach(function(client) {
            if(client.listeners.indexOf(event.event) > -1) {
                client.send(JSON.stringify(event));
                client.logEventTo(event);
            }
        });
    } else {
      if(Listeners[event.event]){
        Listeners[event.event].forEach(function(item){
            item.send(JSON.stringify(event));
            item.logEventTo(event);
        });
      }
    }
}
