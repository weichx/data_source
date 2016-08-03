export declare type EvtHandler = (arg0?: any, arg1?: any, arg2?: any, arg3?: any) => void;
export declare class EventEmitter {
    private listeners;
    constructor();
    hasListeners(eventName: string): boolean;
    on(eventName: string, handler: EvtHandler): void;
    off(eventName?: string, handler?: EvtHandler): void;
    emit(eventName: string, arg0?: any, arg1?: any, arg2?: any, arg3?: any): void;
}
