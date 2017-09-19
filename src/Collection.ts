import { WithEquality, Ordering } from "./Comparison";
import { Value } from "./Value";
import { Option } from "./Option";

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
}
