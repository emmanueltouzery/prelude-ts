import { ISet } from "./ISet";
import { WithEquality, hasEquals, HasEquals,
         withEqHashCode, withEqEquals } from "./Comparison";
const hamt: any = require("hamt_plus");

export class HashSet<T> implements ISet<T> {
    
    /*private*/ constructor(private hamt: any) {}

    static empty<T>(): HashSet<T> {
        return <HashSet<T>>emptyHashSet;
    }

    add(elt: T & WithEquality): HashSet<T> {
        return new HashSet<T>(this.hamt.set(elt,elt));
    }

    toArray(): Array<T & WithEquality> {
        let r = [];
        for (let i=0;i<this.hamt.size;i++) {
            r.push(this.hamt.get(i));
        }
        return r;
    }

    size(): number {
        return this.hamt.size;
    }

    equals(other: HashSet<T>): boolean {
        const sz = this.hamt.size;
        if (other === emptyHashSet && sz === 0) {
            // we could get that i'm not the empty map
            // but my size is zero, after some filtering and such.
            return true;
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
            if (!withEqEquals(k, hisVal)) {
                return false;
            }
        }
        return true;
    }

    hashCode(): number {
        return this.hamt.fold(
            (acc: number, value: T & WithEquality, key: T & WithEquality) =>
                withEqHashCode(key), 0);
    }
}

// we need to override the empty hashmap
// because i don't know how to get the hash & keyset
// functions for the keys without a key value to get
// the functions from
class EmptyHashSet<T> extends HashSet<T> {

    /*private*/ constructor() {
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

    size(): number {
        return 0;
    }

    equals(other: HashSet<T>): boolean {
        return <any>other === emptyHashSet || other.size() === 0;
    }

    hashCode(): number {
        return 0;
    }
}

const emptyHashSet = new EmptyHashSet();
