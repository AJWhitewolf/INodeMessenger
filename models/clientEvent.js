var model = function(data) {
    this.event = data.event;
    this.timestamp = new Date();
    this.origin;
    this.data = data.data;
    if(data.namespace) {
        this.namespace = data.namespace;
    }
    if(data.ack) {
        this.ack = data.ack;
        this.ackId = data.ackId;
    }
    if(data.responseId) {
        this.responseId = data.responseId;
    }
    if(data.responseTo) {
      this.responseTo = data.responseTo;
    }
};

module.exports = model;
