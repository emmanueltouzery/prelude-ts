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
    appendAll(elts: Iterable<T&WithEquality>): Seq<T>;
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
    mapStruct<U>(mapper:(v:T)=>U): Seq<U>;
    map<U>(mapper:(v:T)=>U&WithEquality): Seq<U>;
    filter(predicate:(v:T)=>boolean): Seq<T>;
    find(predicate:(v:T)=>boolean): Option<T>;
    flatMap<U>(mapper:(v:T)=>Seq<U>): Seq<U>;
    groupBy<C>(classifier: (v:T)=>C): IMap<C,Seq<T>>;
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

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U;
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U;
    mkString(separator: string): string;
    // https://github.com/Microsoft/TypeScript/issues/18257
    // zip<U>(other: Iterable<U&WithEquality>): Seq<[T,U]>;
    // zipStruct<U>(other: Iterable<U>): Seq<[T,U]>;
    get(idx: number): Option<T>;
    drop(n:number): Seq<T>;
    dropWhile(predicate:(x:T)=>boolean): Seq<T>;
    dropRight(n:number): Seq<T>;
    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V & WithEquality]): IMap<K,V>;
    toMapStruct<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V>;
}
