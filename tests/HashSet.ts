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
});

describe("hashset conversions", () => {
    it("should convert to array correctly", () => {
        assert.deepEqual([1,2,3,4], HashSet.empty<number>()
                         .add(1).add(2).add(3).add(4).toArray().sort());
    });
    it("should be created correctly from an array", () => {
        assert.deepEqual(["a","b","c"], HashSet.ofIterable(["a","b","c"]).toArray().sort());
    });
    it("should be created correctly from a spread", () => {
        assert.deepEqual(["a","b","c"], HashSet.of("a","b","c").toArray().sort());
    });
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
        const iterator = HashSet.empty()[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            total += curItem.value;
        }
        assert.equal(0, total);
    })
});
