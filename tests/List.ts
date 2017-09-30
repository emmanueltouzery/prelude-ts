import { List } from "../src/List";
import { HashMap } from "../src/HashMap";
import { Option } from "../src/Option";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("List",
                 List.ofIterable,
                 List.of,
                 List.empty,
                 List.unfoldRight);

describe("List toString", () => {
        it("serializes to string correctly", () => assert.equal(
            "List(1, 2, 3)", List.of(1,2,3).toString()));
        it("serializes to string correctly - arrays & strings", () => assert.equal(
            "List([1,'a'])", List.of([1,'a']).toString()));
        it("serializes to string correctly - custom toString", () => assert.equal(
            "List({field1: hi, field2: 99})", List.of(new MyClass("hi", 99)).toString()));
});
