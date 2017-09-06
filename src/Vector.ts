import { Seq } from "./Seq";
import { WithEquality, Ordering, 
         withEqHashCode, withEqEquals } from "./Comparison";
import { HashMap} from "./HashMap";
import { IMap } from "./IMap";
import { Option } from "./Option";
const hamt: any = require("hamt_plus");

/**
 * A general-purpose list class with all-around good performance.
 * O(1) access, append, prepend.
 * @type T the item type
 */
export class Vector<T> implements Seq<T>, Iterable<T> {
    
    protected constructor(private hamt: any, private indexShift: number) {}

    private static readonly emptyVector = new Vector(hamt.make(), 0);

    /**
     * The empty vector.
     * @type T the item type
     */
    static empty<T>(): Vector<T> {
        return <Vector<T>>Vector.emptyVector;
    }
    
    /**
     * Build a vector from any iterable, which means also
     * an array for instance.
     * @type T the item type -- no equality requirement
     */
    static ofIterableStruct<T>(elts: Iterable<T>): Vector<T> {
        return (<Vector<T>>Vector.emptyVector).appendAllStruct(elts);
    }

    /**
     * Build a vector from any iterable, which means also
     * an array for instance.
     * @type T the item type -- equality requirement
     */
    static ofIterable<T>(elts: Iterable<T & WithEquality>): Vector<T> {
        return Vector.ofIterableStruct(elts);
    }

    /**
     * Build a vector from a series of items (any number, as parameters)
     * @type T the item type -- no equality requirement
     */
    static ofStruct<T>(...arr: Array<T>): Vector<T> {
        return Vector.ofIterableStruct(arr);
    }

    /**
     * Build a vector from a series of items (any number, as parameters)
     * @type T the item type -- equality requirement
     */
    static of<T>(...arr: Array<T & WithEquality>): Vector<T> {
        return Vector.ofIterable(arr);
    }
    
    /**
     * Implementation of the Iterator interface.
     */
    [Symbol.iterator](): Iterator<T> {
        let curIdx = 0;
        const hamt = this.hamt;
        return {
            next(): IteratorResult<T> {
                if (curIdx < hamt.size) {
                    return {
                        done: false,
                        value: hamt.get(curIdx++)
                    };
                }
                return { done: true, value: <any>undefined };
            }
        };
    }

    /**
     * Convert to array.
     */
    toArray(): Array<T & WithEquality> {
        let r = [];
        for (let i=0;i<this.hamt.size;i++) {
            r.push(this.hamt.get(i+this.indexShift));
        }
        return r;
    }

    /**
     * Get the size (length) of the collection.
     */
    size(): number {
        return this.hamt.size;
    }

    /**
     * true if the collection is empty, false otherwise.
     */
    isEmpty(): boolean {
        return this.hamt.size === 0;
    }

    /**
     * Get the first value of the vector, if any.
     * returns Option.Some if the vector is not empty,
     * Option.None if it's empty.
     */
    head(): Option<T> {
        return Option.ofStruct(this.hamt.get(this.indexShift));
    }

    /**
     * Get the last value of the collection, if any.
     * returns Option.Some if the collection is not empty,
     * Option.None if it's empty.
     */
    last(): Option<T> {
        return Option.ofStruct(this.hamt.get(this.hamt.size+this.indexShift-1));
    }

    /**
     * Get all the elements in the collection but the first one.
     * If the collection is empty, return an empty collection.
     */
    tail(): Vector<T> {
        return new Vector(this.hamt.remove(this.indexShift), this.indexShift+1);
    }

    /**
     * Append an element at the end of the collection.
     * No equality requirements.
     */
    appendStruct(elt: T): Vector<T> {
        return new Vector<T>(this.hamt.set(this.hamt.size+this.indexShift, elt), this.indexShift);
    }

    /**
     * Append an element at the end of the collection.
     * Equality requirements.
     */
    append(elt: T & WithEquality): Vector<T> {
        return this.appendStruct(elt);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * No equality requirements.
     */
    prependStruct(elt: T): Vector<T> {
        const newIndexShift = this.indexShift - 1;
        return new Vector<T>(this.hamt.set(newIndexShift, elt), newIndexShift);
    }

    /**
     * Prepend an element at the beginning of the collection.
     * Equality requirements.
     */
    prepend(elt: T & WithEquality): Vector<T> {
        return this.prependStruct(elt);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     * Equality requirements.
     *
     * This method requires Array.from()
     * You may need to polyfill it =>
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
     */
    prependAll(elts: Iterable<T & WithEquality>): Vector<T> {
        return this.prependAllStruct(elts);
    }

    /**
     * Prepend multiple elements at the beginning of the collection.
     * No equality requirements.
     *
     * This method requires Array.from()
     * You may need to polyfill it =>
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
     */
    prependAllStruct(elts: Iterable<T>): Vector<T> {
        // could optimize if i'm 100% the other one is a Vector...
        // (no need for in-order get, i can take all the keys in any order)
        //
        // need to transform to an array, because
        // I need the size immediately for the indexShift.
        const eltsAr = Array.from(elts);
        const newIndexShift = this.indexShift - eltsAr.length;
        let hamt = this.hamt;
        for (let i=0;i<eltsAr.length;i++) {
            hamt = hamt.set(newIndexShift+i, eltsAr[i]);
        }
        return new Vector<T>(hamt, newIndexShift);
    }

    /**
     * Call a function for element in the collection.
     */
    forEach(fn: (v:T)=>void): void {
        for (let i=0;i<this.hamt.size;i++) {
            fn(this.hamt.get(i+this.indexShift));
        }
    }

    appendAllStruct(elts: Iterable<T>): Vector<T> {
        return new Vector<T>(this.hamt.mutate(
            (h:any) => {
                const iterator = elts[Symbol.iterator]();
                let curItem = iterator.next();
                while (!curItem.done) {
                    h.set(h.size+this.indexShift, curItem.value);
                    curItem = iterator.next();
                }
            }), this.indexShift);
    }

    appendAll(elts: Iterable<T&WithEquality>): Vector<T> {
        return this.appendAllStruct(elts);
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
        return Vector.ofIterable(this.toArray().filter(predicate));
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
        return Vector.ofIterable(r);
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

    dropRight(n:number): Vector<T> {
        const sz = this.hamt.size;
        if (n>=sz) {
            return <Vector<T>>Vector.emptyVector;
        }
        return new Vector<T>(this.hamt.fold(
            (h:any,v:T,k:number) => (sz-k+this.indexShift>n) ?
                h.set(k-this.indexShift, v) : h,
            hamt.make()), 0);
    }

    sortBy(compare: (v1:T,v2:T)=>Ordering): Vector<T> {
        return Vector.ofIterable(this.toArray().sort(compare));
    }

    groupBy<C>(classifier: (v:T & WithEquality)=>C & WithEquality): HashMap<C,Vector<T>> {
        return this.hamt.fold(
            (acc: HashMap<C,Vector<T>>, v:T & WithEquality, k:number) =>
                acc.putWithMerge(
                    classifier(v), Vector.of(v),
                    (v1:Vector<T&WithEquality>,v2:Vector<T&WithEquality>)=>v1.appendAll(v2)), HashMap.empty());
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

    zipStruct<U>(other: Iterable<U>): Vector<[T,U]> {
        return new Vector<[T,U]>(hamt.empty.mutate(
            (h:any) => {
                let i = 0;
                const thisIterator = this[Symbol.iterator]();
                const otherIterator = other[Symbol.iterator]();
                let thisCurItem = thisIterator.next();
                let otherCurItem = otherIterator.next();

                while (!thisCurItem.done && !otherCurItem.done) {
                    h.set(i++, [thisCurItem.value, otherCurItem.value]);
                    thisCurItem = thisIterator.next();
                    otherCurItem = otherIterator.next();
                }
            }), 0);
    }

    zip<U>(other: Iterable<U&WithEquality>): Vector<[T,U]> {
        return this.zipStruct(other);
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
