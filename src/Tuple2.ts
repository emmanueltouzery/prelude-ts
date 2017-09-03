import { Value } from "./Value";
import { WithEquality, withEqEquals, withEqHashCode } from "./Comparison";

export class Tuple2<T,U> implements Value {
    
    private constructor(private _fst: T & WithEquality,
                        private _snd: U & WithEquality) {}

    static of<T,U>(fst: T & WithEquality, snd: U & WithEquality) {
        return new Tuple2(fst,snd);
    }

    fst(): T & WithEquality {
        return this._fst;
    }

    snd(): U & WithEquality {
        return this._snd;
    }

    equals(other: Tuple2<T,U>): boolean {
        return withEqEquals(this._fst, other._fst) &&
            withEqEquals(this._snd, other._snd);
    }
    
    hashCode(): number {
        return withEqHashCode(this._fst)*53 + withEqHashCode(this._snd);
    }
    
    toString(): string {
        return `Tuple2(${this._fst}, ${this._snd})`;
    }
}
