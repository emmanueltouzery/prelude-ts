import { IMap } from "./IMap";
import { hasEquals, HasEquals, WithEquality,
         getHashCode, areEqual, toStringHelper } from "./Comparison";
import { Option, none, None } from "./Option";
import { HashSet } from "./HashSet";
import { ISet } from "./ISet";
import { Vector } from "./Vector";
const hamt: any = require("hamt_plus");

/**
 * A dictionary, mapping keys to values.
 * @type K the key type
 * @type V the value type
 */
export class HashMap<K,V> implements IMap<K,V>, Iterable<[K,V]> {

    protected constructor(private hamt: any) {}

    /**
     * The empty map.
     * @type K the key type
     * @type V the value type
     */
    static empty<K,V>(): HashMap<K,V> {
        return <EmptyHashMap<K,V>>emptyHashMap;
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
     * Add a new entry in the map. If there was entry with the same
     * key, it will be overwritten.
     * @param k the key
     * @param v the value
     * No equality requirements
     */
    putStruct(k: K & WithEquality, v: V): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.set(k,v));
    }

    /**
     * Add a new entry in the map. If there was entry with the same
     * key, it will be overwritten.
     * @param k the key
     * @param v the value
     * Equality requirements
     */
    put(k: K & WithEquality, v: V & WithEquality): HashMap<K,V> {
        return this.putStruct(k, v);
    }

    /**
     * Add a new entry in the map; in case there was already an
     * entry with the same key, the merge function will be invoked
     * with the old and the new value to produce the value to take
     * into account.
     * @param k the key
     * @param v the value
     * @param merge a function to merge old and new values in case of conflict.
     * No equality requirements
     */
    putStructWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.modify(k, (curV?: V) => {
            if (curV === undefined) {
                return v;
            }
            return merge(curV, v);
        }))
    }

    /**
     * Add a new entry in the map; in case there was already an
     * entry with the same key, the merge function will be invoked
     * with the old and the new value to produce the value to take
     * into account.
     * @param k the key
     * @param v the value
     * @param merge a function to merge old and new values in case of conflict.
     * Equality requirements
     */
    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V&WithEquality, v2: V&WithEquality) => V): HashMap<K,V> {
        return this.putStructWithMerge(k, v, merge);
    }

    /**
     * number of items in the map
     */
    size(): number {
        return this.hamt.size;
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
     * Get a Set containing all the values in the map
     */
    valueSet(): HashSet<V> {
        return HashSet.ofIterable<V>(this.hamt.values());
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
    mergeWith(other: IMap<K & WithEquality,V>, merge:(v1: V, v2: V) => V): IMap<K,V> {
        // the entire function could be faster
        const otherKeys = other.keySet().toArray();
        let map: HashMap<K,V> = this;
        for (let i=0;i<otherKeys.length;i++) {
            const k = otherKeys[i];
            map = map.putStructWithMerge(k, other.get(k).getOrThrow(), merge);
        }
        return map;
    }

    /**
     * Return a new map where each entry was transformed
     * by the mapper function you give. You return key,value
     * as pairs.
     * No equality requirements.
     */
    mapStruct<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2]): HashMap<K2,V2> {
        return this.hamt.fold(
            (acc: HashMap<K2,V2>, value: V, key: K&WithEquality) => {
                const [newk,newv] = fn(key, value);
                return acc.putStruct(newk,newv);
            }, HashMap.empty());
    }

    /**
     * Return a new map where each entry was transformed
     * by the mapper function you give. You return key,value
     * as pairs.
     * Equality requirements.
     */
    map<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2&WithEquality]): HashMap<K2,V2> {
        return this.mapStruct(fn);
    }

    /**
     * Return a new map where keys are the same as in this one,
     * but values are transformed
     * by the mapper function you give. You return key,value
     * as pairs.
     * No equality requirements.
     */
    mapValuesStruct<V2>(fn:(v:V)=>V2): HashMap<K,V2> {
        return this.hamt.fold(
            (acc: HashMap<K,V2>, value: V, key: K&WithEquality) =>
                acc.putStruct(key,fn(value)), HashMap.empty());
    }

    /**
     * Return a new map where keys are the same as in this one,
     * but values are transformed
     * by the mapper function you give. You return key,value
     * as pairs.
     * Equality requirements.
     */
    mapValues<V2>(fn:(v:V)=>V2&WithEquality): HashMap<K,V2> {
        return this.mapValuesStruct(fn);
    }

    /**
     * Convert this map to a vector of key,value pairs.
     * Note that Map is already an iterable of key,value pairs!
     */
    toVector(): Vector<[K,V]> {
        return this.hamt.fold(
            (acc: Vector<[K,V]>, value: V, key: K&WithEquality) =>
                acc.appendStruct([key,value]), Vector.empty());
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: IMap<K,V>): boolean {
        if (!other || !other.valueSet) {
            return false;
        }
        const sz = this.hamt.size;
        if (other.size() === 0 && sz === 0) {
            // we could get that i'm not the empty map
            // but my size is zero, after some filtering and such.
            return true;
        }
        if (sz !== other.size()) {
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
                    {acc.push(key + " => " + toStringHelper(value)); return acc;}, []).join(", ") + "}";
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

    putStruct(k: K & WithEquality, v: V): HashMap<K,V> {
        if (hasEquals(k)) {
            return new HashMap<K,V>(hamt.make({
                hash: (v: K & HasEquals) => v.hashCode(),
                keyEq: (a: K & HasEquals, b: K & HasEquals) => a.equals(b)
            }).set(k,v));
        }
        return new HashMap<K,V>(hamt.make().set(k,v));
    }

    put(k: K & WithEquality, v: V & WithEquality): HashMap<K,V> {
        return this.putStruct(k,v);
    }

    putStructWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): HashMap<K,V> {
        return this.putStruct(k,v);
    }

    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V&WithEquality, v2: V&WithEquality) => V): HashMap<K,V> {
        return this.put(k,v);
    }

    size(): number {
        return 0;
    }

    isEmpty(): boolean {
        return true;
    }

    keySet(): HashSet<K> {
        return HashSet.empty<K>();
    }

    valueSet(): HashSet<V> {
        return HashSet.empty<V>();
    }

    mergeWith(other: IMap<K & WithEquality,V>, merge:(v1: V, v2: V) => V): IMap<K,V> {
        return other;
    }

    mapStruct<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2]): HashMap<K2,V2> {
        return HashMap.empty<K2,V2>();
    }

    mapValuesStruct<V2>(fn:(v:V)=>V2): HashMap<K,V2> {
        return HashMap.empty<K,V2>();
    }

    toVector(): Vector<[K,V]> {
        return Vector.empty<[K,V]>();
    }

    equals(other: HashMap<K,V>): boolean {
        if (!other || !other.valueSet) {
            return false;
        }
        return <any>other === emptyHashMap || other.size() === 0;
    }

    hashCode(): number {
        return 0;
    }
}

const emptyHashMap = new EmptyHashMap();
