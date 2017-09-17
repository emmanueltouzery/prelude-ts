import { Vector } from "../src/Vector";
import { HashMap } from "../src/HashMap";
import { Option } from "../src/Option";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Vector",
                 Vector.ofIterable,
                 Vector.ofStruct,
                 Vector.empty);

describe("Vector manipulation", () => {
    it("appends correctly", () => assert.ok(
        Vector.ofIterable<number>([1,2,3,4]).equals(Vector.of(1,2,3).append(4))));
    it("appendAll works", () => assert.ok(
        Vector.of(1,2,3,4).equals(Vector.of(1,2).appendAll(Vector.of(3,4)))));
    it("map works", () => assert.ok(
        Vector.of(5,6,7).equals(Vector.of(1,2,3).map(x=>x+4))));
    it("sorting works", () => assert.ok(
        Vector.of(4,3,2,1)
            .equals(Vector.of(1,2,3,4).sortBy((x,y) => y-x))));
    it("flatMap works", () => assert.ok(
        Vector.of(1,2,2,3,3,3,4,4,4,4)
            .equals(Vector.of(1,2,3,4).flatMap(
                x => Vector.ofIterable(Array.from(Array(x), ()=>x))))));
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
    it("zips with a stream", () => assert.deepEqual(
        [["a",0], ["b",1]], Vector.of("a","b").zip(Stream.iterate(0,x=>x+1)).toArray()));
    it("richer example", () => assert.deepEqual(
        [[1,"a"],[2,"b"]], Vector.of(1,2,3)
            .zip(["a", "b", "c"]).takeWhile(([k,v]) => k<3).toArray()));
    it("computes the length correctly", () => assert.equal(
        3, Vector.of(1,2,3).length()));
    it("computes the length of the empty vector correctly", () => assert.equal(
        0, Vector.empty().length()));
});

describe("Vector value extraction", () => {
    it("filter works", () => assert.ok(
        Vector.of(2,4)
            .equals(Vector.of(1,2,3,4).filter(x => x%2 === 0))));
    it("filter works with prepend", () => assert.ok(
        Vector.of(2,4)
            .equals(Vector.of(3,4).prepend(2).prepend(1).filter(x => x%2 === 0))));
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
        Vector.empty().tail().isNone()));
    it("correctly gets the tail of a simple vector", () => assert.ok(
        Vector.of(2,3,4).equals(Vector.of(1,2,3,4).tail().getOrThrow())));
    it("correctly gets the tail of a vector after prepend", () => assert.ok(
        Vector.of(2,3,4).equals(Vector.of(2,3,4).prepend(1).tail().getOrThrow())));
    it("correctly reverses", () => assert.deepEqual(
        [3,2,1], Vector.of(1,2,3).reverse().toArray()));
    it("correctly reverses the empty vector", () => assert.deepEqual(
        [], Vector.empty().reverse().toArray()));
    it("correctly reverses also after prepend", () => assert.deepEqual(
        [3,2,1], Vector.of(2,3).prepend(1).reverse().toArray()));
    it("correctly partitions also after prepend", () => assert.deepEqual(
        [[1,3,5,7],[2,4,6,8]],
        Vector.of(2,3,4,5,6,7,8).prepend(1).partition(x => x%2!==0)
            .map(v => v.toArray())));
    
});

describe("Vector iteration", () => {
    it("transforms to map", () => {
        assert.ok(HashMap.empty<number,string>().put(1,"ok").put(2, "bad")
                  .equals(<HashMap<number,string>>Vector.ofStruct<[number,string]>([1,"ok"],[2,"bad"]).toMap(x => x)));
    });
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
