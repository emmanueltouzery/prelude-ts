import { WithEquality } from "./Comparison";
import { Option } from "./Option";
import { Value } from "./Value"
import { ISet } from "./ISet";
import { Vector } from "./Vector";

/**
 * A generic interface for a dictionary, mapping keys to values.
 * @type K the key type
 * @type V the value type
 */
export interface IMap<K,V> extends Value {

    /**
     * Get a Set containing all the keys in the map
     */
    keySet(): ISet<K>;

    /**
     * Get a Set containing all the values in the map
     */
    valueSet(): ISet<V>;

    /**
     * Get the value for the key you give, if the key is present.
     */
    get(k: K & WithEquality): Option<V>;

    /**
     * Add a new entry in the map. If there was entry with the same
     * key, it will be overwritten.
     * @param k the key
     * @param v the value
     * Equality requirements
     */
    put(k: K & WithEquality, v: V & WithEquality): IMap<K,V>;

    /**
     * Add a new entry in the map. If there was entry with the same
     * key, it will be overwritten.
     * @param k the key
     * @param v the value
     * No equality requirements
     */
    putStruct(k: K & WithEquality, v: V): IMap<K,V>;

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
    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V&WithEquality, v2: V&WithEquality) => V): IMap<K,V>;

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
    putStructWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): IMap<K,V>;

    mapStruct<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2]): IMap<K2,V2>;

    map<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2&WithEquality]): IMap<K2,V2>;

    // these two should be uncommented but then the build time explodes
    // mapValuesStruct<V2>(fn:(v:V)=>V2): IMap<K,V2>;
    // mapValues<V2>(fn:(v:V)=>V2&WithEquality): IMap<K,V2>;

    toVector(): Vector<[K,V]>;

    /**
     * number of items in the map
     */
    size(): number;

    /**
     * true if the map is empty, false otherwise.
     */
    isEmpty(): boolean;

    mergeWith(other: IMap<K & WithEquality,V>, merge:(v1: V, v2: V) => V): IMap<K,V>;
}
