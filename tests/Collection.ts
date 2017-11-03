import { Collection } from "../src/Collection";
import { HashMap } from "../src/HashMap";
import * as assert from 'assert'

/**
 * @hidden
 */
export function runTests(seqName: string,
                         of: <T>(...i:Array<T>)=>Collection<T>,
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
    });
}
