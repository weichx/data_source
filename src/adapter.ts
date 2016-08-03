import { IAdapter, IRecordStore } from './interfaces';
import { AdapterInterface } from './adapter_interface';

export class Adapter<T> implements IAdapter<T> {

    public config : any;
    public sourceInterface : AdapterInterface<T>;

    //called after constructor, at this point sourceInterface is available
    public initialize() : void {

    }

    public loadRecords(localRecords? : IRecordStore<T>) : IRecordStore<T>|Array<T> {
        return localRecords || {};
    }

    public addRecord(record : T) : T {
        return record;
    }

    public removeRecord(record : T, id : string) : T {
        return record;
    }

    public getRecord(id : string, currentRecord : T) : T {
        return currentRecord;
    }

    public setRecord(id : string, newRecord : T, oldRecord : T) : T {
        return newRecord;
    }

    public addRecordCollection(collection : T[]|IRecordStore<T>) : T[] {
        var retn : Array<T> = [];
        if (Array.isArray(collection)) {
            var recordArray = <T[]>collection;
            for (var i = 0; i < recordArray.length; i++) {
                retn.push(this.addRecord(recordArray[i]));
            }
        } else if (collection && typeof collection === 'object') {
            var keys = Object.keys(collection);
            var IRecordStore  = <IRecordStore<T>>collection;
            for (i = 0; i < keys.length; i++) {
                retn.push(this.addRecord(IRecordStore[keys[i]]));
            }
        }
        return retn;
    }

    public getRecordCollection(ids : Array<string>) : T[] {
        var retn : Array<T> = [];
        for(var i = 0; i < ids.length; i++) {
            var record = this.sourceInterface.get(ids[i]);
            if(record) retn.push(record);
        }
        return retn;
    }

    public removeRecordCollection(collection : T[]|IRecordStore<T>) : T[] {
        var retn : Array<T> = [];
        if (Array.isArray(collection)) {
            var recordArray = <T[]>collection;
            for (var i = 0; i < recordArray.length; i++) {
                var record = recordArray[i];
                var id = this.sourceInterface.id(record);
                retn.push(this.removeRecord(record, id));
            }
        } else if (collection && typeof collection === 'object') {
            var keys = Object.keys(collection);
            var IRecordStore  = <IRecordStore<T>>collection;

            for (i = 0; i < keys.length; i++) {
                var id = keys[i];
                retn.push(this.removeRecord(IRecordStore[id], id));
            }
        }
        return retn;
    }

    public updateRecordCollection(collection : T[]|IRecordStore<T>) : T[] {
        var id : string, record : T, retn : Array<T> = [];
        if (Array.isArray(collection)) {
            var recordArray = <T[]>collection;
            for (var i = 0; i < recordArray.length; i++) {
                record = recordArray[i];
                retn.push(this.setRecord(this.getRecordId(record), record, this.sourceInterface.get(id)));
            }
        } else if (collection && typeof collection === 'object') {
            var keys = Object.keys(collection);
            var IRecordStore = <IRecordStore<T>>collection;
            for (i = 0; i < keys.length; i++) {
                id = keys[i];
                retn.push(this.setRecord(id, IRecordStore[id], this.sourceInterface.get(id)));
            }
        }
        return retn;
    }

    public getRecordPage(pageSize : number, pageNumber : number, optionalArgs : any) : T[] {
        var startIndex = (pageNumber * pageSize) - pageSize;
        var endIndex = startIndex + pageSize;
        return this.sourceInterface.records().slice(startIndex, endIndex);
    }

    public getRecordCount() : number {
        return this.sourceInterface.records().length;
    }

    public getRecordId(record : T) : string {
        return (<any>record).id;
    }

    public recordsEqual(a : T, b : T) : boolean {
        return a === b;
    }

    //same as query but semantically better for some use cases
    public action(actionId : string, ...args : any[]) : any {
        var actionResults : any[] = [];
        var records = this.sourceInterface.records();
        for(var i = 0; i < records.length; i++) {
            (<any>records[i])[actionId] && actionResults.push(records[i]);
        }
        return actionResults;
    }

    //the idea behind this method is that you store queries by name and when you ask for a query
    //its up to you to run some sort of switch to run that query. The default implementation
    //returns all records in the data source that have a property `query id`. Items returned
    //from `query` do not need to have type T and are NOT stored back into the data source
    //by default but you can add them manually with `this.sourceInterface.set(id, Record<T>)`
    public query(queryId : string, ... args : any[]) : any {
        var queryResults : any[] = [];
        var records = this.sourceInterface.records();
        for(var i = 0; i < records.length; i++) {
            (<any>records[i])[queryId] && queryResults.push(records[i]);
        }
        return queryResults;
    }
}