import { Vector } from "../src/Vector";
import { HashMap } from "../src/HashMap";
import { Option } from "../src/Option";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Vector",
                 Vector.ofIterable,
                 Vector.of,
                 Vector.empty,
                 Vector.unfoldRight);

describe("Vector toString", () => {
        it("serializes to string correctly", () => assert.equal(
            "Vector(1, 2, 3)", Vector.of(1,2,3).toString()));
        it("serializes to string correctly - arrays & strings", () => assert.equal(
            "Vector([1,'a'])", Vector.of([1,'a']).toString()));
        it("serializes to string correctly - custom toString", () => assert.equal(
            "Vector({field1: hi, field2: 99})", Vector.of(new MyClass("hi", 99)).toString()));
});
