import { LinkedList, ConsLinkedList } from "../src/LinkedList";
import { typeOf } from "../src/Comparison";
import { HashMap } from "../src/HashMap";
import { Option } from "../src/Option";
import { Stream } from "../src/Stream";
import { MyClass } from "./SampleData";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("LinkedList",
                 LinkedList.ofIterable,
                 LinkedList.of,
                 LinkedList.empty,
                 LinkedList.unfoldRight,
                 "ConsLinkedList");

describe("LinkedList basics", () => {
    // unfortunately this doesn't work for now (does work on Vector & HashSet)
    // 
    // it("correctly infers the more precise type on allMatch in case of typeguard", () => {
    //     // just checking that this compiles. 'charAt' is available on strings not numbers.
    //     const v = LinkedList.of<string|number>("test","a");
    //     if (v.allMatch(typeOf("string"))) {
    //         v.single().getOrThrow().charAt(0);
    //     }
    // });
})

describe("LinkedList toString", () => {
    it("serializes to string correctly", () => assert.equal(
        "LinkedList(1, 2, 3)", LinkedList.of(1,2,3).toString()));
    it("serializes to string correctly - arrays & strings", () => assert.equal(
        "LinkedList([1,'a'])", LinkedList.of([1,'a']).toString()));
    it("serializes to string correctly - custom toString", () => assert.equal(
        "LinkedList({field1: hi, field2: 99})", LinkedList.of(new MyClass("hi", 99)).toString()));
    it("serializes to string correctly - plain map", () => assert.equal(
        "LinkedList({\"name\":\"hi\",\"age\":99})", LinkedList.of({name:"hi", age:99}).toString()));
    it("takes advantage of isEmpty", () => {
        const list = LinkedList.of(1,2,3);
        if (!list.isEmpty()) {
            list.head().get();
        }
    });
});

describe("static LinkedList.zip", () => {
    const r = LinkedList.zip<[number,string,number]>([1,2], ["a", "b"], LinkedList.of(11,10,9));
    assert.equal(2, r.length());
    // check that the types are properly inferred
    const head: [number,string,number] = r.head().getOrThrow();
    assert.equal(1, head[0]);
    assert.equal("a", head[1]);
    assert.equal(11, head[2]);

    const other = r.get(1).getOrThrow();
    assert.equal(2, other[0]);
    assert.equal("b", other[1]);
    assert.equal(10, other[2]);
});
