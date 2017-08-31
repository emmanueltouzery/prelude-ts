import { WithEquality } from "./Util";

export interface Map<K,V> {
    get(k: K & WithEquality): V & WithEquality | undefined; // TODO: Option<V>

    /**
     * I require WithEquality also for the value, otherwise
     * we can't talk about the equality of two hashmaps...
     */
    put(k: K & WithEquality, v: V & WithEquality): Map<K,V>;

    size(): number;
}
