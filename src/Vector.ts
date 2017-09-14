import { Seq } from "./Seq";
import { WithEquality, Ordering, 
         getHashCode, areEqual, toStringHelper } from "./Comparison";
import { HashMap} from "./HashMap";
import { IMap } from "./IMap";
import { Option } from "./Option";
import { HashSet } from "./HashSet";
const hamt: any = require("hamt_plus");

/**
 * A general-purpose list class with all-around good performance.
 * O(1) access, append, prepend.
 * @type T the item type
 */
export class Vector<T> implements Seq<T>, Iterable<T> {
    
    /**
     * @hidden
     */
    protected constructor(private hamt: any, private indexShift: number) {}

    private static readonly emptyVector = new Vector(hamt.make(), 0);

    /**
     * The empty vector.
     * @type T the item type
     */
    static empty<T>(): Vector<T> {
        return <Vector<T>>Vector.emptyVector;
    }
    
    /**
     * Build a vector from any iterable, which means also
     * an array for instance.
     * @type T the item type -- no equality requirement
     */
    static ofIterableStruct<T>(elts: Iterable<T>): Vector<T> {
        return (<Vector<T>>Vector.emptyVector).appendAllStruct(elts);
    }

    /**
     * Build a vector from any iterable, which means also
     * an array for instance.
     * @type T the item type -- equality requirement
     */
    static ofIterable<T>(elts: Iterable<T & WithEquality>): Vector<T> {
        return Vector.ofIterableStruct(elts);
    }

    /**
     * Build a vector from a series of items (any number, as parameters)
     * @type T the item type -- no equality requirement
     */
    static ofStruct<T>(...arr: Array<T>): Vector<T> {
        return Vector.ofIterableStruct(arr);
    }

    /**
     * Build a vector from a series of items (any number, as parameters)
     * @type T the item type -- equality requirement
     */
    static of<T>(...arr: Array<T & WithEquality>): Vector<T> {
        return Vector.ofIterable(arr);
    }
    
    /**
     * Implementation of the Iterator interface.
     */
    [Symbol.iterator](): Iterator<T> {
        let curIdx = 0;
        const hamt = this.hamt;
        return {
            next(): IteratorResult<T> {
                if (curIdx < hamt.size) {
                    return {
                        done: false,
                        value: hamt.get(curIdx++)
                    };
                }
                return { done: true, value: <any>undefined };
            }
        };
    }

    /**
     * Convert to array.
     */
    toArray(): Array<T> {
        let r = [];
        for (let i=0;i<this.hamt.size;i++) {
            r.push(this.hamt.get(i+this.indexShift));
        }
        return r;
    }

    /**
     * Get the size (length) of the collection.
     */
    size(): number {
        return this.hamt.size;
    }

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): boolean {
        return this.hamt.size === 0;
    }

    /**
     * Get the first value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    head(): Option<T> {
        return Option.ofStruct(this.hamt.get(this.indexShift));
    }

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    last(): Option<T> {
        return Option.ofStruct(this.hamt.get(this.hamt.size+this.indexShift-1));
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Option<Vector<T>> {
        return this.isEmpty() ?
            Option.none<Vector<T>>() :
            Option.of(new Vector<T>(
                this.hamt.remove(this.indexShift), this.indexShift+1));
    }

    /**
     * Append an element at the end of the collection.
     * No equality requirements.
     */
    appendStruct(elt: T): Vector<T> {
        return new Vector<T>(this.hamt.set(this.hamt.size+this.indexShift, elt), this.indexShift);
    }

    /**
     * Append an element at the end of the collection.
     * Equality requirements.
     */
    append(elt: T & WithEquality): Vector<T> {
        return this.appendStruct(elt);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * No equality requirements.
     */
    prependStruct(elt: T): Vector<T> {
        const newIndexShift = this.indexShift - 1;
        return new Vector<T>(this.hamt.set(newIndexShift, elt), newIndexShift);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * Equality requirements.
     */
    prepend(elt: T & WithEquality): Vector<T> {
        return this.prependStruct(elt);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     * Equality requirements.
     *
     * This method requires Array.from()
     * You may need to polyfill it =>
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
     */
    prependAll(elts: Iterable<T & WithEquality>): Vector<T> {
        return this.prependAllStruct(elts);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     * No equality requirements.
     *
     * This method requires Array.from()
     * You may need to polyfill it =>
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
     */
    prependAllStruct(elts: Iterable<T>): Vector<T> {
        // could optimize if i'm 100% the other one is a Vector...
        // (no need for in-order get, i can take all the keys in any order)
        //
        // need to transform to an array, because
        // I need the size immediately for the indexShift.
        const eltsAr = Array.from(elts);
        const newIndexShift = this.indexShift - eltsAr.length;
        let hamt = this.hamt;
        for (let i=0;i<eltsAr.length;i++) {
            hamt = hamt.set(newIndexShift+i, eltsAr[i]);
        }
        return new Vector<T>(hamt, newIndexShift);
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fn: (v:T)=>void): void {
        for (let i=0;i<this.hamt.size;i++) {
            fn(this.hamt.get(i+this.indexShift));
        }
    }

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     * No equality requirements.
     */
    appendAllStruct(elts: Iterable<T>): Vector<T> {
        return new Vector<T>(this.hamt.mutate(
            (h:any) => {
                const iterator = elts[Symbol.iterator]();
                let curItem = iterator.next();
                while (!curItem.done) {
                    h.set(h.size+this.indexShift, curItem.value);
                    curItem = iterator.next();
                }
            }), this.indexShift);
    }

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     * Equality requirements.
     */
    appendAll(elts: Iterable<T&WithEquality>): Vector<T> {
        return this.appendAllStruct(elts);
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * No equality requirements.
     */
    mapStruct<U>(mapper:(v:T)=>U): Vector<U> {
        return new Vector<U>(this.hamt.fold(
            (acc: any, v:T & WithEquality, k:number) => acc.set(k-this.indexShift, mapper(v)),
            hamt.empty), 0);
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * Equality requirements.
     */
    map<U>(mapper:(v:T)=>U&WithEquality): Vector<U> {
        return this.mapStruct(mapper);
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(predicate:(v:T)=>boolean): Vector<T> {
        return new Vector<T>(hamt.empty.mutate(
            (h:any) => {
                let outputIdx = 0;
                for (let i=0;i<this.hamt.size;i++) {
                    const item = this.hamt.get(i+this.indexShift);
                    if (predicate(item)) {
                        h.set(outputIdx++, item);
                    }
                }
            }), 0);
    }

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     */
    find(predicate:(v:T)=>boolean): Option<T> {
        for (let i=0;i<this.hamt.size;i++) {
            const item = this.hamt.get(i+this.indexShift);
            if (predicate(item)) {
                return Option.of(item);
            }
        }
        return Option.none<T>();
    }

    /**
     * Returns true if the item is in the collection,
     * false otherwise.
     */
    contains(v:T&WithEquality): boolean {
        return this.anyMatch(curVal => areEqual(curVal, v));
    }
    
    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     * No equality requirement
     */
    flatMapStruct<U>(mapper:(v:T)=>Vector<U>): Vector<U> {
        var r:Array<U> = [];
        for (let i=0;i<this.hamt.size;i++) {
            r = r.concat(mapper(this.hamt.get(i+this.indexShift)).toArray());
        }
        return Vector.ofIterableStruct<U>(r);
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     * Equality requirement
     */
    flatMap<U>(mapper:(v:T)=>Vector<U&WithEquality>): Vector<U> {
        return this.flatMapStruct(mapper);
    }

    /**
     * Reduces the collection to a single value.
     * Left-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs))
     *     => "cba!"
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        let r = zero;
        for (let i=0;i<this.hamt.size;i++) {
            r = fn(r, this.hamt.get(i+this.indexShift));
        }
        return r;
    }

    /**
     * Reduces the collection to a single value.
     * Right-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldRight("!", (x,xs) => xs+x))
     *     => "!cba"
     *
     * @param zero The initial value
     * @param fn A function taking the current collection item and
     *           the previous value , and returning
     *           an updated value.
     */
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        let r = zero;
        for (let i=this.hamt.size-1;i>=0;i--) {
            r = fn(this.hamt.get(i+this.indexShift), r);
        }
        return r;
    }

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     Vector.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    mkString(separator: string): string {
        let r = "";
        for (let i=0;i<this.hamt.size;i++) {
            if (i>0) {
                r += separator;
            }
            r += this.hamt.get(i+this.indexShift).toString();
        }
        return r;
    }

    /**
     * Retrieve the element at index idx.
     * Returns an option because the collection may
     * contain less elements than the index.
     */
    get(idx: number): Option<T> {
        return Option.of(this.hamt.get(idx+this.indexShift));
    }

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): Vector<T> {
        if (n>=this.hamt.size) {
            return <Vector<T>>Vector.emptyVector;
        }
        return new Vector<T>(this.hamt.fold(
            (h:any,v:T,k:number) => (k-this.indexShift>=n) ?
                h.set(k-this.indexShift-n, v) : h,
            hamt.make()), 0);
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Vector<T> {
        let h = hamt.make();
        let skip = true;
        let newIdx = 0;
        for (let i=0;i<this.hamt.size;i++) {
            const v = this.hamt.get(i+this.indexShift);
            if (skip && !predicate(v)) {
                skip = false;
            }
            if (!skip) {
                h = h.set(newIdx++, v);
            }
        }
        return new Vector<T>(h, 0);
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate:(x:T)=>boolean): Vector<T> {
        let h = hamt.make();
        let newIdx = 0;
        for (let i=0;i<this.hamt.size;i++) {
            const v = this.hamt.get(i+this.indexShift);
            if (!predicate(v)) {
                break;
            }
            h = h.set(newIdx++, v);
        }
        return new Vector<T>(h, 0);
    }

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): Vector<T> {
        const sz = this.hamt.size;
        if (n>=sz) {
            return <Vector<T>>Vector.emptyVector;
        }
        return new Vector<T>(this.hamt.fold(
            (h:any,v:T,k:number) => (sz-k+this.indexShift>n) ?
                h.set(k-this.indexShift, v) : h,
            hamt.make()), 0);
    }

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(v:T)=>boolean): boolean {
        const iterator: Iterator<T> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (!predicate(curItem.value)) {
                return false;
            }
            curItem = iterator.next();
        }
        return true;
    }

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    anyMatch(predicate:(v:T)=>boolean): boolean {
        const iterator: Iterator<T> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (predicate(curItem.value)) {
                return true;
            }
            curItem = iterator.next();
        }
        return false;
    }

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Vector<T> {
        return Vector.ofIterableStruct<T>(this.toArray().sort(compare));
    }

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     */
    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,Vector<T>> {
        return this.hamt.fold(
            (acc: HashMap<C,Vector<T>>, v:T & WithEquality, k:number) =>
                acc.putWithMerge(
                    classifier(v), Vector.of(v),
                    (v1:Vector<T&WithEquality>,v2:Vector<T&WithEquality>)=>v1.appendAll(v2)), HashMap.empty());
    }

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     * Equality requirements.
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V & WithEquality]): IMap<K,V> {
        return this.toMapStruct(converter);
    }

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     * No equality requirements.
     */
    toMapStruct<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V> {
        return this.hamt.fold(
            (acc: HashMap<K,V>, value:T, k:number) => {
                const converted = converter(value);
                return acc.putStruct(converted[0], converted[1]);
            }, HashMap.empty());
    }

    /**
     * Combine this collection with the collection you give in
     * parameter to produce a new collection which combines both,
     * in pairs. For instance:
     *
     *     Vector.of(1,2,3).zip(["a","b","c"])
     *     => Vector.of([1,"a"], [2,"b"], [3,"c"])
     *
     * The result collection will have the length of the shorter
     * of both collections. Extra elements will be discarded.
     * No equality requirements.
     */
    zipStruct<U>(other: Iterable<U>): Vector<[T,U]> {
        return new Vector<[T,U]>(hamt.empty.mutate(
            (h:any) => {
                let i = 0;
                const thisIterator = this[Symbol.iterator]();
                const otherIterator = other[Symbol.iterator]();
                let thisCurItem = thisIterator.next();
                let otherCurItem = otherIterator.next();

                while (!thisCurItem.done && !otherCurItem.done) {
                    h.set(i++, [thisCurItem.value, otherCurItem.value]);
                    thisCurItem = thisIterator.next();
                    otherCurItem = otherIterator.next();
                }
            }), 0);
    }

    /**
     * Combine this collection with the collection you give in
     * parameter to produce a new collection which combines both,
     * in pairs. For instance:
     *
     *     Vector.of(1,2,3).zip("a","b","c")
     *     => Vector.of([1,"a"], [2,"b"], [3,"c"])
     *
     * The result collection will have the length of the shorter
     * of both collections. Extra elements will be discarded.
     * Equality requirements.
     */
    zip<U>(other: Iterable<U&WithEquality>): Vector<[T,U]> {
        return this.zipStruct(other);
    }

    /**
     * Reverse the collection. For instance:
     *
     *     [1,2,3] => [3,2,1]
     */
    reverse(): Vector<T> {
        const sz = this.hamt.size;
        return new Vector<T>(this.hamt.fold(
            (h:any,v:T,k:number) => h.set(sz-1-k+this.indexShift, v),
            hamt.make()), 0);
    }

    /**
     * Returns a pair of two collections; the first one
     * will only contain the items from this collection for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     Vector.of(1,2,3,4).partition(x => x%2===0)
     *     => [[2,4],[1,3]]
     */
    partition(predicate:(x:T)=>boolean): [Vector<T>,Vector<T>] {
        let i1 = 0, i2 = 0;
        let r: any = [null,null];
        hamt.empty.mutate(
            (hamt1:any) =>
                hamt.empty.mutate((hamt2:any) => {
                    let i1 = 0, i2 = 0;
                    for (let i=0;i<this.hamt.size;i++) {
                        const val = this.hamt.get(i+this.indexShift);
                        if (predicate(val)) {
                            hamt1.set(i1++, val);
                        } else {
                            hamt2.set(i2++, val);
                        }
                    }

                    r[0] = new Vector<T>(hamt1,0);
                    r[1] = new Vector<T>(hamt2,0);
                }));
        return r;
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Vector.of(1,1,2,3,2,3,1).distinctBy(x => x)
     *     => [1,2,3]
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Vector<T> {
        let keySet = HashSet.empty<U>();
        return new Vector<T>(hamt.empty.mutate(
            (h:any) => {
                let targetIdx = 0;
                for (let i=0;i<this.hamt.size;i++) {
                    const val = this.hamt.get(i+this.indexShift);
                    const transformedVal = keyExtractor(val);
                    if (!keySet.contains(transformedVal)) {
                        h.set(targetIdx++, val);
                        keySet = keySet.add(transformedVal);
                    }
                }
            }), 0);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: Vector<T>): boolean {
        if (!other || !other.hamt) {
            return false;
        }
        const sz = this.hamt.size;
        if (sz !== other.hamt.size) {
            return false;
        }
        for (let i=0;i<this.hamt.size;i++) {
            const myVal: T & WithEquality|null|undefined = this.hamt.get(i+this.indexShift);
            const hisVal: T & WithEquality|null|undefined = other.hamt.get(i+other.indexShift);
            if ((myVal === undefined) !== (hisVal === undefined)) {
                return false;
            }
            if (myVal === undefined || hisVal === undefined) {
                // they are both undefined, the || is for TS's flow analysis
                // so he realizes none of them is undefined after this.
                continue;
            }
            if (!areEqual(myVal, hisVal)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        let hash = 1;
        for (let i=0;i<this.hamt.size;i++) {
            hash = 31 * hash + getHashCode(this.hamt.get(i+this.indexShift));
        }
        return hash;
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        let r = "[";
        for (let i=0;i<this.hamt.size;i++) {
            if (i>0) {
                r += ", ";
            }
            r += toStringHelper(this.hamt.get(i+this.indexShift));
        }
        return r + "]";
    }

    /**
     * Used by the node REPL to display values.
     * Most of the time should be the same as toString()
     */
    inspect(): string {
        return this.toString();
    }
}
