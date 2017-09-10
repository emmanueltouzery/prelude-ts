import { Stream } from "../src/Stream";
import { Vector } from "../src/Vector";
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
});
