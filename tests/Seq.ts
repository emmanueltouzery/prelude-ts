import { Seq } from "../src/Seq";
import { HashMap } from "../src/HashMap";
import { Stream } from "../src/Stream";
import { Option } from "../src/Option";
import { MyClass } from "./SampleData";
import * as assert from 'assert'

export function runTests(seqName: string,
                         ofIterable: <T>(i:Iterable<T>)=>Seq<T>,
                         ofStruct: <T>(...i:Array<T>)=>Seq<T>,
                         empty: <T>()=>Seq<T>,
                         unfoldRight: <T,U>(seed: T, fn: (x:T)=>Option<[U,T]>)=>Seq<U>) {
    describe(seqName + " creation", () => {
        it("creates from a JS array", () => assert.deepEqual(
            ["a","b", "c"],
            ofIterable<string>(["a","b","c"]).toArray()));
        it("creates from a spread", () => assert.deepEqual(
            ["a","b", "c"],
            ofStruct("a","b","c").toArray()));
        it("creates also with nulls", () => assert.deepEqual(
            [1, null, 2], ofStruct(1, null, 2).toArray()));
        it("supports ofIterable", () => assert.deepEqual(
            [1,2,3], ofIterable([1,2,3]).toArray()));
        it("supports of", () => assert.deepEqual(
            [1,2,3], ofStruct(1,2,3).toArray()));
        it("supports unfoldRight", () => assert.deepEqual(
            [10,9,8,7,6,5,4,3,2,1], unfoldRight(
                10, x=>Option.of(x)
                    .filter(x => x!==0)
                    .mapStruct<[number,number]>(x => [x,x-1])).toArray()));
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
        it("supports contain", () => assert.ok(
            ofStruct(1,2,3).contains(2)));
        it("rejects contain", () => assert.ok(
            !ofStruct(1,2,3).contains(4)));
        it("rejects contain, empty stream", () => assert.ok(
            !empty().contains(4)));
        it("supports contains, custom equality", () => assert.ok(
            ofStruct(new MyClass("hi", 3)).contains(new MyClass("hi", 3))));
        it("supports allMatch, positive case", () => assert.ok(
            ofStruct(2,4,8).allMatch(x => x%2 === 0)));
        it("supports allMatch, negative case", () => assert.ok(
            !ofStruct(2,5,8).allMatch(x => x%2 === 0)));
        it("supports allMatch, empty stream", () => assert.ok(
            empty<number>().allMatch(x => x%2 === 0)));
        it("supports anyMatch, positive case", () => assert.ok(
            ofStruct(3,5,8).anyMatch(x => x%2 === 0)));
        it("supports anyMatch, negative case", () => assert.ok(
            !ofStruct(3,5,9).anyMatch(x => x%2 === 0)));
        it("supports anyMatch, empty stream", () => assert.ok(
            !empty<number>().anyMatch(x => x%2 === 0)));
    });

    describe(seqName + " iteration", () => {
        // can get for..of in tests by changing the target to es6,
        // or enabling downlevelIteration in the tsconfig.json,
        // not doing that for now.
        // it("supports for of", () => {
        //     let total = 0;
        //     for (const x of ofStruct(1,2,3)) {
        //         total += x;
        //     }
        //     assert.equal(6, total);
        // })
        it("finds items", () =>
           ofStruct(1,2,3).find(x => x >= 2).contains(2));
        it("doesn't find if the predicate doesn't match", () =>
           ofStruct(1,2,3).find(x => x >= 4).isNone());
        it("foldsLeft correctly", () => assert.equal(
            "cba!",
            ofStruct("a", "b", "c").foldLeft("!", (xs,x) => x+xs)));
        it("foldsRight correctly", () => assert.equal(
            "!cba",
            ofStruct("a", "b", "c").foldRight("!", (x,xs) => xs+x)));
        it("calls forEach correctly", () => {
            let ar: number[] = [];
            ofStruct(1,2,3).forEach((v:number) => ar.push(v));
            assert.deepEqual([1,2,3], ar);
        });
        it("supports iterator", () => {
            let total = 0;
            const iterator = ofStruct(1,2,3)[Symbol.iterator]();
            let curItem = iterator.next();
            while (!curItem.done) {
                total += curItem.value;
                curItem = iterator.next();
            }
            assert.equal(6, total);
        })
    });
    describe(seqName + " conversions", () => {
        it("mkString works", () => assert.equal(
            "1, 2, 3", ofStruct(1,2,3).mkString(", ")));
        it("transforms to map", () => {
            assert.ok(HashMap.empty<number,string>().put(1,"ok").put(2, "bad")
                      .equals(<HashMap<number,string>>ofStruct<[number,string]>([1,"ok"],[2,"bad"]).toMap(x => x)));
        });
    });
    describe(seqName + " manipulation", () => {
        it("computes the length correctly", () => assert.equal(
            3, ofStruct(1,2,3).length()));
        it("computes the length of the empty seq correctly", () => assert.equal(
            0, empty().length()));
        it("groupBy works", () => assert.ok(
            HashMap.empty().put(0, ofStruct(2,4)).put(1, ofStruct(1,3))
                .equals(ofStruct(1,2,3,4).groupBy(x => x%2))));
        it("correctly drops right n items", () => assert.deepEqual(
            [1,2,3,4], ofStruct(1,2,3,4,5,6).dropRight(2).toArray()));
        it("returns an empty seq when dropping right too much", () => assert.deepEqual(
            [], ofStruct(1,2).dropRight(3).toArray()));
        it("sorting works", () => assert.ok(
            ofStruct(4,3,2,1)
                .equals(ofStruct(1,2,3,4).sortBy((x,y) => y-x))));
        it("correctly reverses", () => assert.deepEqual(
            [3,2,1], ofStruct(1,2,3).reverse().toArray()));
        it("correctly reverses the empty vector", () => assert.deepEqual(
            [], empty().reverse().toArray()));
        it("correctly reverses also after prepend", () => assert.deepEqual(
            [3,2,1], ofStruct(2,3).prepend(1).reverse().toArray()));
        it("correctly partitions also after prepend", () => assert.deepEqual(
            [[1,3,5,7],[2,4,6,8]],
            ofStruct(2,3,4,5,6,7,8).prepend(1).partition(x => x%2!==0)
                .map(v => v.toArray())));
        it("zips with an array", () => assert.deepEqual(
            [[1,"a"], [2,"b"]], ofStruct(1,2,3).zip(["a","b"]).toArray()));
        it("zips with a stream", () => assert.deepEqual(
            [["a",0], ["b",1]], ofStruct("a","b").zip(Stream.iterate(0,x=>x+1)).toArray()));
        it("richer example", () => assert.deepEqual(
            [[1,"a"],[2,"b"]], ofStruct(1,2,3)
                .zip(["a", "b", "c"]).takeWhile(([k,v]) => k<3).toArray()));
        it("flatMap works", () => assert.ok(
            ofStruct(1,2,2,3,3,3,4,4,4,4)
                .equals(ofStruct(1,2,3,4).flatMap(
                    x => ofIterable(Array.from(Array(x), ()=>x))))));
        it("map works", () => assert.ok(
            ofStruct(5,6,7).equals(ofStruct(1,2,3).map(x=>x+4))));
        it("supports append", () => assert.deepEqual(
            [1,2,3,4], ofStruct(1,2,3).append(4).toArray()));
        it("supports appendAll", () => assert.deepEqual(
            [1,2,3,4,5], ofStruct(1,2,3).appendAll([4,5]).toArray()));
    });
    describe(seqName + " filtering", () => {
        it("filter works", () => assert.ok(
            ofStruct(2,4)
                .equals(ofStruct(1,2,3,4).filter(x => x%2 === 0))));
        it("filter works with prepend", () => assert.ok(
            ofStruct(2,4)
                .equals(ofStruct(3,4).prepend(2).prepend(1).filter(x => x%2 === 0))));
        it("distinctBy", () => assert.deepEqual(
            [1,2,3], ofStruct(1,1,2,3,2,3,1).distinctBy(x => x).toArray()));
        it("distinctBy for the empty seq", () => assert.deepEqual(
            [], empty<number>().distinctBy(x => x).toArray()));
        it("distinctBy for a single value", () => assert.deepEqual(
            [1], ofStruct(1).distinctBy(x => x).toArray()));
        it("distinctBy, custom equality", () => assert.deepEqual(
            [1,0,2], ofStruct(1,0,1,2,3,2,3,1).distinctBy(x => new MyClass("hi", x%3)).toArray()));
        it("distinctBy with prepend", () => assert.deepEqual(
            [1,2,3], ofStruct(2,3,2,3,1).prepend(1).distinctBy(x => x).toArray()));
        it("correctly dropsWhile", () => assert.deepEqual(
            [4,5,6], ofStruct(1,2,3,4,5,6).dropWhile(x=>x<4).toArray()));
        it("correctly drops n items", () => assert.deepEqual(
            [4,5,6], ofStruct(1,2,3,4,5,6).drop(3).toArray()));
        it("returns an empty stream when dropping too much", () => assert.deepEqual(
            [], ofStruct(1,2).drop(3).toArray()));
    });
    describe(seqName + " value extraction", () => {
        it("get finds when present", () => assert.ok(
            Option.of(5).equals(ofStruct(1,2,3,4,5,6).get(4))));
        it("get finds when present after prepend", () => assert.ok(
            Option.of(5).equals(ofStruct(2,3,4,5,6).prepend(1).get(4))));
        it("get doesn't find when stream too short", () => assert.ok(
            Option.none().equals(ofStruct(1,2,3).get(4))));
        it("get doesn't find when negative index", () => assert.ok(
            Option.none().equals(ofStruct(1,2,3).get(-1))));
        it("correctly gets the tail of the empty vector", () => assert.ok(
            empty().tail().isNone()));
        it("correctly gets the tail of a simple vector", () => assert.ok(
            ofStruct(2,3,4).equals(ofStruct(1,2,3,4).tail().getOrThrow())));
        it("correctly gets the tail of a vector after prepend", () => assert.ok(
            ofStruct(2,3,4).equals(ofStruct(2,3,4).prepend(1).tail().getOrThrow())));
        it("gets the last value correctly", () => assert.equal(
            3, ofStruct(1,2,3).last().getOrThrow()));
        it("gets the last value correctly for an empty seq", () => assert.ok(
            empty().last().isNone()));
        it("correctly gets the last element also after prepend", () => assert.equal(
            5, ofStruct(4,5).prependAll(ofStruct(1,2,3)).last().getOrUndefined()));
        it("correctly gets the first element", () => assert.equal(
            1, ofStruct(1,2,3,4,5).head().getOrUndefined()));
        it("correctly gets the first element of an empty vector", () => assert.ok(
            empty().head().isNone()));
        it("correctly gets the first element also after prepend", () => assert.equal(
            1, ofStruct(4,5).prependAll(ofStruct(1,2,3)).head().getOrUndefined()));
    });
}
