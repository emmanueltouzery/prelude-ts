import { fail } from 'assert'
import { assertThat } from 'mismatched'
import { Either, Future, FutureEither } from '../src'

describe('FutureEither', () => {
  describe('map', () => {
    it('preserves left', async () => {
      const input = FutureEither.ofEither(Either.left(true))
      const output = await input.map((_) => Either.right(false)).value()
      output.match({
        Left: (l) => assertThat(l).is(true),
        Right: () => fail()
      })
    })

    it('transforms right', async () => {
      const input = FutureEither.ofEither(Either.right(1))
      const output = await input.map((r) => 2).value()
      output.match({
        Left: () => fail(),
        Right: (r) => assertThat(r).is(2),
      })
    })
  })

  describe('mapLeft', () => {
    it('transforms left', async () => {
      const input = FutureEither.ofEither(Either.left(1))
      const output = await input.mapLeft((l) => 2).value()
      output.match({
        Left: (l) => assertThat(l).is(2),
        Right: () => fail(),
      })
    })

    it('preserves right', async () => {
      const input = FutureEither.ofEither(Either.right(true))
      const output = await input.mapLeft((r) => false).value()
      output.match({
        Left: () => fail(),
        Right: (r) => assertThat(r).is(true),
      })
    })
  })

  describe('flatMap', () => {
    it('preserves left', async () => {
      const input = FutureEither.ofEither(Either.left(true))
      const output = await input.flatMap((r) => FutureEither.ofEither(Either.right(1)))
      output.match({
        Left: (l) => assertThat(l).is(true),
        Right: () => fail(),
      })
    })

    it('preserves outer failed future', async () => {
      const failMsg = 'outer failed'
      const input = FutureEither.of(Future.failed(new Error(failMsg)))
      const output = input
        .flatMap((r) => FutureEither.ofEither(Either.right(2)))
        .value()
        .toPromise()
      await assertThat(output).catchesError(failMsg)
    })

    it('preserves inner failed future', async () => {
      const failMsg = 'inner failed'
      const input = FutureEither.ofEither(Either.right(1))
      const output = input
        .flatMap((r) => FutureEither.of(Future.failed(new Error(failMsg))))
        .value()
        .toPromise()
      await assertThat(output).catchesError(failMsg)
    })

    it('transforms right', async () => {
      const input = FutureEither.ofEither(Either.right(1))
      const output = await input.flatMap((r) => FutureEither.ofEither(Either.right(2))).value()
      output.match({
        Left: () => fail(),
        Right: (r) => assertThat(r).is(2),
      })
    })
  })

  describe('match', () => {
    it('transforms left', async () => {
      const input = FutureEither.ofEither(Either.left(1))
      const output = await input.match({
        Left: (l) => 2,
        Right: (_) => 200,
      })

      assertThat(output).is(2)
    })

    it('transforms right', async () => {
      const input = FutureEither.ofEither(Either.right(1))
      const output = await input.match({
        Left: (_) => 200,
        Right: (_) => 2,
      })

      assertThat(output).is(2)
    })

    it('preserves failed future', async () => {
      const input = FutureEither.of(Future.failed(new Error('failed')))
      const output = input
        .match({
          Left: (_) => 200,
          Right: (_) => 2,
        })
        .toPromise()

      await assertThat(output).catchesError('failed')
    })
  })
})
