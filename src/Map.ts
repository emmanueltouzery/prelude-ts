import { WithEquality } from "./Util";
import { Option } from "./Option";
import { Value } from "./Value"

export interface Map<K,V> extends Value {
    get(k: K & WithEquality): Option<V & WithEquality>;

    /**
     * I require WithEquality also for the value, otherwise
     * we can't talk about the equality of two hashmaps...
     */
    put(k: K & WithEquality, v: V & WithEquality): Map<K,V>;

    size(): number;
}
