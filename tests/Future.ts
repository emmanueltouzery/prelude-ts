import { Future } from "../src/Future";
import { Vector } from "../src/Vector";
import { Option } from "../src/Option";
import { Either } from "../src/Either";
import * as fs from 'fs';
import * as assert from 'assert';

async function ensureFailedWithValue<T>(val: any, promise:Promise<T>) {
    let v;
    try {
        v = await promise;
        assert.ok(false);
    } catch (err) {
        assert.deepEqual(val, err);
    }
}

describe("Future.of", () => {
    it("properly wraps successful promises with of", async () => {
        assert.deepEqual(5, await Future.of(new Promise((a,r) => a(5))));
    });
    it("properly wraps failed promises with of", async () => {
        // shows the need for future.catch!?
        // await Future.of(new Promise((a,r) => r(5)))
        return ensureFailedWithValue(5, Future.of(Promise.reject(5)).toPromise());
    });
});
describe("Future.ofCallback (these tests will fail on windows)", () => {
    it("properly operates with fs.readFile", async () => {
        const passwd = await Future.ofCallback<string>(
            cb => fs.readFile("/etc/passwd", "utf-8", cb));
        // the first line of /etc/passwd should contain 6 ':' characters
        assert.equal(6, Vector.ofIterable(passwd.split("\n")[0])
                     .filter(c => c===':').length());
    });
    it("properly operates with fs.readFile in case of errors", async () => {
        try {
            const passwd = await Future.ofCallback<string>(
                cb => fs.readFile("/efdtc/pasdsswd", "utf-8", cb));
            assert.ok(false); // should not make it here
        } catch (err) {
            // file does not exist
            assert.equal('ENOENT', err.code);
        }
    });
});
describe("Future basics", () => {
    it("works when triggered", async () => {
        let i=0;
        await Future.ofPromiseCtor(done=>done(++i));
        assert.deepEqual(1, i);
    });
    it("works when failed", async () => {
        let i=0;
        try {
            await Future.ofPromiseCtor((done,err)=>err(++i));
        } catch (err) {
            assert.deepEqual(1, err);
            assert.deepEqual(1, i);
        }
    });
    it("handles errors", async () => {
        let i = 0;
        let msg:Error|null = null;
        Future.ofPromiseCtor(done=>{throw "oops"})
            .map(x => ++i)
            .onFailure(err => msg = err)
            .toPromise().then(
                success => assert.ok(false),
                failed => {
                    assert.deepEqual("oops", failed);
                    assert.deepEqual(0, i);
                    assert.deepEqual("oops", msg);
                });
    });
    it("handles a throw in map", async () => {
        // i'm not crazy about this behaviour (not really functor-law like)
        // but it's JS we're dealing with in the end :-(
        return ensureFailedWithValue(
            "oops", Future.ok(5).map<number>(x => {throw "oops"}).toPromise());
    });
    it("handles a throw in flatMap", async () => {
        // i'm not crazy about this behaviour (not really functor-law like)
        // but it's JS we're dealing with in the end :-(
        return ensureFailedWithValue(
            "oops", Future.ok(5).flatMap<number>(x => {throw "oops"}).toPromise());
    });
    it("called only once if triggered twice", async () => {
        let i=0;
        const f = Future.ofPromiseCtor(done=>{++i; done(1);});
        await f;
        assert.deepEqual(1, i);
        await f;
        assert.deepEqual(1, i);
    });
});
describe("Future.map*", () => {
    it("map triggers and works", async () => {
        let i=0;
        const f = Future.ofPromiseCtor<number>(done=>done(++i)).map(x => x*2);
        assert.deepEqual(1, i);
        assert.deepEqual(2, await f);
    });
    it("map doesn't flatten promises", async () => {
        let i=0;
        const f = Future.ofPromiseCtor<number>(done=>done(5))
            .map(x => new Promise((r,f)=>r(x+1)));
        assert.ok((<any>await f).then !== null); // should get a promise out
    });
    it("map doesn't flatten futures", async () => {
        let i=0;
        const f = Future.ok(5).map(x => Future.ofPromiseCtor(done=>done(x+1)));
        assert.ok((<any>await f).getPromise !== null); // should get a future out
    });
    it("mapFailure works", async () => {
        return ensureFailedWithValue(
            "SORRY", Future.failed("sorry").mapFailure(err => err.toUpperCase()).toPromise());
    });
    it("mapFailure is a nop on successful futures", async () => {
        assert.deepEqual(5, await Future.ok(5).mapFailure(_ => "oops"));
    });
    it("flatMap does flatten futures", async () => {
        const f = Future.ok(5).flatMap(x => Future.ofPromiseCtor(done=>done(x+1)));
        assert.ok((<any>await f).getPromise === undefined); // shouldn't get a future out
        assert.deepEqual(6, await f);
    });
});
describe("Future.liftA*", () => {
    it("applies liftAp properly", async () => {
        const fn = (x:{a:number,b:number}) => ({a:x.a+1,b:x.b-2});
        const computationPromise =
            Future.liftAp(fn)({a:Future.ok(5), b:Future.ofPromiseCtor(done=>done(12))});
        assert.deepEqual({a:6,b:10}, await computationPromise);
    });
    it("applies liftAp properly in case of failure", async () => {
        const fn = (x:{a:number,b:number}) => ({a:x.a+1,b:x.b-2});
        const computationPromise =
            Future.liftAp(fn)({a:Future.ok(5), b:Future.failed("sorry")});
        return ensureFailedWithValue("sorry", computationPromise.toPromise());
    });
    it("applies liftA2 properly", async () => {
        const fn = (a:number,b:number) => ({a:a+1,b:b-2});
        const computationPromise =
            Future.liftA2(fn)(Future.ok(5), Future.ofPromiseCtor(done=>done(12)));
        assert.deepEqual({a:6,b:10}, await computationPromise);
    });
    it("applies liftA2 properly in case of failure", async () => {
        const fn = (a:number,b:number) => ({a:a+1,b:b-2});
        const computationPromise =
            Future.liftA2(fn)(Future.ok(5), Future.failed("sorry"));
        return ensureFailedWithValue("sorry", computationPromise.toPromise());
    });
});
describe("Future.traverse", () => {
    it("traverses properly", async () => {
        assert.deepEqual([1,2,3], await Future.traverse([1,2,3], Future.ok).map(v => v.toArray()));
    });
    it("traverses properly in case of failure", async () => {
        return ensureFailedWithValue("3", Future.traverse(
            [1, 2, 3], x => Future.ofPromiseCtor(() => { if (x < 3) { x } else { throw x; } }))
            .map(v => v.toArray()).toPromise());
    });
});
describe("Future.sequence", () => {
    it("sequences properly", async () => {
        assert.deepEqual([1,2,3], await Future.sequence(
            [Future.ok(1),Future.ok(2),Future.ok(3)]).map(v => v.toArray()));
    });
    it("sequences properly in case of failure", async () => {
        return ensureFailedWithValue("3", Future.sequence(
            [Future.ok(1), Future.ok(2), Future.failed("3")])
            .map(v => v.toArray()).toPromise());
    });
});
describe("Future.firstCompletedOf", () => {
    // TODO in these tests check the elapsed time is short!
    it("returns the one finishing the first", async () => {
        assert.deepEqual(1, await Future.firstCompletedOf(
            [Future.ofPromiseCtor(done=>setTimeout(done,100,3)), Future.ok(1)]));
    });
    it("returns the one finishing even if it's a failure", async () => {
        return ensureFailedWithValue("3", Future.firstCompletedOf(
            [Future.ofPromiseCtor(done=>setTimeout(done, 100, 1)), Future.failed("3")]).toPromise());
    });
});
describe("Future.firstSuccessfulOf", () => {
    // TODO in these tests check the elapsed time is short!
    it("returns the one finishing the first", async () => {
        assert.deepEqual(1, await Future.firstSuccessfulOf(
            [Future.ofPromiseCtor(done=>setTimeout(done,100,3)), Future.ok(1)]));
    });
    it("returns the one finishing slower if the other one is a failure", async () => {
        const v = await Future.firstSuccessfulOf(
            [Future.ofPromiseCtor(done=>setTimeout(done, 20, 1)), Future.failed("3")]).toPromise();
       assert.equal(1, v);
    });
});
describe("Future.filter", () => {
    it("is a nop if no filter to do", async () => {
        assert.deepEqual(5, await Future.ok(5).filter(x => x >= 2, v => "value was " + v));
    });
    it("is a nop if the future was failed", async () => {
        return ensureFailedWithValue(
            "already bad", Future.failed("already bad").filter(x => x >= 2, v => "value was " + v).toPromise());
    });
    it("does filter if it applies", async () => {
        return ensureFailedWithValue(
            "value was 1", Future.ok(1).filter(x => x >= 2, v => "value was " + v).toPromise());
    });
});
describe("Future.recoverWith", () => {
    it("is a nop if the first promise succeeds, even if it's slower", async () => {
        assert.deepEqual(1, await Future.ofPromiseCtor(done => setTimeout(done, 50, 1))
                         .recoverWith(_=>Future.ok(2)));
    });
    it("falls back to the second promise in case the first one fails", async () => {
        assert.deepEqual("oops", await Future.failed("oops").recoverWith(Future.ok));
    });
    it("falls back to the second promise in case both fail", async () => {
        return ensureFailedWithValue(
            "still not",
            Future.failed("oops")
                .recoverWith(_ => Future.failed("still not")).toPromise());
    });
});
describe("Future.find", () => {
    it("returns the first future if it matches", async () => {
        const actual = await Future.find([Future.ok(2)], x => x>=0);
        assert.ok(Option.of(2).equals(actual));
    });
    it("returns nothing if no future matches", async () => {
        const actual = await Future.find([Future.ok(-1)], x => x>=0);
        assert.ok(Option.none().equals(actual));
    });
    it("returns nothing if all futures fail", async () => {
        const actual = await Future.find([Future.failed<number>(-1)], x => x>=0);
        assert.ok(Option.none().equals(actual));
    });
    it("returns the first matching", async () => {
        const actual = await Future.find([
            Future.ok(-1),
            Future.failed<number>(5),
            Future.ok(-3),
            Future.ok(6),
            Future.ok(7)], x => x>=0);
        assert.ok(Option.of(6).equals(actual));
    });
    it("doesn't wait if there's a success", async () => {
        let waited = false;
        const actual = await Future.find([
            Future.ok(-1),
            Future.failed<number>(5),
            Future.ok(-3),
            Future.ofPromiseCtor<number>(
                done => setTimeout(() => {waited = true; done(6);}, 60)),
            Future.ok(7)], x => x>=0);
        assert.ok(Option.of(7).equals(actual));
        assert.ok(!waited);
    });
});
describe("Future.on*", () => {
    it("calls onSuccess when it should", async () => {
        let v = 0;
        await Future.ok(5)
            .onSuccess(x => v = x);
        assert.deepEqual(5, v);
    });
    it("doesn't calls onSuccess when it shouldn't", async () => {
        let v = 0;
        let failed = false;
        try {
            await Future.failed<number>(5)
                .onSuccess(x => v = x);
        } catch {
            failed = true;
        }
        assert.ok(failed);
        assert.deepEqual(0, v);
    });
    it("doesn't call onFailure when it shouldn't", async () => {
        let v = 0;
        await Future.ok(5)
            .onFailure(x => v = x);
        assert.deepEqual(0, v);
    });
    it("calls onFailure when it should", async () => {
        let v = 0;
        let failed = false;
        try {
            await Future.failed(5)
                .onFailure(x => v = x);
        } catch {
            failed = true;
        }
        assert.ok(failed);
        assert.deepEqual(5, v);
    });
    it("calls onComplete on success", async () => {
        let v:any = undefined;
        await Future.ok(5)
            .onComplete(x => v = x);
        assert.ok(Either.right(5).equals(v));
    });
    it("calls onComplete on failure", async () => {
        let v:any = undefined;
        try {
            await Future.failed(5)
                .onComplete(x => v = x);
        } catch { }
        assert.ok(Either.left(5).equals(v));
    });
});

describe("Future do notation*", () => {
    it("do notation creates a successful future", async () => {
        const f1 = Future.ok(1)
        const f2 = Future.ok(2)
      
        const f3 = Future.do(async () => {
            const v1 = await f1
            const v2 = await f2
            return v1 + v2
        })
      
        const v3 = await f3
        assert.deepEqual(3, v3);
    });

    it("do notation creates a failable future", async () => {
        const f1 = Future.ok(1)
        const f2 = Future.failed<number>("bad number")
        
        const f3 = Future.do(async () => {
            const v1 = await f1
            const v2 = await f2
            return v1 + v2
        })

        try {
          const v3 = await f3
          assert.fail("Error: Future must fail")

        } catch (error) {
          assert.deepEqual(error, "bad number");
        }
    });
});
