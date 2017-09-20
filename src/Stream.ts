import { Option } from "./Option";
import { Vector } from "./Vector";
import { WithEquality, toStringHelper,
         getHashCode, areEqual, Ordering } from "./Comparison";
import { Value } from "./Value";
import { IMap } from "./IMap";
import { HashMap } from "./HashMap";
import { ISet } from "./ISet";
import { HashSet } from "./HashSet";
import { Seq } from "./Seq";
import * as SeqHelpers from "./SeqHelpers";

/**
 * A lazy, potentially infinite, sequence of values.
 *
 * Use take() for instance to reduce an infinite stream to a finite one.
 */
export abstract class Stream<T> implements Iterable<T>, Seq<T> {

    /**
     * The empty stream
     */
    static empty<T>(): Stream<T> {
        return <EmptyStream<T>>emptyStream;
    }

    /**
     * Create a Stream with the elements you give.
     * No equality requirements.
     */
    static ofStruct<T>(...elts:T[]): Stream<T> {
        return Stream.ofIterableStruct(elts);
    }

    /**
     * Create a Stream with the elements you give.
     * Equality requirements.
     */
    static of<T>(...elts:Array<T&WithEquality>): Stream<T> {
        return Stream.ofIterableStruct(elts);
    }

    /**
     * Build a stream from any iterable, which means also
     * an array for instance.
     * @type T the item type -- no equality requirement
     */
    static ofIterableStruct<T>(elts: Iterable<T>): Stream<T> {
        // need to eagerly copy the iterable. the reason
        // is, if we would build the stream based on the iterator
        // in the iterable, Stream.tail() would do it.next().
        // but it.next() modifies the iterator (mutability),
        // and you would end up with getting two different tails
        // for the same stream if you call .tail() twice in a row
        return Stream.ofArrayStruct(Array.from(elts));
    }

    /**
     * Build a stream from any iterable, which means also
     * an array for instance.
     * @type T the item type -- equality requirement
     */
    static ofIterable<T>(elts: Iterable<T & WithEquality>): Stream<T> {
        return Stream.ofIterableStruct(elts);
    }

    /**
     * Build a stream from an array (slightly faster
     * than building from an iterable)
     * @type T the item type -- no equality requirement
     */
    static ofArrayStruct<T>(elts: Array<T>): Stream<T> {
        if (elts.length === 0) {
            return <EmptyStream<T>>emptyStream;
        }
        const head = elts[0];
        return new ConsStream(head, () => Stream.ofArrayStruct(elts.slice(1)));
    }

    /**
     * Build a stream from an array (slightly faster
     * than building from an iterable)
     * @type T the item type -- equality requirement
     */
    static ofArray<T>(elts: Array<T & WithEquality>): Stream<T> {
        return Stream.ofArrayStruct(elts);
    }

    /**
     * Build an infinite stream from a seed and a transformation function.
     * No equality requirements.
     *
     *     Stream.iterate(1, x => x*2)
     *     => [1,2,4,8,...]
     */
    static iterateStruct<T>(seed:T, fn: (v:T)=>T): Stream<T> {
        return new ConsStream(seed, ()=>Stream.iterateStruct(fn(seed), fn));
    }

    /**
     * Build an infinite stream from a seed and a transformation function.
     * Equality requirements.
     *
     *     Stream.iterate(1, x => x*2)
     *     => [1,2,4,8,...]
     */
    static iterate<T>(seed:T&WithEquality, fn: (v:T)=>T&WithEquality): Stream<T> {
        return Stream.iterateStruct(seed, fn);
    }

    /**
     * Build an infinite stream by calling repeatedly a function.
     * Equality requirements.
     *
     *     Stream.continually(() => 1)
     *     => [1,1,1,1,...]
     *
     *     Stream.continually(Math.random)
     *     => [0.49884723907769635, 0.3226548779864311, ...]
     */
    static continuallyStruct<T>(fn: ()=>T): Stream<T> {
        return new ConsStream(fn(), () => Stream.continuallyStruct(fn));
    }

    /**
     * Build an infinite stream by calling repeatedly a function.
     * No equality requirements.
     *
     *     Stream.continually(() => 1)
     *     => [1,1,1,1,...]
     *
     *     Stream.continually(Math.random)
     *     => [0.49884723907769635, 0.3226548779864311, ...]
     */
    static continually<T>(fn: ()=>T&WithEquality): Stream<T> {
        return Stream.continuallyStruct(fn);
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
     *              .mapStruct<[number,number]>(x => [x,x-1]))
     *     => [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
     */
    static unfoldRight<T,U>(seed: T, fn: (x:T)=>Option<[U,T]>): Stream<U> {
        let nextVal = fn(seed);
        if (nextVal.isNone()) {
            return <Stream<U>>emptyStream;
        }
        return new ConsStream(
            nextVal.getOrThrow()[0],
            ()=>Stream.unfoldRight(nextVal.getOrThrow()[1], fn));
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
    abstract tail(): Option<Stream<T>>;

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
     * on Stream, which is not a good data structure
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
    abstract take(n: number): Stream<T>;

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    abstract takeWhile(predicate: (x:T)=>boolean): Stream<T>;

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    abstract drop(n:number): Stream<T>;

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    abstract dropWhile(predicate:(x:T)=>boolean): Stream<T>;

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    abstract dropRight(n:number): Stream<T>;

    /**
     * Reduces the collection to a single value using the
     * associative binary function you give. Since the function
     * is associative, order of application doesn't matter.
     *
     * Example:
     *
     *     Stream.of(1,2,3).fold(0, (a,b) => a + b);
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
     * No equality requirements.
     */
    abstract zipStruct<U>(other: Iterable<U>): Stream<[T,U]>;

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
    zip<U>(other: Iterable<U&WithEquality>): Stream<[T,U]> {
        return this.zipStruct(other);
    }

    /**
     * Reverse the collection. For instance:
     *
     *     [1,2,3] => [3,2,1]
     */
    abstract reverse(): Stream<T>;

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
    abstract partition(predicate:(x:T)=>boolean): [Stream<T>,Stream<T>];

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[Stream.arrangeBy]]
     */
    abstract groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,Stream<T>>;

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[Stream.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<IMap<K,T>> {
        return SeqHelpers.arrangeBy<T,K>(this, getKey);
    }

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): Stream<T> {
        return Stream.ofIterable(SeqHelpers.shuffle(this.toArray()));
    }

    /**
     * Append an element at the end of this Stream.
     * No equality requirements.
     */
    abstract appendStruct(v:T): Stream<T>;

    /**
     * Append an element at the end of this Stream.
     * Equality requirements.
     */
    append(v:T&WithEquality): Stream<T> {
        return this.appendStruct(v);
    }

    /*
     * Append multiple elements at the end of this Stream.
     * No equality requirements.
     */
    abstract appendAllStruct(elts:Iterable<T>): Stream<T>;

    /*
     * Append multiple elements at the end of this Stream.
     * Equality requirements.
     */
    appendAll(elts:Iterable<T&WithEquality>): Stream<T> {
        return this.appendAllStruct(elts);
    }

    /*
     * Append another Stream at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * No equality requirements.
     */
    abstract appendStreamStruct(elts:Stream<T>): Stream<T>;

    /*
     * Append another Stream at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     * Equality requirements.
     */
    appendStream(elts:Stream<T>): Stream<T> {
        return this.appendStreamStruct(elts);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * Equality requirements.
     */
    prepend(elt: T & WithEquality): Stream<T> {
        return this.prependStruct(elt);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * No equality requirements.
     */
    abstract prependStruct(elt: T): Stream<T>;

    /**
     * Prepend multiple elements at the beginning of the collection.
     * Equality requirements.
     */
    prependAll(elts: Iterable<T&WithEquality>): Stream<T> {
        return this.prependAllStruct(elts);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     * No equality requirements.
     */
    abstract prependAllStruct(elts: Iterable<T>): Stream<T>;

    /**
     * Repeat infinitely this Stream.
     * For instance:
     *
     *     Stream.of(1,2,3).cycle()
     *     => [1,2,3,1,2,3,1,2...]
     */
    abstract cycle(): Stream<T>;

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * No equality requirements.
     */
    abstract mapStruct<U>(mapper:(v:T)=>U): Stream<U>;

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * Equality requirements.
     */
    abstract map<U>(mapper:(v:T)=>U&WithEquality): Stream<U>;

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     * No equality requirement
     */
    abstract flatMapStruct<U>(mapper:(v:T)=>Stream<U>): Stream<U>;

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     * Equality requirement
     */
    abstract flatMap<U>(mapper:(v:T)=>Stream<U&WithEquality>): Stream<U>;

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
    abstract filter(predicate:(v:T)=>boolean): Stream<T>;

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     * also see [[Stream.sortOn]]
     */
    abstract sortBy(compare: (v1:T,v2:T)=>Ordering): Stream<T>;

    /**
     * Give a function associating a number with
     * elements from the collection, and the elements
     * are sorted according to that number.
     *
     * also see [[Stream.sortBy]]
     */
    sortOn(getKey: (v:T)=>number): Stream<T> {
        return this.sortBy((x,y) => getKey(x)-getKey(y));
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Vector.of(1,1,2,3,2,3,1).distinctBy(x => x)
     *     => [1,2,3]
     */
    abstract distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Stream<T>;

    /**
     * Call a function for element in the collection.
     */
    abstract forEach(fn: (v:T)=>void): Stream<T>;

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
     * Equality requirements.
     */
    abstract toMap<K,V>(converter:(x:T)=>[K & WithEquality,V & WithEquality]): IMap<K,V>;

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     * No equality requirements.
     */
    abstract toMapStruct<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V>;

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Stream<T>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    abstract equals(other: Stream<T>): boolean;

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

class EmptyStream<T> extends Stream<T> implements Iterable<T> {

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

    tail(): Option<Stream<T>> {
        return Option.none<Stream<T>>();
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

    take(n: number): Stream<T> {
        return this;
    }

    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        return this;
    }

    drop(n:number): Stream<T> {
        return this;
    }

    dropWhile(predicate:(x:T)=>boolean): Stream<T> {
        return this;
    }

    dropRight(n:number): Stream<T> {
        return this;
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        return zero;
    }

    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return zero;
    }

    zipStruct<U>(other: Iterable<U>): Stream<[T,U]> {
        return <EmptyStream<[T,U]>>emptyStream;
    }

    reverse(): Stream<T> {
        return this;
    }

    partition(predicate:(x:T)=>boolean): [Stream<T>,Stream<T>] {
        return [Stream.empty<T>(), Stream.empty<T>()];
    }

    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,Stream<T>> {
        return HashMap.empty<C,Stream<T>>();
    }

    appendStruct(v:T): Stream<T> {
        return Stream.ofStruct(v);
    }

    appendAllStruct(elts:Iterable<T>): Stream<T> {
        return Stream.ofIterableStruct(elts);
    }

    appendStreamStruct(elts:Stream<T>): Stream<T> {
        return elts;
    }

    prependStruct(elt: T): Stream<T> {
        return Stream.ofStruct(elt);
    }

    prependAllStruct(elt: Iterable<T>): Stream<T> {
        return Stream.ofIterableStruct(elt);
    }

    cycle(): Stream<T> {
        return <EmptyStream<T>>emptyStream;
    }

    mapStruct<U>(mapper:(v:T)=>U): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    map<U>(mapper:(v:T)=>U&WithEquality): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    flatMapStruct<U>(mapper:(v:T)=>Stream<U>): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    flatMap<U>(mapper:(v:T)=>Stream<U&WithEquality>): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    allMatch(predicate:(v:T)=>boolean): boolean {
        return true;
    }

    anyMatch(predicate:(v:T)=>boolean): boolean {
        return false;
    }

    filter(predicate:(v:T)=>boolean): Stream<T> {
        return this;
    }

    sortBy(compare: (v1:T,v2:T)=>Ordering): Stream<T> {
        return this;
    }

    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Stream<T> {
        return this;
    }

    forEach(fn: (v:T)=>void): Stream<T> {
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

    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V & WithEquality]): IMap<K,V> {
        return HashMap.empty<K,V>();
    }

    toMapStruct<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V> {
        return HashMap.empty<K,V>();
    }

    equals(other: Stream<T>): boolean {
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

class ConsStream<T> extends Stream<T> implements Iterable<T> {

    /**
     * @hidden
     */
    public constructor(protected value: T, protected _tail: ()=>Stream<T>) {
        super();
    }

    [Symbol.iterator](): Iterator<T> {
        let item: Stream<T> = this;
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
        return this._tail().isEmpty() ?
            Option.ofStruct(this.value) :
            Option.none<T>();
    }

    isEmpty(): boolean {
        return false;
    }

    head(): Option<T> {
        return Option.ofStruct(this.value);
    }

    tail(): Option<Stream<T>> {
        return Option.ofStruct(this._tail());
    }

    last(): Option<T> {
        let curItem: Stream<T> = this;
        while (true) {
            const item = (<ConsStream<T>>curItem).value;
            curItem = (<ConsStream<T>>curItem)._tail();
            if (curItem.isEmpty()) {
                return Option.ofStruct(item);
            }
        }
    }

    get(idx: number): Option<T> {
        let curItem: Stream<T> = this;
        let i=0;
        while (!curItem.isEmpty()) {
            if (i === idx) {
                const item = (<ConsStream<T>>curItem).value;
                return Option.ofStruct(item);
            }
            curItem = (<ConsStream<T>>curItem)._tail();
            ++i;
        }
        return Option.none<T>();
    }

    find(predicate:(v:T)=>boolean): Option<T> {
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            const item = (<ConsStream<T>>curItem).value;
            if (predicate(item)) {
                return Option.ofStruct(item);
            }
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return Option.none<T>();
    }

    contains(v:T&WithEquality): boolean {
        return this.find(x => areEqual(x,v)).isSome();
    }

    take(n: number): Stream<T> {
        if (n < 1) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              () => this._tail().take(n-1));
    }

    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        if (!predicate(this.value)) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              () => this._tail().takeWhile(predicate));
    }

    drop(n:number): Stream<T> {
        let i = n;
        let curItem: Stream<T> = this;
        while (i-- > 0 && !curItem.isEmpty()) {
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return curItem;
    }

    dropWhile(predicate:(x:T)=>boolean): Stream<T> {
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty() && predicate((<ConsStream<T>>curItem).value)) {
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return curItem;
    }

    dropRight(n:number): Stream<T> {
        // going twice through the list...
        const length = this.length();
        return this.take(length-n);
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        let r = zero;
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            r = fn(r, (<ConsStream<T>>curItem).value);
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return r;
    }

    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return this.reverse().foldLeft(zero, (xs,x)=>fn(x,xs));
    }

    zipStruct<U>(other: Iterable<U>): Stream<[T,U]> {
        const otherIterator = other[Symbol.iterator]();
        let otherCurItem = otherIterator.next();

        if (this.isEmpty() || otherCurItem.done) {
            return <Stream<[T,U]>>emptyStream;
        }

        return new ConsStream([(<ConsStream<T>>this).value, otherCurItem.value] as [T,U],
                              () => (<ConsStream<T>>this)._tail().zipStruct(
                                  { [Symbol.iterator]: ()=>otherIterator}));
    }

    reverse(): Stream<T> {
        return this.foldLeft(<Stream<T>><EmptyStream<T>>emptyStream, (xs,x) => xs.prependStruct(x));
    }

    partition(predicate:(x:T)=>boolean): [Stream<T>,Stream<T>] {
        // TODO goes twice over the list, can be optimized...
        return [this.filter(predicate), this.filter(x => !predicate(x))];
    }

    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,Stream<T>> {
        return this.foldLeft(
            HashMap.empty<C,Stream<T>>(),
            (acc: HashMap<C,Stream<T>>, v:T & WithEquality) =>
                acc.putWithMerge(
                    classifier(v), Stream.of(v),
                    (v1:Stream<T&WithEquality>,v2:Stream<T&WithEquality>)=>v1.appendStream(v2)));
    }

    appendStruct(v:T): Stream<T> {
        const tail = this._tail();
        return new ConsStream(
            this.value,
            () => tail.appendStruct(v));
    }

    appendAllStruct(elts:Iterable<T>): Stream<T> {
        return this.appendStreamStruct(Stream.ofIterableStruct(elts));
    }

    appendStreamStruct(elts:Stream<T>): Stream<T> {
        const tail = this._tail();
        return new ConsStream(
            this.value,
            () => tail.appendStreamStruct(elts));
    }

    prependStruct(elt: T): Stream<T> {
        return new ConsStream(
            elt,
            () => this);
    }

    prependAllStruct(elts: Iterable<T>): Stream<T> {
        return Stream.ofIterableStruct(elts).appendAllStruct(this);
    }

    cycle(): Stream<T> {
        return this._cycle(this);
    }

    private _cycle(toRepeat: Stream<T>): Stream<T> {
        const tail = this._tail();
        return new ConsStream(
            this.value,
            () => tail.isEmpty() ? toRepeat.cycle() : (<ConsStream<T>>tail)._cycle(toRepeat));
    }

    mapStruct<U>(mapper:(v:T)=>U): Stream<U> {
        return new ConsStream(mapper(this.value),
                              () => this._tail().mapStruct(mapper));
    }

    map<U>(mapper:(v:T)=>U&WithEquality): Stream<U> {
        return this.mapStruct(mapper);
    }

    flatMapStruct<U>(mapper:(v:T)=>Stream<U>): Stream<U> {
        return mapper(this.value).appendStream(
            this._tail().flatMapStruct(mapper));
    }

    flatMap<U>(mapper:(v:T)=>Stream<U&WithEquality>): Stream<U> {
        return this.flatMapStruct(mapper);
    }

    allMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(x => !predicate(x)).isNone();
    }

    anyMatch(predicate:(v:T)=>boolean): boolean {
        return this.find(predicate).isSome();
    }

    filter(predicate:(v:T)=>boolean): Stream<T> {
        return predicate(this.value) ?
            new ConsStream(this.value,
                           () => this._tail().filter(predicate)) :
            this._tail().filter(predicate);
    }

    sortBy(compare: (v1:T,v2:T)=>Ordering): Stream<T> {
        return Stream.ofIterableStruct<T>(this.toArray().sort(compare));
    }

    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Stream<T> {
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

    forEach(fn: (v:T)=>void): Stream<T> {
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            fn((<ConsStream<T>>curItem).value);
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return this;
    }

    mkString(separator: string): string {
        let r = "";
        let curItem: Stream<T> = this;
        let isNotFirst = false;
        while (!curItem.isEmpty()) {
            if (isNotFirst) {
                r += separator;
            }
            r += (<ConsStream<T>>curItem).value.toString();
            curItem = (<ConsStream<T>>curItem)._tail();
            isNotFirst = true;
        }
        return r;
    }

    toArray(): T[] {
        const r = this._tail().toArray();
        r.unshift(this.value);
        return r;
    }

    toVector(): Vector<T> {
        return Vector.ofIterableStruct<T>(this.toArray());
    }

    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V & WithEquality]): IMap<K,V> {
        return this.toMapStruct(converter);
    }

    toMapStruct<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V> {
        return this.foldLeft(HashMap.empty<K,V>(), (acc,cur) => {
            const converted = converter(cur);
            return acc.putStruct(converted[0], converted[1]);
        });
    }

    equals(other: Stream<T>): boolean {
        if (!other || !other.tail) {
            return false;
        }
        let myVal: Stream<T> = this;
        let hisVal = other;
        while (true) {
            if (myVal.isEmpty() !== hisVal.isEmpty()) {
                return false;
            }
            if (myVal.isEmpty()) {
                // they are both empty, end of the stream
                return true;
            }
            const myHead = (<ConsStream<T>>myVal).value;
            const hisHead = (<ConsStream<T>>hisVal).value;

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
            myVal = (<ConsStream<T>>myVal)._tail();
            hisVal = (<ConsStream<T>>hisVal)._tail();
        }
    }

    hashCode(): number {
        let hash = 1;
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            hash = 31 * hash + getHashCode((<ConsStream<T>>curItem).value);
            curItem = (<ConsStream<T>>curItem)._tail();
        }
        return hash;
    }

    toString(): string {
        let curItem: Stream<T> = this;
        let result = "[";

        while (!curItem.isEmpty()) {
            result += toStringHelper((<ConsStream<T>>curItem).value);
            curItem = (<ConsStream<T>>curItem)._tail();
            if (!curItem.isEmpty()) {
                result += ", ";
            }
        }

        return result + "]";
    }
}

const emptyStream = new EmptyStream();
