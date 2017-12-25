/**
 * A sequence of values, organized in-memory as a strict linked list.
 * Each element has an head (value) and a tail (the rest of the list).
 *
 * The code is organized through the class [[EmptyLinkedList]] (empty list
 * or tail), the class [[ConsLinkedList]] (list value and pointer to next),
 * and the type alias [[LinkedList]] (empty or cons).
 *
 * Finally, "static" functions on Option are arranged in the class
 * [[LinkedListStatic]] and are accessed through the global constant LinkedList.
 *
 * Random access is expensive, appending is expensive, prepend or getting
 * the tail of the list is very cheap.
 * If you often need random access you should rather use [[Vector]].
 * Avoid appending at the end of the list in a loop, prefer prepending and
 * then reversing the list.
 *
 * Examples:
 *
 *     LinkedList.of(1,2,3);
 *     LinkedList.of(1,2,3).map(x => x*2).last();
 */
import { Option, Some, None } from "./Option";
import { Vector } from "./Vector";
import { WithEquality, getHashCode,
         areEqual, Ordering } from "./Comparison";
import { contractTrueEquality } from "./Contract";
import { Value } from "./Value";
import { IMap } from "./IMap";
import { HashMap } from "./HashMap";
import { ISet } from "./ISet";
import { HashSet } from "./HashSet";
import { Seq } from "./Seq";
import * as SeqHelpers from "./SeqHelpers";

/**
 * Holds the "static methods" for [[LinkedList]]
 */
export class LinkedListStatic {
    /**
     * The empty stream
     */
    empty<T>(): LinkedList<T> {
        return <EmptyLinkedList<T>>emptyLinkedList;
    }

    /**
     * Create a LinkedList with the elements you give.
     */
    of<T>(elt:T,...elts:T[]): ConsLinkedList<T> {
        return new ConsLinkedList(elt, LinkedList.ofIterable(elts));
    }

    /**
     * Build a stream from any iterable, which means also
     * an array for instance.
     * @param T the item type
     */
    ofIterable<T>(elts: Iterable<T>): LinkedList<T> {
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        let result: LinkedList<T> = <EmptyLinkedList<T>>emptyLinkedList;
        while (!curItem.done) {
            result = new ConsLinkedList(curItem.value, result);
            curItem = iterator.next();
        }
        return result.reverse();
    }

    /**
     * Dual to the foldRight function. Build a collection from a seed.
     * Takes a starting element and a function.
     * It applies the function on the starting element; if the
     * function returns None, it stops building the list, if it
     * returns Some of a pair, it adds the first element to the result
     * and takes the second element as a seed to keep going.
     *
     *     LinkedList.unfoldRight(
     *          10, x=>Option.of(x)
     *              .filter(x => x!==0)
     *              .map<[number,number]>(x => [x,x-1]))
     *     => LinkedList.of(10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
     */
    unfoldRight<T,U>(seed: T, fn: (x:T)=>Option<[U,T]>): LinkedList<U> {
        let nextVal = fn(seed);
        let result = <LinkedList<U>><EmptyLinkedList<U>>emptyLinkedList;
        while (!nextVal.isNone()) {
            result = new ConsLinkedList(
                nextVal.get()[0],
                result);
            nextVal = fn(nextVal.get()[1]);
        }
        return result.reverse();
    }
}

/**
 * The LinkedList constant allows to call the LinkedList "static" methods
 */
export const LinkedList = new LinkedListStatic();

/**
 * A LinkedList is either [[EmptyLinkedList]] or [[ConsLinkedList]]
 * "static methods" available through [[LinkedListStatic]]
 * @param T the item type
 */
export type LinkedList<T> = EmptyLinkedList<T> | ConsLinkedList<T>;

/**
 * EmptyLinkedList is the empty linked list; every non-empty
 * linked list also has a pointer to an empty linked list
 * after its last element.
 * "static methods" available through [[LinkedListStatic]]
 * @param T the item type
 */
export class EmptyLinkedList<T> implements Seq<T> {

    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        return SeqHelpers.seqHasTrueEquality<T>(this);
    }

    /**
     * Implementation of the Iterator interface.
     */
    [Symbol.iterator](): Iterator<T> {
        return {
            next(): IteratorResult<T> {
                return {
                    done: true,
                    value: <any>undefined
                };
            }
        }
    }

    /**
     * @hidden
     */
    readonly className: "EmptyLinkedList";  // https://stackoverflow.com/a/47841595/516188

    /**
     * View this Some a as LinkedList. Useful to help typescript type
     * inference sometimes.
     */
    asLinkedList(): LinkedList<T> {
        return this;
    }

    /**
     * Get the length of the collection.
     */
    length(): number {
        return 0;
    }

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<T> {
        return Option.none<T>();
    }

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): this is EmptyLinkedList<T> {
        return true;
    }

    /**
     * Get the first value of the collection, if any.
     * In this case the list is empty, so returns Option.none
     */
    head(): None<T> {
        return <None<T>>Option.none<T>();
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Option<LinkedList<T>> {
        return Option.none<LinkedList<T>>();
    }

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    last(): Option<T> {
        return Option.none<T>();
    }

    /**
     * Retrieve the element at index idx.
     * Returns an option because the collection may
     * contain less elements than the index.
     *
     * Careful this is going to have poor performance
     * on LinkedList, which is not a good data structure
     * for random access!
     */
    get(idx: number): Option<T> {
        return Option.none<T>();
    }

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     */
    find(predicate:(v:T)=>boolean): Option<T> {
        return Option.none<T>();
    }

    /**
     * Returns true if the item is in the collection,
     * false otherwise.
     */
    contains(v:T&WithEquality): boolean {
        return false;
    }

    /**
     * Return a new stream keeping only the first n elements
     * from this stream.
     */
    take(n: number): LinkedList<T> {
        return this;
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate: (x:T)=>boolean): LinkedList<T> {
        return this;
    }

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): LinkedList<T> {
        return this;
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): LinkedList<T> {
        return this;
    }

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): LinkedList<T> {
        return this;
    }

    /**
     * Reduces the collection to a single value using the
     * associative binary function you give. Since the function
     * is associative, order of application doesn't matter.
     *
     * Example:
     *
     *     LinkedList.of(1,2,3).fold(0, (a,b) => a + b);
     *     => 6
     */
    fold(zero:T, fn:(v1:T,v2:T)=>T): T {
        return zero;
    }

    /**
     * Reduces the collection to a single value.
     * Left-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs);
     *     => "cba!"
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        return zero;
    }

    /**
     * Reduces the collection to a single value.
     * Right-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldRight("!", (x,xs) => xs+x);
     *     => "!cba"
     *
     * @param zero The initial value
     * @param fn A function taking the current collection item and
     *           the previous value , and returning
     *           an updated value.
     */
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return zero;
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
     */
    zip<U>(other: Iterable<U>): LinkedList<[T,U]> {
        return <EmptyLinkedList<[T,U]>>emptyLinkedList;
    }

    /**
     * Combine this collection with the index of the elements
     * in it. Handy if you need the index when you map on
     * the collection for instance:
     *
     *     LinkedList.of("a","b").zipWithIndex().map(([v,idx]) => v+idx);
     *     => LinkedList.of("a0", "b1")
     */
    zipWithIndex(): LinkedList<[T,number]> {
        return <EmptyLinkedList<[T,number]>><any>this;
    }

    /**
     * Reverse the collection. For instance:
     *
     *     LinkedList.of(1,2,3).reverse();
     *     => LinkedList.of(3,2,1)
     */
    reverse(): LinkedList<T> {
        return this;
    }

    /**
     * Takes a predicate; returns a pair of collections.
     * The first one is the longest prefix of this collection
     * which satisfies the predicate, and the second collection
     * is the remainder of the collection.
     *
     *    LinkedList.of(1,2,3,4,5,6).span(x => x <3)
     *    => [LinkedList.of(1,2), LinkedList.of(3,4,5,6)]
     */
    span(predicate:(x:T)=>boolean): [LinkedList<T>,LinkedList<T>] {
        return [this, this];
    }

    /**
     * Split the collection at a specific index.
     *
     *     LinkedList.of(1,2,3,4,5).splitAt(3)
     *     => [LinkedList.of(1,2,3), LinkedList.of(4,5)]
     */
    splitAt(index:number): [LinkedList<T>,LinkedList<T>] {
        return [this, this];
    }

    /**
     * Returns a pair of two collections; the first one
     * will only contain the items from this collection for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     LinkedList.of(1,2,3,4).partition(x => x%2===0)
     *     => [LinkedList.of(2,4),LinkedList.of(1,3)]
     */
    partition(predicate:(x:T)=>boolean): [LinkedList<T>,LinkedList<T>] {
        return [LinkedList.empty<T>(), LinkedList.empty<T>()];
    }

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[LinkedList.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C & WithEquality): HashMap<C,LinkedList<T>> {
        return HashMap.empty<C,LinkedList<T>>();
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[LinkedList.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<HashMap<K,T>> {
        return SeqHelpers.arrangeBy<T,K>(this, getKey);
    }

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): LinkedList<T> {
        return this;
    }

    /**
     * Append an element at the end of this LinkedList.
     * Warning: appending in a loop on a linked list is going
     * to be very slow!
     */
    append(v:T): LinkedList<T> {
        return LinkedList.of(v);
    }

    /*
     * Append multiple elements at the end of this LinkedList.
     */
    appendAll(elts:Iterable<T>): LinkedList<T> {
        return LinkedList.ofIterable(elts);
    }

    /**
     * Removes the first element matching the predicate
     * (use [[Seq.filter]] to remove all elements matching a predicate)
     */
    removeFirst(predicate: (x:T)=>boolean): LinkedList<T> {
        return this;
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): LinkedList<T> {
        return new ConsLinkedList(elt, this);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    prependAll(elt: Iterable<T>): LinkedList<T> {
        return LinkedList.ofIterable(elt);
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(mapper:(v:T)=>U): LinkedList<U> {
        return <EmptyLinkedList<U>>emptyLinkedList;
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): LinkedList<U> {
        return <EmptyLinkedList<U>>emptyLinkedList;
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>LinkedList<U>): LinkedList<U> {
        return <EmptyLinkedList<U>>emptyLinkedList;
    }

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(v:T)=>boolean): boolean {
        return true;
    }

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    anyMatch(predicate:(v:T)=>boolean): boolean {
        return false;
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(predicate:(v:T)=>boolean): LinkedList<T> {
        return this;
    }

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     * also see [[LinkedList.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): LinkedList<T> {
        return this;
    }

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     * also see [[LinkedList.sortBy]]
     */
    sortOn(getKey: ((v:T)=>number)|((v:T)=>string)): LinkedList<T> {
        return this;
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     LinkedList.of(1,1,2,3,2,3,1).distinctBy(x => x)
     *     => LinkedList.of(1,2,3)
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): LinkedList<T> {
        return this;
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fn: (v:T)=>void): LinkedList<T> {
        return this;
    }

    /**
     * Reduces the collection to a single value by repeatedly
     * calling the combine function.
     * No starting value. The order in which the elements are
     * passed to the combining function is undetermined.
     */
    reduce(combine: (v1:T,v2:T)=>T): Option<T> {
        return SeqHelpers.reduce(this, combine);
    }

    /**
     * Compare values in the collection and return the smallest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.minOn]]
     */
    minBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.minBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the smallest.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.minBy]]
     */
    minOn(getNumber: (v:T)=>number): Option<T> {
        return SeqHelpers.minOn(this, getNumber);
    }

    /**
     * Compare values in the collection and return the largest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.maxOn]]
     */
    maxBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.maxBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the largest.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.maxBy]]
     */
    maxOn(getNumber: (v:T)=>number): Option<T> {
        return SeqHelpers.maxOn(this, getNumber);
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
     */
    sumOn(getNumber: (v:T)=>number): number {
        return SeqHelpers.sumOn(this, getNumber);
    }

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     LinkedList.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    mkString(separator: string): string {
        return "";
    }

    /**
     * Convert to array.
     * Don't do it on an infinite stream!
     */
    toArray(): T[] {
        return [];
    }

    /**
     * Convert to vector.
     * Don't do it on an infinite stream!
     */
    toVector(): Vector<T> {
        return Vector.empty<T>();
    }

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): HashMap<K,V> {
        return HashMap.empty<K,V>();
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:LinkedList<T>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: LinkedList<T&WithEquality>): boolean {
        if (!other) {
            return false;
        }
        return other.isEmpty();
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        return 1;
    }

    inspect(): string {
        return this.toString();
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "LinkedList()";
    }
}

/**
 * ConsLinkedList holds a value and a pointer to a next element,
 * which could be [[ConsLinkedList]] or [[EmptyLinkedList]].
 * A ConsLinkedList is basically a non-empty linked list. It will
 * contain at least one element.
 * "static methods" available through [[LinkedListStatic]]
 * @param T the item type
 */
export class ConsLinkedList<T> implements Seq<T> {

    /**
     * @hidden
     */
    readonly className: "ConsLinkedList";  // https://stackoverflow.com/a/47841595/516188

    /**
     * @hidden
     */
    public constructor(protected value: T, protected _tail: LinkedList<T>) {}

    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        return SeqHelpers.seqHasTrueEquality<T>(this);
    }

    /**
     * View this Some a as LinkedList. Useful to help typescript type
     * inference sometimes.
     */
    asLinkedList(): LinkedList<T> {
        return this;
    }

    /**
     * Implementation of the Iterator interface.
     */
    [Symbol.iterator](): Iterator<T> {
        let item: LinkedList<T> = this;
        return {
            next(): IteratorResult<T> {
                if (item.isEmpty()) {
                    return { done: true, value: <any>undefined };
                }
                const value = item.head().get();
                item = item.tail().get();
                return {done: false, value};
            }
        };
    }

    /**
     * Get the length of the collection.
     */
    length(): number {
        return this.foldLeft(0, (n, ignored) => n + 1);
    }

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<T> {
        return this._tail.isEmpty() ?
            Option.of(this.value) :
            Option.none<T>();
    }

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): this is EmptyLinkedList<T> {
        return false;
    }

    /**
     * Get the first value of the collection, if any.
     * In this case the list is not empty, so returns Option.some
     */
    head(): Some<T> {
        return Option.some(this.value);
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Some<LinkedList<T>> {
        return Option.some(this._tail);
    }

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    last(): Some<T> {
        let curItem: LinkedList<T> = this;
        while (true) {
            const item = (<ConsLinkedList<T>>curItem).value;
            curItem = (<ConsLinkedList<T>>curItem)._tail;
            if (curItem.isEmpty()) {
                return Option.some(item);
            }
        }
    }

    /**
     * Retrieve the element at index idx.
     * Returns an option because the collection may
     * contain less elements than the index.
     *
     * Careful this is going to have poor performance
     * on LinkedList, which is not a good data structure
     * for random access!
     */
    get(idx: number): Option<T> {
        let curItem: LinkedList<T> = this;
        let i=0;
        while (!curItem.isEmpty()) {
            if (i === idx) {
                const item = curItem.value;
                return Option.of(item);
            }
            curItem = curItem._tail;
            ++i;
        }
        return Option.none<T>();
    }

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     */
    find(predicate:(v:T)=>boolean): Option<T> {
        let curItem: LinkedList<T> = this;
        while (!curItem.isEmpty()) {
            const item = curItem.value;
            if (predicate(item)) {
                return Option.of(item);
            }
            curItem = curItem._tail;
        }
        return Option.none<T>();
    }

    /**
     * Returns true if the item is in the collection,
     * false otherwise.
     */
    contains(v:T&WithEquality): boolean {
        return this.find(x => areEqual(x,v)).isSome();
    }

    /**
     * Return a new stream keeping only the first n elements
     * from this stream.
     */
    take(n: number): LinkedList<T> {
        let result = <LinkedList<T>><EmptyLinkedList<T>>emptyLinkedList;
        let curItem: LinkedList<T> = this;
        let i = 0;
        while (i++ < n && (!curItem.isEmpty())) {
            result = new ConsLinkedList(curItem.value, result);
            curItem = curItem._tail;
        }
        return result.reverse();
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate: (x:T)=>boolean): LinkedList<T> {
        let result = <LinkedList<T>><EmptyLinkedList<T>>emptyLinkedList;
        let curItem: LinkedList<T> = this;
        while ((!curItem.isEmpty()) && predicate(curItem.value)) {
            result = new ConsLinkedList(curItem.value, result);
            curItem =curItem._tail;
        }
        return result.reverse();
    }

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): LinkedList<T> {
        let i = n;
        let curItem: LinkedList<T> = this;
        while (i-- > 0 && !curItem.isEmpty()) {
            curItem = curItem._tail;
        }
        return curItem;
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): LinkedList<T> {
        let curItem: LinkedList<T> = this;
        while (!curItem.isEmpty() && predicate(curItem.value)) {
            curItem = curItem._tail;
        }
        return curItem;
    }

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): LinkedList<T> {
        // going twice through the list...
        const length = this.length();
        return this.take(length-n);
    }

    /**
     * Reduces the collection to a single value using the
     * associative binary function you give. Since the function
     * is associative, order of application doesn't matter.
     *
     * Example:
     *
     *     LinkedList.of(1,2,3).fold(0, (a,b) => a + b);
     *     => 6
     */
    fold(zero:T, fn:(v1:T,v2:T)=>T): T {
        return this.foldLeft(zero, fn);
    }

    /**
     * Reduces the collection to a single value.
     * Left-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs);
     *     => "cba!"
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        let r = zero;
        let curItem: LinkedList<T> = this;
        while (!curItem.isEmpty()) {
            r = fn(r, curItem.value);
            curItem = curItem._tail;
        }
        return r;
    }

    /**
     * Reduces the collection to a single value.
     * Right-associative.
     *
     * Example:
     *
     *     Vector.of("a", "b", "c").foldRight("!", (x,xs) => xs+x);
     *     => "!cba"
     *
     * @param zero The initial value
     * @param fn A function taking the current collection item and
     *           the previous value , and returning
     *           an updated value.
     */
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return this.reverse().foldLeft(zero, (xs,x)=>fn(x,xs));
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
     */
    zip<U>(other: Iterable<U>): LinkedList<[T,U]> {
        const otherIterator = other[Symbol.iterator]();
        let otherCurItem = otherIterator.next();

        let curItem: LinkedList<T> = this;
        let result: LinkedList<[T,U]> = <EmptyLinkedList<[T,U]>>emptyLinkedList;

        while ((!curItem.isEmpty()) && (!otherCurItem.done)) {
            result = new ConsLinkedList(
                [curItem.value, otherCurItem.value] as [T,U], result);
            curItem = curItem._tail;
            otherCurItem = otherIterator.next();
        }
        return result.reverse();
    }

    /**
     * Combine this collection with the index of the elements
     * in it. Handy if you need the index when you map on
     * the collection for instance:
     *
     *     LinkedList.of("a","b").zipWithIndex().map(([v,idx]) => v+idx);
     *     => LinkedList.of("a0", "b1")
     */
    zipWithIndex(): LinkedList<[T,number]> {
        return <LinkedList<[T,number]>>SeqHelpers.zipWithIndex<T>(this);
    }

    /**
     * Reverse the collection. For instance:
     *
     *     LinkedList.of(1,2,3).reverse();
     *     => LinkedList.of(3,2,1)
     */
    reverse(): LinkedList<T> {
        return this.foldLeft(<LinkedList<T>><EmptyLinkedList<T>>emptyLinkedList, (xs,x) => xs.prepend(x));
    }

    /**
     * Takes a predicate; returns a pair of collections.
     * The first one is the longest prefix of this collection
     * which satisfies the predicate, and the second collection
     * is the remainder of the collection.
     *
     *    LinkedList.of(1,2,3,4,5,6).span(x => x <3)
     *    => [LinkedList.of(1,2), LinkedList.of(3,4,5,6)]
     */
    span(predicate:(x:T)=>boolean): [LinkedList<T>,LinkedList<T>] {
        let first: LinkedList<T> = <EmptyLinkedList<T>>emptyLinkedList;
        let curItem: LinkedList<T> = this;
        while ((!curItem.isEmpty()) && predicate(curItem.value)) {
            first = new ConsLinkedList(curItem.value, first);
            curItem = curItem._tail;
        }
        return [first.reverse(), curItem];
    }

    /**
     * Split the collection at a specific index.
     *
     *     LinkedList.of(1,2,3,4,5).splitAt(3)
     *     => [LinkedList.of(1,2,3), LinkedList.of(4,5)]
     */
    splitAt(index:number): [LinkedList<T>,LinkedList<T>] {
        let first: LinkedList<T> = <EmptyLinkedList<T>>emptyLinkedList;
        let curItem: LinkedList<T> = this;
        let i = 0;
        while (i++ < index && (!curItem.isEmpty())) {
            first = new ConsLinkedList(curItem.value, first);
            curItem = curItem._tail;
        }
        return [first.reverse(), curItem];
    }

    /**
     * Returns a pair of two collections; the first one
     * will only contain the items from this collection for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     LinkedList.of(1,2,3,4).partition(x => x%2===0)
     *     => [LinkedList.of(2,4),LinkedList.of(1,3)]
     */
    partition(predicate:(x:T)=>boolean): [LinkedList<T>,LinkedList<T>] {
        // TODO goes twice over the list, can be optimized...
        return [this.filter(predicate), this.filter(x => !predicate(x))];
    }

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[LinkedList.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C & WithEquality): HashMap<C,LinkedList<T>> {
        return this.foldLeft(
            HashMap.empty<C,LinkedList<T>>(),
            (acc: HashMap<C,LinkedList<T>>, v:T) =>
                acc.putWithMerge(
                    classifier(v), LinkedList.of(v),
                    (v1:LinkedList<T>,v2:LinkedList<T>)=>
                        v1.prepend(v2.single().getOrThrow())))
            .mapValues(l => l.reverse());
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[LinkedList.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<HashMap<K,T>> {
        return SeqHelpers.arrangeBy<T,K>(this, getKey);
    }

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): LinkedList<T> {
        return LinkedList.ofIterable<T>(SeqHelpers.shuffle(this.toArray()));
    }

    /**
     * Append an element at the end of this LinkedList.
     * Warning: appending in a loop on a linked list is going
     * to be very slow!
     */
    append(v:T): LinkedList<T> {
        return new ConsLinkedList(
            this.value,
            this._tail.append(v));
    }

    /*
     * Append multiple elements at the end of this LinkedList.
     */
    appendAll(elts:Iterable<T>): LinkedList<T> {
        return LinkedList.ofIterable(elts).prependAll(<LinkedList<T>>this);
    }

    /**
     * Removes the first element matching the predicate
     * (use [[Seq.filter]] to remove all elements matching a predicate)
     */
    removeFirst(predicate: (x:T)=>boolean): LinkedList<T> {
        let curItem: LinkedList<T> = this;
        let result: LinkedList<T> = <EmptyLinkedList<T>>emptyLinkedList;
        let removed = false;
        while (!curItem.isEmpty()) {
            if (predicate(curItem.value) && !removed) {
                removed = true;
            } else {
                result = new ConsLinkedList(curItem.value, result);
            }
            curItem = curItem._tail;
        }
        return result.reverse();
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): LinkedList<T> {
        return new ConsLinkedList(elt, this);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    prependAll(elts: Iterable<T>): LinkedList<T> {
        let leftToAdd = LinkedList.ofIterable(elts).reverse();
        let result: LinkedList<T> = this;
        while (!leftToAdd.isEmpty()) {
            result = new ConsLinkedList(leftToAdd.value, result);
            leftToAdd = leftToAdd._tail;
        }
        return result;
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(mapper:(v:T)=>U): LinkedList<U> {
        let curItem: LinkedList<T> = this;
        let result: LinkedList<U> = <EmptyLinkedList<U>>emptyLinkedList;
        while (!curItem.isEmpty()) {
            result = new ConsLinkedList(mapper(curItem.value), result);
            curItem = curItem._tail;
        }
        return result.reverse();
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): LinkedList<U> {
        let curItem: LinkedList<T> = this;
        let result: LinkedList<U> = <EmptyLinkedList<U>>emptyLinkedList;
        while (!curItem.isEmpty()) {
            const mapped = mapper(curItem.value);
            if (mapped.isSome()) {
                result = new ConsLinkedList(mapped.get(), result);
            }
            curItem = curItem._tail;
        }
        return result.reverse();
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>LinkedList<U>): LinkedList<U> {
        let curItem: LinkedList<T> = this;
        let result: LinkedList<U> = <EmptyLinkedList<U>>emptyLinkedList;
        while (!curItem.isEmpty()) {
            result = result.prependAll(mapper(curItem.value).reverse());
            curItem = curItem._tail;
        }
        return result.reverse();
    }

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(x => !predicate(x)).isNone();
    }

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    anyMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(predicate).isSome();
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(predicate:(v:T)=>boolean): LinkedList<T> {
        let curItem: LinkedList<T> = this;
        let result: LinkedList<T> = <EmptyLinkedList<T>>emptyLinkedList;
        while (!curItem.isEmpty()) {
            if (predicate(curItem.value)) {
                result = new ConsLinkedList(curItem.value, result);
            }
            curItem = curItem._tail;
        }
        return result.reverse();
    }

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     * also see [[LinkedList.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): LinkedList<T> {
        return LinkedList.ofIterable<T>(this.toArray().sort(compare));
    }

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     * also see [[LinkedList.sortBy]]
     */
    sortOn(getKey: ((v:T)=>number)|((v:T)=>string)): LinkedList<T> {
        return <LinkedList<T>>SeqHelpers.sortOn<T>(this, getKey);
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     LinkedList.of(1,1,2,3,2,3,1).distinctBy(x => x)
     *     => LinkedList.of(1,2,3)
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): LinkedList<T> {
        return <LinkedList<T>>SeqHelpers.distinctBy(this, keyExtractor);
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fn: (v:T)=>void): LinkedList<T> {
        let curItem: LinkedList<T> = this;
        while (!curItem.isEmpty()) {
            fn(curItem.value);
            curItem = curItem._tail;
        }
        return this;
    }

    /**
     * Reduces the collection to a single value by repeatedly
     * calling the combine function.
     * No starting value. The order in which the elements are
     * passed to the combining function is undetermined.
     */
    reduce(combine: (v1:T,v2:T)=>T): Option<T> {
        return SeqHelpers.reduce(this, combine);
    }

    /**
     * Compare values in the collection and return the smallest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.minOn]]
     */
    minBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.minBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the smallest.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.minBy]]
     */
    minOn(getNumber: (v:T)=>number): Option<T> {
        return SeqHelpers.minOn(this, getNumber);
    }

    /**
     * Compare values in the collection and return the largest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.maxOn]]
     */
    maxBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.maxBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the largest.
     * Returns Option.none if the collection is empty.
     *
     * also see [[LinkedList.maxBy]]
     */
    maxOn(getNumber: (v:T)=>number): Option<T> {
        return SeqHelpers.maxOn(this, getNumber);
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
     */
    sumOn(getNumber: (v:T)=>number): number {
        return SeqHelpers.sumOn(this, getNumber);
    }

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     LinkedList.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    mkString(separator: string): string {
        let r = "";
        let curItem: LinkedList<T> = this;
        let isNotFirst = false;
        while (!curItem.isEmpty()) {
            if (isNotFirst) {
                r += separator;
            }
            r += SeqHelpers.toStringHelper(curItem.value);
            curItem = curItem._tail;
            isNotFirst = true;
        }
        return r;
    }

    /**
     * Convert to array.
     * Don't do it on an infinite stream!
     */
    toArray(): T[] {
        let r:T[] = [];
        let curItem: LinkedList<T> = this;
        while (!curItem.isEmpty()) {
            r.push(curItem.value);
            curItem = curItem._tail;
        }
        return r;
    }

    /**
     * Convert to vector.
     * Don't do it on an infinite stream!
     */
    toVector(): Vector<T> {
        return Vector.ofIterable<T>(this.toArray());
    }

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): HashMap<K,V> {
        return this.foldLeft(HashMap.empty<K,V>(), (acc,cur) => {
            const converted = converter(cur);
            return acc.put(converted[0], converted[1]);
        });
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:LinkedList<T>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: LinkedList<T&WithEquality>): boolean {
        if (<any>other === this) {
            return true;
        }
        if (!other || !other.tail) {
            return false;
        }
        contractTrueEquality("LinkedList.equals", this, other);
        let myVal: LinkedList<T> = this;
        let hisVal = other;
        while (true) {
            if (myVal.isEmpty() !== hisVal.isEmpty()) {
                return false;
            }
            if (myVal.isEmpty()) {
                // they are both empty, end of the stream
                return true;
            }
            const myHead = myVal.value;
            const hisHead = (<ConsLinkedList<T>>hisVal).value;

            if ((myHead === undefined) !== (hisHead === undefined)) {
                return false;
            }
            if (myHead === undefined || hisHead === undefined) {
                // they are both undefined, the || is for TS's flow analysis
                // so he realizes none of them is undefined after this.
                continue;
            }
            if (!areEqual(myHead, hisHead)) {
                return false;
            }
            myVal = myVal._tail;
            hisVal = (<ConsLinkedList<T&WithEquality>>hisVal)._tail;
        }
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        let hash = 1;
        let curItem: LinkedList<T> = this;
        while (!curItem.isEmpty()) {
            hash = 31 * hash + getHashCode(curItem.value);
            curItem = curItem._tail;
        }
        return hash;
    }

    inspect(): string {
        return this.toString();
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        let curItem: LinkedList<T> = this;
        let result = "LinkedList(";

        while (!curItem.isEmpty()) {
            result += SeqHelpers.toStringHelper(curItem.value);
            const tail: LinkedList<T> = curItem._tail;
            curItem = tail;
            if (!curItem.isEmpty()) {
                result += ", ";
            }
        }

        return result + ")";
    }
}

const emptyLinkedList = new EmptyLinkedList();
