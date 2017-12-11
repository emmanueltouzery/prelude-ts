/**
 * Function1 encapsulates a function taking a single parameter
 * and returning a value. It adds some useful functions
 * to combine or transform functions.
 *
 * You can build a Function1 using [[Function]].
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
 * You can build Function2 using [[Function]].
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
     *     const plus5 = Function.lift2(
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
     *     const plus5 = Function.lift2(
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
 * You can build a Function3 using [[Function]].
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
     *     const plus5 = Function.lift3(
     *         (x:number,y:number,z:number)=>x+y+z)
     *            .apply1(5);
     *     assert.equal(8, plus5(1,2));
     */
    apply1(param1:T1): Function2<T2,T3,R>;

    /**
     * Applies this function partially to two arguments.
     *
     *     const plus54 = Function.lift3(
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
 * You can build a Function4 using [[Function]].
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
     *     const plus5 = Function.lift4(
     *         (x:number,y:number,z:number,a:number)=>x+y+z+a)
     *            .apply1(5);
     *     assert.equal(11, plus5(1,2,3));
     */
    apply1(param1:T1): Function3<T2,T3,T4,R>;

    /**
     * Applies this function partially to two arguments.
     *
     *     const plus51 = Function.lift4(
     *         (x:number,y:number,z:number,a:number)=>x+y+z+a)
     *            .apply2(5,1);
     *     assert.equal(11, plus51(2,3));
     */
    apply2(param1:T1, param2: T2): Function2<T3,T4,R>;

    /**
     * Applies this function partially to three arguments.
     *
     *     const plus512 = Function.lift4(
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
 * You can build a Function5 using [[Function]].
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
     *     const plus5 = Function.lift5(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply1(5);
     *     assert.equal(15, plus5(1,2,3,4));
     */
    apply1(param1:T1): Function4<T2,T3,T4,T5,R>;

    /**
     * Applies this function partially to two arguments.
     *
     *     const plus51 = Function.lift5(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply2(5,1);
     *     assert.equal(15, plus51(2,3,4));
     */
    apply2(param1:T1, param2: T2): Function3<T3,T4,T5,R>;

    /**
     * Applies this function partially to three arguments.
     *
     *     const plus512 = Function.lift5(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply3(5,1,2);
     *     assert.equal(15, plus512(3,4));
     */
    apply3(param1:T1, param2: T2, param3: T3): Function2<T4,T5,R>;

    /**
     * Applies this function partially to four arguments.
     *
     *     const plus5123 = Function.lift5(
     *         (x:number,y:number,z:number,a:number,b:number)=>x+y+z+a+b)
     *            .apply4(5,1,2,3);
     *     assert.equal(15, plus5123(4));
     */
    apply4(param1:T1, param2: T2, param3: T3, param4: T4): Function1<T5,R>;
}

/**
 * The Function class offers some helper functions to deal
 * with [[Function1]], [[Function2]] and so on, including
 * the ability to build [[Function1]], [[Function2]], ...
 * from functions using [[Function.lift1]], [[Function.lift2]], ...
 * It also offers some builtin functions like [[Function.const1]].
 */
export class Function {

    /**
     * The identity function.
     */
    static id<T>(): Function1<T,T> {
        return Function.lift1((x:T)=>x);
    }

    /**
     * The constant function of one parameter:
     * will always return the value you give, no
     * matter the parameter it's given.
     */
    static const1<U,T>(val:T): Function1<U,T> {
        return Function.lift1((x:U)=>val);
    }

    /**
     * Take a one-parameter function and lift it to become a [[Function1]],
     * enabling you to call [[Function1.andThen]] and other such methods on it.
     */
    static lift1<T,U>(fn:(x:T)=>U): Function1<T,U> {
        const r = <Function1<T,U>>fn;
        r.andThen = <V>(fn2:(x:U)=>V) => Function.lift1((x:T) => fn2(r(x)));
        r.compose = <S>(fn2:(x:S)=>T) => Function.lift1((x:S) => r(fn2(x)));
        return r;
    }

    /**
     * The constant function of two parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    static const2<T1,T2,R>(val:R): Function2<T1,T2,R> {
        return Function.lift2((x:T1,y:T2)=>val);
    }

    /**
     * Take a two-parameter function and lift it to become a [[Function2]],
     * enabling you to call [[Function2.andThen]] and other such methods on it.
     */
    static lift2<T1,T2,R>(fn:(x:T1,y:T2)=>R): Function2<T1,T2,R> {
        const r = <Function2<T1,T2,R>>fn;
        r.andThen = <V>(fn2:(x:R)=>V) => Function.lift2((x:T1,y:T2) => fn2(r(x,y)));
        r.curried = () => Function.lift1((x:T1) => Function.lift1((y:T2) => r(x,y)));
        r.tupled = () => Function.lift1((pair:[T1,T2]) => r(pair[0],pair[1]));
        r.flipped = () => Function.lift2((x:T2,y:T1) => r(y,x));
        r.apply1 = (x:T1) => Function.lift1((y:T2) => r(x,y));
        return r;
    }

    /**
     * The constant function of three parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    static const3<T1,T2,T3,R>(val:R): Function3<T1,T2,T3,R> {
        return Function.lift3((x:T1,y:T2,z:T3)=>val);
    }

    /**
     * Take a three-parameter function and lift it to become a [[Function3]],
     * enabling you to call [[Function3.andThen]] and other such methods on it.
     */
    static lift3<T1,T2,T3,R>(fn:(x:T1,y:T2,z:T3)=>R): Function3<T1,T2,T3,R> {
        const r = <Function3<T1,T2,T3,R>>fn;
        r.andThen = <V>(fn2:(x:R)=>V) => Function.lift3((x:T1,y:T2,z:T3) => fn2(r(x,y,z)));
        r.curried = () => Function.lift1((x:T1) => Function.lift1((y:T2) => Function.lift1((z:T3) => r(x,y,z))));
        r.tupled = () => Function.lift1((tuple:[T1,T2,T3]) => r(tuple[0],tuple[1],tuple[2]));
        r.flipped = () => Function.lift3((x:T3,y:T2,z:T1) => r(z,y,x));
        r.apply1 = (x:T1) => Function.lift2((y:T2,z:T3) => r(x,y,z));
        r.apply2 = (x:T1,y:T2) => Function.lift1((z:T3) => r(x,y,z));
        return r;
    }

    /**
     * The constant function of four parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    static const4<T1,T2,T3,T4,R>(val:R): Function4<T1,T2,T3,T4,R> {
        return Function.lift4((x:T1,y:T2,z:T3,a:T4)=>val);
    }

    /**
     * Take a four-parameter function and lift it to become a [[Function4]],
     * enabling you to call [[Function4.andThen]] and other such methods on it.
     */
    static lift4<T1,T2,T3,T4,R>(fn:(x:T1,y:T2,z:T3,a:T4)=>R): Function4<T1,T2,T3,T4,R> {
        const r = <Function4<T1,T2,T3,T4,R>>fn;
        r.andThen = <V>(fn2:(x:R)=>V) => Function.lift4((x:T1,y:T2,z:T3,a:T4) => fn2(r(x,y,z,a)));
        r.curried = () => Function.lift1((x:T1) => Function.lift1(
            (y:T2) => Function.lift1((z:T3) => Function.lift1((a:T4)=>r(x,y,z,a)))));
        r.tupled = () => Function.lift1((tuple:[T1,T2,T3,T4]) => r(tuple[0],tuple[1],tuple[2],tuple[3]));
        r.flipped = () => Function.lift4((x:T4,y:T3,z:T2,a:T1) => r(a,z,y,x));
        r.apply1 = (x:T1) => Function.lift3((y:T2,z:T3,a:T4) => r(x,y,z,a));
        r.apply2 = (x:T1,y:T2) => Function.lift2((z:T3,a:T4) => r(x,y,z,a));
        r.apply3 = (x:T1,y:T2,z:T3) => Function.lift1((a:T4) => r(x,y,z,a));
        return r;
    }

    /**
     * The constant function of five parameters:
     * will always return the value you give, no
     * matter the parameters it's given.
     */
    static const5<T1,T2,T3,T4,T5,R>(val:R): Function5<T1,T2,T3,T4,T5,R> {
        return Function.lift5((x:T1,y:T2,z:T3,a:T4,b:T5)=>val);
    }

    /**
     * Take a five-parameter function and lift it to become a [[Function5]],
     * enabling you to call [[Function5.andThen]] and other such methods on it.
     */
    static lift5<T1,T2,T3,T4,T5,R>(fn:(x:T1,y:T2,z:T3,a:T4,b:T5)=>R): Function5<T1,T2,T3,T4,T5,R> {
        const r = <Function5<T1,T2,T3,T4,T5,R>>fn;
        r.andThen = <V>(fn2:(x:R)=>V) => Function.lift5((x:T1,y:T2,z:T3,a:T4,b:T5) => fn2(r(x,y,z,a,b)));
        r.curried = () => Function.lift1((x:T1) => Function.lift1(
            (y:T2) => Function.lift1((z:T3) => Function.lift1((a:T4)=>Function.lift1((b:T5) => r(x,y,z,a,b))))));
        r.tupled = () => Function.lift1((tuple:[T1,T2,T3,T4,T5]) => r(tuple[0],tuple[1],tuple[2],tuple[3],tuple[4]));
        r.flipped = () => Function.lift5((x:T5,y:T4,z:T3,a:T2,b:T1) => r(b,a,z,y,x));
        r.apply1 = (x:T1) => Function.lift4((y:T2,z:T3,a:T4,b:T5) => r(x,y,z,a,b));
        r.apply2 = (x:T1,y:T2) => Function.lift3((z:T3,a:T4,b:T5) => r(x,y,z,a,b));
        r.apply3 = (x:T1,y:T2,z:T3) => Function.lift2((a:T4,b:T5) => r(x,y,z,a,b));
        r.apply4 = (x:T1,y:T2,z:T3,a:T4) => Function.lift1((b:T5) => r(x,y,z,a,b));
        return r;
    }
}
