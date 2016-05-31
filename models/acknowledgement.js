var model = function(event){
  if(event.eventId){
    this.eventId = event.eventId;
  }
  if(event.event) {
    this.eventName = event.event;
  }
  if(event.namespace) {
    this.eventNamespace = event.namespace;
  }
  this.acknowledged = true;
  if(event.timestamp){
    this.timestamp = event.timestamp;
  }
  this.ackId = event.ackId;
};

module.exports = model;
