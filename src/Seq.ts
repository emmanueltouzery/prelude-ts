import { WithEquality, Ordering } from "./Comparison";
import { IMap } from "./IMap";
import { Option } from "./Option";
import { Collection } from "./Collection";

/**
 * A generic interface for list-like implementations.
 * @type T the item type
 */
export interface Seq<T> extends Collection<T> {

    /**
     * Append an element at the end of the collection.
     * No equality requirements.
     */
    appendStruct(elt: T): Seq<T>;

    /**
     * Append an element at the end of the collection.
     * Equality requirements.
     */
    append(elt: T & WithEquality): Seq<T>;

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     * Equality requirements.
     */
    appendAll(elts: Iterable<T&WithEquality>): Seq<T>;

    /**
     * Append multiple elements at the end of the collection.
     * Note that arrays are also iterables.
     * No equality requirements.
     */
    appendAllStruct(elts: Iterable<T>): Seq<T>;

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
     * No equality requirements.
     */
    mapStruct<U>(mapper:(v:T)=>U): Seq<U>;

    /**
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * Equality requirements.
     */
    map<U>(mapper:(v:T)=>U&WithEquality): Seq<U>;

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
     * Equality requirement
     */
    flatMap<U>(mapper:(v:T)=>Seq<U&WithEquality>): Seq<U>;

    /**
     * Calls the function you give for each item in the collection,
     * your function returns a collection, all the collections are
     * concatenated.
     * This is the monadic bind.
     * No equality requirement
     */
    flatMapStruct<U>(mapper:(v:T)=>Seq<U>): Seq<U>;

    /**
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see 'Seq.arrangeBy'
     */
    groupBy<C>(classifier: (v:T)=>C&WithEquality): IMap<C,Seq<T>>;

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see 'Seq.groupBy'
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<IMap<K,T>>;

    /**
     * Randomly reorder the elements of the collection.
     */
    shuffle(): Seq<T>;

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     *
     * also see 'Seq.sortOn'
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Seq<T>;

    /**
     * Give a function associating a number with
     * elements from the collection, and the elements
     * are sorted according to that number.
     *
     * also see 'Seq.sortBy'
     */
    sortOn(getKey: (v:T)=>number): Seq<T>;

    /**
     * Prepend an element at the beginning of the collection.
     * Equality requirements.
     */
    prependStruct(elt: T): Seq<T>;

    /**
     * Prepend an element at the beginning of the collection.
     * No equality requirements.
     */
    prepend(elt: T & WithEquality): Seq<T>;

    /**
     * Prepend multiple elements at the beginning of the collection.
     * Equality requirements.
     */
    prependAll(elts: Iterable<T&WithEquality>): Seq<T>;

    /**
     * Prepend multiple elements at the beginning of the collection.
     * No equality requirements.
     */
    prependAllStruct(elts: Iterable<T>): Seq<T>;

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
    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U;

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
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U;

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
     *     Vector.of(1,2,3).zip("a","b","c")
     *     => Vector.of([1,"a"], [2,"b"], [3,"c"])
     *
     * The result collection will have the length of the shorter
     * of both collections. Extra elements will be discarded.
     * Equality requirements.
     */
    zip<U>(other: Iterable<U&WithEquality>): Seq<[T,U]>;

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
     * No equality requirements.
     */
    zipStruct<U>(other: Iterable<U>): Seq<[T,U]>;

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
     * Returns a new collection, discarding the elements
     * after the first element which fails the predicate.
     */
    takeWhile(predicate:(x:T)=>boolean): Seq<T>;

    /**
     * Remove duplicate items; elements are mapped to keys, those
     * get compared.
     *
     *     Vector.of(1,1,2,3,2,3,1).distinctBy(x => x)
     *     => [1,2,3]
     */
    distinctBy<U>(keyExtractor: (x:T)=>U&WithEquality): Seq<T>;

    /**
     * Reverse the collection. For instance:
     *
     *     [1,2,3] => [3,2,1]
     */
    reverse(): Seq<T>;

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
    partition(predicate:(x:T)=>boolean): [Seq<T>,Seq<T>];

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     * Equality requirements.
     */
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V & WithEquality]): IMap<K,V>;

    /**
     * Convert this collection to a map. You give a function which
     * for each element in the collection returns a pair. The
     * key of the pair will be used as a key in the map, the value,
     * as a value in the map. If several values get the same key,
     * entries will be lost.
     * No equality requirements.
     */
    toMapStruct<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V>;

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Seq<T>)=>U): U;
}
