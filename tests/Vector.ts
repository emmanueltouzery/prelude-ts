import { Vector } from "../src/Vector";
import * as assert from 'assert'

describe("Vector creation", () => {
    it("creates from a JS array", () => assert.deepEqual(
        ["a","b", "c"],
        Vector.of(["a","b","c"]).toArray()));
});

describe("Vector Value tests", () => {
    it("serializes to string correctly", () => assert.equal(
        "[1, 2, 3]", Vector.of([1,2,3]).toString()));
    it("has non-obviously-broken equals", () => assert.ok(
        Vector.of(["a","b","c"]).equals(Vector.of(["a", "b", "c"]))));
})
