import { HashMap } from "../src/HashMap";
import { stringHashCode } from "../src/Util";

import * as assert from 'assert'

class MyClass {
    constructor(private field1:string, private field2:number) {}
    equals(other: MyClass): boolean {
        return this.field1 === other.field1 &&
            this.field2 === other.field2;
    }
    hashCode(): number {
        return stringHashCode("" + this.field1 + this.field2);
    }
    toString(): string {
        return `{field1: ${this.field1}, field2: ${this.field2}}`
    }
}

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
});

describe("hashmap equality", () => {
    it("empty should be equal with empty", () =>
       assert.ok(HashMap.empty<number,String>().equals(HashMap.empty<number,String>())));
    it("non empty should be not be equal with empty", () =>
       assert.ok(!HashMap.empty<number,String>().put(1,"t").equals(HashMap.empty<number,String>())));
    it("empty should be not be equal with non empty", () =>
       assert.ok(!HashMap.empty<number,String>().equals(HashMap.empty<number,String>().put(1,"t"))));
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
});
