import { Value } from "./Value";
import { WithEquality, withEqEquals, withEqHashCode } from "./Comparison";

export abstract class Option<T> implements Value {
    /**
     * T gives a some
     * undefined gives a none
     * null gives a some
     */
    static of<T>(v: T & WithEquality|undefined): Option<T> {
        if (v === undefined) {
            return <Option<T>>none;
        }
        return new Some(v);
    }

    static none<T>(): Option<T> {
        return <Option<T>>none;
    }

    abstract isSome(): boolean;
    abstract isNone(): boolean;
    abstract contains(v: T|null): boolean;
    abstract getOrUndefined(): T|null|undefined;
    abstract map<U>(fn: (v:T & WithEquality)=>U & WithEquality): Option<U>;
    abstract flatMap<U>(mapper:(v:T)=>Option<U>): Option<U>;
    abstract filter(fn: (v:T & WithEquality)=>boolean): Option<T>;
    abstract equals(other: Option<T>): boolean;
    abstract hashCode(): number;
    abstract toString(): string;
}

export class Some<T> extends Option<T> {
    constructor(private value: T & WithEquality) {
        super();
    }

    isSome(): boolean {
        return true;
    }
    isNone(): boolean {
        return false;
    }
    contains(v: T): boolean {
        return v === this.value;
    }
    getOrUndefined(): T | undefined {
        return this.value;
    }
    map<U>(fn: (v:T & WithEquality)=>U & WithEquality): Option<U> {
        return Option.of(fn(this.value));
    }
    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return mapper(this.value);
    }
    filter(fn: (v:T & WithEquality)=>boolean): Option<T> {
        return fn(this.value) ? this : Option.none<T>();
    }
    equals(other: Option<T>): boolean {
        if (other === none) {
            return false;
        }
        const someOther = <Some<T>>other;
        return withEqEquals(this.value, someOther.value);
    }
    hashCode(): number {
        return withEqHashCode(this.value);
    }
    toString(): string {
        return "Some(" + this.value + ")";
    }
}

export class None<T> extends Option<T> {
    isSome(): boolean {
        return false;
    }
    isNone(): boolean {
        return true;
    }
    contains(v: T): boolean {
        return false;
    }
    getOrUndefined(): T|undefined {
        return undefined;
    }
    map<U>(fn: (v:T & WithEquality)=>U & WithEquality): Option<U> {
        return <Option<U>>none;
    }
    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return <Option<U>>none;
    }
    filter(fn: (v:T & WithEquality)=>boolean): Option<T> {
        return <Option<T>>none;
    }
    equals(other: Option<T>): boolean {
        return other === none;
    }
    hashCode(): number {
        return 1;
    }
    toString(): string {
        return "None()";
    }
}

export const none = new None();
