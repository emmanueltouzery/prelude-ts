import { Value } from "./Value";
import { WithEquality, withEqEquals, withEqHashCode } from "./Comparison";

/**
 * Contains a pair of two values, which may or may not have the same type.
 * Compared to the builtin typescript [T,U] type, we get equality semantics
 * and helper functions (like mapping and so on).
 * @type T the first item type
 * @type U the second item type
 */
export class Tuple2<T,U> implements Value {
    
    private constructor(private _fst: T & WithEquality,
                        private _snd: U & WithEquality) {}

    /**
     * Build a pair of value from both values.
     */
    static of<T,U>(fst: T & WithEquality, snd: U & WithEquality) {
        return new Tuple2(fst,snd);
    }

    /**
     * Extract the first value from the pair
     */
    fst(): T & WithEquality {
        return this._fst;
    }

    /**
     * Extract the second value from the pair
     */
    snd(): U & WithEquality {
        return this._snd;
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: Tuple2<T,U>): boolean {
        return withEqEquals(this._fst, other._fst) &&
            withEqEquals(this._snd, other._snd);
    }
    
    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        return withEqHashCode(this._fst)*53 + withEqHashCode(this._snd);
    }
    
    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return `Tuple2(${this._fst}, ${this._snd})`;
    }
}
