import { Vector2 } from "../src/Vector2";
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
