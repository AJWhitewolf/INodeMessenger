var IMessenger = function(url) {
    var newLib = {
        engine : null,
        listeners : [],
        ackBacks: {},
        registerListener : function(which, callback){
            this.send({register: "event", listeners: [which]});
            var newEvent = {
                event: which,
                callback: function(data) {
                    callback(data);
                }
            };
            this.listeners.push(newEvent);
        },
        registerListeners : function(list) {
            list.forEach(function(item){
                var newEvent = {
                    event: item.event,
                    callback: function(data) {
                        item.callback(data);
                    }
                };
                this.listeners.push(newEvent);
            });
            this.send({register: "event", listeners: list});
        },
        setNamespace: function(name) {
            var newMsg = {
                register: "namespace",
                namespace: name
            };
            this.namespace = name;
            this.send(newMsg);
        },
        send : function(data) {
            if(!data.namespace && this.namespace) {
                data.namespace = this.namespace;
            }
            this.engine.send(JSON.stringify(data));
        },
        sendWithAck : function(data, callback) {
          data.ack = true;
          data.ackId = Math.random().toString(36).slice(2);
          if(callback){
            this.ackBacks[data.ackId] = callback;
          }
          this.send(data);
        },
        sendRaw : function(data) {
            this.engine.socket.binaryType = 'blob';
            this.engine.send(data);
        },
        unregisterListener: function(which, callback) {
            var pos = this.listeners.indexOf(which);
            this.listeners.splice(pos, 1);
        },
        getLog: function(size) {
            this.send(JSON.stringify({log: size}));
        },
        ack: function(msgId) {
            this.send(JSON.stringify({ackId: msgId}));
        }
    };
    newLib.engine = eio(url);
    newLib.engine.on('open', function(){
        console.log("Connected to Engine.IO Server");
        newLib.engine.on('message', function(data){
            var msg = JSON.parse(data);
            if(msg.ack) {
                newLib.ack(msg.eventId);
            }
            if(msg.ackId) {
              if(newLib.ackBacks[msg.ackId] && typeof(newLib.ackBacks[msg.ackId]) == "function") {
                newLib.ackBacks[msg.ackId](msg);
              }
            }
            if(msg.event) {
                newLib.listeners.forEach(function(item){
                    if(item.event == msg.event) {
                        item.callback(msg.data);
                    }
                });
            }
            if(msg.error) {
                console.log(msg.error);
            }
            if(msg.log) {
                console.log(msg.log);
            }
        });
    });
    return newLib;
};
