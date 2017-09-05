import { WithEquality } from "./Comparison";
import { Option } from "./Option";
import { Value } from "./Value"
import { ISet } from "./ISet";
import { Vector } from "./Vector";

export interface IMap<K,V> extends Value {

    keySet(): ISet<K>;

    get(k: K & WithEquality): Option<V>;

    /**
     * I require WithEquality also for the value, otherwise
     * we can't talk about the equality of two hashmaps...
     */
    put(k: K & WithEquality, v: V & WithEquality): IMap<K,V>;

    putStruct(k: K & WithEquality, v: V): IMap<K,V>;

    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V, v2: V) => V): IMap<K,V>;

    putStructWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): IMap<K,V>;

    mapStruct<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2]): IMap<K2,V2>;

    map<K2,V2>(fn:(k:K&WithEquality, v:V)=>[K2&WithEquality,V2&WithEquality]): IMap<K2,V2>;

    // these two should be uncommented but then the build time explodes
    // mapValuesStruct<V2>(fn:(v:V)=>V2): IMap<K,V2>;
    // mapValues<V2>(fn:(v:V)=>V2&WithEquality): IMap<K,V2>;

    toVector(): Vector<[K,V]>;

    size(): number;

    isEmpty(): boolean;

    mergeWith(other: IMap<K & WithEquality,V>, merge:(v1: V, v2: V) => V): IMap<K,V>;
}
