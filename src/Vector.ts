import { Seq } from "./Seq";
import { WithEquality, Ordering, 
         withEqHashCode, withEqEquals } from "./Util";
import { HashMap} from "./HashMap";
import { Option } from "./Option";
const hamt: any = require("hamt_plus");

export class Vector<T> implements Seq<T> {
    
    /*private*/ constructor(private hamt: any, private indexShift: number) {}

    static empty<T>(): Vector<T> {
        return <Vector<T>>emptyVector;
    }

    static ofArray<T>(arr: Array<T & WithEquality>): Vector<T> {
        if (arr.length === 0) {
            return <Vector<T>>emptyVector;
        }
        return new Vector<T>(hamt.empty.mutate(
            (h:any) => arr.forEach((x, i) => h.set(i, x))), 0);
    }

    static of<T>(...arr: Array<T & WithEquality>): Vector<T> {
        return Vector.ofArray(arr);
    }

    toArray(): Array<T & WithEquality> {
        let r = [];
        for (let i=0;i<this.hamt.size;i++) {
            r.push(this.hamt.get(i+this.indexShift));
        }
        return r;
    }

    size(): number {
        return this.hamt.size;
    }

    append(elt: T & WithEquality|null): Vector<T> {
        return new Vector<T>(this.hamt.set(this.hamt.size+this.indexShift, elt), this.indexShift);
    }

    prepend(elt: T & WithEquality|null): Vector<T> {
        const newIndexShift = this.indexShift - 1;
        return new Vector<T>(this.hamt.set(newIndexShift, elt), newIndexShift);
    }

    forEach(fn: (v:T)=>void): void {
        for (let i=0;i<this.hamt.size;i++) {
            fn(this.hamt.get(i+this.indexShift));
        }
    }

    appendAll(elts: Vector<T>): Vector<T> {
        return new Vector<T>(this.hamt.mutate(
            (h:any) => elts.forEach(x => h.set(h.size+this.indexShift, x))), this.indexShift);
    }

    map<U>(mapper:(v:T)=>U): Vector<U> {
        return new Vector<U>(this.hamt.fold(
            (acc: any, v:T & WithEquality, k:number) => acc.set(k-this.indexShift, mapper(v)),
            hamt.empty), 0);
    }

    filter(predicate:(v:T)=>boolean): Vector<T> {
        return Vector.ofArray(this.toArray().filter(predicate));
    }

    find(predicate:(v:T)=>boolean): Option<T> {
        for (let i=0;i<this.hamt.size;i++) {
            const item = this.hamt.get(i+this.indexShift);
            if (predicate(item)) {
                return Option.of(item);
            }
        }
        return Option.none<T>();
    }
    
    flatMap<U>(mapper:(v:T)=>Vector<U>): Vector<U> {
        var r:Array<U & WithEquality> = [];
        for (let i=0;i<this.hamt.size;i++) {
            r = r.concat(mapper(this.hamt.get(i+this.indexShift)).toArray());
        }
        return Vector.ofArray(r);
    }

    sortBy(compare: (v1:T,v2:T)=>Ordering): Vector<T> {
        return Vector.ofArray(this.toArray().sort(compare));
    }

    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,Vector<T>> {
        return this.hamt.fold(
            (acc: HashMap<C,Vector<T>>, v:T & WithEquality, k:number) =>
                acc.putWithMerge(classifier(v), Vector.of(v), (v1,v2)=>v1.appendAll(v2)), HashMap.empty());
    }

    equals(other: Vector<T>): boolean {
        const sz = this.hamt.size;
        if (sz !== other.hamt.size) {
            return false;
        }
        for (let i=0;i<this.hamt.size;i++) {
            const myVal: T & WithEquality|null|undefined = this.hamt.get(i+this.indexShift);
            const hisVal: T & WithEquality|null|undefined = other.hamt.get(i+other.indexShift);
            if (myVal === undefined !== hisVal === undefined) {
                return false;
            }
            if (myVal === undefined || hisVal === undefined) {
                return true;
            }
            if (!withEqEquals(myVal, hisVal)) {
                return false;
            }
        }
        return true;
    }

    hashCode(): number {
        let hash = 1;
        for (let i=0;i<this.hamt.size;i++) {
            hash = 31 * hash + withEqHashCode(this.hamt.get(i+this.indexShift));
        }
        return hash;
    }

    toString(): string {
        let r = "[";
        for (let i=0;i<this.hamt.size;i++) {
            if (i>0) {
                r += ", ";
            }
            r += "" + this.hamt.get(i+this.indexShift);
        }
        return r + "]";
    }
}

const emptyVector = new Vector(hamt.make(), 0);
