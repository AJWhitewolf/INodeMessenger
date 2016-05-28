var model = function(socket) {
    this.id;
    this.socket = socket;
    this.listeners = [];
};

module.exports = model;