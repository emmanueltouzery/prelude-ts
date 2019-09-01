/**
 * A predicate is a function taking one parameter and returning a boolean.
 * In other words the predicate checks whether some proposition holds for the parameter.
 *
 * The Predicate interface offers normal function-calling, to make sure that the
 * predicate holds (just call predicate(x)), but also some helper methods to
 * deal with logical operations between propositions.
 *
 * You can build predicates using [[PredicateStatic]] through the
 * 'Predicate' global constant.
 *
 * Examples:
 *
 *     const check = Predicate.of((x: number) => x > 10).and(x => x < 20);
 *     check(12); // => true
 *     check(21);
 *     => false
 *
 *     Vector.of(1,2,3,4,5).filter(
 *         Predicate.isIn([2,3]).negate())
 *     => Vector.of(1, 4, 5)
 */
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
 * You can build predicates using [[PredicateStatic]] through the
 * 'Predicate' global constant.
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
     *     Predicate.of((x: number) => x > 10).and(x => x < 20)
     */
    and(fn:(x:T)=>boolean): Predicate<T>;

    /**
     * Combines two predicates with the 'or' logical operation.
     * For instance:
     *
     *     Predicate.of((x: number) => x < 5).or(x => x > 10)
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
 * from functions using [[PredicateStatic.of]], some builtin predicates
 * like [[PredicateStatic.isIn]], and the ability to combine to combine
 * Predicates like with [[PredicateStatic.allOf]].
 */
export class PredicateStatic {

    /**
     * Take a predicate function and of it to become a [[Predicate]]
     * (enabling you to call [[Predicate.and]], and other logic operations on it)
     */
    of<T>(fn: (x:T)=>boolean): Predicate<T> {
        const r = <Predicate<T>>fn;
        r.and = (other:(x:T)=>boolean) => Predicate.of((x:T) => r(x) && other(x));
        r.or = (other:(x:T)=>boolean) => Predicate.of((x:T) => r(x) || other(x));
        r.negate = () => Predicate.of((x:T) => !fn(x));
        return r;
    }

    /**
     * Return a [[Predicate]] checking whether a value is equal to the
     * value you give as parameter.
     */
    equals<T>(other: T&WithEquality): Predicate<T&WithEquality> {
        return Predicate.of(x => areEqual(other, x));
    }

    /**
     * Return a [[Predicate]] checking whether a value is contained in the
     * list of values you give as parameter.
     */
    isIn<T>(others: Iterable<T&WithEquality>): Predicate<T&WithEquality> {
        return Predicate.of<T&WithEquality>(x => Vector.ofIterable(others).contains(x));
    }

    /**
     * Return a [[Predicate]] checking whether all of the predicate functions given hold
     */
    allOf<T>(...predicates: Array<(x:T)=>boolean>): Predicate<T> {
        return Predicate.of<T>(x => Vector.ofIterable(predicates).allMatch(p=>p(x)));
    }

    /**
     * Return a [[Predicate]] checking whether any of the predicate functions given hold
     */
    anyOf<T>(...predicates: Array<(x:T)=>boolean>): Predicate<T> {
        return Predicate.of<T>(x => Vector.ofIterable(predicates).anyMatch(p=>p(x)));
    }

    /**
     * Return a [[Predicate]] checking whether none of the predicate functions given hold
     */
    noneOf<T>(...predicates: Array<(x:T)=>boolean>): Predicate<T> {
        return Predicate.of<T>(x => !Vector.ofIterable(predicates).anyMatch(p=>p(x)));
    }
}

/**
 * The Predicate constant allows to call the [[Predicate]] "static" methods.
 */
export const Predicate = new PredicateStatic();
