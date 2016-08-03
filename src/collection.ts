import * as FastArray from './fast_array';
import {EventEmitter} from './event';
import {DataSource} from './data_source';
import {Debouncer} from './util';

enum GroupActivation {
    BecameActive = 1 << 0,
    BecameInactive = 1 << 1,
    DidNotChange = 1 << 2,
    DidNotActivate = BecameInactive | DidNotChange,
    DidNotDeactivate = BecameActive | DidNotChange
}

interface IActionItem {
    item : any,
    newItem? : any,
    action: AsyncAction
}
//refresh will be manual, data source does it automatically
//add record / remove record wont trigger a refresh
//data source will call refresh in a debounced way on add / change / remove
//changing any of the options will refresh synchronously
enum AsyncAction {
    Add = 1 << 0,
    Remove = 1 << 1,
    Change = 1 << 2
}

export interface ICollectionOptions {
    createdGroupOptions?: ICollectionOptions,
    sortItemsBy?: (a : any, b : any) => number,
    sortGroupsBy?: (a : Collection, b : Collection) => number,
    groupItemsBy?: ((a : any) => string)|string,
    filterItemsBy?: (a : any) => boolean,
    filterGroupsBy?: (a : Collection) => boolean,
    itemPageSize? : number,
    groupPageSize? : number,
    groupClass? : typeof Collection,
    synchronous?: boolean
}

export var Event_Destroyed = 'destroyed';
export var Event_ItemAdded = 'itemAdded';
export var Event_ItemRemoved = 'itemRemoved';
export var Event_ItemChanged = 'itemChanged';
export var Event_GroupCreated = 'groupCreated';
export var Event_GroupDestroyed = 'groupDestroyed';
export var Event_GroupBecameActive = 'groupBecameActive';
export var Event_GroupBecameInactive = 'groupBecameInactive';
export var Event_Refresh = 'refresh';

var NullGroupId = '__NONE__';

export class Collection extends EventEmitter {
    public externalItems : Array<any>;
    public externalGroups : Array<Collection>;

    protected pagedItems : Array<any>;
    protected pagedGroups : Array<Collection>;
    protected internalItems : Map<any, string>;

    protected itemSortFn : (a : any, b : any) => number;
    protected groupSortFn : (a : Collection, b : Collection) => number;
    protected itemFilterFn : (a : any) => boolean;
    protected groupFilterFn : (a : Collection) => boolean;
    protected getGroupIdFn : (a : any) => string;

    protected itemPageNumber : number;
    protected itemPageSize : number;
    protected groupPageNumber : number;
    protected groupPageSize : number;

    private changeList : Array<IActionItem>;
    public isActive : boolean;
    public id : string;
    protected groupMap : Map<string, Collection>;
    protected refreshDebouncer : Debouncer;
    protected createdGroupOptions : ICollectionOptions;
    protected groupClass : typeof Collection;

    constructor(initArrayOrOptions? : Array<any>|ICollectionOptions, options? : ICollectionOptions) {
        super();
        var initArray : Array<any> = null;
        if (Array.isArray(initArrayOrOptions)) {
            initArray = (<any[]>initArrayOrOptions).slice(0);
        }
        else {
            initArray = [];
            options = <ICollectionOptions>initArrayOrOptions;
        }
        this.externalItems = initArray;
        this.externalGroups = [];
        this.internalItems = new Map<any, string>();
        this.pagedGroups = [];
        this.pagedItems = [];
        this.changeList = [];
        this.itemPageNumber = -1;
        this.itemPageSize = 10;
        this.groupPageNumber = -1;
        this.groupPageSize = 10;
        this.isActive = true;
        this.groupMap = new Map<string, Collection>();
        this.id = null;
        this.itemFilterFn = NullFilter;
        this.groupFilterFn = NullFilter;
        this.refreshDebouncer = new Debouncer(this.refresh, this, 200);
        this.groupClass = Collection;
        this.setOptions(options);
    }

    public get idString() : string {
        return this.id;
    }

    public get items() : Array<any> {
        if (this.itemPageNumber !== -1) {
            return this.pagedItems;
        }
        else {
            return this.externalItems;
        }
    }

    public get groups() : Array<Collection> {
        if (this.groupPageNumber !== -1) {
            return this.pagedGroups;
        }
        else {
            return this.externalGroups;
        }
    }

    public get itemsPaged() : boolean {
        return this.itemPageNumber !== -1;
    }

    public get groupsPaged() : boolean {
        return this.groupPageNumber !== -1;
    }

    public get isGrouped() : boolean {
        return this.getGroupIdFn !== null;
    }

    public get itemPageCount() : number {
        if (this.itemPageSize <= 0) return -1;
        var raw = this.externalItems.length / this.itemPageSize;
        if (~~(raw) === raw) {
            return raw;
        } else {
            return ~~(raw) + 1
        }
    }

    public get groupPageCount() : number {
        if (this.groupPageSize <= 0) return -1;
        var raw = this.externalGroups.length / this.groupPageSize;
        if (~~(raw) === raw) {
            return raw;
        } else {
            return ~~(raw) + 1
        }
    }

    public get currentItemPageNumber() : number {
        return this.itemPageNumber;
    }

    public get currentGroupPageNumber() : number {
        return this.groupPageNumber;
    }

    public get itemCount() : number {
        return this.items.length;
    }

    public get groupCount() : number {
        return this.groups.length;
    }

    public setOptions(options : ICollectionOptions) : void {
        if (!options) return;
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
    }

    public refresh() : void {
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
        this.emit(Event_Refresh);
    }

    public setRefreshDebounceTime(debounceTime : number) : void {
        this.groupMap.forEach(function (group : Collection) {
            group.refreshDebouncer.reset(debounceTime);
        });
        this.refreshDebouncer.reset(debounceTime);
    }

    public pageGroups(pageNumber : number, pageSize : number) : void {
        if (pageSize <= 0) pageSize = 1;
        this.groupPageSize = pageSize;
        if (pageNumber <= 0) pageNumber = 1;
        this.groupPageNumber = pageNumber;
        this.refreshGroupPaging();
    }

    public setGroupPageNumber(number : number) : void {
        if (number <= 0) number = 1;
        this.groupPageNumber = number;
        this.refreshGroupPaging();
    }

    public setGroupPageSize(pageSize : number) : void {
        if (pageSize <= 0) {
            pageSize = 1;
        }
        this.groupPageSize = pageSize;
        if (this.groupPageNumber === -1) {
            this.groupPageNumber = 1;
        }
        this.refreshGroupPaging();
    }

    public nextGroupPage() : void {
        this.setGroupPageNumber(this.groupPageNumber + 1);
    }

    public previousGroupPage() : void {
        this.setGroupPageNumber(this.groupPageNumber - 1);
    }

    public pageItems(pageNumber : number, pageSize : number) : void {
        if (pageSize <= 0) pageSize = 1;
        this.itemPageSize = pageSize;
        if (pageNumber <= 0) pageNumber = 1;
        this.itemPageNumber = pageNumber;
        this.refreshItemPaging();
    }

    public unpageItems() : void {
        this.itemPageNumber = -1;
    }

    public setItemPageSize(size : number) : void {
        if (size <= 0) {
            size = 1;
        }
        this.itemPageSize = size;
        if (this.itemPageNumber === -1) {
            this.itemPageNumber = 1;
        }
        this.refreshItemPaging();
    }

    public setItemPageNumber(number : number) : void {
        if (number <= 0) number = 1;
        this.itemPageNumber = number;
        this.refreshItemPaging();
    }

    public nextItemPage() : void {
        this.setItemPageNumber(this.itemPageNumber + 1);
    }

    public previousItemPage() : void {
        this.setItemPageNumber(this.itemPageNumber - 1);
    }

    public getGroupById(id : string) : Collection {
        return this.groupMap.get(id);
    }

    public add(item : any) : void {
        this.changeList.push({ action: AsyncAction.Add, item: item });
        this.refreshDebouncer.bounce();
    }

    public addArray(items : Array<any>) : void {
        if (!Array.isArray(items))return;
        for (var i = 0; i < items.length; i++) {
            this.add(items[i]);
        }
    }

    public change(item : any, newItem? : any) : void {
        this.changeList.push({ action: AsyncAction.Change, item: item, newItem: newItem });
        this.refreshDebouncer.bounce();
    }

    public changeArray(items : Array<any>) : void {
        if (!Array.isArray(items))return;
        for (var i = 0; i < items.length; i++) {
            this.change(items[i]);
        }
    }

    public remove(item : any) : void {
        this.changeList.push({ action: AsyncAction.Remove, item: item });
        this.refreshDebouncer.bounce();
    }

    public removeArray(items : Array<any>) : void {
        if (!Array.isArray(items))return;
        for (var i = 0; i < items.length; i++) {
            this.remove(items[i]);
        }
    }

    public filterItemsBy(itemFilterFn : (a : any) => boolean) : void {
        var previousItemFilter = this.itemFilterFn;
        this.itemFilterFn = itemFilterFn || NullFilter;
        if (this.itemFilterFn === previousItemFilter) return;
        if (this.getGroupIdFn) {
            this.refreshItemFilter_Grouped();
        }
        else {
            this.refreshItemFilters_Ungrouped();
        }
        this.refreshDebouncer.bounce();
    }

    public filterGroupsBy(groupFilterFn : (a : Collection) => boolean) : void {
        if (!groupFilterFn) {
            groupFilterFn = NullFilter;
        }
        this.groupFilterFn = groupFilterFn;
        this.refreshDebouncer.bounce();
    }

    public sortItemsBy(itemSortFn : (a : any, b : any) => number) : void {
        if (itemSortFn && this.groupSortFn) {
            this.itemSortFn = (a : any, b : any) : number => {
                var group1 = this.groupMap.get(this.getGroupIdFn(a));
                var group2 = this.groupMap.get(this.getGroupIdFn(b));
                return this.groupSortFn(group1, group2) || itemSortFn(a, b);
            };
        }
        else if (!itemSortFn && this.groupSortFn) {
            this.itemSortFn = (a : any, b : any) : number => {
                var group1 = this.groupMap.get(this.getGroupIdFn(a));
                var group2 = this.groupMap.get(this.getGroupIdFn(b));
                return this.groupSortFn(group1, group2);
            };
        }
        else {
            this.itemSortFn = itemSortFn;
        }
        this.refreshDebouncer.bounce();
    }

    public sortGroupsBy(groupSortFn : (a : Collection, b : Collection) => number) : void {
        this.groupSortFn = groupSortFn;
        this.refreshDebouncer.bounce();
    }

    public groupItemsBy(groupingFn : ((a : any) => string)|string) : void {
        if (typeof groupingFn === "function") {
            this.getGroupIdFn = function (item : any) {
                return groupingFn(item) || NullGroupId;
            }
        }
        else if (typeof groupingFn === "string") {
            this.getGroupIdFn = function (item : any) : string {
                return item[groupingFn] || NullGroupId;
            }
        }
        else {
            this.getGroupIdFn = null;
            this.groupSortFn = null;
            this.groupFilterFn = NullFilter;
        }

        this.regenerateGroups();
        this.sortItemsBy(this.itemSortFn); //item sort can rely on group
        this.refreshDebouncer.bounce();
    }

    //still wants to be async because group sort / page / filter operations can be expensive to do excessively
    protected handleAsyncAdd(item : any) : void {
        var groupId = (this.getGroupIdFn && this.getGroupIdFn(item)) || NullGroupId;
        if (this.internalItems.get(item)) return;
        this.internalItems.set(item, groupId);
        var passed = this.itemFilterFn(item);
        if (passed) {
            this.externalItems.push(item);
        }
        this.emit(Event_ItemAdded, item, passed);
        if (this.getGroupIdFn && passed) {
            this.getGroup(item).add(item);
        }
    }

    protected handleAsyncChange(item : any, newItem? : any) : void {
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
        this.emit(Event_ItemChanged, item, newItem, passed);
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
    }

    protected handleAsyncRemove(item : any) : void {
        var groupId = this.internalItems.get(item);
        this.internalItems.delete(item);
        if (FastArray.Remove(this.externalItems, item) !== -1) {
            var group = this.groupMap.get(groupId);
            if (group) {
                group.remove(item);
            }
        }
        if (groupId) {
            this.emit(Event_ItemRemoved, item);
        }
    }

    protected refreshGroups() : void {
        this.externalGroups = [];
        var processed = new Map<Collection, boolean>();
        this.groupMap.forEach(function (group : Collection, key : string) {
            if (processed.get(group)) {
                return;
            }
            processed.set(group, true);
            group.refresh();
            if (group.internalItems.size === 0) {
                this.groupMap.delete(key);
                this.emit(Event_GroupDestroyed, group);
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
    }

    private emitGroupActivityChangeEvents(group : Collection) : GroupActivation {
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
    }

    protected getGroup(item : any) : Collection {
        var groupId = this.getGroupIdFn(item) || NullGroupId;
        var group = this.groupMap.get(groupId);
        if (!group) {
            group = new (this.groupClass)(this.createdGroupOptions);
            group.id = groupId;
            group.isActive = this.groupFilterFn(group);
            this.internalItems.set(item, groupId);
            this.groupMap.set(groupId, group);
            this.emit(Event_GroupCreated, group);
        }
        return group;
    }

    public clear() : void {
        if (this.hasListeners(Event_ItemRemoved)) {
            this.internalItems.forEach(function (value : string, key : any) {
                this.emit(Event_ItemRemoved, key);
            }, this);
        }

        this.groupMap.forEach(function (group : Collection) {
            group.emit(Event_Destroyed, group);
            group.clear();
            this.emit(Event_GroupDestroyed, group);
        }, this);

        this.groupMap.clear();
        this.externalGroups = [];
        this.internalItems.clear();
        this.externalItems = [];
        this.pagedGroups = [];
        this.pagedItems = [];
        this.emit(Event_GroupBecameInactive);
    }

    // public resetOptions() : void {
    //     //todo implement this
    // }

    protected regenerateGroups() : void {
        this.externalGroups = [];
        this.pagedGroups = [];
        if (!this.getGroupIdFn) {
            this.internalItems.forEach(function (key : string, item : any) {
                this.internalItems.set(item, NullGroupId);
            }, this);
            this.groupMap.clear();
            return;
        }

        this.groupMap.forEach(function (group : Collection) : void {
            group.emit(Event_Destroyed, group);
            group.clear();
            this.emit(Event_GroupDestroyed, group);
        }, this);

        this.groupMap.clear();

        this.internalItems.forEach(function (groupId : string, item : any) {
            this.internalItems.set(item, this.getGroupIdFn(item));
            if (this.itemFilterFn(item)) {
                this.getGroup(item).add(item);
            }
        }, this);

        this.refreshGroups();
        this.refreshSorting();
        this.refreshGroupPaging();
    }

    protected refreshItemFilters_Ungrouped() : void {
        this.externalItems = [];

        this.internalItems.forEach(function (value : string, item : any) {
            if (this.itemFilterFn(item)) {
                this.externalItems.push(item);
            }
        }, this);

        this.refreshSorting();
    }

    //separate function increases chance of vm optimizing this
    //filter changes, groups dont get blown away but may get augmented
    //things wont change groups
    //things that were included but now arent need to be removed from their groups
    //things that were not included but now are need to be added to their groups

    protected refreshItemFilter_Grouped() : void {
        this.externalItems = [];
        this.internalItems.forEach(function (groupId : string, item : any) {
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
    }

    protected refreshSorting() : void {
        if (this.groupSortFn) {
            this.externalGroups.sort(this.groupSortFn);
        }
        if (this.itemSortFn) {
            this.externalItems.sort(this.itemSortFn);
        }
    }

    protected refreshItemPaging() : void {
        if (this.itemPageNumber === -1) return;
        if (this.itemPageNumber === 0) this.itemPageNumber = 1;
        var totalPageCount = this.itemPageCount;
        if (this.itemPageNumber >= totalPageCount) this.itemPageNumber = totalPageCount;
        var startIndex = (this.itemPageNumber - 1) * this.itemPageSize;
        var endIndex = startIndex + this.itemPageSize;
        this.pagedItems = this.externalItems.slice(startIndex, endIndex);
    }

    protected refreshGroupPaging() : void {
        if (this.groupPageNumber === -1) return;
        if (this.groupPageNumber === 0) this.groupPageNumber = 1;
        var totalPageCount = this.groupPageCount;
        if (this.groupPageNumber >= totalPageCount) this.groupPageNumber = totalPageCount;
        var startIndex = (this.groupPageNumber - 1) * this.groupPageSize;
        var endIndex = startIndex + this.groupPageSize;
        this.pagedGroups = this.externalGroups.slice(startIndex, endIndex);
    }

    protected activateGroup(group : Collection) : void {
        group.isActive = true;
        FastArray.SortedInsert(this.externalGroups, group, this.groupSortFn);
        this.emit(Event_GroupBecameActive, group);
    }

    protected deactivateGroup(group : Collection) : void {
        group.isActive = false;
        FastArray.Remove(this.externalGroups, group);
        this.emit(Event_GroupBecameInactive, group);
    }

    //------------------- Array Functions ----------------------//
    public getItemAt(index : number) : any {
        return this.items[index];
    }

    public getGroupAt(index : number) : any {
        return this.groups[index];
    }

    public getUnfilteredItems() : Array<any> {
        var retn : any[] = [];
        this.internalItems.forEach(function (key : string, value : any) {
            retn.push(value);
        });
        return retn;
    }

    public getUnfilteredGroups() : Array<Collection> {
        var processed = new Map<Collection, boolean>();
        var retn : Array<Collection> = [];
        this.groupMap.forEach(function (group : Collection, key : string) {
            if (processed.get(group)) {
                return;
            }
            retn.push(group);
            processed.set(group, true);
        });
        return retn;
    }

    public forEachItem(fn : (item : any, index? : number, collection? : Array<any>) => void, ctx? : any) : void {
        this.items.forEach(fn, ctx);
    }

    public forEachGroup(fn : (group : Collection, index? : number, collection? : Array<Collection>) => void, ctx? : any) : void {
        this.groups.forEach(fn, ctx);
    }

    public findItem(fn : (item : any, index? : number, collection? : Array<any>) => void, ctx? : any) : any {
        for (var i = 0; i < this.items.length; i++) {
            if (fn.call(ctx, this.items[i], i, this.items)) {
                return this.items[i];
            }
        }
    }

    public findGroup(fn : (group : Collection, index? : number, collection? : Array<Collection>) => void, ctx? : any) : Collection {
        for (var i = 0; i < this.groups.length; i++) {
            if (fn.call(ctx, this.groups[i], i, this.groups)) {
                return this.groups[i];
            }
        }
    }

    public findAllItems(fn : (item : any, index? : number, collection? : Array<any>) => void, ctx? : any) : Array<any> {
        var retn : Array<any> = [];
        for (var i = 0; i < this.items.length; i++) {
            if (fn.call(ctx, this.items[i], i, this.items)) {
                retn.push(this.items[i]);
            }
        }
        return retn;
    }

    public findAllGroups(fn : (groups : Collection, index? : number, collection? : Array<Collection>) => void, ctx? : any) : Array<Collection> {
        var retn : Array<Collection> = [];
        for (var i = 0; i < this.groups.length; i++) {
            if (fn.call(ctx, this.groups[i], i, this.groups)) {
                retn.push(this.groups[i]);
            }
        }
        return retn;
    }

    public everyItem(fn : (item : any) => boolean, ctx? : any) : boolean {
        for (var i = 0; i < this.externalItems.length; i++) {
            if (!fn.call(ctx, this.externalItems[i])) return false;
        }
        return true;
    }

    public everyGroup(fn : (group : Collection) => boolean, ctx? : any) : boolean {
        for (var i = 0; i < this.externalGroups.length; i++) {
            if (!fn.call(ctx, this.externalGroups[i])) return false;
        }
        return true;
    }
}

function NullFilter() : boolean {
    return true;
}

export interface Map<K, V> {
    clear(): void;
    delete(key : K): boolean;
    forEach(callbackfn : (value : V, index? : K, map? : Map<K, V>) => void, thisArg? : any): void;
    get(key : K): V;
    has(key : K): boolean;
    set(key : K, value? : V): Map<K, V>;
    size: number;
}

export interface MapConstructor {
    new (): Map<any, any>;
    new <K, V>(): Map<K, V>;
    prototype: Map<any, any>;
}

declare var Map : MapConstructor;