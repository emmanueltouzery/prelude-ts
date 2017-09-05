import { Value } from "./Value";
import { Seq } from "./Seq";
import { Vector } from "./Vector";
import { WithEquality, withEqEquals, withEqHashCode } from "./Comparison";

export abstract class Option<T> implements Value {
    /**
     * T gives a some
     * undefined gives a none
     * null gives a some
     *
     * require WithEquality for the value otherwise
     * I can't talk about equality between Option objects.
     */
    static of<T>(v: T & WithEquality|undefined): Option<T> {
        if (v === undefined) {
            return <None<T>>none;
        }
        return new Some(v);
    }

    static ofStruct<T>(v: T|undefined): Option<T> {
        if (v === undefined) {
            return <None<T>>none;
        }
        return new Some(v);
    }

    static none<T>(): Option<T> {
        return <None<T>>none;
    }

    static sequence<T>(seq:Seq<Option<T>>): Option<Seq<T>> {
        let r: Seq<T> = Vector.empty();
        for (let i=0;i<seq.size();i++) {
            const v = seq.get(i).getOrThrow();
            if (v.isNone()) {
                return <None<Seq<T>>>none;
            }
            r = r.appendStruct(v.getOrThrow());
        }
        return Option.ofStruct(r);
    }

    static liftA2<T,U,V>(fn:(v1:T,v2:U)=>V&WithEquality): (p1:Option<T>, p2:Option<U>)=>Option<V> {
        return (p1,p2) => p1.flatMap(a1 => p2.map(a2 => fn(a1,a2)));
    }

    static liftA2Struct<T,U,V>(fn:(v1:T,v2:U)=>V): (p1:Option<T>, p2:Option<U>) => Option<V> {
        return (p1,p2) => p1.flatMap(a1 => p2.mapStruct(a2 => fn(a1,a2)));
    }

    abstract isSome(): boolean;
    abstract isNone(): boolean;
    abstract orElse(other: Option<T>): Option<T>;
    abstract getOrThrow(): T;
    abstract getOrElse(alt: T): T;
    abstract contains(v: T|null): boolean;
    abstract getOrUndefined(): T|null|undefined;
    abstract map<U>(fn: (v:T)=>U & WithEquality): Option<U>;
    abstract mapStruct<U>(fn: (v:T)=>U): Option<U>;
    abstract flatMap<U>(mapper:(v:T)=>Option<U>): Option<U>;
    abstract filter(fn: (v:T)=>boolean): Option<T>;
    abstract toVector(): Vector<T>;
    abstract equals(other: Option<T>): boolean;
    abstract hashCode(): number;
    abstract toString(): string;
}

export class Some<T> extends Option<T> {
    constructor(private value: T) {
        super();
    }

    isSome(): boolean {
        return true;
    }
    isNone(): boolean {
        return false;
    }
    orElse(other: Option<T>): Option<T> {
        return this;
    }
    getOrThrow(): T {
        return this.value;
    }
    contains(v: T): boolean {
        return v === this.value;
    }
    getOrUndefined(): T | undefined {
        return this.value;
    }
    getOrElse(alt: T): T {
        return this.value;
    }
    map<U>(fn: (v:T)=>U & WithEquality): Option<U> {
        return Option.of(fn(this.value));
    }
    mapStruct<U>(fn: (v:T)=>U): Option<U> {
        return Option.ofStruct(fn(this.value));
    }
    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return mapper(this.value);
    }
    filter(fn: (v:T)=>boolean): Option<T> {
        return fn(this.value) ? this : Option.none<T>();
    }
    toVector(): Vector<T> {
        return Vector.ofStruct(this.value);
    }
    equals(other: Option<T>): boolean {
        if (other === <None<T>>none) {
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
    orElse(other: Option<T>): Option<T> {
        return other;
    }
    getOrThrow(): T & WithEquality {
        throw "getOrThrow called on none!";
    }
    contains(v: T): boolean {
        return false;
    }
    getOrUndefined(): T|undefined {
        return undefined;
    }
    getOrElse(alt: T & WithEquality): T & WithEquality {
        return alt;
    }
    map<U>(fn: (v:T)=>U & WithEquality): Option<U> {
        return <None<U>>none;
    }
    mapStruct<U>(fn: (v:T)=>U): Option<U> {
        return <None<U>>none;
    }
    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return <None<U>>none;
    }
    filter(fn: (v:T)=>boolean): Option<T> {
        return <None<T>>none;
    }
    toVector(): Vector<T> {
        return Vector.empty<T>();
    }
    equals(other: Option<T>): boolean {
        return other === <None<T>>none;
    }
    hashCode(): number {
        return 1;
    }
    toString(): string {
        return "None()";
    }
}

export const none = new None();
