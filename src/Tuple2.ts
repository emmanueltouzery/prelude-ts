import { Value } from "./Value";
import { WithEquality, areEqual, getHashCode } from "./Comparison";

/**
 * Contains a pair of two values, which may or may not have the same type.
 * Compared to the builtin typescript [T,U] type, we get equality semantics
 * and helper functions (like mapping and so on).
 * @type T the first item type
 * @type U the second item type
 */
export class Tuple2<T,U> implements Value {
    
    private constructor(private _fst: T,
                        private _snd: U) {}

    /**
     * Build a pair of value from both values.
     * Equality requirements.
     */
    static of<T,U>(fst: T & WithEquality, snd: U & WithEquality) {
        return new Tuple2(fst,snd);
    }

    /**
     * Build a pair of value from both values.
     * No equality requirements.
     */
    static ofStruct<T,U>(fst: T, snd: U) {
        return new Tuple2(fst,snd);
    }

    /**
     * Build a tuple2 from javascript pair.
     * Equality requirements.
     */
    static ofArray<T,U>(pair: [T & WithEquality, U & WithEquality]): Tuple2<T,U> {
        return new Tuple2(pair[0], pair[1]);
    }

    /**
     * Build a tuple2 from javascript pair.
     * No equality requirements.
     */
    static ofArrayStruct<T,U>(pair: [T, U]): Tuple2<T,U> {
        return new Tuple2(pair[0], pair[1]);
    }

    /**
     * Extract the first value from the pair
     */
    fst(): T {
        return this._fst;
    }

    /**
     * Extract the second value from the pair
     */
    snd(): U {
        return this._snd;
    }

    /**
     * Maps the first component of this tuple to a new value.
     * Equality requirements.
     */
    map1<V>(fn: (v:T)=>V&WithEquality): Tuple2<V,U> {
        return new Tuple2(fn(this._fst), this._snd);
    }

    /**
     * Maps the first component of this tuple to a new value.
     * No equality requirements.
     */
    map1Struct<V>(fn: (v:T)=>V): Tuple2<V,U> {
        return new Tuple2(fn(this._fst), this._snd);
    }

    /**
     * Maps the second component of this tuple to a new value.
     * Equality requirements.
     */
    map2<V>(fn: (v:U)=>V&WithEquality): Tuple2<T,V> {
        return new Tuple2(this._fst, fn(this._snd));
    }

    /**
     * Maps the second component of this tuple to a new value.
     * No equality requirements.
     */
    map2Struct<V>(fn: (v:U)=>V): Tuple2<T,V> {
        return new Tuple2(this._fst, fn(this._snd));
    }

    /**
     * Make a new tuple by mapping both values inside this one.
     */
    map<T1,U1>(fn: (a:T,b:U)=> Tuple2<T1,U1>): Tuple2<T1,U1> {
        return fn(this._fst, this._snd);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: Tuple2<T,U>): boolean {
        if (!other || !other._fst) {
            return false;
        }
        return areEqual(this._fst, other._fst) &&
            areEqual(this._snd, other._snd);
    }
    
    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        return getHashCode(this._fst)*53 + getHashCode(this._snd);
    }
    
    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return `Tuple2(${this._fst}, ${this._snd})`;
    }
}
