import { ISet } from "./ISet";
import { WithEquality, hasEquals, HasEquals,
         getHashCode, areEqual } from "./Comparison";
const hamt: any = require("hamt_plus");

/**
 * An unordered collection of values, where no two values
 * may be equal. A value can only be present once.
 * @type T the item type
 */
export class HashSet<T> implements ISet<T>, Iterable<T> {

    /**
     * @hidden
     */
    protected constructor(private hamt: any) {}

    /**
     * The empty hashset.
     * @type T the item type
     */
    static empty<T>(): HashSet<T> {
        return <HashSet<T>>emptyHashSet;
    }

    /**
     * Build a hashset from any iterable, which means also
     * an array for instance.
     * @type T the item type
     */
    static ofIterable<T>(elts: Iterable<T & WithEquality>): HashSet<T> {
        return new HashSet<T>(hamt.empty).addAll(elts);
    }

    /**
     * Build a hashset from a series of items (any number, as parameters)
     * @type T the item type
     */
    static of<T>(...arr: Array<T & WithEquality>): HashSet<T> {
        return HashSet.ofIterable(arr);
    }

    /**
     * Implementation of the Iterator interface.
     */
    [Symbol.iterator](): Iterator<T> {
        return this.hamt.keys();
    }

    /**
     * Add an element to this set.
     */
    add(elt: T & WithEquality): HashSet<T> {
        return new HashSet<T>(this.hamt.set(elt,elt));
    }

    /**
     * Add multiple elements to this set.
     */
    addAll(elts: Iterable<T & WithEquality>): HashSet<T> {
        return new HashSet<T>(this.hamt.mutate((h:any) => {
            const iterator = elts[Symbol.iterator]();
            let curItem = iterator.next();
            while (!curItem.done) {
                h.set(curItem.value, curItem.value);
                curItem = iterator.next();
            }
        }));
    }

    /**
     * Returns true if the element you give is present in
     * the set, false otherwise.
     */
    contains(elt: T & WithEquality): boolean {
        return this.hamt.has(elt);
    }

    /**
     * Converts this set to an array
     */
    toArray(): Array<T & WithEquality> {
        return Array.from<T & WithEquality>(this.hamt.keys());
    }

    /**
     * Returns the number of elements in the set.
     */
    size(): number {
        return this.hamt.size;
    }

    /**
     * true if the set is empty, false otherwise.
     */
    isEmpty(): boolean {
        return this.hamt.size === 0;
    }

    /**
     * Returns a new Set containing the difference
     * between this set and the other Set passed as parameter.
     */
    diff(elts: ISet<T&WithEquality>): HashSet<T> {
        return new HashSet<T>(this.hamt.fold(
            (acc: any, v: T&WithEquality, k: T&WithEquality) =>
                elts.contains(k) ? acc : acc.set(k,k), hamt.empty));
    }

    /**
     * Returns a new set with all the elements of the current
     * Set, minus the elements of the iterable you give as a parameter.
     * If you call this function with a HashSet as parameter,
     * rather call 'diff', as it'll be faster.
     */
    removeAll(elts: Iterable<T&WithEquality>): HashSet<T> {
        return this.diff(HashSet.ofIterable(elts));
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: HashSet<T>): boolean {
        const sz = this.hamt.size;
        if (other === emptyHashSet && sz === 0) {
            // we could get that i'm not the empty map
            // but my size is zero, after some filtering and such.
            return true;
        }
        if (!other || !other.hamt) {
            return false;
        }
        if (sz !== other.hamt.size) {
            return false;
        }
        const keys: Array<T & WithEquality> = Array.from<T & WithEquality>(this.hamt.keys());
        for (let k of keys) {
            const hisVal: T & WithEquality|null|undefined = other.hamt.get(k);
            if (hisVal === undefined) {
                return false;
            }
            if (!areEqual(k, hisVal)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        return this.hamt.fold(
            (acc: number, value: T & WithEquality, key: T & WithEquality) =>
                getHashCode(key), 0);
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "{" +
            this.hamt.fold(
                (acc: string[], value: T, key: T) =>
                    {acc.push(key+""); return acc;}, []).join(", ") + "}";
    }
}

// we need to override the empty hashmap
// because i don't know how to get the hash & keyset
// functions for the keys without a key value to get
// the functions from
class EmptyHashSet<T> extends HashSet<T> {

    constructor() {
        super({}); // we must override all the functions
    }

    add(elt: T & WithEquality): HashSet<T> {
        if (hasEquals(elt)) {
            return new HashSet<T>(hamt.make({
                hash: (v: T & HasEquals) => v.hashCode(),
                keyEq: (a: T & HasEquals, b: T & HasEquals) => a.equals(b)
            }).set(elt,elt));
        }
        return new HashSet<T>(hamt.make().set(elt,elt));
    }

    /**
     * Add multiple elements to this set.
     */
    addAll(elts: Iterable<T & WithEquality>): HashSet<T> {
        return HashSet.ofIterable(elts);
    }

    contains(elt: T & WithEquality): boolean {
        return false;
    }

    [Symbol.iterator](): Iterator<T> {
        return { next: () => ({ done: true, value: <any>undefined }) };
    }

    size(): number {
        return 0;
    }

    isEmpty(): boolean {
        return true;
    }

    diff(elts: ISet<T&WithEquality>): HashSet<T> {
        return this;
    }

    equals(other: HashSet<T>): boolean {
        if (!other || !other.size) {
            return false;
        }
        return <any>other === emptyHashSet || other.size() === 0;
    }

    hashCode(): number {
        return 0;
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "{}";
    }
}

const emptyHashSet = new EmptyHashSet();
