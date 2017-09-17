import { Value } from "./Value";
import { Seq } from "./Seq";
import { Vector } from "./Vector";
import { WithEquality, areEqual,
         getHashCode, toStringHelper } from "./Comparison";

/**
 * Expresses that a value may be present, or not.
 * @type T the item type
 */
export abstract class Option<T> implements Value {
    /**
     * Builds an optional value.
     * T gives a some
     * undefined gives a none
     * null gives a some
     * Equality requirements.
     */
    static of<T>(v: T & WithEquality|undefined): Option<T> {
        if (v === undefined) {
            return <None<T>>none;
        }
        return new Some(v);
    }

    /**
     * Builds an optional value.
     * T gives a some
     * undefined gives a none
     * null gives a some
     * No equality requirements.
     */
    static ofStruct<T>(v: T|undefined): Option<T> {
        if (v === undefined) {
            return <None<T>>none;
        }
        return new Some(v);
    }

    /**
     * The optional value expressing a missing value.
     */
    static none<T>(): Option<T> {
        return <None<T>>none;
    }

    /**
     * Turns a list of options in an option containing a list of items.
     * Useful in many contexts.
     *
     *     Option.sequence(Vector.of(Option.of(1),Option.of(2)))
     *     => Option.of(Vector.of(1,2))
     *
     * But if a single element is None, everything is discarded:
     *
     *     Option.sequence(Vector.of(Option.of(1), Option.none()))
     *     => Option.none()
     */
    static sequence<T>(elts:Iterable<Option<T>>): Option<Seq<T>> {
        let r: Seq<T> = Vector.empty<T>();
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            const v = curItem.value;
            if (v.isNone()) {
                return <None<Seq<T>>>none;
            }
            r = r.appendStruct(v.getOrThrow());
            curItem = iterator.next();
        }
        return Option.ofStruct(r);
    }

    /**
     * Applicative lifting for Option.
     * Takes a function which operates on basic values, and turns it
     * in a function that operates on options of these values ('lifts'
     * the function). The 2 is because it works on functions taking two
     * parameters.
     * Equality requirements.
     */
    static liftA2<T,U,V>(fn:(v1:T,v2:U)=>V&WithEquality): (p1:Option<T>, p2:Option<U>)=>Option<V> {
        return (p1,p2) => p1.flatMap(a1 => p2.map(a2 => fn(a1,a2)));
    }

    /**
     * Applicative lifting for Option.
     * Takes a function which operates on basic values, and turns it
     * in a function that operates on options of these values ('lifts'
     * the function). The 2 is because it works on functions taking two
     * parameters.
     * No equality requirements.
     */
    static liftA2Struct<T,U,V>(fn:(v1:T,v2:U)=>V): (p1:Option<T>, p2:Option<U>) => Option<V> {
        return (p1,p2) => p1.flatMapStruct(a1 => p2.mapStruct(a2 => fn(a1,a2)));
    }

    /**
     * Returns true if the option is a Some (contains a value),
     * false otherwise (it's a None)
     */
    abstract isSome(): boolean;

    /**
     * Returns true if the option is a None (doesn't contains a value),
     * false otherwise (it's a Some)
     */
    abstract isNone(): boolean;

    /**
     * Combines two options. If this option is a Some, returns it.
     * If it's a None, returns the other one.
     */
    abstract orElse(other: Option<T>): Option<T>;

    /**
     * Get the value from this option if it's a Some, otherwise
     * throw an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    abstract getOrThrow(message?: string): T;

    /**
     * Get the value from this option; if it's a None (no value
     * present), then return the default value that you give.
     */
    abstract getOrElse(alt: T): T;

    /**
     * Returns true if the option is a Some and contains the
     * value you give, false otherwise.
     */
    abstract contains(v: T|null): boolean;

    /**
     * Get the value contained in the option if it's a Some,
     * return undefined if it's a None.
     */
    abstract getOrUndefined(): T|undefined;

    /**
     * Return a new option where the element (if present) was transformed
     * by the mapper function you give. If the option was None it'll stay None.
     * Equality requirements.
     */
    abstract map<U>(fn: (v:T)=>U & WithEquality): Option<U>;

    /**
     * Return a new option where the element (if present) was transformed
     * by the mapper function you give. If the option was None it'll stay None.
     * No equality requirements.
     */
    abstract mapStruct<U>(fn: (v:T)=>U): Option<U>;

    /**
     * If this is a Some, calls the function you give on
     * the item in the option and return its result.
     * If the option is a None, return none.
     * This is the monadic bind.
     * Equality requirement.
     */
    abstract flatMap<U>(mapper:(v:T)=>Option<U&WithEquality>): Option<U>;

    /**
     * If this is a Some, calls the function you give on
     * the item in the option and return its result.
     * If the option is a None, return none.
     * This is the monadic bind.
     * No equality requirement.
     */
    abstract flatMapStruct<U>(mapper:(v:T)=>Option<U>): Option<U>;

    /**
     * If this is None, will return None. If it's a Some,
     * and the contents match your predicate, return the option.
     * If the contents don't match the predicate, return None.
     */
    abstract filter(fn: (v:T)=>boolean): Option<T>;

    /**
     * Execute a side-effecting function if the option
     * is a Some, returns the option.
     */
    abstract ifPresent(fn:(v:T)=>void): Option<T>;

    /**
     * Convert to a vector. If it's a None, it's the empty
     * vector, if it's a Some, it's a one-element vector with
     * the contents of the option.
     */
    abstract toVector(): Vector<T>;

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Option<T>)=>U): U {
        return converter(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    abstract equals(other: Option<T>): boolean;

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    abstract hashCode(): number;

    /**
     * Get a human-friendly string representation of that value.
     */
    abstract toString(): string;

    /**
     * Used by the node REPL to display values.
     */
    abstract inspect(): string;
}

/**
 * @hidden
 */
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
    getOrThrow(message?: string): T {
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
    flatMap<U>(mapper:(v:T)=>Option<U&WithEquality>): Option<U> {
        return mapper(this.value);
    }
    flatMapStruct<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return mapper(this.value);
    }
    filter(fn: (v:T)=>boolean): Option<T> {
        return fn(this.value) ? this : Option.none<T>();
    }
    ifPresent(fn:(v:T)=>void): Option<T> {
        fn(this.value);
        return this;
    }
    toVector(): Vector<T> {
        return Vector.ofStruct(this.value);
    }
    equals(other: Option<T>): boolean {
        // the .isSome doesn't test if it's a Some, but
        // if the object has a field called isSome.
        if (other === <None<T>>none || !other || !(<any>other).isSome) {
            return false;
        }
        const someOther = <Some<T>>other;
        return areEqual(this.value, someOther.value);
    }
    hashCode(): number {
        return getHashCode(this.value);
    }
    toString(): string {
        return "Some(" + toStringHelper(this.value) + ")";
    }
    inspect(): string {
        return this.toString();
    }
}

/**
 * @hidden
 */
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
    getOrThrow(message?: string): T & WithEquality {
        throw message || "getOrThrow called on none!";
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
    flatMap<U>(mapper:(v:T)=>Option<U&WithEquality>): Option<U> {
        return <None<U>>none;
    }
    flatMapStruct<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return <None<U>>none;
    }
    filter(fn: (v:T)=>boolean): Option<T> {
        return <None<T>>none;
    }
    ifPresent(fn:(v:T)=>void): Option<T> {
        return this;
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
    inspect(): string {
        return this.toString();
    }
}

/**
 * @hidden
 */
export const none = new None();
