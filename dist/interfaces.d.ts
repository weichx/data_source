/// <reference path="../src/typing/promise.d.ts" />
import { AdapterInterface } from './adapter_interface';
export interface IRecordStore<T> {
    [index: string]: T;
}
export interface IAdapter<T> {
    config?: any;
    sourceInterface: AdapterInterface<T>;
    initialize(): void;
    loadRecords(localRecords?: IRecordStore<T>): T[] | IRecordStore<T> | Promise<T[]> | Promise<IRecordStore<T>>;
    addRecord(record: T): T | Promise<T>;
    removeRecord(record: T, id: string): T | Promise<T>;
    getRecord(id: string, currentRecord: T): T | Promise<T>;
    setRecord(id: string, newRecord: T, oldRecord: T): T | Promise<T>;
    getRecordId(record: T): string;
    recordsEqual(record1: T, record2: T): boolean;
    addRecordCollection(collection: T[] | IRecordStore<T>): T[] | IRecordStore<T> | Promise<T[]> | Promise<IRecordStore<T>>;
    getRecordCollection(ids: Array<string>): T[] | IRecordStore<T> | Promise<T[]> | Promise<IRecordStore<T>>;
    removeRecordCollection(collection: T[] | IRecordStore<T>): T[] | IRecordStore<T> | Promise<T[]> | Promise<IRecordStore<T>>;
    updateRecordCollection(collection: T[] | IRecordStore<T>): T[] | IRecordStore<T> | Promise<T[]> | Promise<IRecordStore<T>>;
    getRecordPage(pageSize: number, pageNumber: number, optionalArgs?: any): T[] | IRecordStore<T> | Promise<T[]> | Promise<IRecordStore<T>>;
    getRecordCount(): number | Promise<number>;
    query(queryId: string, ...args: any[]): any;
    action(actionid: string, ...args: any[]): any;
}
