import { Seq } from "../src/Seq";
import { MyClass } from "./SampleData";
import * as assert from 'assert'

export function runTests(seqName: string,
                         ofIterable: <T>(i:Iterable<T>)=>Seq<T>,
                         ofStruct: <T>(...i:Array<T>)=>Seq<T>) {
    describe(seqName + " creation", () => {
        it("creates from a JS array", () => assert.deepEqual(
            ["a","b", "c"],
            ofIterable<string>(["a","b","c"]).toArray()));
        it("creates from a spread", () => assert.deepEqual(
            ["a","b", "c"],
            ofStruct("a","b","c").toArray()));
        it("creates also with nulls", () => assert.deepEqual(
            [1, null, 2], ofStruct(1, null, 2).toArray()));
    });

    describe(seqName + " prepend", () => {
        const basic = ofStruct(1,2,3,4);
        const prepended = ofStruct(2,3,4).prepend(1);
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
            [1,2,3,4,5], ofStruct(4,5).prependAll([1,2,3]).toArray()));
    });

    describe(seqName + " Value tests", () => {
        it("serializes to string correctly", () => assert.equal(
            "[1, 2, 3]", ofStruct(1,2,3).toString()));
        it("serializes to string correctly - arrays & strings", () => assert.equal(
            "[[1,'a']]", ofStruct([1,'a']).toString()));
        it("serializes to string correctly - custom toString", () => assert.equal(
            "[{field1: hi, field2: 99}]", ofStruct(new MyClass("hi", 99)).toString()));
        it("has non-obviously-broken equals", () => assert.ok(
            ofStruct("a","b","c").equals(ofStruct("a", "b", "c"))));
        it("doesn't throw when given another type on equals", () => assert.equal(
            false, ofStruct(1).equals(<any>[1,2])));
        it("doesn't throw when given null on equals", () => assert.equal(
            false, ofStruct(1).equals(<any>null)));
        it("is strict with equality", () => assert.ok(
            !ofStruct(1,2).equals(ofStruct(1, <any>undefined))));
    });

}