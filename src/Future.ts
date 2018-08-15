import { Vector } from "./Vector";
import { Lazy } from "./Lazy";
import { Option } from "./Option";
import { Either } from "./Either";
import { HashMap } from "./HashMap";

/**
 * A Future is the equivalent, and ultimately wraps, a javascript Promise.
 * A fundamental difference is that Futures are lazy. Just defining a
 * Future won't trigger its execution, you'll have to use it for that
 * (call [[Future.map]], [[Future.flatMap]], use `await` on it and so on).
 * This means that a Future can have one of the four states:
 *
 * 1. not triggered
 * 2. pending
 * 3. fulfilled
 * 4. rejected
 *
 * That first state doesn't exist with Javascript Promises. In addition,
 * while Futures support the [[Future.then]] call (so that among others
 * you can use `await` on them), you should call [[Future.map]] and
 * [[Future.flatMap]].
 *
 * Futures represent an asynchronous computation. A Future will only ever
 * be computed once at most. Once it's computed, calling [[Future.map]] or
 * `await` will return instantly.
 */
export class Future<T> {

    // careful cause i can't have my type be F<F<T>>
    // while the code does F<T> as JS's then does!!!
    // for that reason I wrap the value in an array
    // to make sure JS will never turn a Promise<Promise<T>>
    // in a Promise<T>
    private constructor(private promise: Lazy<Promise<T[]>>) { }

    /**
     * Build a Future from callback-style call.
     * You get one callback to signal success, throw to signal
     * failure.
     *
     *     Future.ofCallbackApi<string>(done => setTimeout(done, 10, "hello!"))
     */
    static ofCallbackApi<T>(cb: (done:(x:T)=>void)=>void): Future<T> {
        return new Future(Lazy.of(() => new Promise<T[]>(
            (resolve,reject) => cb((v:T) => resolve([v])))));
    }

    /**
     * Build a Future from an existing javascript Promise.
     */
    static of<T>(promise: Promise<T>): Future<T> {
        return new Future(Lazy.of(()=>promise.then(x => [x])));
    }

    /**
     * Build a successful Future with the value you provide.
     */
    static ok<T>(val:T): Future<T> {
        return new Future(Lazy.of(()=>Promise.resolve([val])));
    }

    // /**
    //  * Build a Future from a lazy javascript Promise.
    //  * The advantage compared to [Future.of] is that the
    //  * Future is not started after this call, so it's really lazy.
    //  */
    // static ofLazyPromise<T>(promiseProducer: ()=>Promise<T>): Future<T> {
    //     return new Future(Lazy.of(promiseProducer));
    // }

    /**
     * Build a failed Future with the error data you provide.
     */
    static failed<T>(reason: any): Future<T> {
        return new Future(Lazy.of(()=>Promise.reject(reason)));
    }

    /**
     * The `then` call is not meant to be a part of the `Future` API,
     * we need then so that `await` works directly.
     * This method is eager, will trigger the underlying Promise.
     *
     * Please rather use [[Future.map]] or [[Future.flatMap]].
     */
    then<TResult1 = T, TResult2 = never>(
        onfulfilled: ((value: T) => TResult1 | PromiseLike<TResult1>),
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2> {
        return this.promise.get().then(([x]) => onfulfilled(x), rejected => onrejected?onrejected(rejected):Promise.reject(rejected)); 
    }

    /**
     * Get a `Promise` from this `Future`.
     */
    toPromise(): Promise<T> {
        return this.promise.get().then(([x]) => x);
    }

    /**
     * Returns a `Future` that'll complete when the first `Future` of
     * the iterable you give will complete, with the value of that first
     * future. Be careful, completing doesn't necessarily mean completing
     * successfully!
     *
     * Also see [[Future.firstSuccessfulOf]]
     */
    static firstCompletedOf<T>(elts: Iterable<Future<T>>): Future<T> {
        return Future.of(
            Promise.race(Vector.ofIterable(elts).map(f => f.toPromise())));
    }

    /**
     * Returns a `Future` that'll complete when the first `Future` of
     * the iterable you give will complete successfully, with the value of that first
     * future.
     *
     * Also see [[Future.firstCompletedOf]]
     */
    static firstSuccessfulOf<T>(elts: Iterable<Future<T>>): Future<T> {
        // https://stackoverflow.com/a/37235274/516188
        return Future.of(
            Promise.all(Vector.ofIterable(elts).map(p => {
                // If a request fails, count that as a resolution so it will keep
                // waiting for other possible successes. If a request succeeds,
                // treat it as a rejection so Promise.all immediately bails out.
                return p.then(
                    val => Promise.reject(val),
                    err => Promise.resolve(err)
                );
            })).then(
                // If '.all' resolved, we've just got an array of errors.
                errors => Promise.reject(errors),
                // If '.all' rejected, we've got the result we wanted.
                val => Promise.resolve(val)
                )
        );
    }

    /**
     * Turns a list of futures in a future containing a list of items.
     * Useful in many contexts.
     *
     * But if a single future is failed, you get back a failed Future.
     *
     * Also see [[Future.traverse]]
     */
    static sequence<T>(elts: Iterable<Future<T>>): Future<Vector<T>> {
        return Future.traverse(elts, x=>x);
    }

    /**
     * Takes a list, a function that can transform list elements
     * to futures, then return a Future containing a list of
     * the transformed elements. 
     *
     * But if a single element results in failure, the result also
     * resolves to a failure.
     *
     * Also see [[Future.sequence]]
     */
    static traverse<T,U>(elts: Iterable<T>, fn: (x:T)=>Future<U>,
                         opts?: {maxConcurrent:number}): Future<Vector<U>> {
        if (!opts) {
            return Future.of(
                Promise.all(Vector.ofIterable(elts).map(x => fn(x).toPromise()))
                    .then(Vector.ofIterable));
        }
        // maxConcurrent algorithm inspired by https://stackoverflow.com/a/38778887/516188
        let index = 0;
        let active: Future<U>[] = [];
        const results: {[idx:number]:U} = {};
        const it = elts[Symbol.iterator]();
        let failed: Future<U>|undefined;
        const addAsNeeded = (_?:U): Future<Vector<U>> => {
            if (failed) {
                return <any>failed;
            }
            let cur;
            while (active.length < opts.maxConcurrent &&
                   !(cur = it.next()).done) {
                const p = fn(cur.value);
                active.push(p);
                const curIdx = index++;
                p.onComplete(eitherRes => {
                    active.splice(active.indexOf(p), 1)
                    if (eitherRes.isLeft()) {
                        failed = p;
                    } else {
                        results[curIdx] = eitherRes.get();
                    }
                });
            }
            if (!failed && active.length === 0 && cur && cur.done) {
                return Future.ok(
                    HashMap.ofObjectDictionary<U>(results)
                        .toVector()
                        .sortOn(kv => parseInt(kv[0]))
                        .map(kv => kv[1]));
            }
            return Future.firstCompletedOf(active).flatMap(addAsNeeded);
        };
        return addAsNeeded();
    }

    /**
     * From the list of Futures you give, will attempt to find a successful
     * Future which value matches the predicate you give.
     * We return a Future of an [[Option]], which will [[None]] in case
     * no matching Future is found.
     */
    static find<T>(elts: Iterable<Future<T>>, p: (x: T) => boolean): Future<Option<T>> {
        const origElts = Vector.ofIterable(elts)
        if (origElts.isEmpty()) {
            return Future.ok(Option.none<T>());
        }
        type FutOptPair = [Future<T>,Option<T>];
        // map the failures to successes with option.none
        // backup the original future object matching the new future
        const velts = origElts
            .map(
                f => f
                    .map<FutOptPair>(item => [f, Option.of(item)])
                    .orElse(Future.ok<FutOptPair>([f, Option.none<T>()])));
        // go for the first completed of the iterable
        // remember after our map they're all successful now
        const success = Future.firstCompletedOf(velts);
        return success
            .flatMap(([originalFuture, option]) => {
                if (option.isSome() && p(option.get())) {
                    // this successful future matches our predicate, that's it.
                    return success.map(x => x[1]);
                } else {
                    // this future failed or doesn't match our predicate.
                    // remove the future from the input list (we can do that
                    // because we "backed up" the original future in the future
                    // result), and try again only with the remaining candidates
                    return Future.find(origElts.removeFirst(future => future === originalFuture), p);
                }
            });
    }

    /**
     * Applicative lifting for Future. 'p' stands for 'properties'.
     *
     * Takes a function which operates on a simple JS object, and turns it
     * in a function that operates on the same JS object type except which each field
     * wrapped in a Future ('lifts' the function).
     * It's an alternative to [[Future.liftA2]] when the number of parameters
     * is not two.
     *
     * @param A the object property type specifying the parameters for your function
     * @param B the type returned by your function, returned wrapped in a future by liftAp.
     */
    static liftAp<A,B>(fn:(x:A)=>B): (x: {[K in keyof A]: Future<A[K]>;}) => Future<B> {
        return x => {
            const fieldNames: Array<keyof A> = <any>Object.keys(x);
            const promisesAr = fieldNames.map(n => x[n]);
            let i=0;
            return Future.of(
                Promise.all(promisesAr)
                    .then(resultAr => resultAr.reduce<{[K in keyof A]: A[K]}>((sofar,cur) => {
                        sofar[fieldNames[i++]] = cur;
                        return sofar;
                    }, <any>{}))).map(fn);
        };
    }

    /**
     * Applicative lifting for Future.
     * Takes a function which operates on basic values, and turns it
     * in a function that operates on futures of these values ('lifts'
     * the function). The 2 is because it works on functions taking two
     * parameters.
     *
     * @param R1 the first future type
     * @param R2 the second future type
     * @param V the new future type as returned by the combining function.
     */
    static liftA2<R1,R2,V>(fn:(v1:R1,v2:R2)=>V) : (p1:Future<R1>, p2:Future<R2>) => Future<V> {
        return (p1,p2) => p1.flatMap(a1 => p2.map(a2 => fn(a1,a2)));
    }

    /**
     * Transform the value contained in a successful Future. Has no effect
     * if the Future was failed. Will turn a successful Future in a failed
     * one if you throw an exception in the map callback (but please don't
     * do it.. Rather use [[Future.filter]] or another mechanism).
     *
     * This method is eager, will trigger the underlying Promise.
     */
    map<U>(fn: (x:T)=>U): Future<U> {
        const lazy = Lazy.of(()=>this.promise.get().then(([x]) => [fn(x)]));
        lazy.get();
        return new Future<U>(lazy);
    }

    /**
     * Transform the value contained in a successful Future. You return a
     * Future, but it is then "flattened" so we still return a Future<T>
     * (and not a Future<Future<T>>).
     * Has no effect if the Future was failed. Will turn a successful Future in a failed
     * one if you throw an exception in the map callback (but please don't
     * do it.. Rather use [[Future.filter]] or another mechanism).
     * This method is eager, will trigger the underlying Promise.
     * This is the monadic bind.
     */
    flatMap<U>(fn: (x:T)=>Future<U>): Future<U> {
        const lazy = Lazy.of(()=>this.promise.get().then(([x]) => fn(x).promise.get()));
        lazy.get();
        return new Future<U>(lazy);
    }

    /**
     * Transform the value contained in a failed Future. Has no effect
     * if the Future was successful.
     *
     * This method is eager, will trigger the underlying Promise.
     */
    mapFailure(fn: (x:any)=>any): Future<T> {
        const lazy = Lazy.of(()=>this.promise.get().catch(x => {throw fn(x)}));
        lazy.get();
        return new Future<T>(lazy);
    }

    /**
     * Execute the side-effecting function you give if the Future is a failure.
     */
    onFailure(fn: (x:any)=>void): Future<T> {
        // rethrow in the catch to make sure the promise chain stays rejected
        this.promise.get().catch(x => fn(x));
        return this;
    }

    /**
     * Execute the side-effecting function you give if the Future is a success.
     */
    onSuccess(fn: (x:T)=>void): Future<T> {
        // we create a new promise here, need to catch errors on it,
        // to avoid node UnhandledPromiseRejectionWarning warnings
        // 
        this.promise.get().then(x => {fn(x[0]); return x;}).catch(_ => {});
        return this;
    }

    /**
     * Execute the side-effecting function you give when the Future is
     * completed. You get an [[Either]], a `Right` if the Future is a
     * success, a `Left` if it's a failure.
     */
    onComplete(fn: (x:Either<any,T>)=>void): Future<T> {
        this.promise.get().then(
            x => {fn(Either.right(x[0])); return x;},
            x => fn(Either.left(x)));
        return this;
    }

    /**
     * Has no effect on a failed Future. If the Future was successful,
     * will check whether its value matches the predicate you give as
     * first parameter. If the value matches the predicate, an equivalent
     * Future to the input one is returned.
     *
     * If the value doesn't match predicate however, the second parameter
     * function is used to compute the contents of a failed Future that'll
     * be returned.
     */
    filter(p: (x:T)=>boolean, ifFail: (x:T)=>any): Future<T> {
        return this.flatMap(
            x => p(x) ? Future.ok(x) : Future.failed(ifFail(x)));
    }
    
    /**
     * Has no effect if this Future is successful. If it's failed however,
     * a Future equivalent to the one given as parameter is returned.
     */
    orElse(other: Future<T>): Future<T> {
        const lazy = Lazy.of(()=>this.promise.get().catch(_ => other.promise.get()));
        return new Future<T>(lazy);
    }

    /**
     * Transform this value to another value type.
     * Enables fluent-style programming by chaining calls.
     */
    transform<U>(fn: (x:Future<T>)=>U): U {
        return fn(this);
    }
}
