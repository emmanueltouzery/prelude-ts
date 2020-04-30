/**
 * The [[Option]] type expresses that a value may be present or not.
 * The code is organized through the class [[None]] (value not
 * present), the class [[Some]] (value present), and the type alias
 * [[Option]] (Some or None).
 *
 * Finally, "static" functions on Option are arranged in the class
 * [[OptionStatic]] and are accessed through the global constant Option.
 *
 * Examples:
 *
 *     Option.of(5);
 *     Option.none<number>();
 *     Option.of(5).map(x => x*2);
 *
 * To get the value out of an option, you can use [[Some.getOrThrow]],
 * or [[Some.get]]. The latter is available if you've checked that you
 * indeed have a some, for example:
 *
 *     const opt = Option.of(5);
 *     if (opt.isSome()) {
 *         opt.get();
 *     }
 *
 * You also have other options like [[Some.getOrElse]], [[Some.getOrUndefined]]
 * and so on. [[Some]] and [[None]] have the same methods, except that
 * Some has the extra [[Some.get]] method that [[None]] doesn't have.
 */

import { Value, inspect } from "./Value";
import { Vector } from "./Vector";
import { Either } from "./Either";
import { WithEquality, areEqual, hasTrueEquality,
         getHashCode, } from "./Comparison";
import { toStringHelper } from "./SeqHelpers";
import { contractTrueEquality} from "./Contract";

/**
 * An Option is either [[Some]] or [[None]]
 * "static methods" available through [[OptionStatic]]
 * @param T the item type
 */
export type Option<T> = Some<T> | None<T>;

/**
 * Holds the "static methods" for [[Option]]
 */
export class OptionStatic {

    /**
     * Builds an optional value.
     * * T is wrapped in a [[Some]]
     * * undefined becomes a [[None]]
     * * null becomes a [[Some]].
     *
     *     Option.of(5).isSome()
     *     => true
     *
     *     Option.of(undefined).isSome()
     *     => false
     *
     *     Option.of(null).isSome()
     *     => true
     *
     * Also see [[OptionStatic.some]], [[OptionStatic.ofNullable]]
     */
    of<T>(v: T|undefined): Option<T> {
        return (v === undefined) ? <None<T>>none : new Some(v);
    }

    /**
     * Build an optional value from a nullable.
     * * T is wrapped in a [[Some]]
     * * undefined becomes a [[None]]
     * * null becomes a [[None]].
     *
     *     Option.ofNullable(5).isSome()
     *     => true
     *
     *     Option.ofNullable(undefined).isSome()
     *     => false
     *
     *     Option.ofNullable(null).isSome()
     *     => false
     *
     * Also see [[OptionStatic.some]], [[OptionStatic.of]]
     */
    ofNullable<T>(v:T|undefined|null): Option<T> {
        return (v !== undefined && v !== null) ? new Some(v) : <None<T>>none;
    }

    /**
     * Build a [[Some]], unlike [[OptionStatic.of]], which may build a [[Some]]
     * or a [[None]].
     * Will throw if given undefined.
     *
     *     Option.some(5).isSome()
     *     => true
     *
     *     Option.some(undefined).isSome()
     *     => throws
     *
     *     Option.some(null).isSome()
     *     => true
     *
     * Also see [[OptionStatic.of]], [[OptionStatic.ofNullable]]
     */
    some<T>(v: T): Some<T> {
        // the reason I decided to add a some in addition to 'of'
        // instead of making 'of' smarter (which is possible in
        // typescript, see https://github.com/bcherny/tsoption)
        // is that sometimes you really want an Option, not a Some.
        // for instance you can't mix an a Some and an Option in a list
        // if you put the Some first, without calling asOption().
        if (typeof v === "undefined") {
            throw "Option.some got undefined!";
        }
        return new Some(v);
    }

    /**
     * The optional value expressing a missing value.
     */
    none<T>(): Option<T> {
        return <None<T>>none;
    }

    /**
     * Curried type guard for Option
     * Sometimes needed also due to https://github.com/Microsoft/TypeScript/issues/20218
     *
     *     Vector.of(Option.of(2), Option.none<number>())
     *         .filter(Option.isSome)
     *         .map(o => o.get())
     *     => Vector.of(2)
     */
    isSome<T>(o: Option<T>): o is Some<T> {
        return o.isSome();
    }

    /**
     * Curried type guard for Option
     * Sometimes needed also due to https://github.com/Microsoft/TypeScript/issues/20218
     *
     *     Vector.of(Option.of(2), Option.none<number>())
     *         .filter(Option.isNone)
     *     => Vector.of(Option.none<number>())
     */
    isNone<T>(o: Option<T>): o is None<T> {
        return o.isNone();
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
     *
     * Also see [[OptionStatic.traverse]]
     */
    sequence<T>(elts:Iterable<Option<T>>): Option<Vector<T>> {
        return Option.traverse(elts, x=>x);
    }

    /**
     * Takes a list, a function that can transform list elements
     * to options, then return an option containing a list of
     * the transformed elements.
     *
     *     const getUserById: (x:number)=>Option<string> = x => x > 0 ?
     *         Option.of("user" + x.toString()) : Option.none();
     *     Option.traverse([4, 3, 2], getUserById);
     *     => Option.of(Vector.of("user4", "user3", "user2"))
     *
     * But if a single element results in None, everything is discarded:
     *
     *     const getUserById: (x:number)=>Option<string> = x => x > 0 ?
     *         Option.of("user" + x.toString()) : Option.none();
     *     Option.traverse([4, -3, 2], getUserById);
     *     => Option.none()
     *
     * Also see [[OptionStatic.sequence]]
     */
    traverse<T,U>(elts:Iterable<T>, fn: (x:T)=>Option<U>): Option<Vector<U>> {
        let r = Vector.empty<U>();
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            const v = fn(curItem.value);
            if (v.isNone()) {
                return <None<Vector<U>>>none;
            }
            r = r.append(v.get());
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
     *
     *     const lifted = Option.liftA2((x:number,y:number) => x+y);
     *     lifted(Option.of(5), Option.of(6));
     *     => Option.of(11)
     *
     *     const lifted2 = Option.liftA2((x:number,y:number) => x+y);
     *     lifted2(Option.of(5), Option.none<number>());
     *     => Option.none()
     *
     * @param T the first option type
     * @param U the second option type
     * @param V the new type as returned by the combining function.
     */
    liftA2<T,U,V>(fn:(v1:T,v2:U)=>V): (p1:Option<T>, p2:Option<U>) => Option<V> {
        return (p1,p2) => p1.flatMap(a1 => p2.map(a2 => fn(a1,a2)));
    }

    /**
     * Applicative lifting for Option. 'p' stands for 'properties'.
     *
     * Takes a function which operates on a simple JS object, and turns it
     * in a function that operates on the same JS object type except which each field
     * wrapped in an Option ('lifts' the function).
     * It's an alternative to [[OptionStatic.liftA2]] when the number of parameters
     * is not two.
     *
     *     const lifted = Option.liftAp((x:{a:number,b:number,c:number}) => x.a+x.b+x.c);
     *     lifted({a:Option.of(5), b:Option.of(6), c:Option.of(3)});
     *     => Option.of(14)
     *
     *     const lifted = Option.liftAp((x:{a:number,b:number}) => x.a+x.b);
     *     lifted({a:Option.of(5), b:Option.none<number>()});
     *     => Option.none()
     *
     * @param A the object property type specifying the parameters for your function
     * @param B the type returned by your function, returned wrapped in an option by liftAp.
     */
    liftAp<A,B>(fn:(x:A)=>B): (x: {[K in keyof A]: Option<A[K]>;}) => Option<B> {
        return x => {
            const copy:A = <any>{};
            for (let p in x) {
                if (x[p].isNone()) {
                    return Option.none<B>();
                }
                copy[p] = x[p].getOrThrow();
            }
            return Option.of(fn(copy));
        }
    }

    /**
     * Take a partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * undefined becomes a [[None]], everything else a [[Some]]
     *
     *     const plus = Option.lift((x:number,y:number)=>x+y);
     *     plus(1,2);
     *     => Option.of(3)
     *
     *     const undef = Option.lift((x:number)=>undefined);
     *     undef(1);
     *     => Option.none()
     *
     *     const nl = Option.lift((x:number,y:number,z:number)=>null);
     *     nl(1,2,3);
     *     => Option.some(null)
     *
     *     const throws = Option.lift((x:number,y:number)=>{throw "x"});
     *     throws(1,2);
     *     => Option.none()
     */
    lift<T extends any[],U>(fn: (...args: T)=>U|undefined): (...args:T)=>Option<U> {
        return (...args:T) => {
            try {
                return Option.of(fn(...args));
            } catch {
                return Option.none<U>();
            }
        };
    }

    /**
     * Take a partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     const plus = Option.liftNullable((x:number,y:number)=>x+y);
     *     plus(1,2);
     *     => Option.of(3)
     *
     *     const undef = Option.liftNullable((x:number,y:number,z:string)=>undefined);
     *     undef(1,2,"");
     *     => Option.none()
     *
     *     const nl = Option.liftNullable((x:number)=>null);
     *     nl(1);
     *     => Option.none()
     *
     *     const throws = Option.liftNullable((x:number,y:number)=>{throw "x"});
     *     throws(1,2);
     *     => Option.none()
     */
    liftNullable<T extends any[],U>(fn: (...args: T)=>U|null|undefined): (...args:T)=>Option<U> {
        return (...args:T) => {
            try {
                return Option.ofNullable(fn(...args));
            } catch {
                return Option.none<U>();
            }
        };
    }

    /**
     * Take a no-parameter partial function (may return undefined or throw),
     * and call it, return an [[Option]] instead.
     * undefined becomes a [[None]], everything else a [[Some]]
     *
     *     Option.try_(Math.random);
     *     => Option.of(0.49884723907769635)
     *
     *     Option.try_(()=>undefined);
     *     => Option.none()
     *
     *     Option.try_(()=>null);
     *     => Option.of(null)
     *
     *     Option.try_(()=>{throw "x"});
     *     => Option.none()
     *
     * Also see [[OptionStatic.tryNullable]], [[OptionStatic.lift]],
     * [[OptionStatic.liftNullable]], [[EitherStatic.try_]].
     */
    try_<T>(fn:()=>T|undefined): Option<T> {
        return Option.lift(fn)();
    }

    /**
     * Take a no-parameter partial function (may return null, undefined or throw),
     * and call it, return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     Option.tryNullable(Math.random);
     *     => Option.of(0.49884723907769635)
     *
     *     Option.tryNullable(()=>undefined);
     *     => Option.none()
     *
     *     Option.tryNullable(()=>null);
     *     => Option.none()
     *
     *     Option.tryNullable(()=>{throw "x"});
     *     => Option.none()
     *
     * Also see [[OptionStatic.try_]], [[OptionStatic.liftNullable]],
     * [[OptionStatic.lift]], [[EitherStatic.try_]].
     */
    tryNullable<T>(fn:()=>T|null|undefined): Option<T> {
        return Option.liftNullable(fn)();
    }
}

/**
 * The Option constant allows to call the option "static" methods
 */
export const Option = new OptionStatic();

function optionHasTrueEquality<T>(opt: Option<T>): boolean {
    return opt.flatMap(
        x => (x && (<any>x).hasTrueEquality) ?
            Option.of((<any>x).hasTrueEquality()) :
            hasTrueEquality(x))
        .getOrElse(true);
}

/**
 * Some represents an [[Option]] with a value.
 * "static methods" available through [[OptionStatic]]
 *
 * [[Some]] and [[None]] have the same methods, except that
 * Some has the extra [[Some.get]] method that [[None]] doesn't have.
 * @param T the item type
 */
export class Some<T> implements Value {
    /**
     * @hidden
     */
    constructor(private value: T) {}

    /**
     * @hidden
     */
    readonly className: "Some" = <any>undefined;  // https://stackoverflow.com/a/47841595/516188

    /**
     * Returns true since this is a Some (contains a value)
     */
    isSome(): this is Some<T> {
        return true;
    }

    /**
     * Returns false since this is a Some (contains a value)
     */
    isNone(): this is None<T> {
        return false;
    }

    /**
     * View this Some a as Option. Useful to help typescript type
     * inference sometimes.
     */
    asOption(): Option<T> {
        return this;
    }

    /**
     * Get the value contained in this option.
     * NOTE: we know it's there, since this method
     * belongs to Some, not Option.
     */
    get(): T {
        return this.value;
    }

    /**
     * Combines two options. If this option is a Some, returns it.
     * If it's a None, returns the other one.
     */
    orElse(other: Option<T>): Option<T> {
        return this;
    }

    /**
     * Get the value from this option if it's a Some, otherwise
     * throw an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    getOrThrow(errorInfo?: Error|string): T {
        return this.value;
    }

    /**
     * Returns true if the option is a Some and contains the
     * value you give, false otherwise.
     */
    contains(v: T&WithEquality): boolean {
        return v === this.value;
    }

    /**
     * Get the value contained in the option if it's a Some,
     * return undefined if it's a None.
     *
     *     Option.of(5).getOrUndefined()
     *     => 5
     *
     *     Option.none<number>().getOrUndefined()
     *     => undefined
     */
    getOrUndefined(): T | undefined {
        return this.value;
    }

    /**
     * Get the value contained in the option if it's a Some,
     * return null if it's a None.
     *
     *     Option.of(5).getOrNull()
     *     => 5
     *
     *     Option.none<number>().getOrNull()
     *     => null
     */
    getOrNull(): T | null {
        return this.value;
    }

    /**
     * Get the value from this option; if it's a None (no value
     * present), then return the default value that you give.
     */
    getOrElse(alt: T): T {
        return this.value;
    }

    /**
     * Get the value from this option; if it's a None (no value
     * present), then return the value returned by the function that you give.
     *
     *     Option.of(5).getOrCall(() => 6)
     *     => 5
     *
     *     Option.none<number>().getOrCall(() => 6)
     *     => 6
     */
    getOrCall(fn: ()=>T): T {
        return this.value;
    }

    /**
     * Return a new option where the element (if present) was transformed
     * by the mapper function you give. If the option was None it'll stay None.
     *
     *     Option.of(5).map(x => x*2)
     *     => Option.of(10)
     *
     *     Option.of(5).map(x => null)
     *     => Option.of(null)
     *
     * Also see [[Some.mapNullable]], [[Some.flatMap]]
     */
    map<U>(fn: (v:T)=>U): Option<U> {
        return Option.of(fn(this.value));
    }

    /**
     * Return a new option where the element (if present) was transformed
     * by the mapper function you give. If the mapped value is `null` or
     * `undefined`, then a Some will turn into a None.
     * If the option was None it'll stay None.
     *
     *     Option.of(5).mapNullable(x => x*2)
     *     => Option.of(10)
     *
     *     Option.of(5).mapNullable(x => null)
     *     => Option.none()
     *
     * Also see [[Some.map]], [[Some.flatMap]]
     */
    mapNullable<U>(fn: (v:T)=>U|null|undefined): Option<U> {
        return Option.ofNullable(fn(this.value));
    }

    /**
     * If this is a Some, calls the function you give on
     * the item in the option and return its result.
     * If the option is a None, return none.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return mapper(this.value);
    }

    /**
     * If this is None, will return None. If it's a Some,
     * and the contents match your predicate, return the option.
     * If the contents don't match the predicate, return None.
     */
    filter<U extends T>(fn:(v:T)=>v is U): Option<U>;
    filter(fn: (v:T)=>boolean): Option<T>;
    filter(fn: (v:T)=>boolean): Option<T> {
        return fn(this.value) ? this : Option.none<T>();
    }

    /**
     * Execute a side-effecting function if the option
     * is a Some; returns the option.
     */
    ifSome(fn:(v:T)=>void): Option<T> {
        fn(this.value);
        return this;
    }

    /**
     * Execute a side-effecting function if the option
     * is a None; returns the option.
     */
    ifNone(fn:()=>void): Option<T> {
        return this;
    }

    /**
     * Handle both branches of the option and return a value
     * (can also be used for side-effects).
     * This is the catamorphism for option.
     *
     *     Option.of(5).match({
     *         Some: x  => "got " + x,
     *         None: () => "got nothing!"
     *     });
     *     => "got 5"
     */
    match<U>(cases: {Some: (v:T)=>U, None: ()=>U}): U {
        return cases.Some(this.value);
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Option<T>)=>U): U {
        return converter(this);
    }

    /**
     * Convert to a vector. If it's a None, it's the empty
     * vector, if it's a Some, it's a one-element vector with
     * the contents of the option.
     */
    toVector(): Vector<T> {
        return Vector.of(this.value);
    }

    /**
     * Convert to an either. You must provide a left value
     * in case this is a None.
     */
    toEither<L>(left: L): Either<L,T> {
        return Either.right<L,T>(this.value);
    }

    /**
     * If this is a Some, return this object.
     * If this is a None, return the result of the function.
     */
    orCall(_: () => Option<T>): Option<T> {
      return this;
    }

    hasTrueEquality<T>(): boolean {
        return optionHasTrueEquality(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: Option<T&WithEquality>): boolean {
        if (<any>other === this) {
            return true;
        }
        // the .isSome doesn't test if it's a Some, but
        // if the object has a field called isSome.
        if (other === <None<T>>none || !other || !(<any>other).isSome) {
            return false;
        }

        const someOther = <Some<T&WithEquality>>other;
        contractTrueEquality("Option.equals", this, someOther);
        return areEqual(this.value, someOther.value);
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        return getHashCode(this.value);
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "Some(" + toStringHelper(this.value) + ")";
    }

    /**
     * Used by the node REPL to display values.
     */
    [inspect](): string {
        return this.toString();
    }
}

/**
 * None represents an [[Option]] without value.
 * "static methods" available through [[OptionStatic]]
 *
 * [[Some]] and [[None]] have the same methods, except that
 * Some has the extra [[Some.get]] method that [[None]] doesn't have.
 * @param T the item type
 */
export class None<T> implements Value {

    /**
     * @hidden
     */
    readonly className: "None" = <any>undefined;  // https://stackoverflow.com/a/47841595/516188

    /**
     * Returns false since this is a None (doesn'tcontains a value)
     */
    isSome(): this is Some<T> {
        return false;
    }

    /**
     * Returns true since this is a None (doesn'tcontains a value)
     */
    isNone(): this is None<T> {
        return true;
    }

    /**
     * View this Some a as Option. Useful to help typescript type
     * inference sometimes.
     */
    asOption(): Option<T> {
        return this;
    }

    /**
     * Combines two options. If this option is a Some, returns it.
     * If it's a None, returns the other one.
     */
    orElse(other: Option<T>): Option<T> {
        return other;
    }

    /**
     * Get the value from this option if it's a Some, otherwise
     * throw an exception.
     * You can optionally pass a message that'll be used as the
     * exception message, or an Error object.
     */
    getOrThrow(errorInfo?: Error|string): T & WithEquality {
        if (typeof errorInfo === 'string') {
            throw new Error(errorInfo || "getOrThrow called on none!");
        }
        throw errorInfo || new Error("getOrThrow called on none!");
    }

    /**
     * Returns true if the option is a Some and contains the
     * value you give, false otherwise.
     */
    contains(v: T&WithEquality): boolean {
        return false;
    }

    /**
     * Get the value contained in the option if it's a Some,
     * return undefined if it's a None.
     *
     *     Option.of(5).getOrUndefined()
     *     => 5
     *
     *     Option.none<number>().getOrUndefined()
     *     => undefined
     */
    getOrUndefined(): T|undefined {
        return undefined;
    }

    /**
     * Get the value contained in the option if it's a Some,
     * return null if it's a None.
     *
     *     Option.of(5).getOrNull()
     *     => 5
     *
     *     Option.none<number>().getOrNull()
     *     => null
     */
    getOrNull(): T|null {
        return null;
    }

    /**
     * Get the value from this option; if it's a None (no value
     * present), then return the default value that you give.
     */
    getOrElse(alt: T): T {
        return alt;
    }

    /**
     * Get the value from this option; if it's a None (no value
     * present), then return the value returned by the function that you give.
     *
     *     Option.of(5).getOrCall(() => 6)
     *     => 5
     *
     *     Option.none<number>().getOrCall(() => 6)
     *     => 6
     */
    getOrCall(fn: ()=>T): T {
        return fn();
    }

    /**
     * Return a new option where the element (if present) was transformed
     * by the mapper function you give. If the option was None it'll stay None.
     *
     *     Option.of(5).map(x => x*2)
     *     => Option.of(10)
     *
     *     Option.of(5).map(x => null)
     *     => Option.of(null)
     *
     * Also see [[None.mapNullable]], [[None.flatMap]]
     */
    map<U>(fn: (v:T)=>U): Option<U> {
        return <None<U>>none;
    }

    /**
     * Return a new option where the element (if present) was transformed
     * by the mapper function you give. If the mapped value is `null` or
     * `undefined`, then a Some will turn into a None.
     * If the option was None it'll stay None.
     *
     *     Option.of(5).mapNullable(x => x*2)
     *     => Option.of(10)
     *
     *     Option.of(5).mapNullable(x => null)
     *     => Option.none()
     *
     * Also see [[None.map]], [[None.flatMap]]
     */
    mapNullable<U>(fn: (v:T)=>U|null|undefined): Option<U> {
        return <None<U>>none;
    }

    /**
     * If this is a Some, calls the function you give on
     * the item in the option and return its result.
     * If the option is a None, return none.
     * This is the monadic bind.
     */
    flatMap<U>(mapper:(v:T)=>Option<U>): Option<U> {
        return <None<U>>none;
    }

    /**
     * If this is None, will return None. If it's a Some,
     * and the contents match your predicate, return the option.
     * If the contents don't match the predicate, return None.
     */
    filter<U extends T>(fn:(v:T)=>v is U): Option<U>;
    filter(fn: (v:T)=>boolean): Option<T>;
    filter(fn: (v:T)=>boolean): Option<T> {
        return <None<T>>none;
    }

    /**
     * Execute a side-effecting function if the option
     * is a Some; returns the option.
     */
    ifSome(fn:(v:T)=>void): Option<T> {
        return this;
    }

    /**
     * Execute a side-effecting function if the option
     * is a Some; returns the option.
     */
    ifNone(fn:()=>void): Option<T> {
        fn();
        return this;
    }

    /**
     * Handle both branches of the option and return a value
     * (can also be used for side-effects).
     * This is the catamorphism for option.
     *
     *     Option.of(5).match({
     *         Some: x  => "got " + x,
     *         None: () => "got nothing!"
     *     });
     *     => "got 5"
     */
    match<U>(cases: {Some: (v:T)=>U, None: ()=>U}): U {
        return cases.None();
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Option<T>)=>U): U {
        return converter(this);
    }

    /**
     * Convert to a vector. If it's a None, it's the empty
     * vector, if it's a Some, it's a one-element vector with
     * the contents of the option.
     */
    toVector(): Vector<T> {
        return Vector.empty<T>();
    }

    /**
     * Convert to an either. You must provide a left value
     * in case this is a None.
     */
    toEither<L>(left: L): Either<L,T> {
        return Either.left<L,T>(left);
    }

    /**
     * If this is a Some, return this object.
     * If this is a None, return the result of the function.
     */
    orCall(fn: () => Option<T>): Option<T> {
      return fn();
    }

    hasTrueEquality<T>(): boolean {
        return optionHasTrueEquality(this);
    }

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: Option<T&WithEquality>): boolean {
        return other === <None<T>>none;
    }

    /**
     * Get a number for that object. Two different values
     * may get the same number, but one value must always get
     * the same number. The formula can impact performance.
     */
    hashCode(): number {
        return 1;
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "None()";
    }

    /**
     * Used by the node REPL to display values.
     */
    [inspect](): string {
        return this.toString();
    }
}

/**
 * @hidden
 */
export const none = new None<any>();
