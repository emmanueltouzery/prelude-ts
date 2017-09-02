import { Value } from "./Value";
import { WithEquality, Ordering } from "./Comparison";
import { IMap } from "./IMap";
import { Option } from "./Option";

export interface Seq<T> extends Value {
    size(): number;
    toArray(): T[];
    append(elt: T & WithEquality): Seq<T>;
    forEach(fn: (v:T)=>void): void;
    appendAll(elts: Seq<T>): Seq<T>;
    map<U>(mapper:(v:T)=>U): Seq<U>;
    filter(predicate:(v:T)=>boolean): Seq<T>;
    find(predicate:(v:T)=>boolean): Option<T>;
    flatMap<U>(mapper:(v:T)=>Seq<U>): Seq<U>;
    groupBy<C>(classifier: (v:T)=>C): IMap<C,Seq<T>>;
    sortBy(compare: (v1:T,v2:T)=>Ordering): Seq<T>;
    prepend(elt: T & WithEquality): Seq<T>;
    foldLeft<U>(zero: U, fn:(soFar:U,cur:T)=>U): U;
    foldRight<U>(zero: U, fn:(cur:T, soFar:U)=>U): U;
    mkString(separator: string): string;
    get(idx: number): Option<T>;
}
