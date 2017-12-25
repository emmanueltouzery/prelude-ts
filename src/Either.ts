/**
 * The [[Either]] type represents an alternative between two value types.
 * A "left" value which is also conceptually tied to a failure,
 * or a "right" value which is conceptually tied to success.
 *
 * The code is organized through the class [[Left]], the class [[Right]],
 * and the type alias [[Either]] (Left or Right).
 *
 * Finally, "static" functions on Option are arranged in the class
 * [[EitherStatic]] and are accessed through the global constant Either.
 *
 * Examples:
 *
 *     Either.right<number,number>(5);
 *     Either.left<number,number>(2);
 *     Either.right<number,number>(5).map(x => x*2);
 *
 * Left has the extra [[Left.getLeft]] method that [[Right]] doesn't have.
 * Right has the extra [[Right.get]] method that [[Left]] doesn't have.
 */
    
import { Value } from "./Value";
import { Option } from "./Option";
import { LinkedList } from "./LinkedList";
import { Vector } from "./Vector";
import { WithEquality, areEqual,
         hasTrueEquality, getHashCode } from "./Comparison";
import { contractTrueEquality} from "./Contract";

/**
 * Holds the "static methods" for [[Either]]
 */
export class EitherStatic {
    /**
     * Constructs an Either containing a left value which you give.
     */
    left<L,R>(val: L): Either<L,R> {
        return new Left<L,R>(val);
    }

    /**
     * Constructs an Either containing a right value which you give.
     */
    right<L,R>(val: R): Either<L,R> {
        return new Right<L,R>(val);
    }

    /**
     * Turns a list of eithers in an either containing a list of items.
     * Useful in many contexts.
     *
     *     Either.sequence(Vector.of(
     *         Either.right<number,number>(1),
     *         Either.right<number,number>(2)));
     *     => Either.right(Vector.of(1,2))
     *
     * But if a single element is None, everything is discarded:
     *
     *     Either.sequence(Vector.of(
     *           Either.right<number,number>(1),
     *           Either.left<number,number>(2),
     *           Either.left<number,number>(3)));
     *     => Either.left(2)
     */
    sequence<L,R>(elts:Iterable<Either<L,R>>): Either<L,Vector<R>> {
        let r = Vector.empty<R>();
        const iterator = elts[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            const v = curItem.value;
            if (v.isLeft()) {
                return <any>v;
            }
            r = r.append(v.getOrThrow());
            curItem = iterator.next();
        }
        return Either.right<L,Vector<R>>(r);
    }

    /**
     * Applicative lifting for Either.
     * Takes a function which operates on basic values, and turns it
     * in a function that operates on eithers of these values ('lifts'
     * the function). The 2 is because it works on functions taking two
     * parameters.
     *
     *     const lifted = Either.liftA2(
     *         (x:number,y:number) => x+y, {} as string);
     *     lifted(
     *         Either.right<string,number>(5),
     *         Either.right<string,number>(6));
     *     => Either.right(11)
     *
     *     const lifted = Either.liftA2(
     *         (x:number,y:number) => x+y, {} as string);
     *     lifted(
     *         Either.right<string,number>(5),
     *         Either.left<string,number>("bad"));
     *     => Either.left("bad")
     *
     * @param R1 the first right type
     * @param R2 the second right type
     * @param L the left type
     * @param V the new right type as returned by the combining function.
     */
    liftA2<R1,R2,L,V>(fn:(v1:R1,v2:R2)=>V, leftWitness?: L) : (p1:Either<L,R1>, p2:Either<L,R2>) => Either<L,V> {
        return (p1,p2) => p1.flatMap(a1 => p2.map(a2 => fn(a1,a2)));
    }

    /**
     * Applicative lifting for Either. 'p' stands for 'properties'.
     *
     * Takes a function which operates on a simple JS object, and turns it
     * in a function that operates on the same JS object type except which each field
     * wrapped in an Either ('lifts' the function).
     * It's an alternative to [[Either.liftA2]] when the number of parameters
     * is not two.
     *
     *     const fn = (x:{a:number,b:number,c:number}) => x.a+x.b+x.c;
     *     const lifted = Either.liftAp(fn, {} as number);
     *     lifted({a:Either.right<number,number>(5), b:Either.right<number,number>(6), c:Either.right<number,number>(3)});
     *     => Either.right(14)
     *
     *     const lifted = Either.liftAp<number,{a:number,b:number},number>(x => x.a+x.b);
     *     lifted({a:Either.right<number,number>(5), b:Either.left<number,number>(2)});
     *     => Either.left(2)
     *
     * @param L the left type
     * @param A the object property type specifying the parameters for your function
     * @param B the type returned by your function, returned wrapped in an either by liftAp.
     */
    liftAp<L,A,B>(fn:(x:A)=>B, leftWitness?: L): (x: {[K in keyof A]: Either<L,A[K]>;}) => Either<L,B> {
        return x => {
            const copy:A = <any>{};
            for (let p in x) {
                if (x[p].isLeft()) {
                    return <Either<L,B>><any>x[p];
                }
                copy[p] = x[p].getOrThrow();
            }
            return Either.right<L,B>(fn(copy));
        }
    }
}

/**
 * The Either constant allows to call the either "static" methods
 */
export const Either = new EitherStatic();

/**
 * Either represents an alternative between two value types.
 * A "left" value which is also conceptually tied to a failure,
 * or a "right" value which is conceptually tied to success.
 * "static methods" available through [[EitherStatic]]
 */
export type Either<L,R> = Left<L,R> | Right<L,R>;

/**
 * Represents an [[Either]] containing a left value,
 * conceptually tied to a failure.
 * "static methods" available through [[EitherStatic]]
 * @param L the "left" item type 'failure'
 * @param R the "right" item type 'success'
 */
export class Left<L,R> implements Value {
    constructor(private value: L) {}

    /**
     * @hidden
     */
    readonly className: "Left";  // https://stackoverflow.com/a/47841595/516188

    /**
     * Returns true since this is a Left
     */
    isLeft(): this is Left<L,R> {
        return true;
    }

    /**
     * Returns false since this is a Left
     */
    isRight(): this is Right<L,R> {
        return false;
    }

    /**
     * Returns true if this is either is a right and contains the value you give.
     */
    contains(val: R&WithEquality): boolean {
        return false;
    }

    /**
     * If this either is a right, applies the function you give
     * to its contents and build a new right either, otherwise return this.
     */
    map<U>(fn: (x:R)=>U): Either<L,U> {
        return <any>this;
    }

    /**
     * If this either is a right, call the function you give with
     * the contents, and return what the function returns, else
     * returns this.
     * This is the monadic bind.
     */
    flatMap<U>(fn: (x:R)=>Either<L,U>): Either<L,U> {
        return <any>this;
    }

    /**
     * If this either is a left, call the function you give with
     * the left value and return a new either left with the result
     * of the function, else return this.
     */
    mapLeft<U>(fn: (x:L)=>U): Either<U,R> {
        return new Left<U,R>(fn(this.value));
    }

    /**
     * Map the either: you give a function to apply to the value,
     * a function in case it's a left, a function in case it's a right.
     */
    bimap<S,T>(fnL: (x:L)=>S,fnR: (x:R)=>T): Either<S,T> {
        return new Left<S,T>(fnL(this.value));
    }

    /**
     * Combines two eithers. If this either is a right, returns it.
     * If it's a left, returns the other one.
     */
    orElse(other: Either<L,R>): Either<L,R> {
        return other;
    }

    /**
     * Execute a side-effecting function if the either
     * is a right; returns the either.
     */
    ifRight(fn: (x:R)=>void): Either<L,R> {
        return this;
    }

    /**
     * Execute a side-effecting function if the either
     * is a left; returns the either.
     */
    ifLeft(fn: (x:L)=>void): Either<L,R> {
        fn(this.value);
        return this;
    }

    /**
     * Handle both branches of the either and return a value
     * (can also be used for side-effects).
     * This is the catamorphism for either.
     *
     *     Either.right<string,number>(5).match({
     *         Left:  x => "left " + x,
     *         Right: x => "right " + x
     *     });
     *     => "right 5"
     */
    match<U>(cases: {Left: (v:L)=>U, Right: (v:R)=>U}): U {
        return cases.Left(this.value);
    }

    /**
     * If this either is a right, return its value, else throw
     * an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    getOrThrow(message?: string): R {
        throw message || "Left.getOrThrow called!";
    }

    /**
     * If this either is a right, return its value, else return
     * the value you give.
     */
    getOrElse(other: R): R {
        return other;
    }

    /**
     * Get the value contained in this left.
     * NOTE: we know it's there, since this method
     * belongs to Left, not Either.
     */
    getLeft(): L {
        return this.value;
    }

    /**
     * If this either is a left, return its value, else throw
     * an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    getLeftOrThrow(message?: string): L {
        return this.value;
    }

    /**
     * If this either is a left, return its value, else return
     * the value you give.
     */
    getLeftOrElse(other: L): L {
        return this.value;
    }

    /**
     * Convert this either to an option, conceptually dropping
     * the left (failing) value.
     */
    toOption(): Option<R> {
        return Option.none<R>();
    }

    /**
     * Convert to a vector. If it's a left, it's the empty
     * vector, if it's a right, it's a one-element vector with
     * the contents of the either.
     */
    toVector(): Vector<R> {
        return Vector.empty<R>();
    }

    /**
     * Convert to a list. If it's a left, it's the empty
     * list, if it's a right, it's a one-element list with
     * the contents of the either.
     */
    toLinkedList(): LinkedList<R> {
        return LinkedList.empty<R>();
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Either<L,R>)=>U): U {
        return converter(this);
    }

    hasTrueEquality(): boolean {
        return (this.value && (<any>this.value).hasTrueEquality) ?
            (<any>this.value).hasTrueEquality() :
            hasTrueEquality(this.value);
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
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: Either<L&WithEquality,R&WithEquality>): boolean {
        if (<any>other === this) {
            return true;
        }
        if ((!other) || (!other.isRight) || other.isRight()) {
            return false;
        }
        const leftOther = <Left<L&WithEquality,R&WithEquality>>other;
        contractTrueEquality("Either.equals", this, leftOther);
        return areEqual(this.value, leftOther.value);
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "Left(" + this.value + ")";
    }

    /**
     * Used by the node REPL to display values.
     */
    inspect(): string {
        return this.toString();
    }
}

/**
 * Represents an [[Either]] containing a success value,
 * conceptually tied to a success.
 * "static methods" available through [[EitherStatic]]
 * @param L the "left" item type 'failure'
 * @param R the "right" item type 'success'
 */
export class Right<L,R> implements Value {
    constructor(private value: R) {}

    /**
     * @hidden
     */
    readonly className: "Right";  // https://stackoverflow.com/a/47841595/516188

    /**
     * Returns false since this is a Right
     */
    isLeft(): this is Left<L,R> {
        return false;
    }

    /**
     * Returns true since this is a Right
     */
    isRight(): this is Right<L,R> {
        return true;
    }

    /**
     * Returns true if this is either is a right and contains the value you give.
     */
    contains(val: R&WithEquality): boolean {
        return areEqual(this.value, val);
    }

    /**
     * If this either is a right, applies the function you give
     * to its contents and build a new right either, otherwise return this.
     */
    map<U>(fn: (x:R)=>U): Either<L,U> {
        return new Right<L,U>(fn(this.value));
    }

    /**
     * If this either is a right, call the function you give with
     * the contents, and return what the function returns, else
     * returns this.
     * This is the monadic bind.
     */
    flatMap<U>(fn: (x:R)=>Either<L,U>): Either<L,U> {
        return fn(this.value);
    }

    /**
     * If this either is a left, call the function you give with
     * the left value and return a new either left with the result
     * of the function, else return this.
     */
    mapLeft<U>(fn: (x:L)=>U): Either<U,R> {
        return <any>this;
    }

    /**
     * Map the either: you give a function to apply to the value,
     * a function in case it's a left, a function in case it's a right.
     */
    bimap<S,T>(fnL: (x:L)=>S,fnR: (x:R)=>T): Either<S,T> {
        return new Right<S,T>(fnR(this.value));
    }

    /**
     * Combines two eithers. If this either is a right, returns it.
     * If it's a left, returns the other one.
     */
    orElse(other: Either<L,R>): Either<L,R> {
        return this;
    }

    /**
     * Execute a side-effecting function if the either
     * is a right; returns the either.
     */
    ifRight(fn: (x:R)=>void): Either<L,R> {
        fn(this.value);
        return this;
    }

    /**
     * Execute a side-effecting function if the either
     * is a left; returns the either.
     */
    ifLeft(fn: (x:L)=>void): Either<L,R> {
        return this;
    }

    /**
     * Handle both branches of the either and return a value
     * (can also be used for side-effects).
     * This is the catamorphism for either.
     *
     *     Either.right<string,number>(5).match({
     *         Left:  x => "left " + x,
     *         Right: x => "right " + x
     *     });
     *     => "right 5"
     */
    match<U>(cases: {Left: (v:L)=>U, Right: (v:R)=>U}): U {
        return cases.Right(this.value);
    }

    /**
     * Get the value contained in this right.
     * NOTE: we know it's there, since this method
     * belongs to Right, not Either.
     */
    get(): R {
        return this.value;
    }

    /**
     * If this either is a right, return its value, else throw
     * an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    getOrThrow(message?: string): R {
        return this.value;
    }

    /**
     * If this either is a right, return its value, else return
     * the value you give.
     */
    getOrElse(other: R): R {
        return this.value;
    }

    /**
     * If this either is a left, return its value, else throw
     * an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    getLeftOrThrow(message?: string): L {
        throw message || "Left.getOrThrow called!";
    }

    /**
     * If this either is a left, return its value, else return
     * the value you give.
     */
    getLeftOrElse(other: L): L {
        return other;
    }

    /**
     * Convert this either to an option, conceptually dropping
     * the left (failing) value.
     */
    toOption(): Option<R> {
        return Option.of(this.value);
    }

    /**
     * Convert to a vector. If it's a left, it's the empty
     * vector, if it's a right, it's a one-element vector with
     * the contents of the either.
     */
    toVector(): Vector<R> {
        return Vector.of(this.value);
    }

    /**
     * Convert to a list. If it's a left, it's the empty
     * list, if it's a right, it's a one-element list with
     * the contents of the either.
     */
    toLinkedList(): LinkedList<R> {
        return LinkedList.of(this.value);
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Either<L,R>)=>U): U {
        return converter(this);
    }

    hasTrueEquality(): boolean {
        return (this.value && (<any>this.value).hasTrueEquality) ?
            (<any>this.value).hasTrueEquality() :
            hasTrueEquality(this.value);
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
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    equals(other: Either<L&WithEquality,R&WithEquality>): boolean {
        if (<any>other === this) {
            return true;
        }
        if ((!other) || (!other.isRight) || (!other.isRight())) {
            return false;
        }
        const rightOther = <Right<L&WithEquality,R&WithEquality>>other;
        contractTrueEquality("Either.equals", this, rightOther);
        return areEqual(this.value, rightOther.value);
    }

    /**
     * Get a human-friendly string representation of that value.
     */
    toString(): string {
        return "Right(" + this.value + ")";
    }

    /**
     * Used by the node REPL to display values.
     */
    inspect(): string {
        return this.toString();
    }
}
