interface IListenerContainer {
    [index:string]: Array<EvtHandler>;
}

export type EvtHandler = (arg0? : any, arg1? : any, arg2? : any, arg3? : any) => void;

export class EventEmitter {
    private listeners : IListenerContainer;

    constructor() {
        this.listeners = {};
    }

    public hasListeners(eventName : string) : boolean {
        if(!this.listeners[eventName]) return false;
        return this.listeners[eventName].length !== 0
    }

    public on(eventName : string, handler :EvtHandler) : void {
        this.listeners[eventName] = this.listeners[eventName] || [];
        this.listeners[eventName].push(handler);
    }

    public off(eventName? : string, handler? : EvtHandler) : void {
        if(!eventName) {
            this.listeners = {};
            return;
        }
        var listeners = this.listeners[eventName];
        if (!listeners) return;
        var index = listeners.indexOf(handler);
        index !== -1 && listeners.splice(index, 1);
    }

    public emit(eventName : string, arg0? : any, arg1? : any, arg2? : any, arg3? : any) : void {
        var listeners = this.listeners[eventName];
        if(!listeners) return;
        for (var i = 0; i < listeners.length; i++) {
            listeners[i](arg0, arg1, arg2, arg3);
        }
    }
}