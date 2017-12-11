import { IMap } from "./IMap";
import { hasEquals, HasEquals, WithEquality,
         getHashCode, areEqual } from "./Comparison";
import { toStringHelper } from "./SeqHelpers";
import { contractTrueEquality } from "./Contract"
import { Option, none, None } from "./Option";
import { HashSet } from "./HashSet";
import { ISet } from "./ISet";
import { Vector } from "./Vector";
import { LinkedList } from "./LinkedList";
import * as SeqHelpers from "./SeqHelpers";
const hamt: any = require("hamt_plus");

// HashMap could extend Collection, conceptually. But I'm
// not super happy of having the callbacks get a pair, for instance
// 'HashMap.filter' takes two parameters in the current HashMap;
// if HashMap did implement Collection, it would have to take a k,v
// pair. There's also another trick with 'contains'. The Collection signature
// says T&WithEquality, but here we get [K&WithEquality,V&WithEquality],
// but arrays don't have equality so that doesn't type-check :-(

/**
 * A dictionary, mapping keys to values.
 * @param K the key type
 * @param V the value type
 */
export class HashMap<K,V> implements IMap<K,V> {

    /**
     * @hidden
     */
    protected constructor(private hamt: any) {}

    /**
     * The empty map.
     * @param K the key type
     * @param V the value type
     */
    static empty<K,V>(): HashMap<K,V> {
        return <EmptyHashMap<K,V>>emptyHashMap;
    }

    /**
     * Build a HashMap from key-value pairs.
     *
     *     HashMap.of([1,"a"],[2,"b"])
     *
     */
    static of<K,V>(...entries: Array<[K&WithEquality, V]>): HashMap<K,V> {
        return HashMap.ofIterable<K,V>(entries);
    }

    /**
     * Build a HashMap from an iterable containing key-value pairs.
     *
     *    HashMap.ofIterable(Vector.of<[number,string]>([1,"a"],[2,"b"]));
     */
    static ofIterable<K,V>(entries: Iterable<[K&WithEquality, V]>): HashMap<K,V> {
        // remember we must set up the hamt with the custom equality
        const iterator = entries[Symbol.iterator]();
        let curItem = iterator.next();
        if (curItem.done) {
            return new EmptyHashMap<K,V>();
        }
        // emptyhashmap.put sets up the custom equality+hashcode
        let startH = (new EmptyHashMap<K,V>()).put(curItem.value[0], curItem.value[1]).hamt;
        curItem = iterator.next();
        return new HashMap<K,V>(startH.mutate((h:any) => {
            while (!curItem.done) {
                h.set(curItem.value[0], curItem.value[1]);
                curItem = iterator.next();
            }
        }));
    }

    /**
     * Build a HashMap from a javascript object literal representing
     * a dictionary. Note that the key type must always be string,
     * as that's the way it works in javascript.
     * Also note that entries with undefined values will be stripped
     * from the map.
     *
     *     HashMap.ofObjectDictionary<number>({a:1,b:2})
     *     => HashMap.of(["a",1],["b",2])
     */
    static ofObjectDictionary<V>(object: {[index:string]: V|undefined}): HashMap<string,V> {
        // no need to bother with the proper equals & hashcode
        // as I know the key type supports ===
        const h: any = hamt.make().beginMutation();
        for (let property in object) {
            // the reason we strip entries with undefined values on
            // import from object dictionaries are: sanity, and also
            // partial object definitions like {[TKey in MyEnum]?:number}
            // where typescript sees the value type as 'number|undefined'
            // (there is a test covering that)
            if (object.hasOwnProperty(property) &&
                (typeof object[property] !== "undefined")) {
                h.set(property, object[property]);
            }
        }
        return new HashMap<string,V>(h.endMutation());
    }

    /**
     * Get the value for the key you give, if the key is present.
     */
    get(k: K & WithEquality): Option<V> {
        return Option.of<V>(this.hamt.get(k));
    }

    /**
     * Implementation of the Iterator interface.
     */
    [Symbol.iterator](): Iterator<[K,V]> {
        return this.hamt.entries();
    }

    /**
     * @hidden
     */
    hasTrueEquality(): boolean {
        // for true equality, need both key & value to have true
        // equality. but i can't check when they're in an array,
        // as array doesn't have true equality => extract them
        // and check them separately.
        return Option.of(this.hamt.entries().next().value)
            .map(x => x[0]).hasTrueEquality() &&
            Option.of(this.hamt.entries().next().value)
            .map(x => x[1]).hasTrueEquality()
    }

    /**
     * Add a new entry in the map. If there was entry with the same
     * key, it will be overwritten.
     * @param k the key
     * @param v the value
     */
    put(k: K & WithEquality, v: V): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.set(k,v));
    }

    /**
     * Return a new map with the key you give removed.
     */
    remove(k: K&WithEquality): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.remove(k));
    }

    /**
     * Add a new entry in the map; in case there was already an
     * entry with the same key, the merge function will be invoked
     * with the old and the new value to produce the value to take
     * into account.
     * @param k the key
     * @param v the value
     * @param merge a function to merge old and new values in case of conflict.
     */
    putWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.modify(k, (curV?: V) => {
            if (curV === undefined) {
                return v;
            }
            return merge(curV, v);
        }))
    }

    /**
     * number of items in the map
     */
    length(): number {
        return this.hamt.size;
    }

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<[K,V]> {
        return this.hamt.size === 1
            ? Option.of(this.hamt.entries().next().value)
            : Option.none();
    }

    /**
     * true if the map is empty, false otherwise.
     */
    isEmpty(): boolean {
        return this.hamt.size === 0;
    }

    /**
     * Get a Set containing all the keys in the map
     */
    keySet(): HashSet<K> {
        return HashSet.ofIterable<K>(this.hamt.keys());
    }

    /**
     * Get an iterable containing all the values in the map
     * (can't return a set as we don't constrain map values
     * to have equality in the generics type)
     */
    valueIterable(): Iterable<V> {
        return <Iterable<V>>this.hamt.values();
    }

    /**
     * Create a new map combining the entries of this map, and
     * the other map you give. In case an entry from this map
     * and the other map have the same key, the merge function
     * will be invoked to get a combined value.
     * @param other another map to merge with this one
     * @param merge a merge function to combine two values
     *        in case two entries share the same key.
     */
    mergeWith(elts: Iterable<[K & WithEquality,V]>, merge:(v1: V, v2: V) => V): HashMap<K,V> {
        const iterator = elts[Symbol.iterator]();
        let map: HashMap<K,V> = this;
        let curItem = iterator.next();
        while (!curItem.done) {
            map = map.putWithMerge(curItem.value[0], curItem.value[1], merge);
            curItem = iterator.next();
        }
        return map;
    }

    /**
     * Return a new map where each entry was transformed
     * by the mapper function you give. You return key,value
     * as pairs.
     */
    map<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2]): HashMap<K2,V2> {
        return this.hamt.fold(
            (acc: HashMap<K2,V2>, value: V, key: K&WithEquality) => {
                const [newk,newv] = fn(key, value);
                return acc.put(newk,newv);
            }, HashMap.empty());
    }

    /**
     * Return a new map where keys are the same as in this one,
     * but values are transformed
     * by the mapper function you give. You return key,value
     * as pairs.
     */
    mapValues<V2>(fn:(v:V)=>V2): HashMap<K,V2> {
        return this.hamt.fold(
            (acc: HashMap<K,V2>, value: V, key: K&WithEquality) =>
                acc.put(key,fn(value)), HashMap.empty());
    }

    /**
     * Calls the function you give for each item in the map,
     * your function returns a map, all the maps are
     * merged.
     */
    flatMap<K2,V2>(fn:(k:K, v:V)=>Iterable<[K2&WithEquality,V2]>): HashMap<K2,V2> {
        return this.foldLeft(HashMap.empty<K2,V2>(),
                             (soFar,cur) => soFar.mergeWith(fn(cur[0],cur[1]), (a,b)=>b));
    }

    /**
     * Returns true if the predicate returns true for all the
     * elements in the collection.
     */
    allMatch(predicate:(k:K,v:V)=>boolean): boolean {
        const iterator: Iterator<[K,V]> = this.hamt.entries();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (!predicate(curItem.value[0], curItem.value[1])) {
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
    anyMatch(predicate:(k:K,v:V)=>boolean): boolean {
        const iterator: Iterator<[K,V]> = this.hamt.entries();
        let curItem = iterator.next();
        while (!curItem.done) {
            if (predicate(curItem.value[0], curItem.value[1])) {
                return true;
            }
            curItem = iterator.next();
        }
        return false;
    }

    /**
     * Returns true if the item is in the collection,
     * false otherwise.
     */
    contains(val: [K&WithEquality,V&WithEquality]): boolean {
        return areEqual(this.hamt.get(val[0]), val[1]);
    }

    /**
     * Call a predicate for each element in the collection,
     * build a new collection holding only the elements
     * for which the predicate returned true.
     */
    filter(predicate:(k:K,v:V)=>boolean): HashMap<K,V> {
        return new HashMap<K,V>(
            hamt.make({hash:this.hamt._config.hash, keyEq:this.hamt._config.keyEq}).mutate((h:any) => {
                const iterator: Iterator<[K,V]> = this.hamt.entries();
                let curItem = iterator.next();
                while (!curItem.done) {
                    if (predicate(curItem.value[0], curItem.value[1])) {
                        h.set(curItem.value[0], curItem.value[1]);
                    }
                    curItem = iterator.next();
                }
            }));
    }

    /**
     * Reduces the collection to a single value using the
     * associative binary function you give. Since the function
     * is associative, order of application doesn't matter.
     *
     * Example:
     *
     *     HashMap.of<number,string>([1,"a"],[2,"b"],[3,"c"])
     *      .fold([0,""], ([a,b],[c,d])=>[a+c, b>d?b:d])
     *     => [6,"c"]
     */
    fold(zero:[K,V], fn:(v1:[K,V],v2:[K,V])=>[K,V]): [K,V] {
        return this.foldLeft(zero, fn);
    }

    /**
     * Reduces the collection to a single value.
     * Left-associative.
     * No guarantees for the order of items in a hashset!
     *
     * Example:
     *
     *     HashMap.of([1,"a"], [2,"bb"], [3,"ccc"])
     *     .foldLeft(0, (soFar,[item,val])=>soFar+val.length);
     *     => 6
     *
     * @param zero The initial value
     * @param fn A function taking the previous value and
     *           the current collection item, and returning
     *           an updated value.
     */
    foldLeft<U>(zero: U, fn:(soFar:U,cur:[K,V])=>U): U {
        return this.hamt.fold(
            (acc: U, v: V, k: K&WithEquality) =>
                fn(acc, [k,v]), zero);
    }

    /**
     * Reduces the collection to a single value.
     * Right-associative.
     * No guarantees for the order of items in a hashset!
     *
     * Example:
     *
     *     HashMap.of([1,"a"], [2,"bb"], [3,"ccc"])
     *     .foldRight(0, ([item,value],soFar)=>soFar+value.length);
     *     => 6
     *
     * @param zero The initial value
     * @param fn A function taking the current collection item and
     *           the previous value , and returning
     *           an updated value.
     */
    foldRight<U>(zero: U, fn:(cur:[K,V], soFar:U)=>U): U {
        return this.foldLeft(zero, (cur, soFar) => fn(soFar, cur));
    }

    /**
     * Reduces the collection to a single value by repeatedly
     * calling the combine function.
     * No starting value. The order in which the elements are
     * passed to the combining function is undetermined.
     */
    reduce(combine: (v1:[K,V],v2:[K,V])=>[K,V]): Option<[K,V]> {
        // not really glorious with any...
        return <Option<[K,V]>>SeqHelpers.reduce<any>(<any>this, combine);
    }

    /**
     * Convert to array.
     */
    toArray(): Array<[K,V]> {
        return this.hamt.fold(
            (acc: [[K,V]], value: V, key: K&WithEquality) =>
                {acc.push([key,value]); return acc; }, []);
    }

    /**
     * Convert this map to a vector of key,value pairs.
     * Note that Map is already an iterable of key,value pairs!
     */
    toVector(): Vector<[K,V]> {
        return this.hamt.fold(
            (acc: Vector<[K,V]>, value: V, key: K&WithEquality) =>
                acc.append([key,value]), Vector.empty());
    }

    /**
     * Convert this map to a list of key,value pairs.
     * Note that Map is already an iterable of key,value pairs!
     */
    toLinkedList(): LinkedList<[K,V]> {
        return LinkedList.ofIterable(this);
    }

    /**
     * Convert to a javascript object dictionary
     * You must provide a function to convert the
     * key to a string.
     *
     *     HashMap.of<string,number>(["a",1],["b",2])
     *         .toObjectDictionary(x=>x);
     *     => {a:1,b:2}
     */
    toObjectDictionary(keyConvert:(k:K)=>string): {[index:string]:V} {
        return this.foldLeft<{[index:string]:V}>({}, (soFar,cur)=> {
            soFar[keyConvert(cur[0])] = cur[1];
            return soFar;
        });
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:HashMap<K,V>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: IMap<K&WithEquality,V&WithEquality>): boolean {
        if (<any>other === this) {
            return true;
        }
        if (!other || !other.valueIterable) {
            return false;
        }
        contractTrueEquality("HashMap.equals", this, other);
        const sz = this.hamt.size;
        if (other.length() === 0 && sz === 0) {
            // we could get that i'm not the empty map
            // but my size is zero, after some filtering and such.
            return true;
        }
        if (sz !== other.length()) {
            return false;
        }
        const keys: Array<K & WithEquality> = Array.from<K & WithEquality>(this.hamt.keys());
        for (let k of keys) {
            const myVal: V|null|undefined = this.hamt.get(k);
            const hisVal: V|null|undefined = other.get(k).getOrUndefined();
            if (myVal === undefined || hisVal === undefined) {
                return false;
            }
            if (!areEqual(myVal, hisVal)) {
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
            (acc: number, value: V, key: K & WithEquality) =>
                getHashCode(key) + getHashCode(value), 0);
    }

    /*
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "{" +
            this.hamt.fold(
                (acc: string[], value: V, key: K) =>
                    {acc.push(
                        toStringHelper(key, {quoteStrings:false}) +
                            ": " + toStringHelper(value)); return acc;}, [])
            .join(", ") + "}";
    }

    inspect(): string {
        return this.toString();
    }
}

// we need to override the empty hashmap
// because i don't know how to get the hash & keyset
// functions for the keys without a key value to get
// the functions from
class EmptyHashMap<K,V> extends HashMap<K,V> {

    constructor() {
        super({}); // we must override all the functions
    }

    get(k: K & WithEquality): Option<V> {
        return <None<V>>none;
    }

    [Symbol.iterator](): Iterator<[K,V]> {
        return { next: () => ({ done: true, value: <any>undefined }) };
    }

    put(k: K & WithEquality, v: V): HashMap<K,V> {
        contractTrueEquality("Error building a HashMap", k);
        if (hasEquals(k)) {
            return new HashMap<K,V>(hamt.make({
                hash: (v: K & HasEquals) => v.hashCode(),
                keyEq: (a: K & HasEquals, b: K & HasEquals) => a.equals(b)
            }).set(k,v));
        }
        return new HashMap<K,V>(hamt.make().set(k,v));
    }

    remove(k: K&WithEquality): HashMap<K,V> {
        return this;
    }

    hasTrueEquality(): boolean {
        return true;
    }

    putWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): HashMap<K,V> {
        return this.put(k,v);
    }

    length(): number {
        return 0;
    }

    /**
     * If the collection contains a single element,
     * return Some of its value, otherwise return None.
     */
    single(): Option<[K,V]> {
        return Option.none<[K,V]>();
    }

    isEmpty(): boolean {
        return true;
    }

    keySet(): HashSet<K> {
        return HashSet.empty<K>();
    }

    valueIterable(): Iterable<V> {
        return {
            [Symbol.iterator](): Iterator<V> {
                return {
                    next(): IteratorResult<V> {
                        return {
                            done: true,
                            value: <any>undefined
                        };
                    }
                };
            }
        };
    }

    mergeWith(other: Iterable<[K & WithEquality,V]>, merge:(v1: V, v2: V) => V): HashMap<K,V> {
        return HashMap.ofIterable(other);
    }

    map<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2]): HashMap<K2,V2> {
        return HashMap.empty<K2,V2>();
    }

    mapValues<V2>(fn:(v:V)=>V2): HashMap<K,V2> {
        return HashMap.empty<K,V2>();
    }

    allMatch(predicate:(k:K,v:V)=>boolean): boolean {
        return true;
    }

    anyMatch(predicate:(k:K,v:V)=>boolean): boolean {
        return false;
    }

    contains(val: [K&WithEquality,V&WithEquality]): boolean {
        return false;
    }

    filter(predicate:(k:K,v:V)=>boolean): HashMap<K,V> {
        return this;
    }

    foldLeft<U>(zero: U, fn:(soFar:U,cur:[K,V])=>U): U {
        return zero;
    }

    toArray(): Array<[K,V]> {
        return [];
    }

    toVector(): Vector<[K,V]> {
        return Vector.empty<[K,V]>();
    }

    toLinkedList(): LinkedList<[K,V]> {
        return LinkedList.empty<[K,V]>();
    }

    equals(other: IMap<K&WithEquality,V&WithEquality>): boolean {
        if (!other || !other.valueIterable) {
            return false;
        }
        return <any>other === emptyHashMap || other.length() === 0;
    }

    hashCode(): number {
        return 0;
    }

    toString(): string {
        return "";
    }
}

const emptyHashMap = new EmptyHashMap();
