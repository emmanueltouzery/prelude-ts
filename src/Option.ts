import { Value } from "./Value";
import { Seq } from "./Seq";
import { Vector } from "./Vector";
import { Either } from "./Either";
import { WithEquality, areEqual, hasTrueEquality,
         getHashCode, } from "./Comparison";
import { toStringHelper } from "./SeqHelpers";
import { contractTrueEquality} from "./Contract";

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
     */
    static of<T>(v: T|undefined): Option<T> {
        return (v === undefined) ? <None<T>>none : new Some(v);
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
    static sequence<T>(elts:Iterable<Option<T>>): Option<Vector<T>> {
        let r = Vector.empty<T>();
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            const v = curItem.value;
            if (v.isNone()) {
                return <None<Vector<T>>>none;
            }
            r = r.append(v.getOrThrow());
            curItem = iterator.next();
        }
        return Option.of(r);
    }

    /**
     * Applicative lifting for Option.
     * Takes a function which operates on basic values, and turns it
     * in a function that operates on options of these values ('lifts'
     * the function). The 2 is because it works on functions taking two
     * parameters.
     */
    static liftA2<T,U,V>(fn:(v1:T,v2:U)=>V): (p1:Option<T>, p2:Option<U>) => Option<V> {
        return (p1,p2) => p1.flatMap(a1 => p2.map(a2 => fn(a1,a2)));
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
     * @hidden
     */
    hasTrueEquality(): boolean {
        return this.flatMap(
            x => (x && (<any>x).hasTrueEquality) ?
                Option.of((<any>x).hasTrueEquality()) :
                hasTrueEquality(x))
            .getOrElse(true);
    }

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
    abstract contains(v: T&WithEquality): boolean;

    /**
     * Get the value contained in the option if it's a Some,
     * return undefined if it's a None.
     */
    abstract getOrUndefined(): T|undefined;

    /**
     * Return a new option where the element (if present) was transformed
     * by the mapper function you give. If the option was None it'll stay None.
     */
    abstract map<U>(fn: (v:T)=>U): Option<U>;

    /**
     * If this is a Some, calls the function you give on
     * the item in the option and return its result.
     * If the option is a None, return none.
     * This is the monadic bind.
     */
    abstract flatMap<U>(mapper:(v:T)=>Option<U>): Option<U>;

    /**
     * If this is None, will return None. If it's a Some,
     * and the contents match your predicate, return the option.
     * If the contents don't match the predicate, return None.
     */
    abstract filter(fn: (v:T)=>boolean): Option<T>;

    /**
     * Execute a side-effecting function if the option
     * is a Some; returns the option.
     */
    abstract ifPresent(fn:(v:T)=>void): Option<T>;

    /**
     * Handle both branches of the option and return a value
     * (can also be used for side-effects).
     * This is the catamorphism for option.
     *
     *     myOption.match({
     *         Some: x  => "got " + x,
     *         None: () => "got nothing!"
     *     });
     */
    abstract match<U>(cases: {Some: (v:T)=>U, None: ()=>U}): U;

    /**
     * Convert to a vector. If it's a None, it's the empty
     * vector, if it's a Some, it's a one-element vector with
     * the contents of the option.
     */
    abstract toVector(): Vector<T>;

    /**
     * Convert to an either. You must provide a left value
     * in case this is a None.
     */
    abstract toEither<L>(left: L): Either<L,T>;

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
    abstract equals(other: Option<T&WithEquality>): boolean;

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
    inspect(): string {
        return this.toString();
    }
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

    contains(v: T&WithEquality): boolean {
        return v === this.value;
    }

    getOrUndefined(): T | undefined {
        return this.value;
    }

    getOrElse(alt: T): T {
        return this.value;
    }

    map<U>(fn: (v:T)=>U): Option<U> {
        return Option.of(fn(this.value));
    }

    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return mapper(this.value);
    }

    filter(fn: (v:T)=>boolean): Option<T> {
        return fn(this.value) ? this : Option.none<T>();
    }

    ifPresent(fn:(v:T)=>void): Option<T> {
        fn(this.value);
        return this;
    }

    match<U>(cases: {Some: (v:T)=>U, None: ()=>U}): U {
        return cases.Some(this.value);
    }

    toVector(): Vector<T> {
        return Vector.of(this.value);
    }

    toEither<L>(left: L): Either<L,T> {
        return Either.right<L,T>(this.value);
    }

    equals(other: Option<T&WithEquality>): boolean {
        // the .isSome doesn't test if it's a Some, but
        // if the object has a field called isSome.
        if (other === <None<T>>none || !other || !(<any>other).isSome) {
            return false;
        }

        const someOther = <Some<T&WithEquality>>other;
        contractTrueEquality("Option.equals", this, someOther);
        return areEqual(this.value, someOther.value);
    }

    hashCode(): number {
        return getHashCode(this.value);
    }

    toString(): string {
        return "Some(" + toStringHelper(this.value) + ")";
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

    contains(v: T&WithEquality): boolean {
        return false;
    }

    getOrUndefined(): T|undefined {
        return undefined;
    }

    getOrElse(alt: T & WithEquality): T & WithEquality {
        return alt;
    }

    map<U>(fn: (v:T)=>U): Option<U> {
        return <None<U>>none;
    }

    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return <None<U>>none;
    }

    filter(fn: (v:T)=>boolean): Option<T> {
        return <None<T>>none;
    }

    ifPresent(fn:(v:T)=>void): Option<T> {
        return this;
    }

    match<U>(cases: {Some: (v:T)=>U, None: ()=>U}): U {
        return cases.None();
    }

    toVector(): Vector<T> {
        return Vector.empty<T>();
    }

    toEither<L>(left: L): Either<L,T> {
        return Either.left<L,T>(left);
    }

    equals(other: Option<T&WithEquality>): boolean {
        return other === <None<T>>none;
    }

    hashCode(): number {
        return 1;
    }

    toString(): string {
        return "None()";
    }
}

/**
 * @hidden
 */
export const none = new None();
