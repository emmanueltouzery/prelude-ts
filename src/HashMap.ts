import { IMap } from "./IMap";
import { hasEquals, HasEquals, WithEquality,
         withEqHashCode, withEqEquals } from "./Comparison";
import { Option, none, None } from "./Option";
import { HashSet } from "./HashSet";
import { ISet } from "./ISet";
const hamt: any = require("hamt_plus");

export class HashMap<K,V> implements IMap<K,V> {

    protected constructor(private hamt: any) {}

    static empty<K,V>(): HashMap<K,V> {
        return <EmptyHashMap<K,V>>emptyHashMap;
    }

    get(k: K & WithEquality): Option<V> {
        return Option.of<V>(this.hamt.get(k));
    }

    putStruct(k: K & WithEquality, v: V): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.set(k,v));
    }

    put(k: K & WithEquality, v: V & WithEquality): HashMap<K,V> {
        return this.putStruct(k, v);
    }

    putStructWithMerge(k: K & WithEquality, v: V, merge: (v1: V, v2: V) => V): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.modify(k, (curV?: V) => {
            if (curV === undefined) {
                return v;
            }
            return merge(curV, v);
        }))
    }

    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V, v2: V) => V): HashMap<K,V> {
        return this.putStructWithMerge(k, v, merge);
    }

    size(): number {
        return this.hamt.size;
    }

    isEmpty(): boolean {
        return this.hamt.size === 0;
    }

    keySet(): HashSet<K> {
        return HashSet.ofArray<K>(Array.from<K & WithEquality>(this.hamt.keys()));
    }

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

    equals(other: IMap<K,V>): boolean {
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
            if (!withEqEquals(myVal, hisVal)) {
                return false;
            }
        }
        return true;
    }

    hashCode(): number {
        return this.hamt.fold(
            (acc: number, value: V, key: K & WithEquality) =>
                withEqHashCode(key) + withEqHashCode(value), 0);
    }

    toString(): string {
        return "{" +
            this.hamt.fold(
                (acc: string[], value: V, key: K) =>
                    {acc.push(key + " => " + value); return acc;}, []).join(", ") + "}";
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

    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V, v2: V) => V): HashMap<K,V> {
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

    mergeWith(other: IMap<K & WithEquality,V>, merge:(v1: V, v2: V) => V): IMap<K,V> {
        return other;
    }

    equals(other: HashMap<K,V>): boolean {
        return <any>other === emptyHashMap || other.size() === 0;
    }

    hashCode(): number {
        return 0;
    }
}

const emptyHashMap = new EmptyHashMap();
