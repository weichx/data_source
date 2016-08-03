import { DataSource } from './data_source';
import { IRecordStore, IAdapter } from './interfaces';
export declare class AdapterInterface<T> {
    private _source;
    private _adapter;
    private _recordStore;
    constructor(source: DataSource<T>, adapter: IAdapter<T>, recordStore: IRecordStore<T>);
    get(id: string): T;
    add(record: T): T;
    set(id: string, newRecord: T): T;
    remove(id: string): T;
    clear(): void;
    id(record: T): string;
    records(): T[];
}
