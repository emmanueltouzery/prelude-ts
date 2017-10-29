import { WithEquality, areEqual } from "./Comparison";
import { Vector } from "./Vector";

/**
 * A predicate is a function taking one parameter and returning a boolean.
 * In other words the predicate checks whether some proposition holds for the parameter.
 *
 * The Predicate interface offers normal function-calling, to make sure that the
 * predicate holds (just call predicate(x)), but also some helper methods to
 * deal with logical operations between propositions.
 *
 * You can build predicates using [[Predicates]].
 */
export interface Predicate<T> {

    /**
     * Does the predicate hold for the value you give?
     * Returns true or false
     */
    (x:T): boolean;

    /**
     * Combines two predicates with the 'and' logical operation.
     * For instance:
     *
     *     Predicates.lift(x => x > 10).and(x => x < 20)
     */
    and(fn:(x:T)=>boolean): Predicate<T>;

    /**
     * Combines two predicates with the 'or' logical operation.
     * For instance:
     *
     *     Predicates.lift(x => x < 5).or(x => x > 10)
     */
    or(fn:(x:T)=>boolean): Predicate<T>;

    /**
     * Unary operation to negate the predicate.
     */
    negate(): Predicate<T>;
}

/**
 * The Predicates class offers some helper functions to deal
 * with [[Predicate]] including the ability to build [[Predicate]]
 * from functions using [[Predicates.lift]], some builtin predicates
 * like [[Predicates.isIn]], and the ability to combine to combine
 * Predicates like with [[Predicates.allOf]].
 */
export class Predicates {

    /**
     * Take a predicate function and lift it to become a [[Predicate]]
     * (enabling you to call [[Predicate.and]], and other logic operations on it)
     */
    static lift<T>(fn: (x:T)=>boolean): Predicate<T> {
        const r = <Predicate<T>>fn;
        r.and = (other:(x:T)=>boolean) => Predicates.lift((x:T) => r(x) && other(x));
        r.or = (other:(x:T)=>boolean) => Predicates.lift((x:T) => r(x) || other(x));
        r.negate = () => Predicates.lift((x:T) => !fn(x));
        return r;
    }

    /**
     * Return a [[Predicate]] checking whether a value is equal to the
     * value you give as parameter.
     */
    static equals<T>(other: T&WithEquality): Predicate<T&WithEquality> {
        return Predicates.lift(x => areEqual(other, x));
    }

    /**
     * Return a [[Predicate]] checking whether a value is contained in the
     * list of values you give as parameter.
     */
    static isIn<T>(others: Iterable<T&WithEquality>): Predicate<T&WithEquality> {
        return Predicates.lift<T&WithEquality>(x => Vector.ofIterable(others).contains(x));
    }

    /**
     * Return a [[Predicate]] checking whether all of the predicate functions given hold
     */
    static allOf<T>(...predicates: Array<(x:T)=>boolean>): Predicate<T> {
        return Predicates.lift<T>(x => Vector.ofIterable(predicates).allMatch(p=>p(x)));
    }

    /**
     * Return a [[Predicate]] checking whether any of the predicate functions given hold
     */
    static anyOf<T>(...predicates: Array<(x:T)=>boolean>): Predicate<T> {
        return Predicates.lift<T>(x => Vector.ofIterable(predicates).anyMatch(p=>p(x)));
    }

    /**
     * Return a [[Predicate]] checking whether none of the predicate functions given hold
     */
    static noneOf<T>(...predicates: Array<(x:T)=>boolean>): Predicate<T> {
        return Predicates.lift<T>(x => !Vector.ofIterable(predicates).anyMatch(p=>p(x)));
    }
}
