var Collection = require('../../dist/collection').Collection;

describe('Collection Group', function () {
    var collection;
    beforeEach(function () {
        collection = new Collection();
        //this makes everything synchronous -- good for testing bad for real code
        collection.setRefreshDebounceTime(-1);
    });

    it('should start without grouping', function () {
        collection.add(1);
        collection.add(2);
        collection.add(3);
        expect(collection.groups.length).toBe(0);
    });

    it('should apply a grouping from a function', function () {
        collection.add(1);
        collection.add(2);
        collection.add(3);
        collection.groupItemsBy(function (a) {
            return a.toString();
        });
        expect(collection.groupMap.size).toBe(3);
        expect(collection.externalGroups.length).toBe(3);
        expect(collection.groups.length).toBe(3);
    });

    it('should apply grouping by a string', function () {
        collection.add({id: '1'});
        collection.add({id: '2'});
        collection.add({id: '3'});
        collection.groupItemsBy('id');
        expect(collection.groupMap.size).toBe(3);
        expect(collection.externalGroups.length).toBe(3);
        expect(collection.groups.length).toBe(3);
    });

    it('should add grouped items to subgroup', function () {
        collection.add({id: '1'});
        collection.add({id: '2'});
        collection.add({id: '3'});
        collection.groupItemsBy('id');
        expect(collection.groups[0].items[0]).toBe(collection.items[0]);
        expect(collection.groups[1].items[0]).toBe(collection.items[1]);
        expect(collection.groups[2].items[0]).toBe(collection.items[2]);
    });

    it('should add multiple items to a group', function () {
        collection.groupItemsBy('id');

        collection.add({id: '1'});
        collection.add({id: '1'});
        collection.add({id: '2'});
        expect(collection.groups[0].items[0]).toBe(collection.items[0]);
        expect(collection.groups[0].items[1]).toBe(collection.items[1]);
    });

    it('should add new items to a group', function () {
        collection.add({id: '1'});
        collection.add({id: '1'});
        collection.groupItemsBy('id');
        expect(collection.groups.length).toBe(1);
        expect(collection.groups[0].items.length).toBe(2);
    });

    it('should emit group created events', function (done) {
        collection.groupItemsBy('id');
        var calls = 0;
        collection.on('groupCreated', function (group) {
            expect(group.id).toBe('1');
            expect(calls).toBe(0);
            calls++;
            done();
        });
        collection.add({id: '1'});
        collection.add({id: '1'});
    });

    it('should emit group destroyed events', function (done) {
        collection.groupItemsBy('id');
        var calls = 0;
        collection.on('groupDestroyed', function (group) {
            expect(group.id).toBe('1');
            expect(calls).toBe(0);
            calls++;
            expect(collection.groupMap.size).toBe(0);
            done();
        });
        var item = {id: '1'};
        collection.add(item);
        collection.remove(item);
    });

    it('should filter groups', function () {
        collection.groupItemsBy(function (item) {
            return (item > 10) ? 'large' : 'small';
        });
        collection.add(1);
        collection.add(10);
        collection.add(100);
        collection.filterGroupsBy(function (group) {
            return group.id === 'small';
        });
        expect(collection.groups.length).toBe(1);
        expect(collection.groups[0].id).toBe('small');
        expect(collection.groups[0].items.length).toBe(2);
        expect(collection.groups[0].items[0]).toBe(1);
        expect(collection.groups[0].items[1]).toBe(10);
        expect(collection.groupMap.size).toBe(2);
    });

    it('should sort groups', function () {
        collection.groupItemsBy('id');
        collection.add({id: '1'});
        collection.add({id: '-1'});
        collection.add({id: '0'});
        collection.sortGroupsBy(function (a, b) {
            return parseInt(b.id) - parseInt(a.id);
        });
        expect(collection.groups[0].id).toBe('1');
        expect(collection.groups[1].id).toBe('0');
        expect(collection.groups[2].id).toBe('-1');
    });

    it('should sort items according to groups', function () {
        var i1 = {id: '1'};
        var iNeg1 = {id: '-1'};
        var i0 = {id: '0'};
        collection.groupItemsBy('id');
        collection.add(i1);
        collection.add(i0);
        collection.add(iNeg1);
        collection.sortGroupsBy(function (a, b) {
            return parseInt(b.id) - parseInt(a.id);
        });
        expect(collection.items[0]).toBe(i1);
        expect(collection.items[1]).toBe(i0);
        expect(collection.items[2]).toBe(iNeg1);
    });

    it('should sort and filter groups', function () {
        collection.groupItemsBy('id');
        collection.add({id: '1'});
        collection.add({id: '-1'});
        collection.add({id: '0'});
        collection.sortGroupsBy(function (a, b) {
            return parseInt(b.id) - parseInt(a.id);
        });
        collection.filterGroupsBy(function (group) {
            return parseInt(group.id) >= 0;
        });
        expect(collection.items.length).toBe(3);
        expect(collection.groups.length).toBe(2);
        expect(collection.groups[0].id).toBe('1');
        expect(collection.groups[1].id).toBe('0');
    });

    it('should page groups', function () {
        collection.groupItemsBy(function (item) {
            return (item % 10).toString();
        });
        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        expect(collection.groups.length).toBe(10);
        collection.pageGroups(1, 2);
        expect(collection.groups.length).toBe(2);
        expect(collection.groups[0].id).toBe('0');
        expect(collection.groups[1].id).toBe('1');
        collection.pageGroups(2, 2);
        expect(collection.groups[0].id).toBe('2');
        expect(collection.groups[1].id).toBe('3');
    });

    it('should go to the next group page', function () {
        collection.groupItemsBy(function (item) {
            return (item % 10).toString();
        });
        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.pageGroups(1, 2);
        collection.nextGroupPage();
        expect(collection.groups[0].id).toBe('2');
        expect(collection.groups[1].id).toBe('3');
    });

    it('should go to the previous group page', function () {
        collection.groupItemsBy(function (item) {
            return (item % 10).toString();
        });
        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.pageGroups(3, 2);
        collection.previousGroupPage();
        expect(collection.groups[0].id).toBe('2');
        expect(collection.groups[1].id).toBe('3');
    });

    it('should not affect item paging when group paging is applied', function () {
        collection.groupItemsBy(function (item) {
            return (item % 10).toString();
        });
        for (var i = 0; i < 100; i++) {
            collection.add(i);
        }
        collection.pageGroups(3, 2);
        expect(collection.items.length).toBe(100);
        expect(collection.itemPageNumber).toBe(-1);
    });

    it('should separately sort subgroups if subgroup has sorting set', function () {
        collection.sortItemsBy(function (a, b) {
            return a - b;
        });

        collection.groupItemsBy(function () {
            return '1';
        });


        collection.setOptions({
            createdGroupOptions: {
                sortItemsBy: function (a, b) {
                    return b - a;
                }
            }
        });

        for (var i = 0; i < 5; i++) {
            collection.add(i);
        }
        expect(collection.groups[0].items).toEqual([4, 3, 2, 1, 0]);
    });

    it('should include items that subgroup filters out if subgroup itself is not filtered out', function () {
        collection.groupItemsBy('id');
        collection.setOptions({
            createdGroupOptions: {
                filterItemsBy: function(item) {
                    return item.prop < 2;
                }
            }
        });
        collection.add({id: '1', prop: 1});
        collection.add({id: '1', prop: 2});
        expect(collection.items.length).toBe(2);
        expect(collection.groups[0].items.length).toBe(1);
    });

    it('should not add groups twice', function() {
        collection.groupItemsBy('id');
        collection.add({id: '1', prop: 1});
        collection.add({id: '1', prop: 2});
        collection.filterGroupsBy(function(a) {
            return a.items.length > 2;
        });
        collection.refresh();
        collection.add({id: '1', prop: 2});
        collection.refresh();
        expect(collection.groups.length).toBe(1);
    });

    // this is no longer true
    // it('should not refresh without changes', function() {
    //     spyOn(collection, 'refreshGroups');
    //     collection.refreshDebouncer.delay = 10;
    //     collection.add({id: '1', prop: 2});
    //     collection.refresh();
    //     collection.refresh();
    //     expect(collection.refreshGroups.calls.count()).toBe(1);
    // });

    it('should get unfiltered groups', function(){
        collection.groupItemsBy('id');
        collection.filterGroupsBy(function(a) {
            return a.id == '1';
        });
        collection.add({id: '1'});
        collection.add({id: '2'});
        collection.refresh();
        expect(collection.groups.length).toBe(1);
        expect(collection.getUnfilteredGroups().length).toBe(2);
    });

    //it('should not include items in groups that filtered out of its parent', function() {
    //
    //});
});