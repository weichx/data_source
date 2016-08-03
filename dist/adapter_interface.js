//Adapter interface into the DataSource, this exposes a synchronous interface
//that doesn't call into the adapter for updates but will respect events as needed.
var AdapterInterface = (function () {
    function AdapterInterface(source, adapter, recordStore) {
        this._source = source;
        this._adapter = adapter;
        this._recordStore = recordStore;
    }
    AdapterInterface.prototype.get = function (id) {
        return this._recordStore[id];
    };
    AdapterInterface.prototype.add = function (record) {
        var id = this.id(record);
        return this.set(id, record);
    };
    AdapterInterface.prototype.set = function (id, newRecord) {
        var localRecord = this._recordStore[id];
        if (!newRecord) {
            this._source._internalRemoveRecord(localRecord, id);
        }
        else if (!localRecord) {
            this._source._internalAddRecord(newRecord, id);
        }
        else {
            this._source._internalChangeRecord(newRecord, localRecord, id);
        }
        return newRecord;
    };
    AdapterInterface.prototype.remove = function (id) {
        if (this._recordStore[id]) {
            var record = this._recordStore[id];
            this._source._internalRemoveRecord(record, id);
            return record;
        }
        return null;
    };
    AdapterInterface.prototype.clear = function () {
        var keys = Object.keys(this._recordStore);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var record = this._recordStore[id];
            this._source._internalRemoveRecord(record, id);
        }
    };
    AdapterInterface.prototype.id = function (record) {
        var adapterId = this._adapter.getRecordId(record);
        if (adapterId)
            return adapterId;
        var id = null;
        var keys = Object.keys(this._recordStore);
        for (var i = 0; i < keys.length; i++) {
            id = keys[i];
            if (this._recordStore[id] === record) {
                break;
            }
        }
        return id;
    };
    AdapterInterface.prototype.records = function () {
        return this._source._internalGetRecordList();
    };
    return AdapterInterface;
})();
exports.AdapterInterface = AdapterInterface;
