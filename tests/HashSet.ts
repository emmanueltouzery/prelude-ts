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
})
