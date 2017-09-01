import { IMap } from "./IMap";
import { hasEquals, HasEquals, WithEquality,
         withEqHashCode, withEqEquals } from "./Util";
import { Option, none } from "./Option";
const hamt: any = require("hamt_plus");

export class HashMap<K,V> implements IMap<K,V> {

    /*private*/ constructor(private hamt: any) {}

    static empty<K,V>(): HashMap<K,V> {
        return <HashMap<K,V>>emptyHashMap;
    }

    get(k: K & WithEquality): Option<V & WithEquality> {
        return Option.of(this.hamt.get(k));
    }

    put(k: K & WithEquality, v: V & WithEquality): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.set(k,v));
    }

    putWithMerge(k: K & WithEquality, v: V & WithEquality, merge: (v1: V, v2: V) => V): HashMap<K,V> {
        return new HashMap<K,V>(this.hamt.modify(k, (curV?: V) => {
            if (curV === undefined) {
                return v;
            }
            return merge(curV, v);
        }))
    }

    size(): number {
        return this.hamt.size;
    }

    equals(other: HashMap<K,V>): boolean {
        const sz = this.hamt.size;
        if (other === emptyHashMap && sz === 0) {
            // we could get that i'm not the empty map
            // but my size is zero, after some filtering and such.
            return true;
        }
        if (sz !== other.hamt.size) {
            return false;
        }
        const keys: Array<K & WithEquality> = Array.from<K & WithEquality>(this.hamt.keys());
        for (let k of keys) {
            const myVal: V & WithEquality|null|undefined = this.hamt.get(k);
            const hisVal: V & WithEquality|null|undefined = other.get(k).getOrUndefined();
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
            (acc: number, value: V & WithEquality, key: K & WithEquality) =>
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

    /*private*/ constructor() {
        super({}); // we must override all the functions
    }

    get(k: K & WithEquality): Option<V & WithEquality> {
        return <Option<V & WithEquality>>none;
    }

    put(k: K & WithEquality, v: V & WithEquality): HashMap<K,V> {
        if (hasEquals(k)) {
            return new HashMap<K,V>(hamt.make({
                hash: (v: K & HasEquals) => v.hashCode(),
                keyEq: (a: K & HasEquals, b: K & HasEquals) => a.equals(b)
            }).set(k,v));
        }
        return new HashMap<K,V>(hamt.make().set(k,v));
    }

    size(): number {
        return 0;
    }

    equals(other: HashMap<K,V>): boolean {
        return <any>other === emptyHashMap || other.size() === 0;
    }

    hashCode(): number {
        return 0;
    }
}

const emptyHashMap = new EmptyHashMap();
