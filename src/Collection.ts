import { WithEquality, Ordering } from "./Comparison";
import { Value } from "./Value";
import { Option } from "./Option";
import { Foldable } from "./Foldable";

export interface Collection<T> extends Value, Iterable<T> {
    
    /**
     * Get the length of the collection.
     */
    length(): number;

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): boolean;

    /**
     * Convert to array.
     */
    toArray(): Array<T>;

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(predicate:(v:T)=>boolean): Collection<T>;

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
    partition(predicate:(x:T)=>boolean): [Collection<T>,Collection<T>];

    /**
     * Returns true if the item is in the collection,
     * false otherwise.
     */
    contains(v:T&WithEquality): boolean;

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(v:T)=>boolean): boolean;

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    anyMatch(predicate:(v:T)=>boolean): boolean;

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<T>;

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     Vector.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     */
    mkString(separator: string | {prefix?:string,delimiter:string,suffix?:string}): string;

    equals(other: Foldable<T&WithEquality>|Collection<T&WithEquality>): boolean;
}
