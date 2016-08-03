///<reference path="typing/promise.d.ts"/>
import { EventEmitter } from "./event";
import { Adapter } from './adapter';
import { AdapterInterface } from './adapter_interface';
import { IAdapter, IRecordStore } from "./interfaces";
import { ICollectionOptions, Collection } from './collection';
import { copy, Assert } from './util';

export class DataSource<T> extends EventEmitter {
    private _adapter : IAdapter<T>;
    private _configPromise : Promise<any>;
    private _loadOncePromise : Promise<T[]>;
    private _records : IRecordStore<T>;
    private _recordList : Array<T>;
    private _observers : any;
    public _dirtyRecordList : boolean;

    constructor(adapter? : IAdapter<T>|Function, config? : any) {
        super();
        if (!DataSource.Promise) {
            throw new Error(DataSource.RequirePromiseImpl);
        }
        var self : DataSource<T> = this;
        if (typeof adapter === 'function') {
            this._adapter = new Adapter<T>();
            (<Function>adapter).call(this._adapter);
        } else {
            this._adapter = <Adapter<T>>adapter || new Adapter<T>();
        }
        this._records = {};
        this._observers = {};
        this._adapter.sourceInterface = new AdapterInterface<T>(this, this._adapter, this._records);
        this._adapter.initialize();
        this._loadOncePromise = null;
        this._dirtyRecordList = true;
        this._configPromise = DataSource.promisify(config).then(function (configResult : any) {
            self._adapter.config = configResult;
        });
    }

    public loadRecords() : Promise<T[]> {
        var loadPromise = this._configPromise.then(() => {
            return DataSource.promisify(this._adapter.loadRecords(copy<T>(this._records)));
        }).then((recordCollection : T[]|IRecordStore<T>) => {
            return this._internalAddRecordCollection(recordCollection);
        });
        this._loadOncePromise = this._loadOncePromise || loadPromise;
        return loadPromise;
    }

    public loadRecordsOnce() : Promise<T[]> {
        var self : DataSource<T> = this;
        if (!this._loadOncePromise) return this.loadRecords();
        return this._loadOncePromise.then(function () {
            return self._internalGetRecordList();
        });
    }

    public addRecord(record : T) : Promise<T> {
        Assert.isTruthy(record, DataSource.AddNullRecord);
        var self : DataSource<T> = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.addRecord(record));
        }).then(function (returnedRecord : T) {
            if (!returnedRecord) {
                return null;
            } else {
                var id = self._adapter.getRecordId(returnedRecord) || Math.random().toString();
                return self._internalAddRecord(returnedRecord, id);
            }
        });
    }

    public getRecord(id : string) : Promise<T> {
        var record = this._records[id];
        return this._configPromise.then(() => {
            return DataSource.promisify(this._adapter.getRecord(id, record));
        }).then((receivedRecord : T) => {
            //in case we get it between the time this was called and the time
            //the adapter resolves, look up the record again.
            record = this._records[id];
            if (!record && receivedRecord) {
                this._internalAddRecord(receivedRecord, this._getLocalRecordId(receivedRecord));
            }
            else if (record && receivedRecord !== record) {
                this._internalChangeRecord(receivedRecord, record, id);
            }
            return receivedRecord || null;
        });
    }

    public setRecord(id : string, record : T) : Promise<T> {
        Assert.isString(id, DataSource.SetRecordIdRequired);
        Assert.isDefined(record, DataSource.SetRecordRecordRequired);
        var self : DataSource<T> = this;
        var localRecord = this._records[id];
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.setRecord(id, record, localRecord));
        }).then(function (returnedRecord) {
            var newRecord = returnedRecord;
            var oldRecord = self._records[id];

            if (newRecord === null) {
                self._internalRemoveRecord(oldRecord, id);
            } else if (oldRecord === undefined) {
                self._internalAddRecord(newRecord, id);
            } else {
                self._internalChangeRecord(newRecord, oldRecord, id);
            }
            return newRecord;
        });
    }

    //this is the same as setRecord without the need to pass in an id.
    public updateRecord(record : T) : Promise<T> {
        var id = this._getLocalRecordId(record);
        return this.setRecord(id, record);
    }

    //removes a record
    public removeRecord(recordOrId : T|string) : Promise<T> {
        var record : T = <T>recordOrId;
        if (typeof recordOrId === "string") {
            record = <T>this._records[<string>recordOrId];
        }
        Assert.assert(Boolean(record), DataSource.RemoveRecordRecordRequired);
        var id : string = null;
        var self : DataSource<T> = this;
        return this._configPromise.then(function () {
            id = self._getLocalRecordId(record);
            return self._adapter.removeRecord(record, id);
        }).then(function (removedRecord) {
            self._internalRemoveRecord(removedRecord, id);
            return removedRecord;
        });
    }

    public addRecordCollection(recordCollection : T[]|IRecordStore<T>) : Promise<T[]> {
        var self : DataSource<T> = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.addRecordCollection(recordCollection));
        }).then(function (recordCollection : T[]|IRecordStore<T>) {
            return self._internalAddRecordCollection(recordCollection);
        });
    }

    public getRecordCollection(ids : Array<string>) : Promise<T[]> {
        var self : DataSource<T> = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.getRecordCollection(ids));
        }).then(function (recordCollection : T[]|IRecordStore<T>) {
            return self._internalAddRecordCollection(recordCollection);
        });
    }

    public removeRecordCollection(recordCollection : T[]|IRecordStore<T>) : Promise<T[]> {
        var self : DataSource<T> = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.removeRecordCollection(recordCollection));
        }).then(function (recordCollection : T[]|IRecordStore<T>) {
            return self._internalRemoveRecordCollection(recordCollection);
        });
    }

    public updateRecordCollection(recordCollection : T[]|IRecordStore<T>) : Promise<T[]> {
        var self : DataSource<T> = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.updateRecordCollection(recordCollection));
        }).then(function (recordCollection : T[]|IRecordStore<T>) {
            return self._internalAddRecordCollection(recordCollection);
        });
    }

    //gets a page of records from the adapter, adding any new records to the data source
    public getRecordPage(pageSize : number, pageNumber : number, optionalArguments? : any) : Promise<T[]> {
        if (!pageSize || pageSize <= 0) pageSize = 10;
        if (!pageNumber || pageNumber <= 0) pageNumber = 1;
        var self : DataSource<T> = this;
        return this._configPromise.then(function (config) {
            return DataSource.promisify(self._adapter.getRecordPage(pageSize, pageNumber, optionalArguments));
        }).then(function (recordsInPage) {
            if (!recordsInPage) recordsInPage = [];
            return self._internalAddRecordCollection(recordsInPage);
        });
    }

    //gets a count of all records as defined by te adapter
    public getRecordCount() : Promise<number> {
        var self : DataSource<T> = this;
        return this._configPromise.then(function (config) {
            return self._adapter.getRecordCount();
        });
    }

    public query(...args : any[]) : Promise<any> {
        return this._configPromise.then(() => {
            var queryId = args[0];
            if (typeof queryId === "string") {
                var queryFnName = 'Query_' + queryId;
                var adapter : any = <any>this._adapter;
                if (typeof adapter[queryFnName] === "function") {
                    args.shift();
                    return DataSource.promisify(adapter[queryFnName].apply(this._adapter, args));
                }
            }
            return DataSource.promisify(this._adapter.query.apply(this._adapter, args));
        });
    }

    public action(...args : any[]) : Promise<any> {
        return this._configPromise.then(() => {
            var actionId = args[0];
            if (typeof actionId === "string") {
                var actionFnName = 'Action_' + actionId;
                var adapter : any = <any>this._adapter;
                if (typeof adapter[actionFnName] === "function") {
                    args.shift();
                    return DataSource.promisify(adapter[actionFnName].apply(this._adapter, args));
                }
            }
            return DataSource.promisify(this._adapter.action.apply(this._adapter, args));
        });
    }

    public clearLocalRecordStore() : void {
        var keys = Object.keys(this._records);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var record = this._records[id];
            this._internalRemoveRecord(record, id);
        }
    }

    public createManagedCollection(options? : ICollectionOptions) : Collection {
        var collection = new Collection(options);
        this.manageCollection(collection);
        return collection;
    }

    public manageCollection(collection : Collection) : void {
        var records = this._internalGetRecordList();

        for (var i = 0; i < records.length; i++) {
            collection.add(records[i]);
        }

        collection.refresh();

        this.on('recordAdded', function (record) {
            collection.add(record);
        });

        this.on('recordRemoved', function (record) {
            collection.remove(record);
        });

        this.on('recordChanged', function (newRecord, oldRecord) {
            collection.change(oldRecord, newRecord);
        });

        collection.on('refresh', function () {
            DataSource.beforeResolveCallback && DataSource.beforeResolveCallback();
        });
    }

    private _getLocalRecordId(record : T) : string {
        var adapterId = this._adapter.getRecordId(record);
        if (adapterId) return adapterId;
        var keys = Object.keys(this._records);
        for (var i = 0; i < keys.length; i++) {
            if (this._records[keys[i]] === record) {
                return keys[i];
            }
        }
        return null;
    }

    private _internalAddRecordCollection(recordCollection : T[]|IRecordStore<T>) : T[] {
        var record : T, localRecord : T, id : string, retn : Array<T> = [];
        if (Array.isArray(recordCollection)) {
            var recordArray = <T[]>recordCollection;
            for (var i = 0; i < recordArray.length; i++) {
                record = recordArray[i];
                id = this._getLocalRecordId(record) || Math.random().toString();
                localRecord = this._records[id];
                if (!localRecord) {
                    this._internalAddRecord(record, id);
                } else if (!this._adapter.recordsEqual(localRecord, record)) {
                    this._internalChangeRecord(record, localRecord, id);
                }
                retn.push(record);
            }
        } else if (recordCollection && typeof recordCollection === 'object') {
            var ids = Object.keys(recordCollection);
            var IRecordStore = <IRecordStore<T>>recordCollection;
            for (i = 0; i < ids.length; i++) {
                id = ids[i];
                record = IRecordStore[id];
                localRecord = this._records[id];
                if (!localRecord) {
                    this._internalAddRecord(record, id);
                } else if (!this._adapter.recordsEqual(record, localRecord)) {
                    this._internalChangeRecord(record, localRecord, id);
                }
                retn.push(record);
            }
        }
        return retn;
    }

    private _internalRemoveRecordCollection(recordCollection : T[]|IRecordStore<T>) : T[] {
        var localRecord : T, id : string, retn : Array<T> = [];
        if (Array.isArray(recordCollection)) {
            var recordArray = <T[]>recordCollection;
            for (var i = 0; i < recordArray.length; i++) {
                id = this._getLocalRecordId(recordArray[i]);
                localRecord = this._records[id];
                localRecord && retn.push(this._internalRemoveRecord(localRecord, id));
            }
        } else if (recordCollection && typeof recordCollection === 'object') {
            var ids = Object.keys(recordCollection);
            for (i = 0; i < ids.length; i++) {
                id = ids[i];
                localRecord = this._records[id];
                localRecord && retn.push(this._internalRemoveRecord(localRecord, id));
            }
        }
        return retn;
    }

    public observeRecord(id : string, callback : (record : T) => void) : () => void {
        if (!this._observers[id]) this._observers[id] = [];
        var observer = new RecordObserver<T>(callback);
        this._observers[id].push(observer);
        return () => {
            var idx = this._observers[id].indexOf(observer);
            if (idx !== -1) this._observers[id].splice(idx, 1);
        };
    }

    public observeRecords(ids : Array<string>, callback : (record : T) => void) : () => void {
        var cancelers : Array<() => void> = [];
        for (var i = 0; i < ids.length; i++) {
            cancelers.push(this.observeRecord(ids[i], callback));
        }
        return () => {
            for (var i = 0; i < cancelers.length; i++) {
                cancelers[i]();
            }
        };
    }

    public awaitRecord(id : string) : Promise<T> {
        if (this._records[id]) {
            return Promise.resolve(this._records[id]);
        }
        if (!this._observers[id]) this._observers[id] = [];
        var observer = new RecordObserver<T>(null);
        this._observers[id].push(observer);
        return new Promise(function (resolve : any) {
            observer.awaitResolver = resolve;
        });
    }

    public awaitRecords(ids : Array<string>) : Promise<T[]> {
        var promises : Promise<T>[] = [];
        for (var i = 0; i < ids.length; i++) {
            promises.push(this.awaitRecord(ids[i]));
        }
        return Promise.all(promises);
    }

    public reset() : void {
        this._records = {};
        this._observers = {};
        this.off();
    }

    private _flushObservers(id : string, record : T) : void {
        var observers = this._observers[id];
        if (!observers) return;
        for (var i = 0; i < observers.length; i++) {
            var observer = observers[i];
            if (observer.awaitResolver) {
                observer.awaitResolver(record);
                observer.awaitResolver = null;
                observers.splice(i, 1);
                i--;
            }
            if (observer.callback) {
                observer.callback(record);
            }
        }
    }

    public _internalAddRecord(addedRecord : T, id : string) : T {
        this._dirtyRecordList = true;
        this._records[id] = addedRecord;
        this._flushObservers(id, addedRecord);
        this.emit('recordAdded', addedRecord, id);
        return addedRecord;
    }

    public _internalChangeRecord(newRecord : T, oldRecord : T, id : string) : T {
        this._dirtyRecordList = true;
        this._records[id] = newRecord;
        this._flushObservers(id, newRecord);
        this.emit('recordChanged', newRecord, oldRecord, id);
        return newRecord;
    }

    //public private -- called from adapter_interface
    public _internalRemoveRecord(removedRecord : T, id : string) : T {
        if (!removedRecord && !this._records[id]) {
            return null;
        }
        this._dirtyRecordList = true;
        var oldRecord = this._records[id];
        delete this._records[id];
        this._flushObservers(id, null);
        this.emit('recordRemoved', removedRecord || oldRecord, id);
        return removedRecord;
    }

    //public private -- called from adapter_interface
    public _internalGetRecordList() : T[] {
        if (this._dirtyRecordList) {
            this._recordList = [];
            var keys = Object.keys(this._records);
            for (var i = 0; i < keys.length; i++) {
                this._recordList.push(this._records[keys[i]]);
            }
            this._dirtyRecordList = false;
        }
        return this._recordList.slice(0);
    }

    //public private -- called from adapter_interface
    public _internalGetLocalRecordIds() : Array<string> {
        return Object.keys(this._records);
    }

    //public private -- called from adapter_interface
    public _internalGetLocalRecords() : IRecordStore<T> {
        var keys = Object.keys(this._records);
        var retn : IRecordStore<T> = {};
        for (var i = 0; i < keys.length; i++) {
            retn[keys[i]] = this._records[keys[i]];
        }
        return retn;
    }

    //take a value and turn it into a promise if it isnt one already
    private static promisify(value : any) {
        return value && value.then && value || Promise.resolve(value);
    }

    private static AddNullRecord = 'You cannot add null or undefined to a data source';
    private static SetRecordIdRequired = 'You must provide a string id to dataSource.setRecord(id)';
    private static SetRecordRecordRequired = 'You must provide a record as the second parameter to dataSource.setRecord(id, record)';
    private static RemoveRecordRecordRequired = 'You must provide a record or record id to dataSource.removeRecord. use dataSource.removeRecord(record) or dataSource.removeRecord(recordId)';
    private static RequirePromiseImpl = "DataSource does not have a promise implementation, set this by passing " +
        "the promise constructor DataSource.SetPromiseImplementation before any of your DataSource constructors run";

    public static SetPromiseImplementation(p : typeof Promise) : void {
        DataSource.Promise = p;
    }

    private static Promise : typeof Promise = null;
    private static beforeResolveCallback : any = null;
    private static methodArray : Array<Function> = [];
    private static methodNameArray : Array<string> = [
        'addRecord',
        'addRecordCollection',
        'awaitRecords',
        'awaitRecord',
        'loadRecordsOnce',
        'getRecord',
        'getRecordCollection',
        'getRecordPage',
        'loadRecords',
        'query',
        'action',
        'removeRecord',
        'removeRecordCollection',
        'setRecord',
        'updateRecord',
        'updateRecordCollection'
    ];

    public static SetBeforeResolveCallback(callback : (retnValue : any|any[]) => void) : void {
        DataSource.beforeResolveCallback = callback;
        DataSource.methodArray = [];
        var proto = DataSource.prototype;

        function createMethod(prototype : any, methodName : string) : void {
            var fn : Function = prototype[methodName];
            DataSource.methodArray.push(fn);
            prototype[methodName] = function (arg1 : any, arg2 : any, arg3 : any, arg4 : any, arg5 : any) {
                return fn.call(this, arg1, arg2, arg3, arg4, arg5).then(function (value : any) {
                    return callback(value) || value;
                }).catch(function (value : any) {
                    callback(value);
                    return Promise.reject(value);
                });
            }
        }

        for (var i = 0; i < DataSource.methodNameArray.length; i++) {
            createMethod(proto, DataSource.methodNameArray[i]);
        }
    }

    public static ResetBeforeResolve() {
        if(DataSource.methodArray.length === 0) return;
        var proto : any = DataSource.prototype;
        for (var i = 0; i < DataSource.methodNameArray.length; i++) {
            proto[DataSource.methodNameArray[i]] = DataSource.methodArray[i];
        }
    }
}

export { Adapter } from './adapter';
export { ICollectionOptions, Collection } from './collection';
export { IAdapter, IRecordStore } from './interfaces';

class RecordObserver<T> {
    public callback : (record : T) => void;
    public awaitResolver : (record : T) => void;

    constructor(callback : (record : T) => void, awaitResolver? : any) {
        this.callback = callback;
        this.awaitResolver = awaitResolver;
    }
}