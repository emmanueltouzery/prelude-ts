import { ISet,
         SortOnSpec, SortBySpec, isSortOnSpec } from "./ISet";
import { Vector } from "./Vector";
import { HashMap } from "./HashMap";
import { LinkedList } from "./LinkedList";
import { Option } from "./Option";
import { WithEquality, hasEquals, HasEquals,
         getHashCode, areEqual, Ordering, ToOrderable  } from "./Comparison";
import * as SeqHelpers from "./SeqHelpers";
import { contractTrueEquality } from "./Contract";
import { inspect } from "./Value";
const hamt: any = require("hamt_plus");

/**
 * An unordered collection of values, where no two values
 * may be equal. A value can only be present once.
 * @param T the item type
 */
export class HashSet<T> implements ISet<T> {

    /**
     * @hidden
     */
    protected constructor(private hamt: any) {}

    /**
     * The empty hashset.
     * @param T the item type
     */
    static empty<T>(): HashSet<T> {
        return <EmptyHashSet<T>>emptyHashSet;
    }

    /**
     * Build a hashset from any iterable, which means also
     * an array for instance.
     * @param T the item type
     */
    static ofIterable<T>(elts: Iterable<T & WithEquality>): HashSet<T> {
        return new EmptyHashSet<T>().addAll(elts);
    }

    /**
     * Build a hashset from a series of items (any number, as parameters)
     * @param T the item type
     */
    static of<T>(...arr: Array<T & WithEquality>): HashSet<T> {
        return HashSet.ofIterable(arr);
    }

    /**
     * Curried predicate to find out whether the HashSet is empty.
     *
     *     Vector.of(HashSet.of(1), HashSet.empty<number>())
     *         .filter(HashSet.isEmpty)
     *     => Vector.of(HashSet.empty<number>())
     */
    static isEmpty<T>(v: HashSet<T>): boolean {
        return v.isEmpty();
    }

    /**
     * Curried predicate to find out whether the HashSet is empty.
     *
     *     Vector.of(HashSet.of(1), HashSet.empty<number>())
     *         .filter(HashSet.isNotEmpty)
     *     => Vector.of(HashSet.of(1))
     */
    static isNotEmpty<T>(v: HashSet<T>): boolean {
        return !v.isEmpty();
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

    private addAllArray(elts: Array<T&WithEquality>): HashSet<T> {
        return new HashSet<T>(this.hamt.mutate((h:any) => {
            if (elts.length > 0) {
                contractTrueEquality("Error building a HashSet", elts[0]);
            }
            for (const val of elts) {
                h.set(val, val);
            }
        }));
    }

    /**
     * Add multiple elements to this set.
     */
    addAll(elts: Iterable<T & WithEquality>): HashSet<T> {
        if (Array.isArray(elts)) {
            return this.addAllArray(elts);
        }
        return new HashSet<T>(this.hamt.mutate((h:any) => {
            let checkedEq = false;
            const iterator = elts[Symbol.iterator]();
            let curItem = iterator.next();
            if (!curItem.done && curItem.value && !checkedEq) {
                contractTrueEquality("Error building a HashSet", curItem.value);
                checkedEq = true;
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
     *
     *     HashSet.of(1,2,6).mapOption(x => x%2===0 ?
     *         Option.of(x+1) : Option.none<number>())
     *     => HashSet.of(3, 7)
     */
    mapOption<U>(mapper:(v:T)=>Option<U&WithEquality>): HashSet<U> {
        return this.hamt.fold(
            (acc: HashSet<U>, value: T&WithEquality, key: T&WithEquality) => {
                const val = mapper(value);
                return val.isSome() ? acc.add(val.get()) : acc
            }, HashSet.empty());
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fun:(x:T)=>void): HashSet<T> {
        const iterator: Iterator<T> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            fun(curItem.value);
            curItem = iterator.next();
        }
        return this;
    }

    /**
     * Calls the function you give for each item in the set,
     * your function returns a set, all the sets are
     * merged.
     */
    flatMap<U>(mapper:(v:T)=>HashSet<U&WithEquality>): HashSet<U> {
        return this.foldLeft(HashSet.empty<U>(),
                             (soFar,cur) => soFar.addAll(mapper(cur)));
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter<U extends T>(fn:(v:T)=>v is U): HashSet<U>;
    filter(predicate:(v:T)=>boolean): HashSet<T>;
    filter(predicate:(v:T)=>boolean): HashSet<T> {
        return new HashSet<T>(
            hamt.make({hash:this.hamt._config.hash, keyEq:this.hamt._config.keyEq}).mutate((h:any) => {
                const iterator: Iterator<T> = this.hamt.values();
                let curItem = iterator.next();
                while (!curItem.done) {
                    if (predicate(curItem.value)) {
                        h.set(curItem.value, curItem.value);
                    }
                    curItem = iterator.next();
                }
            }));
    }

    /**
     * Search for an item matching the predicate you pass,
     * return Option.Some of that element if found,
     * Option.None otherwise.
     * We name the method findAny instead of find to emphasize
     * that there is not ordering in a hashset.
     *
     *     HashSet.of(1,2,3).findAny(x => x>=3)
     *     => Option.of(3)
     *
     *     HashSet.of(1,2,3).findAny(x => x>=4)
     *     => Option.none<number>()
     */
    findAny(predicate:(v:T)=>boolean): Option<T> {
        const iterator: Iterator<T> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (predicate(curItem.value)) {
                return Option.of(curItem.value);
            }
            curItem = iterator.next();
        }
        return Option.none<T>();
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
     *     HashSet.of("a", "bb", "ccc").foldLeft(0, (soFar,item) => soFar+item.length);
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
     *     HashSet.of("a", "bb", "ccc").foldRight(0, (item,soFar) => soFar+item.length);
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
     * Converts this set to an array. Since a Set is not ordered
     * and since this method returns a JS array, it can be awkward
     * to get an array sorted in the way you'd like. So you can pass
     * an optional sorting function too.
     *
     *     HashSet.of(1,2,3).toArray().sort()
     *     => [1,2,3]
     *
     *     HashSet.of(1,2,3).toArray({sortOn:x=>x})
     *     => [1,2,3]
     *
     *     HashSet.of(1,2,3).toArray({sortBy:(x,y)=>x-y})
     *     => [1,2,3]
     *
     * You can also pass an array in sortOn, listing lambdas to
     * several fields to sort by those fields, and also {desc:lambda}
     * to sort by some fields descending.
     */
    toArray(sort?: SortOnSpec<T> | SortBySpec<T>): Array<T & WithEquality> {
        if (!sort) {
            return Array.from<T&WithEquality>(this.hamt.keys());
        }
        if (isSortOnSpec(sort)) {
            const sortOn = sort.sortOn instanceof Array ? sort.sortOn : [sort.sortOn];
            return Vector.ofIterable<T&WithEquality>(this.hamt.keys())
                .sortOn(...sortOn)
                .toArray();
        }
        return Array.from<T&WithEquality>(this.hamt.keys()).sort(sort.sortBy);
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
    toLinkedList(): LinkedList<T & WithEquality> {
        return LinkedList.ofIterable<T&WithEquality>(this.hamt.keys());
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

    isSubsetOf(other: ISet<T&WithEquality>): boolean {
        return this.allMatch((x:T) => other.contains(<T&WithEquality>x));
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
        return this.diff(HashSet.ofIterable<T&WithEquality>(elts));
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
     * Group elements in the collection using a classifier function.
     * Elements are then organized in a map. The key is the value of
     * the classifier, and in value we get the list of elements
     * matching that value.
     *
     * also see [[HashSet.arrangeBy]]
     */
    groupBy<C>(classifier: (v:T)=>C&WithEquality): HashMap<C,HashSet<T>> {
        // make a singleton set with the same equality as this
        const singletonHamtSet = (v:T) => hamt.make({
            hash:this.hamt._config.hash, keyEq:this.hamt._config.keyEq
        }).set(v,v);
        // merge two mutable hamt sets, but I know the second has only 1 elt
        const mergeSets = (v1:any,v2:any)=> {
            const k = v2.keys().next().value;
            v1.set(k,k);
            return v1;
        };
        return this.hamt.fold(
            // fold operation: combine a new value from the set with the accumulator
            (acc: HashMap<C,any>, v:T&WithEquality, k:T&WithEquality) =>
                acc.putWithMerge(
                    classifier(v), singletonHamtSet(v).beginMutation(),
                    mergeSets),
            // fold accumulator: the empty hashmap
            HashMap.empty())
            .mapValues((h:any) => new HashSet<T>(h.endMutation()));
    }

    /**
     * Matches each element with a unique key that you extract from it.
     * If the same key is present twice, the function will return None.
     *
     * also see [[HashSet.groupBy]]
     */
    arrangeBy<K>(getKey: (v:T)=>K&WithEquality): Option<HashMap<K,T>> {
        return SeqHelpers.arrangeBy<T,K>(this, getKey);
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
    partition<U extends T>(predicate:(v:T)=>v is U): [HashSet<U>,HashSet<Exclude<T,U>>];
    partition(predicate:(x:T)=>boolean): [HashSet<T>,HashSet<T>];
    partition(predicate:(v:T)=>boolean): [HashSet<T>,HashSet<T>] {
        let r1 = hamt.make({
            hash:this.hamt._config.hash, keyEq:this.hamt._config.keyEq
        }).beginMutation();
        let r2 = hamt.make({
            hash:this.hamt._config.hash, keyEq:this.hamt._config.keyEq
        }).beginMutation();
        const iterator: Iterator<T&WithEquality> = this.hamt.values();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (predicate(curItem.value)) {
                r1.set(curItem.value, curItem.value);
            } else {
                r2.set(curItem.value, curItem.value);
            }
            curItem = iterator.next();
        }
        return [new HashSet<T>(r1), new HashSet<T>(r2)];
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
     * also see [[HashSet.minOn]]
     */
    minBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.minBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the smallest.
     * Returns Option.none if the collection is empty.
     *
     * also see [[HashSet.minBy]]
     */
    minOn(getOrderable: ToOrderable<T>): Option<T> {
        return SeqHelpers.minOn(this, getOrderable);
    }

    /**
     * Compare values in the collection and return the largest element.
     * Returns Option.none if the collection is empty.
     *
     * also see [[HashSet.maxOn]]
     */
    maxBy(compare: (v1:T,v2:T)=>Ordering): Option<T> {
        return SeqHelpers.maxBy(this, compare);
    }

    /**
     * Call the function you give for each value in the collection
     * and return the element for which the result was the largest.
     * Returns Option.none if the collection is empty.
     *
     * also see [[HashSet.maxBy]]
     */
    maxOn(getOrderable: ToOrderable<T>): Option<T> {
        return SeqHelpers.maxOn(this, getOrderable);
    }

    /**
     * Call the function you give for each element in the collection
     * and sum all the numbers, return that sum.
     * Will return 0 if the collection is empty.
     *
     *     HashSet.of(1,2,3).sumOn(x=>x)
     *     => 6
     */
    sumOn(getNumber: (v:T)=>number): number {
        return SeqHelpers.sumOn(this, getNumber);
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:HashSet<T>)=>U): U {
        return converter(this);
    }

    /**
     * Convert to an ES6 Set.
     * You must provide a function to convert the
     * key to a string, number or boolean, because
     * with other types equality is not correctly
     * managed by JS.
     * https://stackoverflow.com/questions/29759480/how-to-customize-object-equality-for-javascript-set
     * https://esdiscuss.org/topic/maps-with-object-keys
     *
     *     HashSet.of("a", "b").toJsSet(x=>x);
     *     => new Set(["a", "b"])
     */
    toJsSet(keyConvert:(k:T)=>string): Set<string>;
    toJsSet(keyConvert:(k:T)=>number): Set<number>;
    toJsSet(keyConvert:(k:T)=>boolean): Set<boolean>;
    toJsSet<K extends string|number|boolean>(keyConvert:(k:T)=>K): Set<K> {
        return this.foldLeft(new Set<K>(), (sofar,cur) => sofar.add(keyConvert(cur)));
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: HashSet<T>): boolean {
        if (<any>other === this) {
            return true;
        }
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
     *
     * Also see [[HashSet.mkString]]
     */
    toString(): string {
        return "HashSet(" +
            this.hamt.fold(
                (acc: string[], value: T, key: T) =>
                    {acc.push(SeqHelpers.toStringHelper(key)); return acc;}, []).join(", ")
            + ")";
    }

    [inspect](): string {
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
                {acc.push(SeqHelpers.toStringHelper(key, {quoteStrings: false})); return acc;}, []).join(separator);
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
        if (!elt) {
            // special case if we get null for the first element...
            // less optimized variant because we don't know
            // if we should use '===' or 'equals'
            return new HashSet<T>(hamt.make({
                hash: (v: T & HasEquals) => getHashCode(v),
                keyEq: (a: T & HasEquals, b: T & HasEquals) => areEqual(a, b)
            }).set(elt,elt));
        }
        // if the element is not null, save a if later by finding
        // out right now whether we should call equals or ===
        if (hasEquals(elt)) {
            return new HashSet<T>(hamt.make({
                hash: (v: T & HasEquals) => v.hashCode(),
                keyEq: (a: T & HasEquals, b: T & HasEquals) => a.equals(b)
            }).set(elt,elt));
        }
        return new HashSet<T>(hamt.make().set(elt,elt));
    }

    addAll(elts: Iterable<T & WithEquality>): HashSet<T> {
        const it = elts[Symbol.iterator]();
        let curItem = it.next();
        if (curItem.done) {
            return <EmptyHashSet<T>>emptyHashSet;
        }
        return this.add(curItem.value).addAll({[Symbol.iterator]: () => it});
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

    forEach(fun:(x:T)=>void): HashSet<T> {
        return this;
    }

    filter<U extends T>(fn:(v:T)=>v is U): HashSet<U>;
    filter(predicate:(v:T)=>boolean): HashSet<T>;
    filter(predicate:(v:T)=>boolean): HashSet<T> {
        return this;
    }

    findAny(predicate:(v:T)=>boolean): Option<T> {
        return Option.none();
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        return zero;
    }

    toArray(sort?: SortOnSpec<T> | SortBySpec<T>): Array<T & WithEquality> {
        return [];
    }

    toVector(): Vector<T & WithEquality> {
        return Vector.empty<T&WithEquality>();
    }

    toLinkedList(): LinkedList<T & WithEquality> {
        return LinkedList.empty<T&WithEquality>();
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

    groupBy<C>(classifier: (v:T)=>C&WithEquality): HashMap<C,HashSet<T>> {
        return HashMap.empty();
    }

    allMatch(predicate:(v:T)=>boolean): boolean {
        return true;
    }

    partition<U extends T>(predicate:(v:T)=>v is U): [HashSet<U>,HashSet<Exclude<T,U>>];
    partition(predicate:(x:T)=>boolean): [HashSet<T>,HashSet<T>];
    partition<U extends T>(predicate:(v:T)=>boolean): [HashSet<U>,HashSet<any>] {
        return [<any>this, <any>this];
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
        return "HashSet()";
    }

    mkString(separator: string): string {
        return "";
    }
}

const emptyHashSet = new EmptyHashSet<any>();
