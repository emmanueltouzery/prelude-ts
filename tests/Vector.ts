import { Vector } from "../src/Vector";
import { HashMap } from "../src/HashMap";
import { Option } from "../src/Option";
import * as assert from 'assert'

describe("Vector creation", () => {
    it("creates from a JS array", () => assert.deepEqual(
        ["a","b", "c"],
        Vector.ofIterable<string>(["a","b","c"]).toArray()));
    it("creates from a spread", () => assert.deepEqual(
        ["a","b", "c"],
        Vector.of("a","b","c").toArray()));
    it("creates also with nulls", () => assert.deepEqual(
        [1, null, 2], Vector.of(1, null, 2).toArray()));
});

describe("Vector manipulation", () => {
    it("appends correctly", () => assert.ok(
        Vector.ofIterable<number>([1,2,3,4]).equals(Vector.of(1,2,3).append(4))));
    it("appendAll works", () => assert.ok(
        Vector.of(1,2,3,4).equals(Vector.of(1,2).appendAll(Vector.of(3,4)))));
    it("map works", () => assert.ok(
        Vector.of(5,6,7).equals(Vector.of(1,2,3).map(x=>x+4))));
    it("groupBy works", () => assert.ok(
        HashMap.empty().put(0, Vector.of(2,4)).put(1, Vector.of(1,3))
            .equals(Vector.of(1,2,3,4).groupBy(x => x%2))));
    it("sorting works", () => assert.ok(
        Vector.of(4,3,2,1)
            .equals(Vector.of(1,2,3,4).sortBy((x,y) => y-x))));
    it("flatMap works", () => assert.ok(
        Vector.of(1,2,2,3,3,3,4,4,4,4)
            .equals(Vector.of(1,2,3,4).flatMap(
                x => Vector.ofIterable(Array.from(Array(x), ()=>x))))));
    it("mkString works", () => assert.equal(
        "1, 2, 3", Vector.of(1,2,3).mkString(", ")));
    it("correctly drops n items", () => assert.deepEqual(
        [4,5,6], Vector.of(1,2,3,4,5,6).drop(3).toArray()));
    it("returns an empty vector when dropping too much", () => assert.deepEqual(
        [], Vector.of(1,2).drop(3).toArray()));
    it("correctly drops right n items", () => assert.deepEqual(
        [1,2,3,4], Vector.of(1,2,3,4,5,6).dropRight(2).toArray()));
    it("returns an empty vector when dropping right too much", () => assert.deepEqual(
        [], Vector.of(1,2).dropRight(3).toArray()));
    it("zips two vectors", () => assert.deepEqual(
        [[1,"a"], [2,"b"]], Vector.of(1,2,3).zip(["a","b"]).toArray()));
});

describe("Vector value extraction", () => {
    it("filter works", () => assert.ok(
        Vector.of(2,4)
            .equals(Vector.of(1,2,3,4).filter(x => x%2 === 0))));
    it("get finds when present", () => assert.ok(
        Option.of(5).equals(Vector.of(1,2,3,4,5,6).get(4))));
    it("get finds when present after prepend", () => assert.ok(
        Option.of(5).equals(Vector.of(2,3,4,5,6).prepend(1).get(4))));
    it("get doesn't find when vector too short", () => assert.ok(
        Option.none().equals(Vector.of(1,2,3).get(4))));
    it("get doesn't find when negative index", () => assert.ok(
        Option.none().equals(Vector.of(1,2,3).get(-1))));
    it("correctly dropsWhile", () => assert.deepEqual(
        [4,5,6], Vector.of(1,2,3,4,5,6).dropWhile(x=>x<4).toArray()));
    it("correctly gets the last element", () => assert.equal(
        5, Vector.of(1,2,3,4,5).last().getOrUndefined()));
    it("correctly gets the last element of an empty vector", () => assert.ok(
        Vector.empty().last().isNone()));
    it("correctly gets the last element also after prepend", () => assert.equal(
        5, Vector.of(4,5).prependAll(Vector.of(1,2,3)).last().getOrUndefined()));
    it("correctly gets the first element", () => assert.equal(
        1, Vector.of(1,2,3,4,5).head().getOrUndefined()));
    it("correctly gets the first element of an empty vector", () => assert.ok(
        Vector.empty().head().isNone()));
    it("correctly gets the first element also after prepend", () => assert.equal(
        1, Vector.of(4,5).prependAll(Vector.of(1,2,3)).head().getOrUndefined()));
    it("correctly gets the tail of the empty vector", () => assert.ok(
        Vector.empty().equals(Vector.empty().tail())));
    it("correctly gets the tail of a simple vector", () => assert.ok(
        Vector.of(2,3,4).equals(Vector.of(1,2,3,4).tail())));
    it("correctly gets the tail of a vector after prepend", () => assert.ok(
        Vector.of(2,3,4).equals(Vector.of(2,3,4).prepend(1).tail())));
});

describe("Prepend", () => {
    const basic = Vector.of(1,2,3,4);
    const prepended = Vector.of(2,3,4).prepend(1);
    it("prepends correctly", () => assert.ok(basic.equals(prepended)));
    it("converts to array correctly", () => assert.deepEqual(
        basic.toArray(), prepended.toArray()));
    it("appends correctly after prepend", () => assert.ok(
        basic.append(5).equals(prepended.append(5))));
    it("appendsAll correctly after prepend", () => assert.ok(
        basic.appendAll(Vector.of(5,6)).equals(prepended.appendAll(Vector.of(5,6)))));
    it("converts to string correctly after prepend", () => assert.equal(
        basic.toString(), prepended.toString()));
    it("prependsAll correctly", () => assert.deepEqual(
        [1,2,3,4,5], Vector.of(4,5).prependAll(Vector.of(1,2,3)).toArray()));
});

describe("Vector iteration", () => {
    it("calls forEach correctly", () => {
        let ar: number[] = [];
        Vector.of(1,2,3).forEach((v:number) => ar.push(v));
        assert.deepEqual([1,2,3], ar);
    });
    it("finds items", () => 
       Vector.of(1,2,3).find(x => x >= 2).contains(2));
    it("doesn't find if the predicate doesn't match", () => 
       Vector.of(1,2,3).find(x => x >= 4).isNone());
    it("foldsLeft correctly", () => assert.equal(
        "cba!",
        Vector.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs)));
    it("foldsRight correctly", () => assert.equal(
        "!cba",
        Vector.of("a", "b", "c").foldRight("!", (x,xs) => xs+x)));
    it("transforms to map", () => {
        assert.ok(HashMap.empty<number,string>().put(1,"ok").put(2, "bad")
                  .equals(<HashMap<number,string>>Vector.ofStruct<[number,string]>([1,"ok"],[2,"bad"]).toMap(x => x)));
    });
    it("supports iterator", () => {
        let total = 0;
        const iterator = Vector.of(1,2,3)[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            total += curItem.value;
            curItem = iterator.next();
        }
        assert.equal(6, total);
    })
    // can get for..of in tests by changing the target to es6,
    // or enabling downlevelIteration in the tsconfig.json,
    // not doing that for now.
    // it("supports for of", () => {
    //     let total = 0;
    //     for (const x of Vector.of(1,2,3)) {
    //         total += x;
    //     }
    //     assert.equal(6, total);
    // })
})

describe("Vector Value tests", () => {
    it("serializes to string correctly", () => assert.equal(
        "[1, 2, 3]", Vector.of(1,2,3).toString()));
    it("has non-obviously-broken equals", () => assert.ok(
        Vector.of("a","b","c").equals(Vector.of("a", "b", "c"))));
})
