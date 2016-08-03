var DataSource = require('../dist/data_source').DataSource;
DataSource.SetPromiseImplementation(Promise);
var DataSourceAdapter = require('../dist/adapter').Adapter;
var Helpers = require('./helper');

var RecordType = Helpers.DataSourceRecordType;

describe('Data Source', function () {

    it('should create a default adapter if one is not provided', function () {
        var d = new DataSource();
        expect(d._adapter).toBeDefined();
        expect(d._adapter instanceof DataSourceAdapter).toBe(true);
    });

    it('should not throw when passed an adapter', function () {
        expect(function () {
            new DataSource(new DataSourceAdapter());
        }).not.toThrow();
    });

    describe('addRecord()', function () {
        var d = null;
        beforeEach(function () {
            d = new DataSource();
        });

        it('should allow calls to addRecord with a record', function () {
            expect(function () {
                d.addRecord(new RecordType());
            }).not.toThrow();
        });

        it('should add a record to the store', function (done) {
            d.addRecord(new RecordType()).then(function () {
                expect(Object.keys(d._records).length).toBe(1);
                done();
            }).catch(function (e) {
                console.log(e);
            });
        });

        it('should throw if it gets a call to addRecord without a record', function () {
            expect(function () {
                d.addRecord();
            }).toThrowWithMessage(DataSource.AddNullRecord);
        });

        it('should emit a recordAdded event when adding a record', function (done) {
            var rec = new RecordType();
            d.on('recordAdded', function (record) {
                expect(record).toBe(rec);
                done();
            });
            d.addRecord(rec);
        });

        it('should return a promise when recordAdded is called', function (done) {
            var rec = new RecordType();
            d.addRecord(rec).then(function (record) {
                expect(record).toBe(rec);
                done();
            });
        });

        it('can add many records', function (done) {
            expect(function () {
                var promises = [];
                for (var i = 0; i < 100; i++) {
                    promises.push(d.addRecord(new RecordType()));
                }
                Promise.all(promises).then(function () {
                    expect(Object.keys(d._records).length).toBe(100);
                    done();
                });
            }).not.toThrow();
        });

    });

    describe('setRecord()', function () {
        var d = null;

        beforeEach(function () {
            d = new DataSource();
        });

        it('should allow calls to set record with an id and record instance', function () {
            var record = new RecordType();
            expect(function () {
                d.setRecord('someId', record);
            }).not.toThrow();
        });

        it('should not allow calls to setRecord without an id', function () {
            var record = new RecordType();
            expect(function () {
                d.setRecord(record);
            }).toThrowWithMessage(DataSource.SetRecordIdRequired);
        });

        it('should not allow calls to set record without a record instance', function () {
            expect(function () {
                d.setRecord('id');
            }).toThrowWithMessage(DataSource.SetRecordRecordRequired);
        });

        it('should replace the existing record if one exists when calling setRecord', function (done) {
            var original = new RecordType();
            var replace = new RecordType();
            d.setRecord('someId', original).then(function () {
                expect(d._records.someId).toBe(original);
                expect(function () {
                    d.setRecord('someId', replace).then(function () {
                        expect(d._records.someId).toBe(replace);
                        done();
                    });
                }).not.toThrow();
            });
        });

        it('should emit recordChanged if record exists when calling setRecord', function (done) {
            var original = new RecordType();
            var replace = new RecordType();
            d.setRecord('id', original).then(function () {
                d.on('recordChanged', function (record) {
                    expect(record).toBe(replace);
                    done();
                });
                expect(function () {
                    d.setRecord('id', replace);
                }).not.toThrow();
            });

        });

        it('should return a promise when setRecord() is called and replacement happened', function (done) {
            var original = new RecordType();
            var replace = new RecordType();
            d.addRecord(original, 'anId');
            d.setRecord('anId', replace).then(function (record) {
                expect(record).toBe(replace);
                done();
            });
        });

        it('should return a promise when setRecord() is called and no replacement happened', function (done) {
            var original = new RecordType();
            d.setRecord('someId', original).then(function (record) {
                expect(record).toBe(original);
                done();
            });
        });

        it('should add a new record if one does not exists when calling setRecord', function (done) {
            var original = new RecordType();
            expect(function () {
                d.setRecord('someId', original).then(function (record) {
                    expect(record).toBe(original);
                    expect(d._records.someId).toBe(original);
                    done();
                });
            }).not.toThrow();
        });

        it('should emit recordAdded when adding from setRecord', function (done) {
            var original = new RecordType();
            d.on('recordAdded', function (record) {
                expect(record).toBe(original);
                done();
            });
            //make sure no change event is fired
            d.on('recordChanged', function () {
                expect(false).toEqual(true);
            });
            expect(function () {
                d.setRecord('someId', original);
            }).not.toThrow();
        });

        it('should remove a record when set is called with null', function (done) {
            var rec = new RecordType();
            d.on('recordRemoved', function (record) {
                expect(record).toBe(rec);
                done();
            });
            d.addRecord(rec).then(function () {
                d.removeRecord(rec);
            });
        });

    });

    describe('getRecord()', function () {
        var d = null;
        beforeEach(function () {
            d = new DataSource();
        });

        it('should resolve a record if record could be found', function (done) {
            var record = new RecordType();
            d.setRecord('id', record).then(function () {
                return d.getRecord('id');
            }).then(function (gotRecord) {
                expect(gotRecord).toBe(record);
                done();
            });
        });

        it('should resolve with null if a record could not be found', function (done) {
            d.getRecord('id').then(function (record) {
                expect(record).toBeNull();
                done();
            });
        });
    });

    describe('removeRecord', function () {
        var d = null;
        beforeEach(function () {
            d = new DataSource();
        });

        it('should be able to remove a record', function (done) {
            expect(function () {
                var record = new RecordType();
                d.addRecord(record).then(function (rec) {
                    d.removeRecord(rec);
                    done();
                });
            }).not.toThrow();
        });

        it('should require a record argument', function () {
            expect(function () {
                d.removeRecord();
            }).toThrowWithMessage(DataSource.RemoveRecordRecordRequired);
        });

        it('should emit recordRemoved when a record is removed', function (done) {
            var record = new RecordType();
            d = new DataSource();
            d.addRecord(record).then(function () {
                d.removeRecord(record);
            });
            d.on('recordRemoved', function (removedRecord) {
                expect(record).toBe(removedRecord);
                done();
            });
        });

        it('should not throw if a record to be removed is not in the data source', function (done) {
            expect(function () {
                d.removeRecord(new RecordType()).then(done);
            }).not.toThrow();
        });
    });

    //describe('Await', function () {
    //    var d;
    //    beforeEach(function () {
    //        d = new DataSource();
    //    });
    //
    //    it('should not resolve if no record is set', function (done) {
    //        var resolved = false;
    //        d.awaitRecord('id').then(function () {
    //            resolved = true;
    //        });
    //        setTimeout(function () {
    //            expect(resolved).toBe(false);
    //            done();
    //        }, 50);
    //    });
    //
    //    it('should resolve when record is set already', function (done) {
    //        var rec = new RecordType();
    //        d.setRecord('id', rec).then(function () {
    //            return d.awaitRecord('id');
    //        }).then(function (record) {
    //            expect(record).toBe(rec);
    //            done();
    //        });
    //    });
    //
    //    it('should resolve when a record is set after await is called', function (done) {
    //        var rec = new RecordType();
    //        var resolved = false;
    //        d.awaitRecord('id').then(function (record) {
    //            resolved = true;
    //            expect(record).toBe(rec);
    //        });
    //        setTimeout(function () {
    //            expect(resolved).toBe(true);
    //            done();
    //        }, 50);
    //        d.setRecord('id', rec);
    //    });
    //});

    describe('UpdateRecord', function () {
        it('will update a pre existing record', function (done) {
            var d = new DataSource();
            var x = new RecordType(0);
            d._records['0'] = x;
            var spy = {
                recordChanged: function () {
                }
            };
            spyOn(spy, 'recordChanged');
            d.on('recordChanged', spy.recordChanged);
            d.updateRecord(x).then(function (record) {
                expect(record).toBe(x);
                expect(spy.recordChanged.calls.count()).toBe(1);
                done();
            });
        });

        //removed need for update record to have a record in store already
        //it('will throw an exception if the record does not exist', function () {
        //    var d = new DataSource();
        //    expect(function () {
        //        d.updateRecord({})
        //    }).toThrowWithMessage(DataSource.UpdateRecordNotInStore);
        //
        //});
        //
        //it('requires a record argument', function () {
        //    var d = new DataSource();
        //    expect(function () {
        //        d.updateRecord();
        //    }).toThrowWithMessage(DataSource.UpdateRecordRequired);
        //});
    });

    describe('LoadRecords', function () {
        it('will add records returned from the adapter', function (done) {
            var d = new DataSource(function () {
                this.loadRecords = function () {
                    return [
                        new RecordType(),
                        new RecordType()
                    ];
                };
            });
            d.loadRecords().then(function () {
                expect(Object.keys(d._records).length).toBe(2);
                done();
            }).catch(function (e) {
                console.log('error', e.stack);
            });
        });

        it('will add records returned in an object from the adapter', function (done) {
            var d = new DataSource(function () {
                this.loadRecords = function () {
                    return {
                        1: new RecordType(),
                        2: new RecordType()
                    };
                }
            });
            d.loadRecords().then(function () {
                expect(Object.keys(d._records).length).toBe(2);
                done();
            });
        });

        it('will emit record added events', function (done) {
            var d = new DataSource(function () {
                this.loadRecords = function () {
                    return {
                        1: new RecordType(),
                        2: new RecordType()
                    };
                }
            });
            var spy = {
                fn: function () {
                }
            };
            spyOn(spy, 'fn');
            d.on('recordAdded', spy.fn);
            d.loadRecords().then(function () {
                expect(spy.fn.calls.count()).toBe(2);
                done();
            });
        });

        it('will emit record changed events', function (done) {
            var d = new DataSource(function () {
                this.loadRecords = function () {
                    return {
                        0: new RecordType(),
                        1: new RecordType(),
                        2: new RecordType()
                    };
                };
            });
            d._records[0] = new RecordType();
            d._records[1] = new RecordType();
            var spy = {
                recordAdded: function () {
                },
                recordChanged: function () {
                }
            };
            spyOn(spy, 'recordAdded');
            spyOn(spy, 'recordChanged');
            d.on('recordAdded', spy.recordAdded);
            d.on('recordChanged', spy.recordChanged);
            d.loadRecords().then(function () {
                expect(spy.recordAdded.calls.count()).toBe(1);
                expect(spy.recordChanged.calls.count()).toBe(2);
                done();
            });
        });
    });

    describe('AddRecordCollection', function () {

        it('will accept an array and add them, emitting add and change events', function (done) {
            var x = new RecordType(1);
            var y = new RecordType(2);
            var z = new RecordType(3);
            var d = new DataSource(function () {
                this.getRecordId = function (record) {
                    return record.id;
                };
            });
            var spy = {
                recordAdded: function () {
                },
                recordChanged: function () {
                }
            };
            spyOn(spy, 'recordAdded');
            spyOn(spy, 'recordChanged');
            d.on('recordAdded', spy.recordAdded);
            d.on('recordChanged', spy.recordChanged);
            d._records[x.id] = x;
            d.addRecordCollection([
                new RecordType(x.id), y, z
            ]).then(function (records) {
                expect(records.length).toBe(3);
                expect(spy.recordAdded.calls.count()).toBe(2);
                expect(spy.recordChanged.calls.count()).toBe(1);
                done();
            });
        });

        //Note -- it makes more sense for external facing addRecordCollection to only accept an array or a ManagedCollection
        //because we would lose the ids passed in as keys if an object is given using the current addRecordCollection adapter
        //implementation. Did not want to complicate adapter code to handle both array and object input.

        //thus the following tests are commented out. If I change my mind these tests should be re-enabled.
        //it('will accept an object and add them, emitting add and change events', function (done) {
        //    var x = new RecordType();
        //    var y = new RecordType();
        //    var z = new RecordType();
        //    var d = new DataSource();
        //    var spy = {
        //        recordAdded: function () {},
        //        recordChanged: function () {}
        //    };
        //    spyOn(spy, 'recordAdded');
        //    spyOn(spy, 'recordChanged');
        //    d.on('recordAdded', spy.recordAdded);
        //    d.on('recordChanged', spy.recordChanged);
        //    d._records['x'] = x;
        //    d.addRecordCollection({
        //        x: new RecordType(),
        //        y: y,
        //        z: z
        //    }).then(function (records) {
        //        expect(records.length).toBe(3);
        //        expect(spy.recordAdded.calls.count()).toBe(2);
        //        expect(spy.recordChanged.calls.count()).toBe(1);
        //        done();
        //    });
        //});
        //
        //    it('will not emit recordChanged events if the adapter.recordsEqual() returns true', function (done) {
        //        var x = new RecordType();
        //        var y = new RecordType();
        //        var z = new RecordType();
        //        var d = new DataSource(function () {
        //            this.recordsEqual = function (recordA, recordB) {
        //                return recordA.property === recordB.property;
        //            };
        //        });
        //        var spy = {
        //            recordAdded: function () {},
        //            recordChanged: function () {}
        //        };
        //        spyOn(spy, 'recordAdded');
        //        spyOn(spy, 'recordChanged');
        //        d.on('recordAdded', spy.recordAdded);
        //        d.on('recordChanged', spy.recordChanged);
        //        d._records['x'] = x;
        //        var newX = new RecordType();
        //        newX.property = x.property;
        //        d.addRecordCollection({
        //            x: newX,
        //            y: y,
        //            z: z
        //        }).then(function (records) {
        //            expect(records.length).toBe(3);
        //            expect(spy.recordAdded.calls.count()).toBe(2);
        //            expect(spy.recordChanged.calls.count()).toBe(0);
        //            done();
        //        });
        //    });
    });

    describe('RemoveRecordCollection', function () {
        it('will remove records from the data source', function (done) {
            var d = new DataSource();
            var a = new RecordType(0);
            var b = new RecordType(1);
            d._records['0'] = a;
            d._records['1'] = b;
            var array = [a, b];
            d.removeRecordCollection(array).then(function () {
                expect(Object.keys(d._records).length).toBe(0);
                done();
            });
        });

        it('will emit remove events', function (done) {
            var d = new DataSource();
            var a = new RecordType(0);
            var b = new RecordType(1);
            var spy = {
                recordRemoved: function () {
                }
            };
            spyOn(spy, 'recordRemoved');
            d.on('recordRemoved', spy.recordRemoved);
            d._records['0'] = a;
            d._records['1'] = b;
            var array = [a, b];
            d.removeRecordCollection(array).then(function () {
                expect(spy.recordRemoved.calls.count()).toBe(2);
                done();
            });
        })
    });

    describe('UpdateRecordCollection', function () {
        it('will emit changed and added events on updating a collection', function (done) {
            var dataSource = new DataSource(function () {
                this.updateRecordCollection = function () {
                    return {
                        1: new RecordType(1),
                        2: new RecordType(2)
                    };
                };
            });
            var spy = {
                recordAdded: function () {
                },
                recordChanged: function () {
                }
            };

            spyOn(spy, 'recordAdded');
            spyOn(spy, 'recordChanged');
            dataSource._records[1] = new RecordType(1);

            dataSource.on('recordAdded', spy.recordAdded);
            dataSource.on('recordChanged', spy.recordChanged);
            dataSource.updateRecordCollection().then(function (records) {
                expect(spy.recordAdded.calls.count()).toBe(1);
                expect(spy.recordChanged.calls.count()).toBe(1);
                expect(records.length).toBe(2);
                done();
            });
        });
    });

    describe('GetRecordPage', function () {
        var collection, dataSource;
        beforeEach(function () {

            dataSource = new DataSource(function () {
                this.getRecordId = function (record) {
                    return record.id;
                };
            });
            collection = [];
            for (var i = 0; i < 100; i++) {
                var rec = new RecordType();
                rec.id = i;
                collection.push(rec);
            }
            collection = Helpers.shuffle(collection);
        });

        it('will return a subset of records based on page size', function (done) {
            dataSource.addRecordCollection(collection).then(function () {
                return dataSource.getRecordPage(10, 1);
            }).then(function (pageArray) {
                expect(pageArray.length).toBe(10);
                done();
            });
        });

        it('will add new records if they are returned from the adapter', function (done) {
            var dataSource = new DataSource(function () {
                this.getRecordPage = function (pageNumber, pageSize) {
                    return [new RecordType()]
                };
            });
            var spy = {
                recordAdded: function () {
                },
                recordChanged: function () {
                }
            };
            spyOn(spy, 'recordAdded');
            spyOn(spy, 'recordChanged');
            dataSource.on('recordAdded', spy.recordAdded);
            dataSource.on('recordChanged', spy.recordChanged);
            dataSource.getRecordPage(10, 9).then(function () {
                expect(spy.recordAdded.calls.count()).toBe(1);
                done();
            });
        });
    });

    describe('GetRecordCount', function () {
        it('will return the number of records as defined by the adapter', function (done) {
            var dataSource = new DataSource();
            var collection = [];
            for (var i = 0; i < 10; i++) {
                collection.push(new RecordType());
            }
            dataSource.addRecordCollection(collection).then(function () {
                return dataSource.getRecordCount();
            }).then(function (count) {
                expect(count).toBe(10);
                done();
            });

        });
    });

    it('should allow queries and not add query results to the record store', function (done) {

        var a = new RecordType(1);
        var b = new RecordType(2);

        var dataSource = new DataSource(function () {
            this.query = function () {
                return [a, b];
            };
        });

        dataSource._records['3'] = new RecordType(3);

        dataSource.query('someQuery').then(function (results) {
            expect(results[0]).toBe(a);
            expect(results[1]).toBe(b);
            expect(Object.keys(dataSource._records).length).toBe(1);
            done();
        });

    });

    it('should invoke query with the right args', function (done) {
        var dataSource = new DataSource(function () {
            this.query = function () {
            };
        });

        spyOn(dataSource._adapter, 'query');
        dataSource.query('stuff', 1, 2, 3).then(function () {
            expect(dataSource._adapter.query).toHaveBeenCalledWith('stuff', 1, 2, 3);
            done();
        })
    });

    it('should invoke action with the right args', function (done) {
        var dataSource = new DataSource(function () {
            this.action = function () {
            };
        });

        spyOn(dataSource._adapter, 'action');
        dataSource.action('stuff', 1, 2, 3).then(function () {
            expect(dataSource._adapter.action).toHaveBeenCalledWith('stuff', 1, 2, 3);
            done();
        })
    });

    it('should invoke query by prefixed adapter method name', function (done) {
        var ds = new DataSource(function () {
            this.Query_SomeMethod = function () {
            }
        });

        spyOn(ds._adapter, 'Query_SomeMethod');
        spyOn(ds._adapter, 'query');
        ds.query('SomeMethod', 'arg1', 'arg2').then(function () {
            expect(ds._adapter.Query_SomeMethod).toHaveBeenCalledWith('arg1', 'arg2');
            expect(ds._adapter.query).not.toHaveBeenCalled();
            done();
        });
    });

    it('should invoke action by prefixed adapter method name', function (done) {
        var ds = new DataSource(function () {
            this.Action_SomeMethod = function () {
            }
        });

        spyOn(ds._adapter, 'Action_SomeMethod');
        spyOn(ds._adapter, 'action');
        ds.action('SomeMethod', 'arg1', 'arg2').then(function () {
            expect(ds._adapter.Action_SomeMethod).toHaveBeenCalledWith('arg1', 'arg2');
            expect(ds._adapter.action).not.toHaveBeenCalled();
            done();
        });
    });

    it('will make adapter config available before running any adapter functions', function (done) {
        var config = {x: 1, y: 2};
        var adapter = new DataSourceAdapter();
        adapter.addRecord = function (record) {
            expect(this.config).toBe(config);
            return record;
        };

        var d = new DataSource(adapter, new Promise(function (resolve) {
            resolve(config);
        }));

        spyOn(adapter, 'addRecord').and.callThrough();
        d.addRecord(new RecordType()).then(function () {
            expect(adapter.addRecord.calls.count()).toBe(1);
            done();
        });
    });

    describe('observeRecord', function () {

        it('should observe when adding', function (done) {
            var ds = new DataSource();
            var record = new RecordType();
            ds.observeRecord('1', function (observed) {
                expect(observed).toBe(record);
                done();
            });
            ds.setRecord('1', record);
        });

        it('should observe when changing', function (done) {
            var ds = new DataSource();
            var record = new RecordType();
            ds._records['1'] = record;
            ds.observeRecord('1', function (observed) {
                expect(observed).toBe(record);
                done();
            });
            ds.setRecord('1', record);
        });

        it('should observe when removing', function (done) {
            var ds = new DataSource();
            ds._records['1'] = new RecordType('1');
            ds.observeRecord('1', function (observed) {
                expect(observed).toBe(null);
                done();
            });
            ds.removeRecord(ds._records['1']);
        });

        it('should stop observing when cancel is invoked', function (done) {
            var ds = new DataSource();
            var record = new RecordType();
            ds._records['1'] = record;
            var obj = {
                fn: function (observed) {
                    expect(observed).toBe(record);
                }
            };
            spyOn(obj, 'fn');
            var cancel = ds.observeRecord('1', obj.fn);
            ds.setRecord('1', record).then(function () {
                cancel();
                return ds.setRecord('1', record);
            }).then(function () {
                expect(obj.fn.calls.count()).toBe(1);
                done();
            });
        });

    });

    describe('awaitRecords', function () {
        it('should resolve when record is added', function (done) {
            var ds = new DataSource();
            var record = new RecordType('1');
            ds.awaitRecord('1').then(function(awaited) {
                expect(awaited).toBe(record);
                done();
            });
            ds.addRecord(record);
        });

        it('should resolve if record is already added', function (done) {
            var ds = new DataSource();
            var record = new RecordType('1');
            ds.addRecord(record);
            ds.awaitRecord('1').then(function(awaited) {
                expect(awaited).toBe(record);
                done();
            });
        });

        it('should not resolve until all records are present', function(done) {
            var ds = new DataSource();
            var record1 = new RecordType('1');
            var record2 = new RecordType('2');
            var record3 = new RecordType('3');
            var called = false;
            ds.awaitRecords(['1', '2', '3']).then(function(awaited) {
                expect(called).toBe(false);
                called = true;
                expect(awaited.length).toBe(3);
                expect(awaited[0]).toBe(record1);
                expect(awaited[1]).toBe(record2);
                expect(awaited[2]).toBe(record3);
                done();
            });
            ds.addRecord(record1).then(function() {
                expect(called).toBe(false);
                return ds.addRecord(record2);
            }).then(function(){
                expect(called).toBe(false);
                return ds.addRecord(record2);
            }).then(function() {
                expect(called).toBe(false);
                return ds.addRecord(record3);
            });
        })
    });

    describe('Before Resolve Callback', function() {

        it('should set a resolve callback', function(done) {
            var obj = {
                fn: function () {
                }
            };
            var original = DataSource.prototype.getRecord;
            spyOn(obj, 'fn');
            DataSource.SetBeforeResolveCallback(obj.fn);
            new DataSource().getRecord(null).then(function () {
                expect(obj.fn.calls.count()).toBe(1);
                DataSource.ResetBeforeResolve();
                expect(DataSource.prototype.getRecord).toBe(original);
                done();
            });
        });

        it('should call the callback on catch', function() {
            var obj = {
                fn: function () {
                }
            };
            var adapter = function() {
                this.getRecord = function() {
                    throw new Error("FAIL");
                };
            };
            var original = DataSource.prototype.getRecord;
            spyOn(obj, 'fn');
            DataSource.SetBeforeResolveCallback(obj.fn);
            new DataSource(adapter).getRecord(null).catch(function (error) {
                expect(obj.fn.calls.count()).toBe(1);
                DataSource.ResetBeforeResolve();
                expect(DataSource.prototype.getRecord).toBe(original);
                done();
            });
        });
    });

});