var Adapter = (function () {
    function Adapter() {
    }
    //called after constructor, at this point sourceInterface is available
    Adapter.prototype.initialize = function () {
    };
    Adapter.prototype.loadRecords = function (localRecords) {
        return localRecords || {};
    };
    Adapter.prototype.addRecord = function (record) {
        return record;
    };
    Adapter.prototype.removeRecord = function (record, id) {
        return record;
    };
    Adapter.prototype.getRecord = function (id, currentRecord) {
        return currentRecord;
    };
    Adapter.prototype.setRecord = function (id, newRecord, oldRecord) {
        return newRecord;
    };
    Adapter.prototype.addRecordCollection = function (collection) {
        var retn = [];
        if (Array.isArray(collection)) {
            var recordArray = collection;
            for (var i = 0; i < recordArray.length; i++) {
                retn.push(this.addRecord(recordArray[i]));
            }
        }
        else if (collection && typeof collection === 'object') {
            var keys = Object.keys(collection);
            var IRecordStore = collection;
            for (i = 0; i < keys.length; i++) {
                retn.push(this.addRecord(IRecordStore[keys[i]]));
            }
        }
        return retn;
    };
    Adapter.prototype.getRecordCollection = function (ids) {
        var retn = [];
        for (var i = 0; i < ids.length; i++) {
            var record = this.sourceInterface.get(ids[i]);
            if (record)
                retn.push(record);
        }
        return retn;
    };
    Adapter.prototype.removeRecordCollection = function (collection) {
        var retn = [];
        if (Array.isArray(collection)) {
            var recordArray = collection;
            for (var i = 0; i < recordArray.length; i++) {
                var record = recordArray[i];
                var id = this.sourceInterface.id(record);
                retn.push(this.removeRecord(record, id));
            }
        }
        else if (collection && typeof collection === 'object') {
            var keys = Object.keys(collection);
            var IRecordStore = collection;
            for (i = 0; i < keys.length; i++) {
                var id = keys[i];
                retn.push(this.removeRecord(IRecordStore[id], id));
            }
        }
        return retn;
    };
    Adapter.prototype.updateRecordCollection = function (collection) {
        var id, record, retn = [];
        if (Array.isArray(collection)) {
            var recordArray = collection;
            for (var i = 0; i < recordArray.length; i++) {
                record = recordArray[i];
                retn.push(this.setRecord(this.getRecordId(record), record, this.sourceInterface.get(id)));
            }
        }
        else if (collection && typeof collection === 'object') {
            var keys = Object.keys(collection);
            var IRecordStore = collection;
            for (i = 0; i < keys.length; i++) {
                id = keys[i];
                retn.push(this.setRecord(id, IRecordStore[id], this.sourceInterface.get(id)));
            }
        }
        return retn;
    };
    Adapter.prototype.getRecordPage = function (pageSize, pageNumber, optionalArgs) {
        var startIndex = (pageNumber * pageSize) - pageSize;
        var endIndex = startIndex + pageSize;
        return this.sourceInterface.records().slice(startIndex, endIndex);
    };
    Adapter.prototype.getRecordCount = function () {
        return this.sourceInterface.records().length;
    };
    Adapter.prototype.getRecordId = function (record) {
        return record.id;
    };
    Adapter.prototype.recordsEqual = function (a, b) {
        return a === b;
    };
    //same as query but semantically better for some use cases
    Adapter.prototype.action = function (actionId) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var actionResults = [];
        var records = this.sourceInterface.records();
        for (var i = 0; i < records.length; i++) {
            records[i][actionId] && actionResults.push(records[i]);
        }
        return actionResults;
    };
    //the idea behind this method is that you store queries by name and when you ask for a query
    //its up to you to run some sort of switch to run that query. The default implementation
    //returns all records in the data source that have a property `query id`. Items returned
    //from `query` do not need to have type T and are NOT stored back into the data source
    //by default but you can add them manually with `this.sourceInterface.set(id, Record<T>)`
    Adapter.prototype.query = function (queryId) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var queryResults = [];
        var records = this.sourceInterface.records();
        for (var i = 0; i < records.length; i++) {
            records[i][queryId] && queryResults.push(records[i]);
        }
        return queryResults;
    };
    return Adapter;
})();
exports.Adapter = Adapter;
