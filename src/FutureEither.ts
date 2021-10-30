import { Future } from "./Future";
import { Either } from "./Either";
import { Option } from "./Option";

// A *real* poor-man's version of a F<Either<L, R>> with F fixed to Future
export class FutureEither<L, R> {
  private constructor(private readonly fe: Future<Either<L, R>>) {
  }

  static of<L = never, R = never>(fe: Future<Either<L, R>>) {
    return new FutureEither(fe)
  }

  static ofEither<L, R>(e: Either<L, R>) {
    return new FutureEither(Future.ok(e))
  }

  static left<L = never, R = never>(fl: Future<L>): FutureEither<L, R> {
    return new FutureEither(fl.map((l) => Either.left<L, R>(l)))
  }

  static leftF<L = never, R = never>(l: L): FutureEither<L, R> {
    return FutureEither.left(Future.ok(l))
  }

  static right<L = never, R = never>(fr: Future<R>): FutureEither<L, R> {
    return new FutureEither(fr.map((r) => Either.right<L, R>(r)))
  }

  static rightF<L = never, R = never>(r: R): FutureEither<L, R> {
    return FutureEither.right(Future.ok(r))
  }

  /**
   * Applicative lifting for FutureEither.
   * Takes a function which operates on basic values, and turns it
   * in a function that operates on future eithers of these values ('lifts'
   * the function). The 2 is because it works on functions taking two
   * parameters.
   *
   * @param A the first future right type
   * @param B the second future right type
   * @param R the new future right type as returned by the combining function.
   * @param L the left type of the returned future either
   */
  static liftA2<A, B, L, R>(
    f: (va: A, vb: B) => R,
  ): (liftedA: FutureEither<L, A>, liftedB: FutureEither<L, B>) => FutureEither<L, R> {
    return (liftedA, liftedB) => liftedA.flatMap((a) => liftedB.map((b) => f(a, b)))
  }

  // Copied from Future to that this type is 'thenable'
  // const foo = await FutureEither.ofEither(Either.right(1)) // foo == Promise<Either<unknown, number>>
  /**
   * The `then` call is not meant to be a part of the `FutureEither` API,
   * we need then so that `await` works directly.
   *
   * Please rather use [[FutureEither.map]] or [[FutureEither.flatMap]].
   */
  then<TResult1 = Either<L, R>, TResult2 = never>(
    onfulfilled: (value: Either<L, R>) => TResult1 | PromiseLike<TResult1>,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.fe.toPromise().then(
      (x) => onfulfilled(x),
      (rejected) => (onrejected ? onrejected(rejected) : Promise.reject<TResult2>(rejected))
    )
  }

  value(): Future<Either<L, R>> {
    return this.fe
  }

  toOption(): Future<Option<R>> {
    return this.fe.map((e) => e.toOption())
  }

  map<U>(f: (r: R) => U): FutureEither<L, U> {
    return new FutureEither(this.fe.map((e) => e.map(f)))
  }

  mapF<U>(f: (r: R) => Future<U>): FutureEither<L, U> {
    return new FutureEither(this.fe.flatMap((e) => e.mapF(f)))
  }

  mapE<U>(f: (r: R) => Either<L, U>): FutureEither<L, U> {
    return new FutureEither(this.fe.map((e) => e.flatMap(f)))
  }

  mapLeft<U>(f: (l: L) => U): FutureEither<U, R> {
    return new FutureEither<U, R>(this.fe.map((e) => e.mapLeft(f)))
  }


  /**
   * If this successful future either is a left, call the function you give with
   * the contents, and return what the function returns
   * Otherwise returns this.
   */
  leftFlatMap<R2, U>(f: (v: L) => FutureEither<U, R>): FutureEither<U, R> {
    return new FutureEither(
      this.fe.flatMap((e) => e.mapLeftF((l) => f(l).value())).map(Either.flattenLeft)
    )
  }

  /**
   * If this successful future either is a right, call the function you give with
   * the contents, and return what the function returns with a widening of the L error type
   * Otherwise returns this.
   * This is the monadic bind.
   */
  flatMap<L2, U>(f: (r: R) => Future<Either<L2, U>>): FutureEither<L | L2, U>
  flatMap<L2, U>(f: (r: R) => FutureEither<L2, U>): FutureEither<L | L2, U>
  flatMap<L2, U>(f: (r: R) => FutureEither<L2, U> | Future<Either<L2, U>>): FutureEither<L | L2, U> {
    return new FutureEither(
      this.fe
        .flatMap((e) =>
          e.mapF((r) => {
            const result = f(r)

            if (result instanceof FutureEither) return result.value()

            return result
          })
        )
        .map(Either.flatten)
    )
  }

  // flatMapW<U, L2>(f: (v: R) => FutureEither<L2, U>): FutureEither<L | L2, U> {
  //   return new FutureEither(this.fe.flatMap(e => EitherUtil.rightFmap(e.map(r => f(r).value()))).map(EitherUtil.flattenEitherW))
  // }

  leftWiden<L2>(): FutureEither<L | L2, R> {
    return new FutureEither<L | L2, R>(this.fe.map((e) => e as Either<L | L2, R>))
  }

  match<U>(m: { Left: (l: L) => U; Right: (r: R) => U }): Future<U> {
    return this.fe.map((e) => e.match(m))
  }

  onLeft(f: (l: L) => void): FutureEither<L, R> {
    return new FutureEither(this.fe.map((e) => e.ifLeft(f)))
  }
}
