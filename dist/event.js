var EventEmitter = (function () {
    function EventEmitter() {
        this.listeners = {};
    }
    EventEmitter.prototype.hasListeners = function (eventName) {
        if (!this.listeners[eventName])
            return false;
        return this.listeners[eventName].length !== 0;
    };
    EventEmitter.prototype.on = function (eventName, handler) {
        this.listeners[eventName] = this.listeners[eventName] || [];
        this.listeners[eventName].push(handler);
    };
    EventEmitter.prototype.off = function (eventName, handler) {
        if (!eventName) {
            this.listeners = {};
            return;
        }
        var listeners = this.listeners[eventName];
        if (!listeners)
            return;
        var index = listeners.indexOf(handler);
        index !== -1 && listeners.splice(index, 1);
    };
    EventEmitter.prototype.emit = function (eventName, arg0, arg1, arg2, arg3) {
        var listeners = this.listeners[eventName];
        if (!listeners)
            return;
        for (var i = 0; i < listeners.length; i++) {
            listeners[i](arg0, arg1, arg2, arg3);
        }
    };
    return EventEmitter;
})();
exports.EventEmitter = EventEmitter;
