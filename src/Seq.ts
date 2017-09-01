import { Value } from "./Value"
import { WithEquality } from "./Util"

export interface Seq<T> extends Value {
    size(): number;
    toArray(): T[];
    append(elt: T & WithEquality|null): Seq<T>;
    forEach(fn: (v:T)=>void): void;
    appendAll(elts: Seq<T & WithEquality>): Seq<T>;
}
