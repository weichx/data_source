import { IRecordStore } from './interfaces';

export class Debouncer {
    private fn : Function;
    private ctx : any;
    private delay : number;
    private timeoutId : number;
    private callThreshold : number;
    private calls : number;

    constructor(fn : Function, ctx : any, delay : number = 100, callThreshold : number = 50) {
        this.fn = fn;
        this.ctx = ctx;
        this.delay = delay;
        this.callThreshold = callThreshold;
        this.timeoutId = -1;
        this.calls = 0;
    }

    public bounce() : void {
        this.calls++;
        if(this.delay <= 0) {
            this.invoke();
        }
        else if (this.calls >= this.callThreshold) {
            this.cancel();
            this.fn.call(this.ctx);
        }
        else if (this.timeoutId === -1) {
            this.timeoutId = setTimeout(() => {
                this.timeoutId = -1;
                this.calls = 0;
                this.fn.call(this.ctx);
            }, this.delay);
        }
    }

    public isSync() : boolean {
        return this.delay <= 0;
    }

    public hasPendingBounces() : boolean {
        return this.calls > 0;
    }

    public invoke() {
        this.cancel();
        this.fn.call(this.ctx);
    }

    public cancel() {
        clearTimeout(this.timeoutId);
        this.timeoutId = -1;
        this.calls = 0;
    }

    public reset(delay? : number, callThreshold : number = 50) : void {
        this.delay = delay;
        this.callThreshold = callThreshold;
        this.cancel();
    }
}

export function copy<T>(src : IRecordStore<T>) : IRecordStore<T> {
    var dest : IRecordStore<T> = {};
    for (var attr in src) {
        if (src.hasOwnProperty(attr)) {
            dest[attr] = src[attr];
        }
    }
    return dest;
}

type AssertionFn = (argument : any, message? : string) => void;

var typeAssertion : Function = function (type : any) : AssertionFn {
    return function (argument : any, message? : string) {
        if (arguments.length === 0) {
            throw new Error('No assertion arguments!');
        }
        if (typeof argument !== type) {
            throw new Error(message || 'Assertion failed! Expected a ' + type + ' but found ' + typeof argument);
        }
    }
};

export class Assert {

    public static assert(condition : any, message? : string) : void {
        if (!condition) {
            throw new Error(message || 'Assertion failed!');
        }
    }

    public static isFunction = typeAssertion('function');
    public static isString = typeAssertion('string');
    public static isBoolean = typeAssertion('boolean');
    public static isNumber = typeAssertion('number');
    public static isUndefined = typeAssertion('undefined');

    public static isDefined(something : any, message? : string) : void {
        if (something === undefined) {
            throw new Error(message || 'Expected input to be defined.');
        }
    }

    public static isArray(array : any, message? : string) {
        if (!Array.isArray(array)) {
            throw new Error(message || 'Assertion failed! Expected an array but found ' + typeof array);
        }
    }

    public static isTruthy = Assert.assert;
}