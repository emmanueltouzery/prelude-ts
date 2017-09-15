import { Stream } from "../src/Stream";
import { Vector } from "../src/Vector";
import { Option } from "../src/Option";
import { MyClass} from "./SampleData";
import { HashMap} from "../src/HashMap";
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
    it("correctly reverses", () => assert.deepEqual(
        [3,2,1], Stream.of(1,2,3).reverse().toArray()));
    it("correctly reverses the empty stream", () => assert.deepEqual(
        [], Stream.empty().reverse().toArray()));
    it("correctly reverses also after prepend", () => assert.deepEqual(
        [3,2,1], Stream.of(2,3).prepend(1).reverse().toArray()));
    it("computes the length correctly", () => assert.equal(
        3, Stream.of(1,2,3).length()));
    it("computes the length of the empty stream correctly", () => assert.equal(
        0, Stream.empty().length()));
    it("gets the last value correctly", () => assert.equal(
        3, Stream.of(1,2,3).last().getOrThrow()));
    it("gets the last value correctly for an empty stream", () => assert.ok(
        Stream.empty().last().isNone()));
    it("correctly dropsWhile", () => assert.deepEqual(
        [4,5,6], Stream.of(1,2,3,4,5,6).dropWhile(x=>x<4).toArray()));
    it("correctly drops n items", () => assert.deepEqual(
        [4,5,6], Stream.of(1,2,3,4,5,6).drop(3).toArray()));
    it("returns an empty stream when dropping too much", () => assert.deepEqual(
        [], Stream.of(1,2).drop(3).toArray()));
    it("sorting works", () => assert.ok(
        Stream.of(4,3,2,1)
            .equals(Stream.of(1,2,3,4).sortBy((x,y) => y-x))));
});

describe("Prepend", () => {
    const basic = Stream.of(1,2,3,4);
    const prepended = Stream.of(2,3,4).prepend(1);
    it("prepends correctly", () => assert.ok(basic.equals(prepended)));
    it("converts to array correctly", () => assert.deepEqual(
        basic.toArray(), prepended.toArray()));
    it("appends correctly after prepend", () => assert.ok(
        basic.append(5).equals(prepended.append(5))));
    it("appendsAll correctly after prepend", () => assert.ok(
        basic.appendStream(Stream.of(5,6)).equals(prepended.appendStream(Stream.of(5,6)))));
    it("converts to string correctly after prepend", () => assert.equal(
        basic.toString(), prepended.toString()));
    // it("prependsAll correctly", () => assert.deepEqual(
    //     [1,2,3,4,5], Stream.of(4,5).prependAll(Stream.of(1,2,3)).toArray()));
});

describe("Stream iteration", () => {
    it("finds items", () => 
       Stream.of(1,2,3).find(x => x >= 2).contains(2));
    it("doesn't find if the predicate doesn't match", () => 
       Stream.of(1,2,3).find(x => x >= 4).isNone());
    it("foldsLeft correctly", () => assert.equal(
        "cba!",
        Stream.of("a", "b", "c").foldLeft("!", (xs,x) => x+xs)));
    it("foldsRight correctly", () => assert.equal(
        "!cba",
        Stream.of("a", "b", "c").foldRight("!", (x,xs) => xs+x)));
    it("calls forEach correctly", () => {
        let ar: number[] = [];
        Stream.of(1,2,3).forEach((v:number) => ar.push(v));
        assert.deepEqual([1,2,3], ar);
    });
    it("get finds when present", () => assert.ok(
        Option.of(5).equals(Stream.of(1,2,3,4,5,6).get(4))));
    it("get finds when present after prepend", () => assert.ok(
        Option.of(5).equals(Stream.of(2,3,4,5,6).prepend(1).get(4))));
    it("get doesn't find when stream too short", () => assert.ok(
        Option.none().equals(Stream.of(1,2,3).get(4))));
    it("get doesn't find when negative index", () => assert.ok(
        Option.none().equals(Stream.of(1,2,3).get(-1))));
    it("zips with an array", () => assert.deepEqual(
        [[1,"a"], [2,"b"]], Stream.of(1,2,3).zip(["a","b"]).toArray()));
    it("zips with a stream", () => assert.deepEqual(
        [["a",0], ["b",1]], Stream.of("a","b").zip(Stream.iterate(0,x=>x+1)).toArray()));
    it("richer example", () => assert.deepEqual(
        [[1,"a"],[2,"b"]], Stream.of(1,2,3)
            .zip(Vector.of("a", "b", "c")).takeWhile(([k,v]) => k<3).toArray()));
});

describe("Stream Value tests", () => {
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

describe("Stream conversions", () => {
    it("converts to vector", () => assert.ok(
        Vector.of(1,2,3).equals(Stream.iterate(1, x => x+1).take(3).toVector())));
    it("mkString works", () => assert.equal(
        "1, 2, 3", Stream.of(1,2,3).mkString(", ")));
    it("transforms to map", () => {
        assert.ok(HashMap.empty<number,string>().put(1,"ok").put(2, "bad")
                  .equals(<HashMap<number,string>>Stream.ofStruct<[number,string]>([1,"ok"],[2,"bad"]).toMap(x => x)));
    });
});
