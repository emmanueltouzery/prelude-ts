import { ISet } from "./ISet";
import { Vector } from "./Vector";
import { List } from "./List";
import { Option } from "./Option";
import { WithEquality, hasEquals, HasEquals, 
         getHashCode, areEqual, toStringHelper } from "./Comparison";
import { contractTrueEquality } from "./Contract";
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
        return <EmptyHashSet<T>>emptyHashSet;
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
            if (!curItem.done) {
                contractTrueEquality("Error building a HashSet", curItem.value);
            }
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
     * Return a new collection where each element was transformed
     * by the mapper function you give.
     * The resulting set may be smaller than the source.
     */
    map<U>(mapper:(v:T)=>U&WithEquality): HashSet<U> {
        return this.hamt.fold(
            (acc: HashSet<U>, value: T&WithEquality, key: T&WithEquality) => {
                return acc.add(mapper(value));
            }, HashSet.empty());
    }

    /**
     * Apply the mapper function on every element of this collection.
     * The mapper function returns an Option; if the Option is a Some,
     * the value it contains is added to the result Collection, if it's
     * a None, the value is discarded.
     */
    mapOption<U>(mapper:(v:T)=>Option<U&WithEquality>): HashSet<U> {
        return this.hamt.fold(
            (acc: HashSet<U>, value: T&WithEquality, key: T&WithEquality) => {
                const val = mapper(value);
                return val.isSome() ? acc.add(val.getOrThrow()) : acc
            }, HashSet.empty());
    }

    /**
     * Calls the function you give for each item in the set,
     * your function returns a set, all the sets are
     * merged.
     */
    flatMap<U>(mapper:(v:T)=>ISet<U&WithEquality>): HashSet<U> {
        return this.foldLeft(HashSet.empty<U>(),
                             (soFar,cur) => soFar.addAll(mapper(cur)));
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(predicate:(v:T)=>boolean): HashSet<T> {
        return this.hamt.fold(
            (acc: HashSet<T>, value: T&WithEquality, key: T&WithEquality) =>
                predicate(value) ? acc.add(value) : acc
            , HashSet.empty());
    }

    /**
     * Reduces the collection to a single value using the
     * associative binary function you give. Since the function
     * is associative, order of application doesn't matter.
     *
     * Example:
     *
     *     HashSet.of(1,2,3).fold(0, (a,b) => a + b);
     *     => 6
     */
    fold(zero:T, fn:(v1:T,v2:T)=>T): T {
        return this.foldLeft(zero, fn);
    }

    /**
     * Reduces the collection to a single value.
     * Left-associative.
     * No guarantees for the order of items in a hashset!
     *
     * Example:
     *
     *     HashSet.of("a", "bb", "ccc").foldLeft(0, (soFar,item) => soFar+item.length))
     *     => 6
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        return this.hamt.fold(
            (acc: U, v: T&WithEquality, k: T&WithEquality) =>
                fn(acc, v), zero);
    }

    /**
     * Reduces the collection to a single value.
     * Right-associative.
     * No guarantees for the order of items in a hashset!
     *
     * Example:
     *
     *     HashSet.of("a", "bb", "ccc").foldRight(0, (item,soFar) => soFar+item.length))
     *     => 6
     *
     * @param zero The initial value
     * @param fn A function taking the current collection item and
     *           the previous value , and returning
     *           an updated value.
     */
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        return this.foldLeft(zero, (cur, soFar) => fn(soFar, cur));
    }

    /**
     * Converts this set to an array
     */
    toArray(): Array<T & WithEquality> {
        return Array.from<T & WithEquality>(this.hamt.keys());
    }

    /**
     * Converts this set to an vector
     */
    toVector(): Vector<T & WithEquality> {
        return Vector.ofIterable<T&WithEquality>(this.hamt.keys());
    }

    /**
     * Converts this set to an list
     */
    toList(): List<T & WithEquality> {
        return List.ofIterable<T&WithEquality>(this.hamt.keys());
    }

    /**
     * Returns the number of elements in the set.
     */
    length(): number {
        return this.hamt.size;
    }

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<T> {
        return this.hamt.size === 1
            ? Option.of(this.hamt.keys().next().value)
            : Option.none();
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
     * also see [[HashSet.intersect]]
     */
    diff(elts: ISet<T&WithEquality>): HashSet<T> {
        return new HashSet<T>(this.hamt.fold(
            (acc: any, v: T&WithEquality, k: T&WithEquality) =>
                elts.contains(k) ? acc : acc.set(k,k), hamt.empty));
    }

    /**
     * Returns a new Set containing the intersection
     * of this set and the other Set passed as parameter
     * (the elements which are common to both sets)
     * also see [[HashSet.diff]]
     */
    intersect(other: ISet<T&WithEquality>): HashSet<T> {
        return new HashSet<T>(this.hamt.fold(
            (acc: any, v: T&WithEquality, k: T&WithEquality) =>
                other.contains(k) ? acc.set(k,k) : acc, hamt.empty));
    }

    /**
     * Returns a new set with the element you give removed
     * if it was present in the set.
     */
    remove(elt: T&WithEquality): HashSet<T> {
        return new HashSet<T>(this.hamt.remove(elt));
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
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(v:T)=>boolean): boolean {
        const iterator: Iterator<T> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (!predicate(curItem.value)) {
                return false;
            }
            curItem = iterator.next();
        }
        return true;
    }

    /**
     * Returns true if there the predicate returns true for any
     * element in the collection.
     */
    anyMatch(predicate:(v:T)=>boolean): boolean {
        const iterator: Iterator<T> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (predicate(curItem.value)) {
                return true;
            }
            curItem = iterator.next();
        }
        return false;
    }

    /**
     * Returns a pair of two sets; the first one
     * will only contain the items from this sets for
     * which the predicate you give returns true, the second
     * will only contain the items from this collection where
     * the predicate returns false.
     *
     *     HashSet.of(1,2,3,4).partition(x => x%2===0)
     *     => [HashSet.of(2,4), HashSet.of(1,3)]
     */
    partition(predicate:(x:T)=>boolean): [HashSet<T>,HashSet<T>] {
        let r1 = HashSet.empty<T>();
        let r2 = HashSet.empty<T>();
        const iterator: Iterator<T&WithEquality> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (predicate(curItem.value)) {
                r1 = r1.add(curItem.value);
            } else {
                r2 = r2.add(curItem.value);
            }
            curItem = iterator.next();
        }
        return [r1,r2];
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:HashSet<T>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: HashSet<T>): boolean {
        const sz = this.hamt.size;
        if (other === <EmptyHashSet<T>>emptyHashSet && sz === 0) {
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
        contractTrueEquality("HashSet.equals", this, other);
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
        return "{" + this.mkString(", ") + "}";
    }

    inspect(): string {
        return this.toString();
    }

    /**
     * Joins elements of the collection by a separator.
     * Example:
     *
     *     HashSet.of(1,2,3).mkString(", ")
     *     => "1, 2, 3"
     *
     * (of course, order is not guaranteed)
     */
    mkString(separator: string): string {
        return this.hamt.fold(
            (acc: string[], value: T, key: T) =>
                {acc.push(toStringHelper(key)); return acc;}, []).join(separator);
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
        contractTrueEquality("Error building a HashSet", elt);
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

    map<U>(mapper:(v:T)=>U&WithEquality): HashSet<U> {
        return <EmptyHashSet<U>>emptyHashSet;
    }

    mapOption<U>(mapper:(v:T)=>Option<U&WithEquality>): HashSet<U> {
        return <EmptyHashSet<U>>emptyHashSet;
    }

    filter(predicate:(v:T)=>boolean): HashSet<T> {
        return this;
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        return zero;
    }

    toArray(): Array<T & WithEquality> {
        return [];
    }

    toVector(): Vector<T & WithEquality> {
        return Vector.empty<T&WithEquality>();
    }

    toList(): List<T & WithEquality> {
        return List.empty<T&WithEquality>();
    }

    [Symbol.iterator](): Iterator<T> {
        return { next: () => ({ done: true, value: <any>undefined }) };
    }

    length(): number {
        return 0;
    }

    isEmpty(): boolean {
        return true;
    }

    diff(elts: ISet<T&WithEquality>): HashSet<T> {
        return this;
    }

    intersect(other: ISet<T&WithEquality>): HashSet<T> {
        return this;
    }

    anyMatch(predicate:(v:T)=>boolean): boolean {
        return false;
    }

    allMatch(predicate:(v:T)=>boolean): boolean {
        return true;
    }

    partition(predicate:(x:T)=>boolean): [HashSet<T>,HashSet<T>] {
        return [this, this];
    }

    remove(elt: T&WithEquality): HashSet<T> {
        return this;
    }

    equals(other: HashSet<T>): boolean {
        if (!other || !other.length) {
            return false;
        }
        return <any>other === emptyHashSet || other.length() === 0;
    }

    hashCode(): number {
        return 0;
    }

    toString(): string {
        return "{}";
    }

    mkString(separator: string): string {
        return "";
    }
}

const emptyHashSet = new EmptyHashSet();
