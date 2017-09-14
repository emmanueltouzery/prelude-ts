import { Stream } from "../src/Stream";
import { Vector } from "../src/Vector";
import { MyClass} from "./SampleData";
import * as assert from 'assert'

describe("Stream basics", () => {
    it("creates a continually constant value", () => assert.deepEqual(
        [1,1,1,1], Stream.continually(() => 1).take(4).toArray()));
    it("iterates from a seed", () => assert.deepEqual(
        [1,2,4,8], Stream.iterate(1, x => x*2).take(4).toArray()));
    it("supports iterator", () => {
        let total = 0;
        const iterator = Stream.iterate(1,x=>x*2).take(3)[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            total += curItem.value;
            curItem = iterator.next();
        }
        assert.equal(7, total);
    });
    it("converts to vector", () => assert.ok(
        Vector.of(1,2,3).equals(Stream.iterate(1, x => x+1).take(3).toVector())));
    it("implements takeWhile correctly", () => assert.deepEqual(
        [1,2,3], Stream.iterate(1, x=>x+1).takeWhile(x=>x<4).toArray()));
    it("maps correctly", () => assert.deepEqual(
        [4,5,7,11], Stream.iterate(1, x => x*2).map(x => x+3).take(4).toArray()));
    it("filters correctly", () => assert.deepEqual(
        [8,32,64,128], Stream.iterate(1, x => x*2).filter(x => x>5 && (x<15 || x > 30)).take(4).toArray()));
    it("supports ofArray", () => assert.deepEqual(
        [1,2,3], Stream.ofArray([1,2,3]).toArray()));
    it("supports of", () => assert.deepEqual(
        [1,2,3], Stream.of(1,2,3).toArray()));
    it("supports append", () => assert.deepEqual(
        [1,2,3,4], Stream.of(1,2,3).append(4).toArray()));
    it("supports appendAll", () => assert.deepEqual(
        [1,2,3,4,5], Stream.of(1,2,3).appendAll([4,5]).toArray()));
    it("supports cycle", () => assert.deepEqual(
        [1,2,3,1,2,3,1,2], Stream.of(1,2,3).cycle().take(8).toArray()));
    it("supports appendStream", () => assert.deepEqual(
        [1,2,3,4,5,6], Stream.of(1,2,3).appendStream(Stream.of(4,5,6)).toArray()));
    it("supports flatMap", () => assert.deepEqual(
        [1,2,3,4,5,6], Stream.of(1,4).flatMap(x => Stream.of(x,x+1,x+2)).toArray()));
});

describe("Vector Value tests", () => {
    it("serializes to string correctly", () => assert.equal(
        "[1, 2, 3]", Stream.of(1,2,3).toString()));
    it("serializes to string correctly - arrays & strings", () => assert.equal(
        "[[1,'a']]", Stream.ofStruct([1,'a']).toString()));
    it("serializes to string correctly - custom toString", () => assert.equal(
        "[{field1: hi, field2: 99}]", Stream.of(new MyClass("hi", 99)).toString()));
    it("has non-obviously-broken equals", () => assert.ok(
        Stream.of("a","b","c").equals(Stream.of("a", "b", "c"))));
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, Stream.of(1).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, Stream.of(1).equals(<any>null)));
    it("is strict with equality", () => assert.ok(
        !Stream.of(1,2).equals(Stream.of(1, <any>undefined))));
});
