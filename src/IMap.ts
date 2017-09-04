import { WithEquality } from "./Comparison";
import { Option } from "./Option";
import { Value } from "./Value"

export interface IMap<K,V> extends Value {
    get(k: K & WithEquality): Option<V & WithEquality>;

    /**
     * I require WithEquality also for the value, otherwise
     * we can't talk about the equality of two hashmaps...
     */
    put(k: K & WithEquality, v: V & WithEquality): IMap<K,V>;

    putStruct(k: K & WithEquality, v: V): IMap<K,V>;

    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V, v2: V) => V): IMap<K,V>;

    putStructWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): IMap<K,V>;

    size(): number;
}
