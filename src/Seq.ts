import { Value } from "./Value"

export interface Seq<T> extends Value {
    size(): number;
    toArray(): T[];
    append(elt: T|null): Seq<T>;
}
