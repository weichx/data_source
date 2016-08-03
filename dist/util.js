var Debouncer = (function () {
    function Debouncer(fn, ctx, delay, callThreshold) {
        if (delay === void 0) { delay = 100; }
        if (callThreshold === void 0) { callThreshold = 50; }
        this.fn = fn;
        this.ctx = ctx;
        this.delay = delay;
        this.callThreshold = callThreshold;
        this.timeoutId = -1;
        this.calls = 0;
    }
    Debouncer.prototype.bounce = function () {
        var _this = this;
        this.calls++;
        if (this.delay <= 0) {
            this.invoke();
        }
        else if (this.calls >= this.callThreshold) {
            this.cancel();
            this.fn.call(this.ctx);
        }
        else if (this.timeoutId === -1) {
            this.timeoutId = setTimeout(function () {
                _this.timeoutId = -1;
                _this.calls = 0;
                _this.fn.call(_this.ctx);
            }, this.delay);
        }
    };
    Debouncer.prototype.isSync = function () {
        return this.delay <= 0;
    };
    Debouncer.prototype.hasPendingBounces = function () {
        return this.calls > 0;
    };
    Debouncer.prototype.invoke = function () {
        this.cancel();
        this.fn.call(this.ctx);
    };
    Debouncer.prototype.cancel = function () {
        clearTimeout(this.timeoutId);
        this.timeoutId = -1;
        this.calls = 0;
    };
    Debouncer.prototype.reset = function (delay, callThreshold) {
        if (callThreshold === void 0) { callThreshold = 50; }
        this.delay = delay;
        this.callThreshold = callThreshold;
        this.cancel();
    };
    return Debouncer;
})();
exports.Debouncer = Debouncer;
function copy(src) {
    var dest = {};
    for (var attr in src) {
        if (src.hasOwnProperty(attr)) {
            dest[attr] = src[attr];
        }
    }
    return dest;
}
exports.copy = copy;
var typeAssertion = function (type) {
    return function (argument, message) {
        if (arguments.length === 0) {
            throw new Error('No assertion arguments!');
        }
        if (typeof argument !== type) {
            throw new Error(message || 'Assertion failed! Expected a ' + type + ' but found ' + typeof argument);
        }
    };
};
var Assert = (function () {
    function Assert() {
    }
    Assert.assert = function (condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed!');
        }
    };
    Assert.isDefined = function (something, message) {
        if (something === undefined) {
            throw new Error(message || 'Expected input to be defined.');
        }
    };
    Assert.isArray = function (array, message) {
        if (!Array.isArray(array)) {
            throw new Error(message || 'Assertion failed! Expected an array but found ' + typeof array);
        }
    };
    Assert.isFunction = typeAssertion('function');
    Assert.isString = typeAssertion('string');
    Assert.isBoolean = typeAssertion('boolean');
    Assert.isNumber = typeAssertion('number');
    Assert.isUndefined = typeAssertion('undefined');
    Assert.isTruthy = Assert.assert;
    return Assert;
})();
exports.Assert = Assert;
