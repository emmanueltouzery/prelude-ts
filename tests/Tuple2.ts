import { Tuple2 } from "../src/Tuple2";
import { Option } from "../src/Option";
import * as assert from 'assert'

describe("Tuple2 manipulation", () => {
    it("fst works", () => assert.equal(
        1,
        Tuple2.of(1,2).fst()));
    it("snd works", () => assert.equal(
        2,
        Tuple2.of(1,2).snd()));
    it("equality works", () => assert.ok(
        Tuple2.of(1,2).equals(Tuple2.of(1,2))));
    it("equality fails when it should", () => assert.ok(
        !Tuple2.of(1,2).equals(Tuple2.of(2,2))));
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, Tuple2.of(1,2).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, Tuple2.of(1,2).equals(<any>null)));
    it("map1 works", () => assert.ok(
        Tuple2.of(2,2).equals(Tuple2.of(1,2).map1(x=>x*2))));
    it("map2 works", () => assert.ok(
        Tuple2.of(1,4).equals(Tuple2.of(1,2).map2(x=>x*2))));
    it("bimap works", () => assert.ok(
        Tuple2.of(2,4).equals(Tuple2.of(1,2).map((x,y)=>Tuple2.of(x*2,y*2)))));
    it("build from tuple works", () => assert.ok(
        Tuple2.of(1,2).equals(Tuple2.ofPair([1,2]))));
    it("build from array works - success", () => assert.ok(
        Option.of(Tuple2.of(1,2)).equals(Tuple2.ofArray<number,number>([1,2]))));
    it("build from array works - failure", () => assert.ok(
        Option.none().equals(Tuple2.ofArray([1,2,3]))));
});
