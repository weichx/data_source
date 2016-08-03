import { IRecordStore } from './interfaces';
export declare class Debouncer {
    private fn;
    private ctx;
    private delay;
    private timeoutId;
    private callThreshold;
    private calls;
    constructor(fn: Function, ctx: any, delay?: number, callThreshold?: number);
    bounce(): void;
    isSync(): boolean;
    hasPendingBounces(): boolean;
    invoke(): void;
    cancel(): void;
    reset(delay?: number, callThreshold?: number): void;
}
export declare function copy<T>(src: IRecordStore<T>): IRecordStore<T>;
export declare class Assert {
    static assert(condition: any, message?: string): void;
    static isFunction: any;
    static isString: any;
    static isBoolean: any;
    static isNumber: any;
    static isUndefined: any;
    static isDefined(something: any, message?: string): void;
    static isArray(array: any, message?: string): void;
    static isTruthy: typeof Assert.assert;
}
