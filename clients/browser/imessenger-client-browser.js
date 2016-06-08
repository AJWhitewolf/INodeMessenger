var IMessenger = function(url) {
    var newLib = {
        engine : null,
        listeners : [],
        ackBacks: {},
        logBacks: {},
        responseBacks: {},
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
        sendExpectingResponse : function(data, callback) {
          var responseId = Math.random().toString(36).slice(2);
          data.responseId = responseId;
          this.responseBacks[responseId] = {
            responseId: responseId,
            eventName: data.event,
            eventId: "",
            callback: function(responseData) {
              callback(responseData);
              var check = false;
              newLib.listeners.forEach(function(item){
                if(item.event == data.event) {
                  check = true;
                }
              });
              if(!check){
                newLib.send({unregister: "event", listeners: [data.event]});
              }
              delete newLib.responseBacks[responseId];
            }
          };
          this.sendWithAck({register: "event", listeners: [data.event]}, function(dummy){
            newLib.sendWithAck(data, function(ack){
              newLib.responseBacks[responseId].eventId = ack.eventId;
            });
          });
        },
        sendRaw : function(data) {
            this.engine.socket.binaryType = 'blob';
            this.engine.send(data);
        },
        unregisterListener: function(which, callback) {
            this.sendWithAck({unregister: "event", listeners: [which]}, function(ack) {
              var k;
              for(var i=0;i<newLib.listeners.length;i++){
                if(newLib.listeners[i].event == which) {
                  k=i;
                }
              }
              if(k && k != -1) {
                newLib.listeners.splice(k, 1);
              }
            });
        },
        getLog: function(size, callback) {
            var data = {
              log: size,
              logId: Math.random().toString(36).slice(2)
            };
            if(callback) {
              this.logBacks[data.logId] = callback;
            }
            this.send(JSON.stringify(data));
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
              if(msg.responseTo) {
                if(newLib.responseBacks[msg.responseTo] && typeof(newLib.responseBacks[msg.responseTo].callback) == "function") {
                  newLib.responseBacks[msg.responseTo].callback(msg);
                }
              } else {
                newLib.listeners.forEach(function(item){
                    if(item.event == msg.event) {
                        item.callback(msg);
                    }
                });
              }
            }
            if(msg.error) {
                console.log(msg.error);
            }
            if(msg.log) {
                if(newLib.logBacks[msg.logId] && typeof(newLib.logBacks[msg.logId]) == "function") {
                  newLib.logBacks[msg.logId](msg.log);
                }
            }
        });
    });
    return newLib;
};
