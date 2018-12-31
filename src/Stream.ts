/**
 * A lazy, potentially infinite, sequence of values.
 *
 * The code is organized through the class [[EmptyStream]] (empty list
 * or tail), the class [[ConsStream]] (list value and lazy pointer to next),
 * and the type alias [[Stream]] (empty or cons).
 *
 * Finally, "static" functions on Option are arranged in the class
 * [[StreamStatic]] and are accessed through the global constant Stream.
 *
 * Use take() for instance to reduce an infinite stream to a finite one.
 *
 * Examples:
 *
 *     Stream.iterate(1, x => x*2).take(4);
 *     => Stream.of(1,2,4,8)
 *
 *     Stream.continually(Math.random).take(2);
 *     => Stream.of(0.49884723907769635, 0.3226548779864311)
 */
import { Option, Some } from "./Option";
import { Vector } from "./Vector";
import { WithEquality, getHashCode,
         areEqual, Ordering, ToOrderable } from "./Comparison";
import { contractTrueEquality } from "./Contract";
import { inspect } from "./Value";
import { HashMap } from "./HashMap";
import { HashSet } from "./HashSet";
import { Seq, IterableArray } from "./Seq";
import { Lazy } from "./Lazy";
import { LinkedList } from "./LinkedList";
import * as SeqHelpers from "./SeqHelpers";

/**
 * A Stream is either [[EmptyStream]] or [[ConsStream]]
 * "static methods" available through [[StreamStatic]]
 * @param T the item type
 */
export type Stream<T> = EmptyStream<T> | ConsStream<T>;

/**
 * Holds the "static methods" for [[Stream]]
 */
export class StreamStatic {
    /**
     * The empty stream
     */
    empty<T>(): Stream<T> {
        return <EmptyStream<T>>emptyStream;
    }

    /**
     * Create a Stream with the elements you give.
     */
    of<T>(elt:T, ...elts:T[]): ConsStream<T>;
    of<T>(...elts:T[]): Stream<T>;
    of<T>(...elts:T[]): Stream<T> {
        return Stream.ofIterable(elts);
    }

    /**
     * Build a stream from any iterable, which means also
     * an array for instance.
     * @param T the item type
     */
    ofIterable<T>(elts: Iterable<T>): Stream<T> {
        // need to eagerly copy the iterable. the reason
        // is, if we would build the stream based on the iterator
        // in the iterable, Stream.tail() would do it.next().
        // but it.next() modifies the iterator (mutability),
        // and you would end up with getting two different tails
        // for the same stream if you call .tail() twice in a row
        if (Array.isArray(elts)) {
            return Stream.ofArray(elts);
        }
        return Stream.ofArray(Array.from(elts));
    }

    /**
     * Curried type guard for Stream.
     * Sometimes needed also due to https://github.com/Microsoft/TypeScript/issues/20218
     *
     *     Vector.of(Stream.of(1), Stream.empty<number>())
     *         .filter(Stream.isEmpty)
     *     => Vector.of(Stream.empty<number>())
     */
    isEmpty<T>(s: Stream<T>): s is EmptyStream<T> {
        return s.isEmpty();
    }

    /**
     * Curried type guard for Stream.
     * Sometimes needed also due to https://github.com/Microsoft/TypeScript/issues/20218
     *
     *     Vector.of(Stream.of(1), Stream.empty<number>())
     *         .filter(Stream.isNotEmpty)
     *         .map(s => s.head().get()+1)
     *     => Vector.of(2)
     */
    isNotEmpty<T>(s: Stream<T>): s is ConsStream<T> {
        return !s.isEmpty();
    }

    /**
     * @hidden
     */
    private ofArray<T>(elts: Array<T>): Stream<T> {
        if (elts.length === 0) {
            return <EmptyStream<T>>emptyStream;
        }
        const head = elts[0];
        return new ConsStream(head, Lazy.of(() => Stream.ofArray(elts.slice(1))));
    }

    /**
     * Build an infinite stream from a seed and a transformation function.
     *
     *     Stream.iterate(1, x => x*2).take(4);
     *     => Stream.of(1,2,4,8)
     */
    iterate<T>(seed:T, fn: (v:T)=>T): ConsStream<T> {
        return new ConsStream(seed, Lazy.of(()=>Stream.iterate(fn(seed), fn)));
    }

    /**
     * Build an infinite stream by calling repeatedly a function.
     *
     *     Stream.continually(() => 1).take(4);
     *     => Stream.of(1,1,1,1)
     *
     *     Stream.continually(Math.random).take(2);
     *     => Stream.of(0.49884723907769635, 0.3226548779864311)
     */
    continually<T>(fn: ()=>T): ConsStream<T> {
        return new ConsStream(fn(), Lazy.of(() => Stream.continually(fn)));
    }

    /**
     * Dual to the foldRight function. Build a collection from a seed.
     * Takes a starting element and a function.
     * It applies the function on the starting element; if the
     * function returns None, it stops building the list, if it
     * returns Some of a pair, it adds the first element to the result
     * and takes the second element as a seed to keep going.
     *
     *     Stream.unfoldRight(
     *          10, x=>Option.of(x)
     *              .filter(x => x!==0)
     *              .map<[number,number]>(x => [x,x-1]));
     *     => Stream.of(10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
     */
    unfoldRight<T,U>(seed: T, fn: (x:T)=>Option<[U,T]>): Stream<U> {
        let nextVal = fn(seed);
        if (nextVal.isNone()) {
            return <EmptyStream<U>>emptyStream;
        }
        return new ConsStream(
            nextVal.get()[0],
            Lazy.of(()=>Stream.unfoldRight(nextVal.getOrThrow()[1], fn)));
    }

    /**
     * Combine any number of iterables you give in as
     * parameters to produce a new collection which combines all,
     * in tuples. For instance:
     *
     *     Stream.zip(Stream.of(1,2,3), ["a","b","c"], LinkedList.of(8,9,10))
     *     => Stream.of([1,"a",8], [2,"b",9], [3,"c",10])
     *
     * The result collection will have the length of the shorter
     * of the input iterables. Extra elements will be discarded.
     *
     * Also see the non-static version [[ConsStream.zip]], which only combines two
     * collections.
     * @param A A is the type of the tuple that'll be generated
     *          (`[number,string,number]` for the code sample)
     */
    zip<A extends any[]>(...iterables: IterableArray<A>): Stream<A> {
        const iterators: Iterator<A>[] = iterables.map(i => i[Symbol.iterator]());
        let items = iterators.map(i => i.next());

        if (items.some(item => item.done)) {
            return <EmptyStream<A>>emptyStream;
        }

        return new ConsStream(items.map(item => item.value) as A,
                              Lazy.of(() => Stream.zip<A>(...
                                  <any>iterators.map(i=>({ [Symbol.iterator]: ()=>i})))));
    }

}

/**
 * The Stream constant allows to call the Stream "static" methods
 */
export const Stream = new StreamStatic();

/**
 * EmptyStream is the empty stream; every non-empty
 * stream also has a pointer to an empty stream
 * after its last element.
 * "static methods" available through [[StreamStatic]]
 * @param T the item type
 */
export class EmptyStream<T> implements Seq<T> {

    /**
     * @hidden
     */
    readonly className: "EmptyStream" = <any>undefined;  // https://stackoverflow.com/a/47841595/516188

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
     * View this Some a as Stream. Useful to help typescript type
     * inference sometimes.
     */
    asStream(): Stream<T> {
        return this;
    }

    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        return SeqHelpers.seqHasTrueEquality<T>(this);
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
    isEmpty(): this is EmptyStream<T> {
        return true;
    }

    /**
     * Get the first value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    head(): Option<T> {
        return Option.none<T>();
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Option<Stream<T>> {
        return Option.none<Stream<T>>();
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
     * on Stream, which is not a good data structure
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
    take(n: number): Stream<T> {
        return this;
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        return this;
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate,
     * but starting from the end of the collection.
     *
     *     Stream.of(1,2,3,4).takeRightWhile(x => x > 2)
     *     => Stream.of(3,4)
     */
    takeRightWhile(predicate:(x:T)=>boolean): Stream<T> {
        return this;
    }

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): Stream<T> {
        return this;
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Stream<T> {
        return this;
    }

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): Stream<T> {
        return this;
    }

    /**
     * Returns a new collection, discarding the last elements
     * until one element fails the predicate. All elements
     * before that point are retained.
     */
    dropRightWhile(predicate:(x:T)=>boolean): Stream<T> {
        return this;
    }

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
     *     Stream.of(1,2,3).zip(["a","b","c"])
     *     => Stream.of([1,"a"], [2,"b"], [3,"c"])
     *
     * The result collection will have the length of the shorter
     * of both collections. Extra elements will be discarded.
     *
     * Also see [[StreamStatic.zip]] (static version which can more than two
     * iterables)
     */
    zip<U>(other: Iterable<U>): Stream<[T,U]> {
        return <EmptyStream<[T,U]>>emptyStream;
    }

    /**
     * Combine this collection with the index of the elements
     * in it. Handy if you need the index when you map on
     * the collection for instance:
     *
     *     Stream.of("a","b").zipWithIndex().map(([v,idx]) => v+idx);
     *     => Stream.of("a0", "b1")
     */
    zipWithIndex(): Stream<[T,number]> {
        return <Stream<[T,number]>>SeqHelpers.zipWithIndex<T>(this);
    }

    /**
     * Reverse the collection. For instance:
     *
     *     Stream.of(1,2,3).reverse();
     *     => Stream.of(3,2,1)
     */
    reverse(): Stream<T> {
        return this;
    }

    /**
     * Takes a predicate; returns a pair of collections.
     * The first one is the longest prefix of this collection
     * which satisfies the predicate, and the second collection
     * is the remainder of the collection.
     *
     *    Stream.of(1,2,3,4,5,6).span(x => x <3)
     *    => [Stream.of(1,2), Stream.of(3,4,5,6)]
     */
    span(predicate:(x:T)=>boolean): [Stream<T>,Stream<T>] {
        return [this, this];
    }

    /**
     * Split the collection at a specific index.
     *
     *     Stream.of(1,2,3,4,5).splitAt(3)
     *     => [Stream.of(1,2,3), Stream.of(4,5)]
     */
    splitAt(index:number): [Stream<T>,Stream<T>] {
        return [this, this];
    }

    /**
     * Returns a pair of two collections; the first one
     * will only contain the items from this collection for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     Stream.of(1,2,3,4).partition(x => x%2===0)
     *     => [Stream.of(2,4),Stream.of(1,3)]
     */
    partition<U extends T>(predicate:(v:T)=>v is U): [Stream<U>,Stream<Exclude<T,U>>];
    partition(predicate:(x:T)=>boolean): [Stream<T>,Stream<T>];
    partition<U extends T>(predicate:(v:T)=>boolean): [Stream<U>,Stream<any>] {
        return [Stream.empty<U>(), Stream.empty<T>()];
    }

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[ConsStream.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C & WithEquality): HashMap<C,Stream<T>> {
        return HashMap.empty<C,Stream<T>>();
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[ConsStream.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<HashMap<K,T>> {
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
     */
    append(v:T): Stream<T> {
        return Stream.of(v);
    }

    /*
     * Append multiple elements at the end of this Stream.
     */
    appendAll(elts:Iterable<T>): Stream<T> {
        return Stream.ofIterable(elts);
    }

    /**
     * Remove multiple elements from a stream
     *
     *     Stream.of(1,2,3,4,3,2,1).removeAll([2,4])
     *     => Stream.of(1,3,3,1)
     */
    removeAll(elts:Iterable<T&WithEquality>): Stream<T> {
        return this;
    }

    /**
     * Removes the first element matching the predicate
     * (use [[ConsStream.filter]] to remove all elements matching a predicate)
     */
    removeFirst(predicate: (x:T)=>boolean): Stream<T> {
        return this;
    }

    /*
     * Append another Stream at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     */
    appendStream(elts:Stream<T>): Stream<T> {
        return elts;
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): Stream<T> {
        return Stream.of(elt);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    prependAll(elt: Iterable<T>): Stream<T> {
        return Stream.ofIterable(elt);
    }

    /**
     * Repeat infinitely this Stream.
     * For instance:
     *
     *     Stream.of(1,2,3).cycle().take(8)
     *     => Stream.of(1,2,3,1,2,3,1,2)
     */
    cycle(): Stream<T> {
        return <EmptyStream<T>>emptyStream;
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(mapper:(v:T)=>U): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     *
     *     Stream.of(1,2,6).mapOption(x => x%2===0 ?
     *         Option.of(x+1) : Option.none<number>())
     *     => Stream.of(3, 7)
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): Stream<U> {
        return <EmptyStream<U>>emptyStream;
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Stream<U>): Stream<U> {
        return <EmptyStream<U>>emptyStream;
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
    filter<U extends T>(predicate:(v:T)=>v is U): Stream<U>;
    filter(predicate:(v:T)=>boolean): Stream<T>;
    filter(predicate:(v:T)=>boolean): Stream<T> {
        return this;
    }

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     *     const activityOrder = ["Writer", "Actor", "Director"];
     *     Stream.of({name:"George", activity: "Director"}, {name:"Robert", activity: "Actor"})
     *         .sortBy((p1,p2) => activityOrder.indexOf(p1.activity) - activityOrder.indexOf(p2.activity));
     *     => Stream.of({"name":"Robert","activity":"Actor"}, {"name":"George","activity":"Director"})
     *
     * also see [[ConsStream.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Stream<T> {
        return this;
    }

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     *     Stream.of({a:3,b:"b"},{a:1,b:"test"},{a:2,b:"a"}).sortOn(elt=>elt.a)
     *     => Stream.of({a:1,b:"test"},{a:2,b:"a"},{a:3,b:"b"})
     *
     * You can also sort by multiple criteria, and request 'descending'
     * sorting:
     *
     *     Stream.of({a:1,b:"b"},{a:1,b:"test"},{a:2,b:"a"}).sortOn(elt=>elt.a,{desc:elt=>elt.b})
     *     => Stream.of({a:1,b:"test"},{a:1,b:"b"},{a:2,b:"a"})
     *
     * also see [[ConsStream.sortBy]]
     */
    sortOn(...getKeys: Array<ToOrderable<T>|{desc:ToOrderable<T>}>): Stream<T> {
        return this;
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Stream.of(1,1,2,3,2,3,1).distinctBy(x => x);
     *     => Stream.of(1,2,3)
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Stream<T> {
        return this;
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fn: (v:T)=>void): Stream<T> {
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
     * also see [[ConsStream.minOn]]
     */
    minBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return Option.none<T>();
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the smallest.
     * Returns Option.none if the collection is empty.
     *
     *     Stream.of({name:"Joe", age:12}, {name:"Paula", age:6}).minOn(x=>x.age)
     *     => Option.of({name:"Paula", age:6})
     *
     * also see [[ConsStream.minBy]]
     */
    minOn(getOrderable: ToOrderable<T>): Option<T> {
        return Option.none<T>();
    }

    /**
     * Compare values in the collection and return the largest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[ConsStream.maxOn]]
     */
    maxBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return Option.none<T>();
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the largest.
     * Returns Option.none if the collection is empty.
     *
     *     Stream.of({name:"Joe", age:12}, {name:"Paula", age:6}).maxOn(x=>x.age)
     *     => Option.of({name:"Joe", age:12})
     *
     * also see [[ConsStream.maxBy]]
     */
    maxOn(getOrderable: ToOrderable<T>): Option<T> {
        return Option.none<T>();
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
     *
     *     Stream.of(1,2,3).sumOn(x=>x)
     *     => 6
     */
    sumOn(getNumber: (v:T)=>number): number {
        return 0;
    }

    /**
     * Slides a window of a specific size over the sequence.
     * Returns a lazy stream so memory use is not prohibitive.
     *
     *     Stream.of(1,2,3,4,5,6,7,8).sliding(3)
     *     => Stream.of(Stream.of(1,2,3), Stream.of(4,5,6), Stream.of(7,8))
     */
    sliding(count:number): Stream<Stream<T>> {
        return <Stream<Stream<T>>>SeqHelpers.sliding(this, count);
    }

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     *
     *     Stream.of(1,2,3).scanLeft(0, (soFar,cur)=>soFar+cur)
     *     => Stream.of(0,1,3,6)
     */
    scanLeft<U>(init:U, fn:(soFar:U,cur:T)=>U): Stream<U> {
        return new ConsStream(init, Lazy.of(()=><EmptyStream<U>>emptyStream));
    }

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     * The first element of the result is the final cumulative result.
     *
     *     Stream.of(1,2,3).scanRight(0, (cur,soFar)=>soFar+cur)
     *     => Stream.of(6,5,3,0)
     */
    scanRight<U>(init:U, fn:(cur:T,soFar:U)=>U): Stream<U> {
        return new ConsStream(init, Lazy.of(()=><EmptyStream<U>>emptyStream));
    }

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     Vector.of(1,2,3).mkString(", ")
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
     *
     *     Stream.of(1,2,3).toMap(x=>[x.toString(), x])
     *     => HashMap.of(["1",1], ["2",2], ["3",3])
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): HashMap<K,V> {
        return HashMap.empty<K,V>();
    }

    /**
     * Convert this collection to a set. Since the elements of the
     * Seq may not support equality, you must pass a function returning
     * a value supporting equality.
     *
     *     Stream.of(1,2,3,3,4).toSet(x=>x)
     *     => HashSet.of(1,2,3,4)
     */
    toSet<K>(converter:(x:T)=>K&WithEquality): HashSet<K> {
        return HashSet.empty<K>();
    }

    /**
     * Convert this collection to a list.
     */
    toLinkedList(): LinkedList<T> {
        return LinkedList.ofIterable(this);
    }

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
    equals(other: Stream<T&WithEquality>): boolean {
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

    [inspect](): string {
        return this.toString();
    }

    /**
     * Get a human-friendly string representation of that value.
     *
     * Also see [[ConsStream.mkString]]
     */
    toString(): string {
        return "[]";
    }
}

/**
 * ConsStream holds a value and a lazy pointer to a next element,
 * which could be [[ConsStream]] or [[EmptyStream]].
 * A ConsStream is basically a non-empty stream. It will
 * contain at least one element.
 * "static methods" available through [[StreamStatic]]
 * @param T the item type
 */
export class ConsStream<T> implements Seq<T> {

    /**
     * @hidden
     */
    readonly className: "ConsStream" = <any>undefined;  // https://stackoverflow.com/a/47841595/516188

    /**
     * @hidden
     */
    public constructor(protected value: T, protected _tail: Lazy<Stream<T>>) {}

    /**
     * Implementation of the Iterator interface.
     */
    [Symbol.iterator](): Iterator<T> {
        let item: Stream<T> = this;
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
     * View this Some a as Stream. Useful to help typescript type
     * inference sometimes.
     */
    asStream(): Stream<T> {
        return this;
    }

    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        return SeqHelpers.seqHasTrueEquality<T>(this);
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
        return this._tail.get().isEmpty() ?
            Option.of(this.value) :
            Option.none<T>();
    }

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): this is EmptyStream<T> {
        return false;
    }

    /**
     * Get the first value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    head(): Some<T> {
        return Option.some(this.value);
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return None.
     */
    tail(): Some<Stream<T>> {
        return Option.some(this._tail.get());
    }

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    last(): Some<T> {
        let curItem: Stream<T> = this;
        while (true) {
            const item = (<ConsStream<T>>curItem).value;
            curItem = (<ConsStream<T>>curItem)._tail.get();
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
     * on Stream, which is not a good data structure
     * for random access!
     */
    get(idx: number): Option<T> {
        let curItem: Stream<T> = this;
        let i=0;
        while (!curItem.isEmpty()) {
            if (i === idx) {
                const item = curItem.value;
                return Option.of(item);
            }
            curItem = curItem._tail.get();
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
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            const item = curItem.value;
            if (predicate(item)) {
                return Option.of(item);
            }
            curItem = curItem._tail.get();
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
    take(n: number): Stream<T> {
        if (n < 1) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              Lazy.of(() => this._tail.get().take(n-1)));
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate: (x:T)=>boolean): Stream<T> {
        if (!predicate(this.value)) {
            return <EmptyStream<T>>emptyStream;
        }
        return new ConsStream(this.value,
                              Lazy.of(() => this._tail.get().takeWhile(predicate)));
    }

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate,
     * but starting from the end of the collection.
     *
     *     Stream.of(1,2,3,4).takeRightWhile(x => x > 2)
     *     => Stream.of(3,4)
     */
    takeRightWhile(predicate:(x:T)=>boolean): Stream<T> {
        return this.reverse().takeWhile(predicate).reverse();
    }

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): Stream<T> {
        let i = n;
        let curItem: Stream<T> = this;
        while (i-- > 0 && !curItem.isEmpty()) {
            curItem = curItem._tail.get();
        }
        return curItem;
    }

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Stream<T> {
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty() && predicate(curItem.value)) {
            curItem = curItem._tail.get();
        }
        return curItem;
    }

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): Stream<T> {
        // going twice through the list...
        const length = this.length();
        return this.take(length-n);
    }

    /**
     * Returns a new collection, discarding the last elements
     * until one element fails the predicate. All elements
     * before that point are retained.
     */
    dropRightWhile(predicate:(x:T)=>boolean): Stream<T> {
        return this.reverse().dropWhile(predicate).reverse();
    }

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
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            r = fn(r, curItem.value);
            curItem = curItem._tail.get();
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
     *     Stream.of(1,2,3).zip(["a","b","c"])
     *     => Stream.of([1,"a"], [2,"b"], [3,"c"])
     *
     * The result collection will have the length of the shorter
     * of both collections. Extra elements will be discarded.
     *
     * Also see [[StreamStatic.zip]] (static version which can more than two
     * iterables)
     */
    zip<U>(other: Iterable<U>): Stream<[T,U]> {
        const otherIterator = other[Symbol.iterator]();
        let otherCurItem = otherIterator.next();

        if (this.isEmpty() || otherCurItem.done) {
            return <EmptyStream<[T,U]>>emptyStream;
        }

        return new ConsStream([this.value, otherCurItem.value] as [T,U],
                              Lazy.of(() => this._tail.get().zip(
                                  { [Symbol.iterator]: ()=>otherIterator})));
    }

    /**
     * Combine this collection with the index of the elements
     * in it. Handy if you need the index when you map on
     * the collection for instance:
     *
     *     Stream.of("a","b").zipWithIndex().map(([v,idx]) => v+idx);
     *     => Stream.of("a0", "b1")
     */
    zipWithIndex(): Stream<[T,number]> {
        return <Stream<[T,number]>>SeqHelpers.zipWithIndex<T>(this);
    }

    /**
     * Reverse the collection. For instance:
     *
     *     Stream.of(1,2,3).reverse();
     *     => Stream.of(3,2,1)
     */
    reverse(): Stream<T> {
        return this.foldLeft(<Stream<T>><EmptyStream<T>>emptyStream, (xs,x) => xs.prepend(x));
    }

    /**
     * Takes a predicate; returns a pair of collections.
     * The first one is the longest prefix of this collection
     * which satisfies the predicate, and the second collection
     * is the remainder of the collection.
     *
     *    Stream.of(1,2,3,4,5,6).span(x => x <3)
     *    => [Stream.of(1,2), Stream.of(3,4,5,6)]
     */
    span(predicate:(x:T)=>boolean): [Stream<T>,Stream<T>] {
        return [this.takeWhile(predicate), this.dropWhile(predicate)];
    }

    /**
     * Split the collection at a specific index.
     *
     *     Stream.of(1,2,3,4,5).splitAt(3)
     *     => [Stream.of(1,2,3), Stream.of(4,5)]
     */
    splitAt(index:number): [Stream<T>,Stream<T>] {
        return [this.take(index), this.drop(index)];
    }

    /**
     * Returns a pair of two collections; the first one
     * will only contain the items from this collection for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     Stream.of(1,2,3,4).partition(x => x%2===0)
     *     => [Stream.of(2,4),Stream.of(1,3)]
     */
    partition<U extends T>(predicate:(v:T)=>v is U): [Stream<U>,Stream<Exclude<T,U>>];
    partition(predicate:(x:T)=>boolean): [Stream<T>,Stream<T>];
    partition(predicate:(v:T)=>boolean): [Stream<T>,Stream<T>] {
        // goes twice over the list, but since we want a lazy behavior...
        return [this.filter(predicate), this.filter(x => !predicate(x))];
    }

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[ConsStream.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C & WithEquality): HashMap<C,Stream<T>> {
        return this.foldLeft(
            HashMap.empty<C,Stream<T>>(),
            (acc: HashMap<C,Stream<T>>, v:T) =>
                acc.putWithMerge(
                    classifier(v), Stream.of(v),
                    (v1:Stream<T>,v2:Stream<T>)=>v1.appendStream(v2)));
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[ConsStream.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<HashMap<K,T>> {
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
     */
    append(v:T): Stream<T> {
        const tail = this._tail.get();
        return new ConsStream(
            this.value,
            Lazy.of(()=>tail.append(v)));
    }

    /*
     * Append multiple elements at the end of this Stream.
     */
    appendAll(elts:Iterable<T>): Stream<T> {
        return this.appendStream(Stream.ofIterable(elts));
    }

    /**
     * Remove multiple elements from a stream
     *
     *     Stream.of(1,2,3,4,3,2,1).removeAll([2,4])
     *     => Stream.of(1,3,3,1)
     */
    removeAll(elts:Iterable<T&WithEquality>): Stream<T> {
        return <Stream<T>><any>SeqHelpers.removeAll(this, elts);
    }

    /**
     * Removes the first element matching the predicate
     * (use [[ConsStream.filter]] to remove all elements matching a predicate)
     */
    removeFirst(predicate: (x:T)=>boolean): Stream<T> {
        const tail = this._tail.get();
        return predicate(this.value) ?
            tail :
            new ConsStream(this.value,
                           Lazy.of(()=>tail.removeFirst(predicate)));
    }

    /*
     * Append another Stream at the end of this Stream.
     *
     * There is no function taking a javascript iterator,
     * because iterators are stateful and Streams lazy.
     * If we would create two Streams working on the same iterator,
     * the streams would interact with one another.
     * It also breaks the cycle() function.
     */
    appendStream(elts:Stream<T>): Stream<T> {
        const tail = this._tail.get();
        return new ConsStream(
            this.value,
            Lazy.of(() => tail.appendStream(elts)));
    }

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): Stream<T> {
        return new ConsStream(
            elt,
            Lazy.of(()=>this));
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    prependAll(elts: Iterable<T>): Stream<T> {
        return Stream.ofIterable(elts).appendAll(this);
    }

    /**
     * Repeat infinitely this Stream.
     * For instance:
     *
     *     Stream.of(1,2,3).cycle().take(8)
     *     => Stream.of(1,2,3,1,2,3,1,2)
     */
    cycle(): Stream<T> {
        return this._cycle(this);
    }

    private _cycle(toRepeat: Stream<T>): Stream<T> {
        const tail = this._tail.get();
        return new ConsStream(
            this.value,
            Lazy.of(() => tail.isEmpty() ? toRepeat.cycle() : tail._cycle(toRepeat)));
    }

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(mapper:(v:T)=>U): Stream<U> {
        return new ConsStream(mapper(this.value),
                              Lazy.of(() => this._tail.get().map(mapper)));
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     *
     *     Stream.of(1,2,6).mapOption(x => x%2===0 ?
     *         Option.of(x+1) : Option.none<number>())
     *     => Stream.of(3, 7)
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): Stream<U> {
        const mapped = mapper(this.value);
        return mapped.isSome() ?
            new ConsStream(mapped.get(),
                           Lazy.of(() => this._tail.get().mapOption(mapper))) :
            this._tail.get().mapOption(mapper);
    }

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Stream<U>): Stream<U> {
        return mapper(this.value).appendStream(
            this._tail.get().flatMap(mapper));
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
    filter<U extends T>(predicate:(v:T)=>v is U): Stream<U>;
    filter(predicate:(v:T)=>boolean): Stream<T>;
    filter(predicate:(v:T)=>boolean): Stream<T> {
        return predicate(this.value) ?
            new ConsStream(this.value,
                           Lazy.of(() => this._tail.get().filter(predicate))) :
            this._tail.get().filter(predicate);
    }

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     *     const activityOrder = ["Writer", "Actor", "Director"];
     *     Stream.of({name:"George", activity: "Director"}, {name:"Robert", activity: "Actor"})
     *         .sortBy((p1,p2) => activityOrder.indexOf(p1.activity) - activityOrder.indexOf(p2.activity));
     *     => Stream.of({"name":"Robert","activity":"Actor"}, {"name":"George","activity":"Director"})
     *
     * also see [[ConsStream.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Stream<T> {
        return Stream.ofIterable<T>(this.toArray().sort(compare));
    }

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     *     Stream.of({a:3,b:"b"},{a:1,b:"test"},{a:2,b:"a"}).sortOn(elt=>elt.a)
     *     => Stream.of({a:1,b:"test"},{a:2,b:"a"},{a:3,b:"b"})
     *
     * You can also sort by multiple criteria, and request 'descending'
     * sorting:
     *
     *     Stream.of({a:1,b:"b"},{a:1,b:"test"},{a:2,b:"a"}).sortOn(elt=>elt.a,{desc:elt=>elt.b})
     *     => Stream.of({a:1,b:"test"},{a:1,b:"b"},{a:2,b:"a"})
     *
     * also see [[ConsStream.sortBy]]
     */
    sortOn(...getKeys: Array<ToOrderable<T>|{desc:ToOrderable<T>}>): Stream<T> {
        return <Stream<T>>SeqHelpers.sortOn<T>(this, getKeys);
    }

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Stream.of(1,1,2,3,2,3,1).distinctBy(x => x);
     *     => Stream.of(1,2,3)
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Stream<T> {
        return <Stream<T>>SeqHelpers.distinctBy(this, keyExtractor);
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fn: (v:T)=>void): Stream<T> {
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            fn(curItem.value);
            curItem = curItem._tail.get();
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
     * also see [[ConsStream.minOn]]
     */
    minBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.minBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the smallest.
     * Returns Option.none if the collection is empty.
     *
     *     Stream.of({name:"Joe", age:12}, {name:"Paula", age:6}).minOn(x=>x.age)
     *     => Option.of({name:"Paula", age:6})
     *
     * also see [[ConsStream.minBy]]
     */
    minOn(getOrderable: ToOrderable<T>): Option<T> {
        return SeqHelpers.minOn(this, getOrderable);
    }

    /**
     * Compare values in the collection and return the largest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[ConsStream.maxOn]]
     */
    maxBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.maxBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the largest.
     * Returns Option.none if the collection is empty.
     *
     *     Stream.of({name:"Joe", age:12}, {name:"Paula", age:6}).maxOn(x=>x.age)
     *     => Option.of({name:"Joe", age:12})
     *
     * also see [[ConsStream.maxBy]]
     */
    maxOn(getOrderable: ToOrderable<T>): Option<T> {
        return SeqHelpers.maxOn(this, getOrderable);
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
     *
     *     Stream.of(1,2,3).sumOn(x=>x)
     *     => 6
     */
    sumOn(getNumber: (v:T)=>number): number {
        return SeqHelpers.sumOn(this, getNumber);
    }

    /**
     * Slides a window of a specific size over the sequence.
     * Returns a lazy stream so memory use is not prohibitive.
     *
     *     Stream.of(1,2,3,4,5,6,7,8).sliding(3)
     *     => Stream.of(Stream.of(1,2,3), Stream.of(4,5,6), Stream.of(7,8))
     */
    sliding(count:number): Stream<Stream<T>> {
        return <Stream<Stream<T>>>SeqHelpers.sliding(this, count);
    }

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     *
     *     Stream.of(1,2,3).scanLeft(0, (soFar,cur)=>soFar+cur)
     *     => Stream.of(0,1,3,6)
     */
    scanLeft<U>(init:U, fn:(soFar:U,cur:T)=>U): Stream<U> {
        return new ConsStream(
            init,
            Lazy.of(()=>this._tail.get().scanLeft(fn(init, this.value), fn)));
    }

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     * The first element of the result is the final cumulative result.
     *
     *     Stream.of(1,2,3).scanRight(0, (cur,soFar)=>soFar+cur)
     *     => Stream.of(6,5,3,0)
     */
    scanRight<U>(init:U, fn:(cur:T,soFar:U)=>U): Stream<U> {
        // can't be lazy
        const fn2 = (x:U,y:T)=>fn(y,x);
        return this.reverse().scanLeft(init, fn2).reverse();
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
        let curItem: Stream<T> = this;
        let isNotFirst = false;
        while (!curItem.isEmpty()) {
            if (isNotFirst) {
                r += separator;
            }
            r += SeqHelpers.toStringHelper(curItem.value, {quoteStrings:false});
            curItem = curItem._tail.get();
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
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            r.push(curItem.value);
            curItem = curItem._tail.get();
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
     *
     *     Stream.of(1,2,3).toMap(x=>[x.toString(), x])
     *     => HashMap.of(["1",1], ["2",2], ["3",3])
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): HashMap<K,V> {
        return this.foldLeft(HashMap.empty<K,V>(), (acc,cur) => {
            const converted = converter(cur);
            return acc.put(converted[0], converted[1]);
        });
    }

    /**
     * Convert this collection to a set. Since the elements of the
     * Seq may not support equality, you must pass a function returning
     * a value supporting equality.
     *
     *     Stream.of(1,2,3,3,4).toSet(x=>x)
     *     => HashSet.of(1,2,3,4)
     */
    toSet<K>(converter:(x:T)=>K&WithEquality): HashSet<K> {
        return this.foldLeft(HashSet.empty<K>(), (acc,cur) => {
            return acc.add(converter(cur));
        });
    }

    /**
     * Convert this collection to a list.
     */
    toLinkedList(): LinkedList<T> {
        return LinkedList.ofIterable(this);
    }

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
    equals(other: Stream<T&WithEquality>): boolean {
        if (<any>other === this) {
            return true;
        }
        if (!other || !other.tail) {
            return false;
        }
        contractTrueEquality("Stream.equals", this, other);
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
            const myHead = myVal.value;
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
            myVal = myVal._tail.get();
            hisVal = (<ConsStream<T&WithEquality>>hisVal)._tail.get();
        }
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        let hash = 1;
        let curItem: Stream<T> = this;
        while (!curItem.isEmpty()) {
            hash = 31 * hash + getHashCode(curItem.value);
            curItem = curItem._tail.get();
        }
        return hash;
    }

    [inspect](): string {
        return this.toString();
    }

    /**
     * Get a human-friendly string representation of that value.
     *
     * Also see [[ConsStream.mkString]]
     */
    toString(): string {
        let curItem: Stream<T> = this;
        let result = "Stream(";

        while (!curItem.isEmpty()) {
            result += SeqHelpers.toStringHelper(curItem.value);
            const tail: Lazy<Stream<T>> = curItem._tail;
            if (!tail.isEvaluated()) {
                result += ", ?";
                break;
            }
            curItem = tail.get();
            if (!curItem.isEmpty()) {
                result += ", ";
            }
        }

        return result + ")";
    }
}

const emptyStream = new EmptyStream<any>();
