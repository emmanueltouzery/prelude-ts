import { HashMap } from "../src/HashMap";
import { HashSet } from "../src/HashSet";
import { MyClass} from "./SampleData";
import * as assert from 'assert'

describe("hashmap construction basic sanity tests", () => {
    it("should overwrite values with the same key", () => assert.ok(
        HashMap.empty<number,String>().put(5, "test").put(5, "test1")
            .equals(HashMap.empty<number,String>().put(5, "test1"))));

    it("should overwrite values with the same key with custom types", () => assert.ok(
        HashMap.empty<MyClass,string>()
            .put(new MyClass("a", 1), "test")
            .put(new MyClass("a", 1), "test1")
            .put(new MyClass("a", 2), "test1").equals(
                HashMap.empty<MyClass,string>()
                    .put(new MyClass("a", 1), "test1")
                    .put(new MyClass("a", 2), "test1"))));

    it("should support map as a key itself", () => assert.ok(
        HashMap.empty<HashMap<string,number>, number>()
            .put(HashMap.empty<string,number>().put("hello", 1), 6)
            .put(HashMap.empty<string,number>().put("hello", 1), 7)
            .put(HashMap.empty<string,number>().put("bye", 1), 7)
            .equals(
                HashMap.empty<HashMap<string,number>, number>()
                    .put(HashMap.empty<string,number>().put("hello", 1), 7)
                    .put(HashMap.empty<string,number>().put("bye", 1), 7))));

    it("should put with merge", () => assert.ok(
        HashMap.empty<number,string>()
            .put(5,"test").putWithMerge(5,"a",(a,b)=>a+b)
            .equals(HashMap.empty<number,string>().put(5, "testa"))));

    it("should mergeWith", () => assert.ok(
        HashMap.empty<number,string>().put(1,"a").put(2,"bc").put(3,"d")
            .equals(HashMap.empty<number,string>().put(1,"a").put(2,"b")
                    .mergeWith(HashMap.empty<number,string>().put(2,"c").put(3,"d"), (v1,v2)=>v1+v2))));
});

describe("hashmap equality", () => {
    it("empty should be equal with empty", () =>
       assert.ok(HashMap.empty<number,String>().equals(HashMap.empty<number,String>())));
    it("non empty should be not be equal with empty", () =>
       assert.ok(!HashMap.empty<number,String>().put(1,"t").equals(HashMap.empty<number,String>())));
    it("empty should be not be equal with non empty", () =>
       assert.ok(!HashMap.empty<number,String>().equals(HashMap.empty<number,String>().put(1,"t"))));
    it("doesn't throw when given another type on equals", () => assert.equal(
        false, HashMap.empty().put(1,2).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.equal(
        false, HashMap.empty().put(1,2).equals(<any>null)));
    it("empty doesn't throw when given another type on equals", () => assert.equal(
        false, HashMap.empty().equals(<any>[1,2])));
    it("empty doesn't throw when given null on equals", () => assert.equal(
        false, HashMap.empty().equals(<any>null)));
})

describe("hashmap - toString should be nicely formatted", () => {
    it("should format strings and numbers", () => assert.equal(
        "{key1 => 6, key2 => 7}",
        ""+HashMap.empty<string,number>().put("key1", 6).put("key2", 7)));
    it("should format custom classes", () => assert.equal(
        "{key1 => {field1: test, field2: -1}}",
        ""+HashMap.empty<string,MyClass>().put("key1", new MyClass('test', -1))));
});

describe("hashmap get", () => {
    it("should retrieve values", () => assert.ok(
        HashMap.empty<string,number>().put("key1", 6).get("key1").contains(6)));
    it("should not find missing values", () => assert.ok(
        HashMap.empty<string,number>().put("key1", 6).get("key2").isNone()));
    it("should retrieve nulls", () => assert.ok(
        HashMap.empty<string,number|null>().put("key1", null).get("key1").contains(null)));
    it("should get empty keySet", () => assert.ok(
        HashSet.empty<string>().equals(HashMap.empty<string,string>().keySet())));
    it("should get non-empty keySet", () => assert.ok(
        HashSet.of("a","c").equals(HashMap.empty<string,string>().put("a","b").put("c","d").keySet())));
    it("should get empty valueSet", () => assert.ok(
        HashSet.empty<string>().equals(HashMap.empty<string,string>().valueSet())));
    it("should get non-empty valueSet", () => assert.ok(
        HashSet.of("b","d").equals(HashMap.empty<string,string>().put("a","b").put("c","d").valueSet())));
    it("supports iterator", () => {
        let total = 0;
        let letters = [];
        const iterator = HashMap.empty<string,number>()
            .put("a",1).put("b",6).put("c",3)[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            letters.push(curItem.value[0]);
            total += curItem.value[1];
            curItem = iterator.next();
        }
        assert.equal(10, total);
        letters.sort();
        assert.deepEqual(["a","b","c"], letters);
    });
    it("supports empty iterator", () => {
        let total = 0;
        let letters = [];
        const iterator = HashMap.empty<string,number>()[Symbol.iterator]();
        let curItem = iterator.next();
        while (!curItem.done) {
            letters.push(curItem.value[0]);
            total += curItem.value[1];
            curItem = iterator.next();
        }
        assert.equal(0, total);
        assert.deepEqual([], letters);
    })
});

describe("hashmap transformation", () => {
    it("should transform through map", () => assert.ok(
        HashMap.empty<number,string>().put(12,"key1").put(6,"key2").equals(
        HashMap.empty<string,number>().put("key1",6).put("key2", 3).map((k,v) => [v*2,k]))));
    it("should transform through empty map", () => assert.ok(
        HashMap.empty<number,string>().equals(
        HashMap.empty<string,number>().map((k,v) => [v*2,k]))));
    it("should transform through mapValues", () => assert.ok(
        HashMap.empty<string,number>().put("key1",12).put("key2",6).equals(
        HashMap.empty<string,number>().put("key1",6).put("key2", 3).mapValues(v => v*2))));
    it("should transform through empty mapValues", () => assert.ok(
        HashMap.empty<string,number>().equals(
        HashMap.empty<string,number>().mapValues(v => v*2))));
    it("should transform non-empty to vector", () => assert.deepEqual(
        [["a",1], ["b",2]],
        HashMap.empty<string,number>().put("a",1).put("b",2).toVector().toArray()));
    it("should transform empty to vector", () => assert.deepEqual(
        [],
        HashMap.empty<string,number>().toVector().toArray()));
});
