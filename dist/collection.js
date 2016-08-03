var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var FastArray = require('./fast_array');
var event_1 = require('./event');
var util_1 = require('./util');
var GroupActivation;
(function (GroupActivation) {
    GroupActivation[GroupActivation["BecameActive"] = 1] = "BecameActive";
    GroupActivation[GroupActivation["BecameInactive"] = 2] = "BecameInactive";
    GroupActivation[GroupActivation["DidNotChange"] = 4] = "DidNotChange";
    GroupActivation[GroupActivation["DidNotActivate"] = 6] = "DidNotActivate";
    GroupActivation[GroupActivation["DidNotDeactivate"] = 5] = "DidNotDeactivate";
})(GroupActivation || (GroupActivation = {}));
//refresh will be manual, data source does it automatically
//add record / remove record wont trigger a refresh
//data source will call refresh in a debounced way on add / change / remove
//changing any of the options will refresh synchronously
var AsyncAction;
(function (AsyncAction) {
    AsyncAction[AsyncAction["Add"] = 1] = "Add";
    AsyncAction[AsyncAction["Remove"] = 2] = "Remove";
    AsyncAction[AsyncAction["Change"] = 4] = "Change";
})(AsyncAction || (AsyncAction = {}));
exports.Event_Destroyed = 'destroyed';
exports.Event_ItemAdded = 'itemAdded';
exports.Event_ItemRemoved = 'itemRemoved';
exports.Event_ItemChanged = 'itemChanged';
exports.Event_GroupCreated = 'groupCreated';
exports.Event_GroupDestroyed = 'groupDestroyed';
exports.Event_GroupBecameActive = 'groupBecameActive';
exports.Event_GroupBecameInactive = 'groupBecameInactive';
exports.Event_Refresh = 'refresh';
var NullGroupId = '__NONE__';
var Collection = (function (_super) {
    __extends(Collection, _super);
    function Collection(initArrayOrOptions, options) {
        _super.call(this);
        var initArray = null;
        if (Array.isArray(initArrayOrOptions)) {
            initArray = initArrayOrOptions.slice(0);
        }
        else {
            initArray = [];
            options = initArrayOrOptions;
        }
        this.externalItems = initArray;
        this.externalGroups = [];
        this.internalItems = new Map();
        this.pagedGroups = [];
        this.pagedItems = [];
        this.changeList = [];
        this.itemPageNumber = -1;
        this.itemPageSize = 10;
        this.groupPageNumber = -1;
        this.groupPageSize = 10;
        this.isActive = true;
        this.groupMap = new Map();
        this.id = null;
        this.itemFilterFn = NullFilter;
        this.groupFilterFn = NullFilter;
        this.refreshDebouncer = new util_1.Debouncer(this.refresh, this, 200);
        this.groupClass = Collection;
        this.setOptions(options);
    }
    Object.defineProperty(Collection.prototype, "idString", {
        get: function () {
            return this.id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "items", {
        get: function () {
            if (this.itemPageNumber !== -1) {
                return this.pagedItems;
            }
            else {
                return this.externalItems;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "groups", {
        get: function () {
            if (this.groupPageNumber !== -1) {
                return this.pagedGroups;
            }
            else {
                return this.externalGroups;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "itemsPaged", {
        get: function () {
            return this.itemPageNumber !== -1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "groupsPaged", {
        get: function () {
            return this.groupPageNumber !== -1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "isGrouped", {
        get: function () {
            return this.getGroupIdFn !== null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "itemPageCount", {
        get: function () {
            if (this.itemPageSize <= 0)
                return -1;
            var raw = this.externalItems.length / this.itemPageSize;
            if (~~(raw) === raw) {
                return raw;
            }
            else {
                return ~~(raw) + 1;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "groupPageCount", {
        get: function () {
            if (this.groupPageSize <= 0)
                return -1;
            var raw = this.externalGroups.length / this.groupPageSize;
            if (~~(raw) === raw) {
                return raw;
            }
            else {
                return ~~(raw) + 1;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "currentItemPageNumber", {
        get: function () {
            return this.itemPageNumber;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "currentGroupPageNumber", {
        get: function () {
            return this.groupPageNumber;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "itemCount", {
        get: function () {
            return this.items.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Collection.prototype, "groupCount", {
        get: function () {
            return this.groups.length;
        },
        enumerable: true,
        configurable: true
    });
    Collection.prototype.setOptions = function (options) {
        if (!options)
            return;
        if (typeof options.groupClass === "function") {
            this.groupClass = options.groupClass;
            this.regenerateGroups();
        }
        if (options.createdGroupOptions && typeof options.createdGroupOptions === "object") {
            this.createdGroupOptions = options.createdGroupOptions;
        }
        if (options.sortGroupsBy === null || typeof options.sortGroupsBy === "function") {
            this.sortGroupsBy(options.sortGroupsBy);
        }
        if (options.sortItemsBy === null || typeof options.sortItemsBy === "function") {
            this.sortItemsBy(options.sortItemsBy);
        }
        if (options.filterGroupsBy === null || typeof options.filterGroupsBy === "function") {
            this.filterGroupsBy(options.filterGroupsBy);
        }
        if (options.filterItemsBy === null || typeof options.filterItemsBy === "function") {
            this.filterItemsBy(options.filterItemsBy);
        }
        if (options.groupItemsBy === null || typeof options.groupItemsBy === "string" || typeof options.groupItemsBy === "function") {
            this.groupItemsBy(options.groupItemsBy);
        }
        if (typeof options.itemPageSize === "number") {
            this.setItemPageSize(options.itemPageSize);
        }
        if (typeof options.groupPageSize === "number") {
            this.setGroupPageSize(options.groupPageSize);
        }
        //todo add refresh debounce time
        if (typeof options.synchronous === "boolean" && options.synchronous) {
            this.setRefreshDebounceTime(-1);
        }
        else if (typeof options.synchronous === "boolean" && !options.synchronous) {
            this.setRefreshDebounceTime(250);
        }
        this.refresh();
    };
    Collection.prototype.refresh = function () {
        this.refreshDebouncer.cancel();
        for (var i = 0; i < this.changeList.length; i++) {
            var item = this.changeList[i].item;
            var action = this.changeList[i].action;
            switch (action) {
                case AsyncAction.Add:
                    this.handleAsyncAdd(item);
                    break;
                case AsyncAction.Remove:
                    this.handleAsyncRemove(item);
                    break;
                case AsyncAction.Change:
                    this.handleAsyncChange(item, this.changeList[i].newItem);
                    break;
            }
        }
        this.changeList = [];
        if (this.getGroupIdFn) {
            this.refreshItemFilter_Grouped();
        }
        else {
            this.refreshItemFilters_Ungrouped();
        }
        this.refreshGroups();
        this.refreshSorting();
        this.refreshItemPaging();
        this.refreshGroupPaging();
        this.emit(exports.Event_Refresh);
    };
    Collection.prototype.setRefreshDebounceTime = function (debounceTime) {
        this.groupMap.forEach(function (group) {
            group.refreshDebouncer.reset(debounceTime);
        });
        this.refreshDebouncer.reset(debounceTime);
    };
    Collection.prototype.pageGroups = function (pageNumber, pageSize) {
        if (pageSize <= 0)
            pageSize = 1;
        this.groupPageSize = pageSize;
        if (pageNumber <= 0)
            pageNumber = 1;
        this.groupPageNumber = pageNumber;
        this.refreshGroupPaging();
    };
    Collection.prototype.setGroupPageNumber = function (number) {
        if (number <= 0)
            number = 1;
        this.groupPageNumber = number;
        this.refreshGroupPaging();
    };
    Collection.prototype.setGroupPageSize = function (pageSize) {
        if (pageSize <= 0) {
            pageSize = 1;
        }
        this.groupPageSize = pageSize;
        if (this.groupPageNumber === -1) {
            this.groupPageNumber = 1;
        }
        this.refreshGroupPaging();
    };
    Collection.prototype.nextGroupPage = function () {
        this.setGroupPageNumber(this.groupPageNumber + 1);
    };
    Collection.prototype.previousGroupPage = function () {
        this.setGroupPageNumber(this.groupPageNumber - 1);
    };
    Collection.prototype.pageItems = function (pageNumber, pageSize) {
        if (pageSize <= 0)
            pageSize = 1;
        this.itemPageSize = pageSize;
        if (pageNumber <= 0)
            pageNumber = 1;
        this.itemPageNumber = pageNumber;
        this.refreshItemPaging();
    };
    Collection.prototype.unpageItems = function () {
        this.itemPageNumber = -1;
    };
    Collection.prototype.setItemPageSize = function (size) {
        if (size <= 0) {
            size = 1;
        }
        this.itemPageSize = size;
        if (this.itemPageNumber === -1) {
            this.itemPageNumber = 1;
        }
        this.refreshItemPaging();
    };
    Collection.prototype.setItemPageNumber = function (number) {
        if (number <= 0)
            number = 1;
        this.itemPageNumber = number;
        this.refreshItemPaging();
    };
    Collection.prototype.nextItemPage = function () {
        this.setItemPageNumber(this.itemPageNumber + 1);
    };
    Collection.prototype.previousItemPage = function () {
        this.setItemPageNumber(this.itemPageNumber - 1);
    };
    Collection.prototype.getGroupById = function (id) {
        return this.groupMap.get(id);
    };
    Collection.prototype.add = function (item) {
        this.changeList.push({ action: AsyncAction.Add, item: item });
        this.refreshDebouncer.bounce();
    };
    Collection.prototype.addArray = function (items) {
        if (!Array.isArray(items))
            return;
        for (var i = 0; i < items.length; i++) {
            this.add(items[i]);
        }
    };
    Collection.prototype.change = function (item, newItem) {
        this.changeList.push({ action: AsyncAction.Change, item: item, newItem: newItem });
        this.refreshDebouncer.bounce();
    };
    Collection.prototype.changeArray = function (items) {
        if (!Array.isArray(items))
            return;
        for (var i = 0; i < items.length; i++) {
            this.change(items[i]);
        }
    };
    Collection.prototype.remove = function (item) {
        this.changeList.push({ action: AsyncAction.Remove, item: item });
        this.refreshDebouncer.bounce();
    };
    Collection.prototype.removeArray = function (items) {
        if (!Array.isArray(items))
            return;
        for (var i = 0; i < items.length; i++) {
            this.remove(items[i]);
        }
    };
    Collection.prototype.filterItemsBy = function (itemFilterFn) {
        var previousItemFilter = this.itemFilterFn;
        this.itemFilterFn = itemFilterFn || NullFilter;
        if (this.itemFilterFn === previousItemFilter)
            return;
        if (this.getGroupIdFn) {
            this.refreshItemFilter_Grouped();
        }
        else {
            this.refreshItemFilters_Ungrouped();
        }
        this.refreshDebouncer.bounce();
    };
    Collection.prototype.filterGroupsBy = function (groupFilterFn) {
        if (!groupFilterFn) {
            groupFilterFn = NullFilter;
        }
        this.groupFilterFn = groupFilterFn;
        this.refreshDebouncer.bounce();
    };
    Collection.prototype.sortItemsBy = function (itemSortFn) {
        var _this = this;
        if (itemSortFn && this.groupSortFn) {
            this.itemSortFn = function (a, b) {
                var group1 = _this.groupMap.get(_this.getGroupIdFn(a));
                var group2 = _this.groupMap.get(_this.getGroupIdFn(b));
                return _this.groupSortFn(group1, group2) || itemSortFn(a, b);
            };
        }
        else if (!itemSortFn && this.groupSortFn) {
            this.itemSortFn = function (a, b) {
                var group1 = _this.groupMap.get(_this.getGroupIdFn(a));
                var group2 = _this.groupMap.get(_this.getGroupIdFn(b));
                return _this.groupSortFn(group1, group2);
            };
        }
        else {
            this.itemSortFn = itemSortFn;
        }
        this.refreshDebouncer.bounce();
    };
    Collection.prototype.sortGroupsBy = function (groupSortFn) {
        this.groupSortFn = groupSortFn;
        this.refreshDebouncer.bounce();
    };
    Collection.prototype.groupItemsBy = function (groupingFn) {
        if (typeof groupingFn === "function") {
            this.getGroupIdFn = function (item) {
                return groupingFn(item) || NullGroupId;
            };
        }
        else if (typeof groupingFn === "string") {
            this.getGroupIdFn = function (item) {
                return item[groupingFn] || NullGroupId;
            };
        }
        else {
            this.getGroupIdFn = null;
            this.groupSortFn = null;
            this.groupFilterFn = NullFilter;
        }
        this.regenerateGroups();
        this.sortItemsBy(this.itemSortFn); //item sort can rely on group
        this.refreshDebouncer.bounce();
    };
    //still wants to be async because group sort / page / filter operations can be expensive to do excessively
    Collection.prototype.handleAsyncAdd = function (item) {
        var groupId = (this.getGroupIdFn && this.getGroupIdFn(item)) || NullGroupId;
        if (this.internalItems.get(item))
            return;
        this.internalItems.set(item, groupId);
        var passed = this.itemFilterFn(item);
        if (passed) {
            this.externalItems.push(item);
        }
        this.emit(exports.Event_ItemAdded, item, passed);
        if (this.getGroupIdFn && passed) {
            this.getGroup(item).add(item);
        }
    };
    Collection.prototype.handleAsyncChange = function (item, newItem) {
        var groupId = this.internalItems.get(item);
        if (!groupId) {
            return this.handleAsyncAdd(item);
        }
        if (!newItem) {
            newItem = item;
        }
        else {
            var newGroupId = (this.getGroupIdFn && this.getGroupIdFn(item)) || NullGroupId;
            this.internalItems.delete(item);
            this.internalItems.set(newItem, newGroupId);
        }
        var passed = this.itemFilterFn(newItem);
        FastArray.Remove(this.externalItems, item);
        if (passed) {
            this.externalItems.push(newItem);
        }
        this.emit(exports.Event_ItemChanged, item, newItem, passed);
        if (passed && this.getGroupIdFn) {
            var oldGroup = this.groupMap.get(groupId);
            var newGroup = this.getGroup(newItem);
            if (oldGroup !== newGroup) {
                oldGroup && oldGroup.remove(item);
                //without this check, group be adding item twice if group was just created
                if (!newGroup.internalItems.get(newItem)) {
                    newGroup.add(newItem);
                }
            }
            else {
                oldGroup.change(item, newItem);
            }
        }
    };
    Collection.prototype.handleAsyncRemove = function (item) {
        var groupId = this.internalItems.get(item);
        this.internalItems.delete(item);
        if (FastArray.Remove(this.externalItems, item) !== -1) {
            var group = this.groupMap.get(groupId);
            if (group) {
                group.remove(item);
            }
        }
        if (groupId) {
            this.emit(exports.Event_ItemRemoved, item);
        }
    };
    Collection.prototype.refreshGroups = function () {
        this.externalGroups = [];
        var processed = new Map();
        this.groupMap.forEach(function (group, key) {
            if (processed.get(group)) {
                return;
            }
            processed.set(group, true);
            group.refresh();
            if (group.internalItems.size === 0) {
                this.groupMap.delete(key);
                this.emit(exports.Event_GroupDestroyed, group);
            }
            else {
                var activityChange = this.emitGroupActivityChangeEvents(group);
                if (activityChange === GroupActivation.DidNotChange && this.groupFilterFn(group)) {
                    this.externalGroups.push(group);
                }
            }
        }, this);
        if (typeof this.groupSortFn === "function") {
            this.externalGroups.sort(this.groupSortFn);
        }
    };
    Collection.prototype.emitGroupActivityChangeEvents = function (group) {
        var passedFilter = this.groupFilterFn(group);
        var wasActive = group.isActive;
        if (wasActive && !passedFilter) {
            this.deactivateGroup(group);
            return GroupActivation.BecameInactive;
        }
        else if (!wasActive && passedFilter) {
            this.activateGroup(group);
            return GroupActivation.BecameActive;
        }
        return GroupActivation.DidNotChange;
    };
    Collection.prototype.getGroup = function (item) {
        var groupId = this.getGroupIdFn(item) || NullGroupId;
        var group = this.groupMap.get(groupId);
        if (!group) {
            group = new (this.groupClass)(this.createdGroupOptions);
            group.id = groupId;
            group.isActive = this.groupFilterFn(group);
            this.internalItems.set(item, groupId);
            this.groupMap.set(groupId, group);
            this.emit(exports.Event_GroupCreated, group);
        }
        return group;
    };
    Collection.prototype.clear = function () {
        if (this.hasListeners(exports.Event_ItemRemoved)) {
            this.internalItems.forEach(function (value, key) {
                this.emit(exports.Event_ItemRemoved, key);
            }, this);
        }
        this.groupMap.forEach(function (group) {
            group.emit(exports.Event_Destroyed, group);
            group.clear();
            this.emit(exports.Event_GroupDestroyed, group);
        }, this);
        this.groupMap.clear();
        this.externalGroups = [];
        this.internalItems.clear();
        this.externalItems = [];
        this.pagedGroups = [];
        this.pagedItems = [];
        this.emit(exports.Event_GroupBecameInactive);
    };
    // public resetOptions() : void {
    //     //todo implement this
    // }
    Collection.prototype.regenerateGroups = function () {
        this.externalGroups = [];
        this.pagedGroups = [];
        if (!this.getGroupIdFn) {
            this.internalItems.forEach(function (key, item) {
                this.internalItems.set(item, NullGroupId);
            }, this);
            this.groupMap.clear();
            return;
        }
        this.groupMap.forEach(function (group) {
            group.emit(exports.Event_Destroyed, group);
            group.clear();
            this.emit(exports.Event_GroupDestroyed, group);
        }, this);
        this.groupMap.clear();
        this.internalItems.forEach(function (groupId, item) {
            this.internalItems.set(item, this.getGroupIdFn(item));
            if (this.itemFilterFn(item)) {
                this.getGroup(item).add(item);
            }
        }, this);
        this.refreshGroups();
        this.refreshSorting();
        this.refreshGroupPaging();
    };
    Collection.prototype.refreshItemFilters_Ungrouped = function () {
        this.externalItems = [];
        this.internalItems.forEach(function (value, item) {
            if (this.itemFilterFn(item)) {
                this.externalItems.push(item);
            }
        }, this);
        this.refreshSorting();
    };
    //separate function increases chance of vm optimizing this
    //filter changes, groups dont get blown away but may get augmented
    //things wont change groups
    //things that were included but now arent need to be removed from their groups
    //things that were not included but now are need to be added to their groups
    Collection.prototype.refreshItemFilter_Grouped = function () {
        this.externalItems = [];
        this.internalItems.forEach(function (groupId, item) {
            var passed = this.itemFilterFn(item);
            if (!passed) {
                var group = this.groupMap.get(this.getGroupIdFn(item));
                if (group && group.internalItems.get(item)) {
                    group.remove(item);
                }
                this.internalItems.set(item, NullGroupId);
                return;
            }
            //if item was  not included but now is, maybe create the group and add it
            var group = this.groupMap.get(groupId);
            var wasActive = group && group.internalItems.get(item);
            if (!wasActive) {
                //get group will create if nessessary
                this.getGroup(item).add(item);
            }
            this.externalItems.push(item);
        }, this);
        this.refreshGroups();
    };
    Collection.prototype.refreshSorting = function () {
        if (this.groupSortFn) {
            this.externalGroups.sort(this.groupSortFn);
        }
        if (this.itemSortFn) {
            this.externalItems.sort(this.itemSortFn);
        }
    };
    Collection.prototype.refreshItemPaging = function () {
        if (this.itemPageNumber === -1)
            return;
        if (this.itemPageNumber === 0)
            this.itemPageNumber = 1;
        var totalPageCount = this.itemPageCount;
        if (this.itemPageNumber >= totalPageCount)
            this.itemPageNumber = totalPageCount;
        var startIndex = (this.itemPageNumber - 1) * this.itemPageSize;
        var endIndex = startIndex + this.itemPageSize;
        this.pagedItems = this.externalItems.slice(startIndex, endIndex);
    };
    Collection.prototype.refreshGroupPaging = function () {
        if (this.groupPageNumber === -1)
            return;
        if (this.groupPageNumber === 0)
            this.groupPageNumber = 1;
        var totalPageCount = this.groupPageCount;
        if (this.groupPageNumber >= totalPageCount)
            this.groupPageNumber = totalPageCount;
        var startIndex = (this.groupPageNumber - 1) * this.groupPageSize;
        var endIndex = startIndex + this.groupPageSize;
        this.pagedGroups = this.externalGroups.slice(startIndex, endIndex);
    };
    Collection.prototype.activateGroup = function (group) {
        group.isActive = true;
        FastArray.SortedInsert(this.externalGroups, group, this.groupSortFn);
        this.emit(exports.Event_GroupBecameActive, group);
    };
    Collection.prototype.deactivateGroup = function (group) {
        group.isActive = false;
        FastArray.Remove(this.externalGroups, group);
        this.emit(exports.Event_GroupBecameInactive, group);
    };
    //------------------- Array Functions ----------------------//
    Collection.prototype.getItemAt = function (index) {
        return this.items[index];
    };
    Collection.prototype.getGroupAt = function (index) {
        return this.groups[index];
    };
    Collection.prototype.getUnfilteredItems = function () {
        var retn = [];
        this.internalItems.forEach(function (key, value) {
            retn.push(value);
        });
        return retn;
    };
    Collection.prototype.getUnfilteredGroups = function () {
        var processed = new Map();
        var retn = [];
        this.groupMap.forEach(function (group, key) {
            if (processed.get(group)) {
                return;
            }
            retn.push(group);
            processed.set(group, true);
        });
        return retn;
    };
    Collection.prototype.forEachItem = function (fn, ctx) {
        this.items.forEach(fn, ctx);
    };
    Collection.prototype.forEachGroup = function (fn, ctx) {
        this.groups.forEach(fn, ctx);
    };
    Collection.prototype.findItem = function (fn, ctx) {
        for (var i = 0; i < this.items.length; i++) {
            if (fn.call(ctx, this.items[i], i, this.items)) {
                return this.items[i];
            }
        }
    };
    Collection.prototype.findGroup = function (fn, ctx) {
        for (var i = 0; i < this.groups.length; i++) {
            if (fn.call(ctx, this.groups[i], i, this.groups)) {
                return this.groups[i];
            }
        }
    };
    Collection.prototype.findAllItems = function (fn, ctx) {
        var retn = [];
        for (var i = 0; i < this.items.length; i++) {
            if (fn.call(ctx, this.items[i], i, this.items)) {
                retn.push(this.items[i]);
            }
        }
        return retn;
    };
    Collection.prototype.findAllGroups = function (fn, ctx) {
        var retn = [];
        for (var i = 0; i < this.groups.length; i++) {
            if (fn.call(ctx, this.groups[i], i, this.groups)) {
                retn.push(this.groups[i]);
            }
        }
        return retn;
    };
    Collection.prototype.everyItem = function (fn, ctx) {
        for (var i = 0; i < this.externalItems.length; i++) {
            if (!fn.call(ctx, this.externalItems[i]))
                return false;
        }
        return true;
    };
    Collection.prototype.everyGroup = function (fn, ctx) {
        for (var i = 0; i < this.externalGroups.length; i++) {
            if (!fn.call(ctx, this.externalGroups[i]))
                return false;
        }
        return true;
    };
    return Collection;
})(event_1.EventEmitter);
exports.Collection = Collection;
function NullFilter() {
    return true;
}
