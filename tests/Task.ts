import { Task } from "../src/Task"
import * as fs from 'fs'
import * as assert from 'assert'

async function ensureFailedWithValue<T>(val: any, promise: Promise<T>) {
  let v;
  try {
    v = await promise
    assert.ok(false)
  } catch (err) {
    assert.deepEqual(val, err)
  }
}

describe("Task.of", () => {
  it("properly wraps successful promises with of", async () => {
    assert.deepEqual(5, await Task.of(() => new Promise((a, _r) => a(5))))
  })

  it("properly wraps failed promises with of", async () => {
    // shows the need for future.catch!?
    // await Task.of(new Promise((a,r) => r(5)))
    return ensureFailedWithValue(5, Task.of(() => Promise.reject(5)).toPromise())
  })
})

describe("Task.ofCallback", () => {
  it("properly operates with fs.readFile", async () => {
    const readme = await Task.ofCallback<string>(
      cb => fs.readFile(__dirname + "/../../README.md", "utf-8", cb))
    // the readme should be long at least 1000 bytes
    assert.ok(readme.length > 1000)
  })
  it("properly operates with fs.readFile in case of errors", async () => {
    try {
      const passwd = await Task.ofCallback<string>(
        cb => fs.readFile(__dirname + "/../../README.mddd", "utf-8", cb))
      assert.ok(false) // should not make it here
    } catch (err: any) {
      // file does not exist
      assert.equal('ENOENT', err.code)
    }
  })
})

describe("Task basics", () => {
  it("works when triggered", async () => {
    let i = 0
    await Task.ofPromiseCtor(done => done(++i))
    assert.deepEqual(1, i)
  })

  it("works when failed", async () => {
    let i = 0
    try {
      await Task.ofPromiseCtor((done, err) => err(++i))
    } catch (err) {
      assert.deepEqual(1, err)
      assert.deepEqual(1, i)
    }
  })

  it("handles a throw in map", async () => {
    // i'm not crazy about this behaviour (not really functor-law like)
    // but it's JS we're dealing with in the end :-(
    return ensureFailedWithValue(
      "oops", Task.done(5).map<number>(x => { throw "oops" }).toPromise())
  })

  it("handles a throw in flatMap", async () => {
    // i'm not crazy about this behaviour (not really functor-law like)
    // but it's JS we're dealing with in the end :-(
    return ensureFailedWithValue(
      "oops", Task.done(5).flatMap<number>(x => { throw "oops" }).toPromise())
  })

})

describe("Task.map*", () => {
  it("map triggers and works", async () => {
    let i = 0
    const f = Task.ofPromiseCtor<number>(done => done(++i)).map(x => x * 2)
    assert.deepEqual(0, i)
    assert.deepEqual(2, await f)
  })

  it("map doesn't flatten promises", async () => {
    let i = 0
    const f = Task.ofPromiseCtor<number>(done => done(5))
      .map(x => new Promise((r, f) => r(x + 1)))
    assert.ok((<any>await f).then !== null) // should get a promise out
  })

  it("map doesn't flatten futures", async () => {
    let i = 0
    const f = Task.done(5).map(x => Task.ofPromiseCtor(done => done(x + 1)))
    assert.ok((<any>await f).getPromise !== null) // should get a future out
  })

  it("flatMap does flatten futures", async () => {
    const f = Task.done(5).flatMap(x => Task.ofPromiseCtor(done => done(x + 1)))
    assert.ok((<any>await f).getPromise === undefined) // shouldn't get a future out
    assert.deepEqual(6, await f)
  })
})

describe("Task.liftA*", () => {
  it("applies liftAp properly", async () => {
    const fn = (x: { a: number, b: number }) => ({ a: x.a + 1, b: x.b - 2 })
    const computationPromise =
      Task.liftAp(fn)({ a: Task.done(5), b: Task.ofPromiseCtor(done => done(12)) })
    assert.deepEqual({ a: 6, b: 10 }, await computationPromise)
  })

  it("applies liftA2 properly", async () => {
    const fn = (a: number, b: number) => ({ a: a + 1, b: b - 2 })
    const computationPromise =
      Task.liftA2(fn)(Task.done(5), Task.ofPromiseCtor(done => done(12)))
    assert.deepEqual({ a: 6, b: 10 }, await computationPromise)
  })

})

describe("Task.lift", () => {
  it("lifts a simple promise", async () => {
    const fn = (x: number) => Promise.resolve(x + 1)
    const fn2 = Task.lift(fn)
    assert.equal(5, await fn2(4))
  })

  it("lifts a failing promise", async () => {
    const fn = (x: number) => Promise.reject(x + 1)
    const fn2 = Task.lift(fn)
    try {
      await fn2(4)
      assert.ok(false)
    } catch (ex) {
      assert.equal(5, ex)
    }

  })
})

describe("Task.traverse", () => {
  it("traverses properly", async () => {
    assert.deepEqual([1, 2, 3], await Task.traverse([1, 2, 3], Task.done).map(v => v.toArray()))
  })
  it("traverses properly in case of failure", async () => {
    return ensureFailedWithValue("3", Task.traverse(
      [1, 2, 3], x => Task.ofPromiseCtor(() => { if (x < 3) { x } else { throw x } }))
      .map(v => v.toArray()).toPromise())
  })
})

describe("Task.sequence", () => {
  it("sequences properly", async () => {
    assert.deepEqual([1, 2, 3], await Task.sequence(
      [Task.done(1), Task.done(2), Task.done(3)]).map(v => v.toArray()))
  })
})

describe("Task.firstCompletedOf", () => {
  // TODO in these tests check the elapsed time is short!
  it("returns the one finishing the first", async () => {
    assert.deepEqual(1, await Task.firstCompletedOf(
      [Task.ofPromiseCtor(done => setTimeout(done, 100, 3)), Task.done(1)]))
  })
})

describe("Task do notation*", () => {
  it("do notation creates a successful future", async () => {
    const f1 = Task.done(1)
    const f2 = Task.done(2)

    const f3 = Task.of(async () => {
      const v1 = await f1
      const v2 = await f2
      return v1 + v2
    })

    const v3 = await f3
    assert.deepEqual(3, v3)
  })

})
