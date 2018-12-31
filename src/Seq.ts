import { WithEquality, Ordering, ToOrderable } from "./Comparison";
import { HashMap } from "./HashMap";
import { HashSet } from "./HashSet";
import { Option } from "./Option";
import { Collection } from "./Collection";
import { Stream } from "./Stream";

/**
 * IterableArray can take a type and apply iterable to its
 * "components". That is useful for instance for [[Vector.zip]]
 *
 * `IterableArray<[string,number,string]>`
 * => `[Iterable<string>, Iterable<number>, Iterable<string>]`
 */
export type IterableArray<T> = { [K in keyof T] : Iterable<T[K]> };

/**
 * A generic interface for list-like implementations.
 * @param T the item type
 */
export interface Seq<T> extends Collection<T> {

    /**
     * Append an element at the end of the collection.
     */
    append(elt: T): Seq<T>;

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     */
    appendAll(elts: Iterable<T>): Seq<T>;

    /**
     * Remove multiple elements from a collection
     *
     *     Vector.of(1,2,3,4,3,2,1).removeAll([2,4])
     *     => Vector.of(1,3,3,1)
     */
    removeAll(elts: Iterable<T&WithEquality>): Seq<T>;

    /**
     * Removes the first element matching the predicate
     * (use [[Seq.filter]] to remove all elements matching a predicate)
     */
    removeFirst(predicate: (v:T)=>boolean): Seq<T>;

    /**
     * Call a function for element in the collection.
     * Return the unchanged collection.
     */
    forEach(fn: (v:T)=>void): Seq<T>;

    /**
     * Get the first value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    head(): Option<T>;

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    last(): Option<T>;

    /**
     * Get all the elements in the collection but the first one.
     * Option.None if it's empty.
     */
    tail(): Option<Seq<T>>;

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     */
    map<U>(mapper:(v:T)=>U): Seq<U>;

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     *
     *     Vector.of(1,2,6).mapOption(x => x%2===0 ?
     *         Option.of(x+1) : Option.none<number>())
     *     => Vector.of(3, 7)
     */
    mapOption<U>(mapper:(v:T)=>Option<U>): Seq<U>;

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     */
    find(predicate:(v:T)=>boolean): Option<T>;

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Seq<U>): Seq<U>;

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): Seq<T>;

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     *     const activityOrder = ["Writer", "Actor", "Director"];
     *     Vector.of({name:"George", activity: "Director"}, {name:"Robert", activity: "Actor"})
     *         .sortBy((p1,p2) => activityOrder.indexOf(p1.activity) - activityOrder.indexOf(p2.activity));
     *     => Vector.of({"name":"Robert","activity":"Actor"}, {"name":"George","activity":"Director"})
     *
     * also see [[Seq.sortOn]]
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Seq<T>;

    /**
     * Give a function associating a number or a string with
     * elements from the collection, and the elements
     * are sorted according to that value.
     *
     *     Vector.of({a:3,b:"b"}, {a:1,b:"test"}, {a:2,b:"a"}).sortOn(elt=>elt.a)
     *     => Vector.of({a:1,b:"test"}, {a:2,b:"a"}, {a:3,b:"b"})
     *
     * You can also sort by multiple criteria, and request 'descending'
     * sorting:
     *
     *     Vector.of({a:1,b:"b"}, {a:1,b:"test"}, {a:2,b:"a"}).sortOn(elt=>elt.a, {desc:elt=>elt.b})
     *     => Vector.of({a:1,b:"test"}, {a:1,b:"b"}, {a:2,b:"a"})
     *
     * also see [[Seq.sortBy]]
     */
    sortOn(...getKeys: Array<ToOrderable<T>|{desc:ToOrderable<T>}>): Seq<T>;

    /**
     * Prepend an element at the beginning of the collection.
     */
    prepend(elt: T): Seq<T>;

    /**
     * Prepend multiple elements at the beginning of the collection.
     */
    prependAll(elts: Iterable<T>): Seq<T>;

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     Vector.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    mkString(separator: string): string;

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
     *
     * Also see [[Vector.zip]], [[LinkedListStatic.zip]] and [[StreamStatic.zip]]
     * (static versions which can more than two iterables)
     */
    zip<U>(other: Iterable<U>): Seq<[T,U]>;

    /**
     * Combine this collection with the index of the elements
     * in it. Handy if you need the index when you map on
     * the collection for instance:
     *
     *     Vector.of("a","b").zipWithIndex().map(([v,idx]) => v+idx);
     *     => Vector.of("a0", "b1")
     */
    zipWithIndex(): Seq<[T,number]>;

    /**
     * Retrieve the element at index idx.
     * Returns an option because the collection may
     * contain less elements than the index.
     */
    get(idx: number): Option<T>;

    /**
     * Returns a new collection with the first
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    drop(n:number): Seq<T>;

    /**
     * Returns a new collection, discarding the first elements
     * until one element fails the predicate. All elements
     * after that point are retained.
     */
    dropWhile(predicate:(x:T)=>boolean): Seq<T>;

    /**
     * Returns a new collection with the last
     * n elements discarded.
     * If the collection has less than n elements,
     * returns the empty collection.
     */
    dropRight(n:number): Seq<T>;

    /**
     * Returns a new collection, discarding the last elements
     * until one element fails the predicate. All elements
     * before that point are retained.
     */
    dropRightWhile(predicate:(x:T)=>boolean): Seq<T>;

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate:(x:T)=>boolean): Seq<T>;

    /**
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate,
     * but starting from the end of the collection.
     *
     *     Vector.of(1,2,3,4).takeRightWhile(x => x > 2)
     *     => Vector.of(3,4)
     */
    takeRightWhile(predicate:(x:T)=>boolean): Seq<T>;

    /**
     * Return a new collection containing the first n
     * elements from this collection
     *
     *     Vector.of(1,2,3,4).take(2)
     *     => Vector.of(1,2)
     */
    take(n:number): Seq<T>;

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Vector.of(1,1,2,3,2,3,1).distinctBy(x => x);
     *     => Vector.of(1,2,3)
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Seq<T>;

    /**
     * Reverse the collection. For instance:
     *
     *     Vector.of(1,2,3).reverse();
     *     => Vector.of(3,2,1)
     */
    reverse(): Seq<T>;

    /**
     * Takes a predicate; returns a pair of collections.
     * The first one is the longest prefix of this collection
     * which satisfies the predicate, and the second collection
     * is the remainder of the collection.
     *
     *    Vector.of(1,2,3,4,5,6).span(x => x <3)
     *    => [Vector.of(1,2), Vector.of(3,4,5,6)]
     */
    span(predicate:(x:T)=>boolean): [Seq<T>,Seq<T>];

    /**
     * Split the collection at a specific index.
     *
     *     Vector.of(1,2,3,4,5).splitAt(3)
     *     => [Vector.of(1,2,3), Vector.of(4,5)]
     */
    splitAt(index:number): [Seq<T>,Seq<T>];

    /**
     * Slides a window of a specific size over the sequence.
     * Returns a lazy stream so memory use is not prohibitive.
     *
     *     Vector.of(1,2,3,4,5,6,7,8).sliding(3)
     *     => Stream.of(Vector.of(1,2,3), Vector.of(4,5,6), Vector.of(7,8))
     */
    sliding(count:number): Stream<Seq<T>>;

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     * The last element of the result is the final cumulative result.
     *
     *     Vector.of(1,2,3).scanLeft(0, (cur,soFar)=>soFar+cur)
     *     => Vector.of(0,1,3,6)
     */
    scanLeft<U>(init:U, fn:(soFar:U,cur:T)=>U): Seq<U>;

    /**
     * Apply the function you give to all elements of the sequence
     * in turn, keeping the intermediate results and returning them
     * along with the final result in a list.
     * The first element of the result is the final cumulative result.
     *
     *     Vector.of(1,2,3).scanRight(0, (cur,soFar)=>soFar+cur)
     *     => Vector.of(6,5,3,0)
     */
    scanRight<U>(init:U, fn:(cur:T,soFar:U)=>U): Seq<U>;

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     *
     *     Vector.of(1,2,3).toMap(x=>[x.toString(), x])
     *     => HashMap.of(["1",1], ["2",2], ["3",3])
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V]): HashMap<K,V>;

    /**
     * Convert this collection to a set. Since the elements of the
     * Seq may not support equality, you must pass a function returning
     * a value supporting equality.
     *
     *     Vector.of(1,2,3,3,4).toSet(x=>x)
     *     => HashSet.of(1,2,3,4)
     */
    toSet<K>(converter:(x:T)=>K&WithEquality): HashSet<K>;

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Seq<T>)=>U): U;
}
