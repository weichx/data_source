var DataSource = require('../dist/data_source').DataSource;
DataSource.SetPromiseImplementation(Promise);
var DataSourceAdapter = require('../dist/adapter').Adapter;
var Helpers = require('./helper');

var RecordType = Helpers.DataSourceRecordType;

describe('Adapter', function () {

    it('can remove a record from the data source with sourceInterface.set(id, null)', function () {
        var adapter = new DataSourceAdapter();
        adapter.addRecord = function (record) {
            this.sourceInterface.set('1', null);
        };

        var dataSource = new DataSource(adapter);

        dataSource._records['1'] = new RecordType();
        adapter.addRecord();
        expect(dataSource._records['1']).toBeUndefined();
    });

    it('emits recordRemoved events on the data source when record is removed with sourceInterface', function () {
        var adapter = new DataSourceAdapter();
        adapter.addRecord = function (record) {
            this.sourceInterface.set('1', null);
        };

        var evt = {
            remove: function () {
            }
        };
        var dataSource = new DataSource(adapter);

        dataSource.on('recordRemoved', function () {
            evt.remove();
        });

        dataSource._records['1'] = new RecordType();
        spyOn(evt, 'remove');
        adapter.addRecord();
        expect(evt.remove).toHaveBeenCalled();
        expect(dataSource._records['1']).toBeUndefined();
    });


    it('can add a record to the data source with sourceInterface.set(id, record)', function () {
        var adapter = new DataSourceAdapter();
        var a = new RecordType();
        adapter.addRecord = function (record) {
            this.sourceInterface.set('2', record);
        };
        var evt = {add : function() {}};
        spyOn(evt, 'add');
        var dataSource = new DataSource(adapter);
        dataSource.on('recordAdded', function() {
            evt.add();
        });
        dataSource._records['1'] = new RecordType();
        adapter.addRecord(a);
        expect(dataSource._records['2']).toBe(a);
        expect(evt.add).toHaveBeenCalled();
    });

    it('can change a record in the data source with sourceInterface.set(id, record', function() {
        var adapter = new DataSourceAdapter();
        var a = new RecordType();
        var b = new RecordType();
        adapter.setRecord = function (id, record) {
            this.sourceInterface.set(id, record);
        };
        var dataSource = new DataSource(adapter);

        dataSource._records['1'] = a;
        adapter.setRecord('1', b);
        expect(dataSource._records['1']).toBe(b);
    });

    it('emits recordChanged events on the data source with sourceInterface.set(id, record)', function() {
        var adapter = new DataSourceAdapter();
        var a = new RecordType();
        var b = new RecordType();
        adapter.setRecord = function (id, record) {
            this.sourceInterface.set(id, record);
        };
        var evt = {set : function() {}};
        spyOn(evt, 'set');
        var dataSource = new DataSource(adapter);
        dataSource.on('recordChanged', function() {
            evt.set();
        });
        dataSource._records['1'] = a;
        adapter.setRecord('1', b);
        expect(dataSource._records['1']).toBe(b);
        expect(evt.set).toHaveBeenCalled();
    });

    it('can clear all data source records with sourceInterface.clear()', function () {
        var adapter = new DataSourceAdapter();
        adapter.addRecord = function (record) {
            this.sourceInterface.clear();
        };

        var dataSource = new DataSource(adapter);
        dataSource._records['1'] = new RecordType();
        dataSource._records['2'] = new RecordType();
        adapter.addRecord();
        expect(dataSource._records['1']).toBeUndefined();
        expect(dataSource._records['2']).toBeUndefined();
        expect(Object.keys(dataSource._records).length).toBe(0);
    });

    it('emits recordRemoved events on the data source when cleared', function() {
        var adapter = new DataSourceAdapter();
        adapter.addRecord = function (record) {
            this.sourceInterface.clear();
        };

        var evt = {
            remove: function () {
            }
        };
        var dataSource = new DataSource(adapter);
        dataSource.on('recordRemoved', function () {
            evt.remove();
        });
        spyOn(evt, 'remove');
        dataSource._records['1'] = new RecordType();
        dataSource._records['2'] = new RecordType();
        adapter.addRecord();
        expect(dataSource._records['1']).toBeUndefined();
        expect(dataSource._records['2']).toBeUndefined();
        expect(Object.keys(dataSource._records).length).toBe(0);
        expect(evt.remove.calls.count()).toBe(2);
    });

    it('can get a record id with source.id(record) without defining getRecordId', function() {
        var adapter = new DataSourceAdapter();
        adapter.fn = function (record) {
            return this.sourceInterface.id(record);
        };
        var dataSource = new DataSource(adapter);
        var a = new RecordType('10');
        dataSource._records['10'] = a;
        var id = adapter.fn(a);
        expect(id).toBe('10');
    });

    it('can get a record id with source.id(record) when defining getRecordId', function() {
        var adapter = new DataSourceAdapter();
        adapter.getRecordId = function(record) {
            return record.id;
        };
        adapter.fn = function (record) {
            return this.sourceInterface.id(record);
        };
        var dataSource = new DataSource(adapter);
        var a = new RecordType('10');
        dataSource._records['11'] = a;
        var id = adapter.fn(a);
        expect(id).toBe('10');
    });
});