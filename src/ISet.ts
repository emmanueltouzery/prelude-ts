import { WithEquality } from "./Comparison";
import { Value} from "./Value";

export interface ISet<T> extends Value {
    
    /**
     * Returns the number of elements in the set.
     */
    size(): number;

    /**
     * true if the set is empty, false otherwise.
     */
    isEmpty(): boolean;

    /**
     * Add an element to this set.
     */
    add(elt: T & WithEquality): ISet<T>;

    /**
     * Returns true if the element you give is present in
     * the set, false otherwise.
     */
    contains(elt: T & WithEquality): boolean;

    /**
     * Converts this set to an array
     */
    toArray(): Array<T & WithEquality>;
}
