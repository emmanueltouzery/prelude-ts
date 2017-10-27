import { Vector2 } from "../src/Vector2";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Vector2",
                 Vector2.ofIterable,
                 Vector2.of,
                 Vector2.empty,
                 Vector2.unfoldRight);


describe("Vector2 toString", () => {
    it("serializes to string correctly", () => assert.equal(
        "Vector2(1, 2, 3)", Vector2.of(1,2,3).toString()));
    it("serializes to string correctly - arrays & strings", () => assert.equal(
        "Vector2([1,'a'])", Vector2.of([1,'a']).toString()));
    it("serializes to string correctly - custom toString", () => assert.equal(
        "Vector2({field1: hi, field2: 99})", Vector2.of(new MyClass("hi", 99)).toString()));
});

describe("Vector2 extra methods", () => {
    it("handles init correctly on a non-empty vector2", () => assert.deepEqual(
        [1,2,3], Vector2.of(1,2,3,4).init().toArray()));
    it("handles init correctly on an empty vector2", () => assert.deepEqual(
        [], Vector2.empty<number>().init().toArray()));
    it("handles init correctly on a single-element vector2", () => assert.deepEqual(
        [], Vector2.of(1).init().toArray()));
});

// that's needed due to node's assert.deepEqual
// saying that new Array(2) is NOT the same as
// [undefined, undefined].
// (empty vs undefined)
// => forcing undefined
function arraySetUndefineds(ar:any[]) {
    for (let i=0;i<ar.length;i++) {
        if (Array.isArray(ar[i])) {
            arraySetUndefineds(ar[i]);
        }
        if (typeof ar[i] === "undefined") {
            ar[i] = undefined;
        }
    }
    return ar;
}

// check that the internal structure of the vector trie
// is correct after take, that means also root killing and so on.
describe("take() implementation", () => {
    it("handles simple cases correctly", () => assert.deepEqual(
        arraySetUndefineds((<any>Vector2.of(1,2,3))._contents),
        (<any>Vector2.of(1,2,3,4,5,6).take(3))._contents));
    it("handles root killing correctly", () => assert.deepEqual(
        arraySetUndefineds((<any>Vector2.of(1,2,3))._contents),
        (<any>Vector2.ofIterable(Stream.iterate(1,i=>i+1).take(40)).take(3))._contents));
});
