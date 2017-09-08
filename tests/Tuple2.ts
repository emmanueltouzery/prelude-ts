import { Tuple2 } from "../src/Tuple2";
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
    it("map1 works", () => assert.ok(
        Tuple2.of(2,2).equals(Tuple2.of(1,2).map1(x=>x*2))));
    it("map2 works", () => assert.ok(
        Tuple2.of(1,4).equals(Tuple2.of(1,2).map2(x=>x*2))));
    it("bimap works", () => assert.ok(
        Tuple2.of(2,4).equals(Tuple2.of(1,2).map((x,y)=>Tuple2.of(x*2,y*2)))));
    it("build from array works", () => assert.ok(
        Tuple2.of(1,2).equals(Tuple2.ofArray([1,2]))));
});
