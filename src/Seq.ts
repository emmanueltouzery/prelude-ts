import { Value } from "./Value";
import { WithEquality } from "./Util";
import { IMap } from "./IMap";

export interface Seq<T> extends Value {
    size(): number;
    toArray(): T[];
    append(elt: T & WithEquality|null): Seq<T>;
    forEach(fn: (v:T)=>void): void;
    appendAll(elts: Seq<T>): Seq<T>;
    map<U>(mapper:(v:T)=>U): Seq<U>;
    groupBy<C>(classifier: (v:T)=>C): IMap<C,Seq<T>>;
}
