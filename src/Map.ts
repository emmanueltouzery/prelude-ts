import { WithEquality } from "./Util";
import { Option } from "./Option";

export interface Map<K,V> {
    get(k: K & WithEquality): Option<V & WithEquality>;

    /**
     * I require WithEquality also for the value, otherwise
     * we can't talk about the equality of two hashmaps...
     */
    put(k: K & WithEquality, v: V & WithEquality): Map<K,V>;

    size(): number;
}
