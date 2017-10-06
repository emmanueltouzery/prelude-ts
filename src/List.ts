import { Option } from "./Option";
import { Vector } from "./Vector";
import { WithEquality, toStringHelper,
         getHashCode, areEqual, Ordering } from "./Comparison";
import { contractTrueEquality } from "./Contract";
import { Value } from "./Value";
import { IMap } from "./IMap";
import { HashMap } from "./HashMap";
import { ISet } from "./ISet";
import { HashSet } from "./HashSet";
import { Seq } from "./Seq";
import * as SeqHelpers from "./SeqHelpers";

/**
 * A sequence of values, organized in-memory as a strict linked list.
 * Each element has an head (value) and a tail (the rest of the list).
 *
 * Random access is expensive, appending is expensive, prepend or getting
 * the tail of the list is very cheap.
 * If you often need random access you should rather use [[Vector]].
 * Avoid appending at the end of the list in a loop, prefer prepending and
 * then reversing the list.
 */
export abstract class List<T> implements Iterable<T>, Seq<T> {

    /**
     * The empty stream
     */
    static empty<T>(): List<T> {
        return <EmptyList<T>>emptyList;
    }

    /**
     * Create a List with the elements you give.
     */
    static of<T>(...elts:T[]): List<T> {
        return List.ofIterable(elts);
    }

    /**
     * Build a stream from any iterable, which means also
     * an array for instance.
     * @type T the item type
     */
    static ofIterable<T>(elts: Iterable<T>): List<T> {
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        let result: List<T> = <EmptyList<T>>emptyList;
        while (!curItem.done) {
            result = new ConsList(curItem.value, result);
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
     *     unfoldRight(
     *          10, x=>Option.of(x)
     *              .filter(x => x!==0)
     *              .map<[number,number]>(x => [x,x-1]))
     *     => [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
     */
    static unfoldRight<T,U>(seed: T, fn: (x:T)=>Option<[U,T]>): List<U> {
        let nextVal = fn(seed);
        let result = <EmptyList<U>>emptyList;
        while (!nextVal.isNone()) {
            result = new ConsList(
                nextVal.getOrThrow()[0],
                result);
            nextVal = fn(nextVal.getOrThrow()[1]);
        }
        return result.reverse();
    }

    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        return SeqHelpers.seqHasTrueEquality<T>(this);
    }

    /**
     * Implementation of the Iterator interface.
     */
    abstract [Symbol.iterator](): Iterator<T>;

    /**
     * Get the length of the collection.
     */
    abstract length(): number;

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    abstract single(): Option<T>;

    /**
     * true if the collection is empty, false otherwise.
     */
    abstract isEmpty(): boolean;

    /**
     * Get the first value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    abstract head(): Option<T>;

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    abstract tail(): Option<List<T>>;

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    abstract last(): Option<T>;

    /**
     * Retrieve the element at index idx.
     * Returns an option because the collection may
     * contain less elements than the index.
     *
     * Careful this is going to have poor performance
     * on List, which is not a good data structure
     * for random access!
     */
    abstract get(idx: number): Option<T>;

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     */
    abstract find(predicate:(v:T)=>boolean): Option<T>;

    /**
     * Returns true if the item is in the collection,
     * false otherwise.
     */
    abstract contains(v:T&WithEquality): boolean;

    /**
     * Return a new stream keeping only the first n elements
     * from this stream.
     */
    abstract take(n: number): List<T>;

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    abstract takeWhile(predicate: (x:T)=>boolean): List<T>;

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    abstract drop(n:number): List<T>;

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    abstract dropWhile(predicate:(x:T)=>boolean): List<T>;

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    abstract dropRight(n:number): List<T>;

    /**
     * Reduces the collection to a single value using the
     * associative binary function you give. Since the function
     * is associative, order of application doesn't matter.
     *
     * Example:
     *
     *     List.of(1,2,3).fold(0, (a,b) => a + b);
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
     *     Vector.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs))
     *     => "cba!"
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    abstract foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U;

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
    abstract foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U;

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
    abstract zip<U>(other: Iterable<U>): List<[T,U]>;

    /**
     * Reverse the collection. For instance:
     *
     *     [1,2,3] => [3,2,1]
     */
    abstract reverse(): List<T>;

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
    abstract partition(predicate:(x:T)=>boolean): [List<T>,List<T>];

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[List.arrangeBy]]
     */
    abstract groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,List<T>>;

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[List.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<IMap<K,T>> {
        return SeqHelpers.arrangeBy<T,K>(this, getKey);
    }

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): List<T> {
        return List.ofIterable(SeqHelpers.shuffle(this.toArray()));
    }

    /**
     * Append an element at the end of this List.
     */
    abstract append(v:T): List<T>;

    /*
     * Append multiple elements at the end of this List.
     */
    abstract appendAll(elts:Iterable<T>): List<T>;

    /**
     * Removes the first element matching the predicate
     * (use [[Seq.filter]] to remove all elements matching a predicate)
     */
    abstract removeFirst(predicate: (v:T)=>boolean): List<T>;

    /**
     * Prepend an element at the beginning of the collection.
     */
    abstract prepend(elt: T): List<T>;

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    abstract prependAll(elts: Iterable<T>): List<T>;

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    abstract map<U>(mapper:(v:T)=>U): List<U>;

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     */
    abstract mapOption<U>(mapper:(v:T)=>Option<U>): List<U>;

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    abstract flatMap<U>(mapper:(v:T)=>List<U>): List<U>;

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    abstract allMatch(predicate:(v:T)=>boolean): boolean;

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    abstract anyMatch(predicate:(v:T)=>boolean): boolean;

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    abstract filter(predicate:(v:T)=>boolean): List<T>;

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     * also see [[List.sortOn]]
     */
    abstract sortBy(compare: (v1:T,v2:T)=>Ordering): List<T>;

    /**
     * Give a function associating a number with
     * elements from the collection, and the elements
     * are sorted according to that number.
     *
     * also see [[List.sortBy]]
     */
    sortOn(getKey: (v:T)=>number): List<T> {
        return this.sortBy((x,y) => getKey(x)-getKey(y));
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Vector.of(1,1,2,3,2,3,1).distinctBy(x => x)
     *     => [1,2,3]
     */
    abstract distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): List<T>;

    /**
     * Call a function for element in the collection.
     */
    abstract forEach(fn: (v:T)=>void): List<T>;

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     Vector.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    abstract mkString(separator: string): string;

    /**
     * Convert to array.
     * Don't do it on an infinite stream!
     */
    abstract toArray(): T[];

    /**
     * Convert to vector.
     * Don't do it on an infinite stream!
     */
    abstract toVector(): Vector<T>;

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     */
    abstract toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V>;

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:List<T>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    abstract equals(other: List<T&WithEquality>): boolean;

    /**
     * Get a human-friendly string representation of that value.
     */
    abstract toString(): string;

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    abstract hashCode(): number;

    inspect(): string {
        return this.toString();
    }
}

class EmptyList<T> extends List<T> implements Iterable<T> {

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

    length(): number {
        return 0;
    }

    single(): Option<T> {
        return Option.none<T>();
    }

    isEmpty(): boolean {
        return true;
    }

    head(): Option<T> {
        return Option.none<T>();
    }

    tail(): Option<List<T>> {
        return Option.none<List<T>>();
    }

    last(): Option<T> {
        return Option.none<T>();
    }

    get(idx: number): Option<T> {
        return Option.none<T>();
    }

    find(predicate:(v:T)=>boolean): Option<T> {
        return Option.none<T>();
    }

    contains(v:T&WithEquality): boolean {
        return false;
    }

    take(n: number): List<T> {
        return this;
    }

    takeWhile(predicate: (x:T)=>boolean): List<T> {
        return this;
    }

    drop(n:number): List<T> {
        return this;
    }

    dropWhile(predicate:(x:T)=>boolean): List<T> {
        return this;
    }

    dropRight(n:number): List<T> {
        return this;
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        return zero;
    }

    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return zero;
    }

    zip<U>(other: Iterable<U>): List<[T,U]> {
        return <EmptyList<[T,U]>>emptyList;
    }

    reverse(): List<T> {
        return this;
    }

    partition(predicate:(x:T)=>boolean): [List<T>,List<T>] {
        return [List.empty<T>(), List.empty<T>()];
    }

    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,List<T>> {
        return HashMap.empty<C,List<T>>();
    }

    append(v:T): List<T> {
        return List.of(v);
    }

    appendAll(elts:Iterable<T>): List<T> {
        return List.ofIterable(elts);
    }

    removeFirst(predicate: (x:T)=>boolean): List<T> {
        return this;
    }

    prepend(elt: T): List<T> {
        return new ConsList(elt, this);
    }

    prependAll(elt: Iterable<T>): List<T> {
        return List.ofIterable(elt);
    }

    map<U>(mapper:(v:T)=>U): List<U> {
        return <EmptyList<U>>emptyList;
    }

    mapOption<U>(mapper:(v:T)=>Option<U>): List<U> {
        return <EmptyList<U>>emptyList;
    }

    flatMap<U>(mapper:(v:T)=>List<U>): List<U> {
        return <EmptyList<U>>emptyList;
    }

    allMatch(predicate:(v:T)=>boolean): boolean {
        return true;
    }

    anyMatch(predicate:(v:T)=>boolean): boolean {
        return false;
    }

    filter(predicate:(v:T)=>boolean): List<T> {
        return this;
    }

    sortBy(compare: (v1:T,v2:T)=>Ordering): List<T> {
        return this;
    }

    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): List<T> {
        return this;
    }

    forEach(fn: (v:T)=>void): List<T> {
        return this;
    }

    mkString(separator: string): string {
        return "";
    }

    toArray(): T[] {
        return [];
    }

    toVector(): Vector<T> {
        return Vector.empty<T>();
    }

    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V> {
        return HashMap.empty<K,V>();
    }

    equals(other: List<T&WithEquality>): boolean {
        if (!other) {
            return false;
        }
        return other.isEmpty();
    }

    hashCode(): number {
        return 1;
    }

    toString(): string {
        return "[]";
    }
}

class ConsList<T> extends List<T> implements Iterable<T> {

    /**
     * @hidden
     */
    public constructor(protected value: T, protected _tail: List<T>) {
        super();
    }

    [Symbol.iterator](): Iterator<T> {
        let item: List<T> = this;
        return {
            next(): IteratorResult<T> {
                if (item.isEmpty()) {
                    return { done: true, value: <any>undefined };
                }
                const value = item.head().getOrThrow();
                item = item.tail().getOrThrow();
                return {done: false, value};
            }
        };
    }

    length(): number {
        return this.foldLeft(0, (n, ignored) => n + 1);
    }

    single(): Option<T> {
        return this._tail.isEmpty() ?
            Option.of(this.value) :
            Option.none<T>();
    }

    isEmpty(): boolean {
        return false;
    }

    head(): Option<T> {
        return Option.of(this.value);
    }

    tail(): Option<List<T>> {
        return Option.of(this._tail);
    }

    last(): Option<T> {
        let curItem: List<T> = this;
        while (true) {
            const item = (<ConsList<T>>curItem).value;
            curItem = (<ConsList<T>>curItem)._tail;
            if (curItem.isEmpty()) {
                return Option.of(item);
            }
        }
    }

    get(idx: number): Option<T> {
        let curItem: List<T> = this;
        let i=0;
        while (!curItem.isEmpty()) {
            if (i === idx) {
                const item = (<ConsList<T>>curItem).value;
                return Option.of(item);
            }
            curItem = (<ConsList<T>>curItem)._tail;
            ++i;
        }
        return Option.none<T>();
    }

    find(predicate:(v:T)=>boolean): Option<T> {
        let curItem: List<T> = this;
        while (!curItem.isEmpty()) {
            const item = (<ConsList<T>>curItem).value;
            if (predicate(item)) {
                return Option.of(item);
            }
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return Option.none<T>();
    }

    contains(v:T&WithEquality): boolean {
        return this.find(x => areEqual(x,v)).isSome();
    }

    take(n: number): List<T> {
        let result = <EmptyList<T>>emptyList;
        let curItem: List<T> = this;
        let i = 0;
        while (i++ < n && (!curItem.isEmpty())) {
            result = new ConsList((<ConsList<T>>curItem).value, result);
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return result.reverse();
    }

    takeWhile(predicate: (x:T)=>boolean): List<T> {
        let result = <EmptyList<T>>emptyList;
        let curItem: List<T> = this;
        while ((!curItem.isEmpty()) && predicate((<ConsList<T>>curItem).value)) {
            result = new ConsList((<ConsList<T>>curItem).value, result);
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return result.reverse();
    }

    drop(n:number): List<T> {
        let i = n;
        let curItem: List<T> = this;
        while (i-- > 0 && !curItem.isEmpty()) {
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return curItem;
    }

    dropWhile(predicate:(x:T)=>boolean): List<T> {
        let curItem: List<T> = this;
        while (!curItem.isEmpty() && predicate((<ConsList<T>>curItem).value)) {
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return curItem;
    }

    dropRight(n:number): List<T> {
        // going twice through the list...
        const length = this.length();
        return this.take(length-n);
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        let r = zero;
        let curItem: List<T> = this;
        while (!curItem.isEmpty()) {
            r = fn(r, (<ConsList<T>>curItem).value);
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return r;
    }

    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return this.reverse().foldLeft(zero, (xs,x)=>fn(x,xs));
    }

    zip<U>(other: Iterable<U>): List<[T,U]> {
        const otherIterator = other[Symbol.iterator]();
        let otherCurItem = otherIterator.next();

        let curItem: List<T> = this;
        let result = <EmptyList<[T,U]>>emptyList;

        while ((!curItem.isEmpty()) && (!otherCurItem.done)) {
            result = new ConsList(
                [(<ConsList<T>>curItem).value, otherCurItem.value] as [T,U], result);
            curItem = (<ConsList<T>>curItem)._tail;
            otherCurItem = otherIterator.next();
        }
        return result.reverse();
    }

    reverse(): List<T> {
        return this.foldLeft(<List<T>><EmptyList<T>>emptyList, (xs,x) => xs.prepend(x));
    }

    partition(predicate:(x:T)=>boolean): [List<T>,List<T>] {
        // TODO goes twice over the list, can be optimized...
        return [this.filter(predicate), this.filter(x => !predicate(x))];
    }

    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,List<T>> {
        return this.foldLeft(
            HashMap.empty<C,List<T>>(),
            (acc: HashMap<C,List<T>>, v:T & WithEquality) =>
                acc.putWithMerge(
                    classifier(v), List.of(v),
                    (v1:List<T&WithEquality>,v2:List<T&WithEquality>)=>
                        v1.prepend(v2.single().getOrThrow())))
            .mapValues(l => l.reverse());
    }

    append(v:T): List<T> {
        return new ConsList(
            this.value,
            this._tail.append(v));
    }

    appendAll(elts:Iterable<T>): List<T> {
        return List.ofIterable(elts).prependAll(<List<T>>this);
    }

    removeFirst(predicate: (x:T)=>boolean): List<T> {
        let curItem: List<T> = this;
        let result = <EmptyList<T>>emptyList;
        let removed = false;
        while (!curItem.isEmpty()) {
            if (predicate((<ConsList<T>>curItem).value) && !removed) {
                removed = true;
            } else {
                result = new ConsList((<ConsList<T>>curItem).value, result);
            }
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return result.reverse();
    }

    prepend(elt: T): List<T> {
        return new ConsList(elt, this);
    }

    prependAll(elts: Iterable<T>): List<T> {
        let leftToAdd = List.ofIterable(elts).reverse();
        let result: List<T> = this;
        while (!leftToAdd.isEmpty()) {
            result = new ConsList((<ConsList<T>>leftToAdd).value, result);
            leftToAdd = (<ConsList<T>>leftToAdd)._tail;
        }
        return result;
    }

    map<U>(mapper:(v:T)=>U): List<U> {
        let curItem: List<T> = this;
        let result = <EmptyList<U>>emptyList;
        while (!curItem.isEmpty()) {
            result = new ConsList(mapper((<ConsList<T>>curItem).value), result);
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return result.reverse();
    }

    mapOption<U>(mapper:(v:T)=>Option<U>): List<U> {
        let curItem: List<T> = this;
        let result = <EmptyList<U>>emptyList;
        while (!curItem.isEmpty()) {
            const mapped = mapper((<ConsList<T>>curItem).value);
            if (mapped.isSome()) {
                result = new ConsList(mapped.getOrThrow(), result);
            }
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return result.reverse();
    }

    flatMap<U>(mapper:(v:T)=>List<U>): List<U> {
        let curItem: List<T> = this;
        let result = <EmptyList<U>>emptyList;
        while (!curItem.isEmpty()) {
            result = result.prependAll(mapper((<ConsList<T>>curItem).value).reverse());
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return result.reverse();
    }

    allMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(x => !predicate(x)).isNone();
    }

    anyMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(predicate).isSome();
    }

    filter(predicate:(v:T)=>boolean): List<T> {
        let curItem: List<T> = this;
        let result = <EmptyList<T>>emptyList;
        while (!curItem.isEmpty()) {
            if (predicate((<ConsList<T>>curItem).value)) {
                result = new ConsList((<ConsList<T>>curItem).value, result);
            }
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return result.reverse();
    }

    sortBy(compare: (v1:T,v2:T)=>Ordering): List<T> {
        return List.ofIterable<T>(this.toArray().sort(compare));
    }

    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): List<T> {
        let knownKeys = HashSet.empty<U>();
        return this.filter(x => {
            const key = keyExtractor(x);
            const r = knownKeys.contains(key);
            if (!r) {
                knownKeys = knownKeys.add(key);
            }
            return !r;
        });
    }

    forEach(fn: (v:T)=>void): List<T> {
        let curItem: List<T> = this;
        while (!curItem.isEmpty()) {
            fn((<ConsList<T>>curItem).value);
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return this;
    }

    mkString(separator: string): string {
        let r = "";
        let curItem: List<T> = this;
        let isNotFirst = false;
        while (!curItem.isEmpty()) {
            if (isNotFirst) {
                r += separator;
            }
            r += (<ConsList<T>>curItem).value.toString();
            curItem = (<ConsList<T>>curItem)._tail;
            isNotFirst = true;
        }
        return r;
    }

    toArray(): T[] {
        const r = this._tail.toArray();
        r.unshift(this.value);
        return r;
    }

    toVector(): Vector<T> {
        return Vector.ofIterable<T>(this.toArray());
    }

    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V> {
        return this.foldLeft(HashMap.empty<K,V>(), (acc,cur) => {
            const converted = converter(cur);
            return acc.put(converted[0], converted[1]);
        });
    }

    equals(other: List<T&WithEquality>): boolean {
        if (!other || !other.tail) {
            return false;
        }
        contractTrueEquality("List.equals", this, other);
        let myVal: List<T> = this;
        let hisVal = other;
        while (true) {
            if (myVal.isEmpty() !== hisVal.isEmpty()) {
                return false;
            }
            if (myVal.isEmpty()) {
                // they are both empty, end of the stream
                return true;
            }
            const myHead = (<ConsList<T&WithEquality>>myVal).value;
            const hisHead = (<ConsList<T&WithEquality>>hisVal).value;

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
            myVal = (<ConsList<T&WithEquality>>myVal)._tail;
            hisVal = (<ConsList<T&WithEquality>>hisVal)._tail;
        }
    }

    hashCode(): number {
        let hash = 1;
        let curItem: List<T> = this;
        while (!curItem.isEmpty()) {
            hash = 31 * hash + getHashCode((<ConsList<T>>curItem).value);
            curItem = (<ConsList<T>>curItem)._tail;
        }
        return hash;
    }

    toString(): string {
        let curItem: List<T> = this;
        let result = "List(";

        while (!curItem.isEmpty()) {
            result += toStringHelper((<ConsList<T>>curItem).value);
            const tail = (<ConsList<T>>curItem)._tail;
            curItem = tail;
            if (!curItem.isEmpty()) {
                result += ", ";
            }
        }

        return result + ")";
    }
}

const emptyList = new EmptyList();
