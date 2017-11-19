import { Value } from "./Value";
import { Option } from "./Option";
import { LinkedList } from "./LinkedList";
import { Vector } from "./Vector";
import { WithEquality, areEqual,
         hasTrueEquality, getHashCode } from "./Comparison";
import { contractTrueEquality} from "./Contract";

/**
 * Represents an alternative between two value types.
 * A "left" value which is also conceptually tied to a failure,
 * or a "right" value which is conceptually tied to success.
 * @type L the "left" item type 'failure'
 * @type R the "right" item type 'success'
 */
export abstract class Either<L,R> implements Value {
    
    /**
     * Constructs an Either containing a left value which you give.
     */
    static left<L,R>(val: L): Either<L,R> {
        return new Left<L,R>(val);
    }

    /**
     * Constructs an Either containing a right value which you give.
     */
    static right<L,R>(val: R): Either<L,R> {
        return new Right<L,R>(val);
    }

    /**
     * Turns a list of eithers in an either containing a list of items.
     * Useful in many contexts.
     *
     *     Either.sequence(Vector.of(Either.right(1),Either.right(2)))
     *     => Either.right(Vector.of(1,2))
     *
     * But if a single element is None, everything is discarded:
     *
     *     Either.sequence(Vector.of(Either.right(1), Either.left(2), Either.left(3)))
     *     => Either.left(2)
     */
    static sequence<L,R>(elts:Iterable<Either<L,R>>): Either<L,Vector<R>> {
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
     * Returns true if this is either is a left, false otherwise.
     */
    abstract isLeft(): boolean;

    /**
     * Returns true if this is either is a right, false otherwise.
     */
    abstract isRight(): boolean;

    /**
     * Returns true if this is either is a right and contains the value you give.
     */
    abstract contains(val: R&WithEquality): boolean;

    /**
     * If this either is a right, applies the function you give
     * to its contents and build a new right either, otherwise return this.
     */
    abstract map<U>(fn: (x:R)=>U): Either<L,U>;

    /**
     * If this either is a right, call the function you give with
     * the contents, and return what the function returns, else
     * returns this.
     * This is the monadic bind.
     */
    abstract flatMap<U>(fn: (x:R)=>Either<L,U>): Either<L,U>;

    /**
     * If this either is a left, call the function you give with
     * the left value and return a new either left with the result
     * of the function, else return this.
     */
    abstract mapLeft<U>(fn: (x:L)=>U): Either<U,R>;

    /**
     * Map the either: you give a function to apply to the value,
     * a function in case it's a left, a function in case it's a right.
     */
    abstract bimap<S,T>(fnL: (x:L)=>S,fnR: (x:R)=>T): Either<S,T>;

    /**
     * Combines two eithers. If this either is a right, returns it.
     * If it's a left, returns the other one.
     */
    abstract orElse(other: Either<L,R>): Either<L,R>;

    /**
     * Execute a side-effecting function if the either
     * is a right; returns the either.
     */
    abstract ifRight(fn: (x:R)=>void): Either<L,R>;

    /**
     * Execute a side-effecting function if the either
     * is a left; returns the either.
     */
    abstract ifLeft(fn: (x:L)=>void): Either<L,R>;

    /**
     * Handle both branches of the either and return a value
     * (can also be used for side-effects).
     * This is the catamorphism for either.
     *
     *     myEither.match({
     *         Left:  x => "left " + x,
     *         Right: x => "right " + y
     *     });
     */
    abstract match<U>(cases: {Left: (v:L)=>U, Right: (v:R)=>U}): U;

    /**
     * If this either is a right, return its value, else throw
     * an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    abstract getOrThrow(message?: string): R;

    /**
     * If this either is a right, return its value, else return
     * the value you give.
     */
    abstract getOrElse(other: R): R;

    /**
     * If this either is a left, return its value, else throw
     * an exception.
     * You can optionally pass a message that'll be used as the
     * exception message.
     */
    abstract getLeftOrThrow(message?: string): L;

    /**
     * If this either is a left, return its value, else return
     * the value you give.
     */
    abstract getLeftOrElse(other: L): L;

    /**
     * Convert this either to an option, conceptually dropping
     * the left (failing) value.
     */
    abstract toOption(): Option<R>;

    /**
     * Convert to a vector. If it's a left, it's the empty
     * vector, if it's a right, it's a one-element vector with
     * the contents of the either.
     */
    abstract toVector(): Vector<R>;

    /**
     * Convert to a list. If it's a left, it's the empty
     * list, if it's a right, it's a one-element list with
     * the contents of the either.
     */
    abstract toLinkedList(): LinkedList<R>;

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(converter:(x:Either<L,R>)=>U): U {
        return converter(this);
    }

    /**
     * @hidden
     */
    abstract hasTrueEquality(): boolean;

    /**
     * Two objects are equal if they represent the same value,
     * regardless of whether they are the same object physically
     * in memory.
     */
    abstract equals(other: Either<L&WithEquality,R&WithEquality>): boolean;

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

class Left<L,R> extends Either<L,R> {
    constructor(private value: L) {
        super();
    }

    isLeft(): boolean {
        return true;
    }

    isRight(): boolean {
        return false;
    }

    contains(val: R&WithEquality): boolean {
        return false;
    }

    map<U>(fn: (x:R)=>U): Either<L,U> {
        return <any>this;
    }

    flatMap<U>(fn: (x:R)=>Either<L,U>): Either<L,U> {
        return <any>this;
    }

    mapLeft<U>(fn: (x:L)=>U): Either<U,R> {
        return new Left<U,R>(fn(this.value));
    }

    bimap<S,T>(fnL: (x:L)=>S,fnR: (x:R)=>T): Either<S,T> {
        return new Left<S,T>(fnL(this.value));
    }

    orElse(other: Either<L,R>): Either<L,R> {
        return other;
    }

    ifRight(fn: (x:R)=>void): Either<L,R> {
        return this;
    }

    ifLeft(fn: (x:L)=>void): Either<L,R> {
        fn(this.value);
        return this;
    }

    match<U>(cases: {Left: (v:L)=>U, Right: (v:R)=>U}): U {
        return cases.Left(this.value);
    }

    getOrThrow(message?: string): R {
        throw message || "Left.getOrThrow called!";
    }

    getOrElse(other: R): R {
        return other;
    }

    getLeftOrThrow(message?: string): L {
        return this.value;
    }

    getLeftOrElse(other: L): L {
        return this.value;
    }

    toOption(): Option<R> {
        return Option.none<R>();
    }

    toVector(): Vector<R> {
        return Vector.empty<R>();
    }

    toLinkedList(): LinkedList<R> {
        return LinkedList.empty<R>();
    }

    hasTrueEquality(): boolean {
        return (this.value && (<any>this.value).hasTrueEquality) ?
            (<any>this.value).hasTrueEquality() :
            hasTrueEquality(this.value);
    }

    hashCode(): number {
        return getHashCode(this.value);
    }

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

    toString(): string {
        return "Left(" + this.value + ")";
    }
}

class Right<L,R> extends Either<L,R> {
    constructor(private value: R) {
        super();
    }

    isLeft(): boolean {
        return false;
    }

    isRight(): boolean {
        return true;
    }

    contains(val: R&WithEquality): boolean {
        return areEqual(this.value, val);
    }

    map<U>(fn: (x:R)=>U): Either<L,U> {
        return new Right<L,U>(fn(this.value));
    }

    flatMap<U>(fn: (x:R)=>Either<L,U>): Either<L,U> {
        return fn(this.value);
    }

    mapLeft<U>(fn: (x:L)=>U): Either<U,R> {
        return <any>this;
    }

    bimap<S,T>(fnL: (x:L)=>S,fnR: (x:R)=>T): Either<S,T> {
        return new Right<S,T>(fnR(this.value));
    }

    orElse(other: Either<L,R>): Either<L,R> {
        return this;
    }

    ifRight(fn: (x:R)=>void): Either<L,R> {
        fn(this.value);
        return this;
    }

    ifLeft(fn: (x:L)=>void): Either<L,R> {
        return this;
    }

    match<U>(cases: {Left: (v:L)=>U, Right: (v:R)=>U}): U {
        return cases.Right(this.value);
    }

    getOrThrow(message?: string): R {
        return this.value;
    }

    getOrElse(other: R): R {
        return this.value;
    }

    getLeftOrThrow(message?: string): L {
        throw message || "Left.getOrThrow called!";
    }

    getLeftOrElse(other: L): L {
        return other;
    }

    toOption(): Option<R> {
        return Option.of(this.value);
    }

    toVector(): Vector<R> {
        return Vector.of(this.value);
    }

    toLinkedList(): LinkedList<R> {
        return LinkedList.of(this.value);
    }

    hasTrueEquality(): boolean {
        return (this.value && (<any>this.value).hasTrueEquality) ?
            (<any>this.value).hasTrueEquality() :
            hasTrueEquality(this.value);
    }

    hashCode(): number {
        return getHashCode(this.value);
    }

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

    toString(): string {
        return "Right(" + this.value + ")";
    }
}
