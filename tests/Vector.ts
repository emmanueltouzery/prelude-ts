import { Vector } from "../src/Vector";
import { HashMap } from "../src/HashMap";
import * as assert from 'assert'

describe("Vector creation", () => {
    it("creates from a JS array", () => assert.deepEqual(
        ["a","b", "c"],
        Vector.ofArray<string>(["a","b","c"]).toArray()));
    it("creates from a spread", () => assert.deepEqual(
        ["a","b", "c"],
        Vector.of("a","b","c").toArray()));
});

describe("Vector manipulation", () => {
    it("appends correctly", () => assert.ok(
        Vector.ofArray<number>([1,2,3,4]).equals(Vector.of(1,2,3).append(4))));
    it("appendAll works", () => assert.ok(
        Vector.of(1,2,3,4).equals(Vector.of(1,2).appendAll(Vector.of(3,4)))));
    it("map works", () => assert.ok(
        Vector.of(5,6,7).equals(Vector.of(1,2,3).map(x=>x+4))));
    it("groupBy works", () => assert.ok(
        HashMap.empty().put(0, Vector.of(2,4)).put(1, Vector.of(1,3))
            .equals(Vector.of(1,2,3,4).groupBy(x => x%2))));
});

describe("Vector iteration", () => {
    it("calls forEach correctly", () => {
        let ar: number[] = [];
        Vector.of(1,2,3).forEach((v:number) => ar.push(v));
        assert.deepEqual([1,2,3], ar);
    });
})

describe("Vector Value tests", () => {
    it("serializes to string correctly", () => assert.equal(
        "[1, 2, 3]", Vector.of(1,2,3).toString()));
    it("has non-obviously-broken equals", () => assert.ok(
        Vector.of("a","b","c").equals(Vector.of("a", "b", "c"))));
})
