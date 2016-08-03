import { IAdapter, IRecordStore } from './interfaces';
import { AdapterInterface } from './adapter_interface';
export declare class Adapter<T> implements IAdapter<T> {
    config: any;
    sourceInterface: AdapterInterface<T>;
    initialize(): void;
    loadRecords(localRecords?: IRecordStore<T>): IRecordStore<T> | Array<T>;
    addRecord(record: T): T;
    removeRecord(record: T, id: string): T;
    getRecord(id: string, currentRecord: T): T;
    setRecord(id: string, newRecord: T, oldRecord: T): T;
    addRecordCollection(collection: T[] | IRecordStore<T>): T[];
    getRecordCollection(ids: Array<string>): T[];
    removeRecordCollection(collection: T[] | IRecordStore<T>): T[];
    updateRecordCollection(collection: T[] | IRecordStore<T>): T[];
    getRecordPage(pageSize: number, pageNumber: number, optionalArgs: any): T[];
    getRecordCount(): number;
    getRecordId(record: T): string;
    recordsEqual(a: T, b: T): boolean;
    action(actionId: string, ...args: any[]): any;
    query(queryId: string, ...args: any[]): any;
}
