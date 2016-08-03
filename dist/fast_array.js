function Allocate(size) {
    if (size === void 0) { size = 25; }
    return new Array(size);
}
exports.Allocate = Allocate;
function Copy(array, start, end) {
    var copy = new Array(end - start);
    for (var i = start; i < end; i++) {
        copy[i] = array[i];
    }
    return copy;
}
exports.Copy = Copy;
function CopyInto(dest, src, destStartIndex) {
    if (destStartIndex === void 0) { destStartIndex = 0; }
    for (var i = 0; i < src.length; i++) {
        dest[destStartIndex + i] = src[i];
    }
    return destStartIndex + src.length;
}
exports.CopyInto = CopyInto;
//export function SortedInsert(array : Array<any>, item : any, sortFn : SortFn) : number {
//    var index = findSortedInsertIndex(array, item, sortFn);
//    InsertAt(array, item, index);
//    return index;
//}
function Sort(array, sortFn) {
    for (var i = 0; i < array.length; i++) {
        var value = array[i];
        for (var j = i - 1; j > -1 && sortFn(array[j], value) < 0; j--) {
            array[j + 1] = array[j];
        }
        array[j + 1] = value;
    }
}
exports.Sort = Sort;
function IndexOf(array, item) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === item)
            return i;
    }
    return -1;
}
exports.IndexOf = IndexOf;
function IndexOfId(array, id) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            return i;
        }
    }
    return -1;
}
exports.IndexOfId = IndexOfId;
function FindById(array, id) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            return array[i];
        }
    }
    return null;
}
exports.FindById = FindById;
function Remove(array, item) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === item) {
            break;
        }
    }
    if (i === array.length)
        return -1;
    while (i < array.length) {
        array[i] = array[i + 1];
        i++;
    }
    array.length--;
    return i;
}
exports.Remove = Remove;
function RemoveById(array, id) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            break;
        }
    }
    if (i === array.length)
        return -1;
    while (i < array.length) {
        array[i] = array[i + 1];
        i++;
    }
    array.length--;
    return i;
}
exports.RemoveById = RemoveById;
function RemoveAt(array, index) {
    var length = array.length;
    while (index < length) {
        array[index] = array[index + 1];
        index++;
    }
    array.length--;
}
exports.RemoveAt = RemoveAt;
function InsertAt(array, item, index) {
    for (var i = array.length - 1; i >= index - 1; i--) {
        array[i + 1] = array[i];
    }
    array[index] = item;
}
exports.InsertAt = InsertAt;
//todo this is untested and doesnt work
function InsertManyAt(array, items, startIndex) {
    var spaces = items.length;
    for (var i = array.length - 1; i >= startIndex - 1; i--) {
        array[i + spaces] = array[i];
    }
    for (i = 0; i < items.length; i++) {
        array[i + spaces] = items[i];
    }
}
exports.InsertManyAt = InsertManyAt;
function findSortedInsertIndex(array, item, sortFn) {
    for (var i = 0; i < array.length; i++) {
        //if newRecord is smaller than record at i, found insertion point
        if (sortFn(item, array[i]) > 0) {
            return i;
        }
    }
    return i;
}
function SortedInsert(array, element, sortFn) {
    if (!sortFn) {
        array.push(element);
        return array.length - 1;
    }
    var index = BinaryIndexOf(array, element, sortFn);
    if (index < 0)
        index = ~index;
    InsertAt(array, element, index);
    return index;
}
exports.SortedInsert = SortedInsert;
//obviously only works for already sorted arrays
function BinaryIndexOf(array, element, sortFn) {
    var minIndex = 0;
    var maxIndex = array.length - 1;
    var currentIndex;
    var currentElement;
    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) >> 1;
        currentElement = array[currentIndex];
        var result = sortFn(currentElement, element);
        if (result > 0) {
            minIndex = currentIndex + 1;
        }
        else if (result < 0) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }
    return ~maxIndex;
}
exports.BinaryIndexOf = BinaryIndexOf;
