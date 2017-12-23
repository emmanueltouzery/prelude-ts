import { Seq } from "../src/Seq";
import { HashMap } from "../src/HashMap";
import { Stream } from "../src/Stream";
import { Option } from "../src/Option";
import { Predicates } from "../src/Predicate";
import { MyClass } from "./SampleData";
import { assertFailCompile } from "./TestHelpers";
import * as CollectionTest from './Collection';
require("mocha-testcheck").install();
const { gen, check} = require("mocha-testcheck");
import * as assert from 'assert'

/**
 * @hidden
 */
export function runTests(seqName: string,
                         ofIterable: <T>(i:Iterable<T>)=>Seq<T>,
                         of: <T>(...i:Array<T>)=>Seq<T>,
                         empty: <T>()=>Seq<T>,
                         unfoldRight: <T,U>(seed: T, fn: (x:T)=>Option<[U,T]>)=>Seq<U>,
                         nonEmptySeqName_?:string) {
    const nonEmptySeqName = nonEmptySeqName_ || seqName;
    CollectionTest.runTests(seqName, of, empty);
    describe(seqName + " creation", () => {
        it("creates from a JS array", () => assert.deepEqual(
            ["a","b", "c"],
            ofIterable<string>(["a","b","c"]).toArray()));
        it("creates from a spread", () => assert.deepEqual(
            ["a","b", "c"],
            of("a","b","c").toArray()));
        it("creates also with nulls", () => assert.deepEqual(
            [1, null, 2], of(1, null, 2).toArray()));
        it("supports ofIterable", () => assert.deepEqual(
            [1,2,3], ofIterable([1,2,3]).toArray()));
        // need to test ofIterable with a real iterable as well
        // as an array -- vector for instance has an optimized codepath
        // for arrays so we need to give a real iterable too for full coverage.
        it("supports ofIterable from real iterable", () => assert.deepEqual(
            [1,2,3], ofIterable(Stream.of(1,2,3)).toArray()));
        it("supports of", () => assert.deepEqual(
            [1,2,3], of(1,2,3).toArray()));
        it("supports unfoldRight", () => assert.deepEqual(
            [10,9,8,7,6,5,4,3,2,1], unfoldRight(
                10, x=>Option.of(x)
                    .filter(x => x!==0)
                    .map<[number,number]>(x => [x,x-1])).toArray()));
    });

    describe(seqName + " prepend", () => {
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

    describe(seqName + " Value tests", () => {
        it("has non-obviously-broken equals", () => assert.ok(
            of("a","b","c").equals(of("a", "b", "c"))));
        it("doesn't throw when given another type on equals", () => assert.equal(
            false, of(1).equals(<any>[1,2])));
        it("doesn't throw when given null on equals", () => assert.equal(
            false, of(1).equals(<any>null)));
        it("is strict with equality", () => assert.ok(
            !of(1,2).equals(of(1, <any>undefined))));
        it("supports contain", () => assert.ok(
            of(1,2,3).contains(2)));
        it("should throw when using contains without true equality", () => assert.throws(
            () => of(Option.of([1])).contains(Option.of([1]))));
        it("rejects contain", () => assert.ok(
            !of(1,2,3).contains(4)));
        it("rejects contain, empty stream", () => assert.ok(
            !empty().contains(4)));
        it("supports contains, custom equality", () => assert.ok(
            of(new MyClass("hi", 3)).contains(new MyClass("hi", 3))));
        it("supports allMatch, positive case", () => assert.ok(
            of(2,4,8).allMatch(x => x%2 === 0)));
        it("supports allMatch, negative case", () => assert.ok(
            !of(2,5,8).allMatch(x => x%2 === 0)));
        it("supports allMatch, empty stream", () => assert.ok(
            empty<number>().allMatch(x => x%2 === 0)));
        it("supports anyMatch, positive case", () => assert.ok(
            of(3,5,8).anyMatch(x => x%2 === 0)));
        it("supports anyMatch, negative case", () => assert.ok(
            !of(3,5,9).anyMatch(x => x%2 === 0)));
        it("supports anyMatch, empty stream", () => assert.ok(
            !empty<number>().anyMatch(x => x%2 === 0)));
        it("should fail compilation on an obviously bad equality test", () =>
           assertFailCompile(
               seqName + ".of([1]).equals(" + seqName + ".of([1]))", "Argument of type \'" +
                   nonEmptySeqName + "<number[]>\' is not assignable to parameter"));
        it("should fail compilation on an obviously bad contains test", () =>
           assertFailCompile(
               seqName + ".of([1]).contains([1])",
               "Argument of type \'number[]\' is not assignable to parameter"));
    });

    describe(seqName + " iteration", () => {
        // can get for..of in tests by changing the target to es6,
        // or enabling downlevelIteration in the tsconfig.json,
        // not doing that for now.
        // it("supports for of", () => {
        //     let total = 0;
        //     for (const x of of(1,2,3)) {
        //         total += x;
        //     }
        //     assert.equal(6, total);
        // })
        it("finds items", () =>
           of(1,2,3).find(x => x >= 2).contains(2));
        it("doesn't find if the predicate doesn't match", () =>
           of(1,2,3).find(x => x >= 4).isNone());
        it("folds correctly", () => assert.equal(
            6, of(1,2,3).fold(0, (a,b)=>a+b)));
        it("foldsLeft correctly", () => assert.equal(
            "cba!",
            of("a", "b", "c").foldLeft("!", (xs,x) => x+xs)));
        it("foldsRight correctly", () => assert.equal(
            "!cba",
            of("a", "b", "c").foldRight("!", (x,xs) => xs+x)));
        it("calls forEach correctly", () => {
            let ar: number[] = [];
            of(1,2,3).forEach((v:number) => ar.push(v));
            assert.deepEqual([1,2,3], ar);
        });
        it("supports iterator", () => {
            let total = 0;
            const iterator = of(1,2,3)[Symbol.iterator]();
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
            "1, 2, 3", of(1,2,3).mkString(", ")));
        it("transforms to map", () => {
            assert.ok(HashMap.empty<number,string>().put(1,"ok").put(2, "bad")
                      .equals(<HashMap<number,string>>of<[number,string]>([1,"ok"],[2,"bad"]).toMap(x => x)));
        });
    });
    describe(seqName + " manipulation", () => {
        it("computes the length correctly", () => assert.equal(
            3, of(1,2,3).length()));
        it("computes the length of the empty seq correctly", () => assert.equal(
            0, empty().length()));
        it("correctly drops right n items", () => assert.deepEqual(
            [1,2,3,4], of(1,2,3,4,5,6).dropRight(2).toArray()));
        it("returns an empty seq when dropping right too much", () => assert.deepEqual(
            [], of(1,2).dropRight(3).toArray()));
        it("doesn't modify the receiver upon drop", () => {
            const x = of(1,2,3);
            x.drop(2);
            assert.deepEqual([1,2,3], x.toArray())
        });
        it("sortBy sorting works", () => assert.ok(
            of(4,3,2,1)
                .equals(of(1,2,3,4).sortBy((x,y) => y-x))));
        it("sortOn sorting works", () => assert.ok(
            of(1,2,3,4)
                .equals(of(4,2,3,1).sortOn(x => x))));
        it("sortOn sorting works2", () => assert.ok(
            of(new MyClass("zz",1),
                     new MyClass("test", 2),
                     new MyClass("b",3))
                .equals(of(new MyClass("test", 2),
                                 new MyClass("zz", 1),
                                 new MyClass("b",3)).sortOn(x => x.getField2()))));
        it("sortOn sorting works with strings too", () => assert.ok(
            of(1,2,3,4)
                .equals(of(4,2,3,1).sortOn(x => x+""))));
        it("sortOn sorting works with strings too 2", () => assert.ok(
            of(new MyClass("b",3),
               new MyClass("test", 2),
               new MyClass("zz",1))
                .equals(of(new MyClass("test", 2),
                                 new MyClass("zz", 1),
                                 new MyClass("b",3)).sortOn(x => x.getField1()))));
        it("correctly reverses", () => assert.deepEqual(
            [3,2,1], of(1,2,3).reverse().toArray()));
        it("correctly reverses the empty vector", () => assert.deepEqual(
            [], empty().reverse().toArray()));
        it("correctly reverses also after prepend", () => assert.deepEqual(
            [3,2,1], of(2,3).prepend(1).reverse().toArray()));
        it("correctly partitions also after prepend", () => assert.deepEqual(
            [[1,3,5,7],[2,4,6,8]],
            of(2,3,4,5,6,7,8).prepend(1).partition(x => x%2!==0)
                .map(v => v.toArray())));
        it("zips with an array", () => assert.deepEqual(
            [[1,"a"], [2,"b"]], of(1,2,3).zip(["a","b"]).toArray()));
        it("zips with a stream", () => assert.deepEqual(
            [["a",0], ["b",1]], of("a","b").zip(Stream.iterate(0,x=>x+1)).toArray()));
        it("richer example", () => assert.deepEqual(
            [[1,"a"],[2,"b"]], of(1,2,3)
                .zip(["a", "b", "c"]).takeWhile(([k,v]) => k<3).toArray()));
        it("flatMap works", () => assert.ok(
            of(1,2,2,3,3,3,4,4,4,4)
                .equals(of(1,2,3,4).flatMap(
                    x => ofIterable(Array.from(Array(x), ()=>x))))));
        it("map works", () => assert.ok(
            of(5,6,7).equals(of(1,2,3).map(x=>x+4))));
        it("mapOption works", () => assert.deepEqual(
            [3,5,7],of(1,2,3,4,5,6).mapOption(
                x => x%2==0 ? Option.of(x+1):Option.none()).toArray()));
        it("supports append", () => assert.deepEqual(
            [1,2,3,4], of(1,2,3).append(4).toArray()));
        it("doesn't modify the receiver upon append", () => {
            const x = of(1,2,3);
            x.append(4);
            assert.deepEqual([1,2,3], x.toArray())
        });
        it("supports appendAll", () => assert.deepEqual(
            [1,2,3,4,5], of(1,2,3).appendAll([4,5]).toArray()));
        it("doesn't modify the receiver upon appendAll", () => {
            const x = of(1,2,3);
            x.appendAll([4,5]);
            assert.deepEqual([1,2,3], x.toArray())
        });
        it("supports take", () => assert.deepEqual(
            [1,2,3], of(1,2,3,4,5,6).take(3).toArray()));
        it("supports take with an index higher than the length", () =>
           assert.deepEqual([1,2,3], of(1,2,3).take(6).toArray()));
        it("supports take with a negative index", () =>
           assert.deepEqual([], of(1,2,3).take(-1).toArray()));
        it("doesn't modify the receiver upon take", () => {
            const x = of(1,2,3);
            x.take(2);
            assert.deepEqual([1,2,3], x.toArray())
        });
        check.it("applying reverse twice is the identity", gen.array(gen.string), (ar:string[]) => {
            assert.deepEqual(ofIterable(ar).reverse().reverse().toArray(),
                             ofIterable(ar).toArray());
        });
        check.it("calling take() on the seq is the same as on the array",
                 gen.array(gen.string), gen.int.suchThat((n:number) => !Number.isNaN(n)), (ar:number[],n:number) => {
            assert.deepEqual(ofIterable(ar).take(n).toArray(),
                             ar.slice(0,Math.max(0,n)));
        });
    });
    describe(seqName + " filtering", () => {
        it("filter works", () => assert.ok(
            of(2,4)
                .equals(of(1,2,3,4).filter(x => x%2 === 0))));
        it("filter works with prepend", () => assert.ok(
            of(2,4)
                .equals(of(3,4).prepend(2).prepend(1).filter(x => x%2 === 0))));
        it("distinctBy", () => assert.deepEqual(
            [1,2,3], of(1,1,2,3,2,3,1).distinctBy(x => x).toArray()));
        it("distinctBy for the empty seq", () => assert.deepEqual(
            [], empty<number>().distinctBy(x => x).toArray()));
        it("distinctBy for a single value", () => assert.deepEqual(
            [1], of(1).distinctBy(x => x).toArray()));
        it("distinctBy, custom equality", () => assert.deepEqual(
            [1,0,2], of(1,0,1,2,3,2,3,1).distinctBy(x => new MyClass("hi", x%3)).toArray()));
        it("distinctBy with prepend", () => assert.deepEqual(
            [1,2,3], of(2,3,2,3,1).prepend(1).distinctBy(x => x).toArray()));
        it("correctly dropsWhile", () => assert.deepEqual(
            [4,5,6], of(1,2,3,4,5,6).dropWhile(x=>x<4).toArray()));
        it("correctly drops n items", () => assert.deepEqual(
            [4,5,6], of(1,2,3,4,5,6).drop(3).toArray()));
        it("returns an empty stream when dropping too much", () => assert.deepEqual(
            [], of(1,2).drop(3).toArray()));
        it("calculates removeFirst well", () => assert.deepEqual(
            [0,1,3,4], of(0,1,2,3,4).removeFirst(Predicates.isIn([3,2])).toArray()));
        it("calculates removeFirst well event if item not present", () => assert.deepEqual(
            [0,1,2,3,4], of(0,1,2,3,4).removeFirst(Predicates.equals(5)).toArray()));
        it("calculates removeFirst from empty well", () => assert.ok(
            empty<number>().equals(empty<number>().removeFirst(x => x === 3))));
        it("handles a simple splitAt", () => assert.deepEqual(
            [[1,2,3],[4,5]], of(1,2,3,4,5).splitAt(3).map(x=>x.toArray())));
        it("handles a simple splitAt 2", () => assert.deepEqual(
            [[1],[2,3]], of(1,2,3).splitAt(1).map(x=>x.toArray())));
        it("handles splitAt with empty second list", () => assert.deepEqual(
            [[1,2,3],[]], of(1,2,3).splitAt(3).map(x=>x.toArray())));
        it("handles splitAt with empty first list", () => assert.deepEqual(
            [[],[1,2,3]], of(1,2,3).splitAt(0).map(x=>x.toArray())));
        it("handles splitAt with out of bounds 1", () => assert.deepEqual(
            [[],[1,2,3]], of(1,2,3).splitAt(-1).map(x=>x.toArray())));
        it("handles splitAt with out of bounds 2", () => assert.deepEqual(
            [[1,2,3],[]], of(1,2,3).splitAt(4).map(x=>x.toArray())));
        it("handles a regular span", () => assert.deepEqual(
            [[1,2],[3,4,5]], of(1,2,3,4,5).span(i=>i<3).map(x=>x.toArray())));
        it("handles a span matching everything", () => assert.deepEqual(
            [[1,2,3,4,5],[]], of(1,2,3,4,5).span(i=>i<9).map(x=>x.toArray())));
        it("handles a span matching nothing", () => assert.deepEqual(
            [[],[1,2,3,4,5]], of(1,2,3,4,5).span(i=>i<0).map(x=>x.toArray())));
    });
    describe(seqName + " value extraction", () => {
        it("get finds when present", () => assert.ok(
            Option.of(5).equals(of(1,2,3,4,5,6).get(4))));
        it("get finds when present after prepend", () => assert.ok(
            Option.of(5).equals(of(2,3,4,5,6).prepend(1).get(4))));
        it("get doesn't find when stream too short", () => assert.ok(
            Option.none().equals(of(1,2,3).get(4))));
        it("get doesn't find when negative index", () => assert.ok(
            Option.none().equals(of(1,2,3).get(-1))));
        it("correctly gets the tail of the empty vector", () => assert.ok(
            empty().tail().isNone()));
        it("correctly gets the tail of a simple vector", () => assert.ok(
            of(2,3,4).equals(of(1,2,3,4).tail().getOrThrow())));
        it("correctly gets the tail of a vector after prepend", () => assert.ok(
            of(2,3,4).equals(of(2,3,4).prepend(1).tail().getOrThrow())));
        it("gets the last value correctly", () => assert.equal(
            3, of(1,2,3).last().getOrThrow()));
        it("gets the last value correctly for an empty seq", () => assert.ok(
            empty().last().isNone()));
        it("correctly gets the last element also after prepend", () => assert.equal(
            5, of(4,5).prependAll(of(1,2,3)).last().getOrUndefined()));
        it("correctly gets the first element", () => assert.equal(
            1, of(1,2,3,4,5).head().getOrUndefined()));
        it("correctly gets the first element of an empty vector", () => assert.ok(
            empty().head().isNone()));
        it("correctly gets the first element also after prepend", () => assert.equal(
            1, of(4,5).prependAll(of(1,2,3)).head().getOrUndefined()));
        it("correct returns single positive case", () => assert.equal(
            5, of(5).single().getOrThrow()));
        it("correct returns single negative case", () => assert.ok(
            of(5,6).single().isNone()));
        it("correct returns single empty seq", () => assert.ok(
            empty().single().isNone()));
    });
    describe(seqName + " supports shuffle", () => {
        const original = of(1,2,3,4,5,6,7,2,9,10);
        const shuffle1 = original.shuffle();
        const shuffle2 = original.shuffle();
        const shuffle3 = original.shuffle();
        const shuffle4 = original.shuffle();
        it("should conserve all the items1", () => assert.deepEqual(
            original.sortOn(x=>x).toArray(), shuffle1.sortOn(x=>x).toArray()));
        it("should conserve all the items2", () => assert.deepEqual(
            original.sortOn(x=>x).toArray(), shuffle2.sortOn(x=>x).toArray()));
        it("should conserve all the items3", () => assert.deepEqual(
            original.sortOn(x=>x).toArray(), shuffle3.sortOn(x=>x).toArray()));
        it("should conserve all the items4", () => assert.deepEqual(
            original.sortOn(x=>x).toArray(), shuffle4.sortOn(x=>x).toArray()));
        it("should change the order of elements", () => assert.equal(false,
            original.equals(shuffle1) &&
                original.equals(shuffle2) &&
                original.equals(shuffle3) &&
                original.equals(shuffle4)))
    });
}
