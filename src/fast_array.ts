export type SortFn = (a : any, b : any) => number;

export function Allocate(size : number = 25) : Array<any> {
    return new Array(size);
}

export function Copy(array : Array<any>, start : number, end : number) : Array<any> {
    var copy = new Array(end - start);
    for (var i = start; i < end; i++) {
        copy[i] = array[i];
    }
    return copy;
}

export function CopyInto(dest : Array<any>, src : Array<any>, destStartIndex : number = 0) : number {
    for (var i = 0; i < src.length; i++) {
        dest[destStartIndex + i] = src[i];
    }
    return destStartIndex + src.length;
}

//export function SortedInsert(array : Array<any>, item : any, sortFn : SortFn) : number {
//    var index = findSortedInsertIndex(array, item, sortFn);
//    InsertAt(array, item, index);
//    return index;
//}

export function Sort(array : Array<any>, sortFn : (a : any, b : any) => number) : void {

    for (var i = 0; i < array.length; i++) {
        var value = array[i];

        for (var j = i - 1; j > -1 && sortFn(array[j], value) < 0; j--) {
            array[j + 1] = array[j];
        }
        array[j + 1] = value;
    }
}

export function IndexOf(array : Array<any>, item : any) : number {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === item) return i;
    }
    return -1;
}

export function IndexOfId(array : Array<any>, id : string) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            return i;
        }
    }
    return -1;
}

export function FindById(array : Array<any>, id : string) : any {
    for (var i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            return array[i];
        }
    }
    return null;
}

export function Remove(array : Array<any>, item : any) : number {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === item) {
            break;
        }
    }

    if (i === array.length) return -1;

    while (i < array.length) {
        array[i] = array[i + 1];
        i++;
    }
    array.length--;
    return i
}

export function RemoveById(array : Array<any>, id : string) : number {
    for (var i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            break;
        }
    }

    if (i === array.length) return -1;

    while (i < array.length) {
        array[i] = array[i + 1];
        i++;
    }
    array.length--;
    return i
}

export function RemoveAt(array : Array<any>, index : number) : void {
    var length = array.length;
    while (index < length) {
        array[index] = array[index + 1];
        index++;
    }
    array.length--;

}

export function InsertAt(array : Array<any>, item : any, index : number) : void {
    for (var i = array.length - 1; i >= index - 1; i--) {
        array[i + 1] = array[i];
    }
    array[index] = item;
}

//todo this is untested and doesnt work
export function InsertManyAt(array : Array<any>, items : Array<any>, startIndex : number) : void {
    var spaces = items.length;
    for (var i = array.length - 1; i >= startIndex - 1; i--) {
        array[i + spaces] = array[i];
    }
    for (i = 0; i < items.length; i++) {
        array[i + spaces] = items[i];
    }
}

function findSortedInsertIndex(array : Array<any>, item : any, sortFn : (a : any, b : any)=>number) : number {
    for (var i = 0; i < array.length; i++) {
        //if newRecord is smaller than record at i, found insertion point
        if (sortFn(item, array[i]) > 0) {
            return i;
        }
    }
    return i
}

export function SortedInsert(array : Array<any>, element : any, sortFn : any) : number {
    if (!sortFn) {
        array.push(element);
        return array.length - 1;
    }
    var index = BinaryIndexOf(array, element, sortFn);
    if (index < 0) index = ~index;
    InsertAt(array, element, index);
    return index;
}

//obviously only works for already sorted arrays
export function BinaryIndexOf(array : Array<any>, element : any, sortFn : (a : any, b : any) => number) : number {
    var minIndex = 0;
    var maxIndex = array.length - 1;
    var currentIndex : number;
    var currentElement : number;

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
