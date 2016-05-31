var model = function(event){
  this.eventId = event.eventId;
  this.eventName = event.event;
  if(event.namespace) {
    this.eventNamespace = event.namespace;
  }
  this.acknowledged = true;
  this.timestamp = event.timestamp;
  this.ackId = event.ackId;
};

module.exports = model;
