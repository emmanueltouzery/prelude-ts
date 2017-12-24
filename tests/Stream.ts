import { Stream } from "../src/Stream";
import { Vector } from "../src/Vector";
import { Option } from "../src/Option";
import { MyClass} from "./SampleData";
import { HashMap} from "../src/HashMap";
import * as SeqTest from "./Seq";
import * as assert from 'assert'

SeqTest.runTests("Stream",
                 Stream.ofIterable,
                 Stream.of,
                 Stream.empty,
                 Stream.unfoldRight,
                "ConsStream");

describe("Stream basics", () => {
    it("creates a continually constant value", () => assert.deepEqual(
        [1,1,1,1], Stream.continually(() => 1).take(4).toArray()));
    it("iterates from a seed", () => assert.deepEqual(
        [1,2,4,8], Stream.iterate(1, x => x*2).take(4).toArray()));
    it("maps lazily correctly", () => assert.deepEqual(
        [4,5,7,11], Stream.iterate(1, x => x*2).map(x => x+3).take(4).toArray()));
    it("supports appendStream", () => assert.deepEqual(
        [1,2,3,4,5,6], Stream.of(1,2,3).appendStream(Stream.of(4,5,6)).toArray()));
    it("supports cycle", () => assert.deepEqual(
        [1,2,3,1,2,3,1,2], Stream.of(1,2,3).cycle().take(8).toArray()));
    it("takes advantage of isEmpty", () => {
        const stream = Stream.of(1,2,3);
        if (!stream.isEmpty()) {
            stream.head().get();
        }
    });
});

describe("Stream filtering", () => {
    it("implements takeWhile correctly", () => assert.deepEqual(
        [1,2,3], Stream.iterate(1, x=>x+1).takeWhile(x=>x<4).toArray()));
    it("filters lazily correctly", () => assert.deepEqual(
        [8,32,64,128], Stream.iterate(1, x => x*2).filter(x => x>5 && (x<15 || x > 30)).take(4).toArray()));
});

describe("Stream toString", () => {
    it("implements toString correctly on infinite streams", () => assert.equal(
        "Stream(1, 2, ?)", (() => {
            const s = Stream.iterate(1, x=>x+1);
            s.get(1);
            return s.toString();
        })()));
    it("implements toString ok on fully-evaluated", () => assert.equal(
        "Stream(1, 2, 3)", (()=> {
            const s = Stream.iterate(1,x=>x+1).take(3);
            s.length();
            return s.toString();
        })()));
    it("implements toString ok on fully-lazy", () => assert.equal(
        "Stream(1, ?)", Stream.iterate(1,x=>x+1).take(3)));
    it("serializes to string correctly", () => assert.equal(
        "Stream(1, ?)", Stream.of(1,2,3).toString()));
    it("serializes to string correctly - arrays & strings", () => assert.equal(
        "Stream([1,'a'], ?)", Stream.of([1,'a']).toString()));
    it("serializes to string correctly - custom toString", () => assert.equal(
        "Stream({field1: hi, field2: 99}, ?)", Stream.of(new MyClass("hi", 99)).toString()));
    it("serializes to string correctly - plain map", () => assert.equal(
        "Stream({\"name\":\"hi\",\"age\":99}, ?)", Stream.of({name:"hi", age:99}).toString()));
});
