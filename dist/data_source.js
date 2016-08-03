var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
///<reference path="typing/promise.d.ts"/>
var event_1 = require("./event");
var adapter_1 = require('./adapter');
var adapter_interface_1 = require('./adapter_interface');
var collection_1 = require('./collection');
var util_1 = require('./util');
var DataSource = (function (_super) {
    __extends(DataSource, _super);
    function DataSource(adapter, config) {
        _super.call(this);
        if (!DataSource.Promise) {
            throw new Error(DataSource.RequirePromiseImpl);
        }
        var self = this;
        if (typeof adapter === 'function') {
            this._adapter = new adapter_1.Adapter();
            adapter.call(this._adapter);
        }
        else {
            this._adapter = adapter || new adapter_1.Adapter();
        }
        this._records = {};
        this._observers = {};
        this._adapter.sourceInterface = new adapter_interface_1.AdapterInterface(this, this._adapter, this._records);
        this._adapter.initialize();
        this._loadOncePromise = null;
        this._dirtyRecordList = true;
        this._configPromise = DataSource.promisify(config).then(function (configResult) {
            self._adapter.config = configResult;
        });
    }
    DataSource.prototype.loadRecords = function () {
        var _this = this;
        var loadPromise = this._configPromise.then(function () {
            return DataSource.promisify(_this._adapter.loadRecords(util_1.copy(_this._records)));
        }).then(function (recordCollection) {
            return _this._internalAddRecordCollection(recordCollection);
        });
        this._loadOncePromise = this._loadOncePromise || loadPromise;
        return loadPromise;
    };
    DataSource.prototype.loadRecordsOnce = function () {
        var self = this;
        if (!this._loadOncePromise)
            return this.loadRecords();
        return this._loadOncePromise.then(function () {
            return self._internalGetRecordList();
        });
    };
    DataSource.prototype.addRecord = function (record) {
        util_1.Assert.isTruthy(record, DataSource.AddNullRecord);
        var self = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.addRecord(record));
        }).then(function (returnedRecord) {
            if (!returnedRecord) {
                return null;
            }
            else {
                var id = self._adapter.getRecordId(returnedRecord) || Math.random().toString();
                return self._internalAddRecord(returnedRecord, id);
            }
        });
    };
    DataSource.prototype.getRecord = function (id) {
        var _this = this;
        var record = this._records[id];
        return this._configPromise.then(function () {
            return DataSource.promisify(_this._adapter.getRecord(id, record));
        }).then(function (receivedRecord) {
            //in case we get it between the time this was called and the time
            //the adapter resolves, look up the record again.
            record = _this._records[id];
            if (!record && receivedRecord) {
                _this._internalAddRecord(receivedRecord, _this._getLocalRecordId(receivedRecord));
            }
            else if (record && receivedRecord !== record) {
                _this._internalChangeRecord(receivedRecord, record, id);
            }
            return receivedRecord || null;
        });
    };
    DataSource.prototype.setRecord = function (id, record) {
        util_1.Assert.isString(id, DataSource.SetRecordIdRequired);
        util_1.Assert.isDefined(record, DataSource.SetRecordRecordRequired);
        var self = this;
        var localRecord = this._records[id];
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.setRecord(id, record, localRecord));
        }).then(function (returnedRecord) {
            var newRecord = returnedRecord;
            var oldRecord = self._records[id];
            if (newRecord === null) {
                self._internalRemoveRecord(oldRecord, id);
            }
            else if (oldRecord === undefined) {
                self._internalAddRecord(newRecord, id);
            }
            else {
                self._internalChangeRecord(newRecord, oldRecord, id);
            }
            return newRecord;
        });
    };
    //this is the same as setRecord without the need to pass in an id.
    DataSource.prototype.updateRecord = function (record) {
        var id = this._getLocalRecordId(record);
        return this.setRecord(id, record);
    };
    //removes a record
    DataSource.prototype.removeRecord = function (recordOrId) {
        var record = recordOrId;
        if (typeof recordOrId === "string") {
            record = this._records[recordOrId];
        }
        util_1.Assert.assert(Boolean(record), DataSource.RemoveRecordRecordRequired);
        var id = null;
        var self = this;
        return this._configPromise.then(function () {
            id = self._getLocalRecordId(record);
            return self._adapter.removeRecord(record, id);
        }).then(function (removedRecord) {
            self._internalRemoveRecord(removedRecord, id);
            return removedRecord;
        });
    };
    DataSource.prototype.addRecordCollection = function (recordCollection) {
        var self = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.addRecordCollection(recordCollection));
        }).then(function (recordCollection) {
            return self._internalAddRecordCollection(recordCollection);
        });
    };
    DataSource.prototype.getRecordCollection = function (ids) {
        var self = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.getRecordCollection(ids));
        }).then(function (recordCollection) {
            return self._internalAddRecordCollection(recordCollection);
        });
    };
    DataSource.prototype.removeRecordCollection = function (recordCollection) {
        var self = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.removeRecordCollection(recordCollection));
        }).then(function (recordCollection) {
            return self._internalRemoveRecordCollection(recordCollection);
        });
    };
    DataSource.prototype.updateRecordCollection = function (recordCollection) {
        var self = this;
        return this._configPromise.then(function () {
            return DataSource.promisify(self._adapter.updateRecordCollection(recordCollection));
        }).then(function (recordCollection) {
            return self._internalAddRecordCollection(recordCollection);
        });
    };
    //gets a page of records from the adapter, adding any new records to the data source
    DataSource.prototype.getRecordPage = function (pageSize, pageNumber, optionalArguments) {
        if (!pageSize || pageSize <= 0)
            pageSize = 10;
        if (!pageNumber || pageNumber <= 0)
            pageNumber = 1;
        var self = this;
        return this._configPromise.then(function (config) {
            return DataSource.promisify(self._adapter.getRecordPage(pageSize, pageNumber, optionalArguments));
        }).then(function (recordsInPage) {
            if (!recordsInPage)
                recordsInPage = [];
            return self._internalAddRecordCollection(recordsInPage);
        });
    };
    //gets a count of all records as defined by te adapter
    DataSource.prototype.getRecordCount = function () {
        var self = this;
        return this._configPromise.then(function (config) {
            return self._adapter.getRecordCount();
        });
    };
    DataSource.prototype.query = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return this._configPromise.then(function () {
            var queryId = args[0];
            if (typeof queryId === "string") {
                var queryFnName = 'Query_' + queryId;
                var adapter = _this._adapter;
                if (typeof adapter[queryFnName] === "function") {
                    args.shift();
                    return DataSource.promisify(adapter[queryFnName].apply(_this._adapter, args));
                }
            }
            return DataSource.promisify(_this._adapter.query.apply(_this._adapter, args));
        });
    };
    DataSource.prototype.action = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return this._configPromise.then(function () {
            var actionId = args[0];
            if (typeof actionId === "string") {
                var actionFnName = 'Action_' + actionId;
                var adapter = _this._adapter;
                if (typeof adapter[actionFnName] === "function") {
                    args.shift();
                    return DataSource.promisify(adapter[actionFnName].apply(_this._adapter, args));
                }
            }
            return DataSource.promisify(_this._adapter.action.apply(_this._adapter, args));
        });
    };
    DataSource.prototype.clearLocalRecordStore = function () {
        var keys = Object.keys(this._records);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var record = this._records[id];
            this._internalRemoveRecord(record, id);
        }
    };
    DataSource.prototype.createManagedCollection = function (options) {
        var collection = new collection_1.Collection(options);
        this.manageCollection(collection);
        return collection;
    };
    DataSource.prototype.manageCollection = function (collection) {
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
    };
    DataSource.prototype._getLocalRecordId = function (record) {
        var adapterId = this._adapter.getRecordId(record);
        if (adapterId)
            return adapterId;
        var keys = Object.keys(this._records);
        for (var i = 0; i < keys.length; i++) {
            if (this._records[keys[i]] === record) {
                return keys[i];
            }
        }
        return null;
    };
    DataSource.prototype._internalAddRecordCollection = function (recordCollection) {
        var record, localRecord, id, retn = [];
        if (Array.isArray(recordCollection)) {
            var recordArray = recordCollection;
            for (var i = 0; i < recordArray.length; i++) {
                record = recordArray[i];
                id = this._getLocalRecordId(record) || Math.random().toString();
                localRecord = this._records[id];
                if (!localRecord) {
                    this._internalAddRecord(record, id);
                }
                else if (!this._adapter.recordsEqual(localRecord, record)) {
                    this._internalChangeRecord(record, localRecord, id);
                }
                retn.push(record);
            }
        }
        else if (recordCollection && typeof recordCollection === 'object') {
            var ids = Object.keys(recordCollection);
            var IRecordStore = recordCollection;
            for (i = 0; i < ids.length; i++) {
                id = ids[i];
                record = IRecordStore[id];
                localRecord = this._records[id];
                if (!localRecord) {
                    this._internalAddRecord(record, id);
                }
                else if (!this._adapter.recordsEqual(record, localRecord)) {
                    this._internalChangeRecord(record, localRecord, id);
                }
                retn.push(record);
            }
        }
        return retn;
    };
    DataSource.prototype._internalRemoveRecordCollection = function (recordCollection) {
        var localRecord, id, retn = [];
        if (Array.isArray(recordCollection)) {
            var recordArray = recordCollection;
            for (var i = 0; i < recordArray.length; i++) {
                id = this._getLocalRecordId(recordArray[i]);
                localRecord = this._records[id];
                localRecord && retn.push(this._internalRemoveRecord(localRecord, id));
            }
        }
        else if (recordCollection && typeof recordCollection === 'object') {
            var ids = Object.keys(recordCollection);
            for (i = 0; i < ids.length; i++) {
                id = ids[i];
                localRecord = this._records[id];
                localRecord && retn.push(this._internalRemoveRecord(localRecord, id));
            }
        }
        return retn;
    };
    DataSource.prototype.observeRecord = function (id, callback) {
        var _this = this;
        if (!this._observers[id])
            this._observers[id] = [];
        var observer = new RecordObserver(callback);
        this._observers[id].push(observer);
        return function () {
            var idx = _this._observers[id].indexOf(observer);
            if (idx !== -1)
                _this._observers[id].splice(idx, 1);
        };
    };
    DataSource.prototype.observeRecords = function (ids, callback) {
        var cancelers = [];
        for (var i = 0; i < ids.length; i++) {
            cancelers.push(this.observeRecord(ids[i], callback));
        }
        return function () {
            for (var i = 0; i < cancelers.length; i++) {
                cancelers[i]();
            }
        };
    };
    DataSource.prototype.awaitRecord = function (id) {
        if (this._records[id]) {
            return Promise.resolve(this._records[id]);
        }
        if (!this._observers[id])
            this._observers[id] = [];
        var observer = new RecordObserver(null);
        this._observers[id].push(observer);
        return new Promise(function (resolve) {
            observer.awaitResolver = resolve;
        });
    };
    DataSource.prototype.awaitRecords = function (ids) {
        var promises = [];
        for (var i = 0; i < ids.length; i++) {
            promises.push(this.awaitRecord(ids[i]));
        }
        return Promise.all(promises);
    };
    DataSource.prototype.reset = function () {
        this._records = {};
        this._observers = {};
        this.off();
    };
    DataSource.prototype._flushObservers = function (id, record) {
        var observers = this._observers[id];
        if (!observers)
            return;
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
    };
    DataSource.prototype._internalAddRecord = function (addedRecord, id) {
        this._dirtyRecordList = true;
        this._records[id] = addedRecord;
        this._flushObservers(id, addedRecord);
        this.emit('recordAdded', addedRecord, id);
        return addedRecord;
    };
    DataSource.prototype._internalChangeRecord = function (newRecord, oldRecord, id) {
        this._dirtyRecordList = true;
        this._records[id] = newRecord;
        this._flushObservers(id, newRecord);
        this.emit('recordChanged', newRecord, oldRecord, id);
        return newRecord;
    };
    //public private -- called from adapter_interface
    DataSource.prototype._internalRemoveRecord = function (removedRecord, id) {
        if (!removedRecord && !this._records[id]) {
            return null;
        }
        this._dirtyRecordList = true;
        var oldRecord = this._records[id];
        delete this._records[id];
        this._flushObservers(id, null);
        this.emit('recordRemoved', removedRecord || oldRecord, id);
        return removedRecord;
    };
    //public private -- called from adapter_interface
    DataSource.prototype._internalGetRecordList = function () {
        if (this._dirtyRecordList) {
            this._recordList = [];
            var keys = Object.keys(this._records);
            for (var i = 0; i < keys.length; i++) {
                this._recordList.push(this._records[keys[i]]);
            }
            this._dirtyRecordList = false;
        }
        return this._recordList.slice(0);
    };
    //public private -- called from adapter_interface
    DataSource.prototype._internalGetLocalRecordIds = function () {
        return Object.keys(this._records);
    };
    //public private -- called from adapter_interface
    DataSource.prototype._internalGetLocalRecords = function () {
        var keys = Object.keys(this._records);
        var retn = {};
        for (var i = 0; i < keys.length; i++) {
            retn[keys[i]] = this._records[keys[i]];
        }
        return retn;
    };
    //take a value and turn it into a promise if it isnt one already
    DataSource.promisify = function (value) {
        return value && value.then && value || Promise.resolve(value);
    };
    DataSource.SetPromiseImplementation = function (p) {
        DataSource.Promise = p;
    };
    DataSource.SetBeforeResolveCallback = function (callback) {
        DataSource.beforeResolveCallback = callback;
        DataSource.methodArray = [];
        var proto = DataSource.prototype;
        function createMethod(prototype, methodName) {
            var fn = prototype[methodName];
            DataSource.methodArray.push(fn);
            prototype[methodName] = function (arg1, arg2, arg3, arg4, arg5) {
                return fn.call(this, arg1, arg2, arg3, arg4, arg5).then(function (value) {
                    return callback(value) || value;
                }).catch(function (value) {
                    callback(value);
                    return Promise.reject(value);
                });
            };
        }
        for (var i = 0; i < DataSource.methodNameArray.length; i++) {
            createMethod(proto, DataSource.methodNameArray[i]);
        }
    };
    DataSource.ResetBeforeResolve = function () {
        if (DataSource.methodArray.length === 0)
            return;
        var proto = DataSource.prototype;
        for (var i = 0; i < DataSource.methodNameArray.length; i++) {
            proto[DataSource.methodNameArray[i]] = DataSource.methodArray[i];
        }
    };
    DataSource.AddNullRecord = 'You cannot add null or undefined to a data source';
    DataSource.SetRecordIdRequired = 'You must provide a string id to dataSource.setRecord(id)';
    DataSource.SetRecordRecordRequired = 'You must provide a record as the second parameter to dataSource.setRecord(id, record)';
    DataSource.RemoveRecordRecordRequired = 'You must provide a record or record id to dataSource.removeRecord. use dataSource.removeRecord(record) or dataSource.removeRecord(recordId)';
    DataSource.RequirePromiseImpl = "DataSource does not have a promise implementation, set this by passing " +
        "the promise constructor DataSource.SetPromiseImplementation before any of your DataSource constructors run";
    DataSource.Promise = null;
    DataSource.beforeResolveCallback = null;
    DataSource.methodArray = [];
    DataSource.methodNameArray = [
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
    return DataSource;
})(event_1.EventEmitter);
exports.DataSource = DataSource;
var adapter_2 = require('./adapter');
exports.Adapter = adapter_2.Adapter;
var collection_2 = require('./collection');
exports.Collection = collection_2.Collection;
var RecordObserver = (function () {
    function RecordObserver(callback, awaitResolver) {
        this.callback = callback;
        this.awaitResolver = awaitResolver;
    }
    return RecordObserver;
})();
