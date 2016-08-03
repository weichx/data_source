## DataSource

This is a module for interfacing with data coming from any source in uniform way. A data source is a client side key-value store
that exposes promised based async methods for working with data. 

DataSource uses the Adapter pattern. By default the adapter uses the data sources in-memory key-value store as the source of truth and implements
all of its methods(detailed below) with sensible defaults. If you need a custom implementation for things like getting data from a
server via http or websockets or using localStorage, you would override the corresponding method in the adapter instance you provide to support reading / writing data to your custom location or dealing with custom queries or actions.

A simple example:

```typescript
 var userDataSource = new DataSource<User>(new UserAdapter());
 userDataSource.setRecord('recordId', new User()).then((user : User) => {
  user.someMethod();
  return user;
 }).then((user : User) => {
  //do stuff
 });
 
 userDataSource.getRecord('recordId').then((user : User) => {
  //do stuff
 });
 
 userDataSource.addRecord('recordId2', someUser);
 
```

### Data Source API

### Adapter Source Interface

Adapters don't have direct references to the data source they work with. Instead they use an instance a `DataSourceInterface`.
This interface provides a synchronous api into the data source.

#### DataSourceInterface

- `get(id : string) : T` get a record by id

- `add(record : T) : T` add a record

- `set(id : string, record : T) : T` update / change / remove (if record is null)

- `remove(id : string) : T` remoe a record

- `clear() : void` nuke the data source record store

- `id(record : T) : string` get an id for a given record 

- `records() : Array<T>` get all the local records in the data source in an array. This is internally cached is relatively performant 
so calling this many times is fine.

### DataSource Methods
- `on(eventName : string, callback : (record : T) => void) : void` DataSource is an event emitter that will emit the following events
    - `recordAdded` -- `(record : T, id : string) => void` -- when new records are added
    - `recordChanged` -- `(record : T, oldRecord : T, id : string) => void` when existing records change (via `setRecord`, not when properties change)  
    - `recordRemoved` -- `(record : T, id : string) => void` when records are removed
    
- `loadRecords() : Array<T>` -- Loads all records form the backing store

- `loadRecordsOnce() : Array<T>` If `loadRecords()` has not been called on the data source, it will call `loadRecords()` on the adapter and return the results
otherwise it will just return what is stored locally and will not execute the adapter's `loadRecords()` a second time. A use case for this method might be
to load a bunch of records from the server, but be sure to only ever do it once since loading things from a server is slow.

- `addRecord(record : T) : Promise<T>` Adds a record to the data source, returns a promise that resolves the record that was added

- `getRecord(id : string) : Promise<T>` Gets a record and returns a promise resolving that record or null if no record was found.

- `setRecord(id : string, record : T) : Promise<T>` writes an update into the data source. if no record exists for the given id, the record will be added. 
if a record is prexisting for that id, it will be updated with the new record value. if `record === null` that record will be removed.

- `updateRecord(record : T) : Promise<T>` the same as `setRecord` but computes the id of the record by calling `adapter.getRecordId(record)`

- `removeRecord(recordOrId : T|string) : Promise<T>` Takes a record to remove or an Id of a record to remove and removes it from the data source. 
Returns a promise that resolves the removed record or null if no record was removed.

- `addRecordCollection(records : Array<T>|IRecordStore<T>) : Promise<T[]>` Adds every record in the `records` argument to the data source. 

- `getRecordCollection(ids : Array<string>) : Promise<T[]>` Gets all records in the data source that have an id in the `ids` argument. 

- `removeRecordCollection(records : Array<T>|IRecordStore<T>) : Promise<T[]>` Removes all `records` from the data source 

- `updateRecordCollection(records : Array<T>|IRecordStore<T>) : Promise<T[]>` Updates each record in the `records` argument

- `getRecordPage(pageSize : number, pageNumber : number, optionalArgs : ...args) : Promise<T[]>` this is used for paging, you can supply anything you want in
the `optionalArgs` parameter and that will be passed on to the adapter

- `getRecordCount() : Promise<number>` returns the total number of records in the data source, this is used in conjuction with `getRecordPage` to accurately
show how many pages of records there might be on your server / whatever you are paging

- `query(...args : any[]) : Promise<any>` This is a way for you to define functionality outside of the normal data source methods, for instance 
finding all users with the name 'Matt' is not something any of the other data source methods know how to handle. It is up to you to define the
behavior of this function in your adapter.

- `action(...args : any[]) : Promise<any>` Identical to `query` but sometimes makes more semantic sense

- `clearLocalRecordStore() : void` Clears the entire local record set and emits `recordRemoved` events for each record

- `createManagedCollection(options? : ICollectionOptions) : Collection` creates and manages a collection.
Whenever a record is added / updated / removed from the data source that change will be automatically 
reflected in the collection that is returned. If an `options` parameter is supplied it will be passed through
to the collection.

- `manageCollection(collection : Collection) : Collection` equivalent to `createManagedCollection` but you supply
the collection to be managed instead of DataSource creating one for you

- `awaitRecord(id : string) : Promise<T>` Resolves when a record with `id` is added to the data source, or immediately if it is already there. This will not
issue a call to `getRecord` for you.

- `awaitRecords(ids : Array<string>) : Promise<T[]>` The same as `awaitRecord` but will resolve when all `ids` are present in the data source or immediately 
if they are all there already.

- `observeRecord(id : string, callback : (record : T) => void) : CancelFunction` this is a more performant way to listen for changes on a specific record.
This is far preferable to listening to `recordChanged` and checking if the id that changed is the id you are watching

- `observeRecords(ids : Array<string>, callback : (record : T) => void) : CancelFunction` Same as `observeRecord` but for many records at once. The callback
is invoked for each record change.

- `reset() : void` resets the data source, removing all records and observers and event listeners. Unlike `clearLocalRecordStore()` this will not emit `recordRemoved` events



### Adapter Methods To Override
- `initialize()` This function runs when the Adapter's `config` promise has resolved. 

- `loadRecords(localRecords : IRecordStore<T>)` By default returns all records stored locally in the DataSource.
The `localRecords` parameter is an object keyed by Id that contains all the records currently in the data source.

- `addRecord(id : string, localRecord : T) : T|Promise<T>` By default just adds the record to the data source

- `removeRecord(record : T, id : string) : T|Promise<T>` By default removed the record from the data source

- `getRecord(id : string, localRecord : T) : T|Promise<T>` Gets a record, by default returns `localRecord`

- `setRecord(id : string, newRecord : T, localRecord :T) : T|Promise<T>` updates a record, returns `newRecord` by default

- `addRecordCollection(records : Array<T>|IRecordStore<T>) : T[]|Promise<T[]>` calls `adapter.addRecord()` for each record in array

- `getRecordCollection(ids : Array<string>) : T[]|Promise<T[]>` calls `adapter.getRecord(id)` for each record in array

- `removeRecordCollection(collection : T[]|IRecordStore<T>) : T[]|Promise<T[]>` calls `adapter.removeRecord()` for each record in array

- `updateRecordCollection(collection : T[]|IRecordStore<T>) : T[]|Promise<T[]>` calls `adapter.setRecord()` from each record in array

- `getRecordPage(pageSize : number, pageNumber : number, optionalArgs : any) : T[]|Promise<T[]>` by default returns a subsection of the local data source records

- `getRecordCount() : number|Promise<number>`

- `getRecordId() : string`

- `recordsEqual(a : T, b : T) : boolean`

- `action(actionName : string, ...args : any[]) : any`

- `query(queryName : string, ...args : any[]) : any`

### Collection
 Collections are 'smart' arrays of things (doesnt have to be object types). They are sortable, filterable, pageable and groupable.
 
### Interfaces

`IRecordStore<T>` {[id : string, record :T }


Note that because of the adapter pattern use METHODS DEFINED ON THE DATA SOURCE ARE NOT THE SAME AS THE METHODS DEFINED IN THE ADAPTER.
Adapter methods often have different signatures than the correspondingly named method on the DataSource itself. For example,
when calling `dataSource.loadRecords()` no parameters are expected, but when the data source invokes the adapter's version
of `loadRecords`, it also passes along a copy of the local store. 

Defining a method on the adapter DOES NOT expose it to the data source.
