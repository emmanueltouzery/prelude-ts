import { Value } from "./Value";
import { WithEquality, Ordering } from "./Comparison";
import { IMap } from "./IMap";
import { Option } from "./Option";

export interface Seq<T> extends Value {
    /**
     * Get the size (length) of the collection.
     */
    size(): number;

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): boolean;

    /**
     * Convert to array.
     */
    toArray(): Array<T>;

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
     */
    forEach(fn: (v:T)=>void): void;

    /**
     * Get the first value of the vector, if any.
     * returns Option.Some if the vector is not empty,
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
     * If the collection is empty, return an empty collection.
     */
    tail(): Seq<T>;

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
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(predicate:(v:T)=>boolean): Seq<T>;

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
     */
    groupBy<C>(classifier: (v:T)=>C): IMap<C,Seq<T>>;

    /**
     * Returns a new collection with elements
     * sorted according to the comparator you give.
     */
    sortBy(compare: (v1:T,v2:T)=>Ordering): Seq<T>;

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

    // https://github.com/Microsoft/TypeScript/issues/18257
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
    // zip<U>(other: Iterable<U&WithEquality>): Seq<[T,U]>;

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
    // zipStruct<U>(other: Iterable<U>): Seq<[T,U]>;

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
}
