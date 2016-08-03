var Collection = require('../../dist/collection').Collection;

describe('Collection Basics', function () {
    var collection;
    beforeEach(function () {
        collection = new Collection();
        //this makes everything synchronous -- good for testing bad for real code
        collection.setRefreshDebounceTime(-1);
    });

    it('should accept an array as initial data', function () {
        var data = [1, 2, 3];
        var c = new Collection(data);
        expect(c.itemCount).toBe(3);
        expect(c.items).not.toBe(data);
    });

    it('should add things', function () {
        collection.add(10);
        expect(collection.items.length).toBe(1);
        expect(collection.items[0]).toBe(10);
        expect(collection.internalItems.get(10)).toBeDefined();
    });

    it('should add multiple things', function () {
        collection.add(10);
        collection.add(11);
        collection.add(12);
        collection.add(13);
        expect(collection.items.length).toBe(4);
        expect(collection.items).toEqual([10, 11, 12, 13]);
        //expect(collection.internalItems).toEqual([10, 11, 12, 13]);
    });

    it('should add the same things without error', function () {
        collection.add(10);
        collection.add(10);
        expect(collection.items.length).toBe(1);
        expect(collection.items[0]).toBe(10);
        expect(collection.items[1]).toBeUndefined();
    });

    it('should change an item without adding it twice', function () {
        var item = {id: 1};
        collection.add(item);
        item.id = 2;
        collection.change(item);
        expect(collection.items.length).toBe(1);
    });

    it('should swap an item if change is called with two items', function () {
        var item1 = {id: 1};
        collection.add(item1);
        var item2 = {id: 2};
        collection.change(item1, item2);
        expect(collection.items.length).toBe(1);
        expect(collection.items[0]).toBe(item2);
        expect(collection.internalItems.get(item1)).toBeUndefined();
    });

    it('should sort by a function', function () {
        collection.sortItemsBy(function (a, b) {
            return a - b;
        });
        collection.add(3);
        collection.add(10);
        collection.add(1);
        expect(collection.items).toEqual([1, 3, 10]);
    });

    it('should filter by a function', function () {
        collection.filterItemsBy(function (item) {
            return item > 0;
        });
        collection.add(3);
        collection.add(-10);
        collection.add(1);
        expect(collection.items).toEqual([3, 1]);
        expect(collection.internalItems.get(-10)).toBeDefined();
    });

    it('should filter and sort at the same time', function () {
        collection.sortItemsBy(function (a, b) {
            return a - b;
        });
        collection.filterItemsBy(function (item) {
            return item > 0;
        });
        collection.add(3);
        collection.add(-10);
        collection.add(1);
        expect(collection.items).toEqual([1, 3]);
    });

    it('should page items and set page size', function () {

        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(5);
        collection.refresh();
        expect(collection.items).toEqual([0, 1, 2, 3, 4]);
        expect(collection.internalItems.get(99)).toBeDefined();
    });

    it('should page items and set page number', function () {

        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageNumber(5);
        collection.refresh();
        expect(collection.items).toEqual([40, 41, 42, 43, 44, 45, 46, 47, 48, 49]);
        expect(collection.internalItems.get(99)).toBeDefined();
    });

    it('should unpage', function () {

        for (var i = 0; i < 10; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(5);
        collection.refresh();
        expect(collection.items).toEqual([0, 1, 2, 3, 4]);
        collection.unpageItems();
        collection.refresh();
        expect(collection.items).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should emit events when items are added', function () {
        spyOn(collection, 'emit');
        collection.add("Hello");
        expect(collection.emit).toHaveBeenCalledWith('itemAdded', 'Hello', true);
    });

    it('should remove items', function () {
        collection.add(10);
        collection.add(11);
        collection.remove(10);
        expect(collection.items.length).toBe(1);
        expect(collection.internalItems.get(10)).toBeUndefined();
    });

    it('should emit events when removing items', function () {
        collection.add(10);
        collection.add(11);
        spyOn(collection, 'emit');
        collection.remove(10);
        expect(collection.items.length).toBe(1);
        expect(collection.internalItems.get(10)).toBeUndefined();
        expect(collection.internalItems.get(11)).toBeDefined();
        expect(collection.emit).toHaveBeenCalledWith('itemRemoved', 10);
    });

    it('should change filtering functions', function () {
        collection.filterItemsBy(function (item) {
            return item > 0;
        });
        collection.add(3);
        collection.add(-10);
        collection.add(1);
        expect(collection.items).toEqual([3, 1]);
        collection.filterItemsBy(function (item) {
            return item < 0;
        });
        expect(collection.items).toEqual([-10]);
    });

    it('should change sorting functions', function () {
        collection.sortItemsBy(function (a, b) {
            return a - b;
        });
        collection.add(3);
        collection.add(10);
        collection.add(1);
        collection.refresh();
        expect(collection.items).toEqual([1, 3, 10]);
        collection.sortItemsBy(function (a, b) {
            return b - a;
        });
        collection.refresh();
        expect(collection.items).toEqual([10, 3, 1]);
    });

    it('should change paging sizes', function () {

        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(5);
        collection.refresh();
        expect(collection.items).toEqual([0, 1, 2, 3, 4]);
        expect(collection.internalItems.size).toBe(100);
        collection.setItemPageSize(2);
        collection.refresh();
        expect(collection.items).toEqual([0, 1]);
    });

    it('should change page number', function () {

        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(2);
        collection.setItemPageNumber(2);
        collection.refresh();
        expect(collection.items).toEqual([2, 3]);
        collection.setItemPageNumber(3);
        collection.refresh();
        expect(collection.items).toEqual([4, 5]);
    });

    it('should go to the next page', function () {

        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(2);
        collection.setItemPageNumber(2);
        expect(collection.items).toEqual([2, 3]);
        collection.nextItemPage();
        expect(collection.items).toEqual([4, 5]);
    });

    it('should not exceed max page number', function () {

        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(2);
        collection.setItemPageNumber(50);
        expect(collection.items).toEqual([98, 99]);
        collection.setItemPageNumber(51);
        expect(collection.items).toEqual([98, 99]);
        expect(collection.itemPageNumber).toBe(50);
    });

    it('should not have a negative page number', function () {
        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(2);
        collection.setItemPageNumber(-10);
        expect(collection.items).toEqual([0, 1]);
        expect(collection.itemPageNumber).toBe(1);
    });

    it('should go to the previous page', function () {
        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.setItemPageSize(2);
        collection.setItemPageNumber(50);
        expect(collection.items).toEqual([98, 99]);
        collection.previousItemPage();
        expect(collection.items).toEqual([96, 97]);
    });

    it('should emit `refresh` events', function () {
        spyOn(collection, 'emit');
        collection.refresh();
        expect(collection.emit).toHaveBeenCalledWith('refresh')
    });

    it('should naturally refresh itself', function (done) {
        collection.setRefreshDebounceTime(100);
        collection.add({hi: 'there'});
        collection.on('itemAdded', function (item) {
            expect(item).toEqual({hi: 'there'});
            done();
        });
    });

    it('should naturally refresh itself and emit refresh', function (done) {
        collection.setRefreshDebounceTime(100);
        collection.add({hi: 'there'});
        expect(collection.items.length).toBe(0);
        collection.on('refresh', function () {
            expect(collection.items.length).toBe(1);
            done();
        });
    });

    it('should get unfiltered groups', function () {
        collection.filterItemsBy(function (a) {
            return a.id == '1';
        });
        collection.add({id: '1'});
        collection.add({id: '2'});
        collection.refresh();
        expect(collection.items.length).toBe(1);
        expect(collection.getUnfilteredItems().length).toBe(2);
        expect(typeof collection.getUnfilteredItems()[0] === "object").toBeTruthy();
    });

    it('should force a refresh', function () {
        var test = {value: 0};
        collection.filterItemsBy(function (a) {
            return a.value > test.value;
        });
        collection.add({id: '1', value: 1});
        collection.add({id: '2', value: 2});
        collection.refresh();
        expect(collection.items.length).toBe(2);
        test.value = 1;
        collection.refresh();
        expect(collection.items.length).toBe(1);
    });
});