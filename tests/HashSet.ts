import { HashSet } from "../src/HashSet";
import { MyClass} from "./SampleData";
import * as assert from 'assert'

describe("hashset construction basic sanity tests", () => {
    it("should overwrite identical values", () => assert.ok(
        HashSet.empty<String>().add("test").add("test")
            .equals(HashSet.empty<String>().add("test"))));

    it("should overwrite identical with custom types", () => assert.ok(
        HashSet.empty<MyClass>()
            .add(new MyClass("a", 1))
            .add(new MyClass("a", 1))
            .add(new MyClass("a", 2)).equals(
                HashSet.empty<MyClass>()
                    .add(new MyClass("a", 1))
                    .add(new MyClass("a", 2)))));
    it("should support addAll on a non-empty set", () => assert.ok(
        HashSet.of(1,2,3,4).equals(HashSet.of(1,2).addAll([3,4]))));
    it("should support addAll on an empty set", () => assert.ok(
        HashSet.of(1,2,3,4).equals(HashSet.empty<number>().addAll([1,2,3,4]))));
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
});

describe("hashset equality", () => {
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, HashSet.of(1).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, HashSet.of(1).equals(<any>null)));
});

describe("hashset combinations", () => {
    it("calculates the diff well", () => assert.ok(
        HashSet.of(1,2,4).equals(HashSet.of(0,1,2,3,4).diff(HashSet.of(0,3)))));
    it("calculates the diff from empty well", () => assert.ok(
        HashSet.empty<number>().equals(HashSet.empty<number>().diff(HashSet.of(0,3)))));
    it("calculates removeAll well", () => assert.ok(
        HashSet.of(1,2,4).equals(HashSet.of(0,1,2,3,4).removeAll([0,3]))));
    it("calculates removeAll from empty well", () => assert.ok(
        HashSet.empty<number>().equals(HashSet.empty<number>().removeAll([0,3]))));
})
