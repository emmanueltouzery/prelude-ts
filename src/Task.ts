import { Vector } from "./Vector";
import { tuple } from "./functions";

/**
 * A Future is the equivalent, and ultimately wraps, a javascript Promise.
 * While Futures support the [[Future.then]] call (so that among others
 * you can use `await` on them), you should call [[Future.map]] and
 * [[Future.flatMap]].
 *
 * Futures represent an asynchronous computation. A Future will only ever
 * be computed once at most. Once it's computed, calling [[Future.map]] or
 * `await` will return instantly.
 */
export class Task<T> {

  URIS = 'Task'

  // careful cause i can't have my type be F<F<T>>
  // while the code does F<T> as JS's then does!!!
  // for that reason I wrap the value in an array
  // to make sure JS will never turn a Promise<Promise<T>>
  // in a Promise<T>
  private constructor(private thunk: () => Promise<T>) { }

  /**
   * Build a Future in the same way as the 'new Promise'
   * constructor.
   * You get one callback to signal success (resolve),
   * failure (reject), or you can throw to signal failure.
   *
   *     Future.ofPromiseCtor<string>((resolve,reject) => setTimeout(resolve, 10, "hello!"))
   */
  static ofPromiseCtor<T>(executor: (resolve: (x: T) => void, reject: (x: any) => void) => void): Task<T> {
    return new Task(() => new Promise(executor))
  }

  /**
   * Build a Future from a node-style callback API, for instance:
   *
   *     Future.ofCallback<string>(cb => fs.readFile('/etc/passwd', 'utf-8', cb))
   */
  static ofCallback<T>(fn: (cb: (err: any, val: T) => void) => void): Task<T> {
    return Task.ofPromiseCtor((resolve, reject) => fn((err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    }));
  }

  /**
   * Creates a Future from a function returning a Promise,
   * which can be inline in the call, for instance:
   *
   *     const f1 = Future.ok(1);
   *     const f2 = Future.ok(2);
   *     return Future.do(async () => {
   *         const v1 = await f1;
   *         const v2 = await f2;
   *         return v1 + v2;
   *     });
   */
  static of<T>(fn: () => Promise<T>): Task<T> {
    return new Task(fn)
  }

  static done<T>(t: T): Task<T> {
    return new Task(() => Promise.resolve(t))
  }

  /**
   * The `then` call is not meant to be a part of the `Future` API,
   * we need then so that `await` works directly.
   *
   * Please rather use [[Future.map]] or [[Future.flatMap]].
   */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled: ((value: T) => TResult1 | PromiseLike<TResult1>),
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2> {
    return this.thunk().then((x) => onfulfilled(x), rejected => onrejected ? onrejected(rejected) : Promise.reject<TResult2>(rejected));
  }

  /**
   * Get a `Promise` from this `Future`.
   */
  toPromise(): Promise<T> {
    return this.thunk()
  }

  /**
   * Returns a `Future` that'll complete when the first `Future` of
   * the iterable you give will complete, with the value of that first
   * future. Be careful, completing doesn't necessarily mean completing
   * successfully!
   *
   * Also see [[Future.firstSuccessfulOf]]
   */
  static firstCompletedOf<T>(elts: Iterable<Task<T>>): Task<T> {
    return Task.of(
      () => Promise.race(Vector.ofIterable(elts).map(f => f.toPromise())));
  }

  /**
   * Returns a `Future` that'll complete when the first `Future` of
   * the iterable you give will complete successfully, with the value of that first
   * future.
   *
   * Also see [[Future.firstCompletedOf]]
   */
  static firstSuccessfulOf<T>(elts: Iterable<Task<T>>): Task<T> {
    // https://stackoverflow.com/a/37235274/516188
    return new Task(() =>
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
  static sequence<T>(elts: Iterable<Task<T>>): Task<Vector<T>> {
    return Task.traverse(elts, x => x);
  }

  static sequenceT<T extends Array<Task<any>>>(
    ...t: T & { readonly 0: Task<any> }
  ): Task<{ [K in keyof T]: [T[K]] extends [Task<infer U>] ? U : never }>
  static sequenceT<U>(...list: Array<Task<U>>) {

    return Task.sequence(list).map((results) => {
      const [head, ...tail] = results.toArray()
      return tail.reduce<any>((acc, cur) => tuple(...acc, cur), tuple(head))
    })
  }

  /**
   * Takes a list, a function that can transform list elements
   * to futures, then return a Future containing a list of
   * the transformed elements. 
   *
   * But if a single element results in failure, the result also
   * resolves to a failure.
   *
   * There is an optional third parameter to specify options.
   * You can specify `{maxConcurrent: number}` to request that
   * the futures are not all triggered at the same time, but
   * rather only 'number' at a time.
   *
   * Also see [[Future.sequence]]
   */
  static traverse<T, U>(elts: Iterable<T>, fn: (x: T) => Task<U>): Task<Vector<U>> {
    return new Task(() =>
      Promise.all(Vector.ofIterable(elts).map(x => fn(x).toPromise()))
        .then(Vector.ofIterable));
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
  static liftAp<A, B>(fn: (x: A) => B): (x: { [K in keyof A]: Task<A[K]>; }) => Task<B> {
    return x => {
      const fieldNames: Array<keyof A> = <any>Object.keys(x);
      const promisesAr = fieldNames.map(n => x[n]);
      let i = 0;
      return new Task(() =>
        Promise.all(promisesAr)
          .then(resultAr => resultAr.reduce<{ [K in keyof A]: A[K] }>((sofar, cur) => {
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
  static liftA2<R1, R2, V>(fn: (v1: R1, v2: R2) => V): (p1: Task<R1>, p2: Task<R2>) => Task<V> {
    return (p1, p2) => p1.flatMap(a1 => p2.map(a2 => fn(a1, a2)));
  }

  /**
   * Take a function returning a Promise
   * and lift it to return a [[Future]] instead.
   */
  static lift<T extends any[], U>(fn: (...args: T) => Promise<U>): (...args: T) => Task<U> {
    return (...args: T) => Task.of(() => fn(...args));
  }

  /**
   * Transform the value contained in a successful Future. Has no effect
   * if the Future was failed. Will turn a successful Future in a failed
   * one if you throw an exception in the map callback (but please don't
   * do it.. Rather use [[Future.filter]] or another mechanism).
   */
  map<U>(fn: (x: T) => U): Task<U> {
    return new Task<U>(() => this.thunk().then((x) => fn(x)));
  }

  /**
   * Transform the value contained in a successful Future. You return a
   * Future, but it is then "flattened" so we still return a Future<T>
   * (and not a Future<Future<T>>).
   * Has no effect if the Future was failed. Will turn a successful Future in a failed
   * one if you throw an exception in the map callback (but please don't
   * do it.. Rather use [[Future.filter]] or another mechanism).
   * This is the monadic bind.
   */
  flatMap<U>(fn: (x: T) => Task<U>): Task<U> {
    return Task.of(() =>
      this.toPromise().then(t => fn(t).toPromise())
    )

  }

  /**
   * Transform this value to another value type.
   * Enables fluent-style programming by chaining calls.
   */
  transform<U>(fn: (x: Task<T>) => U): U {
    return fn(this);
  }
}
