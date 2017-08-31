import { Value } from "./Value"

export interface Seq<T> extends Value {
    size(): number;
    toArray(): T[];
}
