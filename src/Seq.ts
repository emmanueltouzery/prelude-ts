import { Value } from "./Value";
import { WithEquality, Ordering } from "./Util";
import { IMap } from "./IMap";

export interface Seq<T> extends Value {
    size(): number;
    toArray(): T[];
    append(elt: T & WithEquality|null): Seq<T>;
    forEach(fn: (v:T)=>void): void;
    appendAll(elts: Seq<T>): Seq<T>;
    map<U>(mapper:(v:T)=>U): Seq<U>;
    filter(predicate:(v:T)=>boolean): Seq<T>;
    flatMap<U>(mapper:(v:T)=>Seq<U>): Seq<U>;
    groupBy<C>(classifier: (v:T)=>C): IMap<C,Seq<T>>;
    sortBy(compare: (v1:T,v2:T)=>Ordering): Seq<T>;
    prepend(elt: T & WithEquality|null): Seq<T>;
}
