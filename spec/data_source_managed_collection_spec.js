var DataSource = require('../dist/data_source').DataSource;
DataSource.SetPromiseImplementation(Promise);
var Helpers = require('./helper');
var RecordType = Helpers.DataSourceRecordType;
var Collection = require('../dist/data_source').Collection;

var propertySort = function (a, b) {
    if (a.property > b.property) return 1;
    if (a.property < b.property) return -1;
    return 0;
};

describe('ManagedCollection', function () {
    it('should be created from a data source', function () {
        expect(function () {
            new DataSource().createManagedCollection();
        }).not.toThrow();
    });

    it('should expose records from the dataSource', function () {
        var dataSource = new DataSource();
        var a = new RecordType();
        var b = new RecordType();
        dataSource._records = {
            1: a,
            2: b
        };
        var collection = dataSource.createManagedCollection({synchronous: true});
        expect(collection.items.indexOf(a)).not.toBe(-1);
        expect(collection.items.indexOf(b)).not.toBe(-1);
    });

    it('should sort records if a sort function is given to the constructor', function () {
        var dataSource = new DataSource();

        for (var i = 0; i < 10; i++) {
            dataSource._records[i] = new RecordType();
        }
        var collection = dataSource.createManagedCollection({
            sortItemsBy: propertySort,
            synchronous: true
        });

        expect(collection.items.length).toBe(10);
        for (i = 1; i < collection.items.length; i++) {
            var largerProperty = collection.items[i].property;
            var smallerProperty = collection.items[i - 1].property;
            expect(largerProperty).toBeGreaterThan(smallerProperty);
        }
    });


    it('should filter records if a filter function is given to the constructor', function () {
        var dataSource = new DataSource();
        var a = new RecordType();
        var b = new RecordType();
        var c = new RecordType();
        a.property = 0.1;
        b.property = 0.5;
        c.property = 1;
        dataSource._records = {
            1: a,
            2: b,
            3: c
        };
        var collection = dataSource.createManagedCollection({
            synchronous: true,
            filterItemsBy: function (record) {
                return record.property >= 0.5;
            }
        });
        expect(collection.items.length).toBe(2);
        expect(collection.items.indexOf(a)).toBe(-1);
        expect(collection.items.indexOf(b)).not.toBe(-1);
        expect(collection.items.indexOf(c)).not.toBe(-1);
    });

    it('should update when records are added to the data source', function (done) {
        var dataSource = new DataSource();
        var managedCollection = dataSource.createManagedCollection();
        managedCollection.setRefreshDebounceTime(-1);
        expect(managedCollection.items.length).toBe(0);
        dataSource.addRecord(new RecordType()).then(function () {
            expect(managedCollection.items.length).toBe(1);
            done();
        });
    });

    it('should not include item when a record is added to the data source that doesnt match the filter', function (done) {
        var dataSource = new DataSource();
        var managedCollection = dataSource.createManagedCollection({
            filterItemsBy: function () {
                return false;
            }
        });
        managedCollection.setRefreshDebounceTime(-1);
        expect(managedCollection.items.length).toBe(0);
        dataSource.addRecord(new RecordType()).then(function () {
            expect(managedCollection.items.length).toBe(0);
            expect(managedCollection.internalItems.size).toBe(1);
            done();
        });
    });

    it('should update the current page if paged and record is added to DataSource', function (done) {
        var dataSource = new DataSource();
        var records = {};
        for (var i = 0; i < 30; i++) {
            records[i] = new RecordType();
            records[i].property = i;
        }
        dataSource._records = records;
        var managedCollection = dataSource.createManagedCollection({
            synchronous: true,
            itemPageSize: 5,
            sortItemsBy: propertySort
        });
        managedCollection.setRefreshDebounceTime(-1);
        var a = new RecordType();
        a.property = 0.5;
        var removed = managedCollection.items[4];
        expect(removed).toBeDefined();
        dataSource.addRecord(a).then(function () {
            expect(managedCollection.items.length).toBe(5);
            expect(managedCollection.internalItems.size).toBe(31);
            expect(managedCollection.items.length).toBe(5);
            expect(managedCollection.items.indexOf(a)).not.toBe(-1);
            expect(managedCollection.items.indexOf(removed)).toBe(-1);
            done();
        });
    });

    it('should update when records are removed from the data source', function (done) {
        var dataSource = new DataSource();
        var records = {};
        for (var i = 0; i < 30; i++) {
            records[i] = new RecordType(i);
            records[i].property = i + i;
        }
        dataSource._records = records;
        var managedCollection = dataSource.createManagedCollection();
        managedCollection.setRefreshDebounceTime(-1);
        var toBeRemoved = managedCollection.items[3];
        dataSource.removeRecord(toBeRemoved).then(function () {
            expect(managedCollection.items.length).toBe(29);
            expect(managedCollection.items.indexOf(toBeRemoved)).toBe(-1);
            done();
        });
    });

    it('should update and emit itemRemoved when a record is removed from the data source', function (done) {
        var dataSource = new DataSource();
        var records = {};
        for (var i = 0; i < 30; i++) {
            records[i] = new RecordType(i);
            records[i].property = i + i;
        }
        dataSource._records = records;
        var managedCollection = dataSource.createManagedCollection();
        managedCollection.setRefreshDebounceTime(-1);
        var toBeRemoved = managedCollection.items[3];
        managedCollection.on('itemRemoved', function (removed) {
            expect(removed).toBe(toBeRemoved);
            expect(managedCollection.items.length).toBe(29);
            expect(managedCollection.items.indexOf(toBeRemoved)).toBe(-1);
            done();
        });

        dataSource.removeRecord(toBeRemoved);
    });

    it('should update items and update the current page when a record is removed from the data source', function (done) {
        var dataSource = new DataSource();
        var records = {};
        for (var i = 0; i < 30; i++) {
            records[i] = new RecordType(i);
            records[i].property = i;
        }
        dataSource._records = records;
        var managedCollection = dataSource.createManagedCollection({
            itemPageSize: 3,
            sortItemsBy: propertySort
        });
        managedCollection.setItemPageNumber(8);
        var removed = managedCollection.items[2];
        expect(removed).toBeDefined();

        managedCollection.on('refresh', function () {
            expect(managedCollection.items.length).toBe(3);
            expect(managedCollection.internalItems.size).toBe(29);
            expect(managedCollection.items.length).toBe(3);
            expect(managedCollection.items.indexOf(removed)).toBe(-1);
            expect(managedCollection.internalItems.get(removed)).toBeUndefined();
            done();
        });
        dataSource.removeRecord(removed);
    });


    it('should update when records are changed in the data source', function (done) {
        var dataSource = new DataSource();
        var original = new RecordType('original');
        var changed = new RecordType('changed');
        dataSource._records = {
            a: original
        };
        var collection = dataSource.createManagedCollection({
            synchronous: true
        });
        expect(collection.items[0]).toBe(original);
        dataSource.setRecord('a', changed).then(function () {
            expect(collection.items[0]).toBe(changed);
            done();
        });
    });

    it('should emit refresh when record in data source is changed', function (done) {
        var dataSource = new DataSource();
        var original = new RecordType('original');
        var changed = new RecordType('changed');
        dataSource._records = {
            a: original
        };
        var collection = dataSource.createManagedCollection({
            synchronous: true
        });
        collection.on('refresh', function () {
            expect(collection.items[0]).toBe(changed);
            done();
        });
        expect(collection.items[0]).toBe(original);
        dataSource.setRecord('a', changed);
    });

    it('should resort when a record is changed', function (done) {
        var dataSource = new DataSource();

        for (var i = 0; i < 10; i++) {
            dataSource._records[i] = new RecordType();
            dataSource._records[i].property = i;
        }
        var collection = dataSource.createManagedCollection({
            synchronous: true,
            sortItemsBy: propertySort
        });
        collection.setRefreshDebounceTime(-1);
        expect(collection.items.length).toBe(10);
        var changedRecord = collection.items[3];
        changedRecord.property = 100;
        dataSource.setRecord('3', changedRecord).then(function () {
            expect(collection.items[collection.items.length - 1]).toBe(dataSource._records[3]);
            expect(collection.items[3]).toBe(dataSource._records[4]);
            done();
        });
    });

    it("should regroup when a record is changed", function (done) {
        var dataSource = new DataSource();

        for (var i = 0; i < 10; i++) {
            dataSource._records[i] = new RecordType(i, i + 1);
            if (i % 2 == 0) {
                dataSource._records[i].group = 'even';
            } else {
                dataSource._records[i].group = 'odd';
            }
        }
        var collection = dataSource.createManagedCollection({
            sortItemsBy: propertySort,
            groupItemsBy: 'group',
            synchronous: true
        });
        expect(collection.groups.length).toBe(2);
        var changedRecord = collection.items[3];
        changedRecord.group = 'other';
        dataSource.setRecord('3', changedRecord).then(function () {
            expect(collection.groups.length).toBe(3);
            done();
        });
    });

    it("should regroup when a record is changed and filter new group out", function (done) {
        var dataSource = new DataSource();

        for (var i = 0; i < 10; i++) {
            dataSource._records[i] = new RecordType(i, i + 1);
            if (i % 2 == 0) {
                dataSource._records[i].group = 'even';
            } else {
                dataSource._records[i].group = 'odd';
            }
        }
        var collection = dataSource.createManagedCollection({
            sortItemsBy: propertySort,
            groupItemsBy: 'group',
            synchronous: true,
            filterGroupsBy: function (a) {
                return a.id === 'even' || a.id === 'odd';
            }
        });
        expect(collection.groups.length).toBe(2);
        var changedRecord = collection.items[3];
        changedRecord.group = 'other';
        dataSource.setRecord('3', changedRecord).then(function () {
            expect(collection.groups.length).toBe(2);
            expect(collection.groupMap.size).toBe(3);
            done();
        });
    });

    it('should repage when a record is changed', function (done) {
        var dataSource = new DataSource();

        for (var i = 0; i < 100; i++) {
            dataSource._records[i] = new RecordType();
            dataSource._records[i].property = i;
        }
        var collection = dataSource.createManagedCollection({
            sortItemsBy: propertySort,
            itemPageSize: 10
        });
        collection.nextItemPage();
        expect(collection.items[collection.items.length - 1]).toBe(dataSource._records[19]);
        var changed = collection.items[0];
        changed.property = 100;
        collection.on('refresh', function () {
            expect(collection.items.indexOf(changed)).toBe(-1);
            expect(collection.items[collection.items.length - 1]).toBe(dataSource._records[20]);
            done();
        });

        dataSource.setRecord('10', changed);
    });

    describe('Custom group class', function () {
        var dataSource = null;

        beforeEach(function () {
            dataSource = new DataSource();
        });

        var __extends = (this && this.__extends) || function (d, b) {
                for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
                function __() {
                    this.constructor = d;
                }

                __.prototype = b.prototype;
                d.prototype = new __();
            };

        var CustomClass = function (options) {
            Collection.call(this, options);
        };

        __extends(CustomClass, Collection);

        CustomClass.prototype.add = function (item) {
            item *= 2;
            Collection.prototype.add.call(this, item);
        };

        it('should allow a custom group type', function () {
            var collection = dataSource.createManagedCollection({
                synchronous: true,
                groupClass: CustomClass,
                groupItemsBy: function () {
                    return 'anything';
                }
            });
            collection.add(1);
            expect(collection.groups.length).toBe(1);
            expect(collection.groups[0] instanceof CustomClass).toBe(true);
            expect(collection.groups[0].items[0]).toBe(2);
        });

        it('should rebuild groups with new group type', function () {
            var collection = dataSource.createManagedCollection({
                synchronous: true,
                groupItemsBy: function () {
                    return 'anything';
                }
            });
            collection.add(1);
            expect(collection.groups.length).toBe(1);
            expect(collection.groups[0] instanceof CustomClass).toBe(false);
            collection.setOptions({
                groupClass: CustomClass
            });
            expect(collection.groups[0] instanceof CustomClass).toBe(true);
        });
    });

    describe('Group Paging', function () {
        var dataSource = null;

        beforeEach(function () {
            dataSource = new DataSource();
        });

        it('should be able to page by groups instead of records', function () {
            for (var i = 0; i < 500; i++) {
                dataSource._records[i] = new RecordType(i);
                dataSource._records[i].groupProp = (i % 50).toString();
            }
            var collection = dataSource.createManagedCollection({
                groupPageSize: 10,
                groupItemsBy: 'groupProp'
            });

            expect(collection.groups.length).toBe(10);
            expect(collection.groupMap.size).toBe(50);
            expect(collection.items.length).toBe(500);
        });

    });
});