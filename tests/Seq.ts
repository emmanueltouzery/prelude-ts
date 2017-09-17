import { Seq } from "../src/Seq";
import * as assert from 'assert'

export function runTests(seqName: string,
                         ofIterable: <T>(i:Iterable<T>)=>Seq<T>,
                         of: <T>(...i:Array<T>)=>Seq<T>) {
    describe(seqName + " creation", () => {
        it("creates from a JS array", () => assert.deepEqual(
            ["a","b", "c"],
            ofIterable<string>(["a","b","c"]).toArray()));
        it("creates from a spread", () => assert.deepEqual(
            ["a","b", "c"],
            of("a","b","c").toArray()));
        it("creates also with nulls", () => assert.deepEqual(
            [1, null, 2], of(1, null, 2).toArray()));
    });

    describe("Prepend", () => {
        const basic = of(1,2,3,4);
        const prepended = of(2,3,4).prepend(1);
        it("prepends correctly", () => assert.ok(basic.equals(prepended)));
        it("converts to array correctly", () => assert.deepEqual(
            basic.toArray(), prepended.toArray()));
        it("appends correctly after prepend", () => assert.ok(
            basic.append(5).equals(prepended.append(5))));
        it("appendsAll correctly after prepend", () => assert.ok(
            basic.appendAll([5,6]).equals(prepended.appendAll([5,6]))));
        it("converts to string correctly after prepend", () => assert.equal(
            basic.toString(), prepended.toString()));
        it("prependsAll correctly", () => assert.deepEqual(
            [1,2,3,4,5], of(4,5).prependAll([1,2,3]).toArray()));
    });

}
