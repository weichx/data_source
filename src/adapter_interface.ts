import { DataSource } from './data_source';
import { IRecordStore, IAdapter } from './interfaces';

//Adapter interface into the DataSource, this exposes a synchronous interface
//that doesn't call into the adapter for updates but will respect events as needed.
export class AdapterInterface<T> {

    private _source : DataSource<T>;
    private _adapter : IAdapter<T>;
    private _recordStore : IRecordStore<T>;

    constructor(source : DataSource<T>, adapter : IAdapter<T>, recordStore : IRecordStore<T>) {
        this._source = source;
        this._adapter = adapter;
        this._recordStore = recordStore;
    }

    public get(id : string) : T {
        return this._recordStore[id];
    }

    public add(record : T) : T {
        var id = this.id(record);
        return this.set(id, record);
    }

    public set(id : string, newRecord : T) : T {
        var localRecord = this._recordStore[id];

        if (!newRecord) {
            this._source._internalRemoveRecord(localRecord, id);
        } else if (!localRecord) {
            this._source._internalAddRecord(newRecord, id);
        } else {
            this._source._internalChangeRecord(newRecord, localRecord, id);
        }
        return newRecord;
    }

    public remove(id : string) : T {
        if(this._recordStore[id]) {
            var record = this._recordStore[id];
            this._source._internalRemoveRecord(record, id);
            return record;
        }
        return null;
    }

    public clear() : void {
        var keys = Object.keys(this._recordStore);
        for(var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var record = this._recordStore[id];
            this._source._internalRemoveRecord(record, id);
        }
    }

    public id(record : T) : string {
        var adapterId = this._adapter.getRecordId(record);
        if (adapterId) return adapterId;
        var id : string = null;
        var keys = Object.keys(this._recordStore);
        for (var i = 0; i < keys.length; i++) {
            id = keys[i];
            if (this._recordStore[id] === record) {
                break;
            }
        }
        return id;
    }

    public records() : T[] {
        return this._source._internalGetRecordList();
    }
}