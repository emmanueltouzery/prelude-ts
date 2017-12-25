import { HashSet } from "../src/HashSet";
import { Vector } from "../src/Vector";
import { Stream } from "../src/Stream";
import { Option } from "../src/Option";
import { Tuple2 } from "../src/Tuple2";
import { HashMap } from "../src/HashMap";
import { MyClass} from "./SampleData";
import { assertFailCompile } from "./TestHelpers";
import * as CollectionTest from './Collection';
import * as assert from 'assert'

CollectionTest.runTests(
    "HashSet", HashSet.of, HashSet.empty);

describe("hashset construction basic sanity tests", () => {
    it("should overwrite identical values", () => assert.ok(
        HashSet.empty<string>().add("test").add("test")
            .equals(HashSet.empty<string>().add("test"))));

    it("should overwrite identical with custom types", () => assert.ok(
        HashSet.empty<MyClass>()
            .add(new MyClass("a", 1))
            .add(new MyClass("a", 1))
            .add(new MyClass("a", 2)).equals(
                HashSet.empty<MyClass>()
                    .add(new MyClass("a", 1))
                    .add(new MyClass("a", 2)))));
    it("should overwrite identical also when built using hashset.of", () => assert.equal(
        1, HashSet.of(new MyClass("a",1)).add(new MyClass("a",1)).length()));
    it("should support addAll on a non-empty set", () => assert.ok(
        HashSet.of(1,2,3,4).equals(HashSet.of(1,2).addAll([3,4]))));
    it("should support addAll on an empty set", () => assert.ok(
        HashSet.of(1,2,3,4).equals(HashSet.empty<number>().addAll([1,2,3,4]))));
    it("should fail at runtime on key without equality", () => assert.throws(() =>
        HashSet.empty<any>().add({field1:'test', field2:-1})));
});

describe("hashset conversions", () => {
    it("should convert to array correctly", () => {
        assert.deepEqual([1,2,3,4], HashSet.empty<number>()
                         .add(1).add(2).add(3).add(4).toArray().sort());
    });
    it("empty should convert to array correctly", () => {
        assert.deepEqual([], HashSet.empty<number>().toArray());
    });
    it("should be created correctly from an array", () => {
        assert.deepEqual(["a","b","c"], HashSet.ofIterable(["a","b","c"]).toArray().sort());
    });
    it("should be created correctly from a spread", () => {
        assert.deepEqual(["a","b","c"], HashSet.of("a","b","c").toArray().sort());
    });
    it("should be displayed in a nice format by toString", () =>
       assert.equal("{'a', 'b', 'c'}", HashSet.of("a","b","c").toString()));
    it("converts to string using mkString", () =>
       assert.equal("'a'|'b'|'c'", HashSet.of("a","b","c").mkString("|")));
});

describe("hashset access", () => {
    it("should return true from contains", () => {
        assert.ok(HashSet.of(1,2,3).contains(2));
    });
    it("should return false from contains", () => {
        assert.ok(!HashSet.of(1,2,3).contains(4));
    });
    it("supports iterator", () => {
        let total = 0;
        const iterator = HashSet.of(1,6,3)[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            total += curItem.value;
            curItem = iterator.next();
        }
        assert.equal(10, total);
    });
    it("supports empty iterator", () => {
        let total = 0;
        const iterator = HashSet.empty<number>()[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            total += curItem.value;
        }
        assert.equal(0, total);
    })
    it("supports allMatch, positive case", () => assert.ok(
        HashSet.of(2,4,8).allMatch(x => x%2 === 0)));
    it("supports allMatch, negative case", () => assert.ok(
        !HashSet.of(2,5,8).allMatch(x => x%2 === 0)));
    it("supports allMatch, empty HashSet", () => assert.ok(
        HashSet.empty<number>().allMatch(x => x%2 === 0)));
    it("supports anyMatch, positive case", () => assert.ok(
        HashSet.of(3,5,8).anyMatch(x => x%2 === 0)));
    it("supports anyMatch, negative case", () => assert.ok(
        !HashSet.of(3,5,9).anyMatch(x => x%2 === 0)));
    it("supports anyMatch, empty HashSet", () => assert.ok(
        !HashSet.empty<number>().anyMatch(x => x%2 === 0)));
    it("correct returns single positive case", () => assert.equal(
        5, HashSet.of(5).single().getOrThrow()));
    it("correct returns single negative case", () => assert.ok(
        HashSet.of(5,6).single().isNone()));
    it("correct returns single empty seq", () => assert.ok(
        HashSet.empty().single().isNone()));
    it("correctly partitions also after prepend", () => assert.deepEqual(
        [[1,3,5,7],[2,4,6,8]],
        HashSet.of(2,3,4,5,6,7,8).add(1).partition(x => x%2!==0)
            .map(v => v.toVector().sortOn(x=>x).toArray())));
});

describe("hashset equality", () => {
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, HashSet.of(1).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, HashSet.of(1).equals(<any>null)));
    it("should refuse elements which don't offer true equality", () => assert.throws(
        () => HashSet.of(Vector.of([1]))));
    it("should refuse elements which don't offer true equality (neither equals nor hashcode)", () => assert.throws(
        () => HashSet.of(<any>{name:""})));
    it("should refuse elements which don't offer true equality (no hashcode)", () => assert.throws(
        () => HashSet.of(<any>{name:"",equals:(x:any,y:any)=>true})));
    it("should refuse elements which don't offer true equality (no equals)", () => assert.throws(
        () => HashSet.of(<any>{name:"",hashCode:()=>1})));
    it("should refuse elements which don't offer true equality (vector)", () => assert.throws(
        () => HashSet.empty().add(Vector.of(Vector.of([1])))));
    it("should refuse elements which don't offer true equality (stream)", () => assert.throws(
        () => HashSet.of(Stream.of([1]))));
    it("should refuse elements which don't offer true equality (option)", () => assert.throws(
        () => HashSet.of(Option.of([1]))));
    it("should refuse elements which don't offer true equality (tuple2)", () => assert.throws(
        () => HashSet.of(Tuple2.of(1,Vector.of([1])))));
    it("should refuse elements which don't offer true equality (hashmap)", () => assert.throws(
        () => HashSet.of(HashMap.of(["a",[1]]))));
    it("should fail compilation on an obviously bad key type", () =>
       assertFailCompile(
           "HashSet.of([1])", "Argument of type \'number[]\' is not assignable to parameter"));
});

describe("hashset combinations", () => {
    it("calculates the diff well", () => assert.ok(
        HashSet.of(1,2,4).equals(HashSet.of(0,1,2,3,4).diff(HashSet.of(0,3)))));
    it("calculates the diff from empty well", () => assert.ok(
        HashSet.empty<number>().equals(HashSet.empty<number>().diff(HashSet.of(0,3)))));
    it("calculates the intersect well", () => assert.ok(
        HashSet.of(0,3).equals(HashSet.of(0,1,2,3,4).intersect(HashSet.of(0,3)))));
    it("calculates the intersect from empty well", () => assert.ok(
        HashSet.empty<number>().equals(HashSet.empty<number>().intersect(HashSet.of(0,3)))));
    it("calculates removeAll well", () => assert.ok(
        HashSet.of(1,2,4).equals(HashSet.of(0,1,2,3,4).removeAll([0,3]))));
    it("calculates removeAll from empty well", () => assert.ok(
        HashSet.empty<number>().equals(HashSet.empty<number>().removeAll([0,3]))));
    it("calculates remove well", () => assert.ok(
        HashSet.of(0,1,2,4).equals(HashSet.of(0,1,2,3,4).remove(3))));
    it("calculates remove well event if item not present", () => assert.ok(
        HashSet.of(0,1,2,3,4).equals(HashSet.of(0,1,2,3,4).remove(5))));
    it("calculates remove from empty well", () => assert.ok(
        HashSet.empty<number>().equals(HashSet.empty<number>().remove(3))));
    it("filters correctly", () => assert.ok(
        HashSet.of(2,4).equals(HashSet.of(1,2,3,4,5).filter(x => x%2==0))));
    it("keeps the custom equal/hash on filter", () => assert.equal(
        1, HashSet.of(new MyClass("a",1)).filter(x=>true).add(new MyClass("a",1)).length()));
    it("confirms subset when correct", () =>
       assert.ok(HashSet.of(1,2,3).isSubsetOf(HashSet.of(0,1,2,3,4))));
    it("rejects subset when it should", () =>
       assert.ok(!HashSet.of(1,2,3,5).isSubsetOf(HashSet.of(0,1,2,3,4))));
});

describe("hashset transformations", () => {
    it("map works", () => assert.ok(
        HashSet.of(5,6,7).equals(HashSet.of(1,2,3).map(x=>x+4))));
    it("flatMap works", () => assert.ok(
        HashSet.of(5,6,7,-5,-6,-7).equals(HashSet.of(1,2,3).flatMap(x=>HashSet.of(x+4,-x-4)))));
    it("mapOption works", () => assert.ok(
        HashSet.of(3,5,7).equals(HashSet.of(1,2,3,4,5,6).mapOption(
            x => x%2==0 ? Option.of(x+1):Option.none<number>()))));
    it("should fold correctly", () => assert.equal(
        6, HashSet.of(1,2,3).fold(0, (a,b)=>a+b)));
    it("should foldLeft correctly", () => assert.equal(
        6, HashSet.of("a", "bb", "ccc").foldLeft(0, (soFar,item)=>soFar+item.length)));
    it("should foldRight correctly", () => assert.equal(
        6, HashSet.of("a", "bb", "ccc").foldRight(0, (item,soFar)=>soFar+item.length)));
});
