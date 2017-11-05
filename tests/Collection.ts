import { Collection } from "../src/Collection";
import { HashMap } from "../src/HashMap";
import { WithEquality } from "../src/Comparison";
import { Option } from "../src/Option";
import * as assert from 'assert'

/**
 * @hidden
 */
export function runTests(seqName: string,
                         of: <T>(...i:Array<T&WithEquality>)=>Collection<T>,
                         empty: <T>()=>Collection<T>) {
    describe(seqName + " manipulation", () => {
        it("arrangeBy works, positive case", () => assert.ok(
            HashMap.of<string,string>(["a", "aadvark"], ["b", "baseball"]).equals(
                of("aadvark", "baseball").arrangeBy(x => x[0]).getOrThrow())));
        it("arrangeBy works, negative case", () => assert.ok(
                of("aadvark", "aaseball").arrangeBy(x => x[0]).isNone()));
        it("arrangeBy works, empty seq", () => assert.ok(
            HashMap.empty<string,string>().equals(
                empty<string>().arrangeBy(x => x[0]).getOrThrow())));
        it("groupBy works", () => assert.ok(
            HashMap.empty().put(0, of(2,4)).put(1, of(1,3))
                .equals(of(1,2,3,4).groupBy(x => x%2))));
        it("reduce works", () => assert.equal(
            6, of(1,2,3).reduce((a,b)=>a+b).getOrThrow()));
        it("reduce works on an empty collection", () => assert.ok(
            Option.none<number>().equals(empty<number>().reduce((a,b)=>a+b))));
        it("minOn works", () => assert.equal(
            2, of(2,3,4).minOn(x=>x).getOrThrow()));
        it("minOn works on the empty collection", () => assert.ok(
            empty<number>().minOn(x=>x).isNone()));
        it("minBy works", () => assert.equal(
            4, of(2,3,4).minBy((x,y)=>x-y).getOrThrow()));
        it("minBy works on the empty collection", () => assert.ok(
            empty<number>().minBy((x,y)=>x-y).isNone()));
        it("maxOn works", () => assert.equal(
            4, of(2,3,4).maxOn(x=>x).getOrThrow()));
        it("maxOn works on the empty collection", () => assert.ok(
            empty<number>().maxOn(x=>x).isNone()));
        it("maxBy works", () => assert.equal(
            2, of(2,3,4).maxBy((x,y)=>x-y).getOrThrow()));
        it("maxBy works on the empty collection", () => assert.ok(
            empty<number>().maxBy((x,y)=>x-y).isNone()));
        it("sumOn works", () => assert.equal(
            6, of(1,2,3).sumOn(x=>x)));
        it("sumOn works on the empty collection", () => assert.equal(
            0, empty<number>().sumOn(x=>x)));
    });
}
