/**
 * Rich functions with helpers such as [[Function1.andThen]],
 * [[Function2.apply1]] and so on.
 *
 * We support functions of arities up to 5. For each arity, we have
 * the interface ([[Function1]], [[Function2]], ...), builders are on functions
 * on [[Function1Static]], [[Function2Static]]... accessible on constants
 * named Function1, Function2,...
 *
 * It also has for instance [[Function1Static.liftOption]], which allows
 * to use functions which are not aware of [[Option]] (for instance _.find())
 * and make them take advantage of Option, or [[Function1Static.liftEither]],
 * which allow to work with [[Either]] instead of exceptions.
 *
 * Examples:
 *
 *     const combined = Function1.of((x:number)=>x+2).andThen(x=>x*3);
 *     combined(6);
 *     => 24
 *
 *     const plus5 = Function2.of((x:number,y:number)=>x+y).apply1(5);
 *     plus5(1);
 *     => 6
 */
import { Option } from "./Option";
import { Either } from "./Either";

/**
 * Function0 encapsulates a parameterless function
 * which returns a value. It adds some useful functions
 * to combine or transform functions.
 *
 * @param T the parameter type
 * @param U the result type
 */
export interface Function0<R> {

    /**
     * Invoke the function
     */
    (): R;

    /**
     * Returns a new composed function which first calls the current
     * function and then the one you pass as parameter.
     */
    andThen<V>(fn:(x:R)=>V): Function0<V>;
}

/**
 * Function1 encapsulates a function taking a single parameter
 * and returning a value. It adds some useful functions
 * to combine or transform functions.
 *
 * @param T the parameter type
 * @param U the result type
 */
export interface Function1<T,U> {

    /**
     * Invoke the function
     */
    (x:T): U;

    /**
     * Returns a new composed function which first applies the current
     * function and then the one you pass as parameter.
     */
    andThen<V>(fn:(x:U)=>V): Function1<T,V>;

    /**
     *
     */
    compose<S>(fn:(x:S)=>T): Function1<S,U>;
}

/**
 * Function2 encapsulates a function taking two parameters
 * and returning a value. It adds some useful functions
 * to combine or transform functions.
 *
 * @param T1 the first parameter type
 * @param T2 the second parameter type
 * @param R the result type
 */
export interface Function2<T1,T2,R> {

    /**
     * Invoke the function
     */
    (x:T1,y:T2): R;

    /**
     * Returns a new composed function which first applies the current
     * function and then the one you pass as parameter.
     */
    andThen<V>(fn:(x:R)=>V): Function2<T1,T2,V>;

    /**
     * Returns a curried version of this function, for example:
     *
     *     const plus5 = Function2.of(
     *         (x:number,y:number)=>x+y)
     *            .curried()(5);
     *     assert.equal(6, plus5(1));
     */
    curried(): Function1<T1,Function1<T2,R>>;

    /**
     * Returns a version of this function which takes a tuple
     * instead of individual parameters. Useful in combination
     * with [[List.zip]] for instance.
     */
    tupled(): Function1<[T1,T2],R>;

    /**
     * Returns a version of this function taking its parameters
     * in the reverse order.
     */
    flipped(): Function2<T2,T1,R>;

    /**
     * Applies this function partially to one argument.
     *
     *     const plus5 = Function2.of(
     *         (x:number,y:number)=>x+y)
     *            .apply1(5);
     *     assert.equal(6, plus5(1));
     */
    apply1(param1:T1): Function1<T2,R>;
}

/**
 * Function3 encapsulates a function taking three parameters
 * and returning a value. It adds some useful functions
 * to combine or transform functions.
 *
 * @param T1 the first parameter type
 * @param T2 the second parameter type
 * @param T3 the third parameter type
 * @param R the result type
 */
export interface Function3<T1,T2,T3,R> {

    /**
     * Invoke the function
     */
    (x:T1,y:T2,z:T3): R;

    /**
     * Returns a new composed function which first applies the current
     * function and then the one you pass as parameter.
     */
    andThen<V>(fn:(x:R)=>V): Function3<T1,T2,T3,V>;

    /**
     * Returns a curried version of this function, for example:
     * See [[Function2.curried]]
     */
    curried(): Function1<T1,Function1<T2,Function1<T3,R>>>;

    /**
     * Returns a version of this function which takes a tuple
     * instead of individual parameters.
     */
    tupled(): Function1<[T1,T2,T3],R>;

    /**
     * Returns a version of this function taking its parameters
     * in the reverse order.
     */
    flipped(): Function3<T3,T2,T1,R>;

    /**
     * Applies this function partially to one argument.
     *
     *     const plus5 = Function3.of(
     *         (x:number,y:number,z:number)=>x+y+z)
     *            .apply1(5);
     *     assert.equal(8, plus5(1,2));
     */
    apply1(param1:T1): Function2<T2,T3,R>;

    /**
     * Applies this function partially to two arguments.
     *
     *     const plus54 = Function3.of(
     *         (x:number,y:number,z:number)=>x+y+z)
     *            .apply2(5,4);
     *     assert.equal(12, plus54(3));
     */
    apply2(param1:T1, param2: T2): Function1<T3,R>;
}

/**
 * Function4 encapsulates a function taking four parameters
 * and returning a value. It adds some useful functions
 * to combine or transform functions.
 *
 * @param T1 the first parameter type
 * @param T2 the second parameter type
 * @param T3 the third parameter type
 * @param T4 the fourth parameter type
 * @param R the result type
 */
export interface Function4<T1,T2,T3,T4,R> {

    /**
     * Invoke the function
     */
    (x:T1,y:T2,z:T3,a:T4): R;

    /**
     * Returns a new composed function which first applies the current
     * function and then the one you pass as parameter.
     */
    andThen<V>(fn:(x:R)=>V): Function4<T1,T2,T3,T4,V>;

    /**
     * Returns a curried version of this function, for example:
     * See [[Function2.curried]]
     */
    curried(): Function1<T1,Function1<T2,Function1<T3,Function1<T4,R>>>>;

    /**
     * Returns a version of this function which takes a tuple
     * instead of individual parameters.
     */
    tupled(): Function1<[T1,T2,T3,T4],R>;

    /**
     * Returns a version of this function taking its parameters
     * in the reverse order.
     */
    flipped(): Function4<T4,T3,T2,T1,R>;

    /**
     * Applies this function partially to one argument.
     *
     *     const plus5 = Function4.of(
     *         (x:number,y:number,z:number,a:number)=>x+y+z+a)
     *            .apply1(5);
     *     assert.equal(11, plus5(1,2,3));
     */
    apply1(param1:T1): Function3<T2,T3,T4,R>;

    /**
     * Applies this function partially to two arguments.
     *
     *     const plus51 = Function4.of(
     *         (x:number,y:number,z:number,a:number)=>x+y+z+a)
     *            .apply2(5,1);
     *     assert.equal(11, plus51(2,3));
     */
    apply2(param1:T1, param2: T2): Function2<T3,T4,R>;

    /**
     * Applies this function partially to three arguments.
     *
     *     const plus512 = Function4.of(
     *         (x:number,y:number,z:number,a:number)=>x+y+z+a)
     *            .apply3(5,1,2);
     *     assert.equal(11, plus512(3));
     */
    apply3(param1:T1, param2: T2, param3: T3): Function1<T4,R>;
}

/**
 * Function5 encapsulates a function taking give parameters
 * and returning a value. It adds some useful functions
 * to combine or transform functions.
 *
 * @param T1 the first parameter type
 * @param T2 the second parameter type
 * @param T3 the third parameter type
 * @param T4 the fourth parameter type
 * @param T5 the fifth parameter type
 * @param R the result type
 */
export interface Function5<T1,T2,T3,T4,T5,R> {

    /**
     * Invoke the function
     */
    (x:T1,y:T2,z:T3,a:T4,b:T5): R;

    /**
     * Returns a new composed function which first applies the current
     * function and then the one you pass as parameter.
     */
    andThen<V>(fn:(x:R)=>V): Function5<T1,T2,T3,T4,T5,V>;

    /**
     * Returns a curried version of this function, for example:
     * See [[Function2.curried]]
     */
    curried(): Function1<T1,Function1<T2,Function1<T3,Function1<T4,Function1<T5,R>>>>>;

    /**
     * Returns a version of this function which takes a tuple
     * instead of individual parameters.
     */
    tupled(): Function1<[T1,T2,T3,T4,T5],R>;

    /**
     * Returns a version of this function taking its parameters
     * in the reverse order.
     */
    flipped(): Function5<T5,T4,T3,T2,T1,R>;

    /**
     * Applies this function partially to one argument.
     *
     *     const plus5 = Function5.of(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply1(5);
     *     assert.equal(15, plus5(1,2,3,4));
     */
    apply1(param1:T1): Function4<T2,T3,T4,T5,R>;

    /**
     * Applies this function partially to two arguments.
     *
     *     const plus51 = Function5.of(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply2(5,1);
     *     assert.equal(15, plus51(2,3,4));
     */
    apply2(param1:T1, param2: T2): Function3<T3,T4,T5,R>;

    /**
     * Applies this function partially to three arguments.
     *
     *     const plus512 = Function5.of(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply3(5,1,2);
     *     assert.equal(15, plus512(3,4));
     */
    apply3(param1:T1, param2: T2, param3: T3): Function2<T4,T5,R>;

    /**
     * Applies this function partially to four arguments.
     *
     *     const plus5123 = Function5.of(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply4(5,1,2,3);
     *     assert.equal(15, plus5123(4));
     */
    apply4(param1:T1, param2: T2, param3: T3, param4: T4): Function1<T5,R>;
}

/**
 * This is the type of the Function0 constant, which
 * offers some helper functions to deal
 * with [[Function0]] including
 * the ability to build [[Function0]]
 * from functions using [[Function0Static.of]].
 * It also offers some builtin functions like [[Function0Static.constant]].
 */
export class Function0Static {

    /**
     * The constant function of one parameter:
     * will always return the value you give, no
     * matter the parameter it's given.
     */
    constant<R>(val:R): Function0<R> {
        return Function0.of(()=>val);
    }

    /**
     * Take a one-parameter function and lift it to become a [[Function1Static]],
     * enabling you to call [[Function1.andThen]] and other such methods on it.
     */
    of<R>(fn:()=>R): Function0<R> {
        const r = <Function0<R>>(() => fn());
        r.andThen = <V>(fn2:(x:R)=>V) => Function0.of(() => fn2(r()));
        return r;
    }

    /**
     * Take a no-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     const randOpt = Function0.liftOption(Math.random);
     *     randOpt();
     *     => Option.of(0.49884723907769635)
     *
     *     const undef = Function0.liftOption(()=>undefined);
     *     undef();
     *     => Option.none()
     *
     *     const throws = Function0.liftOption(()=>{throw "x"});
     *     throws();
     *     => Option.none()
     *
     */
    liftOption<U>(fn:()=>U|undefined): Function0<Option<U>> {
        return Function0.of(() => {
            try {
                return Option.of(fn());
            } catch {
                return Option.none<U>();
            }
        });
    }

    /**
     * Take a no-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Either]] instead.
     * Note that unlike the [[Function1Static.of]] version, if
     * the function returns undefined, the liftEither version will throw
     * (the liftOption version returns None()).
     *
     *     const eitherRand = Function0.liftEither(Math.random, {} as string);
     *     eitherRand();
     *     => Either.right(0.49884723907769635)
     *
     *     const undef = Function0.liftEither(() => undefined);
     *     undef();
     *     => throws
     *
     *     const throws = Function0.liftEither(() => {throw "x"});
     *     throws();
     *     => Either.left("x")
     */
    liftEither<L,U>(fn:()=>U, witness?: L): Function0<Either<L,U>> {
        return Function0.of(() => {
            try {
                const r = fn();
                if (r !== undefined) {
                    return Either.right(r);
                }
            } catch (err) {
                return Either.left(err);
            }
            throw "liftEither got undefined!";
        });
    }
}

/**
 * The Function1 constant allows to call the [[Function0]] "static" methods.
 */
export const Function0 = new Function0Static();

/**
 * This is the type of the Function1 constant, which
 * offers some helper functions to deal
 * with [[Function1]] including
 * the ability to build [[Function1]]
 * from functions using [[Function1Static.of]].
 * It also offers some builtin functions like [[Function1Static.constant]].
 */
export class Function1Static {

    /**
     * The identity function.
     */
    id<T>(): Function1<T,T> {
        return Function1.of((x:T)=>x);
    }

    /**
     * The constant function of one parameter:
     * will always return the value you give, no
     * matter the parameter it's given.
     */
    constant<U,T>(val:T): Function1<U,T> {
        return Function1.of((x:U)=>val);
    }

    /**
     * Take a one-parameter function and lift it to become a [[Function1Static]],
     * enabling you to call [[Function1.andThen]] and other such methods on it.
     */
    of<T,U>(fn:(x:T)=>U): Function1<T,U> {
        const r = <Function1<T,U>>(x => fn(x));
        r.andThen = <V>(fn2:(x:U)=>V) => Function1.of((x:T) => fn2(r(x)));
        r.compose = <S>(fn2:(x:S)=>T) => Function1.of((x:S) => r(fn2(x)));
        return r;
    }

    /**
     * Take a one-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     const add = Function1.liftOption((x:number)=>x+1);
     *     add(1);
     *     => Option.of(2)
     *
     *     const undef = Function1.liftOption((x:number)=>undefined);
     *     undef(1);
     *     => Option.none()
     *
     *     const throws = Function1.liftOption((x:number)=>{throw "x"});
     *     throws(1);
     *     => Option.none()
     *
     */
    liftOption<T,U>(fn:(x:T)=>U|undefined): Function1<T,Option<U>> {
        return Function1.of(x => {
            try {
                return Option.of(fn(x));
            } catch {
                return Option.none<U>();
            }
        });
    }

    /**
     * Take a one-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Either]] instead.
     * Note that unlike the [[Function1Static.liftOption]] version, if
     * the function returns undefined, the liftEither version will throw
     * (the liftOption version returns None()).
     *
     *     const add1 = Function1.liftEither((x:number) => x+1, {} as string);
     *     add1(1);
     *     => Either.right(2)
     *
     *     const undef = Function1.liftEither((x:number) => undefined);
     *     undef(1);
     *     => throws
     *
     *     const throws = Function1.liftEither((x:number) => {throw "x"});
     *     throws(1);
     *     => Either.left("x")
     */
    liftEither<T,L,U>(fn:(x:T)=>U, witness?: L): Function1<T,Either<L,U>> {
        return Function1.of(x => {
            try {
                const r = fn(x);
                if (r !== undefined) {
                    return Either.right(r);
                }
            } catch (err) {
                return Either.left(err);
            }
            throw "liftEither got undefined!";
        });
    }
}

/**
 * The Function1 constant allows to call the [[Function1]] "static" methods.
 */
export const Function1 = new Function1Static();

/**
 * This is the type of the Function2 constant, which
 * offers some helper functions to deal
 * with [[Function2]] including
 * the ability to build [[Function2]]
 * from functions using [[Function2Static.of]].
 * It also offers some builtin functions like [[Function2Static.constant]].
 */
export class Function2Static {
    /**
     * The constant function of two parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    constant<T1,T2,R>(val:R): Function2<T1,T2,R> {
        return Function2.of((x:T1,y:T2)=>val);
    }

    /**
     * Take a two-parameter function and lift it to become a [[Function2]],
     * enabling you to call [[Function2.andThen]] and other such methods on it.
     */
    of<T1,T2,R>(fn:(x:T1,y:T2)=>R): Function2<T1,T2,R> {
        const r = <Function2<T1,T2,R>>((x,y)=>fn(x,y));
        r.andThen = <V>(fn2:(x:R)=>V) => Function2.of((x:T1,y:T2) => fn2(r(x,y)));
        r.curried = () => Function1.of((x:T1) => Function1.of((y:T2) => r(x,y)));
        r.tupled = () => Function1.of((pair:[T1,T2]) => r(pair[0],pair[1]));
        r.flipped = () => Function2.of((x:T2,y:T1) => r(y,x));
        r.apply1 = (x:T1) => Function1.of((y:T2) => r(x,y));
        return r;
    }

    /**
     * Take a two-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     const plus = Function2.liftOption((x:number,y:number)=>x+y);
     *     plus(1,2);
     *     => Option.of(3)
     *
     *     const undef = Function2.liftOption((x:number,y:number)=>undefined);
     *     undef(1,2);
     *     => Option.none()
     *
     *     const throws = Function2.liftOption((x:number,y:number)=>{throw "x"});
     *     throws(1,2);
     *     => Option.none()
     */
    liftOption<T1,T2,R>(fn:(x:T1,y:T2)=>R|undefined): Function2<T1,T2,Option<R>> {
        return Function2.of((x,y) => {
            try {
                return Option.of(fn(x,y));
            } catch {
                return Option.none<R>();
            }
        });
    }

    /**
     * Take a two-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Either]] instead.
     * Note that unlike the [[Function2Static.liftOption]] version, if
     * the function returns undefined, the liftEither version will throw
     * (the liftOption version returns None()).
     *
     *     const add = Function2.liftEither((x:number,y:number) => x+y, {} as string);
     *     add(1,2);
     *     => Either.right(3)
     *
     *     const undef = Function2.liftEither((x:number,y:number) => undefined);
     *     undef(1,2);
     *     => throws
     *
     *     const throws = Function2.liftEither((x:number,y:number) => {throw "x"});
     *     throws(1,2);
     *     => Either.left("x")
     */
    liftEither<T1,T2,L,R>(fn:(x:T1,y:T2)=>R, witness?: L): Function2<T1,T2,Either<L,R>> {
        return Function2.of((x,y) => {
            try {
                const r = fn(x,y);
                if (r !== undefined) {
                    return Either.right(r);
                }
            } catch (err) {
                return Either.left(err);
            }
            throw "liftEither got undefined!";
        });
    }
}

/**
 * The Function2 constant allows to call the [[Function2]] "static" methods.
 */
export const Function2 = new Function2Static();

/**
 * This is the type of the Function3 constant, which
 * offers some helper functions to deal
 * with [[Function3]] including
 * the ability to build [[Function3]]
 * from functions using [[Function3Static.of]].
 * It also offers some builtin functions like [[Function3Static.constant]].
 */
export class Function3Static {
    /**
     * The constant function of three parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    constant<T1,T2,T3,R>(val:R): Function3<T1,T2,T3,R> {
        return Function3.of((x:T1,y:T2,z:T3)=>val);
    }

    /**
     * Take a three-parameter function and lift it to become a [[Function3]],
     * enabling you to call [[Function3.andThen]] and other such methods on it.
     */
    of<T1,T2,T3,R>(fn:(x:T1,y:T2,z:T3)=>R): Function3<T1,T2,T3,R> {
        const r = <Function3<T1,T2,T3,R>>((x,y,z)=>fn(x,y,z));
        r.andThen = <V>(fn2:(x:R)=>V) => Function3.of((x:T1,y:T2,z:T3) => fn2(r(x,y,z)));
        r.curried = () => Function1.of((x:T1) => Function1.of((y:T2) => Function1.of((z:T3) => r(x,y,z))));
        r.tupled = () => Function1.of((tuple:[T1,T2,T3]) => r(tuple[0],tuple[1],tuple[2]));
        r.flipped = () => Function3.of((x:T3,y:T2,z:T1) => r(z,y,x));
        r.apply1 = (x:T1) => Function2.of((y:T2,z:T3) => r(x,y,z));
        r.apply2 = (x:T1,y:T2) => Function1.of((z:T3) => r(x,y,z));
        return r;
    }

    /**
     * Take a three-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     const add3 = Function3.liftOption(
     *         (x:number,y:number,z:number)=>x+y+z);
     *     add3(1,2,3);
     *     => Option.of(6)
     *
     *     const undef = Function3.liftOption(
     *         (x:number,y:number,z:number)=>undefined);
     *     undef(1,2,3);
     *     => Option.none()
     *
     *     const throws = Function3.liftOption(
     *         (x:number,y:number,z:number)=>{throw "x"});
     *     throws(1,2,3);
     *     => Option.none()
     */
    liftOption<T1,T2,T3,R>(
        fn:(x:T1,y:T2,z:T3)=>R|undefined): Function3<T1,T2,T3,Option<R>> {
        return Function3.of((x,y,z) => {
            try {
                return Option.of(fn(x,y,z));
            } catch {
                return Option.none<R>();
            }
        });
    }

    /**
     * Take a three-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Either]] instead.
     * Note that unlike the [[Function3Static.liftOption]] version, if
     * the function returns undefined, the liftEither version will throw
     * (the liftOption version returns None()).
     *
     *     const add3 = Function3.liftEither((x:number,y:number,z:number) => x+y+z, {} as string);
     *     add3(1,2,3);
     *     => Either.right(6)
     *
     *     const undef = Function3.liftEither((x:number,y:number,z:number) => undefined);
     *     undef(1,2,3);
     *     => throws
     *
     *     const throws = Function3.liftEither((x:number,y:number,z:number) => {throw "x"});
     *     throws(1,2,3);
     *     => Either.left("x")
     */
    liftEither<T1,T2,T3,L,R>(fn:(x:T1,y:T2,z:T3)=>R, witness?: L): Function3<T1,T2,T3,Either<L,R>> {
        return Function3.of((x,y,z) => {
            try {
                const r = fn(x,y,z);
                if (r !== undefined) {
                    return Either.right(r);
                }
            } catch (err) {
                return Either.left(err);
            }
            throw "liftEither got undefined!";
        });
    }
}

/**
 * The Function3 constant allows to call the [[Function3]] "static" methods.
 */
export const Function3 = new Function3Static();

/**
 * This is the type of the Function4 constant, which
 * offers some helper functions to deal
 * with [[Function4]] including
 * the ability to build [[Function4]]
 * from functions using [[Function4Static.of]].
 * It also offers some builtin functions like [[Function4Static.constant]].
 */
export class Function4Static {

    /**
     * The constant function of four parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    constant<T1,T2,T3,T4,R>(val:R): Function4<T1,T2,T3,T4,R> {
        return Function4.of((x:T1,y:T2,z:T3,a:T4)=>val);
    }

    /**
     * Take a four-parameter function and lift it to become a [[Function4]],
     * enabling you to call [[Function4.andThen]] and other such methods on it.
     */
    of<T1,T2,T3,T4,R>(fn:(x:T1,y:T2,z:T3,a:T4)=>R): Function4<T1,T2,T3,T4,R> {
        const r = <Function4<T1,T2,T3,T4,R>>((x,y,z,a)=>fn(x,y,z,a));
        r.andThen = <V>(fn2:(x:R)=>V) => Function4.of((x:T1,y:T2,z:T3,a:T4) => fn2(r(x,y,z,a)));
        r.curried = () => Function1.of((x:T1) => Function1.of(
            (y:T2) => Function1.of((z:T3) => Function1.of((a:T4)=>r(x,y,z,a)))));
        r.tupled = () => Function1.of((tuple:[T1,T2,T3,T4]) => r(tuple[0],tuple[1],tuple[2],tuple[3]));
        r.flipped = () => Function4.of((x:T4,y:T3,z:T2,a:T1) => r(a,z,y,x));
        r.apply1 = (x:T1) => Function3.of((y:T2,z:T3,a:T4) => r(x,y,z,a));
        r.apply2 = (x:T1,y:T2) => Function2.of((z:T3,a:T4) => r(x,y,z,a));
        r.apply3 = (x:T1,y:T2,z:T3) => Function1.of((a:T4) => r(x,y,z,a));
        return r;
    }

    /**
     * Take a four-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     const add4 = Function4.liftOption(
     *         (x:number,y:number,z:number,a:number)=>x+y+z+a);
     *     add4(1,2,3,4);
     *     => Option.of(10)
     *
     *     const undef = Function4.liftOption(
     *         (x:number,y:number,z:number,a:number)=>undefined);
     *     undef(1,2,3,4);
     *     => Option.none()
     *
     *     const throws = Function4.liftOption(
     *         (x:number,y:number,z:number,a:number)=>{throw "x"});
     *     throws(1,2,3,4);
     *     => Option.none()
     */
    liftOption<T1,T2,T3,T4,R>(
        fn:(x:T1,y:T2,z:T3,a:T4)=>R|undefined): Function4<T1,T2,T3,T4,Option<R>> {
        return Function4.of((x,y,z,a) => {
            try {
                return Option.of(fn(x,y,z,a));
            } catch {
                return Option.none<R>();
            }
        });
    }

    /**
     * Take a four-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Either]] instead.
     * Note that unlike the [[Function4Static.liftOption]] version, if
     * the function returns undefined, the liftEither version will throw
     * (the liftOption version returns None()).
     *
     *     const add4 = Function4.liftEither((x:number,y:number,z:number,a:number) => x+y+z+a, {} as string);
     *     add4(1,2,3,4);
     *     => Either.right(10)
     *
     *     const undef = Function4.liftEither((x:number,y:number,z:number,a:number) => undefined);
     *     undef(1,2,3,4);
     *     => throws
     *
     *     const throws = Function4.liftEither((x:number,y:number,z:number,a:number) => {throw "x"});
     *     throws(1,2,3,4);
     *     => Either.left("x")
     */
    liftEither<T1,T2,T3,T4,L,R>(fn:(x:T1,y:T2,z:T3,a:T4)=>R, witness?: L): Function4<T1,T2,T3,T4,Either<L,R>> {
        return Function4.of((x,y,z,a) => {
            try {
                const r = fn(x,y,z,a);
                if (r !== undefined) {
                    return Either.right(r);
                }
            } catch (err) {
                return Either.left(err);
            }
            throw "liftEither got undefined!";
        });
    }
};

/**
 * The Function4 constant allows to call the [[Function4]] "static" methods.
 */
export const Function4 = new Function4Static();

/**
 * This is the type of the Function5 constant, which
 * offers some helper functions to deal
 * with [[Function5]] including
 * the ability to build [[Function5]]
 * from functions using [[Function5Static.of]].
 * It also offers some builtin functions like [[Function5Static.constant]].
 */
export class Function5Static {
    /**
     * The constant function of five parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    constant<T1,T2,T3,T4,T5,R>(val:R): Function5<T1,T2,T3,T4,T5,R> {
        return Function5.of((x:T1,y:T2,z:T3,a:T4,b:T5)=>val);
    }

    /**
     * Take a five-parameter function and lift it to become a [[Function5]],
     * enabling you to call [[Function5.andThen]] and other such methods on it.
     */
    of<T1,T2,T3,T4,T5,R>(fn:(x:T1,y:T2,z:T3,a:T4,b:T5)=>R): Function5<T1,T2,T3,T4,T5,R> {
        const r = <Function5<T1,T2,T3,T4,T5,R>>((x,y,z,a,b)=>fn(x,y,z,a,b));
        r.andThen = <V>(fn2:(x:R)=>V) => Function5.of((x:T1,y:T2,z:T3,a:T4,b:T5) => fn2(r(x,y,z,a,b)));
        r.curried = () => Function1.of((x:T1) => Function1.of(
            (y:T2) => Function1.of((z:T3) => Function1.of((a:T4)=>Function1.of((b:T5) => r(x,y,z,a,b))))));
        r.tupled = () => Function1.of((tuple:[T1,T2,T3,T4,T5]) => r(tuple[0],tuple[1],tuple[2],tuple[3],tuple[4]));
        r.flipped = () => Function5.of((x:T5,y:T4,z:T3,a:T2,b:T1) => r(b,a,z,y,x));
        r.apply1 = (x:T1) => Function4.of((y:T2,z:T3,a:T4,b:T5) => r(x,y,z,a,b));
        r.apply2 = (x:T1,y:T2) => Function3.of((z:T3,a:T4,b:T5) => r(x,y,z,a,b));
        r.apply3 = (x:T1,y:T2,z:T3) => Function2.of((a:T4,b:T5) => r(x,y,z,a,b));
        r.apply4 = (x:T1,y:T2,z:T3,a:T4) => Function1.of((b:T5) => r(x,y,z,a,b));
        return r;
    }

    /**
     * Take a five-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Option]] instead.
     * null and undefined become a [[None]], everything else a [[Some]]
     *
     *     const add5 = Function5.liftOption(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b);
     *     add5(1,2,3,4,5);
     *     => Option.of(15)
     *
     *     const undef = Function5.liftOption(
     *         (x:number,y:number,z:number,a:number,b:number)=>undefined);
     *     undef(1,2,3,4,5);
     *     => Option.none()
     *
     *     const throws = Function5.liftOption(
     *         (x:number,y:number,z:number,a:number,b:number)=>{throw "x"});
     *     throws(1,2,3,4,5);
     *     => Option.none()
     */
    liftOption<T1,T2,T3,T4,T5,R>(
        fn:(x:T1,y:T2,z:T3,a:T4,b:T5)=>R|undefined): Function5<T1,T2,T3,T4,T5,Option<R>> {
        return Function5.of((x,y,z,a,b) => {
            try {
                return Option.of(fn(x,y,z,a,b));
            } catch {
                return Option.none<R>();
            }
        });
    }

    /**
     * Take a five-parameter partial function (may return undefined or throw),
     * and lift it to return an [[Either]] instead.
     * Note that unlike the [[Function5Static.liftOption]] version, if
     * the function returns undefined, the liftEither version will throw
     * (the liftOption version returns None()).
     *
     *     const add5 = Function5.liftEither(
     *         (x:number,y:number,z:number,a:number,b:number) => x+y+z+a+b, {} as string);
     *     add5(1,2,3,4,5);
     *     => Either.right(15)
     *
     *     const undef = Function5.liftEither(
     *         (x:number,y:number,z:number,a:number,b:number) => undefined);
     *     undef(1,2,3,4,5);
     *     => throws
     *
     *     const throws = Function5.liftEither(
     *         (x:number,y:number,z:number,a:number,b:number) => {throw "x"});
     *     throws(1,2,3,4,5);
     *     => Either.left("x")
     */
    liftEither<T1,T2,T3,T4,T5,L,R>(fn:(x:T1,y:T2,z:T3,a:T4,b:T5)=>R, witness?: L): Function5<T1,T2,T3,T4,T5,Either<L,R>> {
        return Function5.of((x,y,z,a,b) => {
            try {
                const r = fn(x,y,z,a,b);
                if (r !== undefined) {
                    return Either.right(r);
                }
            } catch (err) {
                return Either.left(err);
            }
            throw "liftEither got undefined!";
        });
    }
}

/**
 * The Function5 constant allows to call the [[Function5]] "static" methods.
 */
export const Function5 = new Function5Static();
