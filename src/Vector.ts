import { Seq } from "./Seq";
import { WithEquality, Ordering, 
         withEqHashCode, withEqEquals } from "./Comparison";
import { HashMap} from "./HashMap";
import { IMap } from "./IMap";
import { Option } from "./Option";
const hamt: any = require("hamt_plus");

export class Vector<T> implements Seq<T> {
    
    protected constructor(private hamt: any, private indexShift: number) {}

    private static readonly emptyVector = new Vector(hamt.make(), 0);

    static empty<T>(): Vector<T> {
        return <Vector<T>>Vector.emptyVector;
    }
    
    static ofArrayStruct<T>(arr: Array<T>): Vector<T> {
        if (arr.length === 0) {
            return <Vector<T>>Vector.emptyVector;
        }
        return new Vector<T>(hamt.empty.mutate(
            (h:any) => arr.forEach((x, i) => h.set(i, x))), 0);
    }

    static ofArray<T>(arr: Array<T & WithEquality>): Vector<T> {
        return Vector.ofArrayStruct(arr);
    }

    static ofStruct<T>(...arr: Array<T>): Vector<T> {
        return Vector.ofArrayStruct(arr);
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

    isEmpty(): boolean {
        return this.hamt.size === 0;
    }

    head(): Option<T> {
        return Option.ofStruct(this.hamt.get(0));
    }

    appendStruct(elt: T): Vector<T> {
        return new Vector<T>(this.hamt.set(this.hamt.size+this.indexShift, elt), this.indexShift);
    }

    append(elt: T & WithEquality): Vector<T> {
        return this.appendStruct(elt);
    }

    prependStruct(elt: T): Vector<T> {
        const newIndexShift = this.indexShift - 1;
        return new Vector<T>(this.hamt.set(newIndexShift, elt), newIndexShift);
    }

    prepend(elt: T & WithEquality): Vector<T> {
        return this.prependStruct(elt);
    }

    prependAll(elts: Seq<T>): Vector<T> {
        // could optimize if i'm 100% the other one is a Vector...
        // (no need for in-order get, i can take all the keys in any order)
        const newIndexShift = this.indexShift - elts.size();
        let hamt = this.hamt;
        for (let i=0;i<elts.size();i++) {
            hamt = hamt.set(newIndexShift+i, elts.get(i).getOrUndefined());
        }
        return new Vector<T>(hamt, newIndexShift);
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

    mapStruct<U>(mapper:(v:T)=>U): Vector<U> {
        return new Vector<U>(this.hamt.fold(
            (acc: any, v:T & WithEquality, k:number) => acc.set(k-this.indexShift, mapper(v)),
            hamt.empty), 0);
    }

    map<U>(mapper:(v:T)=>U&WithEquality): Vector<U> {
        return this.mapStruct(mapper);
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

    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U {
        let r = zero;
        for (let i=0;i<this.hamt.size;i++) {
            r = fn(r, this.hamt.get(i+this.indexShift));
        }
        return r;
    }

    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U {
        let r = zero;
        for (let i=this.hamt.size-1;i>=0;i--) {
            r = fn(this.hamt.get(i+this.indexShift), r);
        }
        return r;
    }

    mkString(separator: string): string {
        let r = "";
        for (let i=0;i<this.hamt.size;i++) {
            if (i>0) {
                r += separator;
            }
            r += this.hamt.get(i+this.indexShift).toString();
        }
        return r;
    }

    get(idx: number): Option<T> {
        return Option.of(this.hamt.get(idx+this.indexShift));
    }

    drop(n:number): Vector<T> {
        if (n>=this.hamt.size) {
            return <Vector<T>>Vector.emptyVector;
        }
        return new Vector<T>(this.hamt.fold(
            (h:any,v:T,k:number) => (k-this.indexShift>=n) ?
                h.set(k-this.indexShift-n, v) : h,
            hamt.make()), 0);
    }

    dropWhile(predicate:(x:T)=>boolean): Vector<T> {
        let h = hamt.make();
        let skip = true;
        let newIdx = 0;
        for (let i=0;i<this.hamt.size;i++) {
            const v = this.hamt.get(i+this.indexShift);
            if (skip && !predicate(v)) {
                skip = false;
            }
            if (!skip) {
                h = h.set(newIdx++, v);
            }
        }
        return new Vector<T>(h, 0);
    }

    sortBy(compare: (v1:T,v2:T)=>Ordering): Vector<T> {
        return Vector.ofArray(this.toArray().sort(compare));
    }

    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,Vector<T>> {
        return this.hamt.fold(
            (acc: HashMap<C,Vector<T>>, v:T & WithEquality, k:number) =>
                acc.putWithMerge(classifier(v), Vector.of(v), (v1,v2)=>v1.appendAll(v2)), HashMap.empty());
    }

    toMap<K,V>(converter:(x:T)=>[K & WithEquality,V & WithEquality]): IMap<K,V> {
        return this.toMapStruct(converter);
    }

    toMapStruct<K,V>(converter:(x:T)=>[K & WithEquality,V]): IMap<K,V> {
        return this.hamt.fold(
            (acc: HashMap<K,V>, value:T, k:number) => {
                const converted = converter(value);
                return acc.putStruct(converted[0], converted[1]);
            }, HashMap.empty());
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
