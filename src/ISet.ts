import { WithEquality } from "./Comparison";
import { Value} from "./Value";

export interface ISet<T> extends Value {
    
    size(): number;
    isEmpty(): boolean;
    add(elt: T & WithEquality): ISet<T>;
    contains(elt: T & WithEquality): boolean;
    toArray(): Array<T & WithEquality>;
}
